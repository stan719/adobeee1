"""Współrzędne miejsc z OpenStreetMap Nominatim → dane/wspolrzedne.yaml (do przejrzenia).

Użycie: python narzedzia/geokoduj.py
- pyta tylko o miejsca bez `nadrzedne` i o identyfikacji pewnej/prawdopodobnej, których jeszcze nie ma w pliku;
- najpierw szuka w obszarze dawnego Sieradzkiego/Łęczyckiego/Wieluńskiego, potem w całej Polsce, potem bez ograniczeń;
- zachowuje limit 1 zapytanie/s (zasady Nominatim) i nie wysyła żadnych danych osobowych;
- wynik ma `sprawdzone: false` — przed użyciem należy przejrzeć `znaleziono` (buduj.py pokazuje to na stronie).
"""
import json, os, re, time, urllib.parse, urllib.request
import yaml

KORZEN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
PLIK = os.path.join(KORZEN, 'dane', 'wspolrzedne.yaml')
UA = 'radoszewscy-baza-genealogiczna/1.0 (prywatny projekt rodzinny)'
REGION = '17.0,52.7,20.6,50.6'     # lon1,lat1,lon2,lat2 — ziemia sieradzka, łęczycka, wieluńska


def zapytaj(q, **param):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'jsonv2', 'limit': 1, 'accept-language': 'pl', **param})
    time.sleep(1.1)
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
        w = json.load(r)
    return w[0] if w else None


# Po przejrzeniu pierwszego przebiegu (2026-10-16): dokładniejsze zapytania tam, gdzie trafiono w złą miejscowość
# albo nie znaleziono nic (wartość: (zapytanie, kod kraju lub None)).
POPRAWKI = {
    'krempa': ('Krępa, gmina Poddębice', 'pl'), 'koscierzyn': ('Kościerzyn, gmina Wróblew', 'pl'),
    'radoszewice': ('Radoszewice, gmina Siemkowice', 'pl'), 'siemkowice': ('Siemkowice, powiat pajęczański', 'pl'),
    'warszawa': ('Warszawa', 'pl'), 'krakow': ('Kraków', 'pl'), 'grodzisk-mazowiecki': ('Grodzisk Mazowiecki', 'pl'),
    'podkowa-lesna': ('Podkowa Leśna, powiat grodziski', 'pl'), 'poznan': ('Poznań', 'pl'), 'kielce': ('Kielce', 'pl'),
    'rzeszow': ('Rzeszów', 'pl'), 'przemysl': ('Przemyśl, powiat przemyski', 'pl'), 'bytom': ('Bytom, województwo śląskie', 'pl'),
    'jaroslaw': ('Jarosław, powiat jarosławski', 'pl'), 'sokolka': ('Sokółka, powiat sokólski', 'pl'),
    'cieszyn': ('Cieszyn, powiat cieszyński', 'pl'), 'zakopane': ('Zakopane, powiat tatrzański', 'pl'),
    'oliwa': ('Oliwa, Gdańsk', 'pl'), 'janowiec': ('Janowiec, powiat puławski', 'pl'),
    'lysa-gora': ('Święty Krzyż, Nowa Słupia', 'pl'), 'konopnice': ('Konopnica, powiat wieluński', 'pl'),
    'konopnica-widawa': ('Konopnica, powiat wieluński', 'pl'), 'bugaj-radoszewicki': ('Bugaj, gmina Siemkowice', 'pl'),
    'bleszno': ('Błeszno, Częstochowa', 'pl'), 'prusiecko': ('Prusiecko', 'pl'), 'krajkowice': ('Krajkowice, gmina Poddębice', 'pl'),
    'slupia-kepno': ('Słupia pod Kępnem', 'pl'), 'marchwacz': ('Marchwacz', 'pl'), 'katarzynopol': ('Katarzynopol', 'pl'),
    'gabryelow': ('Gabrielów, powiat pajęczański', 'pl'), 'mierzanow': ('Mierzanów', 'pl'),
    'dolina-folwark': ('Dolina, gmina Kiełczygłów', 'pl'), 'kije': ('Kije, powiat pajęczański', 'pl'),
    'deby-laskarzew': ('Dęby, gmina Łaskarzew', 'pl'), 'jarzabkowo': ('Jarząbkowo', 'pl'), 'domanice': ('Domanice, powiat siedlecki', 'pl'),
    'obrzycko': ('Obrzycko', 'pl'), 'czarna': ('Czarna, gmina Wołomin', 'pl'),
    'paryz': ('Paris, France', None), 'londyn': ('London, United Kingdom', None), 'genewa': ('Genève, Suisse', None),
    'nowy-jork': ('New York City', None), 'rzym': ('Roma, Italia', None), 'berlin': ('Berlin, Deutschland', None),
    'drezno': ('Dresden, Deutschland', None), 'praga-czeska': ('Praha, Česko', None), 'lwow': ('Lviv, Ukraine', None),
    'kijow': ('Kyiv, Ukraine', None), 'antony': ('Antony, Hauts-de-Seine', None),
    'montmorency': ("Montmorency, Val-d'Oise", None), 'bolonia-cmentarz': ('San Lazzaro di Savena', None),
    'wlodzimierz': ('Volodymyr, Volyn Oblast', None),
}
# kraje, kontynenty i duże regiony — nie zaznaczamy ich punktem na mapie
ODRZUC = {'brazylia', 'hiszpania', 'szwajcaria', 'francja', 'ameryka', 'libia', 'syberia-wschodnia', 'gubernia-jenisejska',
          'wlodzimierz'}  # wynik: cerkiew w Torczynie — błędny; identyfikacja i tak niepewna
# wyniki pierwszego przebiegu przejrzane i zgodne z kontekstem źródeł
SPRAWDZONE = {'bialystok', 'bochnia', 'sieradz', 'uniejow', 'pniewy', 'charlupia-mala', 'leznica-wielka', 'milanowek',
              'kiernozia', 'brwinow', 'pajeczno', 'wartkowice', 'turek', 'kolo', 'wielun', 'wislica', 'karlsbad', 'marienbad',
              'piotrkow', 'klimontow', 'gniezno', 'opatowek', 'kalisz', 'strykow', 'leczyca', 'poddebice', 'sandomierz',
              'lancut', 'osjakow', 'kielczyglow', 'chorzew', 'kuszyna', 'zmyslona', 'rychlocice', 'stezyca', 'lublin',
              'sroda-wlkp', 'jedrzejow', 'guzow', 'imbramowice', 'warna', 'ozegow', 'raduczyce', 'grodno', 'lida',
              'borowicze', 'gliwice', 'czestochowa-jasna-gora', 'praszka', 'sedziejowice'} | (set(POPRAWKI) - {'wlodzimierz', 'przemysl'})


def oczysc(nazwa):
    n = re.sub(r'\[\?\]|\(.*?\)', '', nazwa)
    n = re.split(r'\s[—–-]\s|/|,', n)[0]
    return re.sub(r'\s+', ' ', n).strip()


def main():
    miejsca = yaml.safe_load(open(os.path.join(KORZEN, 'dane', 'miejsca.yaml'), encoding='utf-8'))
    wyn = yaml.safe_load(open(PLIK, encoding='utf-8')) if os.path.exists(PLIK) else {}
    wyn = wyn or {}
    for i in ODRZUC:
        if i in wyn:
            wyn[i]['odrzucone'] = True
    for i in SPRAWDZONE:
        if wyn.get(i, {}).get('wsp'):
            wyn[i]['sprawdzone'] = True
    for i, (q, kraj) in POPRAWKI.items():
        if wyn.get(i, {}).get('poprawka') == q:
            continue
        r = zapytaj(q, **({'countrycodes': kraj} if kraj else {}))
        wyn[i] = ({'wsp': [round(float(r['lat']), 5), round(float(r['lon']), 5)], 'zrodlo': 'OpenStreetMap Nominatim',
                   'zapytanie': q, 'poprawka': q, 'znaleziono': r['display_name'], 'osm': f'{r["osm_type"]}/{r["osm_id"]}',
                   'sprawdzone': False} if r else {'wsp': None, 'zapytanie': q, 'poprawka': q, 'znaleziono': None})
        print('POPRAWKA', i, '→', (r or {}).get('display_name', 'BRAK')[:100], flush=True)
        yaml.safe_dump(wyn, open(PLIK, 'w', encoding='utf-8'), allow_unicode=True, sort_keys=True, width=200)
    for m in miejsca:
        if m['id'] in wyn or m.get('nadrzedne') or m['pewnosc_identyfikacji'] == 'do_ustalenia':
            continue
        if m['typ'] in ('ulica/dom', 'inny') and not m.get('dzis'):
            continue
        q = m.get('dzis') or oczysc(m['nazwa'])
        r, zakres = None, None
        for zakres, param in (('region', {'viewbox': REGION, 'bounded': 1}), ('Polska', {'countrycodes': 'pl'}), ('świat', {})):
            r = zapytaj(q, **param)
            if r:
                break
        wyn[m['id']] = ({'wsp': [round(float(r['lat']), 5), round(float(r['lon']), 5)], 'zrodlo': 'OpenStreetMap Nominatim',
                         'zapytanie': q, 'zakres': zakres, 'znaleziono': r['display_name'], 'osm': f'{r["osm_type"]}/{r["osm_id"]}',
                         'sprawdzone': False} if r else {'wsp': None, 'zapytanie': q, 'znaleziono': None})
        print(m['id'], '→', zakres if r else 'BRAK', (r or {}).get('display_name', '')[:90], flush=True)
        yaml.safe_dump(wyn, open(PLIK, 'w', encoding='utf-8'), allow_unicode=True, sort_keys=True, width=200)

    yaml.safe_dump(wyn, open(PLIK, 'w', encoding='utf-8'), allow_unicode=True, sort_keys=True, width=200)


if __name__ == '__main__':
    main()
