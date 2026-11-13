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
  osoby: 4, zysk: 0.11, zysk2: 0.10, poz: { mufas: 19900 }, eur: 4.325, konserwA: 50, nadpis: { paliwo: 7, kob: 0.005 / E.KOB_WSP, gdw: 0.025 / E.GDW_WSP }   /* arkusz liczył nominalnie 0,5% / 2,5%: w kalkulatorze wpisujemy stawki efektywne */
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
  osoby: 4, zysk: 0.28, zysk2: 0.255, eur: 4.33, usd: 3.86, konserwA: 35, nadpis: { paliwo: 7, hotel: 120, kob: 0.005 / E.KOB_WSP, gdw: 0.025 / E.GDW_WSP }   /* arkusz liczył nominalnie 0,5% / 2,5%: w kalkulatorze wpisujemy stawki efektywne */
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
  nadpis: { kob: 0.005, gdw: 0.02585 / E.GDW_WSP }   // arkusz NK41 liczył KOB/GDW 0,515/2,585%; w kalkulatorze wpisujemy stawki efektywne (0,5% → 0,515%)
}), szablon("nk41"));
console.log("NK41");
assert.strictEqual(r3.mat.MP, 23, "NK41: liczba MP = liczba urządzeń × 1");
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
assert(!rL.razem.brakB && rL.razem.zB.join() === "NK38" && rL.ostrzezenia.some((x) => /NK41/.test(x.tekst)), "NK41 bez dopłaty: wariant 2500 kg dalej dostępny (NK38 z dopłatą), NK41 bez zmiany");
blisko(rL.warianty[1].koszty.urzadzenia - rL.warianty[0].koszty.urzadzenia, rGl.mat.suma2500 - rGl.mat.suma2000, "2500 kg: dopłata tylko NK38");
assert(rL.razem.slupki && rL.razem.MPsl === rGl.mat.MP, "słupki tylko NK38 (NK41 bez słupków)");
blisko(rL.warianty[2].koszty.slupki, rGl.mat.MP * 1700, "słupki: tylko MP NK38");
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
[["ul. Brzozowa 9, Poznań", "przy ul. Brzozowej 9 w Poznaniu"], ["ul. Krupnicza 31 Kraków", "przy ul. Krupniczej 31 w Krakowie"], ["ul. Polna 5 Katowice", "przy ul. Polnej 5 w Katowicach"],
  ["ul. Słoneczna 3, Wrocław", "przy ul. Słonecznej 3 we Wrocławiu"], ["ul. Dekerta 12 Kraków", "przy ul. Dekerta 12 w Krakowie"], ["ul. Jana Pawła II 10 Gdańsk", "przy ul. Jana Pawła II 10 w Gdańsku"],
  ["KRAKOWSKA VITA", "przy KRAKOWSKA VITA"]].forEach(([n, o]) => assert.strictEqual(X.lokalizacjaOdmieniona(n), o, "odmiana: " + n));
console.log("  ok odmiana nazwy inwestycji");

// Dwa poziomy (NKPXLH, NK41): górna domyślnie 150, dolna = prześwit − k − górna; ręczne wartości mają pierwszeństwo.
const wys = (id, przeswit, o) => { const sz = szablon(id), r = E.oblicz(Object.assign(E.domyślne ? {} : E.domyslneDane(), sz.domyslne, { szablon: id, S: 2, przeswit }), sz); return X.wymiary(r.dane, o || {}); };
[["nkpxlh", 340, 150, 170], ["nkpxlh", 360, 150, 190], ["nkpxlh", 320, 150, 150], ["nk41", 280, 150, 150], ["nk41", 300, 150, 170]].forEach(([id, p, g, dn]) => {
  const w = wys(id, p); assert(w.gor === g && w.dol === dn, id + " P=" + p + ": " + w.gor + "/" + w.dol + " ≠ " + g + "/" + dn);
});
assert.strictEqual(wys("nkpxlh", 340, { hg: 140 }).dol, 180, "ręczna górna przesuwa dolną");
assert.strictEqual(wys("nkpxlh", 340, { hd: 160 }).dol, 160, "ręczna dolna ma pierwszeństwo");
console.log("  ok wysokości pojazdów na dwóch poziomach");

// NKPXLH: jedna moc agregatu (3 kW), bez podziału 3/6 kW; NK41 nadal z podziałem.
{
  const szx = szablon("nkpxlh"), rx = E.oblicz(Object.assign(E.domyslneDane(), szx.domyslne, { szablon: "nkpxlh", S: 6, agregaty: 3, agr3: 1, agr6: 2, przeswit: 340 }), szx);
  assert.strictEqual(rx.dane.agregaty, 3, "NKPXLH: agr3/agr6 ignorowane, liczba agregatów z pola");
  const Fx = X.oferta(rx, X.domyslnaOferta(), X.SZABLON), Rx = X.raport(rx, [], X.domyslnaOferta());
  assert(/3kW/.test(Fx.lista.join(" ")) && !/3\/6/.test(Fx.lista.join(" ")), "oferta NKPXLH: 3kW: " + Fx.lista.join(" | "));
  assert(/3 szt\. \(3 kW\)/.test(Rx.karta.agregaty), "raport NKPXLH: " + Rx.karta.agregaty);
  const r41 = E.oblicz(Object.assign(E.domyslneDane(), szablon("nk41").domyslne, { szablon: "nk41", S: 6, agr3: 1, agr6: 2 }), szablon("nk41"));
  assert.strictEqual(r41.dane.agregaty, 3, "NK41: agregaty = 3 kW + 6 kW");
  console.log("  ok agregaty: NKPXLH jedna moc, NK41 z podziałem");
}

// Dopłata 2500 kg wpisana w walucie szablonu (NKPXLH: USD): 700 USD × kurs, nie 700 zł.
{
  const szu = szablon("nkpxlh"), rb = E.oblicz(Object.assign(E.domyslneDane(), szu.domyslne, { szablon: "nkpxlh", S: 4, usd: 4 }), szu);
  blisko(rb.mat.dopB, 700 * 4, "NKPXLH: dopłata z szablonu 700 USD × kurs 4");
  const rb2 = E.oblicz(Object.assign(E.domyslneDane(), szu.domyslne, { szablon: "nkpxlh", S: 4, usd: 4, dopB: 500 }), szu);
  blisko(rb2.mat.dopB, 500 * 4, "NKPXLH: dopłata wpisana 500 USD × kurs 4");
}
console.log("szablony: OK");

// 13.11: KOB/GDW efektywne, do 4 urządzeń, Spider Crane per urządzenie, drabinka 7% / 0,5 pkt (NKPXLH 12% / 2 pkt).
{
  console.log("Wycena łączona do 4 urządzeń, Spider Crane, negocjacje");
  const szt = E.szablonyWbudowane(), s38 = szablon("nk38");
  assert.strictEqual(s38.cennik.kob, 0.005); assert.strictEqual(s38.cennik.gdw, 0.025);
  const r0 = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300 }), s38);
  blisko(r0.cennik.kobN, 0.00515, "KOB 0,5% liczony jako 0,515%"); blisko(r0.cennik.gdwN * 1000, 26.85, "GDW 2,5% liczony jako 2,685% (‰)");
  const dod = [{ szablon: "nk41", S: 23, agregaty: 6 }, { szablon: "nkpxlh", S: 10, agregaty: 2 }, { szablon: "nk6501", S: 6 }, { szablon: "nk41", S: 5 }];
  const r4 = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300, dodatkowe: dod }), s38, szt), w4 = r4.warianty[0];
  assert.strictEqual(r4.dodatkowe.length, 3, "najwyżej 3 kolejne urządzenia (razem 4)");
  blisko(w4.pozycje.reduce((a, p) => a + p.cena, 0), w4.cena, "4 pozycje: suma cen = cena całości");
  blisko(w4.koszty.dzwig, 3 * 2400 + 2 * 2400 + 1 * 1200 + 0, "Spider Crane: NK38 3 dni × 2400 + NK41 2 × 2400 + NKPXLH 1 × 1200 + NK6501 0");
  const rD = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300, dzwig_urz: 1000, dodatkowe: dod.slice(0, 1) }), s38, szt);
  blisko(rD.warianty[0].koszty.dzwig, 1000 + 4800, "Spider Crane wpisany przy urządzeniu 1 + automatyczny przy urządzeniu 2");
  const rD2 = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300, dzwig_koszt: 500, dodatkowe: dod.slice(0, 1) }), s38, szt);
  blisko(rD2.warianty[0].koszty.dzwig, 500, "Spider Crane razem wpisany ręcznie zastępuje sumę");
  const N4 = r4.negocjacje, zy = N4.wiersze.map((x) => Math.round(x.zysk * 1000) / 10);
  assert.deepStrictEqual(zy, [14, 13.5, 13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7], "drabinka co 0,5 pkt do 7%: " + zy);
  assert(N4.wiersze[N4.wiersze.length - 1].prog && N4.zMin === 0.07, "próg minimalny 7%");
  N4.wiersze.forEach((x) => blisko(x.pozycje.reduce((a, p) => a + p.cena, 0), x.cena, "zysk " + x.zysk + ": ceny pozycji = cena"));
  const sp = szablon("nkpxlh"), rp = E.oblicz(Object.assign(E.domyslneDane(), sp.domyslne, { szablon: "nkpxlh", S: 18, agregaty: 3 }), sp);
  assert.deepStrictEqual(rp.negocjacje.wiersze.map((x) => Math.round(x.zysk * 1000) / 10), [28, 26, 25.5, 24, 22, 20, 18, 16, 14, 12], "NKPXLH: co 2 pkt do 12%");
  const X2 = require("./nk38-export.js"), R4 = X2.raport(r4, s38.glebokosci.map((g) => g.cm), X2.domyslnaOferta());
  assert.strictEqual(R4.neg.head.length, 6 + 4, "pole do negocjacji: kolumna ceny za MP dla każdego z 4 urządzeń");
  assert.strictEqual(R4.karta.urzadzenia.length, 4, "dane wejściowe: blok każdego urządzenia");
  const F41 = X2.oferta(E.oblicz(Object.assign(E.domyslneDane(), szablon("nk41").domyslne, { szablon: "nk41", S: 4, przeswit: 280 }), szablon("nk41")), X2.domyslnaOferta(), X2.SZABLON);
  assert(!/[▲▼]/.test(F41.tech.join(" ")) && /w zależności od dostępnej długości miejsca/.test(F41.tech.join(" ")), "NK41: w ofercie bez wymiarów pojazdów: " + F41.tech.join(" | "));
  const Rp = X2.raport(rp, [], X2.domyslnaOferta());
  assert(Rp.mat.some((x) => /THC Gdańsk/.test(x[0])) && Rp.mat.some((x) => /Ubezpieczenie/.test(x[0])), "NKPXLH: pełna kalkulacja frachtu w raporcie");
  console.log("  ok 4 urządzenia, Spider Crane per urządzenie, drabinki, NK41 bez wymiarów, fracht NKPXLH");
}

// Transport przy wycenie łączonej: każde urządzenie z własnymi transportami (wcześniej NK41/NKPXLH jako kolejne liczyły 0).
{
  const szt = E.szablonyWbudowane(), s38 = szablon("nk38");
  const r = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300, tir_cena: 4500,
    dodatkowe: [{ szablon: "nk41", S: 23 }, { szablon: "nkpxlh", S: 10, agregaty: 2 }] }), s38, szt), w = r.warianty[0];
  blisko(w.koszty.transport, 3 * 4500 + 1 * 4500 + 1 * 3500, "transport: NK38 3 TIR + NK41 1 TIR (cena jak urz. 1) + NKPXLH 1 kontener (3500 z szablonu)");
  blisko(r.wspolne.rozl, 3 * 0.5 + 0.5 + 1, "dni rozładunku: suma urządzeń");
  const r2 = E.oblicz(Object.assign(E.domyslneDane(), s38.domyslne, { S: 6, D: 10, agregaty: 3, km: 300, tir: 2, tir_cena: 4000,
    dodatkowe: [{ szablon: "nk41", S: 23, tir: 2, tir_cena: 3000 }] }), s38, szt);
  blisko(r2.warianty[0].koszty.transport, 2 * 4000 + 2 * 3000, "transport wpisany ręcznie przy każdym urządzeniu");
  console.log("  ok transport każdego urządzenia");
}
