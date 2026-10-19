"""Model obliczeń NK38 odtworzony 1:1 z arkuszy Excela.

Dwa etapy, tak jak w Excelu:
  1. wycena_materialow()  -> arkusz "NK38 ..."          (wynik: F87 / F90)
  2. wycena_montazu()     -> arkusz "<Inwestycja>-NK38" (wynik: K39)

Odwołania do komórek w komentarzach pozwalają porównać model z Excelem.
Celem jest weryfikacja zrozumienia logiki, nie poprawianie jej - znane
błędy arkusza są odtworzone celowo i oznaczone "BŁĄD EXCELA".
"""
from dataclasses import dataclass, field
from math import ceil

GLEBOKOSCI = (175, 180, 185, 190, 195, 200, 210, 220, 225)
DOPLATA_GLEBOKOSC = {175: 0, 180: 500, 185: 550, 190: 600, 195: 650,
                     200: 700, 210: 750, 220: 800, 225: 850}


def ceiling(x, step=1):
    return ceil(round(x / step, 9)) * step


# ---------------------------------------------------------------- etap 1
@dataclass
class Materialy:
    typ: str = "NK38"                 # D1 (NK37 -> +700 zł / system)
    s: int = 0                        # D6  platformy pojedyncze (2 MP)
    d: int = 0                        # D32 platformy podwójne (4 MP)
    np: int = 0                       # D27 systemy dla N.P.
    s_szer: dict = field(default_factory=dict)   # {260: n, 270: n}  D8:D9
    d_szer: dict = field(default_factory=dict)   # {520: n, 540: n}  D34:D35
    s_glebokosc: dict = field(default_factory=dict)  # {cm: n}       D11:D19
    d_glebokosc: dict = field(default_factory=dict)  #               D37:D45
    s_dlugosc: dict = field(default_factory=dict)    # {"500-510"|540|550: n}
    d_dlugosc: dict = field(default_factory=dict)
    agregaty: int = 0                 # D53
    magistrala_6m: int = 0            # D62
    barierki: int = 0                 # D66 (na stronę)
    maskownice: int = 0               # D67
    doplata_q2500: float = 0.06       # D90


def wycena_materialow(m: Materialy) -> dict:
    cena_d = 32500 + (700 if m.typ == "NK37" else 0)          # E32
    cena_s = 0.61 * cena_d                                    # E6 = F3*E32
    cena_np = 0.85 * cena_d                                   # E27
    sn = m.s + m.np                       # "S" w składowych = pojedyncze + NP
    platformy = m.s + m.d + m.np                              # D52
    mp = 2 * m.s + 2 * m.np + 4 * m.d                         # D54

    dl_s = {"500-510": 2340, 540: ceiling(cena_s * 0.0127, 100),   # E21:E23
            550: ceiling(cena_s * 0.0254, 100)}
    dl_d = {"500-510": 2340, 540: cena_d * 0.0127, 550: cena_d * 0.0254}  # bez zaokr.

    def dop(ilosci, ceny):
        return sum(ceny[k] * n for k, n in ilosci.items())

    f25 = (cena_s * m.s + dop(m.s_szer, {260: 1170, 270: 1560})
           + dop(m.s_glebokosc, DOPLATA_GLEBOKOSC) + dop(m.s_dlugosc, dl_s))
    f51 = (cena_d * m.d + dop(m.d_szer, {520: 1820, 540: 3110})
           + dop(m.d_glebokosc, DOPLATA_GLEBOKOSC) + dop(m.d_dlugosc, dl_d))
    f27 = cena_np * m.np

    # hydraulika F56:F62
    gl = {k: m.s_glebokosc.get(k, 0) + m.d_glebokosc.get(k, 0) for k in GLEBOKOSCI}
    sil_2000 = sum(gl[k] for k in GLEBOKOSCI if k <= 200)              # D60
    sil_2250 = sum(gl[k] for k in GLEBOKOSCI if k > 200)               # D61
    sil_std = m.s + m.d - sil_2000 - sil_2250        # D59 (NP pominięte!)
    hydraulika = (m.agregaty * (6500 + 200 + 1500)                    # F56
                  + m.agregaty * 500 + platformy * 50                  # F57
                  + 172 * sn + 207 * m.d + 240 * platformy             # F58
                  + 2 * (1080 * sil_std + 1175 * sil_2000 + 1250 * sil_2250)
                  + m.magistrala_6m * (0.2*11 + 0.4*11 + 2*14 + 6*11 + 6*5 + 6*10))
    barierki = 600 * m.barierki + 700 * m.maskownice                   # F68
    elektryka = (m.agregaty * 1000 + 90 * platformy                    # F70
                 + 92 * sn + 112 * m.d + 170 * platformy)
    lancuchy = 716 * platformy                                         # F73
    listwy = (2 * 207.28 + 2 * 40.14) * platformy                     # F74
    drobne_wsp = 2*3.3 + 2*10.8 + 2*10.95 + 2*3.81 + 4*2.84 + 4*4.4 \
        + (2*25.71 + 2*22.85) + (3.09 + 4.99) * 20 + 5.4
    sruby = drobne_wsp * platformy + 345 * sn + 546 * m.d \
        + 2.98 * (110 * sn + 208 * m.d)                                # F75
    admin = 1800 * m.agregaty + (300 + 40) * platformy                 # F76
    f87 = f25 + f51 + f27 + hydraulika + barierki + elektryka \
        + lancuchy + listwy + sruby + admin
    return {"F87": f87, "F90": f87 * (1 + m.doplata_q2500), "MP": mp,
            "platformy": platformy, "tonaz_B48":
            ceil(round(m.magistrala_6m / 2 + (m.barierki + m.maskownice) / 2, 9)),
            "malowanie_F95": 6400 * m.s + 13500 * (m.d + m.np) + 200 * m.barierki,
            "skladowe": {"platformy": f25 + f51 + f27, "hydraulika": hydraulika,
                         "barierki": barierki, "elektryka": elektryka,
                         "mechanika": lancuchy + listwy + sruby + admin}}


# ---------------------------------------------------------------- etap 2
@dataclass
class Montaz:
    cena_urzadzen: float              # I7  (= F87 lub F90)
    s: int = 0                        # B16
    d: int = 0                        # C16
    np_s: int = 0                     # B17
    np_d: int = 0                     # C17
    agregaty: int = 0                 # E16
    tonaz: int = 0                    # B48 (dni "tonaż/utrudnienia")
    slupki: bool = False              # J18 + F49 (=B49 zamiast C49)
    transport_cena: float = 4000      # I21
    transporty: int = 0               # J21
    rozladunek_sprzet: float = 1700   # I26
    dzwig_cena: float = 2400          # I25
    km_pomiary: float = 0             # C53 (= C58 odbiory)
    km_montaz: float = 0              # C55
    wyjazdy_montaz: int = 0           # B55 (tygodnie lub dni w Krakowie)
    dni_rozladunku: float = 0         # E55
    stawki: tuple = (500, 400, 350, 350)  # I47:I53 (pierwsze 0 kończy listę)
    dieta: float = 45                 # J57
    hotel: float = 130                # J58
    paliwo_100km: float = 113         # I19 = ROUNDUP(12*9.4)
    kob: float = 0.005                # J35
    gdw: float = 0.025                # J36
    podatek: float = 0.14             # J37
    zysk: float = 0.125               # J38
    eur: float = 4.325                # J59


def czas_podrozy(km, ilosc):
    """D53:D58 - BŁĄD EXCELA: dla km>=800 pomija liczbę wyjazdów."""
    if km < 800:
        return (1 + 0.1 * (800 - km) / 100) * km * ilosc / 500
    return km / 800


def wycena_montazu(w: Montaz) -> dict:
    osoby = 0
    for st in w.stawki:                                        # J55
        if st == 0:
            break
        osoby += 1
    osoby = max(osoby, 1)
    stawka = sum(w.stawki) / osoby                             # J56
    mp = 2 * w.s + 4 * w.d + 2 * w.np_s + 2 * w.np_d           # D50
    slupki_dni = mp * 0.37 if w.slupki else 0                  # B49 -> F49
    osd = 5.5 * w.s + 7 * w.d + 7 * (w.np_s + w.np_d) + w.tonaz + slupki_dni  # F50

    wyjazdy = [  # (ilość, km, dni zał/rozł, osoby)  wiersze 53, 55, 58
        (1, w.km_pomiary, 0, 1),
        (w.wyjazdy_montaz, w.km_montaz, w.dni_rozladunku, osoby),
        (1, w.km_pomiary, 0, 2),
    ]
    podroz = [czas_podrozy(km, n) for n, km, _, _ in wyjazdy]
    osd_podr = sum(o * (e + p) for (_, _, e, o), p in zip(wyjazdy, podroz))  # G59
    km_razem = 2 * sum(n * km for n, km, _, _ in wyjazdy)

    k = {}
    k["urzadzenia"] = w.cena_urzadzen                                # K7
    k["slupki"] = mp * 1700 if w.slupki else 0                       # K18
    k["paliwo"] = km_razem / 100 * w.paliwo_100km                   # K19
    k["hotel"] = w.hotel * (ceiling((osd + osd_podr) / osoby) + 1) * osoby  # K20
    k["transport"] = w.transport_cena * w.transporty                 # K21
    k["dzwig"] = w.dzwig_cena * ceil(round((w.d + w.np_d) / 5
                                           + (w.s + w.np_s) * 0.6 / 5, 9))  # K25
    k["rozladunek_sprzet"] = w.rozladunek_sprzet * w.transporty      # K26
    k["rozladunek_ludzie"] = stawka * w.dni_rozladunku * osoby       # K27
    k["dojazd_ludzie"] = stawka * sum(p * o for p, (_, _, _, o) in zip(podroz, wyjazdy))  # K29
    k["montaz"] = stawka * osd if w.wyjazdy_montaz > 0 else 0        # K30
    k["diety"] = w.dieta * (osd + osd_podr)                          # K33
    baza = sum(k.values())                                           # SUM(K7:K34)
    brutto = baza / (1 - (w.kob + w.gdw + w.zysk))
    k["kob"] = brutto * w.kob                                        # K35
    k["gdw"] = brutto * w.gdw                                        # K36
    k["zysk"] = brutto * w.zysk                                      # K38
    k["podatek"] = w.podatek * (k["rozladunek_ludzie"] + k["dojazd_ludzie"]
                                + k["montaz"] + k["diety"] + k["gdw"] + k["zysk"])  # K37
    cena = sum(k.values())                                           # K39
    dni = (osd + osd_podr) / osoby
    return {"K39": cena, "pozycje": k, "MP": mp, "osoby": osoby,
            "osobodni_montaz_F50": osd, "osobodni_podroze_G59": osd_podr,
            "dni_kalendarzowe": ceiling(dni), "J39_drugi_czlon": ceiling(dni / 10) + 1,
            "cena_za_mp": cena / mp, "cena_za_mp_eur": cena / mp / w.eur,
            "koszt_rzeczywisty_K43": cena - k["zysk"],
            "zysk_z_narzutem_K44": k["zysk"]}
