"""Eksport bazy wiedzy (Etap 3) do SQLite, CSV i GEDCOM.

Użycie: python narzedzia/eksport.py
Wynik w katalogu eksport/:
  radoszewscy.sqlite  — wszystkie tabele (źródła, segmenty, osoby, miejsca, twierdzenia, cytaty, literatura)
  csv/*.csv           — te same tabele (UTF-8 z BOM, separator przecinek — otwiera się w Excelu)
  radoszewscy.ged     — GEDCOM 5.5.1 (osoby, rodziny, zdarzenia; każde zdarzenie z cytatem źródłowym)
Źródłem prawdy pozostają pliki YAML w dane/; eksport generuje się od nowa przy każdym uruchomieniu.
"""
import csv, datetime, glob, os, re, sqlite3
from collections import defaultdict
import yaml

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DANE = os.path.join(KORZEN, 'dane')
TRANS = os.path.join(KORZEN, 'zrodla', 'transkrypcje')
WYJ = os.path.join(KORZEN, 'eksport')


def wczytaj(sciezka):
    return yaml.safe_load(open(sciezka, encoding='utf-8')) or []


def lista(x):
    return '; '.join(x) if isinstance(x, list) else x


def data_str(v):
    if v is None:
        return None
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    return str(v)


# --- wczytanie ---------------------------------------------------------------

def segmenty():
    wyn = []
    for p in sorted(glob.glob(os.path.join(TRANS, '*', '*.md'))):
        tresc = open(p, encoding='utf-8').read()
        _, glowa, cialo = tresc.split('---', 2)
        meta = {k: (re.search(rf'^{k}:\s*"?([^"\n]*?)"?\s*(#.*)?$', glowa, re.M) or [None, None])[1]
                for k in ('zrodlo', 'strona', 'zdjecie')}   # nagłówek bywa nieścisłym YAML-em
        for blok in re.split(r'^## ', cialo, flags=re.M)[1:]:
            ident, _, reszta = blok.partition('\n')
            typ = re.search(r'^typ:\s*(\w+)', reszta, re.M)
            tekst = re.sub(r'^typ:.*\n', '', reszta, count=1, flags=re.M).strip()
            wyn.append({'id': ident.strip(), 'zrodlo': meta.get('zrodlo'), 'strona': str(meta.get('strona', '')),
                        'zdjecie': meta.get('zdjecie'), 'plik': os.path.relpath(p, KORZEN).replace('\\', '/'),
                        'typ': typ.group(1) if typ else 'tekst', 'tekst': tekst})
    return wyn


def twierdzenia():
    wyn = []
    for p in sorted(glob.glob(os.path.join(DANE, 'twierdzenia', '*.yaml'))):
        for t in wczytaj(p):
            t['_plik'] = os.path.basename(p)
            wyn.append(t)
    return wyn


# --- SQLite + CSV ------------------------------------------------------------

TABELE = {
    'zrodla': ['id', 'typ', 'tytul', 'autor', 'datowanie', 'zakres', 'zdjecia'],
    'segmenty': ['id', 'zrodlo', 'strona', 'zdjecie', 'plik', 'typ', 'tekst'],
    'osoby': ['id', 'imiona', 'nazwisko', 'nazwisko_rodowe', 'przydomek', 'herb', 'plec', 'warianty', 'utozsamienie', 'uwagi'],
    'miejsca': ['id', 'nazwa', 'typ', 'dzis', 'nadrzedne', 'pewnosc_identyfikacji', 'warianty', 'uwagi'],
    'twierdzenia': ['id', 'plik', 'podmiot', 'podmiot_rodzaj', 'relacja', 'obiekt', 'wartosc', 'data_tekst', 'data_od',
                    'data_do', 'miejsce', 'pewnosc_odczytu', 'uwagi'],
    'cytaty': ['twierdzenie', 'nr', 'segment', 'cytat'],
    'literatura': ['id', 'opis', 'dotyczy', 'segmenty'],
    'bez_faktow': ['segment', 'powod'],
}


def wiersze(zr, seg, osoby, miejsca, tw, lit, bez):
    w = defaultdict(list)
    for k, v in zr.items():
        w['zrodla'].append([k, v.get('typ'), v.get('tytul'), v.get('autor'),
                            v.get('datowanie') or v.get('miejsce_rok'), v.get('zakres'), v.get('zdjecia')])
    for s in seg:
        w['segmenty'].append([s[k] for k in TABELE['segmenty']])
    for o in osoby:
        w['osoby'].append([o['id'], lista(o.get('imiona')), o.get('nazwisko'), o.get('nazwisko_rodowe'), o.get('przydomek'),
                           o.get('herb'), o.get('plec'), lista(o.get('warianty')), o.get('utozsamienie'), o.get('uwagi')])
    for m in miejsca:
        w['miejsca'].append([m['id'], m['nazwa'], m['typ'], m.get('dzis'), m.get('nadrzedne'), m['pewnosc_identyfikacji'],
                             lista(m.get('warianty')), m.get('uwagi')])
    ido = {o['id'] for o in osoby}
    for t in tw:
        d = t.get('data') or {}
        w['twierdzenia'].append([t['id'], t['_plik'], t['podmiot'], 'osoba' if t['podmiot'] in ido else 'miejsce',
                                 t['relacja'], t.get('obiekt'), t.get('wartosc'), d.get('tekst'), data_str(d.get('od')),
                                 data_str(d.get('do')), t.get('miejsce'), t['pewnosc_odczytu'], t.get('uwagi')])
        for i, z in enumerate(t['zrodla'], 1):
            w['cytaty'].append([t['id'], i, z['segment'], z['cytat']])
    for l in lit:
        w['literatura'].append([l['id'], l['opis'], l.get('dotyczy'), lista(l.get('segmenty'))])
    for b in bez:
        w['bez_faktow'].append([b['segment'], b['powod']])
    return w


def zapisz_sqlite(w):
    p = os.path.join(WYJ, 'radoszewscy.sqlite')
    if os.path.exists(p):
        os.remove(p)
    db = sqlite3.connect(p)
    for nazwa, kol in TABELE.items():
        db.execute(f'CREATE TABLE {nazwa} ({", ".join(kol)})')
        db.executemany(f'INSERT INTO {nazwa} VALUES ({",".join("?" * len(kol))})',
                       [[str(x) if isinstance(x, (datetime.date,)) else x for x in r] for r in w[nazwa]])
    db.executescript('''
        CREATE INDEX tw_podmiot ON twierdzenia(podmiot);
        CREATE INDEX tw_obiekt ON twierdzenia(obiekt);
        CREATE INDEX cyt_tw ON cytaty(twierdzenie);
        CREATE INDEX cyt_seg ON cytaty(segment);
        CREATE VIEW fakty_ze_zrodlem AS
          SELECT t.*, c.nr, c.segment, c.cytat, s.zrodlo, s.strona, s.zdjecie
          FROM twierdzenia t JOIN cytaty c ON c.twierdzenie = t.id JOIN segmenty s ON s.id = c.segment;
    ''')
    db.commit()
    db.close()


def zapisz_csv(w):
    kat = os.path.join(WYJ, 'csv')
    os.makedirs(kat, exist_ok=True)
    for nazwa, kol in TABELE.items():
        with open(os.path.join(kat, nazwa + '.csv'), 'w', encoding='utf-8-sig', newline='') as f:
            pis = csv.writer(f)
            pis.writerow(kol)
            pis.writerows(w[nazwa])


# --- GEDCOM ------------------------------------------------------------------

MIES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']


def ged_data1(v):
    if v is None:
        return None
    if isinstance(v, datetime.date):
        return f'{v.day} {MIES[v.month - 1]} {v.year}'
    s = str(v)
    m = re.fullmatch(r'(\d{4})-(\d{2})', s)
    if m:
        return f'{MIES[int(m.group(2)) - 1]} {m.group(1)}'
    m = re.fullmatch(r'(\d{4})', s)
    return m.group(1) if m else None


def ged_data(d):
    if not d:
        return None
    od, do = ged_data1(d.get('od')), ged_data1(d.get('do'))
    if od and do:
        return od if od == do else f'BET {od} AND {do}'
    if do:
        return f'BEF {do}'
    if od:
        return f'AFT {od}'
    return None


def tekst_ged(poziom, znacznik, tekst, linie):
    """Zapis długiego tekstu z CONT (nowe wiersze) i CONC (dzielenie co 200 znaków)."""
    tekst = str(tekst)
    for i, wiersz in enumerate(tekst.split('\n')):
        kawalki = [wiersz[j:j + 200] for j in range(0, len(wiersz), 200)] or ['']
        for k, kaw in enumerate(kawalki):
            if i == 0 and k == 0:
                linie.append(f'{poziom} {znacznik} {kaw}'.rstrip())
            else:
                linie.append(f'{poziom + 1} {"CONC" if k else "CONT"} {kaw}'.rstrip())


ZDARZENIA = {'urodzenie': 'BIRT', 'smierc': 'DEAT', 'pochowek': 'BURI', 'chrzest': 'CHR', 'zawod': 'OCCU',
             'urzad': 'TITL', 'wyksztalcenie': 'EDUC', 'zamieszkanie': 'RESI', 'wlasnosc': 'PROP'}
TYPY_EVEN = {'opis': 'Opis', 'udzial_w_wydarzeniu': 'Udział w wydarzeniu', 'fundacja': 'Fundacja',
             'odznaczenie': 'Odznaczenie', 'herb': 'Herb'}


def zapisz_gedcom(zr, segm, osoby, miejsca, tw):
    seg = {s['id']: s for s in segm}
    oso = {o['id']: o for o in osoby}
    mie = {m['id']: m for m in miejsca}
    ii = {o['id']: f'@I{n}@' for n, o in enumerate(osoby, 1)}
    si = {k: f'@{k}@' for k in zr}

    def nazwa_m(i):
        m = mie.get(i)
        if not m:
            return oso[i]['nazwisko'] if i in oso else i
        s = m['nazwa']
        if m.get('nadrzedne') and m['nadrzedne'] in mie and mie[m['nadrzedne']]['nazwa'] not in s:
            s += ', ' + mie[m['nadrzedne']]['nazwa']
        return s

    def cytowania(t, poziom, linie):
        for z in t['zrodla']:
            s = seg.get(z['segment'], {})
            linie.append(f'{poziom} SOUR {si.get(s.get("zrodlo"), "@?@")}')
            linie.append(f'{poziom + 1} PAGE s. {s.get("strona")}, {z["segment"]}, zdjęcie {s.get("zdjecie")}')
            linie.append(f'{poziom + 1} DATA')
            tekst_ged(poziom + 2, 'TEXT', z['cytat'], linie)
            if t['pewnosc_odczytu'] == 'niepewna':
                linie.append(f'{poziom + 1} QUAY 1')

    # rodziny: pary z małżeństw i z rodziców dziecka
    pary = {}
    for t in tw:
        if t['relacja'] in ('malzonek', 'slub') and t.get('obiekt') in oso and t['podmiot'] in oso:
            pary.setdefault(frozenset((t['podmiot'], t['obiekt'])), []).append(t)
    malzonkowie = defaultdict(set)
    for p in pary:
        a, *b = list(p)
        for x in p:
            malzonkowie[x] |= set(p) - {x}
    rodzice = defaultdict(list)
    for t in tw:
        if t['relacja'] == 'rodzic' and t['podmiot'] in oso and t.get('obiekt') in oso:
            rodzice[t['podmiot']].append(t)
    dzieci = defaultdict(list)          # klucz rodziny -> [(dziecko, twierdzenia, czy_wniosek)]
    for dz, tl in rodzice.items():
        ps = list(dict.fromkeys(t['obiekt'] for t in tl))
        uzyte = set()
        for i, a in enumerate(ps):
            for b in ps[i + 1:]:
                if frozenset((a, b)) in pary and not ({a, b} & uzyte):
                    uzyte |= {a, b}
                    dzieci[frozenset((a, b))].append((dz, tl, False))
        if len(ps) == 2 and not uzyte and oso[ps[0]]['plec'] != oso[ps[1]]['plec']:   # dwaj ojcowie = sprzeczne źródła
            uzyte = set(ps)
            dzieci[frozenset(ps)].append((dz, tl, False))
        for a in ps:
            if a in uzyte:
                continue
            if len(malzonkowie[a]) == 1:
                dzieci[frozenset((a, *malzonkowie[a]))].append((dz, tl, True))
            else:
                dzieci[frozenset((a,))].append((dz, tl, False))
    rodziny = list(dict.fromkeys(list(pary) + list(dzieci)))
    fi = {r: f'@F{n}@' for n, r in enumerate(rodziny, 1)}

    L = ['0 HEAD', '1 SOUR RADOSZEWSCY', '2 NAME Baza wiedzy o rodzinie Radoszewskich', '1 GEDC', '2 VERS 5.5.1',
         '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8', '1 LANG Polish', f'1 DATE {ged_data1(datetime.date.today())}',
         '1 NOTE Wygenerowane przez narzedzia/eksport.py z plików dane/*.yaml. Sprzeczne informacje nie są scalane: '
         'jedna osoba może mieć kilka zdarzeń BIRT/DEAT z różnych źródeł.']
    tw_osoby = defaultdict(list)
    for t in tw:
        tw_osoby[t['podmiot']].append(t)
    for o in osoby:
        L.append(f'0 {ii[o["id"]]} INDI')
        im = ' '.join(o.get('imiona') or [])
        if o.get('nazwisko_rodowe'):
            L.append(f'1 NAME {im} /{o["nazwisko_rodowe"]}/'.replace('  ', ' '))
            L.append('2 TYPE birth')
            if o.get('nazwisko'):
                L.append(f'1 NAME {im} /{o["nazwisko"]}/'.replace('  ', ' '))
                L.append('2 TYPE married')
        else:
            L.append(f'1 NAME {im} /{o.get("nazwisko") or ""}/'.replace('  ', ' ').strip())
        if o.get('przydomek'):
            L.append(f'2 NICK {o["przydomek"]}')
        for war in o.get('warianty') or []:
            L.append(f'1 NAME {war}')
            L.append('2 TYPE aka')
        L.append(f'1 SEX {"M" if o["plec"] == "m" else "F" if o["plec"] == "k" else "U"}')
        L.append(f'1 REFN {o["id"]}')
        if o.get('herb'):
            L.append(f'1 EVEN {o["herb"]}')
            L.append('2 TYPE Herb')
        for t in tw_osoby[o['id']]:
            r = t['relacja']
            if r in ('rodzic', 'malzonek', 'slub'):
                continue
            if r == 'rodzenstwo':
                if t.get('obiekt') in ii:
                    L.append(f'1 ASSO {ii[t["obiekt"]]}')
                    L.append('2 RELA rodzeństwo')
                    cytowania(t, 2, L)
                continue
            opis = t.get('wartosc') or ''
            if t.get('obiekt'):
                opis = (nazwa_m(t['obiekt']) + (': ' + opis if opis else ''))
            if r in ZDARZENIA:
                tekst_ged(1, ZDARZENIA[r], opis, L) if opis and r in ('zawod', 'urzad', 'wyksztalcenie', 'wlasnosc') \
                    else L.append(f'1 {ZDARZENIA[r]}')
                if opis and r not in ('zawod', 'urzad', 'wyksztalcenie', 'wlasnosc'):
                    tekst_ged(2, 'NOTE', opis, L)
            else:
                tekst_ged(1, 'EVEN', opis or '—', L)
                L.append(f'2 TYPE {TYPY_EVEN.get(r, r)}')
            gd = ged_data(t.get('data'))
            if gd:
                L.append(f'2 DATE {gd}')
            if (t.get('data') or {}).get('tekst'):
                tekst_ged(2, 'NOTE', 'Data w źródle: ' + str(t['data']['tekst']), L)
            if t.get('miejsce'):
                L.append(f'2 PLAC {nazwa_m(t["miejsce"])}')
            if t.get('uwagi'):
                tekst_ged(2, 'NOTE', t['uwagi'], L)
            L.append(f'2 REFN {t["id"]}')
            cytowania(t, 2, L)
        for r, k in fi.items():
            if o['id'] in r:
                L.append(f'1 FAMS {k}')
        for r, lst in dzieci.items():
            for dz, _, wniosek in lst:
                if dz == o['id']:
                    L.append(f'1 FAMC {fi[r]}')
                    if wniosek:
                        L.append('2 NOTE Rodzina przypisana przy eksporcie: źródło podaje jednego rodzica, '
                                 'drugi to jego jedyny znany małżonek (wniosek, nie fakt ze źródła).')
        for pole in ('utozsamienie', 'uwagi'):
            if o.get(pole):
                tekst_ged(1, 'NOTE', ('Utożsamienie: ' if pole == 'utozsamienie' else '') + o[pole], L)
    for r, k in fi.items():
        L.append(f'0 {k} FAM')
        czl = sorted(r, key=lambda x: oso[x]['plec'] != 'm')
        for x in czl:
            L.append(f'1 {"HUSB" if oso[x]["plec"] == "m" else "WIFE"} {ii[x]}')
        for t in pary.get(r, []):
            L.append('1 MARR')
            gd = ged_data(t.get('data'))
            if gd:
                L.append(f'2 DATE {gd}')
            if t.get('miejsce'):
                L.append(f'2 PLAC {nazwa_m(t["miejsce"])}')
            if t.get('wartosc'):
                tekst_ged(2, 'NOTE', t['wartosc'], L)
            L.append(f'2 REFN {t["id"]}')
            cytowania(t, 2, L)
        for dz, tl, _ in dzieci.get(r, []):
            L.append(f'1 CHIL {ii[dz]}')
    for k, v in zr.items():
        L.append(f'0 {si[k]} SOUR')
        tekst_ged(1, 'TITL', f'{k}: {v.get("tytul")}', L)
        if v.get('autor'):
            tekst_ged(1, 'AUTH', v['autor'], L)
        if v.get('datowanie') or v.get('miejsce_rok'):
            tekst_ged(1, 'PUBL', v.get('datowanie') or v.get('miejsce_rok'), L)
    L.append('0 TRLR')
    open(os.path.join(WYJ, 'radoszewscy.ged'), 'w', encoding='utf-8', newline='\r\n').write('\n'.join(L) + '\n')
    return len(rodziny), sum(1 for lst in dzieci.values() for x in lst if x[2])


def main():
    os.makedirs(WYJ, exist_ok=True)
    zr = yaml.safe_load(open(os.path.join(KORZEN, 'zrodla', 'zrodla.yaml'), encoding='utf-8'))
    seg = segmenty()
    osoby = wczytaj(os.path.join(DANE, 'osoby.yaml'))
    miejsca = wczytaj(os.path.join(DANE, 'miejsca.yaml'))
    tw = twierdzenia()
    lit = wczytaj(os.path.join(DANE, 'literatura.yaml'))
    bez = wczytaj(os.path.join(DANE, 'bez_faktow.yaml'))
    w = wiersze(zr, seg, osoby, miejsca, tw, lit, bez)
    zapisz_sqlite(w)
    zapisz_csv(w)
    nrodz, nwn = zapisz_gedcom(zr, seg, osoby, miejsca, tw)
    print('Eksport:', ', '.join(f'{k} {len(v)}' for k, v in w.items()))
    print(f'GEDCOM: {len(osoby)} osób, {nrodz} rodzin ({nwn} powiązań dziecko–rodzina z wniosku eksportu)')


if __name__ == '__main__':
    main()
