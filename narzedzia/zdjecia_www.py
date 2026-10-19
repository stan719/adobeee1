"""Kopie zdjęć źródeł do strony: strona/skany/<nazwa>.jpg (do 2000 px) i strona/skany/m/<nazwa>.jpg (miniatura).

Użycie: python narzedzia/zdjecia_www.py   (pomija pliki już wygenerowane)
Oryginały w Zdjęcia/ pozostają bez zmian. Obrót ustalony na podglądach (katalog.yaml: „zdjęcie obrócone”).
"""
import glob, os, re
from PIL import Image, ImageOps

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
ZRODLO = os.path.join(KORZEN, 'Zdjęcia')
WYJ = os.path.join(KORZEN, 'strona', 'skany')   # strona/zdjecia uszkodzony na dysku (WinError 1392)

# stopnie dla Image.rotate (dodatnie = przeciwnie do ruchu wskazówek zegara)
OBROT = {**{f'IMG_{n}': 90 for n in range(5810, 5818)},     # S01 — rozkładówki fotografowane bokiem
         'IMG_5818': 90, 'IMG_5931': -90, 'IMG_6002': 90, 'IMG_6013': -90}


def nazwa_www(plik):
    """'IMG_5810(1).JPEG' -> 'IMG_5810-1.jpg'"""
    baza = os.path.splitext(os.path.basename(plik))[0]
    return re.sub(r'\((\d+)\)', r'-\1', baza).replace(' ', '_') + '.jpg'


def main():
    os.makedirs(os.path.join(WYJ, 'm'), exist_ok=True)
    pliki = sorted(glob.glob(os.path.join(ZRODLO, '*')))
    for n, p in enumerate(pliki, 1):
        cel = os.path.join(WYJ, nazwa_www(p))
        mini = os.path.join(WYJ, 'm', nazwa_www(p))
        if os.path.exists(cel) and os.path.exists(mini):
            continue
        im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
        kat = OBROT.get(re.match(r'IMG_\d+', os.path.basename(p)).group(0), 0)
        if kat:
            im = im.rotate(kat, expand=True)
        duze = im.copy()
        duze.thumbnail((2000, 2000))
        duze.save(cel, quality=80, optimize=True, progressive=True)
        im.thumbnail((360, 360))
        im.save(mini, quality=75, optimize=True)
        print(n, len(pliki), os.path.basename(cel), flush=True)


if __name__ == '__main__':
    main()
