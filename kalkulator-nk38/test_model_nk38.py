"""Porównanie modelu z wartościami policzonymi przez Excel (pliki 14-15.10.2026)."""
import pytest
from model_nk38 import Materialy, Montaz, wycena_materialow, wycena_montazu

WAW_MAT = Materialy(d=15, d_glebokosc={200: 15}, agregaty=3,
                    magistrala_6m=4, barierki=30, maskownice=5)
KRK_MAT = Materialy(s=12, d=27, s_glebokosc={225: 12}, d_glebokosc={225: 27},
                    agregaty=7, magistrala_6m=32, barierki=58, maskownice=4,
                    doplata_q2500=0.07)


def test_materialy_waw():
    r = wycena_materialow(WAW_MAT)
    assert r["F87"] == pytest.approx(649059.6)
    assert r["MP"] == 60 and r["tonaz_B48"] == 20


def test_materialy_krk():
    r = wycena_materialow(KRK_MAT)
    assert r["F87"] == pytest.approx(1517195.44)
    assert r["F90"] == pytest.approx(1623399.1208)
    assert r["tonaz_B48"] == 47


def waw():
    return Montaz(cena_urzadzen=wycena_materialow(WAW_MAT)["F87"], d=15, agregaty=3,
                  tonaz=20, transport_cena=4000, transporty=3, km_pomiary=280,
                  km_montaz=330, wyjazdy_montaz=9, dni_rozladunku=1.5, zysk=0.125)


def krk(**kw):
    a = dict(cena_urzadzen=wycena_materialow(KRK_MAT)["F87"], s=12, d=27,
             agregaty=7, tonaz=47, transport_cena=1800, transporty=6,
             rozladunek_sprzet=500, km_pomiary=20, km_montaz=20,
             wyjazdy_montaz=69, dni_rozladunku=3, stawki=(500, 400, 350, 350, 350),
             dieta=0, hotel=0, zysk=0.13)
    a.update(kw)
    return Montaz(**a)


def test_montaz_waw():
    r = wycena_montazu(waw())
    assert r["K39"] == pytest.approx(951980.8206755031)
    assert r["dni_kalendarzowe"] == 43 and r["J39_drugi_czlon"] == 6


def test_montaz_krk_2t():
    r = wycena_montazu(krk())
    assert r["K39"] == pytest.approx(2067288.638527619)
    assert r["dni_kalendarzowe"] == 69


def test_montaz_krk_2_5t():
    r = wycena_montazu(krk(cena_urzadzen=wycena_materialow(KRK_MAT)["F90"]))
    assert r["K39"] == pytest.approx(2196465.1869482854)


def test_montaz_krk_slupki():
    r = wycena_montazu(krk(slupki=True, wyjazdy_montaz=79))
    assert r["K39"] == pytest.approx(2368495.8090038095)
    assert r["dni_kalendarzowe"] == 79
