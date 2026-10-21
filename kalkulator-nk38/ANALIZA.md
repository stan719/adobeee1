# Analiza kalkulatora NK38 – logika, błędy, propozycje, pytania

Przeanalizowane pliki:
- `20261014-INK-_NK38-Kasprowicza_18-Warszawa.xlsx`: arkusze **`NK38 15D+3A 14.10.26`** i **`Kapr WAW-NK38 3A 14.10.26`**
- `20261015-SNK-_Dekerta-Kraków.xlsx`: arkusz **`NK38 12S+27D+7A 15.10.26`** oraz trzy warianty arkusza montażu (**`Dekert KRK… 2t`**, **`Dek KRK… 2,5t`**, **`D KRK… 2t słupk`**)

Dalej w tekście:
- **arkusz MAT** to arkusz „NK38 …”, czyli materiały i urządzenia (wynik w F87),
- **arkusz KAL** to arkusz „<Inwestycja>-NK38”, czyli montaż, koszty i cena kontraktu (wynik w K39).

> **Weryfikacja zrozumienia:** całą logikę obu arkuszy odtworzyłem w Pythonie (`model_nk38.py`) i w nowym Excelu (prototyp v0, teraz `Kalkulator_NK38_v1.xlsx`). Oba dają **dokładnie te same kwoty co Wasze pliki** we wszystkich 4 wariantach (WAW 951 980,82 zł; KRK 2t 2 067 288,64 zł; KRK 2,5t 2 196 465,19 zł; KRK ze słupkami 2 368 495,81 zł). To znaczy, że poniższy opis logiki jest kompletny.

---

## 1. Przepływ danych

```
 ARKUSZ MAT ("NK38 …")                              ARKUSZ KAL ("<Inw>-NK38")
 ─────────────────────                              ─────────────────────────
 wpisujesz: S, D, NP, zagłębienia,                  wpisujesz: B16/C16 (S/D) – drugi raz!,
 szerokości, długości, agregaty (D53),              E16 agregaty – drugi raz!, transporty (I21/J21),
 magistrala (D62), barierki (D66),                  km (C53, C55), B55 tygodnie/dni (ręcznie,
 maskownice (D67), dopłata 2,5t (D90)               przepisane z J39), rozład. E55, ekipa I47:I53,
                                                    dieta/hotel (w Krakowie ręcznie na 0), zysk J38
 F87 (Q=2000) / F90 (Q=2500) ─────────────► I7 (cena urządzeń)
 D62, D66, D67 ───────────────────────────► B48 („tonaż”) = ⌈magistrala/2 + (barierki+maskownice)/2⌉
                                                    │
                                                    ▼
                                             K39 = CENA KONTRAKTU, J39 = czas montażu
```

## 2. Arkusz MAT: jak liczy

| Blok | Logika |
|---|---|
| Cena bazowa | D = **32 500 zł** (+700 zł dla NK37, wybór w D1). S = **61%** ceny D (F3). N.P. = **85%** ceny D. |
| Dopłaty wymiarowe | szerokość (S: 260/270 → 1170/1560; D: 520/540 → 1820/3110), zagłębienie 175…225 (0…850 zł), długość 500-510 (2340 zł), 540/550 (+10/+20 cm × 0,127% ceny platformy). Wpisuje się **ile platform** ma dany wymiar, a reszta jest standardowa. |
| Hydraulika | agregat (6500 + olej 1500 + drobne 200) × liczba agregatów; transport 500/agregat + 50/platformę; rurki (S 172, D 207) + złączki 240 / platformę; **siłowniki: 2 na platformę**, typ zależy od zagłębienia (std 1080 / do 2000: 1175 / do 2250: 1250); magistrala 190,6 zł / 6 m. |
| Barierki | 600 zł/stronę, maskownica 700 zł (Metazet 538 / 608). |
| Elektryka | 1000 zł/agregat + skrzynka krosowa 90 + przewody (S 92 / D 112) + sterownia 170 / platformę. |
| Mechanika | łańcuchy i koła 716 zł, listwy i koła zębate 494,84 zł, tulejki, śruby, kotwy itp. (S ≈ 1024, D ≈ 1517 zł), transport materiałów 300, ogranicznik 40 / platformę, administracja 1800 zł / agregat. |
| **F87** | suma powyższych (**bez** malowania i słupków). |
| F90 | F87 × (1 + 6% lub 7%) dla Q = 2500 kg. |
| Niepodpięte | malowanie RAL (F95), słupki 3,7 kW (F97), słupki 22 kW (F98). Liczą się, ale nigdzie dalej nie trafiają. |

## 3. Arkusz KAL: jak liczy

**Pracochłonność (osobodni):**
- montaż `F50` = 5,5 × S + 7 × D (+7 × NP) + „tonaż” B48 (+0,37 × MP za słupki, tylko gdy formuła F49 wskazuje B49),
- podróże `G59` = Σ osoby × (dni rozładunku + czas podróży), liczone dla trzech wyjazdów: pomiary (1 os.), montaż (B55 wyjazdów × liczba monterów), odbiory (2 os.),
- czas podróży `D53:D58` = `IF(km<800; (1+0,1·(800−km)/100)·km·wyjazdy/500; km/800)`.

**Czas montażu `J39`** = ⌈(F50 + G59) / liczba monterów⌉ dni. Drugi człon („+06”) to ⌈dni/10⌉+1 (znaczenie: pytanie 1). Wynik jest **tekstem** („043+06 dni”), więc nie da się go użyć w dalszych formułach. Dlatego B55 przepisujecie ręcznie: dni/5 → tygodnie, a w Krakowie dni.

**Koszty (kolumna K):**

| Pozycja | Formuła |
|---|---|
| Urządzenia | I7 = F87 lub F90 z arkusza MAT |
| Słupki | 1700 zł × MP, włączane przez J18 = 1 |
| Paliwo | 2 × Σ km × 113 zł / 100 km (12 l × 9,40 zł) |
| Hotel | 130 zł × (dni + 1) × osoby |
| Transport | cena × liczba TIR |
| Dźwig | 2400 zł × ⌈D/5 + 0,6·S/5⌉ dni |
| Rozładunek – sprzęt | cena × liczba TIR |
| Rozładunek, dojazdy, montaż (ludzie) | średnia stawka dzienna (Σ stawek / liczba osób) × osobodni |
| Diety | 45 zł × (F50 + G59) |
| KOB 0,5%, GDW 2,5%, Zysk 12,5–13% | liczone **od ceny końcowej**: Σkosztów / (1 − ΣKOB,GDW,zysk) × % |
| Podatek | 14% × (robocizna + diety + GDW + zysk) |
| **K39** | suma wszystkiego |

Kolumna N („rabat nadzwyczajny”) to drugi, minimalny wariant ceny z zyskiem 10–11% i dźwigiem za 2000 zł.

---

## 4. Znalezione błędy

| # | Gdzie | Problem | Wpływ |
|---|---|---|---|
| **B1** | KAL `D53:D58` | Dla odległości **≥ 800 km** czas podróży = km/800 i **pomija liczbę wyjazdów** (B). Do tego jest skok: przy 799 km pierwsza gałąź daje 1,6 dnia na wyjazd, przy 800 km już 1,0. | Dla danych z WAW cena przy **799 km = 985 053 zł, a przy 800 km = 943 057 zł (−42 000 zł)**. Dotyczy montaży zagranicznych. |
| **B2** | KAL `N25`, `N41`, `N39` | W wierszu dźwigu kolumny są przesunięte: M25 = cena (2000), N25 = **liczba dni (3)**, O25 = koszt. Suma N39 dodaje więc **3 zł zamiast 6000 zł**. | Cena w wariancie „rabat nadzw.” jest zaniżona o koszt dźwigu z narzutem (WAW: **~7 000 zł**, KRK: ~16 000 zł). Przy okazji L25/O25 pokazują koszt zamiast udziału %. |
| **B3** | KAL `F49` | Robocizna słupków (0,37 × MP) jest liczona w B49, ale F49 = **C49** (puste). Wchodzi do ceny tylko wtedy, gdy ktoś ręcznie zmieni formułę na `=B49` (tak jest w arkuszu „słupk”). Przełącznik J18 (koszt słupków) i F49 (robocizna) to dwa osobne miejsca. | Łatwo włączyć słupki bez robocizny (KRK: **48,8 osobodnia ≈ 34 000 zł** z narzutami). |
| **B4** | KAL `J20, J30, J32, J33, J39` | Odwołują się do **D65, które jest puste** (pozostałość po starej wersji). | Brak wpływu dziś, ale to pułapka przy kopiowaniu i wstawianiu wierszy. |
| **B5** | KAL `I8` | `=F4*J59`, a F4 jest puste. | Brak wpływu (dotyczy S02, nie NK38). |
| **B6** | KAL `K45` (KRK) | `=J45/J68/K39` daje **#DIV/0!**. | Kosmetyka. |
| **B7** | MAT `D59` | Liczba siłowników standardowych = S + D − zagłębienia. **Systemy N.P. nie dostają siłowników**, a nie wiadomo, czy to zamierzone (pytanie 9). | Jeśli N.P. ma siłowniki, brakuje 2 × 1080 zł na system. |
| **B8** | MAT `D59` | Brak kontroli: gdy ktoś wpisze więcej zagłębień niż platform, liczba siłowników std wychodzi **ujemna** i obniża cenę. To samo dotyczy szerokości i długości. | Ryzyko przy wypełnianiu. |
| **B9** | MAT `E22/E23` vs `E48/E49` | Dopłata za długość dla S jest **zaokrąglana do 100 zł**, dla D **nie** (412,75 zł). | Kosmetyka / niespójność. |
| **B10** | KAL `J19`, `J39` | Wyniki sklejane z tekstem przez `REPLACE` („7060 km”, „043+06 dni”). Przy kilometrach 6-cyfrowych REPLACE nadpisze cyfrę, a liczby nie da się użyć dalej. | To główny powód ręcznego przepisywania B55. |

## 5. Co się powtarza / co jest zbędne

1. **Te same dane wpisywane dwa razy:** liczba S/D (MAT D6/D32 → KAL B16/C16) i agregaty (MAT D53 → KAL E16). Jeśli się rozjadą, cena urządzeń i robocizna liczą się dla innych ilości.
2. **Warianty przez kopiowanie całych arkuszy.** W pliku KRK trzy arkusze KAL różnią się 1–3 komórkami (I7 → F87/F90, J18, F49, B55). Każda zmiana parametru wymaga poprawek w 3 miejscach.
3. **Kopiowanie całego skoroszytu na każdą inwestycję.** 40 arkuszy, z czego 28 ukrytych, 1,6 MB, inne produkty (PXL, NK6501, N4602, Quadro, Parkline…). Ceny są „zamrożone” w każdej kopii, więc zmiana cennika wymaga edycji każdego pliku. Wersje to v.20161221 / v.20250325 / V.20251215.MS.
4. **Ok. 40 z 45 wierszy wejściowych arkusza KAL dotyczy innych produktów** (PAXL, NK40, NK36, NK37, S02/S12/S13 seg., NK6401, NK6501, N-TT450). Dla NK38 liczą się tylko wiersz 16 (i 17 dla NP).
5. **Stałe zaszyte w formułach:** 5,5 / 7 osobodnia, 1700 zł/MP, 0,37 rbd, 12 × 9,4, 0,5 dnia/TIR (tylko w komentarzu), 4100 × kurs, 2 siłowniki, 1,19 itd. Nie ma jednego cennika.
6. **Słupki w dwóch miejscach:** MAT F97 (1700 × MP) i KAL O55 (1700 × MP).
7. **Kolumny K i N** robią prawie to samo dla dwóch poziomów zysku, z osobnymi formułami (stąd błąd B2).
8. **Pozycje ręczne, które da się policzyć:**
   - B55 (z J39),
   - E55 (0,5 × TIR, jest w komentarzu),
   - zerowanie hotelu i diet w Krakowie (J57/J58),
   - cena transportu (w komentarzu: KRK 1600, WAW/WRO 3300, POZ/ZG 4500, a w plikach 1800 i 4000).

## 6. Propozycje zmian

**Struktura (zrobione w prototypie v0):**
1. **Jeden arkusz `Dane`**: wszystkie pola do wpisania (żółte), każda wartość wpisywana **raz**. Listy rozwijane (Kraków / poza, NK38 / NK37) i walidacja liczb całkowitych.
2. **`Cennik`**: wszystkie ceny i współczynniki w jednym miejscu, z opisem skąd pochodzą. Zmiana ceny działa wszędzie.
3. **`Obliczenia`**: materiały i montaż, z **czterema wariantami w kolumnach** (2000 kg / 2500 kg / z słupkami / bez) zamiast kopii arkuszy. Formuły używają nazw (`=c_agregat*in_agregaty`), a nie adresów, więc są czytelne.
4. **`Podsumowanie`**: cena, cena/MP (zł i €), cena minimalna, zysk, struktura kosztów, czas montażu, a informacyjnie malowanie, słupki 22 kW i konserwacja.
5. **B55 liczone automatycznie** (iteracja 5 kroków, zbieżna po 2–4: daje dokładnie Wasze 9 / 69 / 79), z możliwością ręcznego nadpisania.
6. **Kraków = automatycznie** bez hotelu i diet, montaż w dniach.
7. **Kontrola danych**: ostrzeżenia o więcej zagłębień/szerokości/długości niż platform, za małej liczbie agregatów (< 1 na 6 platform), ≥ 800 km, braku transportu.
8. Błąd B2 poprawiony w „cenie minimalnej”, a B3 nie może wystąpić (słupki = jeden przełącznik na wariant).

**Do decyzji (po Waszych odpowiedziach):**
- poprawić wzór czasu podróży (B1),
- zaokrąglanie dopłat D (B9),
- siłowniki dla N.P. (B7),
- liczba transportów liczona z ilości platform / tonażu zamiast wpisywanej,
- cena transportu z tabeli miast albo z km,
- malowanie / słupki 22 kW jako opcje doliczane do ceny,
- ewentualnie wersja webowa (formularz w przeglądarce, PDF oferty), gdy logika się ustabilizuje,
- rozszerzenie na inne produkty (NK36/37/40, PXL…) w tym samym schemacie: osobny blok „Materiały” na typ i wspólny „Montaż”.

## 7. Decyzje z 19.10.2026 (wdrożone w v1)

| Temat | Decyzja | Jak jest w v1 |
|---|---|---|
| J39 „+06” | Pomijamy. | Usunięte. |
| Tygodnie montażu | Wyjazd co tydzień, 5 dni pracy; w Krakowie dni. | Liczone automatycznie, z możliwością nadpisania. |
| Odległości | Pomiary = faktyczna odległość od Krakowa, montaż = +50 km, Kraków = 20 / 20 km. | Wpisujesz jedną odległość; obie można nadpisać. |
| Osobodni S/D/NP | 5,5 / 7 / 7, aktualne, niezależne od wymiarów. | Bez zmian (Cennik). |
| „Tonaż” | To utrudnienia. | Nazwa „Utrudnienia”: auto z magistrali i barierek + pole na ręczny dodatek. |
| Ekipa | Pytanie „ile osób?”; stawki 500 / 400 / każda kolejna 350. | Pole „Osób na montażu” + **analiza 2–7 osób** (cena, tygodnie, hotel+diety), z zaznaczeniem najtańszej. |
| N.P. | Traktować jak D, mają siłowniki. | Siłowniki, składowe, dźwig i osobodni jak D; cena 85% D, 2 MP. |
| Długości, 175 cm, dopłaty | Przyjęte założenia. | Bez zmian. |
| Q=2500 | 7% z możliwością zmiany. | Domyślnie 7% (Cennik), pole do nadpisania. |
| Agregaty, transport, rozładunek | Ręcznie. | Ręcznie (z podpowiedziami). |
| Słupki, malowanie | Opcje doliczane do oferty. | Sekcja „Opcje do oferty”: słupki 3,7 kW, 22 kW, malowanie RAL, w cenie z narzutami. |
| Dźwig | ⌈D/5 + 0,6·S/5⌉. | Bez zmian (N.P. jak D). |
| Rabat nadzwyczajny | Wpisać inny zysk i sprawdzić, do ilu można zejść. | „Cena minimalna” przy zysku do sprawdzenia (dźwig 2000 zł, błąd B2 poprawiony). |
| Paliwo | 1 auto. | Bez zmian. |
| Forma | Aplikacja, z Excelem jako podkładką. | Aplikacja w przeglądarce + Excel v1, liczące identycznie. |
| Wynik | Podsumowanie wpisanych danych i wyników do napisania oferty. | Zakładka „Do oferty” (z kopiowaniem) i sekcja „Zestawienie do oferty” w Excelu. |

**Czas podróży – propozycja uproszczenia.** Stary wzór liczy podróż (tam i z powrotem) jako `(1 + 0,1·(800−km)/100)·km/500` dnia. Do ~400 km to prawie dokładnie 650–700 km dziennie, ale dalej „przyspiesza”: 700 km wychodzi jako 0,77 dnia w jedną stronę, czyli ~6 h jazdy. Proponuję **2 × km / 650 km dziennie**: dla WAW (330 km) cena rośnie tylko o ~1 000 zł (952 975 zamiast 951 981 zł), a dla dalekich tras wynik jest realistyczny. Domyślnie zostawiłem stary wzór (z poprawką ≥ 800 km, więc dla tras krajowych nic się nie zmienia). Uproszczony wybiera się z listy, a jeśli go zatwierdzisz, ustawię go jako domyślny.

**Uwagi do dalszego sprawdzenia** (są też w aplikacji i w Excelu):
1. Hotel = (dni pracy + 1) × osoby – czy „+1” to zapas, np. na przyjazd na odbiór.
2. Podatek 14% (efektywny) od robocizny, diet, GDW i zysku oraz stary współczynnik ×1,19 w „koszcie ludzkim”.
3. N.P. liczone jak D – do potwierdzenia przy pierwszej ofercie z N.P.
4. Wybór wzoru czasu podróży.

## 8. Co jest w katalogu

| Plik | Co to |
|---|---|
| **Aplikacja** – [claude.ai/artifact/Pmdre1hmYBDXhH8v7CqkWc](https://claude.ai/artifact/Pmdre1hmYBDXhH8v7CqkWc) | Kalkulator w przeglądarce (prywatny link). Źródła: `app/index.html` + `app/nk38-engine.js`. Wyceny i zmiany cennika zapisuje w przeglądarce, z eksportem/importem. |
| `Kalkulator_NK38_v1.xlsx` | Excel „podkładka” (pusty): Dane → Podsumowanie, Obliczenia, Cennik. |
| `Kalkulator_NK38_v1_przyklad_WAW.xlsx` / `_KRK.xlsx` | To samo z danymi z Waszych plików (wyniki 1:1 ze starym arkuszem). |
| `model_nk38.py` + `test_model_nk38.py` | Model obliczeń (źródło prawdy) i testy (`python3 -m pytest`). |
| `build_kalkulator.py`, `regen.sh` | Generator Excela; `./regen.sh` przebudowuje pliki. |
| `verify_excel.py` | Losowe zestawy danych: Excel (przeliczony LibreOffice) vs model. Wynik: 27 zestawów × 10 kolumn zgodnych. |
| `app/test_engine.py` | Losowe zestawy danych: silnik aplikacji (JS) vs model. Wynik: 302 zestawy zgodne. |

---

## 9. Pytania (runda 1 – odpowiedzi w sekcji 7)

**Czas montażu i ekipa**
1. **J39 „043+06 dni”**: co oznacza druga liczba (⌈dni/10⌉+1)? Liczba zjazdów, dni dodatkowe, coś innego? Czy jest gdzieś używana?
2. **B55 poza Krakowem = dni/5, w Krakowie = dni.** Czy to reguła zawsze (tydzień = 5 dni pracy, wyjazd co tydzień)? Czy bywają turnusy 2-tygodniowe lub inna liczba dni w tygodniu?
3. **Hotel = (dni + 1) × osoby noclegów.** Przy wyjazdach tygodniowych ekipa śpi zwykle 4 noce na 5 dni. Czy „+1” i liczenie hotelu za każdy dzień pracy są zamierzone (np. jako zapas)?
4. **Czas podróży**: skąd wzór `(1+0,1·(800−km)/100)·km/500` i co miało być dla ≥ 800 km (błąd B1)? Czy to czas w obie strony na wyjazd?
5. **Pomiary 280 km, montaż 330 km (WAW)**: dlaczego różne odległości? Czy wpisywać jedną odległość od Krakowa, czy zawsze dwie?
6. **Osobodni / system: S = 5,5, D = 7, NP = 7.** Czy zależą od zagłębienia, szerokości lub Q=2500? Czy są aktualne?
7. **„Tonaż” (B48)**: w pliku to formuła (½ dnia na magistralę i ½ na barierkę/maskownicę), a nie tonaż. Czy w innych ofertach wpisujecie tu coś ręcznie (utrudnienia, faktyczne tony)? Co ma oznaczać?
8. **Stawki ekipy** (500/400/350/350, „ceny dla Ukraińców”): czy skład ekipy jest stały (4 osoby poza Krakowem, 5 w Krakowie), czy dobierany do inwestycji?

**Materiały**
9. **Systemy N.P.**: czy mają siłowniki (obecnie 0, błąd B7)? Jak liczyć dźwig dla N.P. (przyjąłem jak S)? Czy N.P. występuje w ofertach?
10. **Dopłata za długość 540/550** to % ceny **całej** platformy (0,127%/cm), choć komentarz mówi o wadze stali Metazet. Czy to zamierzone? I czy krótsze 500-510 cm naprawdę kosztuje **więcej** (2340 zł)?
11. **Dopłata Q=2500 kg (6% WAW, 7% KRK)** naliczana jest od całego F87, razem z hydrauliką, elektryką i administracją. Czy tak ma być i od czego zależy 6 vs 7%?
12. **Agregaty**: czy liczbę agregatów można liczyć automatycznie (⌈platformy/6⌉, w plikach 5–5,6 platformy na agregat), czy zależy od układu garażu?
13. **Malowanie RAL i słupki 22 kW** liczą się w MAT, ale nie trafiają do ceny. Czy mają być opcjami doliczanymi w ofercie?
14. **Siłowniki**: zagłębienie 175 cm jest bez dopłaty, ale liczy siłownik „2000” (droższy od std). Czy tak ma być?

**Transport, koszty, narzuty**
15. **Transporty**: jak ustalacie liczbę TIR-ów (ile platform na TIR)? Czy cenę liczyć z tabeli miast (komentarz: 1600 / 3300 / 4500), z km, czy wpisywać (pliki: 1800 i 4000)?
16. **Rozładunek sprzętu**: 1700 zł/TIR w WAW, 500 zł w KRK. Od czego to zależy (wózek, HDS na miejscu)?
17. **Dźwig**: 1 dzień na 5 systemów D (komentarz w innym arkuszu mówi „1 dniówka / 24 platformy”). Który przelicznik jest aktualny? Czy w Krakowie też liczyć Spider Crane po 2400 zł?
18. **Podatek 14%** liczony jest od robocizny, diet, **GDW i zysku**. Co to za podatek (ZUS/PIT ekipy, CIT)? Czy baza jest poprawna? Do tego „Σ koszt ludzki” (K42) używa ×1,19. Który wskaźnik obowiązuje?
19. **Kolumna N („rabat nadzwyczajny”)**: czy potrzebujecie tego wariantu (zysk minimalny + tańszy dźwig)? Czy wystarczy pokazywać cenę dla 2 poziomów zysku?
20. **Paliwo 9,40 zł/l, 12 l/100 km, 1 auto na wyjazd**: czy przy 5 osobach to nadal 1 auto?

**Zakres i forma nowego kalkulatora**
21. **Dla kogo** jest nowy kalkulator: tylko dla Ciebie, czy dla handlowców (ukrywanie kosztów i marż, blokada cennika)?
22. **Forma**: zostajemy w Excelu (prototyp v0), czy docelowo aplikacja w przeglądarce, która generuje PDF oferty?
23. **Inne produkty**: czy nowy kalkulator ma od razu obejmować NK36/NK37/NK40, PXL, NK6501 itd. (są w arkuszu KAL), czy najpierw tylko NK38?
24. **Wynik**: czego potrzebujecie na końcu? Sama cena i cena/MP, czy też gotowy opis do oferty (np. tekst jak w I2/I3: „NK38 15xD500, 3xA6kW 2000kg”), harmonogram, wydruk?
25. **Kurs EUR i ceny Metazet**: jak często się zmieniają i kto aktualizuje cennik?

---

## 10. Zmiany 20.10.2026 (po pierwszym sprawdzeniu)

| Uwaga | Co zrobiłem |
|---|---|
| Przy zmianie liczby osób nie zmieniają się tygodnie, hotel i km | Model liczył poprawnie (WAW: 4/5/6/8 os. = 9/7/6/5 tyg.), ale nie było tego widać. Tygodnie nie zmieniają się, gdy zaokrąglenie do pełnego tygodnia daje to samo (np. 7 i 8 os. = 5 tyg.), w Krakowie (montaż w dniach) oraz gdy tygodnie wpisano ręcznie. Teraz: tygodnie są zawsze pokazane (także w Krakowie: dni/5), w analizie ekipy są wiersze noclegi, km, hotel, diety i paliwo, objaśnienie, a przy ręcznie wpisanych tygodniach pojawia się ostrzeżenie. Noclegi i diety liczą się od osobodni, więc przy większej ekipie prawie się nie zmieniają (+1 nocleg na osobę); km maleją z liczbą tygodni. |
| Eksport PDF ucina widok | Przycisk **Raport PDF** tworzy plik z całością: dane i warianty, opcje i ekipa, obliczenia, zestawienie i uwagi, zawsze 4 strony. |
| Zakładka Uwagi przewija się dopiero po lewej stronie | Prawa kolumna przewija się niezależnie. |
| Dwa progi zysku | **Zysk A 14%** i **zysk B 10%** (do zmiany w formularzu), obie ceny obok siebie w nagłówku, w kafelkach, tabelach, opcjach i eksportach. Zysk B liczy się od tych samych kosztów (bez zmiany ceny dźwigu, jak w starej kolumnie N). |
| Utrudnienia nie liczą się automatycznie | Liczyły się, ale wynik był tylko w drobnym dopisku. Teraz pod polami jest wyraźny wiersz: „Utrudnienia razem 20 osd = magistrala 4 × 0,5 + barierki i maskownice 35 × 0,5 = 19,5 → 20 (+ ręcznie)”. |
| Eksport do Excela | Przycisk **Excel**: arkusze Podsumowanie, Ekipa, Obliczenia, Do oferty, Cennik. |
| Dni montażu nachodzą na zysk | Nowy układ wskaźników z zawijaniem. |
| Gotowa oferta | Zakładka **Oferta**: adresat, numer, treść, dane techniczne (z opisu wariantu H-/L-/P-/G-/D-), opcje (2500 kg, słupki 3,7 / 22 kW, malowanie), ceny z kalkulatora zaokrąglone w górę do 100 zł (do nadpisania), płatności, terminy (montaż z kalkulatora z zapasem 25%, np. 9-11 tyg.), teksty stałe i logo. Podgląd na stronie i **plik Word** w układzie Waszych ofert. |

Weryfikacja: testy modelu (11), Excel vs model (17 zestawów), silnik aplikacji vs model (202 zestawy), test eksportów `app/test_export.cjs` (WAW i KRK: Excel, PDF 4 strony, Word) oraz eksport w przeglądarce.

---

## 11. Zmiany 20.10.2026 (druga runda, 13 punktów)

| Punkt | Co zrobiłem |
|---|---|
| 1. Logo | Logo z Waszych ofert jest w nagłówku oferty. Inne logo można wgrać w panelu oferty (sekcja P). |
| 2. Spider Crane | Pod polem: „Cena za 1 dzień: 2400 zł × N dni = …”. Koszt razem jest wyliczany automatycznie i można go nadpisać (model, Excel `in_dzwig_koszt`, aplikacja). |
| 3. Pasek przy przewijaniu | Lewa kolumna kończy się nad dolną krawędzią okna, a panel wyniku mieści się w oknie. |
| 4. Konserwacja | Przy konserwacji rocznej i przeglądzie półrocznym widać wpisane stawki zł/MP/mies. |
| 5. Opis / wariant | Tworzy się sam: `H-h1/h2 \| L-dł \| P-prześwit \| Hpoj. G-… D-… \| A-agregaty \| Bok-barierki Tył-maskownice \| mgstrl-magistrala`. Po ręcznej zmianie pole jest oznaczone „zmieniony”, a przycisk przywraca wersję automatyczną. |
| 6. Uwagi | Pozycje usunięte, zakładki Uwagi nie ma. |
| 7. Oferta | Przycisk **Przygotuj ofertę** pod pulpitem otwiera pełnoekranowy panel: sekcje A (numer, adresat), B (wstęp), 1–6 (specyfikacja, ceny, dostawa, teksty stałe), P (podpis, logo, nagłówek, stopka, klauzula) oraz podgląd na żywo. Przykłady WAW/KRK usunięte z aplikacji (zostały w testach i plikach Excel). |
| 8. Klauzula poufności | Zawsze w stopce 2. strony. |
| 9. Podpis | Wgrywany raz w panelu oferty. Zostaje tylko w tej przeglądarce (nie jest publikowany ze stroną) i trafia nad linie podpisu. |
| 10. Raport PDF | Dane wejściowe w 4 grupach w dwóch kolumnach, bez analizy osób i uwag. |
| 11. Excel | Bez analizy osób. Arkusz „Obliczenia i cennik” drukuje się na 2 stronach A4 (obliczenia, potem cennik). Podsumowanie zaczyna się od kafelków z cenami. |
| 12. Zysk | Wszędzie wartości procentowe zamiast A/B (np. „Zysk 14%”, „Zysk 10%”). |
| 13. Szablony urządzeń | Zakładka **Szablony urządzeń**: typy platform (nazwa, MP, osobodni, tekst w ofercie), cennik, zagłębienia z siłownikami, szerokości i długości niestandardowe, składowe platformy, tekst pozycji w ofercie. Można skopiować szablon, dodawać i usuwać wiersze, eksportować i importować. Szablon wybiera się w karcie Inwestycja. Wbudowane: NK38 i NK37. Szablony, teksty oferty, numeracja i zapisane wyceny są w bazie strony (dostęp tylko dla Ciebie); poza claude.ai zapisują się w przeglądarce. |

Weryfikacja: testy modelu (11), Excel vs model (22 zestawy), silnik vs model (202 zestawy), test eksportów (Excel, PDF 4 strony, Word), test w przeglądarce (bez błędów JS; eksporty; panel oferty na komputerze i telefonie; kopia szablonu zmienia cenę i zostaje po przeładowaniu).

## 12. Kilka par zagłębienie / prześwit (20.10.2026)

W karcie Inwestycja przycisk **+ Dodaj parę zagłębienie / prześwit** dodaje kolejną parę (H1, H2, długość, prześwit; pusta długość = jak w parze 1). Każda para ma własne wysokości pojazdów: liczone tym samym wzorem i do nadpisania w panelu oferty. W ofercie dane techniczne są podane dla każdej pary, rozdzielone słowem **lub**. Tak samo w opisie wariantu, raporcie PDF, Excelu i zestawieniu. Pary nie wpływają na cenę (cenę zagłębień liczy tabela zagłębień w karcie Urządzenia).

## 13. Pulpit urządzeń i przenoszenie na inny komputer (20.10.2026)

- **Pulpit** na starcie: karta każdego urządzenia (cena D, MP, osobodni, liczba zagłębień i składowych) z przyciskami Policz, Edytuj, Kopiuj, Usuń (własne). Karta „Nowe urządzenie” tworzy pusty szablon. Pod spodem ostatnie wyceny.
- **Edytor szablonu** jako osobny ekran: typy platform, cennik, zagłębienia, wymiary, składowe, a teraz też **teksty oferty urządzenia** (obciążenie, zabezpieczenie, barierki, opcja 2500 kg, uwaga pod danymi technicznymi). Oferta korzysta z tekstów typów platform i pozycji z szablonu.
- Każde urządzenie ma **własny szkic** wyceny; przełączanie urządzeń nie gubi wpisanych danych.
- **Kopia zapasowa** (plik JSON): szablony, teksty oferty, numeracja, wyceny. Wczytanie dodaje wyceny i zastępuje szablony o tym samym identyfikatorze.
- **Wersja offline** `app/Kalkulator_offline.html` (budowana przez `app/build_offline.py`): jeden plik z silnikiem, eksportami, logo i czcionkami; działa po otwarciu w przeglądarce, zapisuje w przeglądarce, pliki pobiera zwykłym pobieraniem. Biblioteki eksportu pobiera z internetu.

## 14. Szablony NK6501 i NKPXLH, uniwersalny model liczenia (20.10.2026)

Silnik ma dwa sposoby liczenia ceny urządzeń, wybierane w szablonie:
- **Cennik składowych NK38** (NK38, NK37): bez zmian, zgodny ze starym Excelem.
- **Uniwersalny: cena za sztukę + pozycje kosztowe** (NK6501, NKPXLH, nowe urządzenia):
  - do 3 typów urządzeń: nazwa, MP i osobodni na sztukę, cena w PLN / EUR / USD, dni dźwigu na sztukę, tekst w ofercie;
  - pozycje kosztowe: cena × kurs × ilość × mnożnik; ilość od: każdego urządzenia, typu, agregatu, MP, raz na wycenę, ilości lub **kwoty wpisywanej w wycenie** (np. Mufas); pozycja może być **opcją** (poza ceną, w ofercie jako opcja), może dodawać osobodni;
  - **import z frachtem**: lista kosztów kontenera (w walutach) + ubezpieczenie (stawka od % wartości), fracht na urządzenie = (koszty + ubezpieczenie) × liczba kontenerów / liczba urządzeń;
  - wariant 2 (np. 2500 kg): procent albo kwota na urządzenie; bez nazwy = brak wariantu;
  - konserwacja od MP albo od urządzenia, przegląd półroczny wł./wył., rozładunek jednorazowo albo za każdy transport, odbiory: liczba osób i wyjazdów;
  - wysokości pojazdów w ofercie: z zagłębienia (NK38), jeden poziom (▲ = prześwit − k), dwa poziomy (▲ + ▼ = prześwit − k);
  - wartości startowe nowej wyceny (zysk, konserwacja, transport, kursy);
  - wszystkie teksty oferty urządzenia: wstęp, dane techniczne (z polami {H} {L} {P} {G} {D}), uwaga, obciążenie, zabezpieczenie, zdanie po liście, opcja wariantu 2, agregat, płatności, dostawa, gwarancja, zakres, warunki montażu.

Montaż, podróże, hotel, diety, narzuty (KOB, GDW, zysk, podatek) są wspólne dla wszystkich urządzeń.

**Zgodność z Excelem** (`app/test_szablony.cjs`, w `npm test`):
- NK6501 (Verdiego, arkusz 16.12.25, przy hotelu 100 i diecie 0 jak w arkuszu): 134 711,08 zł przy zysku 11% i 133 007,47 zł przy 10% — jak K38 / N38.
- NKPXLH (Witosa, arkusz 18x2DS 9.10.26): fracht 2022,81 zł/szt., cena z frachtem 10 900,81 zł, urządzenia 196 214,58 zł, kontrakt 374 983,16 zł przy zysku 28% — jak F3 / F4 / I14 / K40. Kolumna N arkusza pomija dźwig (N18 liczy dni zamiast kosztu), więc 357 308 zł z arkusza jest zaniżone o dźwig.

Ustalenia: NK6501 ma hotel 130 zł (jak NK38) i dietę 45 zł; Mufas wpisywany ręcznie; bez agregatów i dźwigu; konserwacja tylko roczna (50 / 60 zł/MP). NKPXLH: 2300 USD/szt. stałe (komórka D4), +650 USD/szt. dla 2500 kg, hydraulika liczona w 20%, dźwig 1200 zł/dzień (0,06 dnia na szt.), rozładunek 1 dzień na kontener, odbiory 2 wyjazdy × 2 osoby, konserwacja i przegląd od urządzenia (35 / 45 zł), MP = 2 na urządzenie (do oferty: 18 urządzeń = 36 pojazdów).

## 15. Praca na kilku komputerach: folder danych i historia szablonów (21.10.2026)

- **Folder danych** (wersja offline, Chrome/Edge na Windows i Mac): na pulpicie „Wybierz folder danych”. Dane zapisują się w plikach `kalkulator-ustawienia.json` (szablony, teksty oferty, numeracja, użytkownik), `kalkulator-wyceny.json`, `kalkulator-wersje-robocze.json`, `kalkulator-historia-szablonow.json`. Pusty folder dostaje obecne dane, folder z danymi zastępuje kopię w przeglądarce. Przy kolejnym otwarciu przeglądarka pyta o zgodę („Połącz folder”).
- **Każdy użytkownik ma swoje dane** we własnym folderze. Nowa wersja programu (plik HTML) nie rusza danych; nowe wbudowane urządzenia dochodzą automatycznie.
- **Historia zmian szablonów**: wpis przy „Zapisz szablon”, wyjściu z edytora i zmianie szablonu; kto (nazwa użytkownika z pulpitu), kiedy, co zmieniło się z czego na co; przywracanie dowolnej wersji (też trafia do historii); 25 wersji na szablon. Historia jest w kopii zapasowej.

## 16. NK41, raporty pod negocjacje, audyt i przykłady (21.10.2026)

- **NK41** (platformy zależne pochylane, arkusz „-NK3 2T A .10.26”): 12 000 zł/szt. (mechanika Metazet 11 000 + łańcuch, śruby, koła, kotwy, inne), hydraulika 1420 zł/szt., agregat 780 €, sterowanie 1400 zł/agregat + 500 zł/szt., 2,2 osd/szt., dźwig 2400 zł/dzień (1 dzień na 15 szt.), KOB 0,515%, GDW 2,585%, zysk 14% / 11%, konserwacja od urządzenia. Zgodność: arkusz przeliczony w LibreOffice dla 23 szt. i 6 agregatów daje 491 465,27 zł (K40) i zysk z narzutem 79 060,47 zł (K45) — kalkulator tak samo (`test_szablony.cjs`).
- **Negocjacje**: silnik liczy cenę przy dowolnym zysku (`cenaPrzyZysku`, `negocjacje`). Raport PDF i Excel zaczynają się od kafelków „Cena ofertowa / Można zejść do (zysk do porównania) / Próg opłacalności (zysk 0%)”, paska pola negocjacji i drabinki cenowej (co 2 pkt proc.: cena, rabat zł i %, zysk z narzutem, cena/MP). Warianty 2000/2500 kg i opcje są niżej, struktura kosztów na stronie 2. Ta sama drabinka jest w zakładce „Negocjacje” w kalkulatorze.
- **Audyt i przykłady**: `npm run przyklady` tworzy w `przyklady/` po jednej–dwie wyceny dla każdego urządzenia (Excel, raport PDF, oferta Word) i sprawdza: liczby skończone, cena > koszt rzeczywisty > urządzenia, drabinka malejąca, brak niewypełnionych pól w ofercie, raport ≤ 4 strony. `Kopia_zapasowa_przyklady.json` wczytuje te wyceny do aplikacji (bez zmiany szablonów).
