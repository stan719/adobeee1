"""Raport kompletności bazy wiedzy (Etap 3) → dane/RAPORT-KOMPLETNOSCI.md

Użycie: python narzedzia/raport.py
Korzysta z narzedzia/waliduj.py (pokrycie, sprzeczności, spójność dat) i z plików dane/*.yaml.
"""
import collections, datetime, glob, io, os, re, sys
from contextlib import redirect_stdout
import yaml

sys.path.insert(0, os.path.dirname(__file__))
import waliduj  # noqa: E402

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DANE = os.path.join(KORZEN, 'dane')


def wczytaj(n):
    return yaml.safe_load(open(os.path.join(DANE, n), encoding='utf-8')) or []


def main():
    bufor = io.StringIO()
    with redirect_stdout(bufor):
        try:
            waliduj.main()
        except SystemExit:
            pass
    wal = bufor.getvalue()
    sekcje = dict(re.findall(r'== (.+?) ==\n(.*?)(?=\n== |\Z)', wal, re.S))

    zr = yaml.safe_load(open(os.path.join(KORZEN, 'zrodla', 'zrodla.yaml'), encoding='utf-8'))
    seg = waliduj.segmenty()
    osoby = wczytaj('osoby.yaml')
    miejsca = wczytaj('miejsca.yaml')
    tw = [t for p in sorted(glob.glob(os.path.join(DANE, 'twierdzenia', '*.yaml'))) for t in wczytaj(p)]
    lit = wczytaj('literatura.yaml')
    bez = {b['segment'] for b in wczytaj('bez_faktow.yaml')}
    lseg = {s for l in lit for s in l.get('segmenty', [])}
    uzyte = {z['segment'] for t in tw for z in t['zrodla']}
    ido = {o['id'] for o in osoby}

    R = []
    R.append('# Raport kompletności bazy wiedzy — Etap 3')
    R.append(f'\nWygenerowano {datetime.date.today().isoformat()} skryptem `narzedzia/raport.py` '
             '(nie edytować ręcznie — uruchomić ponownie po zmianach w `dane/`).')
    R.append('\n## 1. Podsumowanie\n')
    nzr = collections.Counter(z['segment'].split('-')[0] for t in tw for z in t['zrodla'])
    R.append(f'- **{len(tw)}** twierdzeń (faktów), każde z dosłownym cytatem; łącznie **{sum(len(t["zrodla"]) for t in tw)}** cytatów')
    R.append(f'- **{len(osoby)}** osób, **{len(miejsca)}** miejsc, **{len(lit)}** pozycji bibliograficznych')
    R.append(f'- **{len(seg)}** fragmentów (segmentów) transkrypcji z 10 źródeł')
    R.append('- ' + re.search(r'Podsumowanie: (.*?) ==', wal).group(1).split('; ', 1)[1])
    R.append(f'- twierdzeń z niepewnym odczytem (cytat z `[?]` lub odczyt sporny): '
             f'**{sum(t["pewnosc_odczytu"] == "niepewna" for t in tw)}**')

    R.append('\n## 2. Pokrycie źródeł\n')
    R.append('Każdy fragment transkrypcji musi być użyty w twierdzeniu, opisany jako bibliografia albo jawnie oznaczony '
             '„bez faktów” (pagina, pusta strona, znak czytelnika itp.).\n')
    R.append('| Źródło | Fragmenty | w twierdzeniach | tylko bibliografia | bez faktów | brak | cytatów ze źródła |')
    R.append('|---|---:|---:|---:|---:|---:|---:|')
    pozr = collections.defaultdict(list)
    for s in seg:
        pozr[s.split('-')[0]].append(s)
    for k in sorted(pozr):
        ss = pozr[k]
        a = sum(s in uzyte for s in ss)
        b = sum(s not in uzyte and s in lseg for s in ss)
        c = sum(s not in uzyte and s not in lseg and s in bez for s in ss)
        d = len(ss) - a - b - c
        R.append(f'| {k} — {zr.get(k, {}).get("tytul", "")[:60]} | {len(ss)} | {a} | {b} | {c} | {d} | {nzr[k]} |')

    R.append('\n## 3. Rodzaje faktów\n')
    R.append('| Relacja | Liczba |\n|---|---:|')
    for r, n in collections.Counter(t['relacja'] for t in tw).most_common():
        R.append(f'| {r} | {n} |')

    R.append('\n## 4. Osoby\n')
    zrod_osoby = collections.defaultdict(set)
    for t in tw:
        for z in t['zrodla']:
            for x in (t['podmiot'], t.get('obiekt')):
                if x in ido:
                    zrod_osoby[x].add(z['segment'].split('-')[0])
    bez_tw = sorted(ido - set(zrod_osoby))
    rel = collections.defaultdict(set)
    for t in tw:
        rel[t['podmiot']].add(t['relacja'])
    R.append(f'- osób poświadczonych w więcej niż jednym źródle: **{sum(len(v) > 1 for v in zrod_osoby.values())}**')
    R.append(f'- osób z datą (lub wersjami daty) urodzenia: **{sum("urodzenie" in rel[i] for i in ido)}**, '
             f'śmierci: **{sum("smierc" in rel[i] for i in ido)}**, pochówku: **{sum("pochowek" in rel[i] for i in ido)}**')
    R.append(f'- osób bez żadnego twierdzenia: **{len(bez_tw)}**' + (': ' + ', '.join(bez_tw) if bez_tw else ''))
    naj = sorted(zrod_osoby.items(), key=lambda x: -len(x[1]))[:15]
    R.append('- najlepiej udokumentowane (liczba źródeł): ' + '; '.join(f'`{i}` ({len(v)}: {", ".join(sorted(v))})' for i, v in naj))

    R.append('\n## 5. Utożsamienia i decyzje do przejrzenia\n')
    R.append('Osoby połączone z wzmianek w kilku źródłach (pole `utozsamienie`) albo świadomie **nie** połączone mimo możliwej '
             'tożsamości (uwaga w `osoby.yaml`). Sprzeczne fakty nigdy nie są scalane.\n')
    for o in osoby:
        if o.get('utozsamienie'):
            R.append(f'- **połączone** `{o["id"]}`: {o["utozsamienie"]}')
    for o in osoby:
        u = o.get('uwagi') or ''
        if re.search(r'nie scalam|Utożsamienie|utożsamienie|może ten sam|Może ten sam|może inna', u):
            R.append(f'- `{o["id"]}`: {u}')

    R.append('\n## 6. Sprzeczne wersje dat (nie scalane)\n')
    R.append('Ta sama osoba, to samo zdarzenie jednorazowe, różne daty — każda wersja z własnym źródłem.\n')
    for w in sekcje.get('Wersje (sprzeczne twierdzenia jednorazowe)', '').strip().splitlines():
        R.append('- ' + w)

    R.append('\n## 7. Spójność dat (do sprawdzenia)\n')
    for w in sekcje.get('Spójność dat (do sprawdzenia, nie błędy)', '').strip().splitlines() or ['brak']:
        R.append('- ' + w)

    R.append('\n## 8. Miejsca do ustalenia\n')
    R.append(f'Miejsc o pewnej identyfikacji: {sum(m["pewnosc_identyfikacji"] == "pewna" for m in miejsca)}, '
             f'prawdopodobnej: {sum(m["pewnosc_identyfikacji"] == "prawdopodobna" for m in miejsca)}, '
             f'do ustalenia: {sum(m["pewnosc_identyfikacji"] == "do_ustalenia" for m in miejsca)}. '
             'Współrzędne (`wsp`) zostaną dodane w Etapie 4.\n')
    for m in miejsca:
        if m['pewnosc_identyfikacji'] == 'do_ustalenia':
            R.append(f'- `{m["id"]}` — {m["nazwa"]}' + (f' ({m["uwagi"]})' if m.get('uwagi') else ''))

    R.append('\n## 9. Niepewne odczytania\n')
    R.append('Pełna lista z miejscami na zdjęciach: `dane/watpliwosci.md`. Twierdzenia z niepewnym odczytem wg źródła: '
             + ', '.join(f'{k} {n}' for k, n in sorted(collections.Counter(
                 t['zrodla'][0]['segment'].split('-')[0] for t in tw if t['pewnosc_odczytu'] == 'niepewna').items())))

    R.append('\n## 10. Eksport\n')
    R.append('`python narzedzia/eksport.py` tworzy w katalogu `eksport/`:')
    R.append('- `radoszewscy.sqlite` — tabele `zrodla`, `segmenty`, `osoby`, `miejsca`, `twierdzenia`, `cytaty`, `literatura`, '
             '`bez_faktow` oraz widok `fakty_ze_zrodlem` (fakt + cytat + źródło + strona + zdjęcie);')
    R.append('- `csv/*.csv` — te same tabele (UTF-8 z BOM, otwierają się w Excelu);')
    R.append('- `radoszewscy.ged` — GEDCOM 5.5.1 do programów genealogicznych: każda osoba z wariantami nazwisk, '
             'każde zdarzenie z cytatem (`SOUR`/`PAGE`/`TEXT`); sprzeczne daty jako osobne zdarzenia `BIRT`/`DEAT`. '
             'Gdy źródło podaje tylko jednego rodzica, a ten ma dokładnie jednego znanego małżonka, dziecko jest '
             'przypisane do tej pary z notatką „wniosek, nie fakt ze źródła”. Fakty o miejscach są tylko w SQLite/CSV.')

    open(os.path.join(DANE, 'RAPORT-KOMPLETNOSCI.md'), 'w', encoding='utf-8').write('\n'.join(R) + '\n')
    print('Zapisano dane/RAPORT-KOMPLETNOSCI.md')


if __name__ == '__main__':
    main()
