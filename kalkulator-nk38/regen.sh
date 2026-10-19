#!/bin/sh
# Generuje kalkulator + przykłady i przelicza je LibreOffice (żeby pliki miały zapisane wyniki).
set -e
cd "$(dirname "$0")"
T=$(mktemp -d)
python3 build_kalkulator.py "$T/Kalkulator_NK38_v0.xlsx"
python3 build_kalkulator.py "$T/Kalkulator_NK38_v0_przyklad_WAW.xlsx" --przyklad waw
python3 build_kalkulator.py "$T/Kalkulator_NK38_v0_przyklad_KRK.xlsx" --przyklad krk
soffice --headless --convert-to xlsx:"Calc MS Excel 2007 XML" --outdir . "$T"/*.xlsx >/dev/null
rm -rf "$T"
