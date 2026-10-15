# Zasady transkrypcji (warstwa dyplomatyczna)

Jeden plik = jedna strona źródła: `zrodla/transkrypcje/<źródło>/str-<nr>.md` (druki: numer drukowany, 3 cyfry; rękopisy: kolejny numer strony wg `katalog.yaml`).

## Nagłówek pliku (YAML)
```yaml
zrodlo: S01
strona: "132"
zdjecie: "IMG_5811(1).JPEG"
polozenie: lewa strona rozkładówki
przejscia: [1, 2]        # wykonane przejścia kontrolne (rękopisy: 1, 2, 3)
```

## Segmenty
Każdy akapit, wpis, nagłówek lub przypis to osobny segment z nagłówkiem `## <ID>`, gdzie ID = `<źródło>-p<strona>-s<nr>` (np. `S01-p133-s04`). Przypisy dostają ID `…-f<nr>` (np. `S01-p133-f1`). Pod nagłówkiem może stać wiersz `typ:` (`tekst`, `naglowek`, `przypis`, `pagina`, `dopisek`), a niżej tekst segmentu.

Akapit przechodzący na następną stronę kończy się znakiem `→`, a jego dalszy ciąg na następnej stronie zaczyna się od `←`.

## Tekst
- Zachowuję podział na wiersze, pisownię, interpunkcję, skróty, wielkie litery i dywizy przenoszenia (`zna-` / `czną`) dokładnie tak jak w oryginale.
- Kursywa: `*…*`. Pogrubienie / tłusty druk: `**…**`. Rozstrzelenie (spacjowanie): `{rozstrz: …}`.
- Odsyłacz do przypisu: `^1)` (tak jak w druku: `¹)`).
- Skreślenie: `~~…~~`. Wstawka nad linią: `{nad: …}`. Dopisek na marginesie: osobny segment `typ: dopisek` z opisem miejsca.
- Podkreślenie (odręczne) w tekście drukowanym: `{podkr: …}`.

## Oznaczenia niepewności
- `[?]` po wyrazie — odczytanie niepewne.
- `[nieczyt.]` — nieczytelne; `[nieczyt. 2 wyr.]` — liczba wyrazów.
- `[…]` — tekst ucięty / poza kadrem.
- `[red.: …]` — uwaga moja (redakcyjna), nigdy nie jest częścią źródła.

Każde `[?]` i `[nieczyt.]` trafia też do `dane/watpliwosci.md` z odsyłaczem do segmentu i kadru.
