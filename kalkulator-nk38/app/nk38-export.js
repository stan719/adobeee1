/* Eksporty kalkulatora NK38: Excel (ExcelJS), raport PDF (jsPDF + autotable), oferta Word (docx).
   Biblioteki wstrzykuje strona (ładowane z CDN na żądanie) albo test w Node: NK38X.setLibs({...}). */
(function (root) {
  "use strict";
  var L = {};
  var fmt0 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
  function zl(v) { return fmt0.format(Math.round(v)) + " zł"; }
  function eur(v) { return fmt0.format(Math.round(v)) + " €"; }
  function n2(v) { return fmt2.format(v); }
  function pct(v) { return fmt2.format(v * 100) + "%"; }
  var fmt3 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 });
  function godzina() { var t = new Date(); return ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2); }   // godzina przygotowania raportu
  function pct3(v) { return fmt3.format(v * 100) + "%"; }   // stawki typu KOB 0,515%
  function ceil100(v) { return Math.ceil(Math.round(v * 100) / 10000) * 100; }
  function kwotaOferta(v) { return fmt0.format(v).replace(/\s/g, ".") + ",00 zł"; }

  var DL_STD = "530";   // standardowa długość zagłębienia (podpowiedź w polu formularza)
  var DIMS = [["szer1", "Szerokość 260 (S) / 520 (D)"], ["szer2", "Szerokość 270 (S) / 540 (D)"],
    ["dl500", "Długość 500–510 cm"], ["dl540", "Długość 540 cm"], ["dl550", "Długość 550 cm"]];

  /* ------------------------------------------------------------ wspólne tabele */
  function opisWymiarow(d, GL) {
    var gl = GL.filter(function (cm) { return d.gl_S[cm] || d.gl_D[cm]; }).map(function (cm) {
      return cm + " cm: " + [d.gl_S[cm] ? d.gl_S[cm] + "S" : "", d.gl_D[cm] ? d.gl_D[cm] + "D" : ""].filter(Boolean).join("+");
    });
    var dims = DIMS.filter(function (x) { return d[x[0] + "_S"] || d[x[0] + "_D"]; }).map(function (x) {
      return x[1] + ": " + [d[x[0] + "_S"] ? d[x[0] + "_S"] + "S" : "", d[x[0] + "_D"] ? d[x[0] + "_D"] + "D" : ""].filter(Boolean).join("+");
    });
    return { gl: gl.length ? gl.join("; ") : "standard 170 cm", dims: dims.length ? dims.join("; ") : "standard" };
  }

  /* Opis wariantu budowany z danych: H, L, P, wysokości pojazdów, agregaty, barierki, maskownice, magistrala. */
  function opisAuto(d, o) {
    var v = function (x) { return x == null || x === "" ? "" : x; };
    var pary = wymiaryPary(Object.assign({}, d, { opis: "", opisNad: {} }), o || {}).map(function (w) {
      var h = [w.h1, w.h2].filter(function (x) { return x != null; }).join("/");
      return "H-" + h + " | L-" + v(w.dl) + " | P-" + v(w.p) + " | Hpoj. G-" + v(w.gor) + " D-" + v(w.dol);
    });
    if (d.model === "lista") {   // urządzenia bez tabel NK38: tylko to, co wpisano
      var lp = wymiaryPary(Object.assign({}, d, { opis: "", opisNad: {} }), o || {}).map(function (w) {
        var h = [w.h1, w.h2].filter(function (x) { return x != null; }).join("/"), g = [];
        if (h) g.push("H-" + h); if (h && w.dl) g.push("L-" + w.dl); if (w.p != null) g.push("P-" + w.p);
        var hp = (w.gor != null ? "G-" + w.gor : "") + (w.dol != null ? (w.gor != null ? " " : "") + "D-" + w.dol : "");
        if (hp) g.push("Hpoj. " + hp);
        return g.join(" | ");
      }).filter(Boolean);
      var ag = d.agrOpis || (d.pokazAgregaty && d.agregaty ? d.agregaty : "");
      if (d.dlMiejsca) lp = lp.map(function (x) { return x + " | L-" + d.dlMiejsca; });
      return lp.join(" lub ") + (ag ? (lp.length ? " | " : "") + "A-" + ag : "");
    }
    return pary.join(" lub ") + " | A-" + (d.agrOpis || d.agregaty || 0) + " | Bok-" + (d.barierki || 0) + " Tył-" + (d.maskownice || 0) + " | mgstrl-" + (d.magistrala || 0);
  }
  /* Agregaty z podziałem na moc: "2× 3 kW, 1× 6 kW"; w ofercie osobna linia dla każdej mocy. */
  function agrMoc(d) {
    var a3 = Number(d.agr3) || 0, a6 = Number(d.agr6) || 0;
    return a3 || a6 ? [a3 ? a3 + "× 3 kW" : "", a6 ? a6 + "× 6 kW" : ""].filter(Boolean).join(", ") : "";
  }
  /* W ofercie bez podziału na sztuki: jedna linia z łączną liczbą i mocą "3/6kW" (podział tylko w raporcie i Excelu). */
  function agrKw(d) {
    var a3 = Number(d.agr3) || 0, a6 = Number(d.agr6) || 0;
    return a3 && a6 ? "3/6kW" : a3 ? "3kW" : a6 ? "6kW" : "";
  }
  function zMoca(tekst, kw) { return !kw ? tekst : /\d+(,\d+)?(\/\d+)?\s?kW/i.test(tekst) ? tekst.replace(/\d+(,\d+)?(\/\d+)?\s?kW/i, kw) : tekst + ", " + kw; }
  function agregatyOferta(d, tekst) { return d.agregaty + " szt. – " + zMoca(tekst, agrKw(d)) + "."; }
  /* Opis ma fragmenty rozdzielone " | " lub " lub "; każdy ma klucz z prefiksu (H-, L-, P-, Hpoj., A-, Bok-, mgstrl-; powtórzenia #2…).
     Ręczne zmiany zapisują się tylko dla zmienionych fragmentów (d.opisNad), reszta opisu nadal liczy się automatycznie. */
  function opisFragmenty(tekst) {
    var licz = {}, czesci = String(tekst || "").split(/( \| | lub )/), out = [];
    for (var i = 0; i < czesci.length; i += 2) {
      var t = czesci[i], m = t.match(/^\s*(Hpoj\.|[A-Za-zł]+-)/), k = m ? m[1] : "?";
      licz[k] = (licz[k] || 0) + 1;
      out.push({ sep: i ? czesci[i - 1] : "", key: licz[k] > 1 ? k + "#" + licz[k] : k, txt: t });
    }
    return out;
  }
  function opisZNadpisan(auto, nad) {
    nad = nad || {};
    var fr = opisFragmenty(auto), uzyte = {}, wynik = "";
    fr.forEach(function (f) {
      var t = f.key in nad ? nad[f.key] : f.txt; uzyte[f.key] = 1;
      if (t === "" && f.key in nad) return;   // fragment usunięty ręcznie
      wynik += (wynik ? (f.sep || " | ") : "") + t;
    });
    Object.keys(nad).forEach(function (k) { if (!uzyte[k] && nad[k] !== "") wynik += (wynik ? " | " : "") + nad[k]; });   // fragmenty dopisane ręcznie
    return wynik;
  }
  /* Różnice między tekstem wpisanym w pole a opisem automatycznym → nadpisania per fragment. */
  function opisNadpisania(auto, tekst) {
    var a = opisFragmenty(auto), t = opisFragmenty(tekst), nad = {}, ak = {}, n = 0;
    a.forEach(function (f) { ak[f.key] = f.txt; });
    var tk = {};
    t.forEach(function (f) {
      tk[f.key] = 1;
      if (!(f.key in ak)) { if (f.txt.trim()) nad["+" + (++n)] = f.txt.trim(); }
      else if (f.txt !== ak[f.key]) nad[f.key] = f.txt;
    });
    a.forEach(function (f) { if (!tk[f.key]) nad[f.key] = ""; });
    return nad;
  }
  function opisEfektywny(d, o) {
    if (d.opis) return d.opis;   // stare wyceny: cały opis wpisany ręcznie
    var auto = opisAuto(d, o), nad = d.opisNad || {};
    return Object.keys(nad).length ? opisZNadpisan(auto, nad) : auto;
  }

  /* Wartości: liczba + format ("zl" | "eur" | "n" | "int" | "txt"). */
  /* Warianty pokazywane w tabelach: bez wariantu B (np. 2500 kg), gdy szablon go nie ma. */
  function widoczneWarianty(r) {
    var maB = !!(r.szablon.wariantB && r.szablon.wariantB.nazwa) && !(r.razem || r.mat).brakB;   // bez wpisanej dopłaty wariant 2 się nie liczy
    var sl = r.szablon.opcje.slupki !== false;
    return r.warianty.filter(function (x, i) { return (maB || i % 2 === 0) && (sl || i < 2); });
  }
  function raport(r, GL, o) {
    var d = r.dane, m = r.mat, w = r.wspolne, ws = widoczneWarianty(r), wy = opisWymiarow(d, GL), sz = r.szablon, T = sz.typy;
    var lista = sz.model === "lista", nA = r.warianty[0].nazwa, nB = sz.wariantB.nazwa, jm = sz.opcje.konserwacjaNa === "szt" ? "szt." : "MP";
    var zA = "zysk " + pct(d.zysk), zB = "zysk " + pct(d.zysk2);
    var urz = [d.S ? d.S + " × " + T.S.nazwa : "", d.D ? d.D + " × " + T.D.nazwa : "", d.NP ? d.NP + " × " + T.NP.nazwa : ""].filter(Boolean).join(", ");
    var wp = wymiaryPary(d, o || {}), lub = function (f) { return wp.map(f).join(" lub "); }, k = function (x) { return x == null || x === "" ? "–" : x; };
    var grupy = [
      { tytul: "Inwestycja", pary: [
        ["Nazwa / adres", d.nazwa || "–"], ["Data", d.data || "–"], ["Opis / wariant", opisEfektywny(d, o)],
      ].concat((d.wysokosci || {}).tryb === "przeswit" || (d.wysokosci || {}).tryb === "przeswit2" ? [["Prześwit", lub(function (w) { return k(w.p); }) + " cm"]] : [
        ["Zagłębienie H1 / H2", lub(function (w) { return k(w.h1) + " / " + k(w.h2); }) + " cm"],
        ["Długość zagłębienia / prześwit", lub(function (w) { return k(w.dl) + " / " + k(w.p); }) + " cm"]]).concat([
        ["Wysokość pojazdów góra / dół", lub(function (w) { return k(w.gor) + " / " + k(w.dol); }) + " cm"],
        ["Lokalizacja", d.lok + (w.krk ? "" : ", " + (d.km || 0) + " km od Krakowa")],
        ["Km pomiary / montaż", w.kmPom + " / " + w.kmMon + " km"]]) },
      { tytul: "Urządzenia", pary: (lista ? [
        ["Szablon urządzenia", d.typ], ["Urządzenia", (urz || "–") + " = " + m.MP + " MP"]]
        .concat(sz.opcje.agregaty ? [["Agregaty", (d.agregaty || 0) + " szt."]] : [])
        .concat(sz.import.wl ? [["Fracht na urządzenie", zl(m.frachtSzt) + " (" + (d.tir || 0) + " kont.)"]] : [])
        .concat((m.linie || []).filter(function (l) { return l.opcja === false && (sz.pozycje.filter(function (x) { return x.id === l.id; })[0] || {}).naCo in { kwota: 1, ilosc: 1 }; })
          .map(function (l) { return [l.nazwa, zl(l.kwota)]; }))
        : [
        ["Szablon urządzenia", d.typ], ["Platformy", (urz || "–") + " = " + m.MP + " MP"], ["Agregaty", (d.agregaty || 0) + " szt."],
        ["Magistrala / barierki / maskownice", (d.magistrala || 0) + " × 6 m / " + (d.barierki || 0) + " / " + (d.maskownice || 0)],
        ["Zagłębienia (cennik)", wy.gl], ["Wymiary niestandardowe", wy.dims]])
        .concat([["Utrudnienia", n2(m.utr) + " osd (auto " + n2(m.utrAuto) + ", ręcznie " + n2(d.utr_dod || 0) + ")"]]) },
      { tytul: "Montaż i transport", pary: [
        ["Transport", (d.tir || 0) + (sz.import.wl ? " kont. / transp." : " TIR") + " × " + zl(d.tir_cena || 0)],
        ["Rozładunek sprzętu", zl(d.rozl_cena || 0) + (sz.opcje.rozladunekNaTransport ? " za transport" : " jednorazowo") + ", " + n2(w.rozl) + " dni rozładunku"]]
        .concat(r.cennik.dzwig || d.dzwig_koszt != null ? [["Spider Crane", w.dzwDni + " dni × " + zl(r.cennik.dzwig) + " = " + zl(ws[0].koszty.dzwig) + (d.dzwig_koszt != null ? " (wpisane ręcznie)" : "")]] : [])
        .concat([
        ["Ekipa", ws[0].osoby + " os., średnio " + zl(ws[0].stawka) + "/dzień"],
        ["Czas montażu", ws[0].dni + " dni pracy = " + ws[0].tygodnie + " tyg."],
        ["Czas podróży", d.wzor === "uproszczony" ? "uproszczony (650 km dziennie)" : "stary wzór (poprawiony)"]]) },
      { tytul: "Narzuty i serwis", pary: [
        ["Zysk", pct(d.zysk) + " oraz " + pct(d.zysk2) + " do porównania"]]
        .concat(nB ? [["Dopłata " + nB, m.brakB ? "nie wpisano" : sz.wariantB.tryb === "szt" ? zl(m.dopB) + "/szt. (" + pct(m.q2500) + ")" : pct(m.q2500)]] : [])
        .concat([["Kurs EUR/PLN" + (lista ? " / USD/PLN" : ""), String(d.eur) + (lista ? " / " + d.usd : "")],
        ["Konserwacja", r.konserwacja.map(function (k) { return k.stawka + " zł/" + jm + "/mies.: " + zl(k.rok) + " rocznie" + (sz.opcje.przeglad ? ", " + zl(k.pol) + " półrocznie" : ""); }).join("; ")]]) }
    ];
    function rows(def, src) {
      return def.map(function (row) {
        return { label: row[0], fmt: row[1], bold: !!row[3], vals: src.map(function (x) { return typeof row[2] === "function" ? row[2](x) : x[row[2]]; }) };
      });
    }
    var head = ["Pozycja"].concat(ws.map(function (x) { return x.nazwa; }));
    var ceny = { head: head, rows: rows([
      ["Cena netto, " + zA, "zl", "cena", 1], ["Cena netto, " + zB, "zl", "cena2", 1],
      ["Cena za MP, " + zA, "zl", "cenaMP"], ["Cena za MP, " + zB, "zl", "cenaMP2"], ["Cena za MP w euro, " + zA, "eur", "cenaMPeur"],
      ["Dni pracy ekipy", "int", "dni"], ["Tygodnie montażu", "int", "tygodnie"]], ws) };
    var struktura = { head: head, rows: rows([
      ["Urządzenia (materiały)", "zl", function (x) { return x.koszty.urzadzenia; }],
      ["Słupki e-ładowarek", "zl", function (x) { return x.koszty.slupki; }],
      ["Transport, dźwig, rozładunek", "zl", function (x) { return x.koszty.transport + x.koszty.dzwig + x.koszty.rozladunek_sprzet; }],
      ["Robocizna", "zl", function (x) { return x.koszty.montaz + x.koszty.rozladunek_ludzie + x.koszty.dojazdy; }],
      ["Hotel, diety, paliwo", "zl", function (x) { return x.koszty.hotel + x.koszty.diety + x.koszty.paliwo; }],
      ["KOB i podatek (" + zA + ")", "zl", function (x) { return x.kob + x.podatek; }],
      ["Zysk z narzutem, " + zA, "zl", "zyskN"], ["Zysk z narzutem, " + zB, "zl", "zyskN2"], ["Koszt rzeczywisty", "zl", "koszt", 1],
      ["Osobodni razem", "n", "osobodni"]], ws) };
    var kol = nB ? [0, 1, 2, 3] : [0, 2], wybierz = function (v) { return kol.map(function (i) { return v[i]; }); };
    var opcje = {
      head: ["Opcja"].concat(wybierz([nA + ", " + zA, nB + ", " + zA, nA + ", " + zB, nB + ", " + zB])),
      rows: (sz.opcje.slupki === false ? [] : [
        { label: "Słupki e-ładowarek 3,7 kW", fmt: "zl", vals: wybierz([r.opcje.slupki37[0], r.opcje.slupki37[1], r.opcje.slupki37b[0], r.opcje.slupki37b[1]]) }
      ]).concat(lista ? [] : [{ label: "Malowanie proszkowe RAL", fmt: "zl", vals: wybierz([r.opcje.malowanie, r.opcje.malowanie, r.opcje.malowanieB, r.opcje.malowanieB]) }])
        .concat((r.opcje.pozycje || []).map(function (p) { return { label: p.nazwa, fmt: "zl", vals: wybierz([p.kwota, p.kwota, p.kwotaB, p.kwotaB]) }; }))
    };
    function matDla(m, sz) {
    var nB = sz.wariantB.nazwa;
    return sz.model === "lista" ? m.wiersze.map(function (x) { return [x[0], zl(x[1])]; }).concat([["Suma " + (sz.wariantA || "2000 kg"), zl(m.suma2000)]])
      .concat(nB ? [["Suma " + nB + (m.brakB ? " (nie wpisano dopłaty)" : " (+" + pct(m.q2500) + ")"), zl(m.suma2500)]] : []) : [
      ["Cena platformy D / S / N.P.", zl(m.cenaD) + " / " + zl(m.cenaS) + " / " + zl(m.cenaNP)],
      ["Platformy S z dopłatami", zl(m.platS)], ["Platformy D z dopłatami", zl(m.platD)], ["Platformy N.P.", zl(m.platNP)],
      ["Siłowniki (pary): std / 2000 / 2250", m.sil.std + " / " + m.sil.s2000 + " / " + m.sil.s2250],
      ["Hydraulika", zl(m.hydraulika)], ["Barierki i maskownice", zl(m.barierki)], ["Elektryka", zl(m.elektryka)],
      ["Mechanika zakupowa i pozostałe", zl(m.mechanika)], ["Suma Q=2000", zl(m.suma2000)],
      ["Suma Q=2500 (+" + pct(m.q2500) + ")", zl(m.suma2500)]
    ];
    }
    /* wycena łączona: materiały każdej pozycji osobnym blokiem, montaż wspólny */
    var DOD = r.dodatkowe || [], RZ = r.razem || { MP: m.MP, platformy: m.platformy, brakB: m.brakB, konsBaza: sz.opcje.konserwacjaNa === "szt" ? m.platformy : m.MP };
    var mat = !DOD.length ? matDla(m, sz) : [["Pozycja 1 · " + d.typ, ""]].concat(matDla(m, sz)).concat(DOD.reduce(function (a, x, i) {
      return a.concat([["Pozycja " + (i + 2) + " · " + x.szablon.nazwa, ""]]).concat(matDla(x.mat, x.szablon));
    }, []));
    /* krótka informacja o stawce przy pozycji (wartości bieżącej wyceny, z ewentualnymi zmianami) */
    var C = r.cennik, w0 = ws[0], st = function (x) { return fmt0.format(Math.round(x)); };
    /* opisy liczone dla danego wariantu (na ekranie: wariant wybrany przełącznikiem) */
    function infoDla(w0) {
    var brutto0 = w0.baza / (1 - (C.kob + C.gdw + d.zysk));
    return {
      paliwo: w0.km + " km × " + n2(Math.ceil(C.spalanie * C.paliwo)) + " zł/100 km (" + n2(C.spalanie) + " l × " + n2(C.paliwo) + " zł)",
      hotel: w.krk ? "Kraków: bez hotelu" : w0.noclegi + " noclegów × " + st(C.hotel) + " zł/doba",
      dzwig: d.dzwig_koszt != null ? "wpisane ręcznie" : w.dzwDni + " dni × " + st(C.dzwig) + " zł/dzień",
      diety: w.krk ? "Kraków: bez diet" : n2(w0.osobodni) + " osd × " + st(C.dieta) + " zł",
      montaz: n2(w0.osd) + " osd × " + st(w0.stawka) + " zł (średnia stawka)",
      transport: (d.tir || 0) + (sz.import.wl ? " kont." : " TIR") + " × " + st(d.tir_cena || 0) + " zł",
      urzadzenia: DOD.length ? "obie pozycje (patrz wyżej)" : lista ? "cena urządzeń i pozycji kosztowych (patrz wyżej)" : "platformy, siłowniki, hydraulika, elektryka (patrz wyżej)",
      slupki: RZ.MP + " MP × " + st(C.slupek) + " zł",
      rozladunek_sprzet: st(d.rozl_cena || 0) + " zł" + (sz.opcje.rozladunekNaTransport ? " × " + (d.tir || 0) + " transp." : " jednorazowo"),
      rozladunek_ludzie: n2(w.rozl) + " dni × " + w0.osoby + " os. × " + st(w0.stawka) + " zł",
      dojazdy: n2(w0.podroze - w0.osoby * w.rozl) + " osd podróży × " + st(w0.stawka) + " zł",
      baza: "suma kosztów powyżej",
      kob: pct3(C.kob) + " ceny przed podatkiem (" + zl(brutto0) + ")",
      gdw: pct3(C.gdw) + " ceny przed podatkiem",
      zysk: pct(d.zysk) + " ceny przed podatkiem",
      zyskN: "zysk " + pct(d.zysk) + " + GDW " + pct3(C.gdw),
      podatek: pct(C.podatek) + " od robocizny (" + zl(w0.robocizna) + ") i zysku z narzutem",
      cena: "suma ÷ (1 − KOB − GDW − zysk) + podatek",
      koszt: "cena − zysk z narzutem",
      osd: "z cennika osobodni na urządzenie + utrudnienia" + (DOD.length ? " (obie pozycje)" : ""),
      km: "dojazdy na montaż, pomiary i odbiory w obie strony",
      wyjazdy: w.krk ? "Kraków: liczba dni montażu" : "tygodniowe wyjazdy ekipy",
      podroze: "pomiary, odbiory, rozładunek i dojazdy ekipy",
      dni: "(osd montażu + podróży) ÷ " + w0.osoby + " os.",
      noclegi: w.krk ? "Kraków: bez noclegów" : "(dni pracy + 1) × " + w0.osoby + " os."
    };
    }
    var infoW = ws.map(infoDla), info = infoW[0];
    var mon = { head: head, rows: [
      ["Osobodni montażu", "n", "osd"], ["Tygodnie / dni montażu", "int", "wyjazdy"],
      ["Osobodni podróży i rozładunku", "n", "podroze"], ["Dni pracy ekipy", "int", "dni"],
      ["Kilometry auta", "int", "km"], ["Noclegi (osobonoce)", "int", "noclegi"],
      ["Urządzenia", "zl", "urzadzenia", 0, 1], ["Słupki", "zl", "slupki", 0, 1], ["Paliwo", "zl", "paliwo", 0, 1],
      ["Hotel", "zl", "hotel", 0, 1], ["Transport", "zl", "transport", 0, 1], ["Spider Crane", "zl", "dzwig", 0, 1],
      ["Rozładunek, sprzęt", "zl", "rozladunek_sprzet", 0, 1], ["Rozładunek, ludzie", "zl", "rozladunek_ludzie", 0, 1],
      ["Dojazdy, ludzie", "zl", "dojazdy", 0, 1], ["Montaż", "zl", "montaz", 0, 1], ["Diety", "zl", "diety", 0, 1],
      ["Suma przed narzutami", "zl", "baza", 1], ["KOB", "zl", "kob"], ["GDW", "zl", "gdw"], ["Zysk " + pct(d.zysk), "zl", "zysk"], ["Zysk z narzutem (zysk + GDW)", "zl", "zyskN"],
      ["Podatek", "zl", "podatek"], ["Cena kontraktu, " + zA, "zl", "cena", 1], ["Koszt rzeczywisty", "zl", "koszt", 1]
    ].map(function (row) {
      return { label: row[0], info: info[row[2]] || "", infoW: infoW.map(function (q) { return q[row[2]] || ""; }), fmt: row[1], bold: !!row[3], koszt: !!row[4], vals: ws.map(function (x) { return row[4] ? x.koszty[row[2]] : x[row[2]]; }) };
    }) };
    /* raport: jedna kolumna (wariant podstawowy), pozycje zerowe pominięte; 2500 kg i słupki tylko jako dopłaty */
    var mon1 = mon.rows.filter(function (x) { return !(x.koszt && !x.vals[0]); }).map(function (x) { return { label: x.label, info: x.info, fmt: x.fmt, bold: x.bold, val: x.vals[0] }; });
    var W = r.warianty, dod = [];
    if (nB && RZ.brakB) dod.push({ label: "Wariant " + nB, info: "nie wpisano ceny dla zwiększonego udźwigu" + (m.brakB ? "" : " (" + DOD.filter(function (x) { return x.mat.brakB; }).map(function (x) { return x.szablon.nazwa; }).join(", ") + ")"), vals: [null, null] });
    else if (nB) dod.push({ label: "Wariant " + nB, info: sz.wariantB.tryb === "szt" ? "+" + st(m.dopB) + " zł/szt. do ceny urządzeń" : "+" + pct(m.q2500) + " do ceny urządzeń",
      vals: [W[1].cena - W[0].cena, W[1].cena2 - W[0].cena2] });
    if (sz.opcje.slupki !== false) {
      dod.push({ label: "Słupki e-ładowarek 3,7 kW", info: RZ.MP + " MP × " + st(C.slupek) + " zł + montaż", vals: [r.opcje.slupki37[0], r.opcje.slupki37b[0]] });
    }
    if (!lista) dod.push({ label: "Malowanie proszkowe RAL", info: "", vals: [r.opcje.malowanie, r.opcje.malowanieB] });
    (r.opcje.pozycje || []).forEach(function (q) { dod.push({ label: q.nazwa, info: "", vals: [q.kwota, q.kwotaB] }); });
    var dodatki = { head: ["Opcja (dopłata do ceny " + nA + ")", "Skąd", "przy zysku " + pct(d.zysk), "przy zysku " + pct(d.zysk2)], rows: dod };
    var N = r.negocjacje, neg = N && {
      N: N,
      head: ["Zysk", "Cena netto", "Rabat od oferty", "Rabat %", "Zysk z narzutem", "Cena za MP"],
      rows: N.wiersze.map(function (x) {
        return { x: x, vals: [pct(x.zysk) + (x.oferta ? "  oferta" : x.porownanie ? "  do porównania" : x.prog ? "  próg" : ""), zl(x.cena), x.rabat ? "−" + zl(x.rabat) : "–",
          x.rabat ? "−" + n2(x.rabatPct * 100) + "%" : "–", zl(x.zyskN), zl(x.cenaMP)] };
      })
    };
    /* karta inwestycji na 1. stronę: to, co widać w ofercie (urządzenia, agregaty, wymiary, konserwacja) */
    var odmiana = function (n, a, b, c) { var r10 = n % 10, r100 = n % 100; return n === 1 ? a : r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? b : c; };
    var kod = function (k) {
      var t = String(T[k].oferta || "").replace(/\{typ\}/g, d.typ), mm = t.match(/\bNK[\w-]*/i);
      return mm ? mm[0].replace(/-\d+cm$/i, "") : T[k].nazwa;
    };
    var baza = RZ.konsBaza;
    var urzDla = function (dd, TT) {
      var kd = function (k) { var t = String(TT[k].oferta || "").replace(/\{typ\}/g, dd.typ), mm = t.match(/\bNK[\w-]*/i); return mm ? mm[0].replace(/-\d+cm$/i, "") : TT[k].nazwa; };
      return ["S", "D", "NP"].filter(function (x) { return dd[x]; }).map(function (x) { return dd[x] + "× " + kd(x); }).join(" + ") || "–";
    };
    var agrDla = function (dd, zs) { return zs.opcje.agregaty || dd.agregaty ? (dd.agregaty || 0) + " szt. (" + (agrMoc(dd) || "3 kW / 6 kW: nie podano") + ")" : ""; };
    var wymDla = function (dd, oo, pref, dlM) {
      var wpx = wymiaryPary(dd, oo || {});
      return wpx.map(function (x, i) {
        var t = [], pr = pref ? pref + " · " : "";
        if (pref) {   // wycena łączona: zwięźlej, prześwit i długość miejsca obok w tym samym wierszu
          var zg = x.h1 != null && x.h1 !== "" ? [pr + "Zagłębienie" + (wpx.length > 1 ? " (" + (i + 1) + ")" : ""), (x.h2 != null && x.h2 !== x.h1 ? "H1 " + x.h1 + " / H2 " + x.h2 : x.h1) + " cm" + (x.dl ? ", dł. " + x.dl : "")] : null;
          var pw = x.p != null && x.p !== "" ? ["Prześwit", "P " + x.p + " cm"] : null;
          if (zg) t.push(pw ? zg.concat([0, pw]) : zg); else if (pw) t.push([pr + pw[0], pw[1]]);
          if (x.gor != null || x.dol != null) t.push([pr + "Wysokość pojazdów", [k(x.gor) + " cm", k(x.dol) + " cm"]].concat(dlM && i === 0 ? [0, ["Długość miejsca", dlM]] : []));
          return t;
        }
        if (x.h1 != null && x.h1 !== "") t.push([pr + "Zagłębienie" + (wpx.length > 1 ? " (wariant " + (i + 1) + ")" : ""), (x.h2 != null && x.h2 !== x.h1 ? "H1 " + x.h1 + " / H2 " + x.h2 : x.h1) + " cm" + (x.dl ? ", dł. " + x.dl + " cm" : "")]);
        if (x.p != null && x.p !== "") t.push([pr + "Prześwit", "P " + x.p + " cm"]);   // oznaczenie jak przy zagłębieniu (H1 …)
        if (x.gor != null || x.dol != null) t.push([pr + "Wysokość pojazdów", [k(x.gor) + " cm", k(x.dol) + " cm"]]);
        return t;
      });
    };
    var dlDla = function (dd, zs) { return zs.model === "lista" && (dd.dlMiejsca || (dd.wysokosci || {}).dlugosc) ? (dd.dlMiejsca || dd.wysokosci.dlugosc) + " cm" : ""; };
    /* Zakres (lewe okienko karty): urządzenia, razem, agregaty; przy wycenie łączonej każda pozycja osobno */
    var zakres = [], wymiaryK, mpOdm = function (n) { return n + " " + odmiana(n, "miejsce postojowe", "miejsca postojowe", "miejsc postojowych"); };
    if (!DOD.length) {
      zakres.push(["Urządzenia", urzDla(d, T), 1], ["Razem", m.platformy + " " + odmiana(m.platformy, "urządzenie", "urządzenia", "urządzeń") + " = " + mpOdm(m.MP)]);
      if (agrDla(d, sz)) zakres.push(["Agregaty", agrDla(d, sz)]);
      wymiaryK = wymDla(d, o);
    } else {
      [{ dane: d, szablon: sz, mat: m }].concat(DOD).forEach(function (x, i) {
        var ag = x.dane.agregaty ? x.dane.agregaty + " szt." + (agrMoc(x.dane) ? " (" + agrMoc(x.dane) + ")" : "") : "";
        zakres.push(["Pozycja " + (i + 1) + " · " + x.szablon.nazwa, urzDla(x.dane, x.szablon.typy) + " = " + x.mat.MP + " MP", 1].concat(ag ? [["Agregaty", ag]] : []));
      });
      zakres.push(["Razem", RZ.platformy + " " + odmiana(RZ.platformy, "urządzenie", "urządzenia", "urządzeń") + " = " + mpOdm(RZ.MP)]);
      wymiaryK = wymDla(d, o, d.typ, dlDla(d, sz)).concat(DOD.reduce(function (a, x) { return a.concat(wymDla(x.dane, {}, x.szablon.nazwa, dlDla(x.dane, x.szablon))); }, []));
    }
    var pozW0 = ws[0].pozycje;
    var karta = {
      zakres: zakres,
      /* ceny pozycji wyceny łączonej (wariant podstawowy): udział we wspólnych kosztach wg osobodni */
      pozycje: pozW0 ? [{ dane: d, szablon: sz, mat: m }].concat(DOD).map(function (x, i) {
        return { nazwa: "Pozycja " + (i + 1) + " · " + urzDla(x.dane, x.szablon.typy), cena: pozW0[i].cena, cena2: pozW0[i].cena2, MP: pozW0[i].MP, cenaMP: pozW0[i].cenaMP, cenaMP2: pozW0[i].cenaMP2 };
      }) : null,
      adres: d.nazwa || "bez nazwy", data: (/^\d{4}-\d{2}-\d{2}$/.test(d.data || "") ? d.data.split("-").reverse().join(".") : (d.data || "–")) + ", " + godzina(),
      lok: d.lok + (w.krk ? "" : " · " + (d.km || 0) + " km od Krakowa"),
      urz: ["S", "D", "NP"].filter(function (x) { return d[x]; }).map(function (x) { return d[x] + "× " + kod(x); }).join(" + ") || "–",
      razem: RZ.platformy + " " + odmiana(RZ.platformy, "urządzenie", "urządzenia", "urządzeń") + " = " + mpOdm(RZ.MP),
      agregaty: sz.opcje.agregaty || d.agregaty ? (d.agregaty || 0) + " szt. (" + (agrMoc(d) || "3 kW / 6 kW: nie podano") + ")" : "",   // suma, w nawiasie podział na moc
      agrOpis: d.agrOpis || "", kobGdw: pct3(r.cennik.kob) + " / " + pct3(r.cennik.gdw),
      wymiary: wymiaryK,
      dlMiejsca: DOD.length ? "" : dlDla(d, sz),   // przy wycenie łączonej obok wysokości pojazdów każdej pozycji
      wyposazenie: lista ? "" : "barierki " + (d.barierki || 0) + " · maskownice " + (d.maskownice || 0) + " · magistrala " + (d.magistrala || 0) + " × 6 m",
      opis: (DOD.length ? d.typ + ": " : "") + opisEfektywny(d, o) + DOD.map(function (x) { return " · " + x.szablon.nazwa + ": " + opisEfektywny(x.dane, {}); }).join(""),
      montaz: ws[0].tygodnie + " tyg. (" + ws[0].dni + " dni pracy), ekipa " + ws[0].osoby + " os.",
      transport: (d.tir || 0) + (sz.import.wl ? " kont." : " TIR") + " × " + zl(d.tir_cena || 0) + (r.cennik.dzwig || d.dzwig_koszt != null ? " · Spider Crane " + w.dzwDni + " " + odmiana(w.dzwDni, "dzień", "dni", "dni") : ""),
      konserwacja: r.konserwacja.map(function (x, i) {
        var bazaT = !DOD.length ? baza + " " + jm : [{ dane: d, szablon: sz, mat: m }].concat(DOD).map(function (q) { return q.szablon.opcje.konserwacjaNa === "szt" ? q.mat.platformy + " szt." : q.mat.MP + " MP"; }).join(" + ");
        return { nazwa: "Konserwacja · wariant " + (i + 1), stawka: x.stawka + " zł / " + jm + " / mies.", baza: bazaT, bazaN: baza, mies: x.stawka * baza, rok: x.rok, przeglad: x.rok / 2 };
      })
    };
    var naPierwszej = /^(Nazwa \/ adres|Data|Opis \/ wariant|Prześwit|Zagłębienie H1|Długość zagłębienia|Wysokość pojazdów|Lokalizacja|Platformy|Urządzenia|Agregaty|Magistrala|Transport|Czas montażu|Ekipa|Konserwacja|Szablon urządzenia|Zysk|Dopłata|Spider Crane|Rozładunek sprzętu)/, szczegoly = [];
    grupy.forEach(function (g) { g.pary.forEach(function (pp) { if (!naPierwszej.test(pp[0])) szczegoly.push(pp); }); });
    return { mon1: mon1, dodatki: dodatki, szczegoly: szczegoly, grupy: grupy, ceny: ceny, struktura: struktura, opcje: opcje, mat: mat, mon: mon, zA: zA, zB: zB, jm: jm, przeglad: sz.opcje.przeglad, neg: neg, karta: karta };
  }

  function fmtVal(v, f) {
    if (f === "zl") return zl(v);
    if (f === "eur") return eur(v);
    if (f === "int") return fmt0.format(v);
    if (f === "n") return n2(v);
    return String(v);
  }

  /* Cennik szablonu jako lista [etykieta, wartość, jednostka] w grupach. */
  function cennikWiersze(r, pola, zmiany) {
    var out = [], sz = r.szablon;
    pola.forEach(function (p) {
      if (!p[1]) { out.push({ grupa: p[0] }); return; }
      out.push({ label: p[1], val: r.cennik[p[0]], jedn: p[2], zm: zmiany && zmiany[p[0]] !== undefined });
    });
    var lista = sz.model === "lista";
    out.push({ grupa: lista ? "Typy urządzeń (cena, MP, osobodni)" : "Typy platform (MP, osobodni montażu)" });
    ["S", "D", "NP"].forEach(function (k) {
      var t = sz.typy[k]; if (lista && !t.nazwa) return;
      out.push({ label: t.nazwa, val: (lista ? t.cena + " " + t.waluta + "/szt., " : "") + t.mp + " MP, " + t.osd + " osd", jedn: "" });
    });
    if (lista) {
      if (sz.pozycje.length) out.push({ grupa: "Pozycje kosztowe" });
      sz.pozycje.forEach(function (x) { out.push({ label: x.nazwa + (x.opcja ? " (opcja)" : ""), val: x.naCo === "kwota" ? "wpisywana" : x.cena + " " + x.waluta + (x.wsp !== 1 ? " × " + x.wsp : ""), jedn: "" }); });
      if (sz.import.wl) { out.push({ grupa: "Fracht: koszty kontenera" }); sz.import.koszty.forEach(function (x) { out.push({ label: x.nazwa, val: x.kwota + " " + x.waluta, jedn: "" }); }); }
      if (sz.wariantB.nazwa) { out.push({ grupa: "Wariant 2" }); out.push({ label: sz.wariantB.nazwa, val: sz.wariantB.tryb === "szt" ? sz.wariantB.wartosc + " " + sz.wariantB.waluta + "/szt." : (sz.wariantB.wartosc * 100) + "%", jedn: "" }); }
      return out;
    }
    out.push({ grupa: "Zagłębienia (dopłata, siłownik)" });
    sz.glebokosci.forEach(function (g) { out.push({ label: g.cm + " cm", val: g.doplata, jedn: "zł · " + g.silownik }); });
    out.push({ grupa: "Szerokości i długości" });
    sz.szerokosci.S.concat(sz.szerokosci.D).forEach(function (x) { out.push({ label: "Szerokość " + x.nazwa, val: x.cena, jedn: "zł" }); });
    sz.dlugosci.forEach(function (x) { out.push({ label: "Długość " + x.nazwa, val: x.wartosc, jedn: x.tryb === "kwota" ? "zł" : "cm × wsp." }); });
    out.push({ grupa: "Składowe platformy (cena, ilość S / D)" });
    sz.skladowe.forEach(function (x) { out.push({ label: x.nazwa, val: x.cena, jedn: x.ilS + " / " + x.ilD + " · " + x.grupa }); });
    return out;
  }

  /* ------------------------------------------------------------ Excel */
  function xlsx(r, ctx) {
    var R = raport(r, ctx.GLEBOKOSCI, ctx.oferta), d = r.dane, w0 = r.warianty[0];
    var wb = new L.ExcelJS.Workbook();
    wb.creator = "Kalkulator NK38";
    var FONT = "Arial";
    var C = { acc: "FF0A6B74", accSoft: "FFE3F2F2", ink: "FF0E171C", muted: "FF6A7780", line: "FFD3D9DD", zebra: "FFF7F8F9", warn: "FF8A5300", tile: "FFF3F8F8" };
    var NF = { zl: '#,##0 "zł";-#,##0 "zł";"–"', eur: '#,##0 "€"', int: "#,##0", n: "#,##0.00" };
    var thin = { style: "thin", color: { argb: C.line } };
    var box = { top: thin, bottom: thin, left: thin, right: thin };
    function fill(argb) { return { type: "pattern", pattern: "solid", fgColor: { argb: argb } }; }
    function font(o) { return Object.assign({ name: FONT, size: 10, color: { argb: C.ink } }, o || {}); }
    /* skala zamiast "dopasuj do strony": Excel przy dopasowaniu ignoruje ręczne podziały stron */
    function sheet(name, widths, scale) {
      var ws = wb.addWorksheet(name, { views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: false, scale: scale || 85,
          margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.55, header: 0.25, footer: 0.25 } } });
      ws.columns = widths.map(function (x) { return { width: x }; });
      ws.headerFooter.oddFooter = "&L&8" + (d.nazwa || "Kalkulator NK38") + "&R&8Strona &P z &N";
      return ws;
    }
    function banner(ws, title, sub, cols) {
      var r1 = ws.addRow([title]); ws.mergeCells(r1.number, 1, r1.number, cols);
      r1.height = 24; r1.getCell(1).font = font({ size: 13, bold: true });   // bez zalanego tła, jak w raporcie PDF
      r1.getCell(1).alignment = { vertical: "bottom" }; r1.getCell(1).border = { bottom: { style: "medium", color: { argb: C.acc } } };
      var r2 = ws.addRow([sub]); ws.mergeCells(r2.number, 1, r2.number, cols);
      r2.getCell(1).font = font({ size: 9, color: { argb: C.muted } }); r2.getCell(1).alignment = { indent: 1 };
      ws.addRow([]);
    }
    function section(ws, title, cols) {
      var x = ws.addRow([title]); ws.mergeCells(x.number, 1, x.number, cols);
      x.height = 22; x.getCell(1).font = font({ size: 11, bold: true, color: { argb: C.acc } });
      x.getCell(1).alignment = { vertical: "bottom" };
      x.getCell(1).border = { bottom: { style: "medium", color: { argb: C.acc } } };
    }
    function table(ws, head, rows) {
      var h = ws.addRow(head); h.height = 30;
      h.eachCell(function (c, i) {
        c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } });
        c.alignment = { horizontal: i === 1 ? "left" : "right", vertical: "middle", wrapText: true, indent: i === 1 ? 1 : 0 };
      });
      rows.forEach(function (row, ri) {
        var x = ws.addRow([row.label].concat(row.vals));
        x.eachCell({ includeEmpty: true }, function (c, i) {
          c.border = box; c.font = font({ bold: !!row.bold });
          if (ri % 2 === 1) c.fill = fill(C.zebra);
          if (i === 1) c.alignment = { indent: 1, vertical: "middle", wrapText: true };
          else { c.numFmt = NF[row.fmt] || "General"; c.alignment = { horizontal: "right", vertical: "middle" }; }
        });
        if (row.bold) x.eachCell(function (c) { c.fill = fill(C.accSoft); });
      });
      ws.addRow([]);
    }
    function pairs(ws, list, cols, labelW, lc) {   // lc: ile kolumn zajmuje etykieta (domyślnie 1)
      lc = lc || 1;
      list.forEach(function (p) {
        var x = ws.addRow(lc > 1 ? [p[0], ""].concat([p[1]]) : [p[0], p[1]]);
        if (lc > 1) ws.mergeCells(x.number, 1, x.number, lc);
        ws.mergeCells(x.number, lc + 1, x.number, cols);
        var a = x.getCell(1), b = x.getCell(lc + 1);
        a.font = font({ color: { argb: C.muted } }); a.fill = fill(C.zebra); a.border = box; a.alignment = { indent: 1, vertical: "top", wrapText: true };
        b.font = font(); b.border = box; b.alignment = { wrapText: true, vertical: "top", indent: 1 };
        var len = String(p[1]).length; if (len > (labelW || 70)) x.height = 15 * Math.ceil(len / (labelW || 70));
      });
      ws.addRow([]);
    }
    var gen = "Wygenerowano " + new Date().toLocaleString("pl-PL") + " · ceny netto w zł · szablon " + d.typ;

    /* 1. Podsumowanie */
    var s1 = sheet("Kalkulacja", [30, 17, 15, 16, 17, 21], 78), N = R.neg.N, K = R.karta;
    /* nagłówek: adres inwestycji i data kalkulacji */
    var b1 = s1.addRow(["KALKULACJA " + d.typ, "", "", "", "Data kalkulacji"]), b2 = s1.addRow([K.adres, "", "", "", K.data]);
    [b1, b2].forEach(function (row) { s1.mergeCells(row.number, 1, row.number, 4); s1.mergeCells(row.number, 5, row.number, 6); });
    b1.height = 16; b2.height = 26;
    [b1.getCell(1), b1.getCell(5), b2.getCell(1), b2.getCell(5)].forEach(function (c, i) {   // bez tła: adres i data, linia akcentu pod spodem
      c.alignment = { vertical: i < 2 ? "bottom" : "middle", horizontal: i % 2 ? "right" : "left" };
      c.font = i < 2 ? font({ size: 8, color: { argb: C.muted } }) : font({ size: i === 2 ? 16 : 13, bold: true });
      if (i >= 2) c.border = { bottom: { style: "medium", color: { argb: C.acc } } };
    });
    var b3 = s1.addRow([gen]); s1.mergeCells(b3.number, 1, b3.number, 6);
    b3.getCell(1).font = font({ size: 9, color: { argb: C.muted } });
    s1.addRow([]);
    /* tabelka cen jak w raporcie: cena całkowita i za MP tym samym krojem */
    var MPn = (r.razem || r.mat).MP || 0, rabS = function (c) { return "−" + zl(N.cenaA - c) + " (−" + n2((N.cenaA - c) / N.cenaA * 100) + "%)"; };
    var hc = s1.addRow(["Cena", "", "", "Cena netto", "Cena za MP", "Rabat od oferty"]); s1.mergeCells(hc.number, 1, hc.number, 3); hc.height = 20;
    hc.eachCell(function (c, i) { if (i === 2 || i === 3) return; c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } }); c.alignment = { horizontal: i === 1 ? "left" : "right", vertical: "middle", indent: i === 1 ? 1 : 0 }; });
    [["Cena ofertowa · zysk " + pct(N.zA) + " · " + w0.nazwa + (w0.cenaMPeur ? " · " + eur(w0.cenaMPeur) + " / MP" : ""), N.cenaA, "–"],
     ["Można zejść do · zysk " + pct(N.zB), N.cenaB, rabS(N.cenaB)], ["Próg opłacalności · zysk 0% (maks. rabat)", N.cenaMin, rabS(N.cenaMin)]]
      .concat((K.pozycje || []).map(function (q) { return ["   w tym " + q.nazwa, q.cena, "–", q.MP]; })).forEach(function (q) {
      var x = s1.addRow([q[0], "", "", q[1], (q[3] || MPn) ? q[1] / (q[3] || MPn) : 0, q[2]]); s1.mergeCells(x.number, 1, x.number, 3);
      x.eachCell({ includeEmpty: true }, function (c, i) {
        if (i === 2 || i === 3) return;   // scalone z kolumną 1: wspólny styl
        c.border = box; c.font = font({ bold: i === 4 || i === 5 });
        c.alignment = i === 1 ? { indent: 1, vertical: "middle" } : { horizontal: "right", vertical: "middle" };
        if (i === 4 || i === 5) c.numFmt = NF.zl;
      });
    });
    s1.addRow([]);
    section(s1, "Pole do negocjacji: o ile można zejść z ceny (" + w0.nazwa + ")", 6);
    var GOOD = "FFE3F4EA", GOODT = "FF13794A", WARN = "FFFDF3DD", BAD = "FFFDECEA", BADT = "FFB42318";
    var hn = s1.addRow(R.neg.head); hn.height = 26;
    hn.eachCell(function (c, i) { c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } }); c.alignment = { horizontal: i === 1 ? "left" : "right", vertical: "middle", wrapText: true, indent: i === 1 ? 1 : 0 }; });
    N.wiersze.forEach(function (x) {
      var row = s1.addRow([x.zysk, x.cena, x.rabat ? -x.rabat : 0, x.rabat ? -x.rabatPct : 0, x.zyskN, x.cenaMP]);
      var kolor = x.oferta ? C.accSoft : x.porownanie ? GOOD : x.prog ? BAD : x.zysk < N.zB ? WARN : "FFF4FAF6";
      var tekst = x.oferta ? C.acc : x.porownanie ? GOODT : x.prog ? BADT : C.ink;
      row.eachCell({ includeEmpty: true }, function (c, i) {
        c.border = box; c.fill = fill(kolor); c.font = font({ bold: x.oferta || x.porownanie, color: { argb: tekst } });
        c.numFmt = i === 1 ? '0.0%"' + (x.oferta ? "  oferta" : x.porownanie ? "  do porównania" : x.prog ? "  próg" : "") + '"' : i === 4 ? '0.0%;-0.0%;"–"' : NF.zl;
        c.alignment = { horizontal: i === 1 ? "left" : "right", indent: i === 1 ? 1 : 0, vertical: "middle" };
      });
    });
    var leg = s1.addRow(["Zielone: rabat bez zejścia poniżej zysku " + pct(N.zB) + ". Żółte: poniżej zysku do porównania. Przy zysku 0% w cenie zostają koszty, KOB, GDW i podatek."]);
    s1.mergeCells(leg.number, 1, leg.number, 6); leg.getCell(1).font = font({ size: 8.5, color: { argb: C.muted } }); leg.getCell(1).alignment = { wrapText: true, indent: 1 }; leg.height = 24;
    s1.addRow([]);

    /* karta inwestycji: zakres (lewa połowa) i wymiary (prawa), w obu ta sama siatka etykieta + wartość */
    section(s1, "Dane wejściowe", 6);
    var plasko = function (rows) { return rows.reduce(function (a, x) { a.push([x[0], Array.isArray(x[1]) ? "▲ " + x[1][0] + "    ▼ " + x[1][1] : x[1], x[2]]); if (x[3]) a.push([x[3][0], x[3][1]]); return a; }, []); };
    var lewa = plasko(K.zakres);
    if (K.wyposazenie) lewa.push(["Barierki / maskownice / magistrala", K.wyposazenie]);
    var prawa = [];
    K.wymiary.forEach(function (grp) { prawa = prawa.concat(plasko(grp)); });
    if (K.dlMiejsca) prawa.push(["Długość miejsca postojowego", K.dlMiejsca]);
    if (K.agrOpis) prawa.push(["Układ agregatów", K.agrOpis]);
    prawa.push(["KOB / GDW", K.kobGdw]);
    var naglK = s1.addRow(["ZAKRES", "", "", "WYMIARY"]); s1.mergeCells(naglK.number, 1, naglK.number, 3); s1.mergeCells(naglK.number, 4, naglK.number, 6);
    [1, 4].forEach(function (ci) { var c = naglK.getCell(ci); c.font = font({ size: 8, bold: true, color: { argb: C.acc } }); c.alignment = { indent: 1 }; c.border = { top: thin }; });
    for (var li = 0; li < Math.max(lewa.length, prawa.length); li++) {
      [0, 1].forEach(function (etap) {
        var L1 = lewa[li], P1 = prawa[li], kr = s1.addRow([L1 ? L1[etap] : "", "", "", P1 ? P1[etap] : ""]);
        s1.mergeCells(kr.number, 1, kr.number, 3); s1.mergeCells(kr.number, 4, kr.number, 6);
        kr.height = etap ? 18 : 13;
        [[L1, 1], [P1, 4]].forEach(function (z) {
          var c = kr.getCell(z[1]); c.alignment = { indent: 1, vertical: etap ? "top" : "bottom" };
          c.font = etap ? font({ size: 11, bold: true, color: { argb: z[0] && z[0][2] ? C.acc : C.ink } }) : font({ size: 8.5, color: { argb: C.muted } });
        });
      });
    }
    s1.addRow([]);
    var op = s1.addRow(["Opis wariantu", K.opis || "–"]); s1.mergeCells(op.number, 2, op.number, 6);
    op.getCell(1).font = font({ size: 8.5, color: { argb: C.muted } }); op.getCell(1).alignment = { indent: 1, vertical: "top" };
    op.getCell(2).font = font({ size: 10, bold: true }); op.getCell(2).alignment = { wrapText: true, vertical: "top" };
    if (String(K.opis).length > 75) op.height = 15 * Math.ceil(String(K.opis).length / 75);
    var e3 = s1.addRow(["Lokalizacja", "", "Montaż", "", "Transport", ""]), v3 = s1.addRow([K.lok, "", K.montaz, "", K.transport, ""]);
    [e3, v3].forEach(function (row, ri) {
      [1, 3, 5].forEach(function (ci) {
        s1.mergeCells(row.number, ci, row.number, ci + 1);
        var c = row.getCell(ci); c.alignment = { indent: 1, wrapText: true, vertical: "top" };
        c.font = ri ? font({ size: 10, bold: true }) : font({ size: 8.5, color: { argb: C.muted } });
      });
    });
    v3.height = 28;
    s1.addRow([]);
    /* opcje: 2500 kg i słupki tylko jako dopłata przy obu poziomach zysku */
    if (R.dodatki.rows.length) {
      var hd = s1.addRow([R.dodatki.head[0], R.dodatki.head[1], "", "", R.dodatki.head[2], R.dodatki.head[3]]); hd.height = 26;
      s1.mergeCells(hd.number, 2, hd.number, 4);
      hd.eachCell(function (c, i) { c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } }); c.alignment = { horizontal: i < 5 ? "left" : "right", vertical: "middle", wrapText: true, indent: i < 5 ? 1 : 0 }; });
      R.dodatki.rows.forEach(function (q) {
        var x = s1.addRow([q.label, q.info, "", "", q.vals[0] == null ? "–" : q.vals[0], q.vals[1] == null ? "–" : q.vals[1]]); s1.mergeCells(x.number, 2, x.number, 4);
        x.eachCell({ includeEmpty: true }, function (c, i) {
          c.border = box; c.font = font({ bold: i === 1, color: { argb: i > 1 && i < 5 ? C.muted : C.ink }, size: i > 1 && i < 5 ? 9 : 10 });
          c.alignment = i < 5 ? { indent: 1, vertical: "middle", wrapText: true } : { horizontal: "right", vertical: "middle" };
          if (i >= 5) c.numFmt = '"+"#,##0 "zł"';
        });
      });
      s1.addRow([]);
    }
    /* konserwacja: tabelka stawek 35–60 zł co 5 zł plus stawki z wyceny (pogrubione), jak w raporcie */
    var bK = K.konserwacja[0].bazaN, stW = r.konserwacja.map(function (k) { return k.stawka; }), stK = [35, 40, 45, 50, 55, 60];
    stW.forEach(function (v) { if (stK.indexOf(v) < 0) stK.push(v); }); stK.sort(function (a, b) { return a - b; });
    var hk = s1.addRow(["Konserwacja (" + K.konserwacja[0].baza + ")", "", "", "Miesięcznie", "Rocznie", "Jeden przegląd (co pół roku)"]); s1.mergeCells(hk.number, 1, hk.number, 3); hk.height = 26;
    hk.eachCell(function (c, i) { if (i === 2 || i === 3) return; c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } }); c.alignment = { horizontal: i === 1 ? "left" : "right", vertical: "middle", wrapText: true, indent: i === 1 ? 1 : 0 }; });
    stK.forEach(function (v) {
      var wi = stW.indexOf(v), mies = v * bK;
      var x = s1.addRow([v + " zł / " + R.jm + " / mies." + (wi >= 0 ? "  · wariant " + (wi + 1) : ""), "", "", mies, mies * 12, mies * 6]); s1.mergeCells(x.number, 1, x.number, 3);
      x.eachCell({ includeEmpty: true }, function (c, i) {
        if (i === 2 || i === 3) return;
        c.border = box; c.font = font({ bold: wi >= 0 });
        c.alignment = i === 1 ? { indent: 1, vertical: "middle" } : { horizontal: "right", vertical: "middle" };
        if (i >= 4) c.numFmt = NF.zl;
      });
    });
    s1.addRow([]);

    /* 2. Koszty krok po kroku i 3. cennik: na tym samym arkuszu (siatka 6 kolumn), każde na własnej stronie wydruku */
    s1.lastRow.addPageBreak();
    banner(s1, "Koszty · " + w0.nazwa + " · " + pct(d.zysk), "Skąd się biorą kwoty (wariant " + w0.nazwa + ") · ceny netto w zł", 6);
    section(s1, "Materiały i urządzenia", 6);
    pairs(s1, R.mat, 6, 70, 2);
    section(s1, "Montaż, narzuty i cena", 6);
    var hm = s1.addRow(["Pozycja", "", "Skąd ta kwota", "", "", "Kwota"]); s1.mergeCells(hm.number, 1, hm.number, 2); s1.mergeCells(hm.number, 3, hm.number, 5); hm.height = 20;
    [1, 3, 6].forEach(function (i) { var c = hm.getCell(i); c.fill = fill(C.accSoft); c.border = box; c.font = font({ bold: true, size: 9, color: { argb: C.acc } }); c.alignment = { horizontal: i < 6 ? "left" : "right", vertical: "middle", indent: i < 6 ? 1 : 0 }; });
    R.mon1.forEach(function (q, qi) {
      var x = s1.addRow([q.label, "", q.info, "", "", q.val]); s1.mergeCells(x.number, 1, x.number, 2); s1.mergeCells(x.number, 3, x.number, 5);
      [1, 3, 6].forEach(function (i) {   // styl tylko komórek głównych scaleń
        var c = x.getCell(i), opis = i === 3;
        c.border = box; c.font = font({ bold: q.bold, size: opis ? 9 : 10, color: { argb: opis ? C.muted : C.ink } });
        c.fill = fill(q.bold ? C.accSoft : qi % 2 ? C.zebra : "FFFFFFFF");
        c.alignment = i < 6 ? { indent: 1, vertical: "middle" } : { horizontal: "right", vertical: "middle" };
        if (i === 6) c.numFmt = NF[q.fmt] || "General";
      });
    });
    s1.addRow([]);
    if (R.szczegoly.length) {   // reszta danych wejściowych na stronie kosztów (strona 1 jest pełna)
      section(s1, "Pozostałe dane wejściowe", 6);
      pairs(s1, R.szczegoly, 6, 85, 2);
    }
    s1.lastRow.addPageBreak();
    banner(s1, "Cennik szablonu " + d.typ, "Pomarańczowe = zmienione względem domyślnego " + (d.typ || "szablonu"), 6);
    var cw = cennikWiersze(r, ctx.cennikPola, ctx.cennikZmiany), half = Math.ceil(cw.length / 2);
    /* dwie kolumny cennika obok siebie: etykieta kol. 1 + wartość kol. 2 oraz etykieta kol. 3–5 + wartość kol. 6 */
    for (var i = 0; i < half; i++) {
      var a = cw[i], b = cw[i + half];
      var x = s1.addRow([a.grupa || a.label, a.grupa ? "" : a.val, b ? (b.grupa || b.label) : "", "", "", b && !b.grupa ? b.val : ""]);
      s1.mergeCells(x.number, 3, x.number, 5);
      [[a, 1, 2], [b, 3, 6]].forEach(function (z) {
        var it = z[0]; if (!it) return;
        var l = x.getCell(z[1]), v = x.getCell(z[2]);
        if (it.grupa) { l.font = font({ bold: true, size: 9, color: { argb: C.acc } }); l.border = { bottom: thin }; v.border = { bottom: thin }; if (z[1] === 3) l.alignment = { indent: 3 }; }
        else {
          l.font = font({ size: 8.5, bold: it.zm, color: { argb: it.zm ? C.warn : C.ink } }); l.alignment = { indent: z[1] === 3 ? 3 : 1 };   // prawa połowa: odstęp od wartości lewej połowy
          v.font = font({ size: 8.5 }); v.alignment = { horizontal: "right", indent: z[1] === 1 ? 3 : 0 };   // lewa wartość odsunięta od prawej połowy
          var lekka = { bottom: { style: "hair", color: { argb: C.line } } };   // lekko widoczna linia między pozycjami cennika
          l.border = lekka; v.border = lekka;
          if (typeof it.val === "number") v.numFmt = Math.abs(it.val) < 1 && it.val !== 0 ? "0.00###" : "#,##0.##";
        }
      });
      x.height = 13;
    }

    return wb.xlsx.writeBuffer();
  }

  /* ------------------------------------------------------------ PDF (max 4 strony) */
  function pdf(r, ctx) {
    var R = raport(r, ctx.GLEBOKOSCI, ctx.oferta), d = r.dane, w0 = r.warianty[0];
    var doc = new L.jsPDF({ unit: "mm", format: "a4" });
    doc.addFileToVFS("Carlito-Regular.ttf", ctx.fonts.regular);
    doc.addFileToVFS("Carlito-Bold.ttf", ctx.fonts.bold);
    doc.addFont("Carlito-Regular.ttf", "Carlito", "normal");
    doc.addFont("Carlito-Bold.ttf", "Carlito", "bold");
    doc.setFont("Carlito", "normal");
    var ACC = [10, 107, 116], INK = [14, 23, 28], MUT = [106, 119, 128], LINE = [227, 231, 234], SOFT = [227, 242, 242], TILE = [243, 248, 248];
    var base = { styles: { font: "Carlito", fontSize: 8.5, cellPadding: 1.3, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: SOFT, textColor: ACC, fontStyle: "bold", halign: "right" },
      columnStyles: { 0: { halign: "left" } }, margin: { left: 14, right: 14 }, theme: "grid" };
    function head(t, sub) {   // bez zalanego tła (oszczędność tuszu): tytuł i linia akcentu
      doc.setFont("Carlito", "bold"); doc.setFontSize(12); doc.setTextColor.apply(doc, INK); doc.text(t, 14, 19.5);
      doc.setDrawColor.apply(doc, ACC); doc.setLineWidth(0.5); doc.line(14, 22, 196, 22);
      doc.setFont("Carlito", "normal"); doc.setFontSize(8.5); doc.setTextColor.apply(doc, MUT); doc.text(sub, 14, 28);
    }
    function h2(t, y) {
      doc.setFont("Carlito", "bold"); doc.setFontSize(11); doc.setTextColor.apply(doc, ACC); doc.text(t, 14, y);
      doc.setDrawColor.apply(doc, ACC); doc.setLineWidth(0.4); doc.line(14, y + 1.2, 196, y + 1.2); return y + 3.5;
    }
    function numTable(T, y, opts) {
      L.autoTable(doc, Object.assign({}, base, opts || {}, {
        startY: y, head: [T.head],
        body: T.rows.map(function (row) { return [row.label].concat(row.vals.map(function (v) { return fmtVal(v, row.fmt); })); }),
        columnStyles: Object.assign({ 0: { halign: "left", cellWidth: 58 } }, (opts && opts.columnStyles) || {}),
        bodyStyles: { halign: "right" },
        didParseCell: function (h) {
          if (h.section === "head" && h.column.index === 0) h.cell.styles.halign = "left";
          if (h.section === "body" && T.rows[h.row.index].bold) { h.cell.styles.fontStyle = "bold"; h.cell.styles.fillColor = SOFT; }
        }
      }));
      return doc.lastAutoTable.finalY + 7;
    }
    var stopka = (d.nazwa || "Wycena") + " · szablon " + d.typ + " · wygenerowano " + new Date().toLocaleDateString("pl-PL");

    var GOOD = [227, 244, 234], GOODT = [19, 121, 74], WARN = [253, 243, 221], WARNT = [138, 83, 0], BAD = [253, 236, 234], BADT = [180, 35, 24];
    var N = R.neg.N;
    /* 1. strona: nagłówek z adresem i datą kalkulacji, pole do negocjacji, karta inwestycji jak w ofercie */
    var K = R.karta;   /* nagłówek bez zalanego tła: adres i data na białym, linia akcentu pod spodem */
    doc.setFont("Carlito", "normal"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUT);
    doc.text("KALKULACJA " + d.typ, 14, 16.5); doc.text("Data kalkulacji", 196, 16.5, { align: "right" });
    doc.setFont("Carlito", "bold"); doc.setTextColor.apply(doc, INK);
    doc.setFontSize(13); doc.text(K.data, 196, 24, { align: "right" });
    doc.setFontSize(16); doc.text(doc.splitTextToSize(K.adres, 140)[0], 14, 24);
    doc.setDrawColor.apply(doc, ACC); doc.setLineWidth(0.6); doc.line(14, 27.5, 196, 27.5);
    doc.setFont("Carlito", "normal"); doc.setFontSize(8.5); doc.setTextColor.apply(doc, MUT);
    doc.text("Ceny netto · wygenerowano " + new Date().toLocaleDateString("pl-PL"), 14, 32);
    /* mapa części strony (dla narzędzia podglądu z komentarzami): ctx.mapa = [] zbiera {strona, id, nazwa, y0, y1} w mm */
    var mapa = ctx.mapa, znak = function (id, nazwa, y0, y1) { if (mapa) mapa.push({ strona: doc.getNumberOfPages(), id: id, nazwa: nazwa, y0: y0, y1: y1 }); };
    znak("naglowek", "Nagłówek: adres i data", 11, 35);
    var MPr = (r.razem || r.mat).MP, mpz = function (c) { return MPr ? c / MPr : 0; };
    /* ceny w zwykłej tabelce, jak tabela opcji: cena całkowita i za MP tym samym krojem */
    var rab = function (c) { return "−" + zl(N.cenaA - c) + " (−" + n2((N.cenaA - c) / N.cenaA * 100) + "%)"; };
    L.autoTable(doc, Object.assign({}, base, { startY: 35, head: [["Cena", "Cena netto", "Cena za MP", "Rabat od oferty"]],
      body: [["Cena ofertowa · zysk " + pct(N.zA) + " · " + w0.nazwa, zl(N.cenaA), zl(mpz(N.cenaA)) + (w0.cenaMPeur ? " · " + eur(w0.cenaMPeur) : ""), "–"],
        ["Można zejść do · zysk " + pct(N.zB), zl(N.cenaB), zl(mpz(N.cenaB)), rab(N.cenaB)],
        ["Próg opłacalności · zysk 0%", zl(N.cenaMin), zl(mpz(N.cenaMin)), "maks. " + rab(N.cenaMin)]]
        .concat((K.pozycje || []).map(function (q) { return ["w tym " + q.nazwa, zl(q.cena), zl(q.cenaMP), "–"]; })),
      styles: Object.assign({}, base.styles, { fontSize: 8.6, cellPadding: 0.9 }),
      columnStyles: { 0: { halign: "left", cellWidth: 66 }, 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right", fontStyle: "bold" }, 3: { halign: "right" } },
      didParseCell: function (h) { if (h.section === "head" && h.column.index === 0) h.cell.styles.halign = "left"; } }));
    var y = doc.lastAutoTable.finalY + 9;
    znak("kafelki", "Ceny: oferta, zejście, próg", 34, y - 6);
    var yPas = y - 5;
    y = h2("Pole do negocjacji (" + w0.nazwa + ")", y - 1) + 4;   // bez paska: drabinka zaraz pod nagłówkiem
    /* długa drabinka (wysoki zysk ofertowy): poniżej zysku do porównania co 4 pkt proc., żeby zmieścić kartę inwestycji */
    var negRows = R.neg.rows.length <= 11 ? R.neg.rows : R.neg.rows.filter(function (q) {
      var x = q.x; return x.oferta || x.porownanie || x.prog || x.zysk > N.zB || Math.round(x.zysk * 100) % 4 === 0;
    });
    L.autoTable(doc, Object.assign({}, base, {
      startY: y - 3, head: [R.neg.head], body: negRows.map(function (x) { return x.vals; }),
      styles: Object.assign({}, base.styles, { fontSize: 8.2, cellPadding: 0.75 }),
      columnStyles: { 0: { halign: "left", cellWidth: 40 } }, bodyStyles: { halign: "right" },
      didParseCell: function (hh) {
        if (hh.section === "head" && hh.column.index === 0) hh.cell.styles.halign = "left";
        if (hh.section !== "body") return;
        var x = negRows[hh.row.index].x;
        if (x.oferta) { hh.cell.styles.fillColor = SOFT; hh.cell.styles.fontStyle = "bold"; hh.cell.styles.textColor = ACC; }
        else if (x.porownanie) { hh.cell.styles.fillColor = GOOD; hh.cell.styles.fontStyle = "bold"; hh.cell.styles.textColor = GOODT; }
        else if (x.prog) { hh.cell.styles.fillColor = BAD; hh.cell.styles.textColor = BADT; }
        else if (x.zysk < N.zB) hh.cell.styles.fillColor = WARN;
        else hh.cell.styles.fillColor = [244, 250, 246];
      }
    }));
    doc.setFont("Carlito", "normal"); doc.setFontSize(7.4); doc.setTextColor.apply(doc, MUT);
    doc.text("Zielone: rabat bez zejścia poniżej zysku " + pct(N.zB) + ". Żółte: poniżej zysku do porównania. Przy zysku 0% w cenie zostają koszty, KOB, GDW i podatek.", 14, doc.lastAutoTable.finalY + 3.6);
    znak("drabinka", "Pole do negocjacji: drabinka cenowa i legenda", yPas, doc.lastAutoTable.finalY + 5);
    y = h2("Dane wejściowe", doc.lastAutoTable.finalY + 10) + 2.5;

    /* karta inwestycji: w obu okienkach ta sama siatka (etykieta + wartość jednym krojem), wiersze na tej samej wysokości */
    var cw = 89, xL = 14, xP = 14 + cw + 4, y0 = y, wierszL = K.zakres.slice();
    if (K.wyposazenie) wierszL.push(["Barierki / maskownice / magistrala", K.wyposazenie]);
    var wierszP = [];
    K.wymiary.forEach(function (grp) { grp.forEach(function (pp) { wierszP.push(pp); }); });
    if (K.dlMiejsca) wierszP.push(["Długość miejsca postojowego", K.dlMiejsca]);
    /* układ agregatów (opis z kalkulacji, np. 2A3+3A4) i obok narzuty KOB / GDW w jednym wierszu */
    wierszP.push(K.agrOpis ? ["Układ agregatów", K.agrOpis, 0, ["KOB / GDW", K.kobGdw]] : ["KOB / GDW", K.kobGdw]);
    function wartosc(x, yy, wdt, v, akcent) {
      doc.setFont("Carlito", "bold"); doc.setFontSize(10.5); doc.setTextColor.apply(doc, akcent ? ACC : INK);
      if (Array.isArray(v)) {   // wysokości pojazdów: trójkąty jak w ofercie (Carlito nie ma ▲▼)
        var xx = x; doc.setFillColor.apply(doc, ACC);
        v.forEach(function (t, i) {
          var yb = yy - 0.4;
          if (i === 0) doc.triangle(xx, yb, xx + 2.8, yb, xx + 1.4, yb - 2.6, "F"); else doc.triangle(xx, yb - 2.6, xx + 2.8, yb - 2.6, xx + 1.4, yb, "F");
          doc.text(t, xx + 4, yy); xx += 4 + doc.getTextWidth(t) + 7;
        });
        return 1;
      }
      var ls = doc.splitTextToSize(String(v), wdt); doc.text(ls, x, yy); return ls.length;
    }
    var yy = y0 + 4.5;
    doc.setFont("Carlito", "bold"); doc.setFontSize(7.6); doc.setTextColor.apply(doc, ACC);
    doc.text("ZAKRES", xL + 3, yy); doc.text("WYMIARY", xP + 3, yy); yy += 4.5;
    for (var wi = 0; wi < Math.max(wierszL.length, wierszP.length); wi++) {
      var nl = 1;
      [[wierszL[wi], xL], [wierszP[wi], xP]].forEach(function (z) {
        if (!z[0]) return;
        var obok = z[0][3], sz2 = obok ? (cw - 6) * 0.6 : cw - 6, sz3 = (cw - 6) - sz2;
        doc.setFont("Carlito", "normal"); doc.setFontSize(7.6); doc.setTextColor.apply(doc, MUT); doc.text(z[0][0], z[1] + 3, yy);
        nl = Math.max(nl, wartosc(z[1] + 3, yy + 4.1, sz2, z[0][1], z[0][2]));
        if (obok) {
          doc.setFont("Carlito", "normal"); doc.setFontSize(7.6); doc.setTextColor.apply(doc, MUT); doc.text(obok[0], z[1] + 3 + sz2, yy);
          nl = Math.max(nl, wartosc(z[1] + 3 + sz2, yy + 4.1, sz3 - 1, obok[1]));
        }
      });
      yy += 4.1 + nl * 4.3 + 0.9;
    }
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.3);
    doc.roundedRect(xL, y0, cw, yy - y0 - 1, 1.5, 1.5, "S"); doc.roundedRect(xP, y0, cw, yy - y0 - 1, 1.5, 1.5, "S");
    znak("karta", "Dane wejściowe: Zakres i Wymiary", y0 - 7, yy);
    y = yy + 3.5;
    function pole(x, yy, wdt, et, wart) {
      doc.setFont("Carlito", "normal"); doc.setFontSize(7.6); doc.setTextColor.apply(doc, MUT); doc.text(et, x, yy);
      return yy + 4.4 + wartosc(x, yy + 4.4, wdt, wart) * 4.4 + 1.5;
    }
    var yOp = y;
    doc.setFont("Carlito", "normal"); doc.setFontSize(7.6); doc.setTextColor.apply(doc, MUT); doc.text("Opis wariantu", 14, y);
    doc.setFont("Carlito", "bold"); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
    var lo = doc.splitTextToSize(K.opis || "–", 182); doc.text(lo, 14, y + 4.3); y += 4.3 + lo.length * 4.1 + 2;
    znak("opis", "Opis wariantu", yOp - 3.5, y - 1);
    var c3 = (182 - 8) / 3, yLok = y;
    y = Math.max(pole(14, y, c3, "Lokalizacja", K.lok), pole(14 + c3 + 4, y, c3, "Montaż", K.montaz), pole(14 + 2 * (c3 + 4), y, c3, "Transport", K.transport)) + 2;
    znak("lokalizacja", "Lokalizacja, montaż, transport", yLok - 3.5, y - 1.5);
    /* opcje: 2500 kg i słupki tylko jako dopłata przy obu poziomach zysku */
    if (R.dodatki.rows.length) {
      L.autoTable(doc, Object.assign({}, base, { startY: y, head: [R.dodatki.head],
        body: R.dodatki.rows.map(function (x) { return [x.label, x.info].concat(x.vals.map(function (v) { return v == null ? "–" : "+" + zl(v); })); }),
        styles: Object.assign({}, base.styles, { fontSize: 8.2, cellPadding: 0.75 }),
        columnStyles: { 0: { halign: "left", cellWidth: 52, fontStyle: "bold" }, 1: { halign: "left", textColor: MUT, cellWidth: 70 }, 2: { halign: "right" }, 3: { halign: "right" } },
        didParseCell: function (h) { if (h.section === "head" && h.column.index < 2) h.cell.styles.halign = "left"; } }));
      znak("dodatki", "Opcje: dopłaty 2500 kg, słupki", y, doc.lastAutoTable.finalY);
      y = doc.lastAutoTable.finalY + 4;
    }
    /* konserwacja: tabelka jak ceny u góry; stawki 35–60 zł co 5 zł plus stawki z wyceny, te z wyceny pogrubione */
    var bazaK = K.konserwacja[0].bazaN;
    var stawkiW = r.konserwacja.map(function (k) { return k.stawka; }), stawki = [35, 40, 45, 50, 55, 60];
    stawkiW.forEach(function (v) { if (stawki.indexOf(v) < 0) stawki.push(v); });
    stawki.sort(function (a, b) { return a - b; });
    var yKon = y;
    L.autoTable(doc, Object.assign({}, base, { startY: y, head: [["Konserwacja (" + K.konserwacja[0].baza + ")", "Miesięcznie", "Rocznie", "Jeden przegląd (co pół roku)"]],
      body: stawki.map(function (v) {
        var w = stawkiW.indexOf(v), mies = v * bazaK;
        return [v + " zł / " + R.jm + " / mies." + (w >= 0 ? "  · wariant " + (w + 1) : ""), zl(mies), zl(mies * 12), zl(mies * 6)];
      }),
      styles: Object.assign({}, base.styles, { fontSize: 8.4, cellPadding: 0.75 }),
      columnStyles: { 0: { halign: "left", cellWidth: 66 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: function (h) {
        if (h.section === "head" && h.column.index === 0) h.cell.styles.halign = "left";
        if (h.section === "body" && stawkiW.indexOf(stawki[h.row.index]) >= 0) h.cell.styles.fontStyle = "bold";
      } }));
    znak("konserwacja", "Konserwacja: stawki 35–60 zł", yKon, doc.lastAutoTable.finalY);

    /* 2. strona: skąd się biorą kwoty (wariant podstawowy) i pozostałe dane */
    doc.addPage(); head("Koszty · " + w0.nazwa + " · " + pct(d.zysk), stopka);
    znak("naglowek2", "Strona 2: nagłówek", 12, 30);
    y = h2("Materiały i urządzenia", 36);
    L.autoTable(doc, Object.assign({}, base, { startY: y, body: R.mat, theme: "striped",
      styles: Object.assign({}, base.styles, { fontSize: 8, cellPadding: 0.9 }),
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } },
      didParseCell: function (h) { if (h.section === "body" && R.mat[h.row.index][1] === "") { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = ACC; } } }));
    znak("materialy", "Materiały i urządzenia", 31, doc.lastAutoTable.finalY);
    var yMon = doc.lastAutoTable.finalY + 2;
    y = h2("Montaż, narzuty i cena", doc.lastAutoTable.finalY + 6);
    L.autoTable(doc, Object.assign({}, base, { startY: y, head: [["Pozycja", "Skąd ta kwota", "Kwota"]],
      body: R.mon1.map(function (x) { return [x.label, x.info, fmtVal(x.val, x.fmt)]; }),
      styles: Object.assign({}, base.styles, { fontSize: 7.9, cellPadding: 0.8 }),
      columnStyles: { 0: { halign: "left", cellWidth: 58 }, 1: { halign: "left", textColor: MUT }, 2: { halign: "right", cellWidth: 30 } },
      didParseCell: function (h) {
        if (h.section === "head" && h.column.index < 2) h.cell.styles.halign = "left";
        if (h.section === "body" && R.mon1[h.row.index].bold) { h.cell.styles.fontStyle = "bold"; h.cell.styles.fillColor = SOFT; }
      } }));
    znak("montaz", "Montaż, narzuty i cena (skąd kwoty)", yMon, doc.lastAutoTable.finalY);
    if (R.szczegoly.length) {
      var ySz = doc.lastAutoTable.finalY + 2, yH = doc.lastAutoTable.finalY + 6;
      if (yH > 297 - 40) { doc.addPage(); head("Koszty · " + w0.nazwa + " · " + pct(d.zysk) + " · cd.", stopka); ySz = 31; yH = 36; }   // nagłówek nie zostaje sam na dole strony
      y = h2("Pozostałe dane wejściowe", yH);
      L.autoTable(doc, Object.assign({}, base, { startY: y, body: R.szczegoly, theme: "plain",
        styles: Object.assign({}, base.styles, { fontSize: 7.6, cellPadding: { top: 0.6, bottom: 0.6, left: 2, right: 2 } }),
        columnStyles: { 0: { textColor: MUT, cellWidth: 58 }, 1: { cellWidth: 124 } },
        didParseCell: function (h) { if (h.row.index % 2 === 1) h.cell.styles.fillColor = [247, 248, 249]; } }));
      znak("szczegoly", "Pozostałe dane wejściowe", ySz, doc.lastAutoTable.finalY);
    }

    var pages = doc.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFontSize(8); doc.setTextColor.apply(doc, MUT);
      doc.text("Strona " + p + " z " + pages, 196, 290, { align: "right" });
    }
    return doc.output("arraybuffer");
  }

  /* ------------------------------------------------------------ oferta */
  var SZABLON = {
    naglowek: "PLATFORMOWE SYSTEMY PARKINGOWE\nPSP NOWINAKONOPKA TECHNOLOGIES SP. Z O.O. S.K.\n31-123 Kraków, ul. Krupnicza 6\ntel. +48 12 4212735\ntel. 601 289 709",
    stopka: "PSP NowinaKonopka Technologies Sp. z o.o. S.K.\n31-123 Kraków, ul. Krupnicza 6, NIP: PL-676-248-01-77\nbiuro@nowinakonopka.com    http://www.nowinakonopka.com",
    uwaga_tech: "*w zależności od zastanych wysokości zagłębienia oraz prześwitu pomieścimy pojazdy w podanych wyżej wysokościach lub wyższych na górnej platformie jeśli prześwit będzie miejscowo na to pozwalał. Prowadzone górą instalacje mogą znacząco prześwit ograniczyć!\nJeżeli prześwit w garażu będzie wyższy, automatycznie na górnej platformie będą mogły zaparkować odpowiednio wyższe samochody.",
    zakres: "Dostawa na plac budowy urządzeń parkingowych, montaż, rozruch i doprowadzenie do badań ruchowych poprzedzających wydanie decyzji o dopuszczeniu do użytkowania wraz z kompletem dokumentów określonych przepisami UDT oraz przeprowadzeniem szkolenia Zamawiającego. Koszty badań UDT obciążają Zamawiającego.\nPoza ofertą pozostają: koszty przeprowadzenia badania przez UDT, wszelkie roboty budowlano-wykończeniowe obiektu, wykonanie stałych barier budowlanych zabezpieczających dostęp do zagłębienia w przypadku braku ścian (jeśli konieczne / zgodnie z naszymi wytycznymi), wykonanie przepustów przez ściany działowe o średnicy fi 100mm dla przeprowadzenia przewodów elektrycznych i hydraulicznych (jeśli konieczne / zgodnie z naszymi wytycznymi), wypełnianie szczelin, ewentualnych robót w budynku wynikających z zaleceń UDT, wyposażenia w instalację przeciw pożarową, wentylacyjną, elektryczną obiektu, sygnalizacyjną, oznaczeń pionowych i poziomych bezpieczeństwa i organizacji ruchu na terenie obiektu (w tym numeracja miejsc postojowych) oraz pomiarów elektrycznych linii zasilających (wykonywanych przez budowę).",
    warunki: "Wszelkie elementy konstrukcyjne garażu powinny być wykonane dokładnie i zgodnie z dokumentacją projektową oraz naszymi wytycznymi. Powierzchnie podłoży wykonane z betonu C20/25 o odpowiedniej nośności, pozostające w stanie suchym i nie pylące. Wszelkie roboty budowlane, instalacyjne i wykończeniowe oraz sprzątanie należy zakończyć przed przystąpieniem do montażu urządzeń parkingowych. Na czas montażu należy zapewnić dostęp do energii elektrycznej w bliskim sąsiedztwie montażu. Wymagane jest oświetlenie zgodne z normą DIN 67528 „Oświetlenie miejsc parkingowych”.\nZamawiający powinien umożliwić dojazd samochodem ciężarowym o długości {tir}m do miejsca składowania, rozładować oraz przetransportować elementy urządzeń na miejsce montażu.\nPonadto Zamawiający zobowiązany jest w zakresie zasilania elektrycznego urządzeń {typ} do wykonania:\n1. Zabezpieczenia głównego zwłocznego 3x16A dla każdego agregatu hydraulicznego {kw}, 400V, 50Hz;\n2. Zasilania od zabezpieczeń do rozłącznika głównego przewodem 3Ph+N+PE 5x2.5mm2;\n3. Rozłącznika głównego blokowanego 16A 3Ph+1N – w miejscu ustalonym z dostawcą urządzeń;\n4. Doprowadzenia przewodu 5x2,5 mm2 od rozłącznika do skrzyni elektrycznej;\n5. Instalacji uziemiającej do każdego prawego/lewego słupa urządzenia.\nPo zakończeniu montażu Zamawiający powinien oznakować krawędzie zagłębienia żółto-czarnym pasem ostrzegawczym zgodnie z ISO 3864 dla oznaczenia obszaru niebezpiecznego.",
    gwarancja: "Producent udziela {gw} miesięcznej gwarancji jakości na sprawne działanie urządzeń pod warunkiem zawarcia z dostawcą, w terminie do 5 miesięcy od badania wstępnego UDT, i utrzymania w mocy umowy konserwacyjno-serwisowej, umożliwiającej nam stałą opiekę oraz nadzór nad stanem technicznym platform. W ramach umowy serwisowej dokonywane są 2 przeglądy serwisowe w ciągu roku.\nGwarancja nie obejmuje zużycia części eksploatacyjnych, uszkodzeń wynikających z eksploatacji niezgodnej z instrukcją użytkowania, agresywnego środowiska, zbyt dużej wilgotności, uszkodzeń powstałych w wyniku zdarzeń losowych (np. pożar, zalanie). Po upływie okresu gwarancji świadczymy serwis pogwarancyjny.",
    zakonczenie: "Wyrażamy przekonanie iż przedstawiona oferta zyska Państwa aprobatę i przyczyni się do dalszej owocnej współpracy.\n\nZ poważaniem,",
    podpis: "arch. Iwo Nowina Konopka\nPrezes Zarządu",
    klauzula: "Klauzula poufności. Klient zobowiązuje się do zachowania najwyższej poufności względem zawartości i przedmiotu niniejszej oferty i załączonej dokumentacji. Zobowiązuje się również do nie rozpowszechniania jej treści ani do nie używania jej w celach innych niż ocena tej oferty."
  };

  var PLATNOSCI = "30% zaliczka na 22 tygodnie przed dostawą,\ndo 60% płatność na 5 dni przed dostawą,\ndo 90% płatność do 21 dni po dostawie,\ndo 100% płatność do 21 dni po pierwszym badaniu UDT.\nOferta ważna jest 2 miesiące.";
  function domyslnaOferta() {
    return {
      nr: "", nrAuto: "", miejsce: "Kraków", powod: "zapytanie", garaz: "",
      adr: { zwrot: "Szanowna Pani", imie: "", stanowisko: "", tel: "", email: "", firma: "", ulica: "", kod: "", nip: "" },
      hg: "", hd: "", wysPary: [], montOd: "", montDo: "", agregat: "", kw: "",
      opcje: { q2500: false, slupki37: false, malowanie: false },
      zysk: "A", ceny: {}, platnosci: "",
      dostawa: "", montaz: "", tir: 20, gw: "", tekst: {}
    };
  }

  /* Rozbija opis "H-195/202 | L-530-544-584 | P-380 | Hpoj. G-180. D-180" na pola oferty. */
  function zOpisu(opis) {
    var o = {}, s = String(opis || "");
    var m;
    if ((m = s.match(/\bH-\s*([\d\/(),.]+)/))) { o.h = m[1].replace(/[.,]$/, ""); var hh = o.h.match(/\d+/g) || []; o.h1 = hh[0]; o.h2 = hh[1]; }
    if ((m = s.match(/\bH1-\s*(\d+)/))) o.h1 = m[1];
    if ((m = s.match(/\bH2-\s*(\d+)/))) o.h2 = m[1];
    if ((m = s.match(/\bL-\s*([\d\-\/(),.]+)/))) o.l = m[1].replace(/[.,]$/, "");
    if ((m = s.match(/\bP-\s*([\d\/(),.?]+)/))) o.p = m[1].replace(/[.,]$/, "");
    if ((m = s.match(/G-\s*([\d\/()]+)/))) o.hg = m[1];
    if ((m = s.match(/D-\s*([\d\/()]+)/))) o.hd = m[1];
    return o;
  }

  function sub(t, v) { return String(t).replace(/\{(\w+)\}/g, function (a, k) { return v[k] !== undefined ? v[k] : a; }); }

  /* Adresat z osobnych pól; puste pola nie tworzą wierszy. */
  function adresatLinie(a) {
    a = a || {};
    var osoba = [a.zwrot, a.imie, a.stanowisko, a.tel ? "tel. " + a.tel : "", a.email ? "e-mail: " + a.email : ""].filter(Boolean);
    var firma = [a.firma, a.ulica, a.kod, a.nip ? "NIP: " + a.nip : ""].filter(Boolean);
    return osoba.concat(osoba.length && firma.length ? [""] : [], firma);
  }
  function powitanie(a) { return (a && a.zwrot === "Szanowny Pan") ? "Szanowny Panie," : "Szanowna Pani,"; }

  /* Wymiary zagłębienia i domyślne wysokości pojazdów: dolny = min(H) - 15,
     górny = (prześwit - 320) - (dolny - 150) + 150. */
  function wymiary(d, o) {
    var op = zOpisu(d.opis || Object.keys(d.opisNad || {}).map(function (k) { return d.opisNad[k]; }).join(" | ")), num = function (v) { return v === "" || v == null || isNaN(v) ? null : Number(v); };
    var h1 = num(d.h1) != null ? num(d.h1) : num(op.h1), h2 = num(d.h2) != null ? num(d.h2) : num(op.h2);
    var p = num(d.przeswit) != null ? num(d.przeswit) : num((op.p || "").match(/\d+/) && op.p.match(/\d+/)[0]);
    var hs = [h1, h2].filter(function (x) { return x != null; });
    var W = d.wysokosci || { tryb: "zaglebienie" }, dolAuto, gorAuto, dol;
    var dl = d.dl || op.l || (W.tryb === "zaglebienie" && hs.length ? DL_STD : "");   // puste pole = standardowa długość zagłębienia
    var dol5 = function (x) { return x == null ? null : Math.floor(x / 5) * 5; };   // wysokości pojazdów w dół do 5 cm
    if (W.tryb === "przeswit") {            // jeden poziom: górna = prześwit − k
      dolAuto = null; dol = num(o.hd);
      gorAuto = p != null ? dol5(p - num(W.k)) : null;
    } else if (W.tryb === "przeswit2") {    // dwa poziomy bez zagłębienia: górna + dolna = prześwit − k
      dolAuto = dol5(num(W.dol)); dol = num(o.hd) != null ? num(o.hd) : dolAuto;
      gorAuto = p != null && dol != null ? dol5(p - num(W.k) - dol) : null;
    } else {                                // zagłębienie (NK38): dolna = niższe H − 15
      dolAuto = hs.length ? dol5(Math.min.apply(null, hs) - 15) : null;
      dol = num(o.hd) != null ? num(o.hd) : dolAuto;
      gorAuto = p != null && dol != null ? dol5((p - 320) - (dol - 150) + 150) : null;
    }
    var gor = num(o.hg) != null ? num(o.hg) : gorAuto;
    return { h1: h1, h2: h2, p: p, dl: dl, dolAuto: dolAuto, gorAuto: gorAuto, dol: dol, gor: gor };
  }
  /* Wszystkie pary zagłębienie + prześwit: pierwsza z pól H1/H2/dł./prześwit, kolejne z d.pary
     (pusta długość = jak w pierwszej parze). Wysokości pojazdów do nadpisania w o.wysPary[i]. */
  function wymiaryPary(d, o) {
    o = o || {};
    var w0 = wymiary(d, o), wynik = [w0], wp = o.wysPary || [];
    (d.pary || []).forEach(function (p, i) {
      if (!p || [p.h1, p.h2, p.dl, p.przeswit].every(function (x) { return x == null || x === ""; })) return;
      var ov = wp[i] || {};
      wynik.push(Object.assign(wymiary({ h1: p.h1, h2: p.h2, dl: p.dl || w0.dl, przeswit: p.przeswit, opis: "", wysokosci: d.wysokosci }, { hd: ov.hd, hg: ov.hg }), { idx: i }));
    });
    return wynik;
  }

  /* Treść oferty jako struktura (podgląd HTML i plik Word używają tego samego). */
  function oferta(r, o, sz) {
    var d = r.dane, m = r.mat, ws = r.warianty, B = o.zysk === "B";
    var c = function (x) { return B ? x.cena2 : x.cena; };
    var TT = (r.szablon && r.szablon.teksty) || {}, TY = r.szablon.typy;
    var wpary = wymiaryPary(d, o), wy = wpary[0], v = function (x) { return x == null || x === "" ? "…" : x; };
    var t = [o.montOd !== "" && o.montOd != null ? Number(o.montOd) : ws[0].tygodnieZakres[0], o.montDo !== "" && o.montDo != null ? Number(o.montDo) : ws[0].tygodnieZakres[1]];
    var typ = d.typ;
    var eff = {
      agregat: o.agregat || TT.agregat || "Agregat hydrauliczny 400V, 50Hz, 6kW", kw: o.kw || agrKw(d) || TT.kw || "6kW", gw: o.gw || TT.gw || "36/60",
      dostawa: o.dostawa !== "" && o.dostawa != null ? o.dostawa : (TT.dostawa || 24), platnosci: o.platnosci || TT.platnosci || PLATNOSCI
    };
    var vars = { tir: o.tir || 20, kw: eff.kw, gw: eff.gw, typ: typ, P: v(wy.p), G: v(wy.gor), D: v(wy.dol) };
    var lista = r.szablon.model === "lista", maB = !!(r.szablon.wariantB && r.szablon.wariantB.nazwa);
    var dz = new Date(), data = ("0" + dz.getDate()).slice(-2) + "." + ("0" + (dz.getMonth() + 1)).slice(-2) + "." + dz.getFullYear();
    var tech = wpary.map(function (w) {
      var zagl = w.h2 != null && w.h2 !== w.h1 ? "H1-" + v(w.h1) + ", H2-" + v(w.h2) : v(w.h1);
      if (TT.tech) return sub(TT.tech, { H: zagl, L: v(w.dl), P: v(w.p), G: v(w.gor), D: v(w.dol), M: v(d.dlMiejsca || (d.wysokosci || {}).dlugosc || 500) });
      return "Zagłębienie: wysokość " + zagl + "cm; długość " + v(w.dl) + "cm;\nPrześwit między-kondygnacyjny: min. " + v(w.p) +
        "cm;\nWysokość parkowanych pojazdów*: ▲-" + v(w.gor) + "cm, ▼-" + v(w.dol) + "cm;";
    }).join("\nlub\n");
    var garazTxt = o.garaz || ("przy " + (d.nazwa || "…"));
    var DOD = r.dodatkowe || [], RZ = r.razem || m, pozW = ws[0].pozycje;
    /* wycena łączona: kolejne pozycje z danymi technicznymi i listą urządzeń ze swojego szablonu */
    var dalsze = DOD.map(function (x, i) {
      var T2 = x.szablon.teksty || {}, d2 = x.dane, wp2 = wymiaryPary(d2, {}), w2 = wp2[0];
      var tech2 = wp2.map(function (w) {
        var zagl = w.h2 != null && w.h2 !== w.h1 ? "H1-" + v(w.h1) + ", H2-" + v(w.h2) : v(w.h1);
        if (T2.tech) return sub(T2.tech, { H: zagl, L: v(w.dl), P: v(w.p), G: v(w.gor), D: v(w.dol), M: v(d2.dlMiejsca || (d2.wysokosci || {}).dlugosc || 500) });
        return "Zagłębienie: wysokość " + zagl + "cm; długość " + v(w.dl) + "cm;\nPrześwit między-kondygnacyjny: min. " + v(w.p) +
          "cm;\nWysokość parkowanych pojazdów*: ▲-" + v(w.gor) + "cm, ▼-" + v(w.dol) + "cm;";
      }).join("\nlub\n");
      var kw2 = agrKw(d2) || T2.kw || "6kW", agr2 = T2.agregat || "Agregat hydrauliczny 400V, 50Hz, 6kW";
      return {
        label: "Pozycja " + (i + 2) + ":", typ: d2.typ, pozycja: sub(x.szablon.opisOferty || "Urządzenia {typ}", { typ: d2.typ }),
        tech: tech2.split("\n"), uwagaTech: (T2.uwagaTech || sz.uwaga_tech).split("\n"),
        wyposazenie: [T2.obciazenie, T2.zabezpieczenie, d2.barierki && x.szablon.model !== "lista" ? T2.barierki : ""].filter(Boolean),
        lista: ["S", "D", "NP"].map(function (k) { return d2[k] ? sub(x.szablon.typy[k].oferta, { n: d2[k], typ: d2.typ }) : ""; })
          .concat([d2.agregaty && x.szablon.opcje.agregaty ? agregatyOferta(d2, agr2) : ""]).filter(Boolean),
        poLiscie: (T2.poLiscie ? sub(T2.poLiscie, { tir: o.tir || 20, kw: kw2, gw: eff.gw, typ: d2.typ, P: v(w2.p), G: v(w2.gor), D: v(w2.dol) }) : "").split("\n").filter(Boolean)
      };
    });
    if (DOD.length) { typ = [d.typ].concat(DOD.map(function (x) { return x.dane.typ; })).join(" i "); vars.typ = typ; }
    var auto = {
      wstep: TT.wstep ? sub(TT.wstep, { n: RZ.platformy, mp: RZ.MP, typ: typ, garaz: garazTxt, oferte: o.powod === "rabat" ? "naszą zrabatowaną ofertę" : "naszą ofertę" }) : "w związku z " + (o.powod === "rabat" ? "Państwa prośbą o rabat przedstawiamy naszą zrabatowaną ofertę" : "otrzymanym zapytaniem przedstawiamy naszą ofertę") +
        " na dostawę i montaż " + RZ.platformy + " platform służących do niezależnego parkowania " + RZ.MP + " pojazdów w garażu " +
        (o.garaz || ("inwestycji " + (d.nazwa || "…"))) + ".",
      tech: tech,
      wyposazenie: [TT.obciazenie, TT.zabezpieczenie, d.barierki && !lista ? TT.barierki : ""].filter(Boolean).join("\n"),
      lista: ["S", "D", "NP"].map(function (k) { return d[k] ? sub(TY[k].oferta, { n: d[k], typ: d.typ }) : ""; }).concat([
        d.agregaty && r.szablon.opcje.agregaty ? agregatyOferta(d, eff.agregat) : ""]).filter(Boolean).join("\n"),
      platnosci: eff.platnosci,
      dostawa: "Pierwsza dostawa nastąpi nie wcześniej niż po ok. " + eff.dostawa + " tygodniach od zawarcia umowy, w zależności od aktualnie realizowanych zleceń.",
      montaz: "Przewidywany czas montażu " + (t[0] === t[1] ? "ok. " + t[0] : t[0] + "-" + t[1]) + " tygodni od dnia dostawy, w zależności od warunków panujących na budowie."
    };
    function txt(k) { return o.tekst[k] != null ? o.tekst[k] : auto[k]; }
    var opcjeDef = [
      maB && TT.opcjaQ2500 ? ["q2500", TT.opcjaQ2500, c(ws[1]) - c(ws[0])] : null,
      r.szablon.opcje.slupki === false ? null : ["slupki37", "Słupki do e-ładowania na każdym ze " + RZ.MP + " miejsc postojowych, obejmujące montaż słupka pod ładowarkę, prowadnic, i puszki przyłączeniowej, bez samej stacji ładowania.", B ? r.opcje.slupki37b[0] : r.opcje.slupki37[0]],
      lista ? null : ["malowanie", "Malowanie proszkowe platform w kolorze RAL wybranym przez Zamawiającego.", B ? r.opcje.malowanieB : r.opcje.malowanie]
    ].concat((r.opcje.pozycje || []).map(function (p) { return ["poz_" + p.id, p.tekst || p.nazwa, B ? p.kwotaB : p.kwota]; })).filter(Boolean);
    /* przy wycenie łączonej każda pozycja ma swoją cenę (udział we wspólnych kosztach wg osobodni) */
    var opcje = [], ceny = [{ klucz: "poz10", label: "Pozycja 1:", auto: ceil100(pozW ? c(pozW[0]) : c(ws[0])) }].concat(dalsze.map(function (x, i) {
      return { klucz: "poz" + (i + 2) + "0", label: x.label, auto: ceil100(c(pozW[i + 1])) };
    }));
    opcjeDef.forEach(function (x) {
      if (!o.opcje[x[0]] || (x[0] === "q2500" && RZ.brakB)) return;   // 2500 kg bez wpisanej dopłaty nie trafia do oferty
      var nr = "Opcja " + (opcje.length + 1) + ":";
      opcje.push({ label: nr, tekst: x[1] });
      ceny.push({ klucz: x[0], label: nr, auto: ceil100(x[2]) });
    });
    ceny.forEach(function (p) { p.kwota = o.ceny[p.klucz] != null && o.ceny[p.klucz] !== "" ? Number(o.ceny[p.klucz]) : p.auto; });
    return {
      naglowek: sz.naglowek.split("\n"), stopka: sz.stopka.split("\n"),
      miejsceData: (o.miejsce || "Kraków") + ", dnia " + data + "r.",
      adresat: adresatLinie(o.adr), nr: "Oferta nr " + (o.nr || o.nrAuto || "…"), zwrot: powitanie(o.adr), wymiary: wy, wymiaryPary: wpary,
      wstep: txt("wstep"), pozycja: sub(r.szablon.opisOferty || "Urządzenia {typ}", { typ: d.typ }), dalsze: dalsze,
      tech: txt("tech").split("\n"), uwagaTech: (TT.uwagaTech || sz.uwaga_tech).split("\n"), wyposazenie: txt("wyposazenie").split("\n"),
      lista: txt("lista").split("\n").filter(Boolean), opcje: opcje, ceny: ceny,
      poLiscie: (TT.poLiscie ? sub(TT.poLiscie, Object.assign({}, vars, { typ: d.typ })) : "").split("\n").filter(Boolean), eff: eff, opcjeDost: opcjeDef.map(function (x) { return { klucz: x[0], tekst: x[1] }; }),
      platnosci: txt("platnosci").split("\n"), dostawa: txt("dostawa"), montaz: txt("montaz"),
      zakres: sub(TT.zakres || sz.zakres, vars).split("\n"), warunki: sub(TT.warunki || sz.warunki, vars).split("\n"), gwarancja: sub(TT.gwarancja || sz.gwarancja, vars).split("\n"),
      zakonczenie: String(sz.zakonczenie).replace(/([^\n])\n(Z poważaniem)/, "$1\n\n$2").split("\n"), podpis: sz.podpis.split("\n"), klauzula: sz.klauzula,
      auto: auto, kwota: kwotaOferta
    };
  }

  /* Oferta Word w układzie oryginalnych ofert PSP: Verdana 8 pt, nagłówek Times/Century Gothic,
     niebieskie etykiety "Pozycja 1", pogrubione liczby, niebieskie punktory. */
  function docxOferta(r, o, sz, logo, podpis) {
    var D = L.docx, F = oferta(r, o, sz);
    var BLUE = "3366CC", GREY = "444444", BODY = "Verdana", HEAD = "Times New Roman", GOTH = "Century Gothic";
    var W = 9638, IND = 284;                       // szerokość tekstu (A4 - marginesy 2 cm / 1,4 cm) i wcięcie treści
    var SP = { after: 0, line: 240 };
    function run(text, opt) { return new D.TextRun(Object.assign({ text: text, font: BODY, size: 16 }, opt || {})); }
    function p(children, opt) { return new D.Paragraph(Object.assign({ children: children, spacing: SP }, opt || {})); }
    function blank(pt) { return p([run("")], { spacing: { after: 0, line: 240, before: pt || 0 } }); }
    function body(children, opt) { return p(children, Object.assign({ indent: { left: IND }, alignment: D.AlignmentType.JUSTIFIED }, opt || {})); }
    function heading(nr, t) {
      return p([run(nr + ".", { bold: true }), new D.TextRun({ children: [new D.Tab()] }), run(t, { bold: true })],
        { spacing: { before: 200, after: 20, line: 240 }, indent: { left: IND, hanging: IND }, tabStops: [{ type: D.TabStopType.LEFT, position: IND }], keepNext: true });   // nagłówek nie zostaje sam na dole strony
    }
    /* Niebieska etykieta "Pozycja 1:" / "Opcja 1:" */
    function etykieta(label, extra) { return [run(label, Object.assign({ color: BLUE, bold: true }, extra || {}))]; }
    /* Pogrubia liczby i wymiary ("195/202", "▲-180(170)") w tekście danych technicznych. */
    function liczbyBold(text, opt) {
      /* oznaczenia typu H1-, H2- (litera z cyfrą) zostają zwykłe, pogrubiona jest tylko wartość po nich */
      var out = [], re = /([A-Za-z]\d+-?)|([▲▼]?-?\d[\d\/\-().,]*)/g, last = 0, m;
      while ((m = re.exec(text))) {
        if (m[1]) continue;
        if (m.index > last) out.push(run(text.slice(last, m.index), opt));
        out.push(run(m[2], Object.assign({}, opt || {}, { bold: true })));
        last = re.lastIndex;
      }
      if (last < text.length) out.push(run(text.slice(last), opt));
      return out;
    }
    /* "Etykieta: wartość" -> etykieta kursywą, liczby w wartości pogrubione. */
    function opisowa(line) {
      var i = line.indexOf(":");
      if (i < 0 || i > 45) return liczbyBold(line);
      return [run(line.slice(0, i + 1), { italics: true })].concat(liczbyBold(line.slice(i + 1)));
    }
    function pozycjaUrzadzen(line) {
      var m = line.match(/^(\d+ szt\. –)\s*(\S+)(.*)$/);
      if (!m) return [run(line)];
      var rest = m[3], out = [run(m[1] + "  ", { bold: true })];
      if (/^[A-Z]{2}\d/.test(m[2])) out.push(run(m[2], { bold: true })); else out.push(run(m[2]));
      var w = rest.match(/^(.*?platformy )(\d+)(.*)$/);
      if (w) out.push(run(w[1]), run(w[2], { bold: true }), run(w[3])); else out.push(run(rest));
      return out;
    }
    var NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    var NB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
    function cell(w, children, opt) {
      return new D.TableCell(Object.assign({ width: { size: w, type: D.WidthType.DXA }, borders: NB, children: children,
        margins: { top: 0, bottom: 0, left: 0, right: 0 } }, opt || {}));
    }
    function numerStrony() {
      return p([new D.TextRun({ children: [D.PageNumber.CURRENT], font: "Book Antiqua", bold: true, size: 20, color: "FFFFFF" })],
        { alignment: D.AlignmentType.CENTER, shading: { type: D.ShadingType.CLEAR, fill: "9DBCE3", color: "auto" } });
    }
    function glowka(pelna) {
      var lh = F.naglowek.map(function (l, i) {
        if (!pelna && i > 0) return null;
        return p([new D.TextRun({ text: l, font: i < 2 ? HEAD : GOTH, bold: i < 2, size: i < 2 ? 18 : 17, color: i < 2 ? "000000" : GREY })],
          { alignment: D.AlignmentType.CENTER });
      }).filter(Boolean);
      var logoP = logo && pelna ? [new D.Paragraph({ children: [new D.ImageRun({ type: logo.type || "png", data: logo.data, transformation: { width: logo.w, height: logo.h } })] })] : [p([run("")])];
      return new D.Header({ children: [new D.Table({
        width: { size: W, type: D.WidthType.DXA }, columnWidths: [3600, 5400, 638], borders: NB,
        rows: [new D.TableRow({ children: [cell(3600, logoP), cell(5400, lh, { verticalAlign: D.VerticalAlign.TOP }),
          cell(638, [numerStrony()], { verticalAlign: D.VerticalAlign.TOP })] })]
      }), p([run("")])] });
    }
    var stopkaP = function () { return F.stopka.map(function (l, i) {
      var last = i === F.stopka.length - 1;
      var runs = last ? l.split(/(\S+@\S+|https?:\/\/\S+)/).filter(Boolean).map(function (x) {
        var link = /@|https?:/.test(x);
        return new D.TextRun({ text: x, font: GOTH, size: link ? 16 : 18, color: link ? "0000FF" : "000000", underline: link ? {} : undefined });
      }) : [new D.TextRun({ text: l, font: GOTH, size: 20 })];
      return p(runs, { alignment: D.AlignmentType.CENTER, border: i === 0 ? { top: { style: D.BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } } : undefined });
    }); };
    var stopka = new D.Footer({ children: stopkaP() });
    /* klauzula poufności zawsze na dole drugiej (i dalszych) strony, nad stopką firmy */
    var stopka2 = new D.Footer({ children: [p([run(F.klauzula, { size: 12, color: GREY })], { alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 120, line: 240 } })].concat(stopkaP()) });

    var k = [];
    k.push(p([run(F.miejsceData)], { spacing: { before: 0, after: 0, line: 240 } }));
    k.push(blank(), blank());
    var poPustej = false;
    F.adresat.forEach(function (l, i) {
      if (!l.trim()) { k.push(blank()); poPustej = true; return; }
      var runs;
      var mail = l.match(/^(.*?e-mail:\s*)(\S+@\S+)(.*)$/i);
      if (mail) runs = [run(mail[1]), run(mail[2], { color: "0000FF", underline: {} }), run(mail[3])];
      else if (poPustej) { runs = [run(l, { bold: true, underline: {} })]; poPustej = false; }
      else runs = [run(l, { bold: i === 1 })];
      k.push(p(runs));
    });
    k.push(blank(), blank());
    k.push(p([run(F.nr, { bold: true, italics: true, underline: {} })]));
    k.push(blank());
    k.push(p([run(F.zwrot)]));
    F.wstep.split("\n").forEach(function (l) { k.push(p([run(l)], { alignment: D.AlignmentType.JUSTIFIED })); });
    k.push(blank());

    k.push(heading(1, "Specyfikacja oferty:"));
    var poz = F.pozycja.split(r.dane.typ);
    k.push(body(etykieta("Pozycja 1:").concat([run(" " + poz[0], { color: BLUE }), run(r.dane.typ, { color: BLUE, bold: true }), run(poz.slice(1).join(r.dane.typ), { color: BLUE })])));
    k.push(body([run("Dane techniczne:", { underline: {} })]));
    F.tech.forEach(function (l) { k.push(body(l.trim() === "lub" ? [run("lub", { bold: true })] : opisowa(l))); });
    F.uwagaTech.forEach(function (l) { k.push(body([run(l, { italics: true })])); });
    F.wyposazenie.forEach(function (l) { k.push(body(opisowa(l))); });
    F.lista.forEach(function (l) {
      k.push(new D.Paragraph({ children: pozycjaUrzadzen(l), numbering: { reference: "punkty", level: 0 }, spacing: { before: 40, after: 0, line: 240 } }));
    });
    F.poLiscie.forEach(function (l) { k.push(body([run(l)], { spacing: { before: 60, after: 0, line: 240 } })); });
    F.dalsze.forEach(function (x) {   // wycena łączona: Pozycja 2 w tym samym układzie
      var pz = x.pozycja.split(x.typ);
      k.push(body(etykieta(x.label).concat([run(" " + pz[0], { color: BLUE }), run(x.typ, { color: BLUE, bold: true }), run(pz.slice(1).join(x.typ), { color: BLUE })]), { spacing: { before: 160, after: 0, line: 240 } }));
      k.push(body([run("Dane techniczne:", { underline: {} })]));
      x.tech.forEach(function (l) { k.push(body(l.trim() === "lub" ? [run("lub", { bold: true })] : opisowa(l))); });
      x.uwagaTech.forEach(function (l) { k.push(body([run(l, { italics: true })])); });
      x.wyposazenie.forEach(function (l) { k.push(body(opisowa(l))); });
      x.lista.forEach(function (l) {
        k.push(new D.Paragraph({ children: pozycjaUrzadzen(l), numbering: { reference: "punkty", level: 0 }, spacing: { before: 40, after: 0, line: 240 } }));
      });
      x.poLiscie.forEach(function (l) { k.push(body([run(l)], { spacing: { before: 60, after: 0, line: 240 } })); });
    });
    F.opcje.forEach(function (op) {
      k.push(body(etykieta(op.label), { spacing: { before: 120, after: 0, line: 240 } }));
      k.push(body(opisowa(op.tekst)));
    });

    var prawy = [{ type: D.TabStopType.RIGHT, position: W }];
    function cena(c) { return etykieta(c.label).concat([run(" "), run(F.kwota(c.kwota), { bold: true, underline: {} })]); }
    k.push(p([run("2.", { bold: true }), new D.TextRun({ children: [new D.Tab()] }), run("Wartość zamówienia netto.", { bold: true }),
      new D.TextRun({ children: [new D.Tab()] })].concat(cena(F.ceny[0])),
      { spacing: { before: 200, after: 20, line: 240 }, indent: { left: IND, hanging: IND }, tabStops: [{ type: D.TabStopType.LEFT, position: IND }].concat(prawy) }));
    var lewa = ["Warunki płatności:"].concat(F.platnosci), dalsze = F.ceny.slice(1);
    for (var i = 0; i < Math.max(lewa.length, dalsze.length); i++) {
      var ch = [run(lewa[i] || "")];
      if (dalsze[i]) ch = ch.concat([new D.TextRun({ children: [new D.Tab()] })], cena(dalsze[i]));
      k.push(p(ch, { indent: { left: IND }, tabStops: prawy }));
    }

    k.push(heading(3, "Dostawa i montaż."));
    k.push(body([run(F.dostawa)]), body([run(F.montaz)]));
    k.push(heading(4, "Zakres oferty."));
    F.zakres.forEach(function (l, i) {
      var m = l.match(/^(Poza ofertą pozostają:)(.*)$/);
      k.push(body(m ? [run(m[1], { underline: {} }), run(m[2])] : [run(l)], { spacing: { before: i ? 120 : 0, after: 0, line: 240 } }));
    });
    k.push(heading(5, "Warunki montażu."));
    F.warunki.forEach(function (l) {
      var m = l.match(/^(\d+)\.\s*(.*)$/);
      if (m) k.push(p([run(m[1] + "."), new D.TextRun({ children: [new D.Tab()] }), run(m[2])],
        { indent: { left: IND + 426, hanging: 426 }, tabStops: [{ type: D.TabStopType.LEFT, position: IND + 426 }] }));
      else k.push(body([run(l)], { spacing: { before: 80, after: 0, line: 240 } }));
    });
    k.push(heading(6, "Gwarancja."));
    F.gwarancja.forEach(function (l) { k.push(body([run(l)])); });
    k.push(blank());
    F.zakonczenie.forEach(function (l, i) { k.push(body([run(l)], { indent: { left: i ? IND + 284 : IND } })); });
    if (podpis) k.push(new D.Paragraph({ indent: { left: 340 }, spacing: { before: 60, after: 0 },
      children: [new D.ImageRun({ type: podpis.type || "jpg", data: podpis.data, transformation: { width: podpis.w, height: podpis.h } })] }));
    else k.push(blank(), blank(), blank());
    F.podpis.forEach(function (l) { k.push(p([run(l)], { indent: { left: 567 }, alignment: D.AlignmentType.LEFT })); });

    var doc = new D.Document({
      creator: "Kalkulator NK38",
      styles: { default: { document: { run: { font: BODY, size: 16 } } } },
      numbering: { config: [{ reference: "punkty", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "•", alignment: D.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 709, hanging: 284 } }, run: { color: BLUE, size: 22 } } }] }] },
      sections: [{
        properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1134, right: 1134, header: 425, footer: 425 } } },
        headers: { first: glowka(true), default: glowka(false) },
        footers: { first: stopka, default: stopka2 },
        children: k
      }]
    });
    return typeof window === "undefined" ? D.Packer.toBuffer(doc) : D.Packer.toBlob(doc);
  }

  var api = {
    setLibs: function (x) { Object.assign(L, x); }, xlsx: xlsx, pdf: pdf, docx: docxOferta,
    oferta: oferta, domyslnaOferta: domyslnaOferta, widoczneWarianty: widoczneWarianty, wymiary: wymiary, wymiaryPary: wymiaryPary, opisAuto: opisAuto, opisEfektywny: opisEfektywny, opisNadpisania: opisNadpisania, SZABLON: SZABLON, zOpisu: zOpisu, ceil100: ceil100, raport: raport
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38X = api;
})(this);
