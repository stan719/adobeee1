"""Przygotowanie strony rękopisu do odczytu: podgląd całości (przejście 1) i powiększone pasy (przejście 2).

Użycie: python narzedzia/pasy.py PLIK KATALOG_WYJ [--pasy N] [--obrot ST] [--x0 F --x1 F --y0 F --y1 F]
Tworzy KATALOG_WYJ/<nr>_0.jpg (całość) oraz <nr>_1..N.jpg (pasy z 6% zakładką).
"""
import argparse, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from powieksz import kadr

a = argparse.ArgumentParser()
a.add_argument('plik'); a.add_argument('wyj')
a.add_argument('--pasy', type=int, default=3); a.add_argument('--obrot', type=float, default=0)
for k, d in (('x0', 0), ('x1', 1), ('y0', 0), ('y1', 1)): a.add_argument('--' + k, type=float, default=d)
o = a.parse_args()
os.makedirs(o.wyj, exist_ok=True)
nr = re.search(r'\d{4}', o.plik).group()
kadr(o.plik, (o.x0, o.y0, o.x1, o.y1), o.obrot, 1100, 1.3).save(f'{o.wyj}/{nr}_0.jpg', quality=85)
h = (o.y1 - o.y0) / o.pasy
for i in range(o.pasy):
    y0 = max(o.y0, o.y0 + i * h - 0.03); y1 = min(o.y1, o.y0 + (i + 1) * h + 0.03)
    kadr(o.plik, (o.x0, y0, o.x1, y1), o.obrot, 1600, 1.5).save(f'{o.wyj}/{nr}_{i+1}.jpg', quality=88)
print(nr)
