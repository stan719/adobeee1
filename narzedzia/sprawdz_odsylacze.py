"""Sprawdza, czy wszystkie odsyłacze ⟨S..-p..-..⟩ w tekstach (teksty/historia/*.md) wskazują istniejące fragmenty transkrypcji.

Użycie: python narzedzia/sprawdz_odsylacze.py [pliki...]
"""
import glob, os, re, sys

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
SEG_RE = re.compile(r'\bS\d\d-p[0-9a-z]+-[a-z]+\d*\b')


def segmenty():
    ids = set()
    for p in glob.glob(os.path.join(KORZEN, 'zrodla', 'transkrypcje', '*', 'str-*.md')):
        ids.update(re.findall(r'^## (\S+)', open(p, encoding='utf-8').read(), re.M))
    return ids


def main():
    pliki = sys.argv[1:] or sorted(glob.glob(os.path.join(KORZEN, 'teksty', 'historia', '*.md')))
    ids, zle = segmenty(), 0
    for p in pliki:
        for nr, w in enumerate(open(p, encoding='utf-8'), 1):
            for m in re.finditer(r'⟨([^⟩]*)⟩', w):
                for s in SEG_RE.findall(m.group(1)):
                    if s not in ids:
                        zle += 1
                        print(f'{os.path.basename(p)}:{nr}: brak fragmentu {s}')
    print(f'Błędnych odsyłaczy: {zle}')
    return 1 if zle else 0


if __name__ == '__main__':
    sys.exit(main())
