"""Testy modelu: zgodność ze starym Excelem (pliki 14-15.10.2026) + nowe reguły v1."""
import pytest
from model_nk38 import (Materialy, Montaz, czas_podrozy, stawka_srednia,
                        wycena_materialow, wycena_montazu)

WAW_MAT = Materialy(d=15, d_glebokosc={200: 15}, agregaty=3, magistrala_6m=4,
                    barierki=30, maskownice=5, doplata_q2500=0.06)
KRK_MAT = Materialy(s=12, d=27, s_glebokosc={225: 12}, d_glebokosc={225: 27},
                    agregaty=7, magistrala_6m=32, barierki=58, maskownice=4,
                    doplata_q2500=0.07)


def waw(**kw):
    mat = wycena_materialow(WAW_MAT)
    a = dict(cena_urzadzen=mat["F87"], d=15, utrudnienia=mat["utrudnienia_auto"],
             km=280, osoby=4, transport_cena=4000, transporty=3,
             rozladunek_sprzet=1700, zysk=0.125, zysk2=0.10)
    a.update(kw)
    return Montaz(**a)


def krk(**kw):
    mat = wycena_materialow(KRK_MAT)
    a = dict(cena_urzadzen=mat["F87"], s=12, d=27, utrudnienia=mat["utrudnienia_auto"],
             krakow=True, osoby=5, transport_cena=1800, transporty=6,
             rozladunek_sprzet=500, zysk=0.13, zysk2=0.11)
    a.update(kw)
    return Montaz(**a)


# ---------------------------------------------------- zgodność ze starym Excelem
def test_materialy():
    assert wycena_materialow(WAW_MAT)["F87"] == pytest.approx(649059.6)
    r = wycena_materialow(KRK_MAT)
    assert r["F87"] == pytest.approx(1517195.44)
    assert r["F90"] == pytest.approx(1623399.1208)
    assert wycena_materialow(WAW_MAT)["utrudnienia_auto"] == 20
    assert r["utrudnienia_auto"] == 47


def test_montaz_waw():
    r = wycena_montazu(waw())
    assert r["K39"] == pytest.approx(951980.8206755031)
    assert (r["dni"], r["wyjazdy"], r["km_montaz"]) == (43, 9, 330)


def test_montaz_krk_warianty():
    assert wycena_montazu(krk())["K39"] == pytest.approx(2067288.638527619)
    f90 = wycena_materialow(KRK_MAT)["F90"]
    assert wycena_montazu(krk(cena_urzadzen=f90))["K39"] == pytest.approx(2196465.1869482854)
    r = wycena_montazu(krk(slupki=True))
    assert r["K39"] == pytest.approx(2368495.8090038095)
    assert r["wyjazdy"] == 79


def test_zysk_b():
    # zysk B = te same koszty, inny procent zysku
    r = wycena_montazu(waw(zysk2=0.125))
    assert r["cena2"] == pytest.approx(r["cena"])
    assert wycena_montazu(waw())["cena2"] < r["cena"]


def test_tygodnie_krakow():
    r = wycena_montazu(krk())
    assert (r["dni"], r["tygodnie"]) == (69, 14)


# ---------------------------------------------------- nowe reguły
def test_stawki_ekipy():
    assert stawka_srednia(1) == 500
    assert stawka_srednia(2) == 450
    assert stawka_srednia(4) == pytest.approx(400)
    assert stawka_srednia(5) == pytest.approx(390)


def test_wiecej_osob_krocej():
    r4, r6 = wycena_montazu(waw(osoby=4)), wycena_montazu(waw(osoby=6))
    assert r6["dni"] < r4["dni"] and r6["wyjazdy"] <= r4["wyjazdy"]


def test_podroz_ciagla_przy_800_km():
    a, b = czas_podrozy(799.99, 9), czas_podrozy(800, 9)
    assert b == pytest.approx(a, rel=1e-4)
    assert czas_podrozy(1000, 9) > czas_podrozy(800, 9)


def test_podroz_uproszczona():
    assert czas_podrozy(650, 1, "uproszczony") == pytest.approx(2)


def test_np_jak_d():
    a = wycena_materialow(Materialy(d=1, agregaty=1))
    b = wycena_materialow(Materialy(np=1, agregaty=1))
    assert b["sil_std"] == 1 and b["MP"] == 2
    # różnica tylko w cenie bazowej platformy (85% D)
    assert a["F87"] - b["F87"] == pytest.approx(32500 * 0.15)


def test_krakow_bez_hotelu_i_diet():
    r = wycena_montazu(krk())
    assert r["pozycje"]["hotel"] == 0 and r["pozycje"]["diety"] == 0
    assert (r["km_pomiary"], r["km_montaz"]) == (20, 20)
