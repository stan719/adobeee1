# Raport kompletności bazy wiedzy — Etap 3

Wygenerowano 2026-10-16 skryptem `narzedzia/raport.py` (nie edytować ręcznie — uruchomić ponownie po zmianach w `dane/`).

## 1. Podsumowanie

- **2045** twierdzeń (faktów), każde z dosłownym cytatem; łącznie **2837** cytatów
- **480** osób, **233** miejsc, **31** pozycji bibliograficznych
- **961** fragmentów (segmentów) transkrypcji z 10 źródeł
- 0 błędów; 0 segmentów bez pokrycia
- twierdzeń z niepewnym odczytem (cytat z `[?]` lub odczyt sporny): **177**

## 2. Pokrycie źródeł

Każdy fragment transkrypcji musi być użyty w twierdzeniu, opisany jako bibliografia albo jawnie oznaczony „bez faktów” (pagina, pusta strona, znak czytelnika itp.).

| Źródło | Fragmenty | w twierdzeniach | tylko bibliografia | bez faktów | brak | cytatów ze źródła |
|---|---:|---:|---:|---:|---:|---:|
| S01 — Przewodnik heraldyczny. Monografie, genealogje i spis rodzin | 105 | 81 | 3 | 21 | 0 | 157 |
| S02 — Z dziejów Radoszewic, cz. I | 60 | 49 | 10 | 1 | 0 | 149 |
| S03 — „The History of Our Family” — księga rodzinna (zeszyt w lini | 204 | 159 | 0 | 45 | 0 | 813 |
| S04 — „Jerzy Radoszewski Boxa h. Oksza 1902+1967 ur. w Krępie pow. | 13 | 13 | 0 | 0 | 0 | 62 |
| S05 — Kaplica Boxa Radoszewskich na cmentarzu w Uniejowie; Radosze | 7 | 7 | 0 | 0 | 0 | 59 |
| S06 — Bibliografia (spis lektur o rodzinie) | 7 | 0 | 7 | 0 | 0 | 0 |
| S07 — [Wspomnienia i genealogia rodzin Radoszewskich, Prządzyńskic | 194 | 179 | 10 | 5 | 0 | 954 |
| S08 — „Pałace i dwory w dawnym województwie sieradzkim”, t. 2 (z o | 325 | 209 | 70 | 46 | 0 | 507 |
| S09 — „szlak przodków Boxa-Radoszewskich” — odręczny szkic trasy ( | 16 | 16 | 0 | 0 | 0 | 27 |
| S10 — Dwór i założenia parkowe w Radoszewicach k. Wielunia | 30 | 30 | 0 | 0 | 0 | 109 |

## 3. Rodzaje faktów

| Relacja | Liczba |
|---|---:|
| opis | 403 |
| rodzic | 359 |
| smierc | 235 |
| pochowek | 210 |
| malzonek | 193 |
| urodzenie | 181 |
| wlasnosc | 86 |
| urzad | 73 |
| udzial_w_wydarzeniu | 61 |
| zamieszkanie | 55 |
| zawod | 42 |
| fundacja | 37 |
| rodzenstwo | 36 |
| wyksztalcenie | 24 |
| herb | 22 |
| slub | 18 |
| chrzest | 7 |
| odznaczenie | 3 |

## 4. Osoby

- osób poświadczonych w więcej niż jednym źródle: **162**
- osób z datą (lub wersjami daty) urodzenia: **103**, śmierci: **131**, pochówku: **96**
- osób bez żadnego twierdzenia: **0**
- najlepiej udokumentowane (liczba źródeł): `radoszewski-marek-1641` (5: S01, S02, S07, S08, S10); `radoszewski-jerzy-1902` (5: S03, S04, S05, S07, S08); `drohojowska-ewelina-1880` (5: S03, S04, S05, S07, S08); `przadzynski-stanislaw-1871` (5: S03, S04, S05, S07, S08); `radoszewski-jozefat-1830` (5: S03, S04, S05, S07, S08); `wrszowiec-jan` (4: S01, S02, S08, S10); `radoszewski-jerzy-1614` (4: S01, S02, S07, S10); `radoszewski-roch-1820` (4: S02, S03, S05, S07); `przadzynska-anna-1914` (4: S03, S04, S07, S08); `radoszewski-michal-1865` (4: S03, S04, S07, S08); `grabinska-stanislawa-1890` (4: S03, S04, S07, S08); `szeliska-teofila-1842` (4: S03, S05, S07, S08); `radoszewski-henryk-1861` (4: S03, S05, S07, S08); `radoszewski-imbram-1412` (3: S01, S07, S08); `radoszewski-boguslaw-1441` (3: S01, S07, S08)

## 5. Utożsamienia i decyzje do przejrzenia

Osoby połączone z wzmianek w kilku źródłach (pole `utozsamienie`) albo świadomie **nie** połączone mimo możliwej tożsamości (uwaga w `osoby.yaml`). Sprzeczne fakty nigdy nie są scalane.

- **połączone** `radoszewski-jerzy-1902`: S04 (kartka o Jerzym), S03 (ojciec autorki — „Tatuś”), S07, S08 — zgodne lata 1902–1967 i rodzice Michał i Ewelina.
- **połączone** `radoszewski-stogniew-1467`: „Stogneus junior” z S01 (syn Imbrama, wziął Siemkowce, od niego Siemkowscy) = Stogniew z Siemkowic z S07 (1467) — prawdopodobne.
- **połączone** `wrszowiec-jan`: „Comes Joannes I seu Stogneus” z drzewa S01 = Jan (Gesko) Wrszowiec z S02/S10: ta sama tradycja (Czech z domu Wrszowców, nadanie od Krzywoustego, Radoszewice i Siemkowice).
- `radoszewski-andrzej-1630`: Fundator sukienki obrazu MB w Pajęcznie (1630); utożsamienie z Andrzejem chorążym †1621 (S02) niepewne.
- `radoszewski-imbram-1412`: Protoplasta Radoszewskich i Siemkowskich; utożsamienie z „Imbramus dictus Boxa” z drzewa S01 — prawdopodobne (S08: Imbram 1412–1413).
- `radoszewski-boguslaw-1441`: Syn Imbrama; utożsamienie z „Boguslaus dictus Boxa” (S01, pok. IX) — prawdopodobne.
- `radoszewski-mikolaj-1574`: Utożsamienie z Mikołajem V z drzewa S01 — prawdopodobne (Węgry, Kamieniec/Terebesz).
- `kurzepnicka`: Żona Mikołaja (+1574) wg S07; S01 podaje Zofię Konopnicką — może inna żona.
- `radoszewski-andrzej-1621`: Chorąży ziemi wieluńskiej, zm. 1621 (S10, za ks. Prygodzkim). Możliwe, że to ten sam co radoszewski-andrzej-1630 (chorąży wieluński, fundacja 1630) — daty się wykluczają, nie scalam.
- `radoszewski-mikolaj-1552`: Współwłaściciel Radoszewic w 1552 r. (S02). Może ten sam co radoszewski-mikolaj-1574 — nie scalam bez potwierdzenia.
- `radoszewski-andrzej-rotmistrz`: S01 pok. XI, syn Mikołaja V; rotmistrz JKM. Utożsamienie z radoszewski-andrzej-1574 / -1621 / -1630 nieustalone.
- `radoszewski-jozefat-starszy`: Brat Franciszka (1790–1846), stryj Józefata (1830–1892); siedziba w Śmiechowie (S08). Może ten sam co radoszewski-jozef-1850 („Józef, brat Franciszka” w S07) — nie scalam.
- `radoszewski-stanislaw-1679`: Zm. 1679, żona Salomea z Mycielina (S08). Może ten sam co radoszewski-stanislaw-1657 (żona Wiktoria Oleśnińska wg S07) — nie scalam.

## 6. Sprzeczne wersje dat (nie scalane)

Ta sama osoba, to samo zdarzenie jednorazowe, różne daty — każda wersja z własnym źródłem.

- drohojowski-boleslaw-1848 — urodzenie: 1848 (S03-p09-s06); 1847 (daty w wierszu Bolesława) (S03-p06-s04); 1850 (S07-p18-s02); 1848 (S07-p21-s03)
- drohojowski-jan-1780 — smierc: +1819[?] (S03-p07-s03); +1819 (S07-p21-s01)
- drohojowski-jan-1886 — smierc: w kwietniu 1945 r. (S07-p18-s03, S07-p19-s01); +1944 (S07-p21-s04)
- grabinski-adam-1944 — smierc: +18-XII-1944 (S03-p15-s04); 10-XII-44 r. (S07-p44-s04, S07-p44-s04)
- grabinski-piotr-1750 — urodzenie: 1750 (S03-p07-s06); 1740 (S03-p10-s07); 1750 (S07-p46-s03)
- przadzynska-michalina-1826 — smierc: +1846 (S03-p32-s02); +1826 (S07-p57-s02)
- przadzynska-pelagia-1833 — smierc: +18-III-1832 (sic) (S03-p32-s02); +1837 (S07-p57-s02)
- przadzynska-sylwia-1837 — smierc: 1862 (S03-p36-s02); +1861 (S07-p31-s02); +1862 (S07-p56-s01)
- przadzynski-andrzej-1917 — urodzenie: 29-IX-17 (S03-p13-s03); 29-XI 1917 (S03-p53-s02)
- przadzynski-boleslaw-1842 — smierc: +1853 (S03-p19-s02); +1855 (S07-p57-s02)
- przadzynski-boleslaw-1842 — urodzenie: 1843 (S03-p19-s02); 21-VII-1842 (S03-p32-s02)
- przadzynski-edward-1838 — smierc: +1895 (S03-p19-s02); +1995 (sic) (S07-p33-s02)
- przadzynski-stanislaw-1828 — smierc: +1833 (S03-p19-s02); +1855 (S03-p32-s02); +1856 (S07-p57-s02)
- przadzynski-stanislaw-1871 — smierc: 3-II-1957 (S03-p09-s03, S03-p16-s01, S03-p21-s02, S03-p44-s02); +1957 (S07-p28-s05); +2-II-1957 (S07-p34-s01); 1957 (S08-p064-s03)
- przadzynski-stanislaw-1871 — urodzenie: 3-VII-1871 (S03-p09-s03, S03-p16-s01, S03-p49-s02); 2-VII-1871 (S03-p21-s02); 1871 (S07-p28-s05); 1871, 2 lipca (S07-p34-s01); 1871 (S08-p064-s03)
- przadzynski-wincenty-1795 — smierc: +1858 (S03-p07-s04, S03-p10-s05); +1858 19 listopad (S03-p32-s02); 19 list. 1858 (S07-p32-s01, S07-p32-s01); +1868 (S07-p57-s02)
- przadzynski-wincenty-1795 — urodzenie: 1795 (S03-p07-s04); 4-IV 1735 (zapis) (S03-p10-s05); 5-IV-1795 (S03-p32-s02); 5-IV-1795 (S07-p32-s01)
- przadzynski-wladyslaw-1837 — urodzenie: 1837 (S03-p09-s07, S03-p06-s05); 5-VII-1837 (S03-p19-s02); 3-VI-1837 / 3 czerw. 1837 (S03-p20-s06, S03-p32-s02); 3 czerw. 1837 (S07-p33-s02)
- radoszewski-albin-1811 — smierc: +1871 (S03-p33-s02); 1875 (S07-p26-s01); +1871 (S07-p54-s02)
- radoszewski-boguslaw-1638 — smierc: +1635 (S05-p01-s03); +1638 (S07-p02-s02, S07-p23-s01)
- radoszewski-henryk-1861 — smierc: 1861 (S03-p25-s02); 1850 (S03-p30-s02); 1861 (33 lata) (S05-p01-s02); +1861 (S07-p01-s02)
- radoszewski-henryk-1862 — smierc: +1870 (S03-p17-s02, S03-p30-s02); 1870 (8 lat) (S05-p01-s02); +1867 (S07-p01-s03); 1870 (S07-p16-s05)
- radoszewski-jerzy-1614 — smierc: 23 października 1614 roku (S02-p09-s01); +1613 (S07-p01-s01); +1614 (S07-p58-s05); 23 października 1614 roku (S10-p3-s01)
- radoszewski-jozefat-1830 — smierc: +1892 (S03-p06-s04, S03-p09-s05, S03-p17-s02, S03-p25-s02, S03-p30-s02); 1893 (S05-p01-s02); +1892 (S07-p01-s01, S07-p06-s04); 1892 (S08-p074-s03)
- radoszewski-michal-1865 — urodzenie: 16 lipiec 1865 (S03-p09-s01); 1865 (S03-p17-s02); 1865 (S04-p01-s02); 16 list. 1865 (S07-p07-s03); 1866 (S07-p21-s04); 1865 (S08-p075-s01)
- radoszewski-roch-1820 — smierc: +1828[?] (S02-p21-d1); +1820 (S03-p07-s01, S03-p10-s01, S03-p30-s02); 1820 (S05-p01-s02); +1820 (S07-p01-s01, S07-p06-s02)
- rosdeitscher-amelia — urodzenie: 1841 (S03-p35-s02); 1840 (S07-p25-s03); 1841 (S07-p56-s05)
- rudkowska-emilia — smierc: 1886 (S03-p36-s02); +1886 (S07-p28-s03); 1885 (S07-p31-s01); +1886 (S07-p56-s01)
- skrzynska-anna-1848 — urodzenie: 1848 (S03-p09-s07, S03-p06-s05); 25-VII-1848 (S03-p20-s02, S03-p23-s02, S03-p32-s02); 28-VII-1848 (S07-p33-s03)
- skrzynska-jozefa-1807 — urodzenie: 1807 (S03-p10-s01, S03-p26-s01); 1867 (zapis) (S03-p07-s01); 1807 (S07-p01-s01, S07-p06-s03)
- szumowski-antoni — smierc: 1884 (S03-p30-s02); 1885 (S05-p01-s02); +1855 (S07-p54-s01)

## 7. Spójność dat (do sprawdzenia)

- szeliski-michal-1800 (ur. 1800): rodzic zazarska-tekla (ur. 1808) — różnica -8 lat (S03-064)

## 8. Miejsca do ustalenia

Miejsc o pewnej identyfikacji: 158, prawdopodobnej: 33, do ustalenia: 42. Współrzędne (`wsp`) zostaną dodane w Etapie 4.

- `smiechow` — Śmiechów
- `ciszecin-wielki` — Ciszecin Wielki (Według S07 „k/Jarosławia”, parafia Zarzecze.)
- `dominikowice` — Dominikowice (Według S03-p39-s02 między Poddębicami a Uniejowem; parafia Uniejów (S03-p29-s03).)
- `marzenin` — Marzenin (Majątek Szeliskich; S07 „k/Warty[?]”.)
- `niemyslow` — Niemysłów (Parafia Krempy.)
- `piotrkowice-wolyn` — Piotrkowice (Majątek Drohojowskich na Wołyniu, k. Kowla (S03-p10-s03, S07-p21-s02).)
- `zarzecze` — Zarzecze (Parafia Ciszecina Wielkiego; grób Drohojowskich.)
- `gostkow` — Gostków (Majątek Skrzyńskich.)
- `mroke` — Mroke[?] (Miejsce ur. Edwarda Grabińskiego — odczyt niepewny.)
- `ner` — Ner (Majątek Radoszewskich nad rzeką Ner, k. Gostkowa i Wartkowic (S07-p61-d1).)
- `zatuskow` — Zatusków (Majątek Pawła Radoszewskiego, „k/Łowicza” (S07-p27-s04).)
- `wola-wiazowa` — Wola Wiązowa
- `kobierzycko` — Kobierzycko (Majątek Wincentego Prządzyńskiego; fabryka mączki kostnej.)
- `nowa-wies-skrzynskich` — Nowa Wieś (Majątek Skrzyńskich (z Gostkowa i Nowej Wsi).)
- `wygnanow` — Wygnanów[?]
- `wysoka-wola` — Wysoka Wola
- `lipnica` — Lipnica (Majątek cioci Kotusi z Mierzyńskich Łąckiej k. Szamotuł, zapisany Urszulankom.)
- `matyn` — Matyń[?] („Matyń k/Zadzimia[?]” (S07-p05-s05).)
- `perehinsk` — Perehińsk[?]
- `kuchlin` — Kuchlin[?] k. Turku
- `malczew` — Malczew
- `wiatrowo` — Wiatrowo
- `kichanow` — Kichanów[?]
- `miedzechow` — Miedzechów[?] / Miechocin[?]
- `papratnia` — Papratnia[?] w Konińskim[?]
- `topola-katowa` — Topola Katowa
- `zlotniki` — Złotniki[?]
- `karskow` — Karsków[?]
- `wegrzy` — Węgrzy (Węgrze?) (Majątek Mierzyńskich („z Węgrzy”).)
- `jeruzale-zwolen` — Jeruzale[?] k. Zwolenia[?]
- `grabno` — Grabno
- `kosiki-dzialy` — Działy Królewskie, wieś Kosiki[?] Nowy, gromada Malinów[?], pow. otwocki
- `biernacice` — Biernacice (Majątek Dzierżbickich[?], pałac w ruinie (S09).)
- `byszewo` — Byszewo[?] („maj. J.[?] A.[?] Radoszew…” (S09).)
- `kuznica-radoszewska` — Kuźnica (al. Kuźnica[?]); może Kuźnica Ługowska, dawniej „Kuźnica Radoszewska”
- `laski` — Łaski[?] / Laski
- `krzetow` — Krzyty[?] / Krzytów[?] (zapewne Krzętów k. Pajęczna) (Komora celna (S02, za Rosinem).)
- `kamien-wielunski` — Kamień (komora celna)
- `skrzelin` — Skrzelin[?]
- `lipnik` — Lipnik[?] (Dobra Radoszewskich z gospodarką stawową 1562–1588 (S02).)
- `brzoszencin` — Broszencin / Brzoszencin
- `strzelce` — Strzelce

## 9. Niepewne odczytania

Pełna lista z miejscami na zdjęciach: `dane/watpliwosci.md`. Twierdzenia z niepewnym odczytem wg źródła: S02 23, S03 67, S04 1, S05 2, S07 74, S09 8, S10 2

## 10. Eksport

`python narzedzia/eksport.py` tworzy w katalogu `eksport/`:
- `radoszewscy.sqlite` — tabele `zrodla`, `segmenty`, `osoby`, `miejsca`, `twierdzenia`, `cytaty`, `literatura`, `bez_faktow` oraz widok `fakty_ze_zrodlem` (fakt + cytat + źródło + strona + zdjęcie);
- `csv/*.csv` — te same tabele (UTF-8 z BOM, otwierają się w Excelu);
- `radoszewscy.ged` — GEDCOM 5.5.1 do programów genealogicznych: każda osoba z wariantami nazwisk, każde zdarzenie z cytatem (`SOUR`/`PAGE`/`TEXT`); sprzeczne daty jako osobne zdarzenia `BIRT`/`DEAT`. Gdy źródło podaje tylko jednego rodzica, a ten ma dokładnie jednego znanego małżonka, dziecko jest przypisane do tej pary z notatką „wniosek, nie fakt ze źródła”. Fakty o miejscach są tylko w SQLite/CSV.
