# Wątpliwości i rozbieżności do sprawdzenia

Każdy wpis: segment → co jest niepewne → propozycja. Kadry można odtworzyć poleceniem `python narzedzia/powieksz.py …` (podane przy wpisie).

## S01 — Kosiński, Przewodnik heraldyczny t. V (1885)

### Niepewne odczytania
| # | Segment | Wątpliwość | Kadr |
|---|---|---|---|
| 1 | S01-p000-s03 | „Nr 3” na karcie tytułowej — cyfra bardzo drobna | `IMG_5810 0.2 0.7 0.5 0.9 --obrot 90` |
| 2 | S01-p140-d1 | Znak na lewym marginesie s. 140: gwiazdka z trzech kresek czy litera „A” przekreślona? | `IMG_5815 0.05 0.48 0.25 0.60 --obrot 90 --kolor` |
| 3 | S01-p145-f13 | „Krysztof” — ostatnia litera słabo odbita | `IMG_5817 0.52 0.60 0.86 0.82 --obrot 90` |

### Ślady odręczne (do decyzji: kto je zrobił i czy mają znaczenie)
Egzemplarz ma podkreślenia i znaki niebieskim długopisem: gwiazdki na s. 136, 139, 140, 141 i 143, a na s. 139 dopisek „85 lat” przy wzmiance o Mikołaju III, który żył „lat więcéj osiemdziesięciu”. Podkreślane są zawsze imiona przodków w linii prostej oraz barwne szczegóły (siła, podróże, dary dla Jasnej Góry). Niepewne jest, czy kreski pod tytułem „Comes Joannes I seu Stogneus” (s. 133) i pod „Radoszewice haeres” (s. 144) to ten sam ślad ręczny, czy element druku.

### Osobliwości druku (nie błędy odczytu — zachowane w transkrypcji)
- s. 132: „alegać” (zam. „ulegać”), „stólecia”, „poko lenia” bez dywizu.
- s. 134: dwa akapity oznaczone „2)” (Comes Stogneus I i Comes Ratiborus).
- s. 142: „Herbaych” (zam. „Herbach”).
- Odsyłacze „4)” (s. 135 i 136) oraz „6)” (s. 137 i 138) występują po dwa razy, za każdym razem z innym przypisem.
- Tekst o Radoszewskich jest drukowany pod żywą paginą „GRABOWSKI” (to dodatek do hasła Grabowskich). Na s. 132 przed nim jest koniec hasła Grabowskich, a s. 144–145 zamyka dodatek do przypisu 24 ze s. 93 (o Zborowskich). Te fragmenty nie dotyczą Radoszewskich, ale są przepisane, żeby nic nie pominąć.

### Rozbieżności chronologiczne w samym źródle (do Etapu 2–3; źródła nie poprawiam)
- **S01-p137-s01**: Wojewoda Boxa (Stogniew IV) umiera „mort. c. a. MCLXXXIX” (ok. 1189). Tymczasem według S01-p136-s04 był „u królów Pudyka i Leszka, co go zwano Czarnym”. Bolesław Wstydliwy panował w latach 1243–1279, a Leszek Czarny w latach 1279–1288, więc data 1189 jest niezgodna. Może to błąd druku lub odpisu (np. 1289?). Do opisania w przypisie edytorskim.
- **S01-p135-s02**: przywilej księcia Leszka dla Jana II datowany „a. d. MCCXII” (1212). Jan II to ojciec pokolenia IV, a jego wnuk Boxa miałby umrzeć w 1189. Kolejność dat jest więc odwrócona.
- Sam Kosiński zastrzega (S01-p132-s03), że pierwsze pokolenia, aż do Wojewody Boxy, „mogą ulegać wątpliwości”.

## S03 — księga rodzinna „The History of Our Family” (Teresa Radoszewska-Zielińska)

Pełne uwagi są w plikach stron `zrodla/transkrypcje/S03/str-NN.md`, w wierszach `[red.: …]`. Poniżej skrót tego, co najbardziej skorzysta na wiedzy rodzinnej. Kadr każdej strony: `python narzedzia/pasy.py IMG_<nr> <katalog>` (numer zdjęcia jest w nagłówku pliku).

### Nazwiska i imiona do potwierdzenia
| Strona | Niepewny odczyt | Kontekst |
|---|---|---|
| 7, 10 | Antonina **Rozrażewska**[?], Tekla **Zazarska**[?] | matka i babka Michała Szeliskiego |
| 7, 10 | Jan Drohojowski 1780+**1819**[?], żony Róża **Niemirowska**, Brygida **Rzeszotarska** | prapradziadek Ewy z Drohojowskich |
| 7, 10, 36 | Leokadia z **Dąbskich**[?] Brandel (zapisane „Dzbska”) | prababka Anny z Prządzyńskich |
| 9 | Edward Grabiński ur. w **Mroke**[?] | miejsce urodzenia |
| 10 | Ludwika **Paprocka**[?] | żona Marcelego Terleckiego |
| 11 | „Bronikowski Ł…uszczyńska”[?] | rodzice Marianny Bronikowskiej |
| 14 | Andrzej **Bezdniakow**[?], Zofia **Kenarska**[?] | współmałżonkowie w rodzinie Prządzyńskich/Szweycerów |
| 15 | Renata Krzyżanowska h. **Dębno**[?] (lub Dąbrowa) | żona Adama Grabińskiego |
| 16 | **Zbyszek**[?] Tuchałka; Anna **Aulaitner**[?] | mąż Hani Wilskiej; żona Piotra |
| 18, 25 | St. **Leżnowski**[?] | mąż Ludmiły Otockiej |
| 20 | Maria **Drogosław**[?] Skórzewska; Jerzy **Dzbacki**[?] | żona Edwarda Prządzyńskiego; mąż Salomei |
| 21 | „**Szalone przekazy**”[?] (fragment o Wincentym Prządzyńskim); „hr. **Łączkiemu**[?]” (raczej Łąckiemu) | |
| 22 | Antonina Katarzyna: I **Łaszewska**[?], II **Rychłowska**[?], III **Radomanowa**[?] | siostra Marii Walewskiej |
| 23–25 | „z **Wygnanowa**”[?], „z **Zatuskowa**”[?], „ze **Szendaczyna**”[?], **Roczyńska**[?], **Karasiński**[?] | |
| 26 | Celina — **Wyleżyński**[?] | kim jest Celina? |
| 31 | Aleksander Skrzyński „**zmarł przybywszy**”[?] z obozu; p. Teresa **Kilis**[?] | |
| 32 | Teresa z **Liskowskich**[?] Wilska | sam autor dał tu „?” |
| 36 | Emilia z **Butkowskich**[?] (czy Rudkowskich?) Prządzyńska | generałowa |
| 37 | „Pow. **IV Wr.**”, gen. **Makowiecki**[?], „(**Wiktorji**)” | opisy grobów |
| 42 | wyjazd 2 IX 1939 „do **Zatusk…**”[?] (ucięte), „**wydostaliśmy się**”[?] | |
| 44–54 | nazwiska w sekcjach imienin: Gintyłło, Kumrzyk, Podczaska, Kajzer, Mikke, Gołubiewowa, Kulerzyna, Lipczyńska, Jolikowski, Gorczyńska, Wituńska, „Siostra Jurkowicz”, „Ciocia Wyżłkina” | |
| 45 | 17-III-1976 śmierć „Wujka Stanisława **Prządzyńskiego**”[?] | nazwisko przy krawędzi; nie może to być Stanisław z Kościerzyna (zm. 1957) |

**Ner czy „Nem”?** W całej S03 (i w S07) słowo zapisane jak „z Nem” odczytuję jako **„z Neru”**, czyli majątek Ner koło Gostkowa i Wartkowic (notatki z S07: „Ner k/Gostkowa i Wartkowic majątek Jan Radoszewski”). Proszę o potwierdzenie.

### Rozbieżności dat w obrębie S03 (do Etapu 3; nie są scalane)
- Władysław Prządzyński: ur. **5-VII-1837** (s. 19), **3-VI-1837** (s. 20), **3 czerw. 1837** (s. 32).
- Stanisław Prządzyński (z Kościerzyna): ur. **3-VII-1871** (s. 9, 16, 49) i **2-VII-1871** (s. 21).
- Andrzej Prządzyński: ur. **29-IX-17** (s. 13) i **29-XI-1917** (s. 53).
- Bolesław Prządzyński: ur. **1843** (s. 19) i **21-VII-1842** (s. 32).
- Stanisław Prządzyński (syn senatora): zm. **1833** (s. 19) i **1855** (s. 32).
- Pelagia Prządzyńska: ur. 22-III-**1833**, zm. 18-III-**1832** (s. 32), czyli śmierć przed urodzeniem.
- Wincenty Prządzyński (senator): ur. **1795** (s. 7, 32) i „**1735**” (s. 10, prawdopodobnie omyłka pisarska).
- Józefa Skrzyńska: ur. „**1867**” (s. 7) i **1807** (s. 10, 26).
- Piotr Grabiński: ur. **1750** (s. 7) i **1740** (s. 10).
- Bolesław Drohojowski: daty **1847+1941** w jego wierszu (s. 6), a na s. 9 Bolesław ma **1848+1916**, natomiast 1847+1941 to Bronisława Terlecka.
- Kaplica w Uniejowie: Antoni Szumowski **1884** (S03 s. 30) i **1885** (S05). Wpis „Henryk 1850 (syn Franciszka)” w S03 stoi wobec „Józef z Dominikowic 1850” i „Henryk (33 lata) 1861” w S05.
- Albin Radoszewski: **+1871** (grób na Powązkach, s. 33). Inne źródła do porównania w S07.

### Potwierdzone krzyżowo (rozstrzygnięte w 3. przejściu)
- Waleria Skrzyńska była z domu **Łączyńska** h. Nałęcz, „bratanica p. Walewskiej” (s. 7, 10, 21, 22, 31).
- Anna (Hania) z Wilskich **Tuchałkowa** zmarła 23-I-1980 (s. 16, 43).
- Potwierdzone nazwiska: **Karasiewicz** (s. 14, 47), **Suski/Suska** (s. 14, 44, 48), **Krzeptowski** (s. 14, 47), **Wrzodarski** (s. 16, 54).

## S04–S06 — luźne kartki
| Segment | Niepewny odczyt |
|---|---|
| S04-p02-s01 | Spółdzielnia Poligraficzna im. **Hanki Sawickiej**[?] w Grodzisku Maz.; nieczytelna wstawka nad „założycielem” |
| S05-p01-s03 | biskup „**kireneński**”[?] in partibus (tytularny Cyreny?) |
| S05-p02-s01 | „zostały rozebrany” — tak czytam |
| S05-p02-s02 | „bateria **zwykła**”[?] (wiersz na zgięciu kartki) |
| S05-p02-s03 | ks. Stanisław **Zawiński** — pierwsza litera Z czy Ł? |
| S06-p01-s01 | rok wydania przewodnika t. II „1880” — cyfra poprawiana |
| S06-p01-s03 | ks. Kasjan **Korczyński**[?]; „s. 7/33” (cyfry przekreślone) |
