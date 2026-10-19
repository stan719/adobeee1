"""Generuje prototyp nowego kalkulatora NK38 (Kalkulator_NK38_v0.xlsx).

Układ:
  Dane         - jedyne miejsce, gdzie się coś wpisuje (żółte pola)
  Podsumowanie - wynik: 4 warianty obok siebie (2000/2500 kg, z/bez słupków)
  Obliczenia   - materiały (dawny arkusz "NK38 ...") + montaż (dawny "<Inw>-NK38")
  Cennik       - wszystkie stałe i ceny, wcześniej wpisane na sztywno w formułach

Logika jest celowo identyczna z obecnym arkuszem (wynik zgodny co do grosza),
z dwiema zmianami: liczba tygodni/dni montażu liczy się sama (można nadpisać),
a hotel i diety w Krakowie zerują się automatycznie.

Użycie:  python3 build_kalkulator.py [plik_wyjściowy] [--przyklad waw|krk]
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter

FILL_IN = PatternFill("solid", fgColor="FFF2CC")
FILL_HEAD = PatternFill("solid", fgColor="1F3864")
FILL_SEC = PatternFill("solid", fgColor="D9E1F2")
FILL_CALC = PatternFill("solid", fgColor="F2F2F2")
FILL_RES = PatternFill("solid", fgColor="E2EFDA")
FILL_WARN = PatternFill("solid", fgColor="F8CBAD")
F_HEAD = Font(bold=True, color="FFFFFF", size=13)
F_BOLD = Font(bold=True)
THIN = Side(style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
PLN = '#,##0 "zł"'
PLN2 = '#,##0.00 "zł"'
EUR = '#,##0 "€"'
PCT = "0.0%"
NUM = "#,##0.##"

GLEBOKOSCI = [(175, 0, 2000), (180, 500, 2000), (185, 550, 2000), (190, 600, 2000),
              (195, 650, 2000), (200, 700, 2000), (210, 750, 2250), (220, 800, 2250),
              (225, 850, 2250)]

wb = Workbook()
names = {}


def name(n, ws, cell):
    ref = f"'{ws.title}'!${''.join(c for c in cell if c.isalpha())}${''.join(c for c in cell if c.isdigit())}"
    wb.defined_names[n] = DefinedName(n, attr_text=ref)
    names[n] = ref


def name_range(n, ws, rng):
    a, b = rng.split(":")
    fix = lambda c: f"${''.join(x for x in c if x.isalpha())}${''.join(x for x in c if x.isdigit())}"
    wb.defined_names[n] = DefinedName(n, attr_text=f"'{ws.title}'!{fix(a)}:{fix(b)}")


def header(ws, text, width_cols=6):
    ws["B2"] = text
    ws["B2"].font = F_HEAD
    for c in range(2, 2 + width_cols):
        ws.cell(row=2, column=c).fill = FILL_HEAD
    ws.row_dimensions[2].height = 24


def section(ws, row, text, cols=4):
    ws.cell(row=row, column=2, value=text).font = F_BOLD
    for c in range(2, 2 + cols):
        ws.cell(row=row, column=c).fill = FILL_SEC


# =============================================================== CENNIK
cen = wb.active
cen.title = "Cennik"
header(cen, "CENNIK I STAŁE KALKULACYJNE NK38", 5)
cen["B3"] = "Zmiana ceny tutaj działa we wszystkich formułach. Kolumna E = skąd wartość pochodzi w starym arkuszu."
cen["B3"].font = Font(italic=True, color="7F7F7F")
for col, w in zip("ABCDEF", (2, 52, 14, 14, 40, 2)):
    cen.column_dimensions[col].width = w

CENNIK = [
    ("Platformy", None),
    ("c_cena_D", "Platforma podwójna NK38-500-170-530 (4 MP)", 32500, PLN, "NK38!E32"),
    ("c_doplata_NK37", "Dopłata za NK37 / system", 700, PLN, "NK38!F1"),
    ("c_wsp_S", "Cena S jako ułamek ceny D", 0.61, PCT, "NK38!F3"),
    ("c_wsp_NP", "Cena systemu N.P. jako ułamek ceny D", 0.85, PCT, "NK38!E27"),
    ("c_szer_260", "Szerokość S 260 cm", 1170, PLN, "NK38!E8"),
    ("c_szer_270", "Szerokość S 270 cm", 1560, PLN, "NK38!E9"),
    ("c_szer_520", "Szerokość D 520 cm", 1820, PLN, "NK38!E34"),
    ("c_szer_540", "Szerokość D 540 cm", 3110, PLN, "NK38!E35"),
    ("c_dl_500", "Długość zagłębienia 500-510 cm", 2340, PLN, "NK38!E21/E47"),
    ("c_dl_wsp", "Dopłata za 1 cm długości (ułamek ceny platformy)", 0.00127, "0.00000", "NK38!E22 (4 kg/cm z 3150 kg)"),
    ("c_q2500", "Dopłata Q=2500 kg (domyślnie, nadpisz w Dane)", 0.06, PCT, "NK38!D90"),
    ("Hydraulika", None),
    ("c_agregat", "Agregat 11,5 l/min (do 6 platform)", 6500, PLN, "NK38!E56"),
    ("c_olej", "Olej 150 l / agregat", 1500, PLN, "NK38!D134"),
    ("c_hydr_drobne", "Elementy drobne / agregat", 200, PLN, "NK38!D135"),
    ("c_transp_agregatu", "Transport agregatu", 500, PLN, "NK38!F57"),
    ("c_transp_silownikow", "Transport siłowników / platformę", 50, PLN, "NK38!F57"),
    ("c_sil_1700", "Siłownik standard (zagł. 170)", 1080, PLN, "NK38!D130"),
    ("c_sil_2000", "Siłownik do zagł. 2000", 1175, PLN, "NK38!D129"),
    ("c_sil_2250", "Siłownik do zagł. 2250", 1250, PLN, "NK38!D128"),
    ("c_magistrala", "Magistrala EXTRA / 6 m", "=0.2*11+0.4*11+2*14+6*11+6*5+6*10", PLN2, "NK38!D133"),
    ("Barierki, elektryka, administracja", None),
    ("c_barierka", "Barierka na stronę (Metazet 538 zł)", 600, PLN, "NK38!E66"),
    ("c_maskownica", "Maskownica / bariera tylna (Metazet 608 zł)", 700, PLN, "NK38!E67"),
    ("c_skrzynka_zasil", "Elektryka - skrzynka zasilająca / agregat", 1000, PLN, "NK38!D121"),
    ("c_admin", "Administracja, koszty biura / agregat", 1800, PLN, "NK38!D125"),
    ("Opcje (poza ceną standard)", None),
    ("c_mal_S", "Malowanie proszkowe RAL - system S", 6400, PLN, "NK38!E92"),
    ("c_mal_D", "Malowanie proszkowe RAL - system D / NP", 13500, PLN, "NK38!E93"),
    ("c_mal_bar", "Malowanie barierki na stronę", 200, PLN, "NK38!E94"),
    ("c_slupek", "Słupek e-ładowarki do 3,7 kW / MP", 1700, PLN, "NK38!E97, KAL!O55"),
    ("c_slupek22", "Słupek e-ładowarki do 22 kW / MP", 6300, PLN, "NK38!E98"),
    ("c_slupek_rbd", "Robocizna słupka (roboczodni / MP)", 0.37, NUM, "KAL!B49"),
    ("Montaż - pracochłonność", None),
    ("c_osd_S", "Osobodni montażu / system S", 5.5, NUM, "KAL!F16"),
    ("c_osd_D", "Osobodni montażu / system D", 7, NUM, "KAL!F16"),
    ("c_osd_NP", "Osobodni montażu / system NP", 7, NUM, "KAL!F17"),
    ("c_osd_magistrala", "Osobodni / magistrala 6 m (\"tonaż\")", 0.5, NUM, "KAL!B48"),
    ("c_osd_barierka", "Osobodni / barierka lub maskownica (\"tonaż\")", 0.5, NUM, "KAL!B48"),
    ("c_rozl_TIR", "Dni rozładunku / TIR", 0.5, NUM, "KAL!E55 (komentarz)"),
    ("c_dzwig", "Spider Crane / dzień", 2400, PLN, "KAL!I25"),
    ("c_dzwig_alt", "Spider Crane / dzień - wariant minimalny", 2000, PLN, "KAL!M25"),
    ("c_dzwig_D", "Systemów D na 1 dzień dźwigu", 5, NUM, "KAL!J25"),
    ("c_dzwig_wspS", "Współczynnik S względem D (dźwig)", 0.6, NUM, "KAL!J25"),
    ("c_dni_tydzien", "Dni montażu w tygodniu (wyjazd = tydzień)", 5, NUM, "B55 = J39/5"),
    ("Montaż - koszty ekipy", None),
    ("c_dieta", "Dieta dzienna (za granicą 49 €)", 45, PLN, "KAL!J57"),
    ("c_hotel", "Hotel / doba / osoba", 130, PLN, "KAL!J58"),
    ("c_spalanie", "Spalanie auta ekipy l/100 km", 12, NUM, "KAL!I19"),
    ("c_paliwo", "Cena paliwa zł/l", 9.4, PLN2, "KAL!I19"),
    ("c_pomiary_osoby", "Pomiary - liczba osób (1 wyjazd)", 1, NUM, "KAL!F53"),
    ("c_odbiory_osoby", "Odbiory - liczba osób (1 wyjazd)", 2, NUM, "KAL!F58"),
    ("Narzuty", None),
    ("c_kob", "KOB (udział w cenie)", 0.005, PCT, "KAL!J35"),
    ("c_gdw", "GDW (udział w cenie)", 0.025, PCT, "KAL!J36"),
    ("c_podatek", "Podatek od robocizny, diet, GDW i zysku", 0.14, PCT, "KAL!J37"),
    ("Serwis (informacyjnie)", None),
    ("c_konserw", "Konserwacja zł / MP / miesiąc (wariant 1)", 40, PLN, "KAL!I45"),
    ("c_konserw2", "Konserwacja zł / MP / miesiąc (wariant 2)", 45, PLN, "KAL!L45"),
    ("c_konserw3", "Konserwacja zł / MP / miesiąc (wariant 3)", 50, PLN, "KAL!N45"),
]
r = 5
for item in CENNIK:
    if item[1] is None:
        section(cen, r, item[0])
        r += 1
        continue
    n, label, val, fmt, src = item
    cen.cell(row=r, column=2, value=label)
    c = cen.cell(row=r, column=3, value=val)
    c.number_format = fmt
    c.fill = FILL_IN
    c.border = BOX
    cen.cell(row=r, column=5, value=src).font = Font(color="7F7F7F", size=9)
    name(n, cen, f"C{r}")
    r += 1

# --- tabela zagłębień
r += 1
section(cen, r, "Zagłębienia (standard 170 cm - bez dopłaty, siłownik 1700)")
r += 1
for i, h in enumerate(("Zagłębienie [cm]", "Dopłata", "Siłownik")):
    cen.cell(row=r, column=2 + i, value=h).font = F_BOLD
r += 1
g0 = r
for cm, dop, sil in GLEBOKOSCI:
    cen.cell(row=r, column=2, value=cm)
    cen.cell(row=r, column=3, value=dop).number_format = PLN
    cen.cell(row=r, column=4, value=sil)
    for c in (3, 4):
        cen.cell(row=r, column=c).fill = FILL_IN
    r += 1
name_range("t_gl_doplata", cen, f"C{g0}:C{r - 1}")
name_range("t_gl_silownik", cen, f"D{g0}:D{r - 1}")

# --- składowe platformy
r += 1
section(cen, r, "Składowe platformy (na 1 platformę; N.P. liczone jak S)", 5)
r += 1
for i, h in enumerate(("Pozycja", "Cena jedn.", "Ilość na S", "Ilość na D", "Grupa")):
    cen.cell(row=r, column=2 + i, value=h).font = F_BOLD
r += 1
SKLADOWE = [
    ("Łańcuch 20B-1 (mb)", 45, 9.6, 9.6, "Mechanika"),
    ("Ogniwo złączne proste 20B-1", 8, 4, 4, "Mechanika"),
    ("Koło łańcuchowe z piastą 20B-1 Z10", 36, 2, 2, "Mechanika"),
    ("Koło łańcuchowe z piastą 20B-1 Z16", 90, 2, 2, "Mechanika"),
    ("Listwa zębata M4", 207.28, 2, 2, "Mechanika"),
    ("Koło zębate z piastą M4 Z20", 40.14, 2, 2, "Mechanika"),
    ("Tuleja PAF40x260P10", 3.3, 2, 2, "Mechanika"),
    ("Tuleja PAF 5025 P10", 10.8, 2, 2, "Mechanika"),
    ("Tuleja TBR40x44x50", 10.95, 2, 2, "Mechanika"),
    ("Podkładka PTFE 50,5x69x2", 3.81, 2, 2, "Mechanika"),
    ("Podkładka PTFE 42x66x1,5", 2.84, 4, 4, "Mechanika"),
    ("Tuleja PAF40x400P10", 4.4, 4, 4, "Mechanika"),
    ("Podkładki gumowe pod stopę siłownika i słup (kpl)", "=2*25.71+2*22.85", 1, 1, "Mechanika"),
    ("Śruby i elementy złączne - kpl S", 345, 1, 0, "Mechanika"),
    ("Śruby i elementy złączne - kpl D", 546, 0, 1, "Mechanika"),
    ("Tulejki podłogi", 2.98, 110, 208, "Mechanika"),
    ("Kotwa M16 + ampułka", "=3.09+4.99", 20, 20, "Mechanika"),
    ("Podkładki gumowe pod kotwy (kpl)", 5.4, 1, 1, "Mechanika"),
    ("Transport materiałów (bez MTZ)", 300, 1, 1, "Mechanika"),
    ("Ogranicznik koła", 40, 1, 1, "Mechanika"),
    ("Rurki gotowe na platformie - S", 172, 1, 0, "Hydraulika"),
    ("Rurki gotowe na platformie - D", 207, 0, 1, "Hydraulika"),
    ("Elementy złączne Argo Hytos + magistrala 5 mb + wąż", "=120+55+65", 1, 1, "Hydraulika"),
    ("Elektryka - skrzynka krosowa", "=50+40", 1, 1, "Elektryka"),
    ("Elektryka - przewody + rurki S", "=14+9+25+5+9+30", 1, 0, "Elektryka"),
    ("Elektryka - przewody + rurki D", "=14+18+25+7+18+30", 0, 1, "Elektryka"),
    ("Elektryka - sterownia (puszka+stac+przyc+notaus+szyld)", "=70+14+34+32+20", 1, 1, "Elektryka"),
]
s0 = r
for poz, cena, ils, ild, grp in SKLADOWE:
    for i, v in enumerate((poz, cena, ils, ild, grp)):
        c = cen.cell(row=r, column=2 + i, value=v)
        if i in (1, 2, 3):
            c.fill = FILL_IN
    cen.cell(row=r, column=3).number_format = PLN2
    r += 1
name_range("t_sk_cena", cen, f"C{s0}:C{r - 1}")
name_range("t_sk_S", cen, f"D{s0}:D{r - 1}")
name_range("t_sk_D", cen, f"E{s0}:E{r - 1}")
name_range("t_sk_grupa", cen, f"F{s0}:F{r - 1}")
cen.column_dimensions["F"].width = 12

r += 1
section(cen, r, "Podpowiedź: transport TIR z Krakowa (komentarz z KAL!I21)")
for i, (miasto, cena) in enumerate((("Kraków", 1600), ("Warszawa / Wrocław", 3300),
                                    ("Poznań / Zielona Góra", 4500))):
    cen.cell(row=r + 1 + i, column=2, value=miasto)
    cen.cell(row=r + 1 + i, column=3, value=cena).number_format = PLN

# =============================================================== DANE
dane = wb.create_sheet("Dane", 0)
header(dane, "KALKULATOR NK38 - DANE WEJŚCIOWE", 4)
dane["B3"] = "Wypełniasz tylko żółte pola. Puste pole = 0. Wynik: arkusz Podsumowanie."
dane["B3"].font = Font(italic=True, color="7F7F7F")
for col, w in zip("ABCDE", (2, 46, 16, 16, 48)):
    dane.column_dimensions[col].width = w

dv_lok = DataValidation(type="list", formula1='"Kraków,Poza Krakowem"', allow_blank=False)
dv_typ = DataValidation(type="list", formula1='"NK38,NK37"', allow_blank=False)
dv_int = DataValidation(type="whole", operator="greaterThanOrEqual", formula1="0")
for dv in (dv_lok, dv_typ, dv_int):
    dane.add_data_validation(dv)


def inp(row, n, label, val=None, fmt=None, note=None, dv=None, col=3):
    dane.cell(row=row, column=2, value=label)
    c = dane.cell(row=row, column=col, value=val)
    c.fill = FILL_IN
    c.border = BOX
    if fmt:
        c.number_format = fmt
    if note:
        dane.cell(row=row, column=5, value=note).font = Font(color="7F7F7F", size=9)
    if dv:
        dv.add(c)
    if n:
        name(n, dane, f"{get_column_letter(col)}{row}")
    return c


r = 5
section(dane, r, "1. Inwestycja"); r += 1
inp(r, "in_nazwa", "Nazwa / adres inwestycji", "ul. ..."); r += 1
inp(r, "in_data", "Data oferty", None, "yyyy-mm-dd"); r += 1
inp(r, "in_nr", "Nr oferty / handlowiec", "SNK"); r += 1
inp(r, "in_opis", "Opis / wariant (H, L, P, Hpoj ...)", ""); r += 1
r += 1
section(dane, r, "2. Lokalizacja"); r += 1
inp(r, "in_lok", "Lokalizacja", "Poza Krakowem", None,
    "Kraków: montaż liczony w dniach, bez hotelu i diet", dv_lok); r += 1
inp(r, "in_km", "Odległość montażu od Krakowa [km, w jedną stronę]", 0, NUM); r += 1
inp(r, "in_km_pom", "Odległość pomiary / odbiory [km] (puste = jak wyżej)", None, NUM,
    "W pliku WAW: pomiary 280 km, montaż 330 km"); r += 1
r += 1
section(dane, r, "3. Urządzenia"); r += 1
inp(r, "in_typ", "Typ urządzenia", "NK38", None, None, dv_typ); r += 1
inp(r, "in_S", "Platformy pojedyncze S (2 MP)", 0, "0", None, dv_int); r += 1
inp(r, "in_D", "Platformy podwójne D (4 MP)", 0, "0", None, dv_int); r += 1
inp(r, "in_NP", "Systemy dla N.P. (2 MP)", 0, "0", None, dv_int); r += 1
inp(r, "in_agregaty", "Agregaty", 0, "0", "1 agregat do 6 platform", dv_int); r += 1
r_agr = r - 1
inp(r, "in_magistrala", "Magistrala EXTRA [odcinki 6 m]", 0, "0", None, dv_int); r += 1
inp(r, "in_barierki", "Barierki [szt. na stronę]", 0, "0", None, dv_int); r += 1
inp(r, "in_maskownice", "Maskownice / bariery tylne", 0, "0", None, dv_int); r += 1
r += 1
section(dane, r, "4. Wymiary niestandardowe (ile platform danego typu)"); r += 1
dane.cell(row=r, column=3, value="S").font = F_BOLD
dane.cell(row=r, column=4, value="D").font = F_BOLD
dane.cell(row=r, column=5, value="Pozostałe platformy = wymiar standardowy").font = Font(color="7F7F7F", size=9)
r += 1
gl_first = r
for cm, _, _ in GLEBOKOSCI:
    inp(r, None, f"Zagłębienie {cm} cm", 0, "0", None, dv_int, col=3)
    inp(r, None, f"Zagłębienie {cm} cm", 0, "0", None, dv_int, col=4)
    r += 1
name_range("in_gl_S", dane, f"C{gl_first}:C{r - 1}")
name_range("in_gl_D", dane, f"D{gl_first}:D{r - 1}")
dane.cell(row=r, column=2, value="Zagłębienie 170 cm (standard) - wyliczone")
for col, rng, tot in ((3, "in_gl_S", "in_S"), (4, "in_gl_D", "in_D")):
    c = dane.cell(row=r, column=col, value=f"={tot}-SUM({rng})")
    c.fill = FILL_CALC
r_gl_std = r
r += 1
for label, ns, nd in (("Szerokość 260 (S) / 520 (D)", "in_szer1_S", "in_szer1_D"),
                      ("Szerokość 270 (S) / 540 (D)", "in_szer2_S", "in_szer2_D"),
                      ("Długość zagłębienia 500-510 cm", "in_dl500_S", "in_dl500_D"),
                      ("Długość zagłębienia 540 cm", "in_dl540_S", "in_dl540_D"),
                      ("Długość zagłębienia 550 cm", "in_dl550_S", "in_dl550_D")):
    inp(r, ns, label, 0, "0", None, dv_int, col=3)
    inp(r, nd, label, 0, "0", None, dv_int, col=4)
    r += 1
r += 1
section(dane, r, "5. Transport i ekipa"); r += 1
inp(r, "in_tir", "Liczba transportów (TIR)", 0, "0", None, dv_int); r += 1
inp(r, "in_tir_cena", "Cena transportu / TIR", 0, PLN, "Podpowiedź w Cenniku: KRK 1600, WAW/WRO 3300, POZ/ZG 4500"); r += 1
inp(r, "in_rozl_cena", "Rozładunek - sprzęt / TIR", 1700, PLN, "WAW 1700, KRK 500"); r += 1
inp(r, "in_rozl_dni", "Dni rozładunku (puste = 0,5 / TIR)", None, NUM); r += 1
inp(r, "in_wyjazdy", "Tygodnie (lub dni w Krakowie) montażu - ręcznie", None, "0",
    "Puste = wyliczane automatycznie (dawne B55)"); r += 1
dane.cell(row=r, column=2, value="Stawki dzienne monterów (puste = brak osoby)").font = F_BOLD
r += 1
st0 = r
for i, v in enumerate((500, 400, 350, 350, None, None, None), 1):
    inp(r, None, f"Monter {i}", v, PLN, "Ceny dla Ukraińców" if i == 1 else None)
    r += 1
name_range("in_stawki", dane, f"C{st0}:C{r - 1}")
r += 1
section(dane, r, "6. Narzuty i kurs"); r += 1
inp(r, "in_zysk", "Zysk (udział w cenie)", 0.125, PCT); r += 1
inp(r, "in_zysk_min", "Zysk - wariant minimalny (dawny 'rabat nadzw.')", 0.10, PCT); r += 1
inp(r, "in_q2500", "Dopłata za Q=2500 kg", "=c_q2500", PCT, "WAW 6%, KRK 7%"); r += 1
inp(r, "in_eur", "Kurs EUR/PLN", 4.325, "0.0000"); r += 1

# ostrzeżenia
r += 1
section(dane, r, "Kontrola danych"); r += 1
r_warn = r
WARN = [
    (f"=IF(OR(C{r_gl_std}<0,D{r_gl_std}<0),\"BŁĄD: więcej zagłębień niż platform\",\"ok\")"),
    ("=IF(in_szer1_S+in_szer2_S>in_S,\"BŁĄD: więcej szerokości S niż platform S\","
     "IF(in_szer1_D+in_szer2_D>in_D,\"BŁĄD: więcej szerokości D niż platform D\",\"ok\"))"),
    ("=IF(in_dl500_S+in_dl540_S+in_dl550_S>in_S,\"BŁĄD: więcej długości S niż platform S\","
     "IF(in_dl500_D+in_dl540_D+in_dl550_D>in_D,\"BŁĄD: więcej długości D niż platform D\",\"ok\"))"),
    ("=IF(in_agregaty*6<in_S+in_D+in_NP,\"UWAGA: mniej niż 1 agregat na 6 platform\",\"ok\")"),
    ("=IF(MAX(in_km,Obl!C_kmpom)>=800,\"UWAGA: >=800 km - formuła czasu podróży nie uwzględnia liczby wyjazdów\",\"ok\")"),
    ("=IF(in_tir=0,\"UWAGA: brak transportów\",\"ok\")"),
]
for f in WARN:
    dane.cell(row=r, column=2, value=f)
    dane.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
    r += 1
dane.conditional_formatting.add(f"B{r_warn}:B{r - 1}",
                                FormulaRule(formula=[f'B{r_warn}<>"ok"'], fill=FILL_WARN))

# =============================================================== OBLICZENIA
obl = wb.create_sheet("Obliczenia")
header(obl, "OBLICZENIA (nie edytować)", 6)
for col, w in zip("ABCDEFG", (2, 50, 16, 16, 16, 16, 16)):
    obl.column_dimensions[col].width = w

r = 4
section(obl, r, "A. Materiały i urządzenia (dawny arkusz 'NK38 ...')", 2); r += 1
MAT = [
    ("m_cena_D", "Cena platformy D", "=c_cena_D+IF(in_typ=\"NK37\",c_doplata_NK37,0)", PLN),
    ("m_cena_S", "Cena platformy S", "=c_wsp_S*m_cena_D", PLN),
    ("m_cena_NP", "Cena systemu N.P.", "=c_wsp_NP*m_cena_D", PLN),
    ("m_SN", "Platformy S + N.P. (do składowych)", "=in_S+in_NP", "0"),
    ("m_platformy", "Razem platform", "=in_S+in_D+in_NP", "0"),
    ("m_MP", "Miejsca postojowe", "=2*in_S+2*in_NP+4*in_D", "0"),
    ("m_plat_S", "Platformy S z dopłatami",
     "=m_cena_S*in_S+c_szer_260*in_szer1_S+c_szer_270*in_szer2_S"
     "+SUMPRODUCT(in_gl_S,t_gl_doplata)+c_dl_500*in_dl500_S"
     "+CEILING(m_cena_S*c_dl_wsp*10,100)*in_dl540_S+CEILING(m_cena_S*c_dl_wsp*20,100)*in_dl550_S", PLN),
    ("m_plat_D", "Platformy D z dopłatami",
     "=m_cena_D*in_D+c_szer_520*in_szer1_D+c_szer_540*in_szer2_D"
     "+SUMPRODUCT(in_gl_D,t_gl_doplata)+c_dl_500*in_dl500_D"
     "+m_cena_D*c_dl_wsp*10*in_dl540_D+m_cena_D*c_dl_wsp*20*in_dl550_D", PLN),
    ("m_plat_NP", "Platformy N.P.", "=m_cena_NP*in_NP", PLN),
    ("m_sil_2000", "Siłowniki 2000 [szt. par]", "=SUMPRODUCT((t_gl_silownik=2000)*(in_gl_S+in_gl_D))", "0"),
    ("m_sil_2250", "Siłowniki 2250 [szt. par]", "=SUMPRODUCT((t_gl_silownik=2250)*(in_gl_S+in_gl_D))", "0"),
    ("m_sil_std", "Siłowniki standard [szt. par] (N.P. pominięte jak w starym)", "=in_S+in_D-m_sil_2000-m_sil_2250", "0"),
    ("m_hydraulika", "Hydraulika",
     "=in_agregaty*(c_agregat+c_hydr_drobne+c_olej+c_transp_agregatu)+m_platformy*c_transp_silownikow"
     "+2*(c_sil_1700*m_sil_std+c_sil_2000*m_sil_2000+c_sil_2250*m_sil_2250)+in_magistrala*c_magistrala"
     "+SUMPRODUCT((t_sk_grupa=\"Hydraulika\")*t_sk_cena*(t_sk_S*m_SN+t_sk_D*in_D))", PLN),
    ("m_barierki", "Barierki i maskownice", "=in_barierki*c_barierka+in_maskownice*c_maskownica", PLN),
    ("m_elektryka", "Elektryka",
     "=in_agregaty*c_skrzynka_zasil+SUMPRODUCT((t_sk_grupa=\"Elektryka\")*t_sk_cena*(t_sk_S*m_SN+t_sk_D*in_D))", PLN),
    ("m_mechanika", "Mechanika zakupowa i pozostałe",
     "=in_agregaty*c_admin+SUMPRODUCT((t_sk_grupa=\"Mechanika\")*t_sk_cena*(t_sk_S*m_SN+t_sk_D*in_D))", PLN),
    ("m_suma_2000", "SUMA STANDARD Q=2000 (dawne F87)",
     "=m_plat_S+m_plat_D+m_plat_NP+m_hydraulika+m_barierki+m_elektryka+m_mechanika", PLN),
    ("m_suma_2500", "SUMA Q=2500 (dawne F90)", "=m_suma_2000*(1+in_q2500)", PLN),
    ("m_malowanie", "Opcja: malowanie proszkowe RAL (poza sumą)",
     "=c_mal_S*in_S+c_mal_D*(in_D+in_NP)+c_mal_bar*in_barierki", PLN),
    ("m_slupki22", "Opcja: słupki 22 kW (poza sumą)", "=c_slupek22*m_MP", PLN),
    ("m_tonaz", "\"Tonaż\" - dodatkowe osobodni (magistrala, barierki)",
     "=ROUNDUP(in_magistrala*c_osd_magistrala+(in_barierki+in_maskownice)*c_osd_barierka,0)", NUM),
]
for n, label, f, fmt in MAT:
    obl.cell(row=r, column=2, value=label)
    c = obl.cell(row=r, column=3, value=f)
    c.number_format = fmt
    c.fill = FILL_CALC
    name(n, obl, f"C{r}")
    if n.startswith("m_suma"):
        obl.cell(row=r, column=2).font = F_BOLD
        c.font = F_BOLD
    r += 1

r += 1
obl.cell(row=r, column=2, value="Odległość pomiary/odbiory [km]")
c = obl.cell(row=r, column=3, value="=IF(ISBLANK(in_km_pom),in_km,in_km_pom)")
c.fill = FILL_CALC
name("C_kmpom", obl, f"C{r}")
r += 1
obl.cell(row=r, column=2, value="Osoby na montażu")
c = obl.cell(row=r, column=3, value="=MAX(1,COUNTIF(in_stawki,\">0\"))")
c.fill = FILL_CALC
name("e_osoby", obl, f"C{r}")
r += 1
obl.cell(row=r, column=2, value="Średnia stawka dzienna")
c = obl.cell(row=r, column=3, value="=SUM(in_stawki)/e_osoby")
c.fill = FILL_CALC
c.number_format = PLN
name("e_stawka", obl, f"C{r}")
r += 1
obl.cell(row=r, column=2, value="Dni rozładunku")
c = obl.cell(row=r, column=3, value="=IF(ISBLANK(in_rozl_dni),c_rozl_TIR*in_tir,in_rozl_dni)")
c.fill = FILL_CALC
name("e_rozl_dni", obl, f"C{r}")
r += 1
obl.cell(row=r, column=2, value="Kraków?")
c = obl.cell(row=r, column=3, value="=in_lok=\"Kraków\"")
c.fill = FILL_CALC
name("e_krk", obl, f"C{r}")
r += 1
obl.cell(row=r, column=2, value="Czas podróży pomiary + odbiory [osobodni]")
TRAV = "IF({km}<800,(1+0.1*(800-{km})/100)*{km}*{n}/500,{km}/800)"
c = obl.cell(row=r, column=3, value="=(c_pomiary_osoby+c_odbiory_osoby)*" + TRAV.format(km="C_kmpom", n=1))
c.fill = FILL_CALC
name("e_podr_pom", obl, f"C{r}")
r += 2

# --- montaż: 4 warianty w kolumnach D:G
section(obl, r, "B. Montaż (dawny arkusz '<Inwestycja>-NK38') - warianty w kolumnach", 6); r += 1
VARIANTS = [("2000 kg", 0, 0), ("2500 kg", 1, 0), ("2000 kg + słupki", 0, 1), ("2500 kg + słupki", 1, 1)]
VC = ["D", "E", "F", "G"]
obl.cell(row=r, column=2, value="Wariant").font = F_BOLD
for col, (lab, _, _) in zip(VC, VARIANTS):
    obl[f"{col}{r}"] = lab
    obl[f"{col}{r}"].font = F_BOLD
    obl[f"{col}{r}"].alignment = Alignment(horizontal="center", wrap_text=True)
r += 1
rows = {}


def mrow(key, label, tmpl, fmt=PLN, bold=False):
    """tmpl: formuła z {c} = kolumna wariantu i {k} = numer wiersza klucza."""
    global r
    obl.cell(row=r, column=2, value=label)
    rows[key] = r
    for i, col in enumerate(VC):
        f = tmpl(col, i) if callable(tmpl) else tmpl
        if not isinstance(f, str):
            obl[f"{col}{r}"] = f
            obl[f"{col}{r}"].fill = FILL_CALC
            continue
        f = f.replace("{c}", col)
        for k, v in rows.items():
            f = f.replace("{" + k + "}", f"{col}{v}")
        c = obl[f"{col}{r}"]
        c.value = f
        c.number_format = fmt
        c.fill = FILL_CALC
        if bold:
            c.font = F_BOLD
    if bold:
        obl.cell(row=r, column=2).font = F_BOLD
    r += 1


mrow("q", "Q=2500? (1/0)", lambda c, i: VARIANTS[i][1], "0")
mrow("sl", "Słupki e-ładowarek? (1/0)", lambda c, i: VARIANTS[i][2], "0")
mrow("osd", "Osobodni montażu (dawne F50)",
     "=c_osd_S*in_S+c_osd_D*in_D+c_osd_NP*in_NP+m_tonaz+{sl}*c_slupek_rbd*m_MP", NUM)


def podr(trips_ref):
    return ("(e_podr_pom+e_osoby*(e_rozl_dni+" + TRAV.format(km="in_km", n=trips_ref) + "))")


prev = "1"
for it in range(1, 6):
    mrow(f"it{it}", f"Iteracja {it}: tygodnie / dni montażu",
         lambda c, i, p=prev: "=IF(e_krk,{d},CEILING({d}/c_dni_tydzien,1))".replace(
             "{d}", "CEILING(({osd}+" + podr(p if p == "1" else p) + ")/e_osoby,1)"), "0")
    prev = "{it%d}" % it
mrow("wyj", "Tygodnie (lub dni w Krakowie) montażu - przyjęte (dawne B55)",
     "=IF(ISBLANK(in_wyjazdy),{it5},in_wyjazdy)", "0", bold=True)
mrow("podr", "Osobodni podróży i rozładunku (dawne G59)", "=" + podr("{wyj}"), NUM)
mrow("osd_all", "Osobodni razem (montaż + podróże)", "={osd}+{podr}", NUM)
mrow("dni", "Dni kalendarzowe pracy ekipy (dawne J39)", "=CEILING({osd_all}/e_osoby,1)", "0", bold=True)
mrow("km", "Kilometry razem (auto ekipy)",
     "=2*(in_km*{wyj}+2*C_kmpom)", NUM)
# koszty
mrow("k_urz", "Urządzenia (materiały)", "=IF({q}=1,m_suma_2500,m_suma_2000)")
mrow("k_sl", "Słupki e-ładowarek", "={sl}*c_slupek*m_MP")
mrow("k_pal", "Paliwo", "={km}/100*ROUNDUP(c_spalanie*c_paliwo,0)")
mrow("k_hot", "Hotel", "=IF(e_krk,0,c_hotel*(CEILING({osd_all}/e_osoby,1)+1)*e_osoby)")
mrow("k_tr", "Transport TIR", "=in_tir_cena*in_tir")
mrow("dzw_dni", "Dni dźwigu", "=ROUNDUP(in_D/c_dzwig_D+(in_S+in_NP)*c_dzwig_wspS/c_dzwig_D,0)", "0")
mrow("k_dzw", "Spider Crane", "=c_dzwig*{dzw_dni}")
mrow("k_rs", "Rozładunek (sprzęt)", "=in_rozl_cena*in_tir")
mrow("k_rl", "Rozładunek (ludzie)", "=e_stawka*e_rozl_dni*e_osoby")
mrow("k_doj", "Dojazdy (ludzie)", "=e_stawka*({podr}-e_osoby*e_rozl_dni)")
mrow("k_mon", "Montaż", "=IF({wyj}>0,e_stawka*{osd},0)")
mrow("k_die", "Diety", "=IF(e_krk,0,c_dieta*{osd_all})")
mrow("baza", "Suma kosztów przed narzutami", "=SUM({k_urz}:{k_die})-{dzw_dni}", PLN, True)
mrow("brutto", "Podstawa narzutów", "={baza}/(1-(c_kob+c_gdw+in_zysk))")
mrow("k_kob", "KOB", "={brutto}*c_kob")
mrow("k_gdw", "GDW", "={brutto}*c_gdw")
mrow("k_zysk", "Zysk", "={brutto}*in_zysk")
mrow("k_pod", "Podatek", "=c_podatek*({k_rl}+{k_doj}+{k_mon}+{k_die}+{k_gdw}+{k_zysk})")
mrow("cena", "CENA KONTRAKTU NETTO (dawne K39)", "={baza}+{k_kob}+{k_gdw}+{k_zysk}+{k_pod}", PLN, True)
mrow("koszt", "Koszt rzeczywisty (dawne K43)", "={cena}-{k_zysk}")
mrow("cena_mp", "Cena za MP", "=IF(m_MP>0,{cena}/m_MP,0)")
mrow("cena_mp_eur", "Cena za MP [EUR]", "={cena_mp}/in_eur", EUR)
# wariant minimalny (dawna kolumna N - z poprawionym dźwigiem)
mrow("baza_min", "Wariant minimalny: koszty przed narzutami", "={baza}-{k_dzw}+c_dzwig_alt*{dzw_dni}")
mrow("brutto_min", "Wariant minimalny: podstawa narzutów", "={baza_min}/(1-(c_kob+c_gdw+in_zysk_min))")
mrow("cena_min", "CENA MINIMALNA (zysk minimalny, dźwig 2000)",
     "={brutto_min}*(1+c_podatek*(c_gdw+in_zysk_min))"
     "+c_podatek*({k_rl}+{k_doj}+{k_mon}+{k_die})", PLN, True)

# =============================================================== PODSUMOWANIE
pod = wb.create_sheet("Podsumowanie", 1)
header(pod, "PODSUMOWANIE OFERTY NK38", 5)
for col, w in zip("ABCDEFG", (2, 40, 18, 18, 18, 18, 2)):
    pod.column_dimensions[col].width = w
pod["B3"] = "=in_nazwa&\"   |   \"&IF(ISBLANK(in_data),\"\",TEXT(in_data,\"yyyy-mm-dd\"))&\"   |   \"&in_nr"
pod["B4"] = ("=in_typ&\" \"&IF(in_S>0,in_S&\"xS \",\"\")&IF(in_D>0,in_D&\"xD \",\"\")"
             "&IF(in_NP>0,in_NP&\"xNP \",\"\")&in_agregaty&\"xA  |  \"&m_MP&\" MP  |  \"&in_lok")
pod["B3"].font = F_BOLD
r = 6
pod.cell(row=r, column=2, value="Wariant").font = F_BOLD
PC = ["C", "D", "E", "F"]
for pc, (lab, _, _) in zip(PC, VARIANTS):
    pod[f"{pc}{r}"] = lab
    pod[f"{pc}{r}"].font = F_BOLD
    pod[f"{pc}{r}"].alignment = Alignment(horizontal="center")
    pod[f"{pc}{r}"].fill = FILL_SEC
pod.cell(row=r, column=2).fill = FILL_SEC
r += 1
SUM_ROWS = [
    ("CENA KONTRAKTU NETTO", "cena", PLN, True),
    ("Cena za miejsce postojowe", "cena_mp", PLN, False),
    ("Cena za MP [EUR]", "cena_mp_eur", EUR, False),
    ("Cena minimalna (zysk min., dźwig 2000)", "cena_min", PLN, False),
    ("Zysk", "k_zysk", PLN, False),
    ("Koszt rzeczywisty", "koszt", PLN, False),
    (None, None, None, None),
    ("Urządzenia (materiały)", "k_urz", PLN, False),
    ("Słupki e-ładowarek", "k_sl", PLN, False),
    ("Transport, dźwig, rozładunek", ("k_tr", "k_dzw", "k_rs"), PLN, False),
    ("Robocizna (montaż, rozładunek, dojazdy)", ("k_mon", "k_rl", "k_doj"), PLN, False),
    ("Hotel, diety, paliwo", ("k_hot", "k_die", "k_pal"), PLN, False),
    ("KOB + GDW + podatek", ("k_kob", "k_gdw", "k_pod"), PLN, False),
    (None, None, None, None),
    ("Dni pracy ekipy", "dni", "0", True),
    ("Tygodnie / dni montażu (wyjazdy)", "wyj", "0", False),
    ("Osobodni razem", "osd_all", NUM, False),
]
for label, key, fmt, bold in SUM_ROWS:
    if label is None:
        r += 1
        continue
    pod.cell(row=r, column=2, value=label)
    for pc, vc in zip(PC, VC):
        keys = key if isinstance(key, tuple) else (key,)
        f = "=" + "+".join(f"Obliczenia!{vc}{rows[k]}" for k in keys)
        c = pod[f"{pc}{r}"]
        c.value = f
        c.number_format = fmt
        c.border = BOX
        if bold:
            c.font = F_BOLD
            c.fill = FILL_RES
    if bold:
        pod.cell(row=r, column=2).font = F_BOLD
    r += 1
r += 1
section(pod, r, "Informacyjnie (poza ceną)", 5); r += 1
for label, f in (("Malowanie proszkowe RAL", "=m_malowanie"),
                 ("Słupki 22 kW zamiast 3,7 kW (cena słupków)", "=m_slupki22"),
                 ("Konserwacja roczna (40 / 45 / 50 zł/MP/mies.)",
                  "=TEXT(c_konserw*m_MP*12,\"#,##0\")&\" / \"&TEXT(c_konserw2*m_MP*12,\"#,##0\")&\" / \"&TEXT(c_konserw3*m_MP*12,\"#,##0\")&\" zł\""),
                 ("Przegląd półroczny (40 / 45 / 50 zł/MP/mies. x 6)",
                  "=TEXT(c_konserw*m_MP*6,\"#,##0\")&\" / \"&TEXT(c_konserw2*m_MP*6,\"#,##0\")&\" / \"&TEXT(c_konserw3*m_MP*6,\"#,##0\")&\" zł\"")):
    pod.cell(row=r, column=2, value=label)
    c = pod.cell(row=r, column=3, value=f)
    c.number_format = PLN
    r += 1
r += 1
pod.cell(row=r, column=2, value="Kontrola danych:").font = F_BOLD
pod.cell(row=r, column=3, value=f"=IF(COUNTIF(Dane!B{r_warn}:B{r_warn + len(WARN) - 1},\"ok\")={len(WARN)},\"wszystko ok\",\"sprawdź arkusz Dane\")")
pod.conditional_formatting.add(f"C{r}", FormulaRule(formula=[f'C{r}<>"wszystko ok"'], fill=FILL_WARN))

# poprawka odwołania w ostrzeżeniu (Obl!C_kmpom -> nazwa)
for row in dane.iter_rows():
    for c in row:
        if isinstance(c.value, str) and "Obl!C_kmpom" in c.value:
            c.value = c.value.replace("Obl!C_kmpom", "C_kmpom")

for ws in wb.worksheets:
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A4"
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0


# =============================================================== PRZYKŁADY
def przyklad(kind):
    def setn(n, v):
        sheet, cell = names[n].split("!")
        wb[sheet.strip("'")][cell.replace("$", "")] = v

    def set_gl(col, cm, v):
        idx = [g[0] for g in GLEBOKOSCI].index(cm)
        dane[f"{col}{gl_first + idx}"] = v

    if kind == "waw":
        for n, v in (("in_nazwa", "ul. Kasprowicza 18 Warszawa"), ("in_nr", "20261014-SNK"),
                     ("in_lok", "Poza Krakowem"), ("in_km", 330), ("in_km_pom", 280),
                     ("in_D", 15), ("in_agregaty", 3), ("in_magistrala", 4),
                     ("in_barierki", 30), ("in_maskownice", 5), ("in_tir", 3),
                     ("in_tir_cena", 4000), ("in_rozl_cena", 1700), ("in_zysk", 0.125),
                     ("in_q2500", 0.06)):
            setn(n, v)
        set_gl("D", 200, 15)
    elif kind == "krk":
        for n, v in (("in_nazwa", "ul. Dekerta Kraków"), ("in_nr", "20261015-SNK"),
                     ("in_lok", "Kraków"), ("in_km", 20), ("in_S", 12), ("in_D", 27),
                     ("in_agregaty", 7), ("in_magistrala", 32), ("in_barierki", 58),
                     ("in_maskownice", 4), ("in_tir", 6), ("in_tir_cena", 1800),
                     ("in_rozl_cena", 500), ("in_zysk", 0.13), ("in_zysk_min", 0.11),
                     ("in_q2500", 0.07)):
            setn(n, v)
        set_gl("C", 225, 12)
        set_gl("D", 225, 27)
        dane[f"C{st0 + 4}"] = 350


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "Kalkulator_NK38_v0.xlsx"
    if "--przyklad" in sys.argv:
        przyklad(sys.argv[sys.argv.index("--przyklad") + 1])
    wb.save(out)
    print("zapisano", out)
