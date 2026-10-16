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
| 7, 10, 36 | Leokadia z **Dąbskich**[?] Brandel (zapisane „Dzbska”; tak samo w S07 s. 42, 46, 55: „z Dzbskich”) | prababka Anny z Prządzyńskich; może naprawdę „Dzbska”/„Dębska”? |
| 9 | Edward Grabiński ur. w **Mroke**[?] | miejsce urodzenia |
| 11 | „Bronikowski Ł…uszczyńska”[?] | rodzice Marianny Bronikowskiej |
| 14 | Andrzej **Bezdniakow**[?] (S07 s. 48: „Bezdiniaków”) | mąż Katarzyny Prządzyńskiej |
| 16 | **Zbyszek**[?] Tuchałka; Anna **Aulaitner**[?] | mąż Hani Wilskiej; żona Piotra |
| 18, 25 | St. **Leżnowski**[?] | mąż Ludmiły Otockiej |
| 20 | Maria **Drogosław**[?] Skórzewska; Jerzy **Dzbacki**[?] | żona Edwarda Prządzyńskiego; mąż Salomei |
| 21 | „**Szalone przekazy**”[?] (fragment o Wincentym Prządzyńskim); „hr. **Łączkiemu**[?]” (raczej Łąckiemu) | |
| 22 | Antonina Katarzyna: I **Łaszewska**[?], II **Rychłowska**[?], III **Radomanowa**[?] | siostra Marii Walewskiej |
| 23–25 | „z **Wygnanowa**”[?], „z **Zatuskowa**”[?], „ze **Szendaczyna**”[?], **Roczyńska**[?], **Karasiński**[?] | |
| 26 | Celina — **Wyleżyński**[?] | kim jest Celina? |
| 31 | Aleksander Skrzyński „**zmarł przybywszy**”[?] z obozu; p. Teresa **Kilis**[?] | |
| 32 | Teresa z **Liskowskich**[?] Wilska | sam autor dał tu „?” |
| 36 | Emilia z **Rudkowskich**[?] Prządzyńska (S03: „Butkowskich”?, S07 s. 31: „Rudkowską”, S07 s. 56: „Rutkowskich”) | generałowa |
| 37 | gen. **Makowiecki**[?] (S07 s. 55 podobnie), „(**Wiktorji**)” (S07 s. 56: w grobie Andrzeja także Józef Prządzyński) | opisy grobów |
| 42 | wyjazd 2 IX 1939 „do **Zatusk…**”[?] (ucięte), „**wydostaliśmy się**”[?] | |
| 44–54 | nazwiska w sekcjach imienin: Gintyłło, Kumrzyk, Podczaska, Kajzer, Mikke, Gołubiewowa, Kulerzyna, Lipczyńska, Jolikowski, Gorczyńska, Wituńska, „Siostra Jurkowicz”, „Ciocia Wyżłkina” | |
| 45 | 17-III-1976 śmierć „Wujka Stanisława **Prządzyńskiego**”[?] | nazwisko przy krawędzi; nie może to być Stanisław z Kościerzyna (zm. 1957) |

**Ner** — rozstrzygnięte: zapis „z Nem” to „z Neru” (S07 s. 26: „Mieszkał w Nerze”; s. 61: „Ner k/Gostkowa i Wartkowic majątek Jan Radoszewski”).

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
- Z pomocą S07: Ludwika z **Paprockich** Terlecka (S07 s. 9); Renata Krzyżanowska h. **Dębno** (S07 s. 44, 59); Zofia **Konarska** Szweycerowa (S07 s. 48); **Zatusków** k. Łowicza — majątek Pawła Radoszewskiego (S07 s. 27, 61); **Łaszczyńska** — żona Kazimierza Radoszewskiego (S07 s. 26); grób Stefanii Podkolińskiej: „IV brama” (S07 s. 56); Konstancja „Kotusia” z Mierzyńskich **Łącka** z Lipnicy (S07 s. 42, 59).

## S04–S06 — luźne kartki
| Segment | Niepewny odczyt |
|---|---|
| S04-p02-s01 | Spółdzielnia Poligraficzna im. **Hanki Sawickiej**[?] w Grodzisku Maz.; nieczytelna wstawka nad „założycielem” |
| S05-p01-s03 | biskup „**kireneński**”[?] in partibus (tytularny Cyreny?) |
| S05-p02-s01 | „zostały rozebrany” — tak czytam |
| S05-p02-s03 | ks. Stanisław **Zawiński** — pierwsza litera Z czy Ł? |
| S06-p01-s01 | rok wydania przewodnika t. II „1880” — cyfra poprawiana |
| S06-p01-s03 | „s. 7/33” (cyfry przekreślone); nazwisko ks. Kasjana Korczyńskiego potwierdzone w S07 s. 23 |

## S07 — zeszyt wspomnień i genealogii (Anna z Prządzyńskich Radoszewska?)

Narratorka pisze w 1. osobie o pensji Plater, o „Dziadziu Stasiu” i o życiu „u nas w Milanówku”. Jest więc prawdopodobnie Anną z Prządzyńskich Radoszewską (1914–1999). Autorstwem na razie się nie zajmujemy.

### Nazwiska, miejsca, wyrazy do potwierdzenia
| Strona | Niepewny odczyt | Kontekst |
|---|---|---|
| 3 | zdanie „Nosił hetman w Koronie także halabardę ostrzem w lewo” | opis herbu Oksza |
| 4 | żona Mikołaja „**Kurzepnicka**”[?]; zamek „**Trebar**”[?] na Węgrzech | |
| 5 | „**Przemysłowo**”[?] rozbudował dwór; „**Matyń** k/**Zadzimia**”[?] | Michał kasztelan |
| 6 | Marzenin „k/**Warty**”[?]; „Uniósł [Zniósł?] serwituty” | Józefat, Teofila |
| 7–8 | „**kuchmal(nia)**” — niejasny wyraz, dwa razy (ukrycie rannych powstańców; przebudowa na gorzelnię) | słodownia? budynek gospodarczy? |
| 7 | bitwa „pod **Niewierszem**”[?] (S05: pod Niemysłowem) | 1863 |
| 14 | przełożona pensji „p. Jadwiga **Reutt**”[?] | |
| 17 | „miał **morową**[?] pensję” | kanonik Julian Drohojowski |
| 18 | krewni „**Wysłużów**”[?]; Jan Drohojowski „zielony **ludowiec**”[?] | |
| 19 | obóz „**Jagły**”[?]; „**Perehińsku**”[?]; Maria „**Łosiowa**”[?] | Drohojowscy, Madeyscy |
| 21 | Leszek **Łoś**[?], Lucile **Reizeux**[?], Maïté, Mathias | francuska gałąź Madeyskich |
| 22 | Barbara z **Pęsławskich**/**Popławskich**[?] h. **Zelina**[?] (s. 58: „z Popław…”) | żona Andrzeja (Jędrzeja), zm. 1608 |
| 25 | Józef ur. w „**Kuchlinie**”[?]; żony Ignacego: **Zalistowska**[?] h. **Pilawa**[?], Amelia **Rosdeitscher**[?]; „**Jagmin Warnicki**”[?] | Radoszewscy z Opatówka |
| 26 | Siemiątkowska „z **Wygnanowic**”[?] | |
| 28–29 | Hieronim — żona **Gniazdowska** h. **Brzoza**[?]; Bronikowska „z **Golejewka**”[?]; nagłówek „gałąź gen. z **Pogdan**”[?]; „**Kichanów**”[?] | Prządzyńscy |
| 30–31 | gen. „**Sierawskiego**”[?]; pies „**Butor**”[?]; „**Gatczyna**”[?], „**Przepiórków**”[?], „**Miedzechów**”[?], „**Jarzenice**”[?], Wacław „**Hermiesek**”[?] | gen. Ignacy Prządzyński |
| 32 | „**Papratnia** w **Konińskim**”[?], „**Złotniki**”, „**Karsków**”[?] | senator Wincenty |
| 36 | wełna „do **Leszczyna**”[?] | Kościerzyn |
| 38 | pensja „p. **Kotwickiej**”[?] | Stanisława z Grabińskich |
| 41 | Gabriel **Krasicki**[?], gen. lot. **Ujejski**[?], „**Krisi**”[?], Iwanicka „z **Włodkowa**”[?], „z **Liciny**”[?] | Krasiccy |
| 43 | Amelia **Kurtzkowska**[?] | matka Konstantego Brandla |
| 44 | Podkolińscy w „**Jeruzalach** k/**Zwolenia**”[?]; żona Adama „**Zezé**”[?] | |
| 46 | Grabińscy: Pogtowska, Łątkowska, Zamchowicz, Potenziani, Korzyńska, Turnowska — wszystkie [?] | drzewo Grabińskich |
| 47 | Antonina Katarzyna: I **Łasocka**[?], II **Rychłowska**[?], III **Radomanowa**[?] (jak S03 s. 22) | siostra Marii Walewskiej |
| 48 | „z **Dębicy** k/Środy”[?]; Szweycer „z **Hutki** i **Ostrowa**”[?]; Suski „z **Jasek**”[?] | |
| 49–51 | autorzy w bibliografii: Nadzieja, Dematowicz, Zasiński, Rutczyc, Kunic, Kozłowski, Górewicz, Murzyńska, Moraczewicz, Krzepkowska, Krasowski — wszystkie [?] | spis źródeł |
| 52 | Jakub Prządzyński „**Łęczyckiego i Płockiego**”[?]; „pomnik synowie **wszystkim**”[?] | |
| 57 | „p. **Tonia**”[?]; Aleksander Skrzyński „umarł z **przejściami**[?] z obozu” | kaplica w Wartkowicach |
| 59 | „**Obrzycko**”[?] k/Szamotuł; żona Jana Mierzyńskiego z **Turzewskich**[?] | |
| 61 | „**Działy** Królewskie” we wsi „**Kosiki** Nowy”, gromada „**Malinów**”[?] | |

### Rozbieżności (wewnątrz S07 oraz z S03–S06; nie są scalane)
- Michał Radoszewski: ur. **16 list.** 1865 (S07 s. 7) i **16 lipiec** 1865 (S03 s. 9); w drzewie Drohojowskich „**1866**” (S07 s. 21).
- Henryś (brat Michała): **+1867** (S07 s. 1) i **1870** (S07 s. 16, s. 54; S03; S05).
- Elekcja Władysława IV: „**1630**” (S07 s. 1) i **1632** (S07 s. 5).
- Marek kasztelan wieluński: zm. **1641** (S07 s. 5); „Kasztelan wieluński **1661–1677**” (S07 s. 2, jak przy Andrzeju). Anna z Biskupskich jest żoną Marka (s. 1, 5) albo Andrzeja (s. 58).
- Jerzy podkomorzy: **+1613** (s. 1) i **+1614** (s. 58).
- Bogusław biskup: **+1638** (S07 s. 2, 23) i **+1635** (S05).
- Albin Radoszewski: **1811–1875** (S07 s. 26) i **+1871** (grób, S03 s. 33, S07 s. 54).
- Bolesław Drohojowski: ur. **1850** (S07 s. 18), **1848** (S07 s. 21, S03 s. 9). Jan Drohojowski: zm. **1945** (s. 18, 19) i **1944** (s. 21).
- Antoni Szumowski w krypcie w Uniejowie: **+1855** (S07 s. 54), **1884** (S03), **1885** (S05). Józefat: **+1892** (S07, S03) i **1893** (S05).
- Teofila z Szeliskich: herb **Szeliga** (S07 s. 1, 6; S03) i nadpisany **Lubicz** (S07 s. 7).
- Władysław Prządzyński: ślub z Anną Skrzyńską **14-IV-1870** (S07 s. 33) i **14-VI-1870** (S03 s. 20). Anna Skrzyńska: ur. **28-VII**-1848 (S07 s. 33) i **25-VII** (S03).
- Stanisław Prządzyński (z Kościerzyna): zm. **2-II-1957** (S07 s. 34) i **3-II-1957** (S03).
- Gen. Emilia Prządzyńska: zm. **1885** (S07 s. 31) i **1886** (S07 s. 28, 56; S03). Sylwia, córka generała: **1837+1861** (S07 s. 31) i **+1862** (S07 s. 56; S03).
- Kaplica w Leźnicy (S07 s. 57) podaje daty niezgodne z S03 s. 32 i z S07 s. 32–33: senator Wincenty **+1868** (gdzie indziej 1858), Michalina **+1826**, Pelagia **+1837**, Bolesław **+1855**, Stanisław **+1856**. Salomea opisana jako „żona gen.” (była żoną senatora).
- Edward Prządzyński: „+**1995**” (S07 s. 33) — oczywista omyłka zamiast 1895.
- Żona Franciszka z Neru: **Ludmiła** (S03, S07 s. 26) i **Ludomira** (S07 s. 57).
- Grób na Powązkach kw. 157 rz. 6: „grób **12/13**” (S03) i „grób **1**” (S07 s. 54). Numer ewidencyjny Marii Mierzyńskiej: **13345**/65 (S03) i **13845**/65 (S07 s. 55).
- Józef Radoszewski (1791–1831): ojciec **Jan** (Wielkopolski Słownik Biograficzny) albo **Roch** (Dunin Borkowski). Autorka sama zestawia oba źródła (S07 s. 25).

## S02 — Stefan Łakomy, „Z dziejów Radoszewic” cz. I (1981)

### Nazwiska, miejsca, wyrazy do potwierdzenia
| Strona | Niepewny odczyt | Kontekst / kadr |
|---|---|---|
| 3 | łany „**częściowej**”[?] szlachty; „Jana **Hieronima**[?] i Mikołaja” | Radoszewice 1552 (Pawiński) — `IMG_5831 0.15 0.60 0.95 0.72` |
| 4 | „**Mieczanów**”[?], przyległ. „**Szmury**”[?]; „Kuszyna” (może „Kruszyna”) | dobra Radoszewice 1885 — `IMG_5832 0.15 0.62 0.88 0.80` |
| 5 | „Kuźnica al. **Kuźnica**[?]”; wś. „**Łaski**”[?] (Laski?) | skład dóbr |
| 6 | komora celna „w **Krzytach**”[?], „ze **Krzytowa**”[?] (Krzętów?); „**Skrzelin**”[?] | trakt handlowy (Rosin) — `IMG_5834 0.15 0.49 0.95 0.80` |
| 13 | „skierowany już **ostrzem**[?] wyraźnie” | rokosz |
| 14 | „stężycki **zwoływał**[?]”; „Umożyły się” (sic?) | rokosz |
| 15–16 | Jan **Kurzyński**[?], Maciej **Mowiński**[?], Eliasz **Gołkowski**[?] | szlachta wieluńska 1606 |
| 21 | dopisek na marginesie: „stracił **chyba**[?] Michał Kasztelan Brzeziński 1775 albo Roch Kasztelanic pochowany w Uniejowie **+1828**[?]” | `IMG_5849 0.10 0.20 0.32 0.46 --kolor` |
| 22 | „Z odczytu Franciszka **Borzyka**[?]” | odczyt w 100. rocznicę powstania styczniowego (1963) |
| 23 | „Radoszewicach, **Lipniku**[?] i Kuszynie”; skreślony wyraz w przypisie 32 | gospodarka stawowa 1562–1588 |

### Osobliwości i rozbieżności (nie poprawiane)
- Numeracja przypisów: dwa przypisy „6” (s. 10 i s. 12), brak przypisu 5 (odsyłacz „5” na s. 10), po przypisie 9 (s. 20) od razu przypis 32 (s. 23).
- s. 20: znaczki „*2)” i „+1)” — autor zamienia kolejność dwóch akapitów (sukienka w Pajęcznie / walki z Turkami).
- Jerzy Radoszewski: „wówczas 70-letni” w 1607 r. (s. 18), a zm. 23 X 1614 w wieku 80 lat (s. 9) — ur. ok. 1534, w 1607 miałby ok. 73 lata.
- Jan Węgierski: „pisarz ziemski wieluński” (s. 15) i „sędzia ziemski wieluński” (s. 16).
- Czas posiadania Radoszewic: „przez przeszło VI wieków” (S02 s. 8), „przez ok. 4 wieki” (S10 s. 2, poprawione z 3).
- Słownik geograficzny: S02 s. 6 pomija „17 osad włośc.”, które są w S10 s. 2.
- Roch Radoszewski: na marginesie S02 s. 21 „+1828”[?], we wszystkich innych źródłach (S03, S05, S07) +1820.

## S10 — Stefan Łakomy, praca PTTK „Dwór i założenia parkowe w Radoszewicach” (1978)

| Strona | Niepewny odczyt | Kontekst |
|---|---|---|
| 1 | drobna pieczątka/znak pod datą — nieczytelny | nagłówek |
| 8 | „wybudowania **kuchty**[?] sprzętowej” (bazy? kuźni?) | po latach 50. |
| 8 | „**zwarcie łączący się**”[?] | opis parku |
| 5 | „**Zimogrodzkiego**” — odczyt prawdopodobny | |

Ten sam autor przepisał w S02 i S10 te same cytaty (Słownik geograficzny t. 9 s. 437; ks. W. Prygodzki, „Z przeszłości Wielunia” s. 19). Oba teksty są zgodne co do dat: Jerzy zm. 23 X 1614, Andrzej zm. 1621, Marek zm. 28 XI 1641 w wieku 64 lat. Prygodzki potwierdza też odczyt „Prygodzki” w miejsce „Prygielski?” z inwentaryzacji.
