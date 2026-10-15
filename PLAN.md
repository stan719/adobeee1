# Baza wiedzy o rodzinie Radoszewskich — plan pracy

## Kontekst
Użytkownik ma ok. 200 zdjęć: przewodnik heraldyczny (najstarsze i najcenniejsze informacje, z przypisami), rodzinne zapiski genealogiczne (stare i XX-wieczne, m.in. o grobach i miejscach), pamiętniki oraz monografię majątków ziemi sieradzkiej (4 miejscowości związane z rodziną). Cel: (1) wierne odczytanie wszystkich tekstów, (2) ich uporządkowanie, (3) baza danych z informacjami, gdzie **każda informacja ma wskazane źródło** (dokument, strona, zdjęcie, dosłowny cytat), (4) przeglądanie wszystkiego jako strona internetowa (udostępnianie — później).
Repozytorium `stan719/adobeee1` jest puste (tylko README), gałąź `claude/fervent-fermat-90bstx`.

Decyzje użytkownika:
- Zdjęcia trafią do repozytorium, do `zrodla/zdjecia/` (użytkownik je commituje; ja pobieram `git pull`).
- Wszystkie dane jawne — brak ukrywania osób żyjących.
- Przewodnik heraldyczny pokazywany **tylko w wersji uwspółcześnionej** (oryginał = zdjęcia stron). Wierna transkrypcja stron powstaje jednak jako warstwa robocza w `zrodla/transkrypcje/` — jest niezbędna do kontroli odczytu i do cytatów przy faktach; na stronie nie jest eksponowana dla przewodnika.

## Narzędzia
- **Odczyt zdjęć**: własny wzrok modelu (narzędzie Read na obrazach) — bez zewnętrznego OCR (tesseract niedostępny, a rękopisy i tak by go przerosły).
- **Python 3.13 + Pillow** (dostępne): skrypt do kadrowania, powiększania, podbijania kontrastu i prostowania fragmentów rękopisów — każdą trudną linię czytam na powiększeniu.
- **Python (sqlite3, json)**: walidacja danych i generowanie strony statycznej + eksport do SQLite/CSV.
- **Strona**: statyczny HTML + czysty JS (bez serwera, działa z pliku i z dowolnego hostingu), wyszukiwarka po stronie przeglądarki, mapa Leaflet/OpenStreetMap.
- Git — wszystko wersjonowane, każda poprawka odczytu widoczna w historii.

## Struktura repozytorium
```
zrodla/
  zdjecia/                    # oryginalne zdjęcia (bez zmian)
  katalog.yaml                # zdjęcie -> źródło, strona, jakość, uwagi
  zrodla.yaml                 # opis bibliograficzny źródeł S01, S02… (tytuł, autor, rok, typ)
  transkrypcje/S01/str-012.md # transkrypcja dyplomatyczna 1 strona = 1 plik, segmenty z ID
teksty/                       # teksty złożone w całość, w kolejności
  S01-przewodnik-uwspolczesniony.md   # jedyna wersja „do czytania” przewodnika; przypisy oryginalne + edytorskie
  ...
dane/
  osoby.yaml  miejsca.yaml  wydarzenia.yaml  groby.yaml  majatki.yaml
  twierdzenia.yaml            # atomowe fakty, każdy z odsyłaczem do segmentu źródła
  watpliwosci.md              # lista niepewnych odczytań do sprawdzenia przez użytkownika
narzedzia/
  powieksz.py   waliduj.py   buduj.py
strona/                       # wygenerowana strona (wynik buduj.py)
```

## Etapy

### Etap 0 — Inwentaryzacja (po otrzymaniu zdjęć)
Przejrzenie wszystkich 200 zdjęć, przypisanie każdego do źródła i numeru strony, oznaczenie duplikatów, zdjęć nieostrych/uciętych (lista do ewentualnego dofotografowania), ustalenie kolejności stron. Wynik: `katalog.yaml`, `zrodla.yaml`. Opisy bibliograficzne z kart tytułowych; braki — pytanie do użytkownika.

### Etap 1 — Transkrypcja (wierna, dyplomatyczna)
- Zasada: zapisuję **dokładnie to, co jest na stronie** — oryginalna pisownia, skróty, interpunkcja, podział na wiersze, przypisy, dopiski na marginesach, skreślenia (`~~…~~`), wstawki nad linią. Nic nie poprawiam w tej warstwie.
- Oznaczenia: `[?]` niepewne odczytanie, `[nieczyt.]` nieczytelne, `[…]` ucięte, `[red.: …]` uwaga moja.
- Każdy akapit / wpis dostaje ID segmentu (np. `S03-p12-s04`) — do tego ID przypinane są potem fakty.
- **Kontrola rękopisów — 3 przejścia**:
  1. odczyt całości strony;
  2. niezależne ponowne czytanie linia po linii na powiększonych kadrach (`powieksz.py`), porównanie z wersją 1, rozstrzygnięcie różnic;
  3. weryfikacja krzyżowa nazwisk, imion, dat i nazw miejscowości z innymi źródłami i ze sobą nawzajem (zgodność wieku, kolejności dat, znanych nazw miejscowości ziemi sieradzkiej) — bez „poprawiania” źródła, tylko oznaczanie rozbieżności.
  Pozostałe wątpliwości trafiają do `watpliwosci.md` z kadrem fragmentu — do decyzji użytkownika (np. zna nazwiska z tradycji rodzinnej).
- Druki (przewodnik, monografia): 2 przejścia + kontrola liczb, dat, przypisów.

### Etap 2 — Uporządkowanie i uwspółcześnienie
- Złożenie stron w ciągłe teksty każdego źródła (dyplomatycznie).
- **Przewodnik heraldyczny — wydanie krytyczne**: uwspółcześniona pisownia i interpunkcja, rozwinięte skróty (`[…]`), łacina przetłumaczona, objaśnienie terminów (urzędy ziemskie, herby, „dziedzic na…”), identyfikacja miejscowości z dzisiejszą nazwą, gminą, powiatem; oryginalne przypisy zachowane i powiązane z tekstem, osobno przypisy edytorskie. Struktura: herb → pochodzenie → linie/gałęzie → pokolenia → osoby.
- Zapiski rodzinne: uporządkowane chronologicznie i według gałęzi, z zachowaniem informacji, z którego zapisku pochodzi każdy fragment.
- Monografia: wyodrębnienie 4 miejscowości — historia majątku, właściciele z datami, zabudowa, losy.

### Etap 3 — Baza danych (fakty ze źródłami)
- **Twierdzenie** = najmniejsza informacja: kto/co, jaka relacja/zdarzenie, data, miejsce + `zrodlo`, `strona`, `zdjecie`, `segment`, `cytat` (dosłowny), `pewnosc_odczytu`.
- Encje: osoby (warianty imion/pisowni, daty, urzędy, małżeństwa, rodzice, dzieci), miejsca (nazwy historyczne i dzisiejsze, współrzędne), wydarzenia, groby (cmentarz, kwatera, napis, kto pochowany), majątki (właściciele w czasie), herb.
- **Sprzeczne informacje nie są scalane** — osoba ma np. dwie różne daty urodzenia, każdą z własnym źródłem; ewentualne utożsamienia osób z różnych źródeł oznaczane jako hipoteza z uzasadnieniem.
- **Gwarancja kompletności**: `waliduj.py` sprawdza, że każdy segment transkrypcji jest pokryty co najmniej jednym twierdzeniem albo jawnie oznaczony „bez faktów” (np. ozdobnik); że każde twierdzenie ma źródło; że wszystkie odsyłacze (osoby, miejsca) istnieją; że daty są spójne (np. dziecko nie rodzi się przed rodzicem) — raport rozbieżności.
- Eksport: `radoszewscy.sqlite` + CSV + GEDCOM (do programów genealogicznych).

### Etap 4 — Strona internetowa (po polsku)
- **Start**: o rodzinie, herb, mapa, przegląd źródeł.
- **Osoby**: karta osoby — wszystkie fakty, przy każdym przypis do źródła (klik → transkrypcja i zdjęcie strony z zaznaczonym fragmentem), rodzina, warianty pisowni.
- **Drzewo genealogiczne** interaktywne, z podziałem na gałęzie.
- **Miejsca i majątki**: mapa, strony 4 miejscowości z monografii, właściciele w czasie.
- **Groby i miejsca pamięci**: lista, lokalizacja, napisy.
- **Oś czasu**.
- **Źródła**: każde źródło stronami — zdjęcie obok transkrypcji; przewodnik heraldyczny jako tekst uwspółcześniony z przypisami, z odsyłaczem do zdjęcia oryginalnej strony.
- **Wyszukiwarka** pełnotekstowa (z obsługą wariantów pisowni i bez polskich znaków).
- **Do sprawdzenia**: lista niepewnych odczytań i sprzeczności.

## Kolejność i punkty kontrolne
1. Inwentaryzacja → pokazuję katalog, potwierdzasz podział na źródła.
2. Transkrypcja źródło po źródle, zaczynając od przewodnika heraldycznego; po każdym źródle commit + lista wątpliwości.
3. Teksty uporządkowane + uwspółcześniony przewodnik → do Twojego przejrzenia.
4. Ekstrakcja faktów, walidacja, raport kompletności.
5. Strona; podgląd lokalny (Chromium/Playwright — zrzuty ekranu), potem decyzja o publikacji.
Wszystko commitowane i wypychane na `claude/fervent-fermat-90bstx`.

## Weryfikacja
- `python narzedzia/waliduj.py` — 0 błędów: każdy segment pokryty, każde twierdzenie ze źródłem, spójne odsyłacze, raport sprzeczności.
- Losowa kontrola: 10% twierdzeń sprawdzonych ponownie z oryginalnym zdjęciem.
- `python narzedzia/buduj.py` → otwarcie strony w Chromium (Playwright), zrzuty ekranu kluczowych widoków, test wyszukiwania i linków do źródeł.
