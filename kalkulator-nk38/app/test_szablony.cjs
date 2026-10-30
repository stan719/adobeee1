/* Zgodność szablonów NK6501 i NKPXLH z kalkulatorami Excel, z których powstały.
   NK6501: "20251216-SNK-kalk.-Verdiego-Warszawa.xlsx", arkusz "NK6501x(3+3) 16.12.25" (K38 / N38).
   NKPXLH: "20261009-INK-Witosa_24_bud.B-Piastow.xlsx", arkusz "18x2DS-2T 9.10.26" (K40). */
const E = require("./nk38-engine.js");
const assert = require("assert");
const szablon = (id) => E.szablonyWbudowane().find((s) => s.id === id);
function blisko(a, b, opis) { assert(Math.abs(a - b) < 0.5, opis + ": " + a + " ≠ " + b); console.log("  ok", opis, Math.round(a * 100) / 100); }

// NK6501: w arkuszu hotel 100 zł i dieta 0 zł (szablon ma 130 / 45 jak NK38), więc do porównania ustawiamy wartości z arkusza.
const s1 = szablon("nk6501");
Object.assign(s1.cennik, { hotel: 100, dieta: 0 });
const r1 = E.oblicz(Object.assign(E.domyslneDane(), {
  szablon: "nk6501", S: 6, utr_dod: 2, km: 310, wyjazdy: 2, tir: 1, tir_cena: 3500, rozl_cena: 3000,
  osoby: 4, zysk: 0.11, zysk2: 0.10, poz: { mufas: 19900 }, eur: 4.325, konserwA: 50, nadpis: { paliwo: 7, kob: 0.005, gdw: 0.025 }
}), s1);
console.log("NK6501");
blisko(r1.mat.suma2000, 82900, "urządzenia (K39)");
blisko(r1.warianty[0].osd, 29, "osobodni montażu (F50)");
blisko(r1.warianty[0].koszty.hotel, 4800, "hotel (K20)");
blisko(r1.warianty[0].koszty.paliwo, 2251.2, "paliwo (K19)");
blisko(r1.warianty[0].cena, 134711.0847732558, "kontrakt, zysk 11% (K38)");
blisko(r1.warianty[0].cena2, 133007.4726724138, "kontrakt, zysk 10% (N38)");
blisko(r1.warianty[0].koszt, 117148.61297093023, "koszt rzeczywisty (K42)");
blisko(r1.warianty[0].zyskN, 17562.47180232557, "zysk z narzutem (J43)");
blisko(r1.warianty[0].zyskN2, 16074.633620689667, "zysk z narzutem, 10% (M43)");
blisko(r1.konserwacja[0].rok, 50 * 6 * 12, "konserwacja roczna 50 zł/MP");

// Arkusze liczą paliwo po 7 zł/l (NKPXLH także hotel 120 zł); szablony mają 9,40 zł i 130 zł, więc podajemy stawki arkusza jako zmienione w tej wycenie.
// NKPXLH: 18 urządzeń, 1 kontener, 3 wyjazdy montażowe. Kolumna N arkusza pomija dźwig (N18 liczy dni, nie koszt), więc porównujemy K.
const s2 = szablon("nkpxlh");
const r2 = E.oblicz(Object.assign(E.domyslneDane(), {
  szablon: "nkpxlh", S: 18, agregaty: 3, km: 310, wyjazdy: 3, tir: 1, tir_cena: 3500, rozl_cena: 2800,
  osoby: 4, zysk: 0.28, zysk2: 0.255, eur: 4.33, usd: 3.86, konserwA: 35, nadpis: { paliwo: 7, hotel: 120, kob: 0.005, gdw: 0.025 }
}), s2);
console.log("NKPXLH");
blisko(r2.mat.frachtSzt, 2022.8098982222223, "fracht na urządzenie (F3)");
blisko(r2.mat.cenaS, 10900.809898222222, "cena urządzenia z frachtem (F4)");
blisko(r2.mat.platS, 196214.57816799998, "urządzenia razem (I14)");
blisko(r2.mat.suma2000, 196214.57816799998 + 3647.5920000000006, "urządzenia + hydraulika 20%");
blisko(r2.warianty[0].koszty.dzwig, 2400, "Spider Crane (K18)");
blisko(r2.warianty[0].koszty.paliwo, 3376.8, "paliwo (K20)");
blisko(r2.warianty[0].koszty.hotel, 7680, "hotel (K21)");
blisko(r2.warianty[0].cena, 374983.16299568635, "kontrakt, zysk 28% (K40)");
blisko(r2.warianty[0].zyskN, 108617.21648368117, "zysk z narzutem (J45)");
blisko(r2.konserwacja[0].rok, 7560, "konserwacja roczna 35 zł × 18 szt. (J46)");
blisko(r2.konserwacja[0].pol, 3780, "przegląd 35 zł × 18 szt. (J47)");
assert(r2.mat.suma2500 > r2.mat.suma2000, "wariant 2500 kg droższy");
blisko(r2.mat.suma2500 - r2.mat.suma2000, 18 * 700 * 3.86, "2500 kg: 3000 USD/szt. (+700)");

// NK41: arkusz "-NK3 2T A .10.26" przeliczony w LibreOffice dla 23 urządzeń, 6 agregatów, 300 km (montaż 350 km), 1 wyjazd montażowy.
const r3 = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk41").domyslne, {
  szablon: "nk41", S: 23, agregaty: 6, km: 300, wyjazdy: 1, eur: 4.325,
  nadpis: { kob: 0.00515, gdw: 0.02585 }   // arkusz NK41 miał KOB/GDW 0,515/2,585%; domyślnie w aplikacji 0,515/2,685%
}), szablon("nk41"));
console.log("NK41");
if (!r3.mat.brakB || r3.warianty[1].cena !== r3.warianty[0].cena) throw new Error("NK41 bez dopłaty: wariant 2500 kg powinien być niedostępny");
const r3b = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk41").domyslne, { szablon: "nk41", S: 10, dopB: 1000 }), szablon("nk41"));
blisko(r3b.mat.suma2500 - r3b.mat.suma2000, 10000, "NK41 z dopłatą 1000 zł/szt.: wariant 2500 kg");
blisko(r3.mat.suma2000, 276000 + 20241 + 19900 + 32660, "urządzenia, agregaty, sterowanie, hydraulika (I14:I17)");
blisko(r3.warianty[0].osd, 50.6, "osobodni montażu (F51)");
blisko(r3.warianty[0].koszty.dzwig, 4800, "Spider Crane 2 dni (K26)");
blisko(r3.warianty[0].koszty.hotel, 8320, "hotel (K21)");
blisko(r3.warianty[0].koszty.paliwo, 2147, "paliwo (K20)");
blisko(r3.warianty[0].cena, 491465.267590832, "kontrakt, zysk 14% (K40)");
blisko(r3.warianty[0].zyskN, 79060.474933655, "zysk z narzutem (K45)");
blisko(r3.konserwacja[0].rok, 11040, "konserwacja 40 zł × 23 szt. (J46)");

// Wycena łączona NK38 + NK41: wspólna ekipa i wyjazdy, osobodni i materiały się sumują, ceny pozycji dają cenę całości.
console.log("NK38 + NK41 (wycena łączona)");
const dGl = { szablon: "nk38", S: 6, D: 10, agregaty: 3, km: 300 };
const rGl = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk38").domyslne, dGl), szablon("nk38"));
const rDr = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk41").domyslne, { szablon: "nk41", S: 23, agregaty: 6, km: 300 }), szablon("nk41"));
const rL = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk38").domyslne, dGl, { dodatkowe: [{ szablon: "nk41", S: 23, agr3: 4, agr6: 2 }] }), szablon("nk38"), E.szablonyWbudowane());
const wL = rL.warianty[0];
blisko(wL.koszty.urzadzenia, rGl.mat.suma2000 + rDr.mat.suma2000, "materiały: suma obu pozycji");
blisko(wL.osd, rGl.warianty[0].osd + rDr.warianty[0].osd, "osobodni montażu: suma obu pozycji");
blisko(wL.pozycje[0].cena + wL.pozycje[1].cena, wL.cena, "ceny pozycji = cena całości");
blisko(wL.pozycje[0].cena2 + wL.pozycje[1].cena2, wL.cena2, "ceny pozycji przy zysku 2 = cena całości");
blisko(rL.razem.MP, rGl.mat.MP + rDr.mat.MP, "miejsca postojowe razem");
assert(wL.cena < rGl.warianty[0].cena + rDr.warianty[0].cena - 10000, "łącznie taniej niż dwie osobne wyceny");
assert(rL.razem.brakB && rL.ostrzezenia.some((x) => /NK41/.test(x.tekst)), "NK41 bez dopłaty: wariant 2500 kg niedostępny w całej wycenie");
const rBez = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk38").domyslne, dGl, { dodatkowe: [] }), szablon("nk38"), E.szablonyWbudowane());
blisko(rBez.warianty[0].cena, rGl.warianty[0].cena, "bez drugiego urządzenia cena bez zmian");
assert(rBez.warianty[0].pozycje === null, "bez drugiego urządzenia brak podziału na pozycje");

// Opis wariantu: ręczna zmiana jednego fragmentu nie wyłącza automatyki reszty.
const sz38 = szablon("nk38"), dOp = Object.assign(E.domyslneDane(), sz38.domyslne, { S: 4, D: 6, agregaty: 2, h1: 190, h2: 195, przeswit: 360 });
const X = require("./nk38-export.js");
const autoOp = X.opisAuto(E.oblicz(dOp, sz38).dane, {});
const nadOp = X.opisNadpisania(autoOp, autoOp.replace("P-360", "P-350"));
assert.deepStrictEqual(nadOp, { "P-": "P-350" });
const opZm = X.opisEfektywny(E.oblicz(Object.assign({}, dOp, { opisNad: nadOp, h1: 200, h2: 205 }), sz38).dane, {});
assert(/H-200\/205/.test(opZm) && /P-350/.test(opZm), "opis: H z automatu, P ręcznie: " + opZm);
assert.strictEqual(X.opisEfektywny(E.oblicz(Object.assign({}, dOp, { opis: "ręczny" }), sz38).dane, {}), "ręczny", "stary opis cały ręczny nadal działa");
console.log("  ok opis wariantu: nadpisania per fragment");
console.log("szablony: OK");
