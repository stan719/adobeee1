"""Walidacja bazy wiedzy (Etap 3) — zasady w dane/SCHEMAT.md.

Użycie: python narzedzia/waliduj.py [--pokrycie S04 S05 ...]
Bez --pokrycie raport pokrycia obejmuje wszystkie źródła.
Kod wyjścia 1, gdy są błędy (brak źródła, zły cytat, zły odsyłacz); raporty pokrycia,
dat i sprzeczności są informacyjne.
"""
import glob, os, re, sys
from collections import defaultdict
import yaml

KORZEN = os.path.join(os.path.dirname(__file__), '..')
DANE = os.path.join(KORZEN, 'dane')
TRANS = os.path.join(KORZEN, 'zrodla', 'transkrypcje')
JEDNORAZOWE = {'urodzenie', 'smierc', 'chrzest', 'pochowek'}
RELACJE = JEDNORAZOWE | {'slub', 'malzonek', 'rodzic', 'rodzenstwo', 'urzad', 'zawod', 'wyksztalcenie',
                         'odznaczenie', 'wlasnosc', 'zamieszkanie', 'udzial_w_wydarzeniu', 'fundacja',
                         'herb', 'opis'}


def wczytaj(nazwa):
    p = os.path.join(DANE, nazwa)
    if not os.path.exists(p):
        return []
    return yaml.safe_load(open(p, encoding='utf-8')) or []


def norm(t):
    t = re.sub(r'\[red\.:[^\]]*(\[[^\]]*\][^\]]*)*\]', ' ', t)   # uwagi redakcyjne nie są źródłem
    t = re.sub(r'\{(?:podkr|rozstrz|nad): ([^}]*)\}', r'\1', t)
    t = re.sub(r'~~([^~]*)~~', r'\1', t)
    t = t.replace('**', '').replace('*', '').replace('^', '')
    t = re.sub(r'-\s*\n\s*', '-', t)                               # przeniesienia zostają z dywizem
    t = t.replace('←', ' ').replace('→', ' ')
    return re.sub(r'\s+', ' ', t).strip()


def segmenty():
    seg = {}
    for p in glob.glob(os.path.join(TRANS, '*', '*.md')):
        cialo = open(p, encoding='utf-8').read().split('---', 2)[2]
        for blok in re.split(r'^## ', cialo, flags=re.M)[1:]:
            ident, _, reszta = blok.partition('\n')
            typ = re.search(r'^typ:\s*(\w+)', reszta, re.M)
            tekst = re.sub(r'^typ:.*\n', '', reszta, count=1, flags=re.M)
            seg[ident.strip()] = (typ.group(1) if typ else 'tekst', norm(tekst))
    return seg


def rok(d, klucz):
    if not d or d.get(klucz) is None:
        return None
    return int(str(d[klucz])[:4])


def main():
    arg = sys.argv[1:]
    zakres = arg[arg.index('--pokrycie') + 1:] if '--pokrycie' in arg else None
    seg = segmenty()
    osoby = {o['id']: o for o in wczytaj('osoby.yaml')}
    miejsca = {m['id']: m for m in wczytaj('miejsca.yaml')}
    tw = [t for p in sorted(glob.glob(os.path.join(DANE, 'twierdzenia', '*.yaml')))
          for t in (yaml.safe_load(open(p, encoding='utf-8')) or [])]
    bez = {b['segment']: b['powod'] for b in wczytaj('bez_faktow.yaml')}
    for poz in wczytaj('literatura.yaml'):          # pozycje bibliograficzne cytowane w źródłach
        for s in poz.get('segmenty', []):
            bez.setdefault(s, 'bibliografia: ' + poz['id'])
    bledy, uzyte = [], set()

    ids = [t['id'] for t in tw]
    for d in {i for i in ids if ids.count(i) > 1}:
        bledy.append(f'{d}: powtórzony identyfikator twierdzenia')
    for s in bez:
        if s not in seg:
            bledy.append(f'bez_faktow: nieznany segment {s}')

    for t in tw:
        tid = t.get('id', '?')
        if t.get('relacja') not in RELACJE:
            bledy.append(f'{tid}: nieznana relacja {t.get("relacja")!r}')
        for pole, slownik in (('podmiot', None), ('obiekt', None), ('miejsce', miejsca)):
            v = t.get(pole)
            if v is None:
                continue
            if slownik is None:
                if v not in osoby and v not in miejsca:
                    bledy.append(f'{tid}: {pole} {v!r} nie istnieje w osoby/miejsca')
            elif v not in slownik:
                bledy.append(f'{tid}: miejsce {v!r} nie istnieje w miejsca.yaml')
        if not t.get('zrodla'):
            bledy.append(f'{tid}: brak źródła')
        for z in t.get('zrodla') or []:
            s = z.get('segment')
            if s not in seg:
                bledy.append(f'{tid}: nieznany segment {s}')
                continue
            uzyte.add(s)
            c = norm(z.get('cytat') or '')
            if not c:
                bledy.append(f'{tid}: pusty cytat ({s})')
            elif c not in seg[s][1]:
                bledy.append(f'{tid}: cytat nie występuje w {s}: „{c[:70]}”')

    # pokrycie
    print('== Pokrycie segmentów ==')
    brak_ogolem = 0
    for zr in sorted({s.split('-')[0] for s in seg}):
        if zakres and zr not in zakres:
            continue
        wsz = [s for s in seg if s.startswith(zr + '-')]
        brak = sorted(s for s in wsz if s not in uzyte and s not in bez)
        brak_ogolem += len(brak)
        print(f'{zr}: {len(wsz) - len(brak)}/{len(wsz)} pokrytych' + (f' — brak: {", ".join(brak[:8])}{" …" if len(brak) > 8 else ""}' if brak else ''))

    # daty i sprzeczności
    print('\n== Wersje (sprzeczne twierdzenia jednorazowe) ==')
    wg = defaultdict(list)
    for t in tw:
        if t.get('relacja') in JEDNORAZOWE and t.get('data'):
            wg[(t['podmiot'], t['relacja'])].append(t)
    for (o, r), lista in sorted(wg.items()):
        teksty = {str(t['data'].get('tekst')) for t in lista}
        lata = {(rok(t['data'], 'od'), rok(t['data'], 'do')) for t in lista}
        if len(lata) > 1:
            print(f'{o} — {r}: ' + '; '.join(f'{t["data"].get("tekst")} ({", ".join(z["segment"] for z in t["zrodla"])})' for t in lista))

    print('\n== Spójność dat (do sprawdzenia, nie błędy) ==')
    ur = {o: min(rok(t['data'], 'od') for t in l if rok(t['data'], 'od')) for (o, r), l in wg.items() if r == 'urodzenie' and any(rok(t['data'], 'od') for t in l)}
    zm = {o: max(rok(t['data'], 'do') for t in l if rok(t['data'], 'do')) for (o, r), l in wg.items() if r == 'smierc' and any(rok(t['data'], 'do') for t in l)}
    for o in ur:
        if o in zm and zm[o] < ur[o]:
            print(f'{o}: śmierć ({zm[o]}) przed urodzeniem ({ur[o]})')
    for t in tw:
        if t.get('relacja') == 'rodzic' and t['podmiot'] in ur and t.get('obiekt') in ur:
            roznica = ur[t['podmiot']] - ur[t['obiekt']]
            if roznica < 14 or roznica > 65:
                print(f'{t["podmiot"]}: rodzic {t["obiekt"]} starszy o {roznica} lat ({t["id"]})')

    print(f'\n== Podsumowanie: {len(osoby)} osób, {len(miejsca)} miejsc, {len(tw)} twierdzeń; '
          f'{len(bledy)} błędów; {brak_ogolem} segmentów bez pokrycia ==')
    for b in bledy:
        print('BŁĄD', b)
    sys.exit(1 if bledy else 0)


if __name__ == '__main__':
    main()
