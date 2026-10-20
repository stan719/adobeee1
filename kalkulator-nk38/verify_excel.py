"""Sprawdza, czy Excel (build_kalkulator.py) liczy to samo co model_nk38.py.

Losuje zestawy danych, generuje dla nich skoroszyty, przelicza LibreOffice
i porównuje wyniki z modelem.  Użycie:  python3 verify_excel.py [liczba]
"""
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import openpyxl
from build_kalkulator import GLEBOKOSCI, OSOBY_ANALIZA, PRZYKLADY, WARIANTY, build
from model_nk38 import CENNIK, Materialy, Montaz, wycena_materialow, wycena_montazu


def model(inp, wariant, osoby=None):
    g = lambda k, d=0: inp.get(k, d) if inp.get(k) is not None else d
    dims = lambda side: ({260: g(f"in_szer1_{side}"), 270: g(f"in_szer2_{side}")} if side == "S"
                         else {520: g("in_szer1_D"), 540: g("in_szer2_D")})
    dl = lambda side: {"500-510": g(f"in_dl500_{side}"), 540: g(f"in_dl540_{side}"),
                       550: g(f"in_dl550_{side}")}
    m = Materialy(typ=g("in_typ", "NK38"), s=g("in_S"), d=g("in_D"), np=g("in_NP"),
                  s_szer=dims("S"), d_szer=dims("D"), s_glebokosc=inp.get("gl_S", {}),
                  d_glebokosc=inp.get("gl_D", {}), s_dlugosc=dl("S"), d_dlugosc=dl("D"),
                  agregaty=g("in_agregaty"), magistrala_6m=g("in_magistrala"),
                  barierki=g("in_barierki"), maskownice=g("in_maskownice"),
                  doplata_q2500=g("in_q2500", CENNIK["q2500"]))
    mat = wycena_materialow(m)
    q, sl = wariant.startswith("2500"), "słupki" in wariant
    return wycena_montazu(Montaz(
        cena_urzadzen=mat["F90"] if q else mat["F87"], s=m.s, d=m.d, np=m.np,
        utrudnienia=mat["utrudnienia_auto"] + g("in_utr_dod"), slupki=sl,
        krakow=g("in_lok", "Poza Krakowem") == "Kraków", km=g("in_km"),
        km_pomiary=inp.get("in_km_pom"), km_montaz=inp.get("in_km_mon"),
        osoby=osoby or g("in_osoby", 4), wyjazdy=inp.get("in_wyjazdy"),
        transport_cena=g("in_tir_cena"), transporty=g("in_tir"),
        rozladunek_sprzet=g("in_rozl_cena"), dni_rozladunku=inp.get("in_rozl_dni"), dzwig_koszt=inp.get("in_dzwig_koszt"),
        wzor_podrozy="uproszczony" if g("in_wzor", "") == "Uproszczony" else "stary",
        zysk=g("in_zysk", 0.14), zysk2=g("in_zysk2", 0.10), eur=g("in_eur", 4.325)))


def losuj(rnd):
    s, d, np_ = rnd.choice([0, 0, 3, 12]), rnd.randint(1, 40), rnd.choice([0, 0, 0, 2])
    inp = dict(in_S=s, in_D=d, in_NP=np_, in_agregaty=max(1, (s + d + np_) // 5),
               in_typ=rnd.choice(["NK38", "NK38", "NK37"]),
               in_magistrala=rnd.randint(0, 30), in_barierki=rnd.randint(0, 60),
               in_maskownice=rnd.randint(0, 10), in_utr_dod=rnd.choice([0, 0, 3, 7.5]),
               in_lok=rnd.choice(["Kraków", "Poza Krakowem", "Poza Krakowem"]),
               in_km=rnd.choice([150, 280, 450, 790, 950, 1300]),
               in_tir=rnd.randint(1, 8), in_tir_cena=rnd.choice([1600, 3300, 4500]),
               in_rozl_cena=rnd.choice([500, 1700, 5100]), in_osoby=rnd.randint(2, 7),
               in_wzor=rnd.choice(["Stary (poprawiony)", "Uproszczony"]),
               in_zysk=rnd.choice([0.10, 0.125, 0.15]), in_zysk2=0.08,
               in_q2500=rnd.choice([0.06, 0.07]), in_analiza=rnd.choice(WARIANTY))
    if rnd.random() < 0.3:
        inp["in_km_mon"] = inp["in_km"] + 120
    if rnd.random() < 0.2:
        inp["in_wyjazdy"] = rnd.randint(3, 20)
    if rnd.random() < 0.2:
        inp["in_rozl_dni"] = 2
    if rnd.random() < 0.25:
        inp["in_dzwig_koszt"] = 7500
    gl = lambda n: {cm: k for cm, k in zip(rnd.sample([g[0] for g in GLEBOKOSCI], 2),
                                           (n // 2, n - n // 2))} if n and rnd.random() < 0.7 else {}
    inp["gl_S"], inp["gl_D"] = gl(s), gl(d)
    if s:
        inp["in_szer1_S"], inp["in_dl540_S"], inp["in_dl550_S"] = 1, min(s, 2), 0
    inp["in_szer2_D"], inp["in_dl500_D"], inp["in_dl550_D"] = min(d, 1), 0, min(d, 2)
    return inp


def main(n):
    rnd = random.Random(7)
    zestawy = [PRZYKLADY["waw"], PRZYKLADY["krk"]] + [losuj(rnd) for _ in range(n)]
    tmp = Path(tempfile.mkdtemp())
    meta = []
    for i, inp in enumerate(zestawy):
        wb, names, rows, cols = build(inp)
        wb.save(tmp / f"t{i}.xlsx")
        meta.append((rows, cols))
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx:Calc MS Excel 2007 XML",
                    "--outdir", str(tmp / "out")] + [str(tmp / f"t{i}.xlsx") for i in range(len(zestawy))],
                   check=True, capture_output=True)
    bad = 0
    for i, inp in enumerate(zestawy):
        ws = openpyxl.load_workbook(tmp / "out" / f"t{i}.xlsx", data_only=True)["Obliczenia"]
        rows, cols = meta[i]
        for c in cols:
            war = c["label"] if not c["label"].endswith("os.") else inp.get("in_analiza", WARIANTY[0])
            os_ = int(c["label"].split()[0]) if c["label"].endswith("os.") else None
            m = model(inp, war, os_)
            for key, mk in (("cena", "cena"), ("cena2", "cena2"), ("dni", "dni"), ("tyg", "tygodnie"),
                            ("wyj", "wyjazdy"), ("osd_all", "osobodni")):
                xv = ws[f"{c['col']}{rows[key]}"].value
                if not isinstance(xv, (int, float)) or abs(xv - m[mk]) > 0.01:
                    bad += 1
                    print(f"zestaw {i} kolumna {c['label']} {key}: excel={xv} model={m[mk]}")
    print(f"{len(zestawy)} zestawów x {len(meta[0][1])} kolumn: {'OK' if not bad else f'{bad} różnic'}")
    return bad


if __name__ == "__main__":
    sys.exit(1 if main(int(sys.argv[1]) if len(sys.argv) > 1 else 20) else 0)
