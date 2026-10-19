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
- [x] Etap 1 — transkrypcja: S01 gotowe (`zrodla/transkrypcje/S01/`, zasady w `zrodla/transkrypcje/ZASADY.md`, wątpliwości w `dane/watpliwosci.md`). Rękopisy: S04, S05, S06 gotowe; S03 gotowe (54 str.), wątpliwości S03–S06 w `dane/watpliwosci.md`. S07 gotowe (61 str.). S10 gotowe (9 str.), S02 gotowe (okładka + 23 str.); wątpliwości S02 i S10 w `dane/watpliwosci.md`. S08 gotowe (okładka + 51 str. + tablica; autor L. Kajzer), S09 gotowe (szkic trasy 2017). Wszystkie źródła S01–S10 przepisane. Podglądy robocze w `robocze/` (poza gitem). Podglądy: `narzedzia/pasy.py`. Narzędzie do powiększeń: `narzedzia/powieksz.py`.
- [~] Etap 2 — uporządkowanie i uwspółcześnienie: gotowe do przejrzenia przez użytkownika — teksty ciągłe `teksty/Sxx-dyplomatyczny.md` (generuje `narzedzia/sklej.py`), `teksty/S01-przewodnik-uwspolczesniony.md` (wydanie krytyczne), `teksty/majatki-4-miejscowosci.md`, `teksty/zapiski-rodzinne-uporzadkowane.md`.
- [x] Etap 3 — baza danych: twierdzenia ze wszystkich źródeł S01–S10 (`dane/twierdzenia/*.yaml`, schemat `dane/SCHEMAT.md`), walidacja `narzedzia/waliduj.py` (0 błędów, pokrycie 100%). Eksport `narzedzia/eksport.py` → `eksport/` (SQLite, CSV, GEDCOM). Raport `narzedzia/raport.py` → `dane/RAPORT-KOMPLETNOSCI.md` — do przejrzenia przez użytkownika (sekcja 5: utożsamienia).
- [~] Etap 4 — strona internetowa, wersja 2 (19.10.2026, po uwagach użytkownika: „mało czytelna”, drzewo ma się wyświetlać całe, wzór Wielcy.pl): nowy układ w stylu GeneWeb — opis i decyzje w **PROJEKT-STRONY.md**. Budowa: `python narzedzia/zdjecia_www.py` (kopie zdjęć → `strona/skany/`; stary `strona/zdjecia` uszkodzony na dysku), `python narzedzia/historia.py`, `python narzedzia/buduj.py`. Do decyzji użytkownika: wygląd, publikacja.
- [~] Opracowanie historii rodziny (zlecone 19.10.2026): części w `teksty/historia/*.md` (Markdown, przypisy `[^x]` z odsyłaczami ⟨segment⟩; kontrola `narzedzia/sprawdz_odsylacze.py`), składane przez `narzedzia/historia.py` w `teksty/historia-rodziny.md` (strona `historia.html`) i **`Opracowanie/Historia rodziny Boxa-Radoszewskich.docx`** (Word z przypisami dolnymi). Do przejrzenia przez użytkownika.
