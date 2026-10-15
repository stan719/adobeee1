"""Kadrowanie i powiększanie fragmentów zdjęć źródłowych do odczytu.

Użycie:
  python narzedzia/powieksz.py PLIK X0 Y0 X1 Y1 [--obrot STOPNIE] [--szer PX] [--kontrast K] [--wyj PLIK]
Współrzędne X0..Y1 to ułamki (0–1) obrazu PO obrocie. Obrót przeciwnie do ruchu wskazówek zegara.
"""
import argparse, os, sys
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

ZDJ = os.path.join(os.path.dirname(__file__), '..', 'Zdjęcia')

def znajdz(nazwa):
    if os.path.exists(nazwa):
        return nazwa
    for f in os.listdir(ZDJ):
        if f.startswith(nazwa):
            return os.path.join(ZDJ, f)
    sys.exit(f'nie znaleziono: {nazwa}')

def kadr(plik, box, obrot=0, szer=1600, kontrast=1.6, szarosc=True):
    im = ImageOps.exif_transpose(Image.open(znajdz(plik)))
    if obrot:
        im = im.rotate(obrot, expand=True)
    w, h = im.size
    im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    if szarosc:
        im = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    im = ImageEnhance.Contrast(im).enhance(kontrast)
    if im.width != szer:
        im = im.resize((szer, int(im.height * szer / im.width)), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=1.5, percent=80))

if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('plik'); a.add_argument('box', nargs=4, type=float)
    a.add_argument('--obrot', type=float, default=0); a.add_argument('--szer', type=int, default=1600)
    a.add_argument('--kontrast', type=float, default=1.6); a.add_argument('--kolor', action='store_true')
    a.add_argument('--wyj', default='kadr.jpg')
    o = a.parse_args()
    kadr(o.plik, o.box, o.obrot, o.szer, o.kontrast, not o.kolor).save(o.wyj, quality=90)
    print(o.wyj)
