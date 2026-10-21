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
  osoby: 4, zysk: 0.11, zysk2: 0.10, poz: { mufas: 19900 }, eur: 4.325, konserwA: 50
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

// NKPXLH: 18 urządzeń, 1 kontener, 3 wyjazdy montażowe. Kolumna N arkusza pomija dźwig (N18 liczy dni, nie koszt), więc porównujemy K.
const s2 = szablon("nkpxlh");
const r2 = E.oblicz(Object.assign(E.domyslneDane(), {
  szablon: "nkpxlh", S: 18, agregaty: 3, km: 310, wyjazdy: 3, tir: 1, tir_cena: 3500, rozl_cena: 2800,
  osoby: 4, zysk: 0.28, zysk2: 0.255, eur: 4.33, usd: 3.86, konserwA: 35
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
blisko(r2.mat.suma2500 - r2.mat.suma2000, 18 * 650 * 3.86, "2500 kg: +650 USD/szt.");
console.log("szablony: OK");
