# Projekt strony „Radoszewscy herbu Oksza” — wersja 2 (październik 2026)

## Co było nie tak w wersji 1
- **Karta osoby była nieczytelna.** Każdy krewny i każdy fakt stał w osobnym „pudełku” z kilkoma plakietkami źródeł („S03 s. 6”, „S04 s. 1”…) i rozwijanymi cytatami. Treść ginęła wśród odsyłaczy.
- **Drzewo nie pokazywało całości.** Domyślnie otwierał się ród Prządzyńskich, rysowany od lewej do prawej w wąskim oknie. Widok „całe drzewo” bywał pusty, a linii Radoszewskich nie dało się zobaczyć naraz.
- **Brakowało narzędzi, które ma każdy serwis genealogiczny**: indeksu nazwisk, przodków i potomków dowolnej osoby, pokrewieństwa dwóch osób.

## Wzór: serwisy GeneWeb (np. Wielcy.pl, Sejm-Wielki.pl)
Przyjęto układ i logikę znane z Wielcy.pl. Prosta, tekstowa karta osoby: rodzice, małżeństwa z dziećmi pod każdym małżeństwem, rodzeństwo. Z każdej karty prowadzą odnośniki „przodkowie / potomkowie / pokrewieństwo”. Źródła są **numerowanymi przypisami** na dole strony, jak w książce.

## Co jest na stronie (wszystko generuje `narzedzia/buduj.py`)

| Strona | Co pokazuje |
|---|---|
| **Start** (`index.html`) | wyszukiwarka, wejścia „Całe drzewo rodu” i „Historia rodu”, linia główna z ojca na syna, lista rodów, najczęstsze nazwiska |
| **Historia rodu** (`historia.html`) | całościowe opracowanie dziejów rodziny (ten sam tekst co plik Word w `Opracowanie/`), ze spisem treści i klikalnymi przypisami |
| **Drzewo** (`drzewo.html`) | wykres **całego drzewa naraz**, w trzech trybach i dwóch widokach (szczegóły niżej) |
| **Osoby** (`osoby.html`) | indeks nazwisk A–Ż; kobiety pod nazwiskiem rodowym i po mężu; przy osobie lata, rodzice, małżonek; filtr |
| **Karta osoby** (`osoba-*.html`) | nagłówek „ur. … zm. … pochowany …” (sprzeczne wersje obok siebie, oznaczone „różne wersje”); rodzice; małżeństwa z dziećmi; rodzeństwo (także przyrodnie); życiorys chronologicznie; uwagi badawcze (warianty zapisu, utożsamienia); tabelka przodków do pradziadków; **przypisy źródłowe** (strona, link do zdjęcia, dosłowny cytat) |
| **Pokrewieństwo** (`pokrewienstwo.html`) | dla dwóch osób: kim jest jedna dla drugiej (np. „bratanek”, „kuzyn”, „krewna w linii bocznej…”), najbliższy wspólny przodek, obie linie oraz najkrótszy łańcuch powiązań (także przez małżeństwa) |
| **Miejsca** (`miejsca.html`, `miejsce-*.html`) | mapa i karty miejsc według kategorii (majątki, groby, kościoły, miejsca życia); na karcie miejsca właściciele w czasie, wydarzenia i przypisy |
| **Groby, Oś czasu** | pochówki według miejsca (osoba raz, przypisy ze wszystkich źródeł); wszystkie datowane informacje według wieków |
| **Źródła** (`zrodla.html`, `zrodlo-S01…S10.html`) | każda strona oryginału: zdjęcie obok wiernej transkrypcji; S01 w wersji uwspółcześnionej |
| **Do sprawdzenia** | niepewne odczyty, rozbieżności, raport kompletności bazy |

### Drzewo — jak działa
- **Potomkowie** (domyślnie: od Jana Wrszowca). Całe drzewo Radoszewskich, 22 pokolenia i ponad 110 osób z małżonkami, na jednym wykresie, od góry do dołu, z etykietami pokoleń (I, II, … jak u Kosińskiego). Wybór rodu z listy: Radoszewscy, Prządzyńscy, Grabińscy, Drohojowscy, Skrzyńscy…
- **Przodkowie** dowolnej osoby. Na przykład dla najmłodszego pokolenia pokazuje naraz wszystkie rody, z których się wywodzi.
- **Rodzina** (klepsydra): przodkowie nad osobą, potomkowie pod nią.
- Obsługa: przeciąganie myszą lub palcem, kółko myszy albo przyciski +/−, „całość” (całe drzewo na ekranie), **mapka w rogu** z zaznaczonym fragmentem, wyszukiwanie osoby (centruje i podświetla), zwijanie i rozwijanie gałęzi, druk.
- Kliknięcie osoby otwiera okienko z odnośnikami: karta osoby, jej przodkowie, potomkowie, rodzina. Przy małżonku są przodkowie, bo wżenione rodziny mają własne drzewa.
- **Lista** to ten sam materiał jako spis z numeracją: dla potomków 1, 1.1, 1.1.2…; dla przodków numeracja Sosy-Kekulego 1, 2, 3… Nadaje się do druku.
- Zasada wierności źródłom: gdy źródła podają różnych rodziców, osoba stoi pod rodzicem z większą liczbą poświadczeń. Drugi przekaz pokazany jest ramką przerywaną („wg innego przekazu”). Nic nie jest scalane.

### Wygląd
Biała, spokojna strona, większa czcionka (17 px), nagłówki szeryfowe w kolorze bordowym, odnośniki niebieskie. Kolory płci w drzewie jak w GeneWeb: niebieski — mężczyzna, czerwony — kobieta. Działa na telefonie i w trybie ciemnym. Strona jest statyczna (czysty HTML i JS), więc działa z pliku bez serwera i na każdym hostingu.

## Budowa
```
python narzedzia/zdjecia_www.py   # kopie zdjęć → strona/skany/ (tylko brakujące)
python narzedzia/historia.py      # teksty/historia/*.md → teksty/historia-rodziny.md + Opracowanie/*.docx
python narzedzia/buduj.py         # cała strona → strona/
python narzedzia/sprawdz_odsylacze.py   # kontrola odsyłaczy ⟨S..⟩ w opracowaniu (0 błędów)
```
Uwaga: na dysku uszkodził się katalog `strona/zdjecia` (Windows: „Plik lub katalog jest uszkodzony i nieczytelny”), więc kopie zdjęć są teraz w `strona/skany/`. Stary katalog można usunąć po sprawdzeniu dysku (`chkdsk C: /f` jako administrator).

## Do decyzji (gdy wrócisz)
1. **Wygląd i układ.** Czy karta osoby, drzewo i indeks są teraz takie, jak trzeba? Co dodać lub zmienić?
2. **Publikacja.** Gdzie umieścić stronę: GitHub Pages (bezpłatnie, adres typu `…github.io`), własna domena czy tylko plik/pendrive dla rodziny? Strona nie wymaga serwera.
3. **Opracowanie** (`Opracowanie/Historia rodziny Boxa-Radoszewskich.docx`) do przejrzenia, zwłaszcza rozdz. 16 „Rozbieżności i pytania otwarte”. Wskazane są tam też zaginione opracowania Anny Radoszewskiej z 1991 roku, których warto poszukać w rodzinie.
4. **Utożsamienia osób** (raport kompletności, sekcja 5) i lista niepewnych odczytów.
