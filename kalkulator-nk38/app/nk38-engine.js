/* Silnik obliczeń NK38 - port 1:1 z model_nk38.py (ta sama logika co Excel v1).
   Działa w przeglądarce (window.NK38) i w Node (module.exports). */
(function (root) {
  "use strict";

  var WARIANTY = ["2000 kg", "2500 kg", "2000 kg + słupki", "2500 kg + słupki"];
  var OSOBY_ANALIZA = [2, 3, 4, 5, 6, 7];

  /* Stałe kalkulacyjne (domyślne wartości szablonu NK38). */
  var CENNIK = {
    cena_D: 32500, wsp_S: 0.61, wsp_NP: 0.85, q2500: 0.07, dl_wsp: 0.00127,
    agregat: 6500, olej: 1500, hydr_drobne: 200, transp_agregatu: 500, transp_silownikow: 50,
    sil_1700: 1080, sil_2000: 1175, sil_2250: 1250,
    magistrala: 0.2 * 11 + 0.4 * 11 + 2 * 14 + 6 * 11 + 6 * 5 + 6 * 10,
    barierka: 600, maskownica: 700, skrzynka_zasil: 1000, admin: 1800,
    mal_S: 6400, mal_D: 13500, mal_bar: 200, slupek: 1700, slupek22: 6300, slupek_rbd: 0.37,
    osd_magistrala: 0.5, osd_barierka: 0.5,
    rozl_TIR: 0.5, dzwig: 2400, dzwig_D: 5, dzwig_wspS: 0.6,
    dni_tydzien: 5, km_montaz_dodatek: 50, km_krakow: 20, km_dzien: 650,
    spalanie: 12, paliwo: 9.4, pomiary_osoby: 1, odbiory_osoby: 2, odbiory_wyjazdy: 1,
    stawka_1: 500, stawka_2: 400, stawka_kolejna: 350, dieta: 45, hotel: 130,
    kob: 0.005, gdw: 0.025, podatek: 0.14
  };

  /* Teksty oferty zależne od urządzenia (pusta uwaga = tekst wspólny z ustawień oferty). */
  function tekstyNK38() {
    return {
      obciazenie: "Obciążenie platformy: 2000kg/miejsce postojowe, 500kg/koło;",
      zabezpieczenie: "Zabezpieczenie antykorozyjne: urządzenie zabezpieczone ocynkiem ogniowym oraz częściowo lakierowane.",
      barierki: "Zabezpieczenie po bokach: barierki systemowe lub profile zmniejszające prześwit poziomy mocowane do ścian wszędzie tam gdzie istnieje przerwa pomiędzy platformami bądź platformami i ścianami co najmniej 20cm, zg. z PN.",
      opcjaQ2500: "Obciążenie platformy: 2500kg/miejsce postojowe, 625kg/koło.",
      uwagaTech: "",
      wstep: "", tech: "", poLiscie: "", agregat: "", kw: "", platnosci: "", dostawa: "", gw: "", zakres: "", warunki: "", gwarancja: ""
    };
  }
  /* Szablon urządzenia: wszystko, co różni jedno urządzenie od drugiego.
     Użytkownik edytuje go w panelu Szablony urządzeń. */
  function szablonNK38() {
    return {
      id: "nk38", nazwa: "NK38", wbudowany: true,
      opisOferty: "Urządzenia {typ} do niezależnego parkowania pojazdów (z zagłębieniem)",
      teksty: tekstyNK38(),
      typy: {
        S: { nazwa: "Platformy S", mp: 2, osd: 5.5, oferta: "{n} szt. – {typ}-S szer. użytkowa platformy 250cm, szer. zewnętrzna urządzenia 280cm," },
        D: { nazwa: "Platformy D", mp: 4, osd: 7, oferta: "{n} szt. – {typ}-D szer. użytkowa platformy 500cm, szer. zewnętrzna urządzenia 530cm," },
        NP: { nazwa: "Systemy N.P.", mp: 2, osd: 7, oferta: "{n} szt. – {typ} dla osób niepełnosprawnych," }
      },
      cennik: Object.assign({}, CENNIK),
      glebokosci: [[175, 0, "2000"], [180, 500, "2000"], [185, 550, "2000"], [190, 600, "2000"], [195, 650, "2000"],
        [200, 700, "2000"], [210, 750, "2250"], [220, 800, "2250"], [225, 850, "2250"]].map(function (g) {
        return { cm: g[0], doplata: g[1], silownik: g[2] };
      }),
      szerokosci: { S: [{ nazwa: "260 cm", cena: 1170 }, { nazwa: "270 cm", cena: 1560 }], D: [{ nazwa: "520 cm", cena: 1820 }, { nazwa: "540 cm", cena: 3110 }] },
      dlugosci: [{ nazwa: "500–510 cm", tryb: "kwota", wartosc: 2340 }, { nazwa: "540 cm", tryb: "cm", wartosc: 10 }, { nazwa: "550 cm", tryb: "cm", wartosc: 20 }],
      skladowe: [
        ["Łańcuch 20B-1 (mb)", 45, 9.6, 9.6, "Mechanika"], ["Ogniwo złączne proste 20B-1", 8, 4, 4, "Mechanika"],
        ["Koło łańcuchowe z piastą 20B-1 Z10", 36, 2, 2, "Mechanika"], ["Koło łańcuchowe z piastą 20B-1 Z16", 90, 2, 2, "Mechanika"],
        ["Listwa zębata M4", 207.28, 2, 2, "Mechanika"], ["Koło zębate z piastą M4 Z20", 40.14, 2, 2, "Mechanika"],
        ["Tuleja PAF40x260P10", 3.3, 2, 2, "Mechanika"], ["Tuleja PAF 5025 P10", 10.8, 2, 2, "Mechanika"],
        ["Tuleja TBR40x44x50", 10.95, 2, 2, "Mechanika"], ["Podkładka PTFE 50,5x69x2", 3.81, 2, 2, "Mechanika"],
        ["Podkładka PTFE 42x66x1,5", 2.84, 4, 4, "Mechanika"], ["Tuleja PAF40x400P10", 4.4, 4, 4, "Mechanika"],
        ["Podkładki gumowe pod stopę siłownika i słup (kpl)", 97.12, 1, 1, "Mechanika"],
        ["Śruby i elementy złączne - kpl S", 345, 1, 0, "Mechanika"], ["Śruby i elementy złączne - kpl D", 546, 0, 1, "Mechanika"],
        ["Tulejki podłogi", 2.98, 110, 208, "Mechanika"], ["Kotwa M16 + ampułka", 8.08, 20, 20, "Mechanika"],
        ["Podkładki gumowe pod kotwy (kpl)", 5.4, 1, 1, "Mechanika"], ["Transport materiałów (bez MTZ)", 300, 1, 1, "Mechanika"],
        ["Ogranicznik koła", 40, 1, 1, "Mechanika"], ["Rurki gotowe na platformie - S", 172, 1, 0, "Hydraulika"],
        ["Rurki gotowe na platformie - D", 207, 0, 1, "Hydraulika"], ["Elementy złączne Argo Hytos + magistrala 5 mb + wąż", 240, 1, 1, "Hydraulika"],
        ["Elektryka - skrzynka krosowa", 90, 1, 1, "Elektryka"], ["Elektryka - przewody + rurki S", 92, 1, 0, "Elektryka"],
        ["Elektryka - przewody + rurki D", 112, 0, 1, "Elektryka"], ["Elektryka - sterownia (puszka+stac+przyc+notaus+szyld)", 170, 1, 1, "Elektryka"]
      ].map(function (x) { return { nazwa: x[0], cena: x[1], ilS: x[2], ilD: x[3], grupa: x[4] }; })
    };
  }
  function szablonNK37() {
    var s = szablonNK38();
    s.id = "nk37"; s.nazwa = "NK37"; s.cennik.cena_D = 32500 + 700;
    return s;
  }
  /* Pusty szablon do nowego urządzenia: zerowe ceny platform, siłowników i malowania, puste tabele.
     Koszty firmowe (ekipa, transport, narzuty) i akcesoria zostają jak w NK38 - do zmiany w edytorze. */
  function szablonPusty() {
    var s = bazaLista();
    s.id = "pusty"; s.nazwa = "Nowe urządzenie"; s.wbudowany = false;
    s.pozycje = []; s.wariantB = { nazwa: "2500 kg", tryb: "%", wartosc: 0, waluta: "PLN" };
    s.teksty = Object.assign(tekstyNK38(), { barierki: "", opcjaQ2500: "",
      wstep: "przedstawiamy {oferte} na dostawę i montaż {n} urządzeń {typ} na inwestycję zlokalizowaną {garaz}.",
      tech: "Prześwit: min. {P}cm;\nWysokość parkowanych pojazdów*: ▲-{G}cm;" });
    s.wysokosci = { tryb: "przeswit", k: 15, dol: 0 };
    s.opisOferty = "Urządzenia {typ} do niezależnego parkowania pojazdów";
    s.typy = {
      S: { nazwa: "Urządzenia typ 1", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "{n} szt. – {typ}" },
      D: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" },
      NP: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" }
    };
    ["cena_D", "wsp_S", "wsp_NP", "dl_wsp", "sil_1700", "sil_2000", "sil_2250", "mal_S", "mal_D"].forEach(function (k) { s.cennik[k] = 0; });
    s.glebokosci = [];
    s.szerokosci = { S: [{ nazwa: "", cena: 0 }, { nazwa: "", cena: 0 }], D: [{ nazwa: "", cena: 0 }, { nazwa: "", cena: 0 }] };
    s.dlugosci = [0, 1, 2].map(function () { return { nazwa: "", tryb: "kwota", wartosc: 0 }; });
    s.skladowe = [];
    return uzupelnijSzablon(s);
  }
  /* Szablon bazowy modelu "lista pozycji": bez tabel NK38 (zagłębienia, składowe, siłowniki). */
  function bazaLista() {
    var s = szablonNK38();
    s.model = "lista"; s.glebokosci = []; s.skladowe = [];
    s.szerokosci = { S: [], D: [] }; s.dlugosci = [];
    s.opcje = { rozladunekNaTransport: false, przeglad: true, konserwacjaNa: "MP", agregaty: false, dodatkiNK38: false, wymiary: false };
    return s;
  }

  /* NK6501: palety poprzecznie przesuwne (kalkulator Verdiego, 16.12.2025). */
  function szablonNK6501() {
    var s = bazaLista();
    s.id = "nk6501"; s.nazwa = "NK6501";
    s.opisOferty = "sprzedaż - Paleta poprzecznie przesuwna {typ} do niezależnego parkowania pojazdów.";
    s.typy = {
      S: { nazwa: "Palety NK6501", mp: 1, osd: 4.5, cena: 9500, waluta: "PLN", dzwig: 0,
        oferta: "{n} szt. - Paleta poprzecznie przesuwna {typ}-210cm, zaopatrzona w silnik 400V, 50Hz, 0,25kW, wyposażona w kluczykowy panel sterowania zamontowany na słupie/ścianie przed urządzeniem." },
      D: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" },
      NP: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" }
    };
    s.pozycje = [
      { id: "silnik", nazwa: "Silnik, przekładnia i reszta", cena: 1000, waluta: "PLN", naCo: "S", wsp: 1, osd: 0, opcja: false, tekst: "" },
      { id: "mufas", nazwa: "Sterowanie palet (Mufas)", cena: 0, waluta: "PLN", naCo: "kwota", wsp: 1, osd: 0, opcja: false, tekst: "" },
      { id: "malowanie", nazwa: "Malowanie RAL", cena: 500, waluta: "PLN", naCo: "S", wsp: 1, osd: 0, opcja: true, tekst: "Malowanie proszkowe palet w kolorze RAL wybranym przez Zamawiającego." }
    ];
    s.wariantB = { nazwa: "", tryb: "%", wartosc: 0, waluta: "PLN" };
    s.opcje.przeglad = false; s.opcje.slupki = false;
    s.wysokosci = { tryb: "przeswit", k: 15, dol: 0 };
    s.domyslne = { zysk: 0.11, zysk2: 0.10, konserwA: 50, konserwB: 60, tir: 1, tir_cena: 3500, rozl_cena: 3000 };
    Object.assign(s.cennik, { stawka_1: 450, stawka_2: 350, stawka_kolejna: 350, hotel: 130, dieta: 45, odbiory_osoby: 1, dzwig: 0 });
    s.teksty = Object.assign(tekstyNK38(), {
      obciazenie: "Obciążenie palety pojazdem: 2000kg/miejsce postojowe,",
      zabezpieczenie: "Zabezpieczenie antykorozyjne: urządzenie w całości ocynkowane ogniowo.",
      barierki: "", opcjaQ2500: "",
      uwagaTech: "*w zależności od zastanej wysokości hali garażowej pomieścimy pojazdy w podanych granicach lub wyższych jeśli prześwit będzie na to pozwalał.",
      wstep: "w odpowiedzi na Państwa zapytanie przedstawiamy naszą ofertę na dostawę i montaż {n} palet poprzecznie przesuwnych {typ} ze sterowaniem na inwestycję zlokalizowaną {garaz}.\nZastosowanie palet przesuwnych wymaga zachowania zasad projektowania odwodnienia garażu dla tego typu zastosowań ponieważ torowiska, po których poruszają się palety, nie mogą przebiegać przez załamania spadków posadzki. Musi być zachowana równość posadzki, po której poruszać będą się palety.",
      tech: "Zagłębienie: brak,\nPrześwit między-kondygnacyjny: min. {P}cm,\nWysokość parkowanych pojazdów*: ▲-{G}cm,",
      platnosci: "30% zaliczka płatna na 20 tygodni przed dostawą,\ndo 60% płatność na 5 dni przed dostawą,\ndo 90% płatność do 14 dni po dostawie,\ndo 100% płatność do 30 dni po montażu.\nOferta ważna jest 1 miesiąc.",
      dostawa: 20, gw: "60",
      zakres: "Dostawa na plac budowy urządzeń parkingowych, montaż, rozruch wyłącznie palety {typ}, wraz z kompletem dokumentów oraz przeprowadzeniem szkolenia Zamawiającego.\nPoza ofertą pozostają: koszty ogólne budowy, ubezpieczenia budowy, wszelkie roboty budowlano-wykończeniowe obiektu, wykonanie napraw tynkarsko-malarskich, np. po montażu urządzeń sterowniczych, wyposażenia w instalację przeciw pożarową, wentylacyjną, elektryczną obiektu, sygnalizacyjną, oznaczeń pionowych i poziomych bezpieczeństwa i organizacji ruchu na terenie obiektu (w tym numeracja miejsc postojowych) oraz pomiarów elektrycznych linii zasilających (wykonywanych przez budowę).",
      warunki: "Wszelkie elementy konstrukcyjne garażu powinny być wykonane dokładnie i zgodnie z dokumentacją projektową oraz naszymi wytycznymi. Powierzchnie podłoży wykonane z betonu C20/25 o odpowiedniej nośności, pozostające w stanie suchym i nie pylące. Wszelkie roboty budowlane, instalacyjne i wykończeniowe oraz sprzątanie należy zakończyć przed przystąpieniem do montażu urządzeń parkingowych. Na czas montażu należy zapewnić dostęp do energii elektrycznej w docelowym punkcie odbioru energii przy skrzyniach sterujących, zlokalizowanych w bezpośrednim sąsiedztwie montażu. Wymagane jest oświetlenie zgodne z normą DIN 67528 \"Oświetlenie miejsc parkingowych\". Elementy wszelkich instalacji: kanalizacyjnej, wentylacyjnej, wodnej, elektrycznej, oświetleniowej, detekcyjnej (ochronnej dymowej) i innych nie powinny być umiejscowione w przestrzeni ruchu palet do wysokości {P}cm dla parkowanych na paletach pojazdów o wysokości {G}cm. Równość posadzki, po której poruszać będą się palety zgodna z normą DIN EN 18202 Tab.3, wiersz 3 - odpowiednio dla tego typu zastosowań. Nie dopuszczalne są załamania spadków posadzki na drodze poruszania się palet (wzdłuż torowisk). Dopuszczalny jednolity spadek 0,5-1,5%.\nZamawiający powinien umożliwić dojazd samochodem ciężarowym o długości 18m do miejsca składowania, rozładowania oraz przetransportowania elementów urządzeń na miejsce montażu. Minimalne wymiary przejazdów to 2.05m wysokości i ok. 4,00m szerokości.\nPonadto, Zamawiający zobowiązany jest w zakresie zasilania elektrycznego urządzeń {typ} do wykonania:\n1. Zabezpieczenia głównego zwłocznego 3x16A dla każdego zespołu palet włączonych do jednej skrzyni sterowej max. 2,5kW, 400V, 50Hz;\n2. Zasilania do rozłącznika głównego przewodem 3Ph+N+PE 5x2.5mm2;\n3. Rozłącznika głównego blokowanego 16A 3Ph+1N - w miejscu ustalonym z dostawcą urządzeń;\n4. Doprowadzenia przewodu 5x2,5 mm2 od rozłącznika do skrzyni sterowniczej;\n5. Doprowadzenia instalacji uziemiającej do każdej szyny i skrzyni sterowej.",
      gwarancja: "Producent udziela {gw} miesięcznej gwarancji jakości na sprawne działanie urządzeń pod warunkiem podpisania z dostawcą i utrzymania w mocy umowy konserwacyjno - serwisowej, umożliwiającej nam stałą opiekę oraz nadzór nad stanem technicznym platform. W ramach umowy serwisowej dokonywane są 2 przeglądy serwisowe w ciągu roku. Gwarancja nie obejmuje zużycia części eksploatacyjnych, uszkodzeń wynikających z eksploatacji niezgodnej z instrukcją użytkowania, agresywnego środowiska, zbyt dużej wilgotności, uszkodzeń powstałych w wyniku zdarzeń losowych (np. pożar, zalanie). Po upływie okresu gwarancji świadczymy serwis pogwarancyjny."
    });
    return s;
  }

  /* NKPXLH: platformy zależne z importu (kalkulator Witosa 24, 9.10.2026). Cena 2300 USD/szt. + fracht kontenerowy. */
  function szablonNKPXLH() {
    var s = bazaLista();
    s.id = "nkpxlh"; s.nazwa = "NKPXLH";
    s.opisOferty = "Platformy służące do zależnego parkowania pojazdów {typ}";
    s.typy = {
      S: { nazwa: "Urządzenia NKPXLH", mp: 2, osd: 2, cena: 2300, waluta: "USD", dzwig: 0.06,
        oferta: "{n} szt. – NKPXLH szer. użytkowa miejsca postojowego 250cm;" },
      D: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "USD", dzwig: 0, oferta: "" },
      NP: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "USD", dzwig: 0, oferta: "" }
    };
    s.import = { wl: true, ubezpWartosc: 2290, ubezpWaluta: "USD", ubezpStawka: 0.0014, ubezpWsp: 1.1, koszty: [
      ["EXW (fracht morski)", 7000, "USD"], ["THC Gdańsk", 250, "EUR"], ["ISPS Gdańsk", 25, "EUR"], ["Opłaty dodatkowe", 100, "EUR"],
      ["FEU", 70, "EUR"], ["MHF", 50, "EUR"], ["Zgłoszenie celne", 290, "PLN"], ["Sealing", 270, "USD"],
      ["Przeładunek: port - magazyn", 800, "PLN"], ["Handling in", 550, "PLN"], ["Handling out", 550, "PLN"],
      ["Dokumentacja", 70, "PLN"], ["Magazyn - Metazet", 3700, "PLN"]
    ].map(function (x) { return { nazwa: x[0], kwota: x[1], waluta: x[2] }; }) };
    s.pozycje = [
      { id: "hydr", nazwa: "Hydraulika PXL (140 + 65 + 29 EUR/szt.)", cena: 234, waluta: "EUR", naCo: "szt", wsp: 0.2, osd: 0, opcja: false, tekst: "" }
    ];
    s.wariantB = { nazwa: "2500 kg", tryb: "szt", wartosc: 700, waluta: "USD" };   // 2500 kg: 3000 USD/szt. zamiast 2300
    s.opcje.rozladunekNaTransport = true; s.opcje.konserwacjaNa = "szt"; s.opcje.agregaty = true; s.opcje.slupki = false;
    s.wysokosci = { tryb: "przeswit2", k: 20, dol: 170 };
    s.domyslne = { zysk: 0.28, zysk2: 0.255, konserwA: 35, konserwB: 45, tir: 1, tir_cena: 3500, rozl_cena: 2800, eur: 4.33, usd: 3.86 };
    Object.assign(s.cennik, { stawka_1: 550, stawka_2: 400, stawka_kolejna: 350, hotel: 130, dieta: 45, odbiory_osoby: 2, odbiory_wyjazdy: 2, dzwig: 1200, rozl_TIR: 1 });
    s.teksty = Object.assign(tekstyNK38(), {
      obciazenie: "Obciążenie platformy: 2.000kg/miejsce;",
      zabezpieczenie: "Zabezpieczenie antykorozyjne: platforma ocynkowana ogniowo, słupy malowane.",
      barierki: "", opcjaQ2500: "Obciążenie platformy: 2.500kg/miejsce.",
      uwagaTech: "*parametry pojazdów dopuszczonych do wjazdu w obręb urządzeń są zależne od wysokości prześwitu dostępnego na danym miejscu w garażu. Możliwa jest inna konfiguracja wysokości podnoszenia platformy.",
      wstep: "przedstawiamy {oferte} na dostawę i montaż {n} urządzeń służących do zależnego parkowania {mp} pojazdów na inwestycję zlokalizowaną {garaz}.",
      tech: "Zagłębienie: brak;\nWysokość prześwitu: {P}cm;\nWysokość parkowanych pojazdów*: ▲-{G}cm, ▼-{D}cm;\nDługość parkowanych pojazdów: ▲-{M}cm, ▼-{M}cm;",
      poLiscie: "Urządzenia wyposażone są w kluczykowe sterownie zamontowane na słupach/ścianach przed rzędem urządzeń.",
      agregat: "agregat hydrauliczny 400V, 50Hz, 3kW", kw: "3kW",
      platnosci: "30% zaliczka płatna na 24 tygodnie przed dostawą,\nDo 60% płatność na 7 dni przed dostawą,\nDo 90% płatność do 14 dni po dostawie,\nDo 100% płatność do 21 dni po badaniu wstępnym UDT.\nKoszty ogólne budowy – 0%.\nOferta ważna jest 2 miesiące.",
      dostawa: 22, gw: "36",
      zakres: "Dostawa na plac budowy urządzeń parkingowych, montaż, rozruch i doprowadzenie do badań ruchowych poprzedzających wydanie Decyzji o Dopuszczeniu do Użytkowania wraz z kompletem dokumentów określonych przepisami UDT. Koszty badań UDT obciążają Zamawiającego.\nPoza ofertą pozostają: koszty przeprowadzenia badania przez UDT, wszelkie roboty budowlano-wykończeniowe obiektu, wykonanie barier stałych zabezpieczających dostęp pod platformy z tyłu lub z boku przy ciągach pieszo-jezdnych w przypadku braku ścian (kiedy konieczne, zgodnie z naszymi wytycznymi), wykonanie przepustów przez ściany działowe o średnicy fi 100mm dla przeprowadzenia przewodów elektrycznych i hydraulicznych (kiedy konieczne, zgodnie z naszymi wytycznymi), napraw tynkarsko-malarskich po montażu urządzeń sterowniczych oraz mocowań konstrukcyjnych, wyposażenia w instalację przeciw-pożarową, wentylacyjną, elektryczną obiektu, sygnalizacyjną, oznaczeń pionowych i poziomych organizacji ruchu na terenie parkingu.",
      warunki: "Wszelkie elementy konstrukcyjne garażu powinny być wykonane dokładnie i zgodnie z dokumentacją projektową oraz naszymi wytycznymi. Powierzchnie podłoży wykonane z betonu C20/25, pozostające w stanie suchym i nie pylące. Wszelkie roboty budowlane, instalacyjne i wykończeniowe oraz sprzątanie należy zakończyć przed przystąpieniem do montażu urządzeń parkingowych. Jeśli to konieczne należy wykonać przepusty przez ścianki oddzielające platformy parkingowe zgodnie z wytycznymi dostawcy urządzeń. Zamawiający powinien umożliwić dojazd samochodem ciężarowym o długości 18m do miejsca składowania, rozładować oraz przetransportować elementy urządzeń na miejsce montażu oraz zapewnić dostęp do energii elektrycznej w obrębie montażu.\nPonadto, Zamawiający zobowiązany jest w zakresie zasilania elektrycznego urządzeń parkingowych do wykonania:\n1. Zabezpieczenia głównego zwłocznego 3x16A dla każdego agregatu {kw}, 400V, 50Hz;\n2. Zasilania do rozłącznika głównego przewodem 3Ph+N+PE 5x2.5mm2;\n3. Rozłącznika głównego blokowanego 16A 3Ph+1N – w miejscu ustalonych z dostawcą platform;\n4. Doprowadzenia przewodu 5x2,5 mm2 od rozłącznika do skrzyni sterowniczej;\n5. Doprowadzenia instalacji uziemiającej do każdego prawego/lewego słupa urządzenia.",
      gwarancja: "Producent udziela {gw} miesięcznej gwarancji jakości na sprawne działanie urządzeń pod warunkiem podpisania z dostawcą i utrzymania w mocy umowy konserwacyjno-serwisowej, umożliwiającej nam stałą opiekę oraz nadzór nad stanem technicznym platform. W ramach umowy serwisowej dokonywane są 2 przeglądy serwisowe w ciągu roku.\nGwarancja nie obejmuje zużycia części eksploatacyjnych, uszkodzeń wynikających z eksploatacji niezgodnej z instrukcją użytkowania, agresywnego środowiska, zbyt dużej wilgotności, uszkodzeń powstałych w wyniku zdarzeń losowych (np. pożar, zalanie). Po upływie okresu gwarancji świadczymy serwis pogwarancyjny."
    });
    return s;
  }
  /* NK41: platformy zależne pochylane (kalkulator "-NK3 2T A .10.26", oferta Żegiestowska 5 Wrocław). Koszty produkcji z dołu arkusza. */
  function szablonNK41() {
    var s = bazaLista();
    s.id = "nk41"; s.nazwa = "NK41";
    s.opisOferty = "Platformy służące do zależnego parkowania pojazdów w pochyleniu {typ}";
    s.typy = {
      S: { nazwa: "Platformy NK41", mp: 2, osd: 2.2, cena: 12000, waluta: "PLN", dzwig: 1 / 15,
        oferta: "{n} szt. – NK41 szer. użytkowa miejsca postojowego 250cm, szer. zewnętrzna urządzenia 280cm;" },
      D: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" },
      NP: { nazwa: "", mp: 0, osd: 0, cena: 0, waluta: "PLN", dzwig: 0, oferta: "" }
    };
    s.pozycje = [
      { id: "hydr", nazwa: "Hydraulika (siłownik 850 + rury i złączki 470 + wąż 100)", cena: 1420, waluta: "PLN", naCo: "szt", wsp: 1, osd: 0, opcja: false, tekst: "" },
      { id: "agr", nazwa: "Agregat hydrauliczny", cena: 780, waluta: "EUR", naCo: "agregat", wsp: 1, osd: 0, opcja: false, tekst: "" },
      { id: "ster_a", nazwa: "Sterowanie i elektryka: na agregat", cena: 1400, waluta: "PLN", naCo: "agregat", wsp: 1, osd: 0, opcja: false, tekst: "" },
      { id: "ster_u", nazwa: "Sterowanie i elektryka: na urządzenie", cena: 500, waluta: "PLN", naCo: "szt", wsp: 1, osd: 0, opcja: false, tekst: "" }
    ];
    s.wariantB = { nazwa: "2500 kg", tryb: "szt", wartosc: 0, waluta: "PLN" };   // dopłata wpisywana w wycenie; bez niej wariant niedostępny
    s.opcje.rozladunekNaTransport = true; s.opcje.konserwacjaNa = "szt"; s.opcje.agregaty = true; s.opcje.slupki = true;
    s.wysokosci = { tryb: "przeswit2", k: -20, dol: 150, dlugosc: 400 };
    s.domyslne = { zysk: 0.14, zysk2: 0.11, konserwA: 40, konserwB: 50, tir: 1, tir_cena: 3200, rozl_cena: 1500 };
    Object.assign(s.cennik, { stawka_1: 500, stawka_2: 400, stawka_kolejna: 350, hotel: 130, dieta: 45, odbiory_osoby: 2, dzwig: 2400, rozl_TIR: 0.5, slupek: 1700 });
    s.teksty = Object.assign(tekstyNK38(), {
      obciazenie: "Obciążenie platformy: 2.000kg/miejsce;",
      zabezpieczenie: "Zabezpieczenie antykorozyjne: platforma ocynkowana ogniowo, słupy i siłowniki malowane.",
      barierki: "", opcjaQ2500: "Obciążenie platformy: 2.500kg/miejsce.",
      uwagaTech: "*parametry pojazdów dopuszczonych do wjazdu w obręb urządzeń są zależne od wysokości prześwitu dostępnego na danym miejscu w garażu.",
      wstep: "przedstawiamy {oferte} na dostawę i montaż {n} platform służących do zależnego parkowania {mp} pojazdów w pochyleniu dla inwestycji {garaz}.",
      tech: "Zagłębienie: brak;\nWysokość prześwitu: {P}cm;\nWysokość parkowanych pojazdów*: ▲-{G}cm, ▼-{D}cm;\nDługość parkowanych pojazdów: ▲-{M}cm, ▼-{M}cm;",
      agregat: "agregat hydrauliczny 400V, 50Hz, 3kW", kw: "3kW",
      platnosci: "30% zaliczka płatna na 22 tygodnie przed dostawą,\n30% płatność na 7 dni przed dostawą,\n90% płatność do 21 dni po dostawie,\n100% płatność do 21 dni po zakończeniu montażu i pierwszym badaniu UDT.\nOferta ważna jest 2 miesiące.",
      dostawa: 22, gw: "60",
      zakres: "Dostawa na plac budowy urządzeń parkingowych, montaż, rozruch i doprowadzenie do badań ruchowych poprzedzających wydanie Decyzji o Dopuszczeniu do Użytkowania wraz z kompletem dokumentów określonych przepisami UDT.\nPoza ofertą pozostają: koszty przeprowadzenia badania przez UDT, wszelkie roboty budowlano-wykończeniowe obiektu, wykonanie barier stałych zabezpieczających dostęp pod platformy z tyłu lub z boku w przypadku braku ścian (jeśli konieczne / zgodnie z naszymi wytycznymi), wykonanie przepustów przez ściany działowe o średnicy fi 150mm dla przeprowadzenia przewodów elektrycznych i hydraulicznych (jeśli konieczne / zgodnie z naszymi wytycznymi), napraw tynkarsko-malarskich po montażu urządzeń sterowniczych oraz mocowań konstrukcyjnych, wyposażenia w instalację przeciw-pożarową, wentylacyjną, elektryczną obiektu, sygnalizacyjną, oznaczeń pionowych i poziomych organizacji ruchu na terenie parkingu.",
      gwarancja: "Producent udziela {gw} miesięcznej gwarancji jakości na sprawne działanie urządzeń pod warunkiem podpisania z dostawcą umowy konserwacyjno-serwisowej umożliwiającej nam stałą opiekę oraz nadzór nad stanem technicznym platform. W ramach umowy serwisowej dokonywane są 2 przeglądy serwisowe w ciągu roku.\nGwarancja nie obejmuje zużycia części eksploatacyjnych, uszkodzeń wynikających z eksploatacji niezgodnej z instrukcją użytkowania, agresywnego środowiska, zbyt dużej wilgotności, uszkodzeń powstałych w wyniku zdarzeń losowych (np. pożar, zalanie). Po upływie okresu gwarancji świadczymy serwis pogwarancyjny."
    });
    s.teksty.warunki = szablonNKPXLH().teksty.warunki;
    return s;
  }
  function szablonyWbudowane() { return [szablonNK38(), szablonNK37(), szablonNK6501(), szablonNKPXLH(), szablonNK41()].map(uzupelnijSzablon); }
  /* Uzupełnia szablon o brakujące pola (np. zapisany starszą wersją aplikacji). */
  function uzupelnijSzablon(sz) {
    var b = szablonNK38(), s = JSON.parse(JSON.stringify(sz || b));
    s.cennik = Object.assign({}, b.cennik, s.cennik || {});
    s.typy = s.typy || b.typy;
    ["S", "D", "NP"].forEach(function (k) { s.typy[k] = Object.assign({}, b.typy[k], s.typy[k] || {}); });
    s.teksty = Object.assign(tekstyNK38(), s.teksty || {});
    s.model = s.model || "nk38";
    ["S", "D", "NP"].forEach(function (k) { var t = s.typy[k]; if (t.cena == null) t.cena = 0; if (!t.waluta) t.waluta = "PLN"; if (t.dzwig == null) t.dzwig = 0; });
    s.pozycje = (s.pozycje || []).map(function (x, i) { return Object.assign({ id: "p" + i, nazwa: "", cena: 0, waluta: "PLN", naCo: "szt", wsp: 1, osd: 0, opcja: false, tekst: "" }, x); });
    s.import = Object.assign({ wl: false, koszty: [], ubezpWartosc: 0, ubezpWaluta: "USD", ubezpStawka: 0.0014, ubezpWsp: 1.1 }, s.import || {});
    s.wariantA = s.wariantA || "2000 kg";
    s.wariantB = Object.assign({ nazwa: "2500 kg", tryb: "%", wartosc: 0, waluta: "PLN" }, s.wariantB || {});
    s.opcje = Object.assign({ rozladunekNaTransport: false, przeglad: true, konserwacjaNa: "MP", agregaty: true, slupki: true, dodatkiNK38: s.model === "nk38", wymiary: s.model === "nk38" }, s.opcje || {});
    s.wysokosci = Object.assign({ tryb: "zaglebienie", k: 15, dol: 170 }, s.wysokosci || {});
    s.domyslne = s.domyslne || {};
    ["glebokosci", "szerokosci", "dlugosci", "skladowe", "opisOferty"].forEach(function (k) { if (s[k] == null) s[k] = b[k]; });
    return s;
  }

  function ceil(x) { return Math.ceil(Math.round(x * 1e9) / 1e9); }
  function ceilTo(x, step) { return ceil(x / step) * step; }
  function num(v, d) { return v === null || v === undefined || v === "" || isNaN(v) ? (d || 0) : Number(v); }
  function opt(v) { return v === null || v === undefined || v === "" || isNaN(v) ? null : Number(v); }
  function sumObj(o) { var s = 0; for (var k in o) s += num(o[k]); return s; }

  function domyslneDane() {
    return {
      nazwa: "", data: "", nr: "", opis: "", h1: null, h2: null, dl: "", przeswit: null, pary: [], poz: {}, usd: 3.86, nadpis: {}, dlMiejsca: null, agrOpis: "", dopB: null, agr3: null, agr6: null,
      lok: "Poza Krakowem", km: 0, km_pom: null, km_mon: null,
      szablon: "nk38", S: 0, D: 0, NP: 0, agregaty: 0, magistrala: 0, barierki: 0, maskownice: 0, utr_dod: 0,
      gl_S: {}, gl_D: {},
      szer1_S: 0, szer2_S: 0, szer1_D: 0, szer2_D: 0,
      dl500_S: 0, dl540_S: 0, dl550_S: 0, dl500_D: 0, dl540_D: 0, dl550_D: 0,
      tir: 0, tir_cena: 0, rozl_cena: 0, rozl_dni: null, dzwig_koszt: null,
      osoby: 4, wyjazdy: null, wzor: "stary",
      zysk: 0.14, zysk2: 0.10, q2500: null, konserwA: 40, konserwB: 50, eur: 4.325, analiza: 0
    };
  }

  /* Kursy walut do przeliczeń w szablonach z cenami w EUR / USD. */
  function kursy(d) { return { PLN: 1, EUR: num(d.eur, 4.325), USD: num(d.usd, 3.86) }; }

  /* Model "lista pozycji": typy urządzeń z ceną jednostkową (PLN / EUR / USD), opcjonalny import
     z frachtem kontenerowym rozłożonym na urządzenia oraz dowolne pozycje kosztowe. */
  function materialyLista(d, c, sz) {
    var T = sz.typy, K = kursy(d), cnt = { S: num(d.S), D: num(d.D), NP: num(d.NP) };
    var szt = cnt.S + cnt.D + cnt.NP, mp = T.S.mp * cnt.S + T.D.mp * cnt.D + T.NP.mp * cnt.NP;
    var im = sz.import, kontenery = num(d.tir), fracht = 0, frachtSzt = 0, ubezp = 0;
    if (im.wl && szt > 0) {
      fracht = im.koszty.reduce(function (a, x) { return a + num(x.kwota) * (K[x.waluta] || 1); }, 0);
      ubezp = szt * num(im.ubezpWartosc) * (K[im.ubezpWaluta] || 1) * num(im.ubezpWsp) * num(im.ubezpStawka);
      frachtSzt = (fracht + ubezp) * kontenery / szt;
    }
    var cenaJ = {}, plat = {};
    ["S", "D", "NP"].forEach(function (k) { cenaJ[k] = num(T[k].cena) * (K[T[k].waluta] || 1) + frachtSzt; plat[k] = cenaJ[k] * cnt[k]; });
    function ilosc(x) {
      if (x.naCo === "szt") return szt;
      if (x.naCo === "S" || x.naCo === "D" || x.naCo === "NP") return cnt[x.naCo];
      if (x.naCo === "agregat") return num(d.agregaty);
      if (x.naCo === "MP") return mp;
      if (x.naCo === "ilosc") return num((d.poz || {})[x.id]);
      return 1;   // "stala", "kwota"
    }
    var linie = sz.pozycje.map(function (x) {
      var il = ilosc(x), kw = x.naCo === "kwota" ? num((d.poz || {})[x.id] != null && (d.poz || {})[x.id] !== "" ? d.poz[x.id] : x.cena) : num(x.cena) * (K[x.waluta] || 1) * il;
      return { id: x.id, nazwa: x.nazwa, ilosc: il, kwota: kw * num(x.wsp, 0), opcja: !!x.opcja, osd: num(x.osd) * il, tekst: x.tekst };
    });
    var dodatki = linie.filter(function (l) { return !l.opcja; }).reduce(function (a, l) { return a + l.kwota; }, 0);
    var suma = plat.S + plat.D + plat.NP + dodatki, wb = sz.wariantB, q, suma2;
    /* dopłata za wariant 2 na sztukę: z wyceny (zł/szt.) albo z szablonu; zero = brak ceny, wariant niedostępny */
    var dopB = opt(d.dopB) !== null ? Number(d.dopB) : num(wb.wartosc) * (K[wb.waluta] || 1);
    if (wb.tryb === "szt") { suma2 = suma + szt * dopB; q = suma ? suma2 / suma - 1 : 0; }
    else { q = opt(d.q2500) === null ? num(wb.wartosc) : Number(d.q2500); suma2 = suma * (1 + q); }
    var utrAuto = ceil(linie.reduce(function (a, l) { return a + (l.opcja ? 0 : l.osd); }, 0));
    var wiersze = [];
    ["S", "D", "NP"].forEach(function (k) {
      if (!cnt[k]) return;
      wiersze.push([T[k].nazwa + ": " + cnt[k] + " × " + Math.round(cenaJ[k]) + " zł" + (frachtSzt ? " (z frachtem " + Math.round(frachtSzt) + " zł/szt.)" : ""), plat[k]]);
    });
    if (im.wl) wiersze.push(["Fracht: kontener " + Math.round(fracht) + " zł + ubezpieczenie " + Math.round(ubezp) + " zł, × " + kontenery + " kont. / " + szt + " szt.", (fracht + ubezp) * kontenery]);
    linie.forEach(function (l) { wiersze.push([l.nazwa + (l.opcja ? " (opcja, poza ceną)" : ""), l.kwota]); });
    return {
      model: "lista", cenaD: cenaJ.D, cenaS: cenaJ.S, cenaNP: cenaJ.NP, platformy: szt, MP: mp,
      platS: plat.S, platD: plat.D, platNP: plat.NP, sil: { std: 0, s2000: 0, s2250: 0 },
      hydraulika: 0, barierki: 0, elektryka: 0, mechanika: dodatki,
      suma2000: suma, suma2500: suma2, q2500: q, dopB: wb.tryb === "szt" ? dopB : null, brakB: !!wb.nazwa && wb.tryb === "szt" && !(dopB > 0), malowanie: 0, linie: linie, fracht: fracht, frachtSzt: frachtSzt, ubezp: ubezp,
      wiersze: wiersze, utrAuto: utrAuto, utr: utrAuto + num(d.utr_dod)
    };
  }

  function materialy(d, c, sz) {
    var S = num(d.S), D = num(d.D), NP = num(d.NP), DN = D + NP, T = sz.typy;
    var cenaD = c.cena_D, cenaS = c.wsp_S * cenaD, cenaNP = c.wsp_NP * cenaD;
    var platformy = S + D + NP, mp = T.S.mp * S + T.NP.mp * NP + T.D.mp * D;
    var glS = 0, glD = 0, sil = { std: 0, "2000": 0, "2250": 0 };
    sz.glebokosci.forEach(function (g) {
      var s = num(d.gl_S[g.cm]), dd = num(d.gl_D[g.cm]);
      glS += s * num(g.doplata); glD += dd * num(g.doplata);
      sil[g.silownik in sil ? g.silownik : "2000"] += s + dd;
    });
    var szer = function (strona, i) { var x = (sz.szerokosci[strona] || [])[i]; return x ? num(x.cena) : 0; };
    var platS = cenaS * S + szer("S", 0) * num(d.szer1_S) + szer("S", 1) * num(d.szer2_S) + glS;
    var platD = cenaD * D + szer("D", 0) * num(d.szer1_D) + szer("D", 1) * num(d.szer2_D) + glD;
    ["dl500", "dl540", "dl550"].forEach(function (k, i) {
      var L = sz.dlugosci[i]; if (!L) return;
      var kw = L.tryb === "kwota";
      platS += (kw ? num(L.wartosc) : ceilTo(cenaS * c.dl_wsp * num(L.wartosc), 100)) * num(d[k + "_S"]);
      platD += (kw ? num(L.wartosc) : cenaD * c.dl_wsp * num(L.wartosc)) * num(d[k + "_D"]);
    });
    var platNP = cenaNP * NP;
    var silStd = platformy - sil["2000"] - sil["2250"];
    var gr = {};
    sz.skladowe.forEach(function (x) {
      var g = gr[x.grupa] || (gr[x.grupa] = [0, 0]);
      g[0] += num(x.cena) * num(x.ilS); g[1] += num(x.cena) * num(x.ilD);
    });
    function grupa(g) { var x = gr[g] || [0, 0]; return x[0] * S + x[1] * DN; }
    var inne = Object.keys(gr).filter(function (g) { return ["Hydraulika", "Elektryka", "Mechanika"].indexOf(g) < 0; })
      .reduce(function (a, g) { return a + grupa(g); }, 0);
    var A = num(d.agregaty);
    var hydraulika = A * (c.agregat + c.hydr_drobne + c.olej + c.transp_agregatu) + platformy * c.transp_silownikow +
      2 * (c.sil_1700 * silStd + c.sil_2000 * sil["2000"] + c.sil_2250 * sil["2250"]) +
      num(d.magistrala) * c.magistrala + grupa("Hydraulika");
    var barierki = c.barierka * num(d.barierki) + c.maskownica * num(d.maskownice);
    var elektryka = A * c.skrzynka_zasil + grupa("Elektryka");
    var mechanika = A * c.admin + grupa("Mechanika") + inne;
    var suma = platS + platD + platNP + hydraulika + barierki + elektryka + mechanika;
    var q = opt(d.q2500) === null ? c.q2500 : Number(d.q2500);
    var utrAuto = ceil(num(d.magistrala) * c.osd_magistrala + (num(d.barierki) + num(d.maskownice)) * c.osd_barierka);
    return {
      cenaD: cenaD, cenaS: cenaS, cenaNP: cenaNP, platformy: platformy, MP: mp,
      platS: platS, platD: platD, platNP: platNP,
      sil: { std: silStd, s2000: sil["2000"], s2250: sil["2250"] },
      hydraulika: hydraulika, barierki: barierki, elektryka: elektryka, mechanika: mechanika,
      suma2000: suma, suma2500: suma * (1 + q), q2500: q,
      malowanie: c.mal_S * S + c.mal_D * DN + c.mal_bar * num(d.barierki),
      utrAuto: utrAuto, utr: utrAuto + num(d.utr_dod)
    };
  }

  function stawkaSrednia(n, c) {
    return (c.stawka_1 + (n >= 2 ? c.stawka_2 : 0) + Math.max(0, n - 2) * c.stawka_kolejna) / n;
  }

  function czasPodrozy(km, n, wzor, c) {
    if (wzor === "uproszczony") return 2 * km / c.km_dzien * n;
    return (1 + 0.1 * Math.max(0, 800 - km) / 100) * km * n / 500;
  }

  function wspolne(d, c, sz) {
    var krk = d.lok === "Kraków";
    var kmPom = opt(d.km_pom) !== null ? Number(d.km_pom) : (krk ? c.km_krakow : num(d.km));
    var kmMon = opt(d.km_mon) !== null ? Number(d.km_mon) : (krk ? c.km_krakow : num(d.km) + c.km_montaz_dodatek);
    var rozl = opt(d.rozl_dni) !== null ? Number(d.rozl_dni) : c.rozl_TIR * num(d.tir);
    var DN = num(d.D) + num(d.NP);
    return {
      krk: krk, kmPom: kmPom, kmMon: kmMon, rozl: rozl,
      podrPom: c.pomiary_osoby * czasPodrozy(kmPom, 1, d.wzor, c) + c.odbiory_osoby * czasPodrozy(kmPom, num(c.odbiory_wyjazdy, 1), d.wzor, c),
      dzwDni: sz && sz.model === "lista"
        ? ceil(["S", "D", "NP"].reduce(function (a, k) { return a + num(d[k]) * num(sz.typy[k].dzwig); }, 0))
        : ceil(DN / c.dzwig_D + num(d.S) * c.dzwig_wspS / c.dzwig_D)
    };
  }

  function montaz(d, c, m, w, q, sl, osoby, sz) {
    var T = sz.typy;
    var S = num(d.S), D = num(d.D), NP = num(d.NP);
    var os = Math.max(1, osoby), st = stawkaSrednia(os, c);
    var osd = num(T.S.osd) * S + num(T.D.osd) * D + num(T.NP.osd) * NP + m.utr + (sl ? c.slupek_rbd * m.MP : 0);
    function podroze(wyj) { return w.podrPom + os * (w.rozl + czasPodrozy(w.kmMon, wyj, d.wzor, c)); }
    function zDni(dni) { return w.krk ? dni : ceil(dni / c.dni_tydzien); }
    var wyj = 1, iteracje = [];
    for (var i = 0; i < 5; i++) { wyj = zDni(ceil((osd + podroze(wyj)) / os)); iteracje.push(wyj); }
    if (opt(d.wyjazdy) !== null) wyj = Number(d.wyjazdy);
    var podr = podroze(wyj), osdAll = osd + podr, dni = ceil(osdAll / os);
    var km = 2 * (w.kmMon * wyj + (1 + num(c.odbiory_wyjazdy, 1)) * w.kmPom);
    var k = {
      urzadzenia: q ? m.suma2500 : m.suma2000,
      slupki: sl ? c.slupek * m.MP : 0,
      paliwo: km / 100 * ceil(c.spalanie * c.paliwo),
      hotel: w.krk ? 0 : c.hotel * (dni + 1) * os,
      transport: num(d.tir_cena) * num(d.tir),
      dzwig: opt(d.dzwig_koszt) !== null ? Number(d.dzwig_koszt) : c.dzwig * w.dzwDni,
      rozladunek_sprzet: num(d.rozl_cena) * (sz.opcje.rozladunekNaTransport ? num(d.tir) : 1),
      rozladunek_ludzie: st * w.rozl * os,
      dojazdy: st * (podr - os * w.rozl),
      montaz: wyj > 0 ? st * osd : 0,
      diety: w.krk ? 0 : c.dieta * osdAll
    };
    var robocizna = k.rozladunek_ludzie + k.dojazdy + k.montaz + k.diety;
    var baza = 0;
    for (var key in k) baza += k[key];
    function narzuty(b, zysk) {
      var brutto = b / (1 - (c.kob + c.gdw + zysk));
      return { brutto: brutto, podatek: c.podatek * (robocizna + brutto * (c.gdw + zysk)) };
    }
    var zysk = num(d.zysk), zysk2 = num(d.zysk2);
    var n = narzuty(baza, zysk), n2 = narzuty(baza, zysk2);
    var cena = n.brutto + n.podatek, cena2 = n2.brutto + n2.podatek;
    var tyg = w.krk ? ceil(dni / c.dni_tydzien) : wyj;
    return {
      robocizna: robocizna, osoby: os, stawka: st, osd: osd, iteracje: iteracje, wyjazdy: wyj, podroze: podr,
      osobodni: osdAll, dni: dni, km: km, koszty: k, baza: baza,
      kob: n.brutto * c.kob, gdw: n.brutto * c.gdw, zysk: n.brutto * zysk, podatek: n.podatek,
      /* Jak w Excelu: koszt rzeczywisty = koszty + KOB + podatek, zysk z narzutem = cena − koszt = zysk + GDW. */
      zyskN: n.brutto * (c.gdw + zysk), zyskN2: n2.brutto * (c.gdw + zysk2),
      cena: cena, koszt: cena - n.brutto * (c.gdw + zysk), cenaMP: m.MP ? cena / m.MP : 0,
      cenaMPeur: m.MP && num(d.eur) > 0 ? cena / m.MP / num(d.eur) : 0,
      cena2: cena2, zysk2: n2.brutto * zysk2, podatek2: n2.podatek, cenaMP2: m.MP ? cena2 / m.MP : 0,
      tygodnie: tyg, tygodnieZakres: [tyg, Math.max(tyg, Math.round(tyg * 1.25))],
      noclegi: w.krk ? 0 : (dni + 1) * os
    };
  }

  function ostrzezenia(d, sz) {
    var w = [], S = num(d.S), D = num(d.D), NP = num(d.NP);
    if (sumObj(d.gl_S) > S || sumObj(d.gl_D) > D) w.push({ typ: "blad", tekst: "Więcej zagłębień niż platform." });
    if (num(d.szer1_S) + num(d.szer2_S) > S || num(d.szer1_D) + num(d.szer2_D) > D)
      w.push({ typ: "blad", tekst: "Więcej szerokości niestandardowych niż platform." });
    if (num(d.dl500_S) + num(d.dl540_S) + num(d.dl550_S) > S || num(d.dl500_D) + num(d.dl540_D) + num(d.dl550_D) > D)
      w.push({ typ: "blad", tekst: "Więcej długości niestandardowych niż platform." });
    if (S + D + NP === 0) w.push({ typ: "uwaga", tekst: "Brak urządzeń." });
    else {
      if (sz.model === "nk38") {
        if (num(d.agregaty) === 0) w.push({ typ: "uwaga", tekst: "Brak agregatów." });
        else if (num(d.agregaty) * 6 < S + D + NP) w.push({ typ: "uwaga", tekst: "Mniej niż 1 agregat na 6 platform." });
      }
      if (num(d.tir) === 0) w.push({ typ: "uwaga", tekst: sz.import.wl ? "Brak kontenerów / transportów (fracht = 0)." : "Brak transportów TIR." });
    }
    if (d.lok !== "Kraków" && num(d.km) === 0) w.push({ typ: "uwaga", tekst: "Brak odległości od Krakowa." });
    return w;
  }

  function nazwyWariantow(sz) {
    var a = sz.wariantA || "2000 kg", b = (sz.wariantB && sz.wariantB.nazwa) || "2500 kg";
    return [a, b, a + " + słupki", b + " + słupki"];
  }

  function oblicz(dane, szablon) {
    var d = Object.assign(domyslneDane(), dane || {});
    if (opt(d.agr3) !== null || opt(d.agr6) !== null) d.agregaty = num(d.agr3) + num(d.agr6);   // agregaty 3 kW + 6 kW
    if ((dane || {}).zysk2 === undefined && (dane || {}).zysk_min !== undefined) d.zysk2 = dane.zysk_min;
    var sz = uzupelnijSzablon(szablon), T = sz.typy;
    /* stawki zmienione tylko w tej wycenie (hotel, dieta, paliwo, dźwig…) nie ruszają szablonu */
    var c = sz.cennik = Object.assign({}, sz.cennik);
    Object.keys(d.nadpis || {}).forEach(function (k) { var v = opt(d.nadpis[k]); if (v !== null && k in c) c[k] = v; });
    d.typ = sz.nazwa; d.wysokosci = sz.wysokosci; d.model = sz.model; d.pokazAgregaty = sz.opcje.agregaty;
    var m = sz.model === "lista" ? materialyLista(d, c, sz) : materialy(d, c, sz), w = wspolne(d, c, sz), os = Math.max(1, num(d.osoby, 4));
    var nazwy = nazwyWariantow(sz);
    var warianty = nazwy.map(function (nazwa, i) {
      return Object.assign({ nazwa: nazwa }, montaz(d, c, m, w, i % 2 === 1, i >= 2, os, sz));
    });
    var a = Math.min(3, Math.max(0, num(d.analiza)));
    var analiza = OSOBY_ANALIZA.map(function (n) {
      return Object.assign({ n: n }, montaz(d, c, m, w, a % 2 === 1, a >= 2, n, sz));
    });
    function mn(z) { return (1 + c.podatek * (c.gdw + z)) / (1 - (c.kob + c.gdw + z)); }
    var mnoznik = mn(num(d.zysk)), mnoznik2 = mn(num(d.zysk2));
    var sl37 = [warianty[2].cena - warianty[0].cena, warianty[3].cena - warianty[1].cena];
    var dop22 = (c.slupek22 - c.slupek) * m.MP * mnoznik;
    var sl37b = [warianty[2].cena2 - warianty[0].cena2, warianty[3].cena2 - warianty[1].cena2];
    var dop22b = (c.slupek22 - c.slupek) * m.MP * mnoznik2;
    var wynik = {
      dane: d, cennik: c, szablon: sz, mat: m, wspolne: w, warianty: warianty,
      analiza: analiza, analizaWariant: nazwy[a],
      opcje: {
        slupki37: sl37, slupki22: [sl37[0] + dop22, sl37[1] + dop22],
        malowanie: m.malowanie * mnoznik,
        slupki37b: sl37b, slupki22b: [sl37b[0] + dop22b, sl37b[1] + dop22b],
        malowanieB: m.malowanie * mnoznik2,
        pozycje: (m.linie || []).filter(function (l) { return l.opcja; }).map(function (l) { return { id: l.id, nazwa: l.nazwa, tekst: l.tekst, kwota: l.kwota * mnoznik, kwotaB: l.kwota * mnoznik2 }; })
      },
      mnoznik: mnoznik, ostrzezenia: ostrzezenia(d, sz),
      konserwacja: [num(d.konserwA, 40), num(d.konserwB, 50)].map(function (st) {
        var baza = sz.opcje.konserwacjaNa === "szt" ? m.platformy : m.MP;
        return { stawka: st, rok: st * baza * 12, pol: sz.opcje.przeglad ? st * baza * 6 : 0 };
      })
    };
    wynik.negocjacje = negocjacje(wynik, 0);
    return wynik;
  }

  /* Cena wariantu przy dowolnym procencie zysku (te same koszty i narzuty): do drabinki negocjacyjnej. */
  function cenaPrzyZysku(r, w, z) {
    var c = r.cennik, b = w.baza / (1 - (c.kob + c.gdw + z)), pod = c.podatek * (w.robocizna + b * (c.gdw + z)), cena = b + pod;
    return { zysk: z, cena: cena, zyskN: b * (c.gdw + z), cenaMP: r.mat.MP ? cena / r.mat.MP : 0 };
  }
  /* Drabinka: od zysku ofertowego w dół co 2 pkt proc. do 0%, z zyskiem do porównania; rabat liczony od ceny ofertowej. */
  function negocjacje(r, wi) {
    var w = r.warianty[wi || 0], zA = num(r.dane.zysk), zB = num(r.dane.zysk2), poz = [zA, zB, 0];
    for (var p = Math.floor(zA * 100 / 2) * 2; p > 0; p -= 2) poz.push(p / 100);
    poz = poz.map(function (z) { return Math.round(z * 10000) / 10000; }).filter(function (z, i, a) { return z <= zA + 1e-9 && a.indexOf(z) === i; }).sort(function (a, b) { return b - a; });
    var A = cenaPrzyZysku(r, w, zA);
    var wiersze = poz.map(function (z) {
      var x = cenaPrzyZysku(r, w, z);
      return Object.assign(x, { rabat: A.cena - x.cena, rabatPct: A.cena ? (A.cena - x.cena) / A.cena : 0, oferta: z === Math.round(zA * 10000) / 10000, porownanie: z === Math.round(zB * 10000) / 10000 && zB < zA, prog: z === 0 });
    });
    var B = cenaPrzyZysku(r, w, Math.min(zA, zB)), Z = cenaPrzyZysku(r, w, 0);
    return { wariant: w.nazwa, zA: zA, zB: Math.min(zA, zB), cenaA: A.cena, cenaB: B.cena, cenaMin: Z.cena, zyskNA: A.zyskN, zyskNB: B.zyskN, wiersze: wiersze };
  }

  var api = {
    cenaPrzyZysku: cenaPrzyZysku, negocjacje: negocjacje,
    oblicz: oblicz, domyslneDane: domyslneDane, CENNIK: CENNIK,
    GLEBOKOSCI: szablonNK38().glebokosci.map(function (g) { return g.cm; }),
    szablonNK38: szablonNK38, szablonNK6501: szablonNK6501, szablonNKPXLH: szablonNKPXLH, szablonNK41: szablonNK41, szablonPusty: szablonPusty, nazwyWariantow: nazwyWariantow, szablonyWbudowane: szablonyWbudowane, uzupelnijSzablon: uzupelnijSzablon,
    WARIANTY: WARIANTY, OSOBY_ANALIZA: OSOBY_ANALIZA, czasPodrozy: czasPodrozy, stawkaSrednia: stawkaSrednia
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38 = api;
})(this);
