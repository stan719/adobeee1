"""Składanie stron transkrypcji w ciągły tekst dyplomatyczny źródła (Etap 2).

Użycie: python narzedzia/sklej.py [S01 S02 ...]   (bez argumentów — wszystkie źródła)
Wynik: teksty/<źródło>-dyplomatyczny.md

Zasady:
- strony w kolejności numerów (okładka/tytuł na początku, tablice „128a” po swojej stronie);
- akapit kończący się „→” łączony jest z akapitem zaczynającym się „←” na następnej stronie,
  a w miejscu łączenia wstawiany jest znacznik strony ⟦s. N⟧;
- każdy segment zachowuje swój identyfikator jako kotwicę {#ID}, żeby cytaty i fakty
  mogły wskazywać dokładne miejsce;
- paginy pomijane, uwagi redakcyjne [red.: …] zachowane bez zmian.
"""
import os, re, sys

KAT = os.path.join(os.path.dirname(__file__), '..', 'zrodla', 'transkrypcje')
WYJ = os.path.join(os.path.dirname(__file__), '..', 'teksty')


def klucz(nazwa):
    m = re.match(r'str-(\d+)([a-z]?)', nazwa)
    return (int(m.group(1)), m.group(2)) if m else (-1, nazwa)


def wczytaj(plik):
    tekst = open(plik, encoding='utf-8').read()
    _, glowa, cialo = tekst.split('---', 2)
    meta = dict(re.findall(r'^(\w+):\s*"?(.*?)"?\s*(?:#.*)?$', glowa, re.M))
    segmenty = []
    for blok in re.split(r'^## ', cialo, flags=re.M)[1:]:
        ident, _, reszta = blok.partition('\n')
        typ = re.search(r'^typ:\s*(\w+)', reszta, re.M)
        tresc = re.sub(r'^typ:.*\n', '', reszta, count=1, flags=re.M).strip('\n')
        segmenty.append((ident.strip(), typ.group(1) if typ else 'tekst', tresc))
    return meta, segmenty


def sklej(zrodlo):
    katalog = os.path.join(KAT, zrodlo)
    pliki = sorted((f for f in os.listdir(katalog) if f.endswith('.md')), key=klucz)
    out = [f'# {zrodlo} — tekst ciągły (warstwa dyplomatyczna)\n',
           f'Złożone automatycznie z `zrodla/transkrypcje/{zrodlo}/` przez `narzedzia/sklej.py`. '
           'Nie edytować ręcznie — poprawki nanosić w plikach stron.\n',
           'Znaczniki: ⟦s. N · zdjęcie⟧ — początek strony; {#ID} — identyfikator segmentu; '
           '⟦→ dalej⟧ — akapit przechodzi na następną stronę; ⟦ciąg dalszy⟧ — kontynuacja z poprzedniej.\n']
    for plik in pliki:
        meta, segmenty = wczytaj(os.path.join(katalog, plik))
        out.append(f'\n---\n\n⟦s. {meta.get("strona", "?")} · {meta.get("zdjecie", "?")}⟧\n')
        for ident, typ, tresc in segmenty:
            if typ == 'pagina':
                continue
            if tresc.startswith('←'):
                tresc = tresc[1:].lstrip()
                out.append(f'{{#{ident}}} ⟦ciąg dalszy⟧\n\n{tresc}\n')
                continue
            prefiks = {'naglowek': '### ', 'przypis': '> ', 'dopisek': '*[dopisek]* ',
                       'ilustracja': '*[ilustracja]* '}.get(typ, '')
            tresc = tresc.replace(' →', ' ⟦→ dalej⟧').replace('→\n', '⟦→ dalej⟧\n')
            if tresc.endswith('→'):
                tresc = tresc[:-1].rstrip() + ' ⟦→ dalej⟧'
            if typ == 'przypis':
                tresc = '\n> '.join(tresc.split('\n'))
            if typ == 'naglowek':
                glowa, _, uwagi = tresc.partition('\n[red.:')
                tresc = ' / '.join(l.strip() for l in glowa.split('\n') if l.strip())
                if uwagi:
                    tresc += '\n\n[red.:' + uwagi
            out.append(f'{{#{ident}}}\n\n{prefiks}{tresc}\n')
    os.makedirs(WYJ, exist_ok=True)
    cel = os.path.join(WYJ, f'{zrodlo}-dyplomatyczny.md')
    open(cel, 'w', encoding='utf-8').write('\n'.join(out))
    return cel, len(pliki)


if __name__ == '__main__':
    zrodla = sys.argv[1:] or sorted(d for d in os.listdir(KAT) if os.path.isdir(os.path.join(KAT, d)))
    for z in zrodla:
        cel, n = sklej(z)
        print(f'{z}: {n} stron -> {os.path.relpath(cel)}')
