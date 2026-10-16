"""Budowa strony internetowej (Etap 4) z danych w dane/, zrodla/ i teksty/.

Użycie: python narzedzia/buduj.py
Wynik: katalog strona/ — statyczny HTML + czysty JS (działa z pliku, bez serwera).
Zdjęcia: najpierw python narzedzia/zdjecia_www.py (kopie w strona/zdjecia/).
"""
import collections, datetime, glob, html, json, os, re, shutil, sys, unicodedata
import markdown
import yaml

sys.path.insert(0, os.path.dirname(__file__))
from zdjecia_www import nazwa_www  # noqa: E402

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DANE = os.path.join(KORZEN, 'dane')
TRANS = os.path.join(KORZEN, 'zrodla', 'transkrypcje')
TEKSTY = os.path.join(KORZEN, 'teksty')
WYJ = os.path.join(KORZEN, 'strona')
ZASOBY = os.path.join(os.path.dirname(__file__), 'strona_zasoby')

esc = html.escape
SEG_RE = re.compile(r'\bS\d\d-p[0-9a-z]+-[a-z]+\d*\b')


def wczytaj(p):
    return yaml.safe_load(open(p, encoding='utf-8')) or []


# ============================================================ dane

class Baza:
    def __init__(self):
        self.zr = yaml.safe_load(open(os.path.join(KORZEN, 'zrodla', 'zrodla.yaml'), encoding='utf-8'))
        self.osoby = {o['id']: o for o in wczytaj(os.path.join(DANE, 'osoby.yaml'))}
        self.miejsca = {m['id']: m for m in wczytaj(os.path.join(DANE, 'miejsca.yaml'))}
        pw = os.path.join(DANE, 'wspolrzedne.yaml')
        for i, w in ((yaml.safe_load(open(pw, encoding='utf-8')) or {}) if os.path.exists(pw) else {}).items():
            m = self.miejsca.get(i)
            if m and w.get('wsp') and not w.get('odrzucone') and not m.get('wsp'):
                m['wsp'] = w['wsp']
                if w.get('sprawdzone'):
                    m['osm_nazwa'] = w['znaleziono']
                m['wsp_zrodlo'] = (f'OpenStreetMap Nominatim: „{w["znaleziono"]}”' +
                                   ('' if w.get('sprawdzone') else ' — dopasowanie automatyczne, do sprawdzenia'))
        for m in self.miejsca.values():      # obiekty w miejscowości (kościół, dwór, cmentarz) — położenie miejscowości
            n = m
            while not m.get('wsp') and n.get('nadrzedne') in self.miejsca:
                n = self.miejsca[n['nadrzedne']]
                if n.get('wsp'):
                    m['wsp'], m['wsp_dziedz'] = n['wsp'], True
                    m['wsp_zrodlo'] = f'przybliżone — położenie miejscowości {n["nazwa"]}'
        self.tw = [t for p in sorted(glob.glob(os.path.join(DANE, 'twierdzenia', '*.yaml'))) for t in wczytaj(p)]
        self.lit = wczytaj(os.path.join(DANE, 'literatura.yaml'))
        self.strony = self._strony()
        self.seg = {s['id']: s for st in self.strony.values() for p in st for s in p['segmenty']}
        self.po_podmiocie = collections.defaultdict(list)
        self.po_obiekcie = collections.defaultdict(list)
        self.po_miejscu = collections.defaultdict(list)
        self.po_segmencie = collections.defaultdict(list)
        for t in self.tw:
            self.po_podmiocie[t['podmiot']].append(t)
            if t.get('obiekt'):
                self.po_obiekcie[t['obiekt']].append(t)
            if t.get('miejsce'):
                self.po_miejscu[t['miejsce']].append(t)
            for z in t['zrodla']:
                self.po_segmencie[z['segment']].append(t)
        self.dzieci_miejsc = collections.defaultdict(list)
        for m in self.miejsca.values():
            if m.get('nadrzedne'):
                self.dzieci_miejsc[m['nadrzedne']].append(m['id'])
        self.s01_kotwice = set()

    def _strony(self):
        wyn = collections.defaultdict(list)
        for p in sorted(glob.glob(os.path.join(TRANS, '*', 'str-*.md'))):
            tresc = open(p, encoding='utf-8').read()
            _, glowa, cialo = tresc.split('---', 2)
            meta = {k: (re.search(rf'^{k}:\s*"?([^"\n]*?)"?\s*(#.*)?$', glowa, re.M) or [None, None])[1]
                    for k in ('zrodlo', 'strona', 'zdjecie', 'polozenie')}
            segs = []
            for blok in re.split(r'^## ', cialo, flags=re.M)[1:]:
                ident, _, reszta = blok.partition('\n')
                typ = re.search(r'^typ:\s*(\w+)', reszta, re.M)
                tekst = re.sub(r'^typ:.*\n', '', reszta, count=1, flags=re.M).strip('\n')
                segs.append({'id': ident.strip(), 'typ': typ.group(1) if typ else 'tekst', 'tekst': tekst,
                             'strona': meta['strona'], 'zdjecie': meta['zdjecie'], 'zrodlo': meta['zrodlo']})
            wyn[meta['zrodlo']].append({**meta, 'plik': os.path.basename(p), 'segmenty': segs})
        return wyn

    # --- nazwy
    def nazwa_osoby(self, i):
        o = self.osoby[i]
        im = ' '.join(o.get('imiona') or [])
        n = o.get('nazwisko') or ''
        r = o.get('nazwisko_rodowe')
        if r and n and r != n:
            s = f'{im} {n} (z d. {r})'
        elif r and not n:
            s = f'{im} z d. {r}' if im else f'z d. {r}'
        else:
            s = f'{im} {n}'
        s = re.sub(r'\s+', ' ', s).strip()
        return s or i

    def lata(self, i):
        def roki(rel):
            w = []
            for t in self.po_podmiocie[i]:
                if t['relacja'] == rel and t.get('data'):
                    r = rok(t['data'].get('od') or t['data'].get('do'))
                    if r and r not in w:
                        w.append(r)
            return '/'.join(str(x) for x in sorted(w))
        u, s = roki('urodzenie'), roki('smierc')
        if u or s:
            return f'{u or "?"}–{s or ""}' if u else f'† {s}'
        return ''

    def nazwa(self, i):
        if i in self.osoby:
            return self.nazwa_osoby(i)
        if i in self.miejsca:
            return self.miejsca[i]['nazwa']
        return i

    def url(self, i):
        if i in self.osoby:
            return f'osoba-{i}.html'
        if i in self.miejsca:
            return f'miejsce-{i}.html'
        return '#'

    def link(self, i, z_latami=False):
        if i not in self.osoby and i not in self.miejsca:
            return esc(str(i))
        n = esc(self.nazwa(i))
        if z_latami and i in self.osoby and self.lata(i):
            n += f' <span class="lata">{esc(self.lata(i))}</span>'
        klasa = 'os' if i in self.osoby else 'mj'
        return f'<a class="{klasa}" href="{self.url(i)}">{n}</a>'

    def seg_url(self, sid):
        s = self.seg.get(sid)
        if not s:
            return '#'
        if s['zrodlo'] == 'S01':
            return f'zrodlo-S01.html#{sid}' if sid in self.s01_kotwice else f'zrodlo-S01.html#str-{s["strona"]}'
        return f'zrodlo-{s["zrodlo"]}.html#{sid}'

    def seg_etykieta(self, sid):
        s = self.seg.get(sid)
        if not s:
            return sid
        st = s['strona'] or ''
        return f'{s["zrodlo"]} s. {st}' if re.match(r'^\d', st) else f'{s["zrodlo"]} {st}'


def rok(v):
    if v is None:
        return None
    m = re.match(r'(\d{3,4})', str(v))
    return int(m.group(1)) if m else None


def norm_szukaj(t):
    t = unicodedata.normalize('NFD', str(t).lower().replace('ł', 'l'))
    return ''.join(c for c in t if not unicodedata.combining(c))


# ============================================================ HTML: szablon

NAV = [('index.html', 'Start'), ('osoby.html', 'Osoby'), ('drzewo.html', 'Drzewo'), ('miejsca.html', 'Miejsca'),
       ('groby.html', 'Groby'), ('czas.html', 'Oś czasu'), ('zrodla.html', 'Źródła'),
       ('opracowania.html', 'Opracowania'), ('szukaj.html', 'Szukaj'), ('sprawdzenie.html', 'Do sprawdzenia')]


def strona(tytul, tresc, aktywna='', glowa='', skrypty=''):
    nav = ''.join(f'<a href="{h}"{" class=on" if h == aktywna else ""}>{esc(n)}</a>' for h, n in NAV)
    return f'''<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(tytul)} — Radoszewscy herbu Oksza</title>
<link rel="stylesheet" href="styl.css">{glowa}</head>
<body><header class="gora"><a class="marka" href="index.html">Radoszewscy <span>herbu Oksza</span></a>
<form class="szybkie" action="szukaj.html"><input name="q" type="search" placeholder="Szukaj osób, miejsc, słów…" aria-label="Szukaj"></form>
<nav>{nav}</nav></header>
<main>{tresc}</main>
<footer>Baza wiedzy o rodzinie Radoszewskich · każda informacja z odsyłaczem do źródła · wygenerowano {datetime.date.today().isoformat()}</footer>
{skrypty}</body></html>'''


def zapisz(nazwa, tekst):
    open(os.path.join(WYJ, nazwa), 'w', encoding='utf-8').write(tekst)


# ============================================================ transkrypcja → HTML

def trans_html(tekst):
    """Znaczniki transkrypcji dyplomatycznej (ZASADY.md) → HTML; podział na wiersze zachowany."""
    uwagi = []

    def wytnij_red(s):
        wyn, i = '', 0
        while True:
            j = s.find('[red.:', i)
            if j < 0:
                return wyn + s[i:]
            wyn += s[i:j]
            g, k = 0, j
            while k < len(s):
                if s[k] == '[':
                    g += 1
                elif s[k] == ']':
                    g -= 1
                    if g == 0:
                        break
                k += 1
            uwagi.append(s[j + 6:k].strip())
            wyn += f'\x00{len(uwagi) - 1}\x00'
            i = k + 1

    s = esc(wytnij_red(tekst))
    s = re.sub(r'\{podkr: ([^{}]*)\}', r'<u>\1</u>', s)
    s = re.sub(r'\{rozstrz: ([^{}]*)\}', r'<span class="rozstrz">\1</span>', s)
    s = re.sub(r'\{nad: ([^{}]*)\}', r'<sup class="nad">\1</sup>', s)
    s = re.sub(r'~~([^~]*)~~', r'<del>\1</del>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![\w*])\*([^*\n][^*]*?)\*(?![\w*])', r'<i>\1</i>', s, flags=re.S)
    s = re.sub(r'\^(\d+\)?)', r'<sup>\1</sup>', s)
    s = s.replace('[?]', '<mark class="niep" title="odczyt niepewny">[?]</mark>')
    s = s.replace('[nieczyt.]', '<mark class="niep">[nieczyt.]</mark>')
    s = s.replace('\n', '<br>')
    s = re.sub(r'\x00(\d+)\x00', lambda m: f'<span class="red" title="uwaga redakcyjna">[{trans_html_inline(uwagi[int(m.group(1))])}]</span>', s)
    return s


def trans_html_inline(t):
    s = esc(t)
    s = s.replace('[?]', '<mark class="niep">[?]</mark>')
    s = re.sub(r'\{(?:podkr|rozstrz|nad): ([^{}]*)\}', r'\1', s)
    return s


def segmenty_linki(b, tekst):
    """Odsyłacze ⟨S01-p133-s03, …⟩ w tekstach opracowań → linki do źródeł."""
    def zamien(m):
        wn = m.group(1)
        czesci, byly = [], set()
        for kaw in re.split(r'(\bS\d\d-p[0-9a-z]+-[a-z]+\d*\b)', wn):
            if SEG_RE.fullmatch(kaw) and b.seg_etykieta(kaw) in byly:
                continue
            if SEG_RE.fullmatch(kaw):
                byly.add(b.seg_etykieta(kaw))
                czesci.append(f'<a class="zr" href="{b.seg_url(kaw)}" title="{esc(kaw)}">{esc(b.seg_etykieta(kaw))}</a>')
            elif kaw.strip(' ,;'):
                czesci.append(esc(kaw))
            else:
                czesci.append(' ')
        return '<span class="odsyl">' + ''.join(czesci).strip() + '</span>'
    return re.sub(r'⟨([^⟩]*)⟩', zamien, tekst)


def md_html(b, tekst):
    # python-markdown wymaga pustej linii przed listą — w opracowaniach jej często brak
    wyn, poprz = [], ''
    for w in tekst.split('\n'):
        lista = bool(re.match(r'[ \t]*(?:[-*+]|\d+\.)\s', w))
        if lista and poprz.strip() and not re.match(r'[ \t]*(?:[-*+]|\d+\.)\s', poprz):
            wyn.append('')
        wyn.append(w)
        poprz = w
    tekst = '\n'.join(wyn)
    return segmenty_linki(b, markdown.markdown(tekst, extensions=['tables', 'toc', 'sane_lists']))


# ============================================================ fakty

ETYK = {'urodzenie': 'Urodzenie', 'smierc': 'Śmierć', 'pochowek': 'Pochówek', 'chrzest': 'Chrzest',
        'slub': 'Ślub', 'malzonek': 'Małżeństwo', 'rodzic': 'Rodzic', 'rodzenstwo': 'Rodzeństwo',
        'urzad': 'Urząd', 'zawod': 'Zawód', 'wyksztalcenie': 'Wykształcenie', 'odznaczenie': 'Odznaczenie',
        'wlasnosc': 'Własność', 'zamieszkanie': 'Zamieszkanie', 'udzial_w_wydarzeniu': 'Wydarzenie',
        'fundacja': 'Fundacja', 'herb': 'Herb', 'opis': 'Informacja'}


def chipy_html(b, zrodla):
    grupy = collections.OrderedDict()
    for z in zrodla:
        grupy.setdefault(b.seg_etykieta(z['segment']), []).append(z)
    return ' '.join(f'<a class="zr" href="{b.seg_url(zs[0]["segment"])}" title="{esc(" … ".join(z["cytat"] for z in zs))}">'
                    f'{esc(et)}</a>' for et, zs in grupy.items())


def zrodla_html(b, t):
    chipy = chipy_html(b, t['zrodla'])
    cyt = ''.join(f'<li><a href="{b.seg_url(z["segment"])}">{esc(z["segment"])}</a>: „{trans_html_inline(z["cytat"])}”</li>'
                  for z in t['zrodla'])
    return (f'<span class="zrodla">{chipy}</span><details class="cyt"><summary>cytat</summary>'
            f'<ul>{cyt}</ul><div class="twid">twierdzenie {esc(t["id"])}</div></details>')


def fakt_html(b, t, widok=None, etykieta=None):
    """widok: id osoby/miejsca, z perspektywy którego pokazujemy fakt."""
    r = t['relacja']
    czesci = []
    if widok and widok == t.get('obiekt') and r == 'rodzic':
        etykieta = etykieta or 'Dziecko'
        czesci.append(b.link(t['podmiot'], True))
    elif widok and widok == t.get('obiekt') and r in ('malzonek', 'slub', 'rodzenstwo'):
        czesci.append(b.link(t['podmiot'], True))
    elif widok and widok == t.get('obiekt'):
        czesci.append(b.link(t['podmiot'], True))
        if t.get('wartosc'):
            czesci.append('— ' + esc(t['wartosc']))
    else:
        if widok != t['podmiot']:
            czesci.append(b.link(t['podmiot'], True) + ':')
        if t.get('obiekt'):
            czesci.append(b.link(t['obiekt'], True))
        if t.get('wartosc'):
            czesci.append(('— ' if t.get('obiekt') else '') + esc(t['wartosc']))
    d = t.get('data') or {}
    if d.get('tekst'):
        czesci.append(f'<span class="data">{esc(str(d["tekst"]))}</span>')
    if t.get('miejsce') and t['miejsce'] != widok:
        czesci.append('· ' + b.link(t['miejsce']))
    niep = ' <span class="znak-niep" title="odczyt niepewny">?</span>' if t['pewnosc_odczytu'] == 'niepewna' else ''
    uw = f'<div class="uw">{esc(t["uwagi"])}</div>' if t.get('uwagi') else ''
    et = etykieta or ETYK.get(r, r)
    return (f'<li class="fakt r-{r}"><span class="et">{esc(et)}</span> <span class="tr">{" ".join(czesci)}{niep}</span>'
            f'{uw}{zrodla_html(b, t)}</li>')


def krewny_html(b, et, kto, fs):
    """Krewny z kilku twierdzeń tej samej relacji: osoba raz, przy niej dodatki i źródła wszystkich twierdzeń."""
    dod, uw = [], []
    for t in fs:
        x = t.get('wartosc')
        d = (t.get('data') or {}).get('tekst')
        for y in (x, d and f'<span class="data">{esc(str(d))}</span>', t.get('miejsce') and b.link(t['miejsce'])):
            if y and (esc(y) if y is x else y) not in dod:
                dod.append(esc(y) if y is x else y)
        if t.get('uwagi') and t['uwagi'] not in uw:
            uw.append(t['uwagi'])
    niep = ' <span class="znak-niep" title="odczyt niepewny">?</span>' if any(t['pewnosc_odczytu'] == 'niepewna' for t in fs) else ''
    chipy = chipy_html(b, [z for t in fs for z in t['zrodla']])
    cyt = ''.join(f'<li><a href="{b.seg_url(z["segment"])}">{esc(z["segment"])}</a>: „{trans_html_inline(z["cytat"])}”</li>'
                  for t in fs for z in t['zrodla'])
    kto_h = b.link(kto, True) if kto else ''
    return (f'<li class="fakt"><span class="et">{esc(et)}</span> <span class="tr">{kto_h}'
            f'{" — " + "; ".join(dod) if dod else ""}{niep}</span>'
            + ''.join(f'<div class="uw">{esc(u)}</div>' for u in uw) +
            f'<span class="zrodla">{chipy}</span><details class="cyt"><summary>cytaty ({len(fs)})</summary><ul>{cyt}</ul>'
            f'<div class="twid">twierdzenia {", ".join(esc(t["id"]) for t in fs)}</div></details></li>')


def klucz_daty(t):
    d = t.get('data') or {}
    return (rok(d.get('od') or d.get('do')) or 9999, t['id'])


# ============================================================ strony: osoby

GRUPY_OS = [('Życie', ['urodzenie', 'chrzest', 'smierc', 'pochowek']),
            ('Urzędy, zawód, wykształcenie', ['urzad', 'zawod', 'wyksztalcenie', 'odznaczenie', 'herb']),
            ('Majątki i miejsca', ['wlasnosc', 'zamieszkanie', 'fundacja']),
            ('Wydarzenia i informacje', ['udzial_w_wydarzeniu', 'opis'])]


def rodzina(b, i):
    rodzice, dzieci, malz, rodz = [], [], [], []
    for t in b.po_podmiocie[i]:
        if t['relacja'] == 'rodzic':
            rodzice.append(t)
        elif t['relacja'] in ('malzonek', 'slub'):
            malz.append((t, t.get('obiekt')))
        elif t['relacja'] == 'rodzenstwo':
            rodz.append((t, t.get('obiekt')))
    for t in b.po_obiekcie[i]:
        if t['relacja'] == 'rodzic' and t['podmiot'] in b.osoby:
            dzieci.append(t)
        elif t['relacja'] in ('malzonek', 'slub') and t['podmiot'] in b.osoby:
            malz.append((t, t['podmiot']))
        elif t['relacja'] == 'rodzenstwo' and t['podmiot'] in b.osoby:
            rodz.append((t, t['podmiot']))
    return rodzice, malz, dzieci, rodz


def osoba_strona(b, i):
    o = b.osoby[i]
    h = [f'<p class="sciezka"><a href="osoby.html">Osoby</a></p><h1>{esc(b.nazwa_osoby(i))}'
         f'{" <span class=lata>" + esc(b.lata(i)) + "</span>" if b.lata(i) else ""}</h1>']
    meta = []
    if o.get('herb'):
        meta.append(f'herb {esc(o["herb"])}')
    if o.get('przydomek'):
        meta.append(f'przydomek {esc(o["przydomek"])}')
    if meta:
        h.append(f'<p class="meta">{" · ".join(meta)}</p>')
    if o.get('warianty'):
        h.append('<p class="warianty"><b>W źródłach także:</b> ' + ' · '.join(esc(w) for w in o['warianty']) + '</p>')
    if o.get('utozsamienie'):
        h.append(f'<p class="utoz"><b>Utożsamienie:</b> {esc(o["utozsamienie"])}</p>')
    if o.get('uwagi'):
        h.append(f'<p class="uwagi-os"><b>Uwagi:</b> {esc(o["uwagi"])}</p>')
    h.append(f'<p><a class="przycisk" href="drzewo.html#{i}">Pokaż w całym drzewie</a> <a class="przycisk" href="drzewo-osoba.html#{i}">Rodzina w drzewie</a></p>')

    rodzice, malz, dzieci, rodz = rodzina(b, i)
    if rodzice or malz or dzieci or rodz:
        # jeden wiersz na krewnego — wszystkie źródła tej samej relacji razem (daty ślubu itp. zostają osobno w wartościach)
        grupy = collections.OrderedDict()

        def dodaj(et, kto, t):
            grupy.setdefault((et, kto or t['id']), []).append(t)
        plec = lambda x: b.osoby.get(x, {}).get('plec')
        for t in sorted(rodzice, key=klucz_daty):
            dodaj({'m': 'Ojciec', 'k': 'Matka'}.get(plec(t.get('obiekt')), 'Rodzic'), t.get('obiekt'), t)
        for t, kto in malz:
            dodaj('Ślub' if t['relacja'] == 'slub' else {'m': 'Mąż', 'k': 'Żona'}.get(plec(kto), 'Małżonek'), kto, t)
        for t, kto in rodz:
            dodaj({'m': 'Brat', 'k': 'Siostra'}.get(plec(kto), 'Rodzeństwo'), kto, t)
        for t in sorted(dzieci, key=lambda t: (b.lata(t['podmiot']) or 'zz', t['id'])):
            dodaj({'m': 'Syn', 'k': 'Córka'}.get(plec(t['podmiot']), 'Dziecko'), t['podmiot'], t)
        h.append('<section><h2>Rodzina</h2><ul class="fakty">')
        for (et, kto), fs in grupy.items():
            h.append(krewny_html(b, et, kto if kto in b.osoby else None, fs))
        h.append('</ul></section>')
    for tyt, rel in GRUPY_OS:
        fs = sorted([t for t in b.po_podmiocie[i] if t['relacja'] in rel],
                    key=lambda t: (rel.index(t['relacja']) if tyt == 'Życie' else 0, klucz_daty(t)))
        if fs:
            h.append(f'<section><h2>{tyt}</h2><ul class="fakty">' + ''.join(fakt_html(b, t, i) for t in fs) + '</ul></section>')
    inne = [t for t in b.po_obiekcie[i] if t['relacja'] not in ('rodzic', 'malzonek', 'slub', 'rodzenstwo')]
    if inne:
        h.append('<section><h2>Wzmianki w faktach o innych</h2><ul class="fakty">' +
                 ''.join(fakt_html(b, t) for t in sorted(inne, key=klucz_daty)) + '</ul></section>')
    zr = sorted({z['segment'].split('-')[0] for t in b.po_podmiocie[i] + b.po_obiekcie[i] for z in t['zrodla']})
    h.append('<p class="zr-lista">Źródła: ' + ' '.join(f'<a href="zrodlo-{s}.html">{s}</a>' for s in zr) + '</p>')
    zapisz(f'osoba-{i}.html', strona(b.nazwa_osoby(i), '\n'.join(h), 'osoby.html'))


def osoby_lista(b):
    def klucz(i):
        o = b.osoby[i]
        return (norm_szukaj(o.get('nazwisko') or o.get('nazwisko_rodowe') or 'zzz'), norm_szukaj(' '.join(o.get('imiona') or [])))
    grupy = collections.OrderedDict()
    for i in sorted(b.osoby, key=klucz):
        o = b.osoby[i]
        nz = (o.get('nazwisko') or o.get('nazwisko_rodowe') or '(bez nazwiska)').replace('[?]', '')
        grupy.setdefault(nz, []).append(i)
    h = ['<h1>Osoby</h1>',
         f'<p>{len(b.osoby)} osób. Lista według nazwiska; kobiety — według nazwiska po mężu (nazwisko rodowe w nawiasie). '
         'Liczba przy nazwisku = liczba faktów.</p>',
         '<p><input id="filtr" type="search" placeholder="Filtruj listę…" class="filtr"></p><div id="lista-osob">']
    for nz, ids in grupy.items():
        h.append(f'<section class="grupa"><h2>{esc(nz)}</h2><ul class="osoby">')
        for i in ids:
            n = len(b.po_podmiocie[i]) + len(b.po_obiekcie[i])
            h.append(f'<li data-s="{esc(norm_szukaj(b.nazwa_osoby(i) + " " + " ".join(b.osoby[i].get("warianty") or [])))}">'
                     f'{b.link(i, True)} <span class="licz">{n}</span></li>')
        h.append('</ul></section>')
    h.append('</div>')
    zapisz('osoby.html', strona('Osoby', '\n'.join(h), 'osoby.html', skrypty='<script src="filtr.js"></script>'))


# ============================================================ strony: miejsca

def miejsce_strona(b, i):
    m = b.miejsca[i]
    h = [f'<p class="sciezka"><a href="miejsca.html">Miejsca</a>'
         f'{" › " + b.link(m["nadrzedne"]) if m.get("nadrzedne") in b.miejsca else ""}</p>',
         f'<h1>{esc(m["nazwa"])}</h1>']
    meta = [esc(m['typ'])]
    if m.get('dzis'):
        meta.append('dziś: ' + esc(m['dzis']))
    meta.append({'pewna': 'identyfikacja pewna', 'prawdopodobna': 'identyfikacja prawdopodobna',
                 'do_ustalenia': 'identyfikacja do ustalenia'}[m['pewnosc_identyfikacji']])
    h.append(f'<p class="meta">{" · ".join(meta)}</p>')
    if m.get('warianty'):
        h.append('<p class="warianty"><b>Także:</b> ' + ' · '.join(esc(w) for w in m['warianty']) + '</p>')
    if m.get('uwagi'):
        h.append(f'<p class="uwagi-os">{esc(m["uwagi"])}</p>')
    if m.get('wsp'):
        h.append(f'<div id="mapa" class="mapa mala" data-lat="{m["wsp"][0]}" data-lon="{m["wsp"][1]}" data-nazwa="{esc(m["nazwa"])}"></div>'
                 f'<p class="drobne">Współrzędne: {esc(str(m.get("wsp_zrodlo") or ""))}</p>')
    if i in OPRACOWANIE_KOTWICE:
        h.append(f'<p><a class="przycisk" href="opracowanie-majatki.html#{OPRACOWANIE_KOTWICE[i]}">Dzieje majątku — opracowanie</a></p>')
    if b.dzieci_miejsc[i]:
        h.append('<p><b>Obejmuje:</b> ' + ' · '.join(b.link(c) for c in sorted(b.dzieci_miejsc[i], key=b.nazwa)) + '</p>')
    wl = [t for t in b.po_obiekcie[i] if t['relacja'] == 'wlasnosc']
    for c in b.dzieci_miejsc[i]:
        wl += [t for t in b.po_obiekcie[c] if t['relacja'] == 'wlasnosc']
    if wl:
        h.append('<section><h2>Właściciele w czasie</h2><ul class="fakty">' +
                 ''.join(fakt_html(b, t, i, 'Właściciel') for t in sorted(wl, key=klucz_daty)) + '</ul></section>')
    opis = sorted(b.po_podmiocie[i], key=klucz_daty)
    if opis:
        h.append('<section><h2>Informacje o miejscu</h2><ul class="fakty">' + ''.join(fakt_html(b, t, i) for t in opis) + '</ul></section>')
    tu = sorted([t for t in b.po_miejscu[i]], key=klucz_daty)
    if tu:
        h.append('<section><h2>Wydarzenia w tym miejscu</h2><ul class="fakty">' + ''.join(fakt_html(b, t, i) for t in tu) + '</ul></section>')
    inne = [t for t in b.po_obiekcie[i] if t['relacja'] != 'wlasnosc']
    if inne:
        h.append('<section><h2>Inne wzmianki</h2><ul class="fakty">' + ''.join(fakt_html(b, t, i) for t in sorted(inne, key=klucz_daty)) + '</ul></section>')
    glowa, skr = '', ''
    if m.get('wsp'):
        glowa, skr = LEAFLET_GLOWA, LEAFLET_SKRYPT + '<script src="mapa.js"></script>'
    zapisz(f'miejsce-{i}.html', strona(m['nazwa'], '\n'.join(h), 'miejsca.html', glowa, skr))


LEAFLET_GLOWA = ('\n<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" '
                 'integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">')
LEAFLET_SKRYPT = ('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" '
                  'integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>')
OPRACOWANIE_KOTWICE = {}


KATEGORIE = [
    ('majatki', 'Majątki i dobra rodzinne', '#8a3b2e', 'Wsie i dwory, które należały do rodziny — z właścicielami w czasie.'),
    ('groby', 'Groby, kaplice i cmentarze', '#4b4f7a', 'Miejsca pochówku i pamięci.'),
    ('koscioly', 'Kościoły i fundacje', '#9c6b1f', 'Parafie, kościoły i klasztory związane z rodziną.'),
    ('zycie', 'Miejsca życia', '#2f6d5a', 'Miejsca urodzenia, zamieszkania, nauki i śmierci.'),
    ('inne', 'Wydarzenia i inne wzmianki', '#6f655b', 'Bitwy, podróże, miejsca wspomniane przy okazji.'),
]


SAMODZIELNE_W_MIESCIE = {'cmentarz', 'kaplica', 'kościół', 'majątek'}


def osobna_karta(b, i):
    """Cmentarz, kościół czy majątek w mieście dostaje własną kartę, zamiast ginąć w karcie miasta."""
    m = b.miejsca[i]
    p = b.miejsca.get(m.get('nadrzedne'))
    return p is None or (p['typ'] in ('miasto', 'region') and m['typ'] in SAMODZIELNE_W_MIESCIE)


def poddrzewo(b, i):
    w = [i]
    for c in b.dzieci_miejsc[i]:
        if not osobna_karta(b, c):
            w += poddrzewo(b, c)
    return w


def fakty_miejsca(b, ids):
    wyn, widz = [], set()
    for x in ids:
        for t in b.po_podmiocie[x] + b.po_obiekcie[x] + b.po_miejscu[x]:
            if t['id'] not in widz:
                widz.add(t['id'])
                wyn.append(t)
    return wyn


def kategoria_miejsca(b, i):
    ids = poddrzewo(b, i)
    typy = {b.miejsca[x]['typ'] for x in ids}
    fs = fakty_miejsca(b, ids)
    rel = collections.Counter(t['relacja'] for t in fs)
    if b.miejsca[i]['typ'] in ('miasto', 'region'):
        typy = {b.miejsca[i]['typ']}
        fs = [t for t in fs if i in (t['podmiot'], t.get('obiekt'), t.get('miejsce'))]
        rel = collections.Counter(t['relacja'] for t in fs)
        ids = [i]
    if 'majątek' in typy or any(t['relacja'] == 'wlasnosc' and t.get('obiekt') in ids for t in fs):
        return 'majatki'
    if typy & {'cmentarz', 'kaplica'} or rel['pochowek'] >= max(1, len(fs) // 2):
        return 'groby'
    if 'kościół' in typy or rel['fundacja']:
        return 'koscioly'
    if rel['urodzenie'] + rel['smierc'] + rel['zamieszkanie'] + rel['chrzest'] + rel['slub'] + rel['wyksztalcenie'] + rel['pochowek']:
        return 'zycie'
    return 'inne'


def dzis_krotko(m):
    if m.get('dzis'):
        return m['dzis']
    n = m.get('osm_nazwa')
    if not n:
        return ''
    cz = [c.strip() for c in n.split(',')[1:] if not re.fullmatch(r'[\d\- ]+', c.strip()) and c.strip() != 'Polska']
    cz = [c for c in cz if c.startswith(('gmina', 'powiat', 'województwo')) or len(cz) <= 2]
    return ', '.join(cz[-3:])


def miejsca_lista(b):
    gora = [m['id'] for m in b.miejsca.values() if osobna_karta(b, m['id'])]
    karty = collections.defaultdict(list)
    punkty = []
    for i in gora:
        ids = poddrzewo(b, i)
        fs = fakty_miejsca(b, ids)
        kat = kategoria_miejsca(b, i)
        lata = [r for t in fs for r in [rok((t.get('data') or {}).get('od') or (t.get('data') or {}).get('do'))]
                if r and r > 1000 and str(r) in str((t.get('data') or {}).get('tekst') or '')]   # tylko lata zapisane w źródle
        osoby = collections.Counter(e for t in fs for e in (t['podmiot'], t.get('obiekt')) if e in b.osoby)
        karty[kat].append({'id': i, 'fs': fs, 'lata': lata, 'osoby': osoby, 'ids': ids})
        m = b.miejsca[i]
        if m.get('wsp') and not m.get('wsp_dziedz'):
            punkty.append({'id': i, 'n': m['nazwa'], 'lat': m['wsp'][0], 'lon': m['wsp'][1], 'f': len(fs), 'k': kat})
    h = ['<h1>Miejsca i majątki</h1>',
         f'<p class="lead">{len(gora)} miejscowości i miejsc, pogrupowanych według tego, co łączy je z rodziną. '
         'Najpierw miejsca ważne (3 i więcej faktów), niżej — zwinięte — rzadkie wzmianki.</p>',
         '<div id="mapa" class="mapa"></div><div class="legenda" id="legenda">' +
         ''.join(f'<label><input type="checkbox" data-k="{k}" checked><span class="kropka" style="background:{kol}"></span>{esc(n)}</label>'
                 for k, n, kol, _ in KATEGORIE) + '</div>',
         f'<p class="drobne">Na mapie {len(punkty)} miejsc z ustalonym położeniem (OpenStreetMap, przejrzane ręcznie). '
         'Wielkość kółka = liczba faktów.</p>',
         '<nav class="spis">' + ' · '.join(f'<a href="#k-{k}">{esc(n)}</a> ({len(karty[k])})' for k, n, _, _ in KATEGORIE) + '</nav>']
    for k, nazwa, kol, opis in KATEGORIE:
        lst = sorted(karty[k], key=lambda x: (-len(x['fs']), norm_szukaj(b.nazwa(x['id']))))
        wazne = [x for x in lst if len(x['fs']) >= 3]
        rzadkie = [x for x in lst if len(x['fs']) < 3]
        h.append(f'<section id="k-{k}"><h2><span class="kropka duza" style="background:{kol}"></span>{esc(nazwa)}</h2>'
                 f'<p class="drobne">{esc(opis)}</p><div class="karty-mj">')
        for x in wazne:
            m = b.miejsca[x['id']]
            okres = f'{min(x["lata"])}–{max(x["lata"])}' if x['lata'] and min(x['lata']) != max(x['lata']) else (str(x['lata'][0]) if x['lata'] else '')
            dz = dzis_krotko(m)
            osoby = ', '.join(b.link(o) for o, _ in x['osoby'].most_common(4))
            pod = [c for c in x['ids'][1:]]
            na_mapie = (f'<button type="button" class="na-mapie" data-id="{x["id"]}">na mapie</button>'
                        if m.get('wsp') and not m.get('wsp_dziedz') else '')
            h.append(f'<article class="karta-mj" style="border-top-color:{kol}"><h3>{b.link(x["id"])}</h3>'
                     + (f'<p class="dzis">{esc(dz)}</p>' if dz else '') +
                     f'<p class="liczby-mj"><b>{len(x["fs"])}</b> faktów' + (f' · <b>{okres}</b>' if okres else '') +
                     f' · {len(x["osoby"])} osób</p>'
                     + (f'<p class="osoby-mj">{osoby}</p>' if osoby else '')
                     + (('<p class="pod">W tym: ' + ', '.join(b.link(c) for c in pod[:6]) + (' …' if len(pod) > 6 else '') + '</p>') if pod else '')
                     + (f'<p><a class="przycisk maly" href="opracowanie-majatki.html#{OPRACOWANIE_KOTWICE[x["id"]]}">dzieje majątku</a> {na_mapie}</p>'
                        if x['id'] in OPRACOWANIE_KOTWICE else (f'<p>{na_mapie}</p>' if na_mapie else ''))
                     + '</article>')
        h.append('</div>')
        if rzadkie:
            h.append(f'<details class="rzadkie"><summary>Rzadkie wzmianki ({len(rzadkie)})</summary><ul class="osoby">' +
                     ''.join(f'<li>{b.link(x["id"])} <span class="drobne">{esc(dzis_krotko(b.miejsca[x["id"]]))}</span></li>'
                             for x in sorted(rzadkie, key=lambda x: norm_szukaj(b.nazwa(x['id'])))) + '</ul></details>')
        h.append('</section>')
    kol = {k: c for k, _, c, _ in KATEGORIE}
    dane = f'<script>window.MIEJSCA={json.dumps(punkty, ensure_ascii=False)};window.KOLORY={json.dumps(kol)};</script>'
    zapisz('miejsca.html', strona('Miejsca', '\n'.join(h), 'miejsca.html', LEAFLET_GLOWA,
                                  LEAFLET_SKRYPT + dane + '<script src="mapa.js"></script>'))


# ============================================================ groby, oś czasu

def groby(b):
    grupy = collections.defaultdict(list)
    for t in b.tw:
        if t['relacja'] == 'pochowek':
            grupy[t.get('miejsce') or t.get('obiekt') or '—'].append(t)
    h = ['<h1>Groby i miejsca pamięci</h1>',
         f'<p>{sum(len(v) for v in grupy.values())} informacji o pochówkach, pogrupowanych według miejsca. '
         'Ta sama osoba może występować kilka razy — każde źródło osobno.</p><nav class="spis">']
    kl = sorted(grupy, key=lambda x: norm_szukaj(b.nazwa(x)))
    h.append(' · '.join(f'<a href="#g-{esc(k)}">{esc(b.nazwa(k))}</a> ({len(grupy[k])})' for k in kl) + '</nav>')
    for k in kl:
        h.append(f'<section id="g-{esc(k)}"><h2>{b.link(k) if k != "—" else "Miejsce nieokreślone"}</h2><ul class="fakty">')
        h += [fakt_html(b, t, k) for t in sorted(grupy[k], key=lambda t: (norm_szukaj(b.nazwa(t['podmiot'])), t['id']))]
        h.append('</ul></section>')
    zapisz('groby.html', strona('Groby', '\n'.join(h), 'groby.html'))


def czas(b):
    fs = [t for t in b.tw if t.get('data') and rok(t['data'].get('od') or t['data'].get('do'))]
    fs.sort(key=klucz_daty)
    h = ['<h1>Oś czasu</h1>',
         f'<p>{len(fs)} datowanych faktów. Data w nawiasie — tak jak w źródle; sprzeczne wersje są pokazane osobno.</p>',
         '<p class="filtry"><label>Rodzaj: <select id="rel"><option value="">wszystkie</option>' +
         ''.join(f'<option value="{r}">{esc(e)}</option>' for r, e in ETYK.items()) +
         '</select></label> <input id="filtr" type="search" placeholder="Filtruj…" class="filtr"></p><div id="lista-osob">']
    wiek = None
    for t in fs:
        r = rok(t['data'].get('od') or t['data'].get('do'))
        w = (r - 1) // 100 + 1
        if w != wiek:
            if wiek is not None:
                h.append('</ul></section>')
            h.append(f'<section class="grupa"><h2>{rzym(w)} wiek</h2><ul class="fakty czas">')
            wiek = w
        tekst = norm_szukaj(b.nazwa(t['podmiot']) + ' ' + (t.get('wartosc') or '') + ' ' + b.nazwa(t.get('obiekt') or ''))
        rk = str(r) if str(r) in str(t['data'].get('tekst') or r) else f'{rzym(w)} w.'
        h.append(f'<li class="fakt r-{t["relacja"]}" data-r="{t["relacja"]}" data-s="{esc(tekst)}"><span class="rok">{rk}</span>'
                 + fakt_html(b, t)[len(f'<li class="fakt r-{t["relacja"]}">'):])
    h.append('</ul></section></div>')
    zapisz('czas.html', strona('Oś czasu', '\n'.join(h), 'czas.html', skrypty='<script src="filtr.js"></script>'))


def rzym(n):
    w = ''
    for v, s in ((10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v:
            w += s
            n -= v
    return w


# ============================================================ źródła

def zrodla_lista(b):
    h = ['<h1>Źródła</h1><p>Każde źródło stronami: zdjęcie oryginału obok wiernej transkrypcji. '
         'Przewodnik heraldyczny (S01) — w wersji uwspółcześnionej, ze zdjęciami stron oryginału.</p><ul class="zrodla-lista">']
    for k, v in b.zr.items():
        st = b.strony.get(k, [])
        mini = next((p['zdjecie'] for p in st if p['zdjecie']), None)
        img = f'<img src="zdjecia/m/{nazwa_www(mini)}" alt="" loading="lazy">' if mini else ''
        nf = sum(1 for t in b.tw if any(z['segment'].startswith(k + '-') for z in t['zrodla']))
        h.append(f'<li><a href="zrodlo-{k}.html">{img}<span><b>{k}</b> {esc(v.get("tytul") or "")}</span></a>'
                 f'<p class="drobne">{esc(v.get("autor") or "")} · {esc(str(v.get("datowanie") or v.get("miejsce_rok") or ""))} · '
                 f'{len(st)} str. · {nf} faktów</p></li>')
    h.append('</ul><h2>Literatura cytowana w źródłach</h2><ul class="lit">')
    for l in b.lit:
        h.append(f'<li>{esc(l["opis"])}' + (f' <span class="drobne">— {esc(l["dotyczy"])}</span>' if l.get('dotyczy') else '') +
                 ' ' + ' '.join(f'<a class="zr" href="{b.seg_url(s)}">{esc(b.seg_etykieta(s))}</a>' for s in l.get('segmenty', [])) + '</li>')
    h.append('</ul>')
    zapisz('zrodla.html', strona('Źródła', '\n'.join(h), 'zrodla.html'))


def opis_zrodla(b, k):
    v = b.zr[k]
    pola = [('Autor', v.get('autor')), ('Datowanie', v.get('datowanie') or v.get('miejsce_rok')),
            ('Wydawca', v.get('wydawca')), ('Zakres', v.get('zakres')), ('Zdjęcia', v.get('zdjecia'))]
    dl = ''.join(f'<dt>{n}</dt><dd>{esc(str(w))}</dd>' for n, w in pola if w)
    uw = v.get('uwagi') or []
    if isinstance(uw, str):
        uw = [uw]
    return (f'<p class="sciezka"><a href="zrodla.html">Źródła</a></p><h1>{k}: {esc(v.get("tytul") or "")}</h1>'
            f'<dl class="opis">{dl}</dl>' + (('<ul class="drobne">' + ''.join(f'<li>{esc(str(x))}</li>' for x in uw) + '</ul>') if uw else ''))


def galeria(b, k):
    h = ['<section class="galeria"><h2>Strony oryginału</h2><div class="kafle-zdj">']
    widziane = set()
    for p in b.strony[k]:
        z = p['zdjecie']
        if not z:
            continue
        h.append(f'<figure id="str-{esc(p["strona"])}"><a href="zdjecia/{nazwa_www(z)}" target="_blank">'
                 f'<img src="zdjecia/m/{nazwa_www(z)}" alt="s. {esc(p["strona"])}" loading="lazy"></a>'
                 f'<figcaption>s. {esc(p["strona"])}{" · " + esc(z) if z not in widziane else ""}</figcaption></figure>')
        widziane.add(z)
    return ''.join(h) + '</div></section>'


def zrodlo_strona(b, k):
    if k == 'S01':
        tekst = open(os.path.join(TEKSTY, 'S01-przewodnik-uwspolczesniony.md'), encoding='utf-8').read()
        kotwice = set()

        def kotwiczne(m):
            ids = [x for x in SEG_RE.findall(m.group(1)) if x not in kotwice]
            kotwice.update(ids)
            return ''.join(f'<span id="{x}" class="kotwica"></span>' for x in ids) + m.group(0)
        tekst = re.sub(r'⟨([^⟩]*)⟩', kotwiczne, tekst)
        b.s01_kotwice |= kotwice
        tresc = (opis_zrodla(b, k) + '<p class="uwaga">Tekst w wersji uwspółcześnionej (wydanie krytyczne). '
                 'Odsyłacze przy akapitach prowadzą do zdjęć stron oryginału poniżej; wierna transkrypcja jest warstwą roboczą.</p>'
                 '<article class="tekst">' + md_html(b, tekst) + '</article>' + galeria(b, k))
        zapisz('zrodlo-S01.html', strona('S01 — Przewodnik heraldyczny', tresc, 'zrodla.html'))
        return
    h = [opis_zrodla(b, k)]
    st = b.strony[k]
    h.append('<nav class="spis">Strony: ' + ' '.join(f'<a href="#str-{esc(p["strona"])}">{esc(p["strona"])}</a>' for p in st) + '</nav>')
    for p in st:
        z = p['zdjecie']
        img = (f'<a href="zdjecia/{nazwa_www(z)}" target="_blank" class="zdj"><img src="zdjecia/{nazwa_www(z)}" '
               f'alt="zdjęcie strony {esc(p["strona"])}" loading="lazy"></a><p class="drobne">{esc(z)} — kliknij, aby powiększyć</p>') if z else ''
        h.append(f'<section class="str" id="str-{esc(p["strona"])}"><h2>s. {esc(p["strona"])}</h2>'
                 + (f'<p class="drobne">{esc(p["polozenie"])}</p>' if p.get('polozenie') else '') +
                 f'<div class="dwie"><div class="lewa">{img}</div><div class="prawa">')
        for s in p['segmenty']:
            fs = b.po_segmencie.get(s['id'], [])
            enc = []
            for t in fs:
                for e in (t['podmiot'], t.get('obiekt')):
                    if e and e not in enc and (e in b.osoby or e in b.miejsca):
                        enc.append(e)
            pow_ = (f'<div class="pow">{len(fs)} fakt.: ' + ', '.join(b.link(e) for e in enc[:12]) +
                    (' …' if len(enc) > 12 else '') + '</div>') if fs else ''
            h.append(f'<div class="seg typ-{s["typ"]}" id="{s["id"]}"><a class="segid" href="#{s["id"]}">{s["id"]}</a>'
                     f'<div class="tt">{trans_html(s["tekst"])}</div>{pow_}</div>')
        h.append('</div></div></section>')
    zapisz(f'zrodlo-{k}.html', strona(f'{k} — {b.zr[k].get("tytul", "")}', '\n'.join(h), 'zrodla.html'))


# ============================================================ opracowania, sprawdzenie

def opracowania(b):
    global OPRACOWANIE_KOTWICE
    pozycje = [('opracowanie-majatki.html', 'majatki-4-miejscowosci.md', 'Cztery majątki: Radoszewice, Siemkowice, Krempa, Kościerzyn'),
               ('opracowanie-zapiski.html', 'zapiski-rodzinne-uporzadkowane.md', 'Zapiski rodzinne — uporządkowane'),
               ('zrodlo-S01.html', None, 'Przewodnik heraldyczny (S01) — wydanie uwspółcześnione')]
    h = ['<h1>Opracowania</h1><p>Teksty uporządkowane z Etapu 2 (wersje robocze do przejrzenia). Odsyłacze w nawiasach prowadzą do źródeł.</p><ul class="kafle">']
    for url, plik, tyt in pozycje:
        h.append(f'<li><a href="{url}">{esc(tyt)}</a></li>')
        if plik:
            tekst = open(os.path.join(TEKSTY, plik), encoding='utf-8').read()
            html_ = md_html(b, tekst)
            if plik.startswith('majatki'):
                for mid, wz in (('radoszewice', 'Radoszewice'), ('siemkowice', 'Siemkowice'), ('krempa', 'Krempa'), ('koscierzyn', 'Kościerzyn')):
                    m = re.search(rf'<h2 id="([^"]+)">[^<]*{wz}', html_)
                    if m:
                        OPRACOWANIE_KOTWICE[mid] = m.group(1)
            zapisz(url, strona(tyt, f'<p class="sciezka"><a href="opracowania.html">Opracowania</a></p><article class="tekst">{html_}</article>', 'opracowania.html'))
    h.append('</ul>')
    zapisz('opracowania.html', strona('Opracowania', '\n'.join(h), 'opracowania.html'))


def sprawdzenie(b):
    w = open(os.path.join(DANE, 'watpliwosci.md'), encoding='utf-8').read()
    w = re.sub(r'(?<![⟨\w-])(S\d\d-p[0-9a-z]+-[a-z]+\d*)\b', r'⟨\1⟩', w)
    r = open(os.path.join(DANE, 'RAPORT-KOMPLETNOSCI.md'), encoding='utf-8').read()
    h = ['<h1>Do sprawdzenia</h1><p>Niepewne odczytania, rozbieżności między źródłami i decyzje o utożsamieniu osób — '
         'do przejrzenia przez rodzinę. Nic tu nie jest „poprawione”: sprzeczne wersje są pokazane obok siebie.</p>'
         '<nav class="spis"><a href="#watpliwosci">Wątpliwości odczytu</a> · <a href="#raport">Raport kompletności bazy</a></nav>',
         '<article class="tekst" id="watpliwosci">' + md_html(b, w) + '</article>',
         '<article class="tekst" id="raport">' + md_html(b, r.replace('# Raport', '# Raport', 1)) + '</article>']
    zapisz('sprawdzenie.html', strona('Do sprawdzenia', '\n'.join(h), 'sprawdzenie.html'))


# ============================================================ drzewo, szukaj, start

def drzewo_cale(b):
    """Las drzew: każde dziecko pod jednym „głównym” rodzicem (ojciec; gdy brak — matka). Matka pokazana jako żona ojca;
    sprzeczne przekazy (dwóch ojców) zaznaczone przy dziecku, nie scalane."""
    waga = collections.Counter()
    rodzice = collections.defaultdict(list)
    malz = collections.defaultdict(list)
    for t in b.tw:
        if t['relacja'] == 'rodzic' and t['podmiot'] in b.osoby and t.get('obiekt') in b.osoby:
            waga[(t['podmiot'], t['obiekt'])] += 1
            if t['obiekt'] not in rodzice[t['podmiot']]:
                rodzice[t['podmiot']].append(t['obiekt'])
        if t['relacja'] in ('malzonek', 'slub') and t['podmiot'] in b.osoby and t.get('obiekt') in b.osoby:
            for a, c in ((t['podmiot'], t['obiekt']), (t['obiekt'], t['podmiot'])):
                if c not in malz[a]:
                    malz[a].append(c)
    plec = lambda x: b.osoby[x]['plec']
    glowny, uwagi = {}, collections.defaultdict(list)
    for c, ps in rodzice.items():
        ojcowie = sorted([p for p in ps if plec(p) == 'm'], key=lambda p: -waga[(c, p)])
        matki = sorted([p for p in ps if plec(p) != 'm'], key=lambda p: -waga[(c, p)])
        g = (ojcowie or matki)[0]
        glowny[c] = g
        for p in (ojcowie if plec(g) == 'm' else matki)[1:]:
            uwagi[c].append(f'wg innego przekazu {"syn" if plec(c) == "m" else "córka"}: {b.nazwa_osoby(p)}')
        for mt in (matki if plec(g) == 'm' else []):
            if mt not in malz[g]:
                uwagi[c].append(f'matka: {b.nazwa_osoby(mt)}')
    dzieci = collections.defaultdict(list)
    for c, g in glowny.items():
        dzieci[g].append(c)
    def rok_ur(i):
        l = b.lata(i)
        m = re.match(r'(\d{3,4})', l or '')
        return int(m.group(1)) if m else 9999
    for g in dzieci:
        dzieci[g].sort(key=lambda c: (rok_ur(c), b.nazwa_osoby(c)))
    def wielkosc(i, byly=None):
        byly = byly or set()
        if i in byly:
            return 0
        byly.add(i)
        return 1 + sum(wielkosc(c, byly) for c in dzieci[i])
    korzenie = []
    for i in b.osoby:
        if i in glowny:
            continue
        if not dzieci[i] and (malz[i] or not any(i in v for v in rodzice.values())):
            continue      # tylko jako małżonek (albo bez żadnych powiązań) — pokazany w ramce partnera
        korzenie.append(i)
    korzenie.sort(key=lambda i: -wielkosc(i))
    N = {i: [b.nazwa_osoby(i), b.lata(i), plec(i), malz[i], dzieci[i], uwagi[i]] for i in b.osoby}
    T = [[k, wielkosc(k)] for k in korzenie]
    w_drzewie = {x for k in korzenie for x in [k]} | set(glowny) | {s for i in list(glowny) + korzenie for s in malz[i]}
    h = ['<h1>Drzewo genealogiczne</h1>',
         '<p class="zakladki"><a class="on" href="drzewo.html">Całe drzewo</a><a href="drzewo-osoba.html">Wokół jednej osoby</a></p>',
         '<p class="filtry"><label>Ród: <select id="rod">' +
         ''.join(f'<option value="{k}">{esc(b.nazwa_osoby(k))} — {n} os.</option>' for k, n in T if n > 1) +
         '<option value="*">wszystkie rody naraz</option></select></label> '
         '<input id="szukaj-os" list="lista-os" class="filtr" placeholder="Znajdź osobę w drzewie…">'
         '<datalist id="lista-os">' + ''.join(f'<option value="{esc(b.nazwa_osoby(i) + (" " + b.lata(i) if b.lata(i) else ""))}" data-id="{i}">'
                                         for i in sorted(w_drzewie, key=lambda x: norm_szukaj(b.nazwa_osoby(x)))) + '</datalist> '
         '<span class="zoom"><button type="button" data-z="-1" title="pomniejsz">−</button><button type="button" data-z="0" title="100%">100%</button>'
         '<button type="button" data-z="1" title="powiększ">+</button></span></p>',
         '<p class="drobne">Pokolenia od lewej do prawej. W ramce: osoba, lata życia, pod spodem ∞ małżonkowie. '
         'Dzieci pod ojcem (gdy źródła nie podają ojca — pod matką). Gdy źródła podają różnych ojców, dziecko stoi pod jednym, '
         'a drugi przekaz jest wpisany w ramce (kursywą). Kliknięcie imienia otwiera kartę osoby, „⤢” — widok rodziny.</p>',
         '<div id="cale" class="cale"><div id="plotno"></div></div>']
    skr = (f'<script>window.CALE={json.dumps({"N": N, "T": T}, ensure_ascii=False)};</script>'
           '<script src="drzewo-cale.js"></script>')
    zapisz('drzewo.html', strona('Drzewo', '\n'.join(h), 'drzewo.html', skrypty=skr))


def drzewo(b):
    P = {}
    for i, o in b.osoby.items():
        P[i] = {'n': b.nazwa_osoby(i), 'l': b.lata(i), 's': o['plec']}
    rodzice = collections.defaultdict(list)
    malz = collections.defaultdict(list)
    for t in b.tw:
        if t['relacja'] == 'rodzic' and t['podmiot'] in P and t.get('obiekt') in P:
            if t['obiekt'] not in rodzice[t['podmiot']]:
                rodzice[t['podmiot']].append(t['obiekt'])
        if t['relacja'] in ('malzonek', 'slub') and t['podmiot'] in P and t.get('obiekt') in P:
            for a, c in ((t['podmiot'], t['obiekt']), (t['obiekt'], t['podmiot'])):
                if c not in malz[a]:
                    malz[a].append(c)
    dane = {'P': P, 'R': rodzice, 'M': malz}
    h = ['<h1>Drzewo genealogiczne</h1>',
         '<p class="zakladki"><a href="drzewo.html">Całe drzewo</a><a class="on" href="drzewo-osoba.html">Wokół jednej osoby</a></p>',
         '<p class="filtry"><input id="wybor" list="lista" placeholder="Wpisz imię lub nazwisko…" class="filtr"> '
         '<datalist id="lista">' + ''.join(f'<option value="{esc(P[i]["n"] + (" " + P[i]["l"] if P[i]["l"] else ""))}" data-id="{i}">'
                                         for i in sorted(P, key=lambda x: norm_szukaj(P[x]['n']))) + '</datalist> '
         '<label><input type="checkbox" id="glebiej"> więcej pokoleń</label></p>',
         '<p class="drobne">Kliknij osobę, aby przenieść ją do środka; nazwisko otwiera kartę osoby. '
         'Gdy źródła podają różnych rodziców, pokazani są wszyscy (ramka przerywana = sprzeczne przekazy).</p>',
         '<div id="drzewo"></div>']
    skr = f'<script>window.DRZEWO={json.dumps(dane, ensure_ascii=False)};</script><script src="drzewo.js"></script>'
    zapisz('drzewo-osoba.html', strona('Drzewo — rodzina osoby', '\n'.join(h), 'drzewo.html', skrypty=skr))


def szukaj(b):
    I = []
    for i, o in b.osoby.items():
        I.append(['o', b.nazwa_osoby(i), b.lata(i), b.url(i),
                  norm_szukaj(b.nazwa_osoby(i) + ' ' + ' '.join(o.get('warianty') or []) + ' ' + (o.get('uwagi') or ''))])
    for i, m in b.miejsca.items():
        I.append(['m', m['nazwa'], m['typ'], b.url(i), norm_szukaj(m['nazwa'] + ' ' + ' '.join(m.get('warianty') or []) + ' ' + (m.get('dzis') or ''))])
    for t in b.tw:
        tekst = ' '.join(x for x in [b.nazwa(t['podmiot']), ETYK.get(t['relacja'], ''), b.nazwa(t.get('obiekt') or ''),
                                     t.get('wartosc') or '', str((t.get('data') or {}).get('tekst') or '')] if x)
        I.append(['f', tekst[:200], t['id'], b.url(t['podmiot']), norm_szukaj(tekst + ' ' + ' '.join(z['cytat'] for z in t['zrodla']))])
    for sid, s in b.seg.items():
        if s['typ'] == 'pagina':
            continue
        czysty = re.sub(r'\[red\.:[^\]]*\]|\{(?:podkr|rozstrz|nad): |[{}*~^]', ' ', s['tekst'])
        czysty = re.sub(r'-\n', '', czysty)
        czysty = re.sub(r'\s+', ' ', czysty).strip()
        if czysty:
            I.append(['s', czysty[:160], b.seg_etykieta(sid), b.seg_url(sid), norm_szukaj(czysty)])
    open(os.path.join(WYJ, 'dane-szukaj.js'), 'w', encoding='utf-8').write('window.INDEKS=' + json.dumps(I, ensure_ascii=False) + ';')
    h = ['<h1>Szukaj</h1><p><input id="q" type="search" class="filtr duzy" placeholder="np. Józefat, Krempa, Oksza, kasztelan…" autofocus></p>',
         '<p class="drobne">Wielkość liter i polskie znaki nie mają znaczenia (np. „lodz” znajdzie „Łódź”). '
         'Przeszukiwane są osoby, miejsca, fakty i pełne transkrypcje źródeł.</p><div id="wyniki"></div>']
    zapisz('szukaj.html', strona('Szukaj', '\n'.join(h), 'szukaj.html',
                                 skrypty='<script src="dane-szukaj.js"></script><script src="szukaj.js"></script>'))


def start(b):
    herb = [t for t in b.tw if t['relacja'] == 'herb' or (t['relacja'] == 'opis' and 'Oksza' in (t.get('wartosc') or ''))][:8]
    gl = ['radoszewski-imbram-1412', 'radoszewski-boguslaw-1441', 'radoszewski-mikolaj-1574', 'radoszewski-jerzy-1614',
          'radoszewski-marek-1641', 'radoszewski-michal-1775', 'radoszewski-franciszek-1790', 'radoszewski-jozefat-1830',
          'radoszewski-michal-1865', 'radoszewski-jerzy-1902']
    h = ['<section class="wstep"><h1>Radoszewscy herbu Oksza</h1>',
         '<p class="lead">Baza wiedzy o rodzinie Boxa-Radoszewskich i rodzinach z nią związanych (Prządzyńscy, Grabińscy, '
         'Drohojowscy, Skrzyńscy i inni), zbudowana z rodzinnych zapisków, przewodnika heraldycznego Kosińskiego, prac '
         'Stefana Łakomego i monografii dworów ziemi sieradzkiej. <b>Każda informacja ma odsyłacz do źródła</b> — '
         'do strony, zdjęcia i dosłownego cytatu.</p>',
         f'<ul class="liczby"><li><b>{len(b.osoby)}</b> osób</li><li><b>{len(b.miejsca)}</b> miejsc</li>'
         f'<li><b>{len(b.tw)}</b> faktów</li><li><b>{len(b.zr)}</b> źródeł</li><li><b>{sum(len(v) for v in b.strony.values())}</b> stron</li></ul></section>',
         '<section><h2>Od czego zacząć</h2><ul class="kafle">'
         '<li><a href="drzewo.html">Drzewo genealogiczne</a><span>pokolenia i gałęzie</span></li>'
         '<li><a href="miejsca.html">Miejsca i majątki</a><span>Radoszewice, Siemkowice, Krempa, Kościerzyn…</span></li>'
         '<li><a href="zrodla.html">Źródła</a><span>zdjęcia stron obok transkrypcji</span></li>'
         '<li><a href="czas.html">Oś czasu</a><span>od XII do XXI wieku</span></li>'
         '<li><a href="groby.html">Groby</a><span>cmentarze i kaplice</span></li>'
         '<li><a href="sprawdzenie.html">Do sprawdzenia</a><span>niepewne odczyty i sprzeczności</span></li></ul></section>',
         '<section><h2>Główna linia (wg źródeł)</h2><ol class="linia">' +
         ''.join(f'<li>{b.link(i, True)}</li>' for i in gl if i in b.osoby) + '</ol>'
         '<p class="drobne">Kolejność pokoleń według drzewa Kosińskiego (S01) i zapisków rodzinnych; '
         'szczegóły i rozbieżności — na kartach osób.</p></section>']
    if herb:
        h.append('<section><h2>Herb i przydomek</h2><ul class="fakty">' + ''.join(fakt_html(b, t) for t in herb) + '</ul></section>')
    zapisz('index.html', strona('Start', '\n'.join(h), 'index.html'))


# ============================================================ main

def main():
    os.makedirs(WYJ, exist_ok=True)
    for p in glob.glob(os.path.join(WYJ, '*.html')):
        os.remove(p)
    for p in glob.glob(os.path.join(ZASOBY, '*')):
        shutil.copy(p, WYJ)
    b = Baza()
    zrodlo_strona(b, 'S01')        # najpierw — ustala kotwice segmentów S01
    opracowania(b)                 # ustala kotwice majątków
    for k in b.zr:
        if k != 'S01' and k in b.strony:
            zrodlo_strona(b, k)
    for i in b.osoby:
        osoba_strona(b, i)
    for i in b.miejsca:
        miejsce_strona(b, i)
    osoby_lista(b)
    miejsca_lista(b)
    groby(b)
    czas(b)
    zrodla_lista(b)
    sprawdzenie(b)
    drzewo(b)
    drzewo_cale(b)
    szukaj(b)
    start(b)
    n = len(glob.glob(os.path.join(WYJ, '*.html')))
    brak = [z for st in b.strony.values() for p in st for z in [p['zdjecie']] if z and not os.path.exists(os.path.join(WYJ, 'zdjecia', nazwa_www(z)))]
    print(f'Zbudowano {n} stron w strona/.' + (f' Brak {len(set(brak))} zdjęć — uruchom narzedzia/zdjecia_www.py.' if brak else ''))


if __name__ == '__main__':
    main()
