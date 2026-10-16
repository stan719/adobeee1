# Projekt: baza wiedzy o rodzinie Radoszewskich

Pełny, zatwierdzony przez użytkownika plan pracy jest w **PLAN.md** — przeczytaj go przed rozpoczęciem jakiejkolwiek pracy i trzymaj się go.

Najważniejsze zasady:
- Komunikacja z użytkownikiem po polsku.
- Nie pomijać żadnej informacji ze źródeł; przy każdej informacji zachować źródło (dokument, strona, zdjęcie, cytat).
- Rękopisy odczytywać samodzielnie (bez zewnętrznego OCR), w 3 przejściach, z powiększeniami trudnych fragmentów; niepewne odczytania oznaczać `[?]` i zbierać w `dane/watpliwosci.md`.
- Przewodnik heraldyczny pokazywać na stronie tylko w wersji uwspółcześnionej (wierna transkrypcja = warstwa robocza).
- Wszystkie dane jawne (bez ukrywania osób żyjących).
- Zdjęcia źródłowe: folder `Radoszewscy` na pulpicie użytkownika (lub `zrodla/zdjecia/` w repo).
- Praca na gałęzi `claude/fervent-fermat-90bstx`.

## Stan prac
- [x] Plan zatwierdzony
- [x] Etap 0 — inwentaryzacja: 215 zdjęć, źródła S01–S10 (`zrodla/zrodla.yaml`, `zrodla/katalog.yaml`). Zdjęcia leżą w `Zdjęcia/` (poza gitem, `.gitignore`). Tytuł S08 na razie bez karty tytułowej (decyzja użytkownika). Autorami rękopisów na razie się nie zajmujemy.
- [~] Etap 1 — transkrypcja: S01 gotowe (`zrodla/transkrypcje/S01/`, zasady w `zrodla/transkrypcje/ZASADY.md`, wątpliwości w `dane/watpliwosci.md`). Rękopisy: S04, S05, S06 gotowe; S03 gotowe (54 str.), wątpliwości S03–S06 w `dane/watpliwosci.md`. S07 gotowe (61 str.). S10 gotowe (9 str.), S02 gotowe (okładka + 23 str.); wątpliwości S02 i S10 w `dane/watpliwosci.md`. Następne: S08 (druk), S09 (mapa). Podglądy robocze w `robocze/` (poza gitem). Podglądy: `narzedzia/pasy.py`. Narzędzie do powiększeń: `narzedzia/powieksz.py`.
- [ ] Etap 2 — uporządkowanie i uwspółcześnienie
- [ ] Etap 3 — baza danych
- [ ] Etap 4 — strona internetowa
