# Schemat bazy wiedzy (Etap 3)

Wszystkie dane w YAML (UTF-8), wersjonowane w git. Sprawdza je `python narzedzia/waliduj.py`.

## Zasada naczelna
**Twierdzenie** = najmniejsza informacja ze źródła. Każde twierdzenie ma co najmniej jedno źródło: identyfikator segmentu transkrypcji i **dosłowny cytat** z tego segmentu (walidator sprawdza, że cytat naprawdę tam stoi). Sprzeczne informacje **nie są scalane** — każda wersja to osobne twierdzenie. Utożsamienia osób z różnych źródeł (np. „Michał Edmund” z S07 i „Michał” z S04) są zapisane w `osoby.yaml` jako decyzja z uzasadnieniem.

## Pliki

### `osoby.yaml` — kim jest osoba (bez faktów)
```yaml
- id: radoszewski-jerzy-1902        # nazwisko-imię-rok (rok orientacyjny, tylko do odróżnienia)
  imiona: [Jerzy, Józefat]
  nazwisko: Radoszewski
  nazwisko_rodowe: null               # dla kobiet: nazwisko panieńskie
  przydomek: Boxa
  herb: Oksza
  plec: m
  warianty: ["Jerzy Radoszewski Boxa", "Jerzy Józefat", "Tatuś"]
  utozsamienie: "…"                   # uzasadnienie, gdy osoba łączy wzmianki z kilku źródeł
  uwagi: null
```

### `miejsca.yaml`
```yaml
- id: krempa
  nazwa: Krempa                       # nazwa używana w źródłach
  warianty: [Krępa]
  typ: wieś | miasto | majątek | cmentarz | kościół | kaplica | ulica/dom | region | inny
  dzis: "Krępa, gm. Poddębice, pow. poddębicki, woj. łódzkie"   # tylko gdy pewne
  wsp: null                           # [szer, dł] — uzupełniane w Etapie 4 (geokodowanie), z podaniem źródła
  nadrzedne: null                     # np. cmentarz → miejscowość
  pewnosc_identyfikacji: pewna | prawdopodobna | do_ustalenia
  uwagi: null
```

### `twierdzenia/<źródło>.yaml` (np. `twierdzenia/S04.yaml`)
```yaml
- id: S04-017                       # <źródło>-<nr>; źródło = to, z którego pochodzi pierwszy cytat
  podmiot: radoszewski-jerzy-1902     # id osoby lub miejsca
  relacja: urodzenie                  # słownik niżej
  obiekt: null                        # id osoby/miejsca, gdy relacja łączy dwa byty
  wartosc: null                       # tekst (np. nazwa urzędu, opis)
  data: {tekst: "1902", od: 1902, do: 1902}   # tekst jak w źródle; od/do — rok (lub YYYY-MM-DD) do sortowania
  miejsce: krempa
  zrodla:
    - segment: S04-p01-s01
      cytat: "Jerzy Radoszewski Boxa h. Oksza 1902+1967"
  pewnosc_odczytu: pewna | niepewna   # niepewna, gdy cytat zawiera [?] lub odczyt sporny
  uwagi: null
```

**Słownik relacji:** `urodzenie`, `smierc`, `pochowek`, `chrzest`, `slub` (obiekt = małżonek), `malzonek`, `rodzic` (podmiot = dziecko, obiekt = rodzic), `rodzenstwo`, `urzad` (wartosc), `zawod`, `wyksztalcenie`, `odznaczenie`, `wlasnosc` (obiekt = miejsce/majątek), `zamieszkanie`, `udzial_w_wydarzeniu`, `fundacja`, `herb`, `opis` (dowolna inna informacja — wartosc = streszczenie).

### `literatura.yaml`
Pozycje bibliograficzne wymieniane w źródłach (spisy lektur, przypisy bibliograficzne). Fragment źródła, który zawiera tylko bibliografię, jest pokryty przez wpis tutaj.
```yaml
- id: dunin-borkowski-almanach-1908
  opis: "Jerzy hr. Dunin Borkowski, Almanach Błękitny. Genealogia żyjących rodów polskich, 1908"
  dotyczy: "Drohojowscy s. 321; Radoszewscy s. 1109"
  segmenty: [S06-p01-s02]
```

### `bez_faktow.yaml`
Segmenty jawnie oznaczone jako niezawierające faktów (np. pagina, ozdobnik, sam nagłówek strony), z powodem:
```yaml
- segment: S01-p133-s00
  powod: pagina
```

## Kontrole walidatora
1. Każde twierdzenie ma ≥1 źródło; segment istnieje; cytat występuje w tekście segmentu (porównanie po ujednoliceniu spacji i znaków podziału wierszy).
2. Odsyłacze `podmiot`, `obiekt`, `miejsce` istnieją w `osoby.yaml` / `miejsca.yaml`.
3. Pokrycie: każdy segment transkrypcji jest użyty w twierdzeniu albo wpisany do `bez_faktow.yaml` (raport braków dla każdego źródła).
4. Spójność dat (tylko raport, bez poprawiania): śmierć przed urodzeniem, dziecko urodzone przed rodzicem lub >60 lat po matce, ślub przed 14. rokiem życia.
5. Sprzeczności: ta sama osoba + ta sama relacja jednorazowa (urodzenie, śmierć) z różnymi datami → raport „wersje”.
