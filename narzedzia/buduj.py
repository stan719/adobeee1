"""Budowa strony internetowej (Etap 4) z danych w dane/, zrodla/ i teksty/.

Użycie: python narzedzia/buduj.py
Wynik: katalog strona/ — statyczny HTML + czysty JS (działa z pliku, bez serwera).
Zdjęcia: najpierw python narzedzia/zdjecia_www.py (kopie w strona/skany/).

Układ (zob. PROJEKT-STRONY.md) wzorowany na serwisach genealogicznych typu GeneWeb (Wielcy.pl):
karta osoby = rodzice, małżeństwa z dziećmi, rodzeństwo, życiorys; źródła jako numerowane przypisy;
drzewo rysowane w całości (potomkowie / przodkowie / rodzina), indeks nazwisk, pokrewieństwo.
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

# krótkie nazwy źródeł — w przypisach
SKROT = {
    'S01': 'Kosiński, Przewodnik heraldyczny t. V (1885)',
    'S02': 'Łakomy, Z dziejów Radoszewic (1981)',
    'S03': 'Księga rodzinna T. Radoszewskiej-Zielińskiej',
    'S04': 'Kartka o Jerzym Radoszewskim (1902–1967)',
    'S05': 'Kartka o kaplicy w Uniejowie',
    'S06': 'Kartka z bibliografią',
    'S07': 'Zeszyt wspomnień A. z Prządzyńskich Radoszewskiej',
    'S08': 'Kajzer, Pałace i dwory… sieradzkie t. 2',
    'S09': 'Szkic „szlaku przodków” (2017)',
    'S10': 'Łakomy, Dwór i park w Radoszewicach (1978)',
}
MIES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']


def wczytaj(p):
    return yaml.safe_load(open(p, encoding='utf-8')) or []


def rok(v):
    if v is None:
        return None
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.year
    m = re.match(r'(\d{3,4})', str(v))
    return int(m.group(1)) if m else None


def norm_szukaj(t):
    t = unicodedata.normalize('NFD', str(t).lower().replace('ł', 'l'))
    return ''.join(c for c in t if not unicodedata.combining(c))


def fmt_data(d):
    """Data do wyświetlenia: pełna data → „24 IX 1902”; rok → „1902”; inne — tekst źródła."""
    if not d:
        return ''
    od, do, tekst = d.get('od'), d.get('do'), str(d.get('tekst') or '').strip()
    if isinstance(od, datetime.date) and od == do:
        return f'{od.day} {MIES[od.month - 1]} {od.year}'
    if isinstance(od, int) and od == do:
        if re.match(r'^(ok\.|około|ok|przed|po|przełom|zapewne|chyba)\b', tekst, re.I) and len(tekst) <= 24:
            return tekst
        return str(od)
    if isinstance(od, int) and isinstance(do, int) and len(tekst) > 24:
        return f'{od}–{do}'
    return tekst


def z_domu(n):
    """Prządzyńska → „z Prządzyńskich”; inne nazwiska → „z d. Brandel”."""
    if not n:
        return ''
    if '[?]' in n:
        return z_domu(n.replace('[?]', '')) + '[?]'
    if re.search(r'(ska|cka|dzka)$', n):
        return 'z ' + n[:-1] + 'ich'
    return 'z d. ' + n


def rdzen_nazwiska(n):
    """Radoszewska/Radoszewski → Radoszewski (do indeksu)."""
    n = (n or '').replace('[?]', '').strip()
    return re.sub(r'(sk|ck|dzk)a$', r'\1i', n)


def rzym(n):
    w = ''
    for v, s in ((1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'), (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
                 (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v:
            w += s
            n -= v
    return w


# ============================================================ dane

class Baza:
    def __init__(self):
        self.zr = yaml.safe_load(open(os.path.join(KORZEN, 'zrodla', 'zrodla.yaml'), encoding='utf-8'))
        SKROT.update({k: v['nazwa'] for k, v in self.zr.items() if v.get('nazwa')})    # nazwy nadane źródłom
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
        self._genealogia()

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

    # --- genealogia: rodzice główni i alternatywni, małżonkowie, dzieci
    def _genealogia(self):
        O = self.osoby
        waga = collections.Counter()
        self.tw_rodzic = collections.defaultdict(list)       # (dziecko, rodzic) -> twierdzenia
        self.tw_malz = collections.defaultdict(list)         # frozenset(a, b) -> twierdzenia
        self.tw_rodz = collections.defaultdict(list)         # frozenset(a, b) -> twierdzenia (rodzeństwo jawne)
        rodzice = collections.defaultdict(list)
        self.malzonkowie = collections.defaultdict(list)
        for t in self.tw:
            a, c = t['podmiot'], t.get('obiekt')
            if a not in O or c not in O:
                continue
            if t['relacja'] == 'rodzic':
                waga[(a, c)] += len(t['zrodla'])
                self.tw_rodzic[(a, c)].append(t)
                if c not in rodzice[a]:
                    rodzice[a].append(c)
            elif t['relacja'] in ('malzonek', 'slub'):
                self.tw_malz[frozenset((a, c))].append(t)
                for x, y in ((a, c), (c, a)):
                    if y not in self.malzonkowie[x]:
                        self.malzonkowie[x].append(y)
            elif t['relacja'] == 'rodzenstwo':
                self.tw_rodz[frozenset((a, c))].append(t)
        self.ojciec, self.matka, self.alt_rodzice = {}, {}, collections.defaultdict(list)
        for c, ps in rodzice.items():
            oj = sorted([p for p in ps if O[p]['plec'] == 'm'], key=lambda p: -waga[(c, p)])
            mt = sorted([p for p in ps if O[p]['plec'] != 'm'], key=lambda p: -waga[(c, p)])
            if oj:
                self.ojciec[c] = oj[0]
                self.alt_rodzice[c] += oj[1:]
            if mt:
                self.matka[c] = mt[0]
                self.alt_rodzice[c] += mt[1:]
        self.dzieci = collections.defaultdict(list)
        for c in O:
            for p in [self.ojciec.get(c), self.matka.get(c)] + self.alt_rodzice[c]:
                if p and c not in self.dzieci[p]:
                    self.dzieci[p].append(c)
        for p in self.dzieci:
            self.dzieci[p].sort(key=lambda c: (self.rok_ur(c) or 9999, self.nazwa_osoby(c)))

    def rodzice_glowni(self, c):
        return [p for p in (self.ojciec.get(c), self.matka.get(c)) if p]

    def rok_ur(self, i):
        w = [rok(t['data'].get('od') or t['data'].get('do')) for t in self.po_podmiocie[i]
             if t['relacja'] == 'urodzenie' and t.get('data')]
        w = [x for x in w if x]
        return min(w) if w else None

    # --- nazwy
    def imiona(self, i):
        return ' '.join(self.osoby[i].get('imiona') or [])

    def nazwisko_linia(self, i):
        """Część nazwiskowa: „Radoszewski”, „z Prządzyńskich Radoszewska”, „Grabińska”."""
        o = self.osoby[i]
        n, r = o.get('nazwisko'), o.get('nazwisko_rodowe')
        if r and n and r != n:
            return f'{z_domu(r)} {n}'
        if not n and not r:
            w = [x for x in (o.get('warianty') or []) if norm_szukaj(x) != norm_szukaj(self.imiona(i))]
            return f'({w[0]})' if w else ''
        return n or r or ''

    def nazwa_osoby(self, i):
        s = re.sub(r'\s+', ' ', f'{self.imiona(i)} {self.nazwisko_linia(i)}').strip()
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
            n += f' <span class="lata">({esc(self.lata(i))})</span>'
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
        return f'{s["zrodlo"]} s. {st}' if re.match(r'^\d', st) else f'{s["zrodlo"]} {st}'


# ============================================================ HTML: szablon

NAV = [('index.html', 'Start'), ('historia.html', 'Historia rodu'), ('drzewo.html', 'Drzewo'), ('osoby.html', 'Osoby'),
       ('pokrewienstwo.html', 'Pokrewieństwo'), ('miejsca.html', 'Miejsca'), ('groby.html', 'Groby'),
       ('czas.html', 'Oś czasu'), ('zrodla.html', 'Źródła'), ('sprawdzenie.html', 'Do sprawdzenia')]


def strona(tytul, tresc, aktywna='', glowa='', skrypty='', klasa=''):
    nav = ''.join(f'<a href="{h}"{" class=on" if h == aktywna else ""}>{esc(n)}</a>' for h, n in NAV)
    return f'''<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(tytul)} — Radoszewscy herbu Oksza</title>
<link rel="stylesheet" href="styl.css">{glowa}</head>
<body class="{klasa}"><header class="gora"><a class="marka" href="index.html"><span class="topor" aria-hidden="true">⚔</span> Radoszewscy <span>herbu Oksza</span></a>
<form class="szybkie" action="szukaj.html"><input name="q" type="search" placeholder="Szukaj osoby, miejsca, słowa…" aria-label="Szukaj"></form>
<nav>{nav}</nav></header>
<main>{tresc}</main>
<footer>Baza wiedzy o rodzinie Boxa-Radoszewskich h. Oksza · każda informacja z odsyłaczem do źródła (strona, zdjęcie, cytat) · wygenerowano {datetime.date.today().isoformat()}</footer>
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


def md_html(b, tekst, ext=()):
    # python-markdown wymaga pustej linii przed listą — w opracowaniach jej często brak
    wyn, poprz = [], ''
    for w in tekst.split('\n'):
        lista = bool(re.match(r'[ \t]*(?:[-*+]|\d+\.)\s', w))
        if lista and poprz.strip() and not re.match(r'[ \t]*(?:[-*+]|\d+\.)\s', poprz):
            wyn.append('')
        wyn.append(w)
        poprz = w
    tekst = '\n'.join(wyn)
    return segmenty_linki(b, markdown.markdown(tekst, extensions=['tables', 'toc', 'sane_lists', *ext]))


# ============================================================ przypisy źródłowe

class Przypisy:
    """Numerowane przypisy: jeden numer = jeden fragment źródła (segment); przy nim wszystkie cytaty."""

    def __init__(self, b):
        self.b, self.kol, self.cyt = b, [], collections.defaultdict(list)

    def ref(self, zrodla):
        nums = []
        for z in zrodla:
            s = z['segment']
            if s not in self.cyt:
                self.kol.append(s)
            if z['cytat'] not in self.cyt[s]:
                self.cyt[s].append(z['cytat'])
            n = self.kol.index(s) + 1
            if n not in nums:
                nums.append(n)
        nums.sort()
        return '<sup class="pp">' + ','.join(f'<a href="#p{n}" title="{esc(self.b.seg_etykieta(self.kol[n - 1]))}">{n}</a>'
                                             for n in nums) + '</sup>'

    def html(self, tytul='Źródła'):
        if not self.kol:
            return ''
        h = [f'<section class="przypisy-sek"><h2>{tytul}</h2><ol class="przypisy">']
        for n, s in enumerate(self.kol, 1):
            sg = self.b.seg.get(s, {})
            zr = sg.get('zrodlo', s[:3])
            zdj = sg.get('zdjecie')
            foto = (f' · <a class="foto" href="skany/{nazwa_www(zdj)}" target="_blank" title="zdjęcie strony oryginału">zdjęcie</a>'
                    if zdj else '')
            cyt = ' · '.join(f'„{trans_html_inline(c)}”' for c in self.cyt[s])
            h.append(f'<li id="p{n}"><a href="{self.b.seg_url(s)}">{esc(self.b.seg_etykieta(s))}</a> '
                     f'<span class="zr-tyt">{esc(SKROT.get(zr, ""))}</span>{foto}<br><span class="cytat">{cyt}</span></li>')
        h.append('</ol></section>')
        return ''.join(h)


NIEP = ' <span class="znak-niep" title="odczyt niepewny — zob. „Do sprawdzenia”">?</span>'
ETYK = {'urodzenie': 'Urodzenie', 'smierc': 'Śmierć', 'pochowek': 'Pochówek', 'chrzest': 'Chrzest',
        'slub': 'Ślub', 'malzonek': 'Małżeństwo', 'rodzic': 'Rodzic', 'rodzenstwo': 'Rodzeństwo',
        'urzad': 'Urząd', 'zawod': 'Zawód', 'wyksztalcenie': 'Wykształcenie', 'odznaczenie': 'Odznaczenie',
        'wlasnosc': 'Majątek', 'zamieszkanie': 'Zamieszkanie', 'udzial_w_wydarzeniu': 'Wydarzenie',
        'fundacja': 'Fundacja', 'herb': 'Herb', 'opis': 'Informacja'}


def klucz_daty(t):
    d = t.get('data') or {}
    return (rok(d.get('od') or d.get('do')) or 9999, t['id'])


def fakt_tresc(b, t, widok=None, pomin_rok=False):
    """Treść faktu (bez etykiety i przypisów) z perspektywy osoby/miejsca `widok`."""
    cz = []
    if widok and widok == t.get('obiekt') and widok != t['podmiot']:
        cz.append(b.link(t['podmiot'], True))
        if t.get('wartosc'):
            cz.append('— ' + esc(t['wartosc']))
    else:
        if widok != t['podmiot']:
            cz.append(b.link(t['podmiot'], True) + ':')
        if t.get('obiekt'):
            cz.append(b.link(t['obiekt'], True))
        if t.get('wartosc'):
            cz.append(('— ' if t.get('obiekt') else '') + esc(t['wartosc']))
    d = fmt_data(t.get('data'))
    if d and not (pomin_rok and d == str(rok((t.get('data') or {}).get('od') or (t.get('data') or {}).get('do')))):
        cz.append(f'<span class="data">{esc(d)}</span>')
    if t.get('miejsce') and t['miejsce'] != widok:
        cz.append('· ' + b.link(t['miejsce']))
    return ' '.join(cz)


def fakt_li(b, P, t, widok=None, etykieta=None, z_rokiem=False):
    et = etykieta if etykieta is not None else ETYK.get(t['relacja'], t['relacja'])
    niep = NIEP if t['pewnosc_odczytu'] == 'niepewna' else ''
    uw = f'<span class="uw">{esc(t["uwagi"])}</span>' if t.get('uwagi') else ''
    rk = ''
    tresc = fakt_tresc(b, t, widok, z_rokiem)
    if z_rokiem:
        r = rok((t.get('data') or {}).get('od') or (t.get('data') or {}).get('do'))
        rk = f'<span class="rok">{r or ""}</span>'
    et_h = f'<span class="et">{esc(et)}:</span> ' if et else ''
    return (f'<li>{rk}<span class="tr">{et_h}{tresc}{niep}{P.ref(t["zrodla"])}{uw}</span></li>')


# ============================================================ strony: osoby

def wersje_zdarzenia(b, P, i, rel):
    """Wersje daty/miejsca jednorazowego zdarzenia (urodzenie, śmierć…) — sprzeczne pokazane obok siebie."""
    def przodkowie_miejsca(m):
        w = []
        while m in b.miejsca and b.miejsca[m].get('nadrzedne'):
            m = b.miejsca[m]['nadrzedne']
            w.append(m)
        return w

    def zgodne_daty(a, c):
        return not a or not c or a == c or a.endswith(' ' + c) or c.endswith(' ' + a)

    def zgodne_miejsca(a, c):
        return not a or not c or a == c or a in przodkowie_miejsca(c) or c in przodkowie_miejsca(a)

    # wersje zgodne (np. „24 IX 1902, Krempa” i „1902”) łączymy — „albo” tylko przy rzeczywistej sprzeczności
    grupy = []                      # [data, miejsce, [twierdzenia]]
    ts_ = sorted([t for t in b.po_podmiocie[i] if t['relacja'] == rel],
                 key=lambda t: (-len(fmt_data(t.get('data'))), -len(przodkowie_miejsca(t.get('miejsce'))), t['id']))
    for t in ts_:
        d, m = fmt_data(t.get('data')), t.get('miejsce') or ''
        for g in grupy:
            if zgodne_daty(g[0], d) and zgodne_miejsca(g[1], m):
                if len(d) > len(g[0]):
                    g[0] = d
                if m and (not g[1] or g[1] in przodkowie_miejsca(m)):
                    g[1] = m
                g[2].append(t)
                break
        else:
            grupy.append([d, m, [t]])
    grupy.sort(key=lambda g: klucz_daty(g[2][0]))
    grupy = collections.OrderedDict(((d, m, ''), ts) for d, m, ts in grupy)
    czesci = []
    for (d, m, w), ts in grupy.items():
        s = ' '.join(x for x in [esc(d) if d else '', b.link(m) if m else '', esc(w) if w and not d and not m else ''] if x)
        if not s:
            s = 'tak (bez daty)'
        niep = NIEP if any(t['pewnosc_odczytu'] == 'niepewna' for t in ts) else ''
        czesci.append(s + niep + P.ref([z for t in ts for z in t['zrodla']]))
    return czesci, len(grupy) > 1


def tytuly(b, i):
    w = []
    for t in sorted(b.po_podmiocie[i], key=klucz_daty):
        if t['relacja'] in ('urzad', 'zawod') and t.get('wartosc'):
            s = re.split(r';', t['wartosc'])[0].strip()
            s = re.sub(r'\s*\([^)]*\)', '', s)
            if len(s) > 70:
                s = s[:67].rsplit(' ', 1)[0] + '…'
            if norm_szukaj(s) not in [norm_szukaj(x) for x in w]:
                w.append(s)
    return w[:4]


def mini_przodkowie(b, i):
    """Tabela przodków (do pradziadków) — siatka 4 kolumn × 8 wierszy."""
    if not b.rodzice_glowni(i):
        return ''
    kom = []

    def wezel(x, g, r):            # g — pokolenie (0..3), r — numer w pokoleniu
        rozp = 8 >> g
        if x:
            tresc = (f'<a href="{b.url(x)}">{esc(b.nazwa_osoby(x))}</a>'
                     + (f'<span class="lata">{esc(b.lata(x))}</span>' if b.lata(x) else ''))
            kl = b.osoby[x]['plec']
        else:
            tresc, kl = '', 'pusta'
        kom.append(f'<div class="mp {kl}" style="grid-column:{g + 1};grid-row:{r * rozp + 1}/span {rozp}">{tresc}</div>')
        if g < 3:
            o = b.ojciec.get(x) if x else None
            m = b.matka.get(x) if x else None
            wezel(o, g + 1, r * 2)
            wezel(m, g + 1, r * 2 + 1)
    wezel(i, 0, 0)
    return ('<section class="mini"><h2>Przodkowie</h2><div class="mini-przodkowie">' + ''.join(kom) +
            f'</div><p class="drobne"><a href="drzewo.html#przodkowie:{i}">wszyscy przodkowie w drzewie →</a></p></section>')


def osoba_strona(b, i):
    o = b.osoby[i]
    P = Przypisy(b)
    plec = o['plec']
    sufiks = 'a' if plec == 'k' else 'y'
    rz = rdzen_nazwiska(o.get('nazwisko') or o.get('nazwisko_rodowe'))
    h = [f'<p class="sciezka"><a href="osoby.html">Osoby</a>'
         + (f' › <a href="osoby.html#n-{esc(norm_szukaj(rz))}">{esc(rz)}</a>' if rz else '') + '</p>']
    herb = []
    if o.get('przydomek'):
        herb.append(esc(o['przydomek']))
    if o.get('herb'):
        herb.append('h. ' + esc(o['herb']))
    h.append(f'<h1 class="os-{plec}">{esc(b.nazwa_osoby(i))}'
             + (f' <span class="herb">{" ".join(herb)}</span>' if herb else '') + '</h1>')
    zycie = []
    for rel, sk in (('urodzenie', 'ur.'), ('chrzest', 'chrz.'), ('smierc', 'zm.'), ('pochowek', f'pochowan{sufiks}')):
        cz, spor = wersje_zdarzenia(b, P, i, rel)
        if cz:
            zycie.append(f'<span class="zd"><b>{sk}</b> ' + (' <i>albo</i> '.join(cz)) +
                         (' <span class="spor" title="źródła podają różne wersje">różne wersje</span>' if spor else '') + '</span>')
    if zycie:
        h.append('<p class="zycie">' + '<br>'.join(zycie) + '</p>')
    ty = tytuly(b, i)
    if ty:
        h.append('<p class="tytuly">' + ' · '.join(esc(x) for x in ty) + '</p>')
    h.append(f'<p class="narz"><a class="przycisk" href="drzewo.html#rodzina:{i}">Drzewo rodziny</a>'
             f'<a class="przycisk" href="drzewo.html#przodkowie:{i}">Przodkowie</a>'
             + (f'<a class="przycisk" href="drzewo.html#potomkowie:{i}">Potomkowie</a>' if b.dzieci[i] else '') +
             f'<a class="przycisk" href="pokrewienstwo.html#{i}">Pokrewieństwo z…</a></p>')

    gl = ['<div class="glowna">']
    # --- rodzice
    rodz = []
    for p, et in ((b.ojciec.get(i), 'Ojciec'), (b.matka.get(i), 'Matka')):
        if p:
            rodz.append(f'<li><span class="et">{et}</span> {b.link(p, True)}{P.ref([z for t in b.tw_rodzic[(i, p)] for z in t["zrodla"]])}</li>')
    for p in b.alt_rodzice[i]:
        et = 'Ojciec' if b.osoby[p]['plec'] == 'm' else 'Matka'
        rodz.append(f'<li class="alt"><span class="et">{et}?</span> {b.link(p, True)} <span class="spor">według innego przekazu</span>'
                    f'{P.ref([z for t in b.tw_rodzic[(i, p)] for z in t["zrodla"]])}</li>')
    if rodz:
        gl.append('<section><h2>Rodzice</h2><ul class="rodzina">' + ''.join(rodz) + '</ul></section>')
    # --- małżeństwa i dzieci
    malz = list(b.malzonkowie[i])
    dzieci = list(b.dzieci[i])
    przydz = set()
    bloki = []
    for s in malz:
        ts = b.tw_malz[frozenset((i, s))]
        sl = [t for t in ts if t.get('data') or t.get('miejsce')]
        slub = ''
        if sl:
            wer = collections.OrderedDict()
            for t in sl:
                wer.setdefault((fmt_data(t.get('data')), t.get('miejsce') or ''), []).append(t)
            slub = ' — ślub ' + ' <i>albo</i> '.join(
                ' '.join(x for x in [esc(d), b.link(m) if m else ''] if x) for (d, m) in wer)
        uw = [t['wartosc'] for t in ts if t.get('wartosc')]
        niep = NIEP if any(t['pewnosc_odczytu'] == 'niepewna' for t in ts) else ''
        wsp = [c for c in dzieci if s in [b.ojciec.get(c), b.matka.get(c)] + b.alt_rodzice[c]]
        przydz.update(wsp)
        dz = ''.join(f'<li>{b.link(c, True)}{P.ref([z for t in b.tw_rodzic[(c, i)] for z in t["zrodla"]])}</li>' for c in wsp)
        bloki.append(f'<div class="malz"><p><span class="inf">∞</span> {b.link(s, True)}{slub}{niep}'
                     f'{P.ref([z for t in ts for z in t["zrodla"]])}</p>'
                     + (f'<p class="uw">{esc("; ".join(uw))}</p>' if uw else '')
                     + (f'<ol class="dzieci">{dz}</ol>' if dz else '') + '</div>')
    reszta = [c for c in dzieci if c not in przydz]
    if reszta:
        dz = ''.join(f'<li>{b.link(c, True)}{P.ref([z for t in b.tw_rodzic[(c, i)] for z in t["zrodla"]])}'
                     + (' <span class="spor">wg innego przekazu</span>' if i in b.alt_rodzice[c] else '') + '</li>' for c in reszta)
        bloki.append(f'<div class="malz"><p class="drobne">{"Dzieci (drugi rodzic nieznany ze źródeł)" if malz else "Dzieci"}</p>'
                     f'<ol class="dzieci">{dz}</ol></div>')
    if bloki:
        gl.append(f'<section><h2>{"Małżeństwa i dzieci" if malz else "Dzieci"}</h2>' + ''.join(bloki) + '</section>')
    # --- rodzeństwo: wspólni rodzice + rodzeństwo wprost w źródłach
    rodzenstwo = collections.OrderedDict()
    for p in b.rodzice_glowni(i):
        for c in b.dzieci[p]:
            if c != i:
                rodzenstwo.setdefault(c, set()).add(p)
    jawne = {}
    for k, ts in b.tw_rodz.items():
        if i in k:
            (x,) = k - {i} if len(k) == 2 else (i,)
            if x != i:
                jawne[x] = ts
                rodzenstwo.setdefault(x, set())
    if rodzenstwo:
        moi = set(b.rodzice_glowni(i))
        li = []
        for c in sorted(rodzenstwo, key=lambda c: (b.rok_ur(c) or 9999, b.nazwa_osoby(c))):
            wsp = rodzenstwo[c]
            przyr = wsp and moi and len(moi) == 2 and len(set(b.rodzice_glowni(c)) & moi) == 1
            li.append(f'<li>{b.link(c, True)}' + (' <span class="drobne">(przyrodnie)</span>' if przyr else '')
                      + (P.ref([z for t in jawne[c] for z in t['zrodla']]) if c in jawne else '') + '</li>')
        gl.append('<section><h2>Rodzeństwo</h2><ul class="rodz-lista">' + ''.join(li) + '</ul></section>')
    # --- życiorys
    ZYC = ('urzad', 'zawod', 'wyksztalcenie', 'odznaczenie', 'herb', 'wlasnosc', 'zamieszkanie', 'fundacja',
           'udzial_w_wydarzeniu', 'opis')
    fs = [t for t in b.po_podmiocie[i] if t['relacja'] in ZYC]
    sl = [t for t in b.po_podmiocie[i] if t['relacja'] in ('malzonek', 'slub') and t.get('obiekt') not in b.osoby]
    fs += sl
    if fs:
        # te same informacje z kilku źródeł — razem, z wszystkimi przypisami
        grupy = collections.OrderedDict()
        for t in sorted(fs, key=klucz_daty):
            k = (t['relacja'], norm_szukaj(t.get('wartosc') or ''), t.get('obiekt'), fmt_data(t.get('data')), t.get('miejsce'))
            grupy.setdefault(k, []).append(t)
        li = []
        for ts in grupy.values():
            t = ts[0]
            r = rok((t.get('data') or {}).get('od') or (t.get('data') or {}).get('do'))
            niep = NIEP if any(x['pewnosc_odczytu'] == 'niepewna' for x in ts) else ''
            uw = [x['uwagi'] for x in ts if x.get('uwagi')]
            et = ETYK.get(t['relacja'], '') if t['relacja'] != 'opis' else ''
            li.append(f'<li><span class="rok">{r or ""}</span><span class="tr">'
                      + (f'<span class="et">{esc(et)}:</span> ' if et else '')
                      + fakt_tresc(b, t, i, True) + niep + P.ref([z for x in ts for z in x['zrodla']])
                      + (f'<span class="uw">{esc("; ".join(dict.fromkeys(uw)))}</span>' if uw else '') + '</span></li>')
        gl.append('<section><h2>Życiorys i informacje</h2><ul class="zyciorys">' + ''.join(li) + '</ul></section>')
    # uwagi przy zdarzeniach jednorazowych
    uwz = [t for t in b.po_podmiocie[i] if t['relacja'] in ('urodzenie', 'chrzest', 'smierc', 'pochowek') and (t.get('uwagi') or t.get('wartosc'))]
    if uwz:
        gl.append('<section><h2>Szczegóły narodzin, śmierci i pochówku</h2><ul class="zyciorys">' +
                  ''.join(f'<li><span class="rok"></span><span class="tr"><span class="et">{ETYK[t["relacja"]]}:</span> '
                          f'{esc(t.get("wartosc") or "")} {esc(t.get("uwagi") or "")}{P.ref(t["zrodla"])}</span></li>' for t in uwz) + '</ul></section>')
    inne = [t for t in b.po_obiekcie[i] if t['relacja'] not in ('rodzic', 'malzonek', 'slub', 'rodzenstwo')]
    if inne:
        gl.append('<section><h2>Wzmianki w informacjach o innych</h2><ul class="zyciorys">' +
                  ''.join(f'<li><span class="rok">{rok((t.get("data") or {}).get("od")) or ""}</span><span class="tr">'
                          f'{b.link(t["podmiot"], True)}: {esc(ETYK.get(t["relacja"], "").lower())} {esc(t.get("wartosc") or "")}'
                          f'{(" · " + b.link(t["miejsce"])) if t.get("miejsce") else ""}{P.ref(t["zrodla"])}</span></li>'
                          for t in sorted(inne, key=klucz_daty)) + '</ul></section>')
    # --- uwagi badawcze
    ub = []
    if o.get('warianty'):
        ub.append('<li><b>W źródłach zapisany(-a) także:</b> ' + ' · '.join(esc(w) for w in o['warianty']) + '</li>')
    if o.get('utozsamienie'):
        ub.append(f'<li><b>Utożsamienie:</b> {esc(o["utozsamienie"])}</li>')
    if o.get('uwagi'):
        ub.append(f'<li><b>Uwagi:</b> {esc(o["uwagi"])}</li>')
    if ub:
        gl.append('<section class="badawcze"><h2>Uwagi badawcze</h2><ul>' + ''.join(ub) + '</ul></section>')
    gl.append(P.html())
    gl.append('</div>')
    boczna = '<aside class="boczna">' + mini_przodkowie(b, i) + '</aside>'
    h.append('<div class="uklad">' + ''.join(gl) + boczna + '</div>')
    zapisz(f'osoba-{i}.html', strona(b.nazwa_osoby(i), '\n'.join(h), 'osoby.html'))


def osoby_lista(b):
    """Indeks nazwisk (jak w serwisach GeneWeb): kobiety pod nazwiskiem po mężu i pod rodowym."""
    grupy = collections.defaultdict(list)
    for i, o in b.osoby.items():
        klucze = {rdzen_nazwiska(o.get('nazwisko')), rdzen_nazwiska(o.get('nazwisko_rodowe'))} - {''}
        if not klucze and o.get('herb') == 'Oksza':
            klucze = {'Okszyce (najdawniejsze pokolenia)'}
        for k in klucze or {'(bez nazwiska)'}:
            grupy[k].append(i)
    kol = sorted(grupy, key=lambda k: (k == '(bez nazwiska)', norm_szukaj(k)))
    h = ['<h1>Osoby — indeks nazwisk</h1>',
         f'<p class="lead">{len(b.osoby)} osób. Kobiety są wpisane i pod nazwiskiem rodowym, i pod nazwiskiem po mężu. '
         'Kliknij nazwisko, aby przejść do listy osób; przy osobie — lata życia i rodzice.</p>',
         '<p><input id="filtr" type="search" placeholder="Filtruj: imię, nazwisko, rok…" class="filtr duzy"></p>']
    litery = collections.OrderedDict()
    for k in kol:
        litery.setdefault(norm_szukaj(k)[:1].upper() if k != '(bez nazwiska)' else '—', []).append(k)
    h.append('<nav class="alfabet">' + ''.join(f'<a href="#l-{esc(l)}">{esc(l)}</a>' for l in litery) + '</nav>')
    h.append('<div class="chmura">' + ''.join(
        f'<a href="#n-{esc(norm_szukaj(k))}" class="w{min(4, 1 + len(grupy[k]) // 8)}">{esc(k)} <span>{len(grupy[k])}</span></a> '
        for k in kol) + '</div><div id="lista-osob">')
    for l, ks in litery.items():
        h.append(f'<h2 class="litera" id="l-{esc(l)}">{esc(l)}</h2>')
        for k in ks:
            ids = sorted(grupy[k], key=lambda i: (b.rok_ur(i) or 9999, norm_szukaj(b.nazwa_osoby(i))))
            h.append(f'<section class="grupa" id="n-{esc(norm_szukaj(k))}"><h3>{esc(k)} <span class="licz">{len(ids)}</span></h3><ul class="indeks">')
            for i in ids:
                rodz = ', '.join(esc(b.imiona(p)) for p in b.rodzice_glowni(i))
                malz = ', '.join(esc(b.nazwa_osoby(s)) for s in b.malzonkowie[i][:2])
                h.append(f'<li data-s="{esc(norm_szukaj(b.nazwa_osoby(i) + " " + " ".join(b.osoby[i].get("warianty") or []) + " " + b.lata(i)))}">'
                         f'{b.link(i, True)}'
                         + (f' <span class="drobne">· {"syn" if b.osoby[i]["plec"] == "m" else "córka"}: {rodz}</span>' if rodz else '')
                         + (f' <span class="drobne">· ∞ {malz}</span>' if malz else '') + '</li>')
            h.append('</ul></section>')
    h.append('</div>')
    zapisz('osoby.html', strona('Osoby', '\n'.join(h), 'osoby.html', skrypty='<script src="filtr.js"></script>'))


# ============================================================ drzewo: dane dla przeglądarki

def korzenie(b):
    """Protoplaści rodów: osoby bez rodziców, których małżonek też nie ma rodziców w bazie; wg liczby potomków."""
    def potomkowie(i):
        widz, st = set(), [i]
        while st:
            x = st.pop()
            for c in b.dzieci[x]:
                if c not in widz:
                    widz.add(c)
                    st.append(c)
        return widz
    wyn = []
    for i in b.osoby:
        if b.rodzice_glowni(i) or not b.dzieci[i]:
            continue
        if any(b.rodzice_glowni(s) for s in b.malzonkowie[i]):
            continue                       # wżeniony — pokazany przy małżonku
        if b.osoby[i]['plec'] == 'k' and any(not b.rodzice_glowni(s) and b.dzieci[s] for s in b.malzonkowie[i]):
            continue                       # para bez rodziców — ród prowadzi mąż
        n = len(potomkowie(i))
        if n >= 2:
            wyn.append((i, n))
    wyn.sort(key=lambda x: (x[0] != 'wrszowiec-jan', -x[1]))
    return wyn


def dane_drzewa(b):
    P = {}
    for i, o in b.osoby.items():
        P[i] = [b.imiona(i), b.nazwisko_linia(i), b.lata(i), o['plec']]
    F = {c: [b.ojciec.get(c), b.matka.get(c), b.alt_rodzice[c]] for c in b.osoby
         if b.ojciec.get(c) or b.matka.get(c) or b.alt_rodzice[c]}
    S = {i: v for i, v in b.malzonkowie.items() if v}
    R = []
    for i, n in korzenie(b):
        R.append([i, dane_rod(b, i), n])
    # najmłodsze pokolenie — przodkowie (cała „mozaika” rodzin)
    def l_przodkow(i, w=None):
        w = w if w is not None else set()
        for p in b.rodzice_glowni(i):
            if p not in w:
                w.add(p)
                l_przodkow(p, w)
        return w
    mlodzi = sorted([i for i in b.osoby if not b.dzieci[i]], key=lambda i: -len(l_przodkow(i)))[:6]
    Y = [[i, len(l_przodkow(i))] for i in mlodzi]
    return {'P': P, 'F': F, 'S': S, 'R': R, 'Y': Y}


def drzewo(b):
    D = dane_drzewa(b)
    open(os.path.join(WYJ, 'dane-drzewo.js'), 'w', encoding='utf-8').write(
        'window.DRZEWO=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';')
    opcje = ''.join(f'<option value="potomkowie:{i}">{esc(rod)} — od: {esc(b.nazwa_osoby(i))} ({n} potomków)</option>'
                    for i, rod, n in D['R'])
    opcje_p = ''.join(f'<option value="przodkowie:{i}">Przodkowie: {esc(b.nazwa_osoby(i))} {esc(b.lata(i))} ({n} os.)</option>'
                      for i, n in D['Y'])
    h = ['<div class="drzewo-gora"><h1>Drzewo genealogiczne</h1>',
         '<div class="pasek">'
         '<label>Pokaż: <select id="wybor-rodu"><option value="">— osoba wybrana z karty lub z drzewa —</option><optgroup label="Całe drzewo rodu (wszyscy potomkowie)">' + opcje +
         '</optgroup><optgroup label="Wszyscy przodkowie osoby">' + opcje_p + '</optgroup></select></label>'
         '<span class="tryby" role="group" aria-label="Rodzaj drzewa">'
         '<button type="button" data-tryb="potomkowie">Potomkowie</button>'
         '<button type="button" data-tryb="przodkowie">Przodkowie</button>'
         '<button type="button" data-tryb="rodzina">Rodzina</button></span>'
         '<span class="tryby" role="group" aria-label="Widok"><button type="button" data-widok="wykres" class="on">Wykres</button>'
         '<button type="button" data-widok="lista">Lista</button></span>'
         '<input id="znajdz" list="lista-os" placeholder="Znajdź osobę w drzewie…" class="filtr">'
         '<datalist id="lista-os"></datalist></div>'
         '<p id="opis-drzewa" class="drobne"></p></div>',
         '<div id="wykres" class="wykres" tabindex="0" aria-label="Drzewo — przeciągnij myszą, kółko powiększa">'
         '<div id="swiat"></div>'
         '<div class="zoom"><button type="button" data-z="1" title="powiększ">+</button><button type="button" data-z="-1" title="pomniejsz">−</button>'
         '<button type="button" data-z="fit" title="całe drzewo na ekranie">całość</button><button type="button" data-z="100" title="naturalna wielkość">100%</button>'
         '<button type="button" data-z="druk" title="drukuj lub zapisz do PDF">drukuj</button></div>'
         '<canvas id="mini" width="220" height="150" title="mapa drzewa — kliknij, aby przejść"></canvas>'
         '<div id="panel" class="panel" hidden></div></div>',
         '<div id="lista" class="lista-drzewa" hidden></div>',
         '<details class="pomoc"><summary>Jak czytać drzewo</summary><ul>'
         '<li><b>Potomkowie</b> — wybrana osoba na górze, pod nią wszystkie kolejne pokolenia; <b>Przodkowie</b> — osoba na dole, '
         'nad nią rodzice, dziadkowie i dalej; <b>Rodzina</b> — przodkowie nad osobą i potomkowie pod nią.</li>'
         '<li>Przeciągnij myszą (palcem), aby przesuwać; kółko myszy lub +/− powiększa. „Całość” mieści drzewo na ekranie, '
         'mapka w rogu pokazuje, gdzie jesteś.</li>'
         '<li>W ramce: imiona, nazwisko, lata życia, pod kreską ∞ małżonkowie. Ramka niebieska — mężczyzna, czerwona — kobieta. '
         'Kliknij osobę: otworzy się okienko z odnośnikami do karty osoby i do jej drzewa.</li>'
         '<li>Ramka przerywana = ta sama osoba stoi w drzewie już gdzie indziej (kliknij, aby tam przejść) albo przynależność '
         'wynika z innego przekazu (źródła podają różnych rodziców — nie są scalane).</li>'
         '<li>Przy osobie z dziećmi przycisk −/+ zwija i rozwija gałąź. Widok <b>Lista</b> pokazuje to samo jako spis z numeracją '
         '(dla potomków: 1, 1.1, 1.1.2…; dla przodków: 1 — osoba, 2 — ojciec, 3 — matka, 4–7 — dziadkowie…) i nadaje się do druku.</li>'
         '</ul></details>']
    zapisz('drzewo.html', strona('Drzewo', '\n'.join(h), 'drzewo.html', klasa='szeroka',
                                 skrypty='<script src="dane-drzewo.js"></script><script src="drzewo.js"></script>'))


def pokrewienstwo(b):
    h = ['<h1>Pokrewieństwo i koligacje</h1>',
         '<p class="lead">Wybierz dwie osoby — strona pokaże, przez kogo są spokrewnione (najbliższy wspólny przodek i obie linie) '
         'oraz najkrótszy łańcuch powiązań rodzinnych, także przez małżeństwa.</p>',
         '<div class="pokr-wybor"><label>Pierwsza osoba<input id="os-a" list="lista-os" class="filtr"></label>'
         '<label>Druga osoba<input id="os-b" list="lista-os" class="filtr"></label>'
         '<button type="button" id="licz" class="przycisk">Pokaż</button></div><datalist id="lista-os"></datalist>',
         '<div id="wynik-pokr"></div>']
    zapisz('pokrewienstwo.html', strona('Pokrewieństwo', '\n'.join(h), 'pokrewienstwo.html',
                                        skrypty='<script src="dane-drzewo.js"></script><script src="pokrewienstwo.js"></script>'))


# ============================================================ strony: miejsca

def miejsce_strona(b, i):
    m = b.miejsca[i]
    P = Przypisy(b)
    h = [f'<p class="sciezka"><a href="miejsca.html">Miejsca</a>'
         f'{" › " + b.link(m["nadrzedne"]) if m.get("nadrzedne") in b.miejsca else ""}</p>',
         f'<h1>{esc(m["nazwa"])}</h1>']
    meta = [esc(m['typ'])]
    if m.get('dzis'):
        meta.append('dziś: ' + esc(m['dzis']))
    meta.append({'pewna': 'identyfikacja pewna', 'prawdopodobna': 'identyfikacja prawdopodobna',
                 'do_ustalenia': 'identyfikacja do ustalenia'}[m['pewnosc_identyfikacji']])
    h.append(f'<p class="tytuly">{" · ".join(meta)}</p>')
    if m.get('warianty'):
        h.append('<p class="drobne"><b>W źródłach także:</b> ' + ' · '.join(esc(w) for w in m['warianty']) + '</p>')
    if m.get('uwagi'):
        h.append(f'<p class="uwaga">{esc(m["uwagi"])}</p>')
    if i in OPRACOWANIE_KOTWICE:
        h.append(f'<p><a class="przycisk" href="opracowanie-majatki.html#{OPRACOWANIE_KOTWICE[i]}">Dzieje majątku — opracowanie</a></p>')
    if b.dzieci_miejsc[i]:
        h.append('<p><b>Obejmuje:</b> ' + ' · '.join(b.link(c) for c in sorted(b.dzieci_miejsc[i], key=b.nazwa)) + '</p>')
    gl = ['<div class="glowna">']
    wl = [t for t in b.po_obiekcie[i] if t['relacja'] == 'wlasnosc']
    for c in b.dzieci_miejsc[i]:
        wl += [t for t in b.po_obiekcie[c] if t['relacja'] == 'wlasnosc']
    if wl:
        gl.append('<section><h2>Właściciele w czasie</h2><ul class="zyciorys">' +
                  ''.join(fakt_li(b, P, t, i, '', True) for t in sorted(wl, key=klucz_daty)) + '</ul></section>')
    opis = sorted(b.po_podmiocie[i], key=klucz_daty)
    if opis:
        gl.append('<section><h2>Informacje o miejscu</h2><ul class="zyciorys">' + ''.join(fakt_li(b, P, t, i, '', True) for t in opis) + '</ul></section>')
    tu = sorted(b.po_miejscu[i], key=klucz_daty)
    if tu:
        gl.append('<section><h2>Wydarzenia w tym miejscu</h2><ul class="zyciorys">' + ''.join(fakt_li(b, P, t, i, None, True) for t in tu) + '</ul></section>')
    inne = [t for t in b.po_obiekcie[i] if t['relacja'] != 'wlasnosc']
    if inne:
        gl.append('<section><h2>Inne wzmianki</h2><ul class="zyciorys">' + ''.join(fakt_li(b, P, t, i, None, True) for t in sorted(inne, key=klucz_daty)) + '</ul></section>')
    gl.append(P.html())
    gl.append('</div>')
    bok = ''
    if m.get('wsp'):
        bok = (f'<aside class="boczna"><div id="mapa" class="mapa mala" data-lat="{m["wsp"][0]}" data-lon="{m["wsp"][1]}" data-nazwa="{esc(m["nazwa"])}"></div>'
               f'<p class="drobne">Współrzędne: {esc(str(m.get("wsp_zrodlo") or ""))}</p></aside>')
    h.append('<div class="uklad">' + ''.join(gl) + bok + '</div>')
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
                if r and r > 1000 and str(r) in str((t.get('data') or {}).get('tekst') or '')]
        osoby = collections.Counter(e for t in fs for e in (t['podmiot'], t.get('obiekt')) if e in b.osoby)
        karty[kat].append({'id': i, 'fs': fs, 'lata': lata, 'osoby': osoby, 'ids': ids})
        m = b.miejsca[i]
        if m.get('wsp') and not m.get('wsp_dziedz'):
            punkty.append({'id': i, 'n': m['nazwa'], 'lat': m['wsp'][0], 'lon': m['wsp'][1], 'f': len(fs), 'k': kat})
    h = ['<h1>Miejsca i majątki</h1>',
         f'<p class="lead">{len(gora)} miejscowości i miejsc, pogrupowanych według tego, co łączy je z rodziną. '
         'Najpierw miejsca ważne (3 i więcej informacji), niżej — zwinięte — rzadkie wzmianki.</p>',
         '<div id="mapa" class="mapa"></div><div class="legenda" id="legenda">' +
         ''.join(f'<label><input type="checkbox" data-k="{k}" checked><span class="kropka" style="background:{kol}"></span>{esc(n)}</label>'
                 for k, n, kol, _ in KATEGORIE) + '</div>',
         f'<p class="drobne">Na mapie {len(punkty)} miejsc z ustalonym położeniem (OpenStreetMap, przejrzane ręcznie). '
         'Wielkość kółka = liczba informacji.</p>',
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
            pod = x['ids'][1:]
            na_mapie = (f'<button type="button" class="na-mapie" data-id="{x["id"]}">na mapie</button>'
                        if m.get('wsp') and not m.get('wsp_dziedz') else '')
            h.append(f'<article class="karta-mj" style="border-top-color:{kol}"><h3>{b.link(x["id"])}</h3>'
                     + (f'<p class="dzis">{esc(dz)}</p>' if dz else '') +
                     f'<p class="liczby-mj"><b>{len(x["fs"])}</b> informacji' + (f' · <b>{okres}</b>' if okres else '') +
                     f' · {len(x["osoby"])} osób</p>'
                     + (f'<p class="osoby-mj">{osoby}</p>' if osoby else '')
                     + (('<p class="pod">W tym: ' + ', '.join(b.link(c) for c in pod[:6]) + (' …' if len(pod) > 6 else '') + '</p>') if pod else '')
                     + (f'<p><a class="przycisk maly" href="opracowanie-majatki.html#{OPRACOWANIE_KOTWICE[x["id"]]}">dzieje majątku</a> {na_mapie}</p>'
                        if x['id'] in OPRACOWANIE_KOTWICE else (f'<p>{na_mapie}</p>' if na_mapie else ''))
                     + '</article>')
        h.append('</div>')
        if rzadkie:
            h.append(f'<details class="rzadkie"><summary>Rzadkie wzmianki ({len(rzadkie)})</summary><ul class="kolumny">' +
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
    P = Przypisy(b)
    h = ['<h1>Groby i miejsca pamięci</h1>',
         f'<p class="lead">{sum(len(v) for v in grupy.values())} informacji o pochówkach, według miejsca. '
         'Gdy kilka źródeł mówi o tym samym grobie — osoba stoi raz, z kilkoma przypisami.</p><nav class="spis">']
    kl = sorted(grupy, key=lambda x: (-len(grupy[x]), norm_szukaj(b.nazwa(x))))
    h.append(' · '.join(f'<a href="#g-{esc(k)}">{esc(b.nazwa(k))}</a> ({len(grupy[k])})' for k in kl) + '</nav>')
    for k in kl:
        h.append(f'<section id="g-{esc(k)}"><h2>{b.link(k) if k != "—" else "Miejsce nieokreślone"}</h2><ul class="zyciorys">')
        po_os = collections.OrderedDict()
        for t in sorted(grupy[k], key=lambda t: (b.rok_ur(t['podmiot']) or 9999, norm_szukaj(b.nazwa(t['podmiot'])))):
            po_os.setdefault(t['podmiot'], []).append(t)
        for os_, ts in po_os.items():
            dod = '; '.join(dict.fromkeys(x for t in ts for x in [fmt_data(t.get('data')), t.get('wartosc') or ''] if x))
            niep = NIEP if any(t['pewnosc_odczytu'] == 'niepewna' for t in ts) else ''
            h.append(f'<li><span class="rok"></span><span class="tr">{b.link(os_, True)}'
                     + (f' — {esc(dod)}' if dod else '') + niep + P.ref([z for t in ts for z in t['zrodla']]) + '</span></li>')
        h.append('</ul></section>')
    h.append(P.html())
    zapisz('groby.html', strona('Groby', '\n'.join(h), 'groby.html'))


def czas(b):
    fs = [t for t in b.tw if t.get('data') and rok(t['data'].get('od') or t['data'].get('do'))]
    fs.sort(key=klucz_daty)
    P = Przypisy(b)
    h = ['<h1>Oś czasu</h1>',
         f'<p class="lead">{len(fs)} datowanych informacji. Sprzeczne wersje dat są pokazane osobno.</p>',
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
            h.append(f'<section class="grupa"><h2>{rzym(w)} wiek</h2><ul class="zyciorys">')
            wiek = w
        tekst = norm_szukaj(b.nazwa(t['podmiot']) + ' ' + (t.get('wartosc') or '') + ' ' + b.nazwa(t.get('obiekt') or ''))
        niep = NIEP if t['pewnosc_odczytu'] == 'niepewna' else ''
        h.append(f'<li data-r="{t["relacja"]}" data-s="{esc(tekst)}"><span class="rok">{r}</span><span class="tr">'
                 f'<span class="et">{esc(ETYK.get(t["relacja"], ""))}:</span> {fakt_tresc(b, t, None, True)}{niep}{P.ref(t["zrodla"])}</span></li>')
    h.append('</ul></section></div>')
    h.append(P.html())
    zapisz('czas.html', strona('Oś czasu', '\n'.join(h), 'czas.html', skrypty='<script src="filtr.js"></script>'))


# ============================================================ źródła

def zrodla_lista(b):
    h = ['<h1>Źródła</h1><p class="lead">Każde źródło stronami: zdjęcie oryginału obok wiernej transkrypcji. '
         'Przewodnik heraldyczny (S01) — w wersji uwspółcześnionej, ze zdjęciami stron oryginału.</p><ul class="zrodla-lista">']
    for k, v in b.zr.items():
        st = b.strony.get(k, [])
        mini = next((p['zdjecie'] for p in st if p['zdjecie']), None)
        img = f'<img src="skany/m/{nazwa_www(mini)}" alt="" loading="lazy">' if mini else ''
        nf = sum(1 for t in b.tw if any(z['segment'].startswith(k + '-') for z in t['zrodla']))
        h.append(f'<li><a href="zrodlo-{k}.html">{img}<span><b>{k}</b> {esc(SKROT.get(k, ""))}<br>'
                 f'<span class="drobne">{esc(v.get("tytul") or "")}</span></span></a>'
                 f'<p class="drobne">{esc(v.get("autor") or "")} · {esc(str(v.get("datowanie") or v.get("miejsce_rok") or ""))} · '
                 f'{len(st)} str. · {nf} informacji</p></li>')
    h.append('</ul><h2>Literatura cytowana w źródłach</h2><ul class="lit">')
    for l in b.lit:
        h.append(f'<li>{esc(l["opis"])}' + (f' <span class="drobne">— {esc(l["dotyczy"])}</span>' if l.get('dotyczy') else '') +
                 ' ' + ' '.join(f'<a class="zr" href="{b.seg_url(s)}">{esc(b.seg_etykieta(s))}</a>' for s in l.get('segmenty', [])) + '</li>')
    h.append('</ul>')
    zapisz('zrodla.html', strona('Źródła', '\n'.join(h), 'zrodla.html'))


def opis_zrodla(b, k):
    v = b.zr[k]
    pola = [('Nazwa', v.get('nazwa')), ('Skrót w przypisach', re.sub(r'\*', '', v.get('skrot') or '')),
            ('Opis bibliograficzny', re.sub(r'\*', '', v.get('opis_bibliograficzny') or '')),
            ('Autor', v.get('autor')), ('Datowanie', v.get('datowanie') or v.get('miejsce_rok')),
            ('Wydawca', v.get('wydawca')), ('Zakres', v.get('zakres')), ('Zdjęcia', v.get('zdjecia'))]
    dl = ''.join(f'<dt>{n}</dt><dd>{esc(str(w))}</dd>' for n, w in pola if w)
    uw = v.get('uwagi') or []
    if isinstance(uw, str):
        uw = [uw]
    return (f'<p class="sciezka"><a href="zrodla.html">Źródła</a></p><h1>{esc(v.get("nazwa") or v.get("tytul") or "")} <span class="lata">({k})</span></h1>'
            f'<dl class="opis">{dl}</dl>' + (('<ul class="drobne">' + ''.join(f'<li>{esc(str(x))}</li>' for x in uw) + '</ul>') if uw else ''))


def galeria(b, k):
    h = ['<section class="galeria"><h2>Strony oryginału</h2><div class="kafle-zdj">']
    widziane = set()
    for p in b.strony[k]:
        z = p['zdjecie']
        if not z:
            continue
        h.append(f'<figure id="str-{esc(p["strona"])}"><a href="skany/{nazwa_www(z)}" target="_blank">'
                 f'<img src="skany/m/{nazwa_www(z)}" alt="s. {esc(p["strona"])}" loading="lazy"></a>'
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
        img = (f'<a href="skany/{nazwa_www(z)}" target="_blank" class="zdj"><img src="skany/{nazwa_www(z)}" '
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
            pow_ = (f'<div class="pow">Osoby i miejsca: ' + ', '.join(b.link(e) for e in enc[:12]) +
                    (' …' if len(enc) > 12 else '') + '</div>') if fs else ''
            h.append(f'<div class="seg typ-{s["typ"]}" id="{s["id"]}"><a class="segid" href="#{s["id"]}">{s["id"]}</a>'
                     f'<div class="tt">{trans_html(s["tekst"])}</div>{pow_}</div>')
        h.append('</div></div></section>')
    zapisz(f'zrodlo-{k}.html', strona(f'{k} — {b.zr[k].get("tytul", "")}', '\n'.join(h), 'zrodla.html'))


# ============================================================ opracowania, historia, sprawdzenie

def opracowania(b):
    global OPRACOWANIE_KOTWICE
    pozycje = [('opracowanie-majatki.html', 'majatki-4-miejscowosci.md', 'Cztery majątki: Radoszewice, Siemkowice, Krempa, Kościerzyn'),
               ('opracowanie-zapiski.html', 'zapiski-rodzinne-uporzadkowane.md', 'Zapiski rodzinne — uporządkowane'),
               ('zrodlo-S01.html', None, 'Przewodnik heraldyczny (S01) — wydanie uwspółcześnione')]
    for url, plik, tyt in pozycje:
        if plik:
            tekst = open(os.path.join(TEKSTY, plik), encoding='utf-8').read()
            html_ = md_html(b, tekst)
            if plik.startswith('majatki'):
                for mid, wz in (('radoszewice', 'Radoszewice'), ('siemkowice', 'Siemkowice'), ('krempa', 'Krempa'), ('koscierzyn', 'Kościerzyn')):
                    m = re.search(rf'<h2 id="([^"]+)">[^<]*{wz}', html_)
                    if m:
                        OPRACOWANIE_KOTWICE[mid] = m.group(1)
            zapisz(url, strona(tyt, f'<p class="sciezka"><a href="historia.html">Historia rodu</a> › opracowania robocze</p>'
                                    f'<article class="tekst">{html_}</article>', 'historia.html'))
    return pozycje


def historia(b, pozycje):
    """Całościowe opracowanie dziejów rodu (teksty/historia-rodziny.md) — ta sama treść co w pliku Word."""
    p = os.path.join(TEKSTY, 'historia-rodziny.md')
    inne = ('<section class="inne-opr"><h2>Opracowania szczegółowe (robocze)</h2><ul class="kafle">' +
            ''.join(f'<li><a href="{u}">{esc(t)}</a></li>' for u, _, t in pozycje) + '</ul></section>')
    if not os.path.exists(p):
        zapisz('historia.html', strona('Historia rodu', '<h1>Historia rodu</h1>' + inne, 'historia.html'))
        return
    tekst = open(p, encoding='utf-8').read()
    # odnośniki do osób w tekście: [[id]] lub [[id|tekst]]
    def osoba_link(m):
        i, _, t = m.group(1).partition('|')
        return f'[{t or b.nazwa_osoby(i)}]({b.url(i)})' if i in b.osoby or i in b.miejsca else (t or i)
    tekst = re.sub(r'\[\[([^\]]+)\]\]', osoba_link, tekst)
    html_ = md_html(b, tekst, ext=('footnotes',))
    html_ = re.sub(r'<p><img alt="([^"]*)" src="([^"]*)" ?/?></p>',
                   lambda m: f'<figure class="ilustracja"><a href="{m.group(2)}" target="_blank"><img src="{m.group(2)}" alt="" loading="lazy"></a>'
                             f'<figcaption>{markdown.markdown(html.unescape(m.group(1)))[3:-4]}</figcaption></figure>', html_)
    spis = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', html_)
    spis = [x for x in spis if re.match(r'^(\d+\.|Aneks|Bibliografia)', x[1])]
    nav = '<nav class="spis-tresci"><b>Spis treści</b><ul>' + ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in spis) + '</ul>' \
          '<p class="drobne">Ten sam tekst w wersji do druku: plik Word w folderze <code>Opracowanie/</code>.</p></nav>'
    zapisz('historia.html', strona('Historia rodu', f'<div class="hist">{nav}<article class="tekst">{html_}</article></div>' + inne,
                                   'historia.html'))


def sprawdzenie(b):
    w = open(os.path.join(DANE, 'watpliwosci.md'), encoding='utf-8').read()
    w = re.sub(r'(?<![⟨\w-])(S\d\d-p[0-9a-z]+-[a-z]+\d*)\b', r'⟨\1⟩', w)
    r = open(os.path.join(DANE, 'RAPORT-KOMPLETNOSCI.md'), encoding='utf-8').read()
    h = ['<h1>Do sprawdzenia</h1><p class="lead">Niepewne odczytania, rozbieżności między źródłami i decyzje o utożsamieniu osób — '
         'do przejrzenia przez rodzinę. Nic tu nie jest „poprawione”: sprzeczne wersje są pokazane obok siebie.</p>'
         '<nav class="spis"><a href="#watpliwosci">Wątpliwości odczytu</a> · <a href="#raport">Raport kompletności bazy</a></nav>',
         '<article class="tekst" id="watpliwosci">' + md_html(b, w) + '</article>',
         '<article class="tekst" id="raport">' + md_html(b, r) + '</article>']
    zapisz('sprawdzenie.html', strona('Do sprawdzenia', '\n'.join(h), 'sprawdzenie.html'))


# ============================================================ szukaj, start

def szukaj(b):
    I = []
    for i, o in b.osoby.items():
        I.append(['o', b.nazwa_osoby(i), b.lata(i), b.url(i),
                  norm_szukaj(b.nazwa_osoby(i) + ' ' + ' '.join(o.get('warianty') or []) + ' ' + (o.get('nazwisko_rodowe') or '') + ' ' + (o.get('uwagi') or ''))])
    for i, m in b.miejsca.items():
        I.append(['m', m['nazwa'], m['typ'], b.url(i), norm_szukaj(m['nazwa'] + ' ' + ' '.join(m.get('warianty') or []) + ' ' + (m.get('dzis') or ''))])
    for t in b.tw:
        tekst = ' '.join(x for x in [b.nazwa(t['podmiot']), ETYK.get(t['relacja'], ''), b.nazwa(t.get('obiekt') or ''),
                                     t.get('wartosc') or '', fmt_data(t.get('data'))] if x)
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
         'Przeszukiwane są osoby, miejsca, informacje i pełne transkrypcje źródeł.</p><div id="wyniki"></div>']
    zapisz('szukaj.html', strona('Szukaj', '\n'.join(h), 'szukaj.html',
                                 skrypty='<script src="dane-szukaj.js"></script><script src="szukaj.js"></script>'))


def start(b):
    gl = ['wrszowiec-jan', 'radoszewski-imbram-1412', 'radoszewski-boguslaw-1441', 'radoszewski-mikolaj-1574',
          'radoszewski-marek-1641', 'radoszewski-stanislaw-1657', 'radoszewski-franciszek-starosta', 'radoszewski-michal-1775',
          'radoszewski-roch-1820', 'radoszewski-franciszek-1790', 'radoszewski-jozefat-1830', 'radoszewski-michal-1865',
          'radoszewski-jerzy-1902']
    rody = korzenie(b)
    nazwiska = collections.Counter(rdzen_nazwiska(o.get('nazwisko') or o.get('nazwisko_rodowe')) for o in b.osoby.values())
    h = ['<section class="wstep"><h1>Radoszewscy herbu Oksza</h1>',
         '<p class="lead">Dzieje rodziny Boxa-Radoszewskich z Siemkowic i Radoszewic, później z Krempy, oraz rodzin z nią '
         'spokrewnionych — Prządzyńskich, Drohojowskich, Grabińskich, Skrzyńskich i innych. Zebrane z rodzinnych zapisków, '
         'przewodnika heraldycznego Kosińskiego, prac Stefana Łakomego i monografii dworów ziemi sieradzkiej. '
         '<b>Przy każdej informacji jest przypis do źródła</b> — strony, zdjęcia i dosłownego cytatu.</p>',
         '<form class="start-szukaj" action="szukaj.html"><input name="q" type="search" placeholder="Wpisz imię, nazwisko, miejscowość…" class="filtr duzy"></form>',
         f'<ul class="liczby"><li><b>{len(b.osoby)}</b> osób</li><li><b>{len(b.miejsca)}</b> miejsc</li>'
         f'<li><b>{len(b.tw)}</b> informacji</li><li><b>{len(b.zr)}</b> źródeł</li><li><b>{sum(len(v) for v in b.strony.values())}</b> stron</li></ul></section>',
         '<section class="wejscia">'
         '<a class="wejscie duze" href="drzewo.html"><b>Całe drzewo rodu</b><span>23 pokolenia Radoszewskich — od Jana Wrszowca i Imbrama z Siemkowic do dziś, na jednym wykresie</span></a>'
         '<a class="wejscie duze" href="historia.html"><b>Historia rodu</b><span>całościowe opracowanie dziejów rodziny, z przypisami do źródeł</span></a>'
         '<a class="wejscie" href="osoby.html"><b>Indeks nazwisk</b><span>wszystkie osoby od A do Ż</span></a>'
         '<a class="wejscie" href="pokrewienstwo.html"><b>Pokrewieństwo</b><span>jak spokrewnione są dwie osoby?</span></a>'
         '<a class="wejscie" href="miejsca.html"><b>Miejsca i majątki</b><span>Radoszewice, Siemkowice, Krempa, Kościerzyn… na mapie</span></a>'
         '<a class="wejscie" href="zrodla.html"><b>Źródła</b><span>zdjęcia stron obok odczytu</span></a></section>',
         '<div class="dwie-kol"><section><h2>Linia główna — z ojca na syna</h2><ol class="linia">' +
         ''.join(f'<li>{b.link(i, True)}' + (f' <span class="drobne">— {esc(tytuly(b, i)[0])}</span>' if tytuly(b, i) else '') + '</li>'
                 for i in gl if i in b.osoby) + '</ol>'
         '<p class="drobne">Kolejność według drzewa Kosińskiego (S01), monografii Kajzera (S08) i zapisków rodzinnych; '
         'rozbieżności co do niektórych ogniw — na kartach osób.</p></section>',
         '<section><h2>Rody w bazie</h2><ul class="rody">' +
         ''.join(f'<li><a href="drzewo.html#potomkowie:{i}">{esc(dane_rod(b, i))}</a> <span class="drobne">od {esc(b.nazwa_osoby(i))} · {n} potomków</span></li>'
                 for i, n in rody[:12]) + '</ul>'
         '<h2>Najczęstsze nazwiska</h2><p class="chmura">' +
         ''.join(f'<a href="osoby.html#n-{esc(norm_szukaj(k))}" class="w{min(4, 1 + n // 8)}">{esc(k)} <span>{n}</span></a> '
                 for k, n in nazwiska.most_common(24) if k) + '</p></section></div>']
    zapisz('index.html', strona('Start', '\n'.join(h), 'index.html'))


def dane_rod(b, i):
    rz = rdzen_nazwiska(b.osoby[i].get('nazwisko') or b.osoby[i].get('nazwisko_rodowe'))
    if i == 'wrszowiec-jan':
        return 'Radoszewscy h. Oksza'
    return (rz[:-2] + 'cy') if re.search(r'(sk|ck|dzk)i$', rz) else rz


# ============================================================ main

def main():
    os.makedirs(WYJ, exist_ok=True)
    for p in glob.glob(os.path.join(WYJ, '*.html')) + glob.glob(os.path.join(WYJ, '*.js')):
        os.remove(p)
    for p in glob.glob(os.path.join(ZASOBY, '*')):
        shutil.copy(p, WYJ)
    b = Baza()
    zrodlo_strona(b, 'S01')        # najpierw — ustala kotwice segmentów S01
    poz = opracowania(b)           # ustala kotwice majątków
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
    pokrewienstwo(b)
    historia(b, poz)
    szukaj(b)
    start(b)
    n = len(glob.glob(os.path.join(WYJ, '*.html')))
    brak = [z for st in b.strony.values() for p in st for z in [p['zdjecie']] if z and not os.path.exists(os.path.join(WYJ, 'skany', nazwa_www(z)))]
    print(f'Zbudowano {n} stron w strona/.' + (f' Brak {len(set(brak))} zdjęć — uruchom narzedzia/zdjecia_www.py.' if brak else ''))


if __name__ == '__main__':
    main()
