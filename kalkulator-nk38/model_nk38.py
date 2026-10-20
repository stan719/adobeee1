"""Model obliczeń NK38 - wersja 1 (źródło prawdy dla Excela v1 i aplikacji).

Dwa etapy, tak jak w starym Excelu:
  1. wycena_materialow()  -> dawny arkusz "NK38 ..."          (F87 / F90)
  2. wycena_montazu()     -> dawny arkusz "<Inwestycja>-NK38" (K39)

Zmiany względem starego arkusza (ustalone 19.10.2026):
  - liczba osób ekipy zamiast listy stawek: 1. osoba 500, 2. 400, każda kolejna 350,
  - odległości liczone z jednej wartości: pomiary = km od Krakowa, montaż = km + 50,
    Kraków = 20 / 20 km (obie można nadpisać),
  - tygodnie (lub dni w Krakowie) montażu liczone automatycznie (dawne B55),
  - Kraków: bez hotelu i diet,
  - N.P. traktowane jak D (siłowniki, składowe, dźwig), cena 85% D, 2 MP,
  - "tonaż" = utrudnienia: wyliczane z magistrali i barierek + ręczny dodatek,
  - czas podróży: stary wzór z poprawką dla >= 800 km albo wzór uproszczony,
  - dwa poziomy zysku (A i B) liczone obok siebie (dawna kolumna N, bez zmiany ceny dźwigu).
Dla danych z plików 14-15.10.2026 wynik jest identyczny ze starym arkuszem.
"""
from dataclasses import dataclass, field
from math import ceil

GLEBOKOSCI = (175, 180, 185, 190, 195, 200, 210, 220, 225)
DOPLATA_GLEBOKOSC = {175: 0, 180: 500, 185: 550, 190: 600, 195: 650,
                     200: 700, 210: 750, 220: 800, 225: 850}

CENNIK = dict(
    cena_D=32500, doplata_NK37=700, wsp_S=0.61, wsp_NP=0.85,
    q2500=0.07, dl_500=2340, dl_wsp=0.00127,
    agregat=6500 + 200 + 1500, transp_agregatu=500, transp_silownikow=50,
    sil_1700=1080, sil_2000=1175, sil_2250=1250,
    magistrala=0.2*11 + 0.4*11 + 2*14 + 6*11 + 6*5 + 6*10,
    barierka=600, maskownica=700, skrzynka_zasil=1000, admin=1800,
    mal_S=6400, mal_D=13500, mal_bar=200, slupek=1700, slupek22=6300, slupek_rbd=0.37,
    osd_S=5.5, osd_D=7, osd_NP=7, osd_magistrala=0.5, osd_barierka=0.5,
    rozl_TIR=0.5, dzwig=2400, dzwig_D=5, dzwig_wspS=0.6,
    dni_tydzien=5, km_montaz_dodatek=50, km_krakow=20, km_dzien=650,
    stawka_1=500, stawka_2=400, stawka_kolejna=350,
    dieta=45, hotel=130, spalanie=12, paliwo=9.4,
    pomiary_osoby=1, odbiory_osoby=2,
    kob=0.005, gdw=0.025, podatek=0.14,
)


def ceiling(x, step=1):
    return ceil(round(x / step, 9)) * step


# ---------------------------------------------------------------- etap 1
@dataclass
class Materialy:
    typ: str = "NK38"
    s: int = 0
    d: int = 0
    np: int = 0
    s_szer: dict = field(default_factory=dict)       # {260: n, 270: n}
    d_szer: dict = field(default_factory=dict)       # {520: n, 540: n}
    s_glebokosc: dict = field(default_factory=dict)  # {cm: n}
    d_glebokosc: dict = field(default_factory=dict)
    s_dlugosc: dict = field(default_factory=dict)    # {"500-510"|540|550: n}
    d_dlugosc: dict = field(default_factory=dict)
    agregaty: int = 0
    magistrala_6m: int = 0
    barierki: int = 0
    maskownice: int = 0
    doplata_q2500: float = CENNIK["q2500"]


def skladowe_na_platforme():
    """Koszt składowych na 1 platformę S i D, w podziale na grupy (Cennik)."""
    drobne = 2*3.3 + 2*10.8 + 2*10.95 + 2*3.81 + 4*2.84 + 4*4.4 \
        + (2*25.71 + 2*22.85) + (3.09 + 4.99) * 20 + 5.4
    lancuchy = 4.8*2*45 + 4*8 + 2*36 + 2*90
    listwy = 2*207.28 + 2*40.14
    wsp = drobne + lancuchy + listwy + 300 + 40
    return {
        "Mechanika": (wsp + 345 + 2.98*110, wsp + 546 + 2.98*208),
        "Hydraulika": (172 + 240, 207 + 240),
        "Elektryka": (90 + 92 + 170, 90 + 112 + 170),
    }


def wycena_materialow(m: Materialy, c=CENNIK) -> dict:
    cena_d = c["cena_D"] + (c["doplata_NK37"] if m.typ == "NK37" else 0)
    cena_s = c["wsp_S"] * cena_d
    cena_np = c["wsp_NP"] * cena_d
    dn = m.d + m.np                       # N.P. liczone jak D
    platformy = m.s + m.d + m.np
    mp = 2 * m.s + 2 * m.np + 4 * m.d

    dl_s = {"500-510": c["dl_500"], 540: ceiling(cena_s * c["dl_wsp"] * 10, 100),
            550: ceiling(cena_s * c["dl_wsp"] * 20, 100)}
    dl_d = {"500-510": c["dl_500"], 540: cena_d * c["dl_wsp"] * 10,
            550: cena_d * c["dl_wsp"] * 20}

    def dop(ilosci, ceny):
        return sum(ceny[k] * n for k, n in ilosci.items())

    plat = (cena_s * m.s + dop(m.s_szer, {260: 1170, 270: 1560})
            + dop(m.s_glebokosc, DOPLATA_GLEBOKOSC) + dop(m.s_dlugosc, dl_s)
            + cena_d * m.d + dop(m.d_szer, {520: 1820, 540: 3110})
            + dop(m.d_glebokosc, DOPLATA_GLEBOKOSC) + dop(m.d_dlugosc, dl_d)
            + cena_np * m.np)

    gl = {k: m.s_glebokosc.get(k, 0) + m.d_glebokosc.get(k, 0) for k in GLEBOKOSCI}
    sil_2000 = sum(gl[k] for k in GLEBOKOSCI if k <= 200)
    sil_2250 = sum(gl[k] for k in GLEBOKOSCI if k > 200)
    sil_std = platformy - sil_2000 - sil_2250
    sk = skladowe_na_platforme()

    def grupa(g):
        return sk[g][0] * m.s + sk[g][1] * dn

    hydraulika = (m.agregaty * (c["agregat"] + c["transp_agregatu"])
                  + platformy * c["transp_silownikow"]
                  + 2 * (c["sil_1700"] * sil_std + c["sil_2000"] * sil_2000
                         + c["sil_2250"] * sil_2250)
                  + m.magistrala_6m * c["magistrala"] + grupa("Hydraulika"))
    barierki = c["barierka"] * m.barierki + c["maskownica"] * m.maskownice
    elektryka = m.agregaty * c["skrzynka_zasil"] + grupa("Elektryka")
    mechanika = m.agregaty * c["admin"] + grupa("Mechanika")
    f87 = plat + hydraulika + barierki + elektryka + mechanika
    return {
        "F87": f87, "F90": f87 * (1 + m.doplata_q2500), "MP": mp,
        "platformy": platformy, "sil_std": sil_std,
        "utrudnienia_auto": ceil(round(m.magistrala_6m * c["osd_magistrala"]
                                       + (m.barierki + m.maskownice) * c["osd_barierka"], 9)),
        "malowanie": c["mal_S"] * m.s + c["mal_D"] * dn + c["mal_bar"] * m.barierki,
        "skladowe": {"platformy": plat, "hydraulika": hydraulika, "barierki": barierki,
                     "elektryka": elektryka, "mechanika": mechanika},
    }


# ---------------------------------------------------------------- etap 2
@dataclass
class Montaz:
    cena_urzadzen: float
    s: int = 0
    d: int = 0
    np: int = 0
    mp: int = 0                       # 0 = wylicz z s/d/np
    utrudnienia: float = 0            # osobodni: auto (magistrala/barierki) + ręczne
    slupki: bool = False
    krakow: bool = False
    km: float = 0                     # odległość od Krakowa (pomiary)
    km_pomiary: float = None          # nadpisanie
    km_montaz: float = None           # nadpisanie (domyślnie km + 50)
    osoby: int = 4
    wyjazdy: int = None               # nadpisanie tygodni / dni montażu
    transport_cena: float = 0
    transporty: int = 0
    rozladunek_sprzet: float = 0      # jednorazowo: przyjazd i wyjazd wózka
    dzwig_koszt: float = None         # nadpisanie kosztu Spider Crane
    dni_rozladunku: float = None      # nadpisanie (domyślnie 0,5 / TIR)
    wzor_podrozy: str = "stary"       # "stary" | "uproszczony"
    zysk: float = 0.14
    zysk2: float = 0.10
    eur: float = 4.325


def stawka_srednia(osoby, c=CENNIK):
    suma = c["stawka_1"] + (c["stawka_2"] if osoby >= 2 else 0) \
        + max(0, osoby - 2) * c["stawka_kolejna"]
    return suma / osoby


def czas_podrozy(km, ilosc, wzor="stary", c=CENNIK):
    """Dni podróży (tam i z powrotem) dla 'ilosc' wyjazdów jednej osoby.

    stary: wzór z arkusza, ale dla >= 800 km mnożony przez liczbę wyjazdów
           (w starym arkuszu ten człon pomijał liczbę wyjazdów - błąd B1).
    uproszczony: 2 * km / km_dzien (domyślnie 650 km dziennie).
    """
    if wzor == "uproszczony":
        return 2 * km / c["km_dzien"] * ilosc
    return (1 + 0.1 * max(0, 800 - km) / 100) * km * ilosc / 500


def wycena_montazu(w: Montaz, c=CENNIK) -> dict:
    osoby = max(1, w.osoby)
    stawka = stawka_srednia(osoby, c)
    mp = w.mp or (2 * w.s + 4 * w.d + 2 * w.np)
    km_pom = w.km_pomiary if w.km_pomiary is not None else (c["km_krakow"] if w.krakow else w.km)
    km_mon = w.km_montaz if w.km_montaz is not None else (
        c["km_krakow"] if w.krakow else w.km + c["km_montaz_dodatek"])
    rozl = w.dni_rozladunku if w.dni_rozladunku is not None else c["rozl_TIR"] * w.transporty
    osd = (c["osd_S"] * w.s + c["osd_D"] * w.d + c["osd_NP"] * w.np + w.utrudnienia
           + (c["slupek_rbd"] * mp if w.slupki else 0))
    podr_pom = (c["pomiary_osoby"] + c["odbiory_osoby"]) * czas_podrozy(km_pom, 1, w.wzor_podrozy, c)

    def podroze(wyj):
        return podr_pom + osoby * (rozl + czas_podrozy(km_mon, wyj, w.wzor_podrozy, c))

    def wyjazdy_z_dni(dni):
        return dni if w.krakow else ceiling(dni / c["dni_tydzien"])

    wyj = 1
    for _ in range(5):           # zbieżne po 2-4 krokach
        wyj = wyjazdy_z_dni(ceiling((osd + podroze(wyj)) / osoby))
    if w.wyjazdy is not None:
        wyj = w.wyjazdy
    podr = podroze(wyj)
    osd_all = osd + podr
    dni = ceiling(osd_all / osoby)
    km_razem = 2 * (km_mon * wyj + 2 * km_pom)

    k = {}
    k["urzadzenia"] = w.cena_urzadzen
    k["slupki"] = c["slupek"] * mp if w.slupki else 0
    k["paliwo"] = km_razem / 100 * ceil(round(c["spalanie"] * c["paliwo"], 9))
    k["hotel"] = 0 if w.krakow else c["hotel"] * (dni + 1) * osoby
    k["transport"] = w.transport_cena * w.transporty
    dzwig_dni = ceil(round((w.d + w.np) / c["dzwig_D"] + w.s * c["dzwig_wspS"] / c["dzwig_D"], 9))
    k["dzwig"] = w.dzwig_koszt if w.dzwig_koszt is not None else c["dzwig"] * dzwig_dni
    k["rozladunek_sprzet"] = w.rozladunek_sprzet
    k["rozladunek_ludzie"] = stawka * rozl * osoby
    k["dojazd_ludzie"] = stawka * (podr - osoby * rozl)
    k["montaz"] = stawka * osd if wyj > 0 else 0
    k["diety"] = 0 if w.krakow else c["dieta"] * osd_all
    robocizna = k["rozladunek_ludzie"] + k["dojazd_ludzie"] + k["montaz"] + k["diety"]

    def narzuty(baza, zysk):
        brutto = baza / (1 - (c["kob"] + c["gdw"] + zysk))
        return brutto, c["podatek"] * (robocizna + brutto * (c["gdw"] + zysk))

    baza = sum(k.values())
    brutto, podatek = narzuty(baza, w.zysk)
    k["kob"] = brutto * c["kob"]
    k["gdw"] = brutto * c["gdw"]
    k["zysk"] = brutto * w.zysk
    k["podatek"] = podatek
    cena = brutto + podatek
    brutto2, podatek2 = narzuty(baza, w.zysk2)
    return {
        "K39": cena, "cena": cena, "cena2": brutto2 + podatek2, "pozycje": k,
        "tygodnie": ceiling(dni / c["dni_tydzien"]) if w.krakow else wyj,
        "MP": mp, "osoby": osoby, "stawka": stawka, "km_pomiary": km_pom, "km_montaz": km_mon,
        "dni_rozladunku": rozl, "osobodni_montaz": osd, "osobodni_podroze": podr,
        "osobodni": osd_all, "dni": dni, "wyjazdy": wyj, "dzwig_dni": dzwig_dni,
        "cena_za_mp": cena / mp if mp else 0,
        "cena_za_mp_eur": cena / mp / w.eur if mp else 0,
        "koszt_rzeczywisty": cena - k["zysk"],
        # przelicznik kosztu czysto materiałowego na cenę (malowanie, słupki 22 kW)
        "mnoznik_materialu": (1 + c["podatek"] * (c["gdw"] + w.zysk)) / (1 - (c["kob"] + c["gdw"] + w.zysk)),
    }
