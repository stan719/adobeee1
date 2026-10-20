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
  function ceil100(v) { return Math.ceil(Math.round(v * 100) / 10000) * 100; }
  function kwotaOferta(v) { return fmt0.format(v).replace(/\s/g, ".") + ",00 zł"; }

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
    var pary = wymiaryPary(Object.assign({}, d, { opis: "" }), o || {}).map(function (w) {
      var h = [w.h1, w.h2].filter(function (x) { return x != null; }).join("/");
      return "H-" + h + " | L-" + v(w.dl) + " | P-" + v(w.p) + " | Hpoj. G-" + v(w.gor) + " D-" + v(w.dol);
    });
    if (d.model === "lista") {   // urządzenia bez tabel NK38: tylko to, co wpisano
      var lp = wymiaryPary(Object.assign({}, d, { opis: "" }), o || {}).map(function (w) {
        var h = [w.h1, w.h2].filter(function (x) { return x != null; }).join("/"), g = [];
        if (h) g.push("H-" + h); if (h && w.dl) g.push("L-" + w.dl); if (w.p != null) g.push("P-" + w.p);
        var hp = (w.gor != null ? "G-" + w.gor : "") + (w.dol != null ? (w.gor != null ? " " : "") + "D-" + w.dol : "");
        if (hp) g.push("Hpoj. " + hp);
        return g.join(" | ");
      }).filter(Boolean);
      return lp.join(" lub ") + (d.pokazAgregaty && d.agregaty ? (lp.length ? " | " : "") + "A-" + d.agregaty : "");
    }
    return pary.join(" lub ") + " | A-" + (d.agregaty || 0) + " | Bok-" + (d.barierki || 0) + " Tył-" + (d.maskownice || 0) + " | mgstrl-" + (d.magistrala || 0);
  }
  function opisEfektywny(d, o) { return d.opis || opisAuto(d, o); }

  /* Wartości: liczba + format ("zl" | "eur" | "n" | "int" | "txt"). */
  /* Warianty pokazywane w tabelach: bez wariantu B (np. 2500 kg), gdy szablon go nie ma. */
  function widoczneWarianty(r) {
    var maB = !!(r.szablon.wariantB && r.szablon.wariantB.nazwa);
    return r.warianty.filter(function (x, i) { return maB || i % 2 === 0; });
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
        ["Wysokość pojazdów ▲ / ▼", lub(function (w) { return k(w.gor) + " / " + k(w.dol); }) + " cm"],
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
        .concat(nB ? [["Dopłata " + nB, sz.wariantB.tryb === "szt" ? sz.wariantB.wartosc + " " + sz.wariantB.waluta + "/szt. (" + pct(m.q2500) + ")" : pct(m.q2500)]] : [])
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
      ["KOB, GDW, podatek (" + zA + ")", "zl", function (x) { return x.kob + x.gdw + x.podatek; }],
      ["Zysk " + pct(d.zysk), "zl", "zysk"], ["Zysk " + pct(d.zysk2), "zl", "zysk2"], ["Koszt rzeczywisty", "zl", "koszt", 1],
      ["Osobodni razem", "n", "osobodni"]], ws) };
    var kol = nB ? [0, 1, 2, 3] : [0, 2], wybierz = function (v) { return kol.map(function (i) { return v[i]; }); };
    var opcje = {
      head: ["Opcja"].concat(wybierz([nA + ", " + zA, nB + ", " + zA, nA + ", " + zB, nB + ", " + zB])),
      rows: [
        { label: "Słupki e-ładowarek 3,7 kW", fmt: "zl", vals: wybierz([r.opcje.slupki37[0], r.opcje.slupki37[1], r.opcje.slupki37b[0], r.opcje.slupki37b[1]]) },
        { label: "Słupki e-ładowarek 22 kW", fmt: "zl", vals: wybierz([r.opcje.slupki22[0], r.opcje.slupki22[1], r.opcje.slupki22b[0], r.opcje.slupki22b[1]]) }
      ].concat(lista ? [] : [{ label: "Malowanie proszkowe RAL", fmt: "zl", vals: wybierz([r.opcje.malowanie, r.opcje.malowanie, r.opcje.malowanieB, r.opcje.malowanieB]) }])
        .concat((r.opcje.pozycje || []).map(function (p) { return { label: p.nazwa, fmt: "zl", vals: wybierz([p.kwota, p.kwota, p.kwotaB, p.kwotaB]) }; }))
    };
    var mat = lista ? m.wiersze.map(function (x) { return [x[0], zl(x[1])]; }).concat([["Suma " + nA, zl(m.suma2000)]])
      .concat(nB ? [["Suma " + nB + " (+" + pct(m.q2500) + ")", zl(m.suma2500)]] : []) : [
      ["Cena platformy D / S / N.P.", zl(m.cenaD) + " / " + zl(m.cenaS) + " / " + zl(m.cenaNP)],
      ["Platformy S z dopłatami", zl(m.platS)], ["Platformy D z dopłatami", zl(m.platD)], ["Platformy N.P.", zl(m.platNP)],
      ["Siłowniki (pary): std / 2000 / 2250", m.sil.std + " / " + m.sil.s2000 + " / " + m.sil.s2250],
      ["Hydraulika", zl(m.hydraulika)], ["Barierki i maskownice", zl(m.barierki)], ["Elektryka", zl(m.elektryka)],
      ["Mechanika zakupowa i pozostałe", zl(m.mechanika)], ["Suma Q=2000 (dawne F87)", zl(m.suma2000)],
      ["Suma Q=2500 (dawne F90, +" + pct(m.q2500) + ")", zl(m.suma2500)]
    ];
    var mon = { head: head, rows: [
      ["Osobodni montażu (F50)", "n", "osd"], ["Tygodnie / dni montażu (B55)", "int", "wyjazdy"],
      ["Osobodni podróży i rozładunku (G59)", "n", "podroze"], ["Dni pracy ekipy (J39)", "int", "dni"],
      ["Kilometry auta", "int", "km"], ["Noclegi (osobonoce)", "int", "noclegi"],
      ["Urządzenia", "zl", "urzadzenia", 0, 1], ["Słupki", "zl", "slupki", 0, 1], ["Paliwo", "zl", "paliwo", 0, 1],
      ["Hotel", "zl", "hotel", 0, 1], ["Transport", "zl", "transport", 0, 1], ["Spider Crane", "zl", "dzwig", 0, 1],
      ["Rozładunek, sprzęt", "zl", "rozladunek_sprzet", 0, 1], ["Rozładunek, ludzie", "zl", "rozladunek_ludzie", 0, 1],
      ["Dojazdy, ludzie", "zl", "dojazdy", 0, 1], ["Montaż", "zl", "montaz", 0, 1], ["Diety", "zl", "diety", 0, 1],
      ["Suma przed narzutami", "zl", "baza", 1], ["KOB", "zl", "kob"], ["GDW", "zl", "gdw"], ["Zysk " + pct(d.zysk), "zl", "zysk"],
      ["Podatek", "zl", "podatek"], ["Cena kontraktu, " + zA + " (K39)", "zl", "cena", 1]
    ].map(function (row) {
      return { label: row[0], fmt: row[1], bold: !!row[3], vals: ws.map(function (x) { return row[4] ? x.koszty[row[2]] : x[row[2]]; }) };
    }) };
    return { grupy: grupy, ceny: ceny, struktura: struktura, opcje: opcje, mat: mat, mon: mon, zA: zA, zB: zB, jm: jm, przeglad: sz.opcje.przeglad };
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
      r1.height = 28; r1.getCell(1).font = font({ size: 15, bold: true, color: { argb: "FFFFFFFF" } });
      r1.getCell(1).fill = fill(C.acc); r1.getCell(1).alignment = { vertical: "middle", indent: 1 };
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
    function pairs(ws, list, cols, labelW) {
      list.forEach(function (p) {
        var x = ws.addRow([p[0], p[1]]);
        ws.mergeCells(x.number, 2, x.number, cols);
        var a = x.getCell(1), b = x.getCell(2);
        a.font = font({ color: { argb: C.muted } }); a.fill = fill(C.zebra); a.border = box; a.alignment = { indent: 1, vertical: "top", wrapText: true };
        b.font = font(); b.border = box; b.alignment = { wrapText: true, vertical: "top", indent: 1 };
        var len = String(p[1]).length; if (len > (labelW || 70)) x.height = 15 * Math.ceil(len / (labelW || 70));
      });
      ws.addRow([]);
    }
    /* kafelki z najważniejszymi liczbami: 2 kolumny na kafelek */
    function tiles(ws, items) {
      var r1 = ws.addRow([]), r2 = ws.addRow([]), r3 = ws.addRow([]);
      r1.height = 18; r2.height = 30; r3.height = 16;
      var spans = [[1, 2], [3, 5]];
      items.forEach(function (t, i) {
        var col = spans[i][0];
        [r1, r2, r3].forEach(function (row) { ws.mergeCells(row.number, spans[i][0], row.number, spans[i][1]); });
        var a = r1.getCell(col), b = r2.getCell(col), c = r3.getCell(col);
        a.value = t[0]; b.value = t[1]; c.value = t[2] || "";
        [a, b, c].forEach(function (x) { x.fill = fill(C.tile); x.alignment = { indent: 1, vertical: "middle" }; });
        a.font = font({ size: 9, color: { argb: C.muted } });
        b.font = font({ size: 16, bold: true, color: { argb: t[4] ? C.ink : C.acc } }); b.numFmt = t[3] || NF.zl;
        b.alignment = { indent: 1, vertical: "middle", horizontal: "left" };
        c.font = font({ size: 9, color: { argb: C.muted } });
        a.border = { top: { style: "medium", color: { argb: C.acc } }, left: thin, right: thin };
        b.border = { left: thin, right: thin }; c.border = { bottom: thin, left: thin, right: thin };
      });
      ws.addRow([]);
    }
    var gen = "Wygenerowano " + new Date().toLocaleString("pl-PL") + " · ceny netto w zł · szablon " + d.typ;

    /* 1. Podsumowanie */
    var s1 = sheet("Podsumowanie", [36, 18, 18, 18, 18], 82);
    banner(s1, "Wycena " + d.typ + " · " + (d.nazwa || "bez nazwy"), gen, 5);
    tiles(s1, [
      ["Cena netto " + w0.nazwa + ", " + R.zA, w0.cena, zl(w0.cenaMP) + " / MP"],
      ["Cena netto " + w0.nazwa + ", " + R.zB, w0.cena2, zl(w0.cenaMP2) + " / MP"]
    ]);
    tiles(s1, [
      ["Czas montażu", w0.tygodnie + " tyg.", w0.dni + " dni pracy, ekipa " + w0.osoby + " os.", "@", 1],
      R.przeglad ? ["Konserwacja roczna / przegląd półroczny", zl(r.konserwacja[0].rok) + " / " + zl(r.konserwacja[0].pol),
        r.konserwacja[0].stawka + " zł/" + R.jm + "/mies.; przy " + r.konserwacja[1].stawka + " zł/" + R.jm + "/mies.: " + zl(r.konserwacja[1].rok) + " / " + zl(r.konserwacja[1].pol), "@", 1]
        : ["Konserwacja roczna", zl(r.konserwacja[0].rok), r.konserwacja[0].stawka + " zł/" + R.jm + "/mies.; przy " + r.konserwacja[1].stawka + " zł/" + R.jm + "/mies.: " + zl(r.konserwacja[1].rok), "@", 1]
    ]);
    section(s1, "Ceny wariantów", 5);
    table(s1, R.ceny.head, R.ceny.rows);
    section(s1, "Opcje do oferty (cena z narzutami)", 5);
    table(s1, R.opcje.head, R.opcje.rows);
    section(s1, "Struktura kosztów", 5);
    table(s1, R.struktura.head, R.struktura.rows);
    s1.lastRow.addPageBreak();
    section(s1, "Dane wejściowe", 5);
    R.grupy.forEach(function (g) {
      var x = s1.addRow([g.tytul]); s1.mergeCells(x.number, 1, x.number, 5);
      x.getCell(1).font = font({ bold: true, size: 10 }); x.getCell(1).fill = fill(C.accSoft); x.getCell(1).alignment = { indent: 1 };
      pairs(s1, g.pary, 5, 75);
      s1.lastRow.height = 6;
    });

    /* 2. Obliczenia (strona 1) i cennik (strona 2) */
    var s2 = sheet("Obliczenia i cennik", [40, 19, 19, 19, 19], 82);
    banner(s2, "Obliczenia krok po kroku", "Strona 1: obliczenia · strona 2: cennik szablonu " + d.typ, 5);
    section(s2, "Materiały i urządzenia", 5);
    pairs(s2, R.mat, 5);
    section(s2, "Montaż i cena", 5);
    table(s2, R.mon.head, R.mon.rows);
    s2.lastRow.addPageBreak();
    banner(s2, "Cennik szablonu " + d.typ, "Pomarańczowe = zmienione względem domyślnego NK38", 5);
    var cw = cennikWiersze(r, ctx.cennikPola, ctx.cennikZmiany), half = Math.ceil(cw.length / 2);
    /* dwie kolumny cennika obok siebie, żeby zmieścić się na jednej stronie */
    for (var i = 0; i < half; i++) {
      var a = cw[i], b = cw[i + half];
      var x = s2.addRow([a.grupa || a.label, a.grupa ? "" : a.val, b ? (b.grupa || b.label) : "", "", b && !b.grupa ? b.val : ""]);
      s2.mergeCells(x.number, 3, x.number, 4);
      [[a, 1, 2], [b, 3, 5]].forEach(function (z) {
        var it = z[0]; if (!it) return;
        var l = x.getCell(z[1]), v = x.getCell(z[2]);
        if (it.grupa) { l.font = font({ bold: true, size: 9, color: { argb: C.acc } }); l.border = { bottom: thin }; v.border = { bottom: thin }; }
        else {
          l.font = font({ size: 8.5, bold: it.zm, color: { argb: it.zm ? C.warn : C.ink } }); l.alignment = { indent: 1 };
          v.font = font({ size: 8.5 }); v.alignment = { horizontal: "right" };
          if (typeof it.val === "number") v.numFmt = Math.abs(it.val) < 1 && it.val !== 0 ? "0.00###" : "#,##0.##";
          if (it.jedn) v.note = undefined;
        }
      });
      x.height = 13;
    }

    /* 3. Do oferty */
    var s4 = sheet("Do oferty", [24, 96], 75);
    banner(s4, "Zestawienie do oferty", gen, 2);
    ctx.zestawienie.split("\n").forEach(function (l) {
      var mm = l.match(/^([^:]{3,40}):\s{2,}(.*)$/);
      var x = mm ? s4.addRow([mm[1], mm[2]]) : s4.addRow([l]);
      if (!mm) s4.mergeCells(x.number, 1, x.number, 2);
      x.eachCell(function (c, ci) { c.font = font({ name: mm ? FONT : "Consolas", size: mm ? 10 : 9.5, color: { argb: mm && ci === 1 ? C.muted : C.ink } }); c.alignment = { wrapText: true, vertical: "top" }; });
    });
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
    function head(t, sub) {
      doc.setFillColor.apply(doc, ACC); doc.rect(14, 12, 182, 11, "F");
      doc.setFont("Carlito", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.text(t, 17, 19.5);
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
    function kafelki(y, items) {
      var wdt = (182 - 3 * 4) / 4;
      items.forEach(function (t, i) {
        var x = 14 + i * (wdt + 4);
        doc.setFillColor.apply(doc, TILE); doc.rect(x, y, wdt, 22, "F");
        doc.setFillColor.apply(doc, ACC); doc.rect(x, y, wdt, 0.9, "F");
        doc.setFont("Carlito", "normal"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUT); doc.text(t[0], x + 3, y + 6);
        doc.setFont("Carlito", "bold"); doc.setFontSize(15); doc.setTextColor.apply(doc, i < 2 ? ACC : INK); doc.text(t[1], x + 3, y + 14);
        doc.setFont("Carlito", "normal"); doc.setFontSize(7.8); doc.setTextColor.apply(doc, MUT); doc.text(doc.splitTextToSize(t[2], wdt - 5)[0], x + 3, y + 19.2);
      });
      return y + 29;
    }
    var stopka = (d.nazwa || "Wycena") + " · szablon " + d.typ + " · wygenerowano " + new Date().toLocaleDateString("pl-PL");

    head("Wycena " + d.typ + " · " + (d.nazwa || "bez nazwy"), stopka);
    var y = kafelki(32, [
      ["Cena netto " + w0.nazwa + ", " + R.zA, zl(w0.cena), zl(w0.cenaMP) + " / MP"],
      ["Cena netto " + w0.nazwa + ", " + R.zB, zl(w0.cena2), zl(w0.cenaMP2) + " / MP"],
      ["Czas montażu", w0.tygodnie + " tyg.", w0.dni + " dni pracy, " + w0.osoby + " os."],
      ["Konserwacja roczna", zl(r.konserwacja[0].rok), r.konserwacja[0].stawka + " zł/" + R.jm + "/mies." + (R.przeglad ? ", przegląd półroczny " + zl(r.konserwacja[0].pol) : "")]
    ]);
    y = numTable(R.ceny, h2("Ceny wariantów", y));
    y = numTable(R.opcje, h2("Opcje do oferty (cena z narzutami)", y), { columnStyles: { 0: { halign: "left", cellWidth: 50 } } });
    numTable(R.struktura, h2("Struktura kosztów", y));

    doc.addPage(); head("Dane wejściowe", stopka);
    y = 34;
    var colW = 89, xs = [14, 14 + colW + 4], yCol = [y, y];
    R.grupy.forEach(function (g, gi) {
      var col = yCol[0] <= yCol[1] ? 0 : 1, x0 = xs[col], yy = yCol[col];
      doc.setFillColor.apply(doc, SOFT); doc.rect(x0, yy, colW, 6.5, "F");
      doc.setFont("Carlito", "bold"); doc.setFontSize(9.5); doc.setTextColor.apply(doc, ACC); doc.text(g.tytul, x0 + 2.5, yy + 4.6);
      L.autoTable(doc, Object.assign({}, base, { startY: yy + 6.5, body: g.pary, theme: "plain", margin: { left: x0, right: 210 - x0 - colW },
        tableWidth: colW, styles: Object.assign({}, base.styles, { fontSize: 8.4, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } }),
        columnStyles: { 0: { textColor: MUT, cellWidth: 33 }, 1: { cellWidth: colW - 33 } },
        didParseCell: function (h) { if (h.row.index % 2 === 1) h.cell.styles.fillColor = [247, 248, 249]; } }));
      yCol[col] = doc.lastAutoTable.finalY + 6;
    });

    doc.addPage(); head("Obliczenia krok po kroku", stopka);
    y = h2("Materiały i urządzenia", 36);
    L.autoTable(doc, Object.assign({}, base, { startY: y, body: R.mat, theme: "striped",
      styles: Object.assign({}, base.styles, { fontSize: 8.2, cellPadding: 1 }),
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } } }));
    y = h2("Montaż i cena", doc.lastAutoTable.finalY + 7);
    numTable(R.mon, y, { styles: Object.assign({}, base.styles, { fontSize: 7.8, cellPadding: 0.85 }) });

    doc.addPage(); head("Zestawienie do oferty", stopka);
    doc.setFont("Carlito", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, INK);
    y = 36;
    ctx.zestawienie.split("\n").forEach(function (l) {
      var mm = l.match(/^([^:]{3,40}):\s{2,}(.*)$/);
      if (mm) {
        doc.setTextColor.apply(doc, MUT); doc.text(mm[1], 14, y);
        doc.setTextColor.apply(doc, INK); var lines = doc.splitTextToSize(mm[2], 122); doc.text(lines, 74, y); y += 4.6 * lines.length;
      } else { var ls = doc.splitTextToSize(l || " ", 182); doc.setTextColor.apply(doc, INK); doc.text(ls, 14, y); y += 4.6 * ls.length; }
    });

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
      opcje: { q2500: true, slupki37: false, slupki22: false, malowanie: false },
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
    var op = zOpisu(d.opis), num = function (v) { return v === "" || v == null || isNaN(v) ? null : Number(v); };
    var h1 = num(d.h1) != null ? num(d.h1) : num(op.h1), h2 = num(d.h2) != null ? num(d.h2) : num(op.h2);
    var p = num(d.przeswit) != null ? num(d.przeswit) : num((op.p || "").match(/\d+/) && op.p.match(/\d+/)[0]);
    var dl = d.dl || op.l || "";
    var hs = [h1, h2].filter(function (x) { return x != null; });
    var W = d.wysokosci || { tryb: "zaglebienie" }, dolAuto, gorAuto, dol;
    if (W.tryb === "przeswit") {            // jeden poziom: górna = prześwit − k
      dolAuto = null; dol = num(o.hd);
      gorAuto = p != null ? p - num(W.k) : null;
    } else if (W.tryb === "przeswit2") {    // dwa poziomy bez zagłębienia: górna + dolna = prześwit − k
      dolAuto = num(W.dol); dol = num(o.hd) != null ? num(o.hd) : dolAuto;
      gorAuto = p != null && dol != null ? p - num(W.k) - dol : null;
    } else {                                // zagłębienie (NK38): dolna = niższe H − 15
      dolAuto = hs.length ? Math.min.apply(null, hs) - 15 : null;
      dol = num(o.hd) != null ? num(o.hd) : dolAuto;
      gorAuto = p != null && dol != null ? (p - 320) - (dol - 150) + 150 : null;
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
      agregat: o.agregat || TT.agregat || "Agregat hydrauliczny 400V, 50Hz, 6kW", kw: o.kw || TT.kw || "6kW", gw: o.gw || TT.gw || "36/60",
      dostawa: o.dostawa !== "" && o.dostawa != null ? o.dostawa : (TT.dostawa || 24), platnosci: o.platnosci || TT.platnosci || PLATNOSCI
    };
    var vars = { tir: o.tir || 20, kw: eff.kw, gw: eff.gw, typ: typ, P: v(wy.p), G: v(wy.gor), D: v(wy.dol) };
    var lista = r.szablon.model === "lista", maB = !!(r.szablon.wariantB && r.szablon.wariantB.nazwa);
    var dz = new Date(), data = ("0" + dz.getDate()).slice(-2) + "." + ("0" + (dz.getMonth() + 1)).slice(-2) + "." + dz.getFullYear();
    var tech = wpary.map(function (w) {
      var zagl = w.h2 != null && w.h2 !== w.h1 ? "H1-" + v(w.h1) + ", H2-" + v(w.h2) : v(w.h1);
      if (TT.tech) return sub(TT.tech, { H: zagl, L: v(w.dl), P: v(w.p), G: v(w.gor), D: v(w.dol) });
      return "Zagłębienie: wysokość " + zagl + "cm; długość " + v(w.dl) + "cm;\nPrześwit między-kondygnacyjny: min. " + v(w.p) +
        "cm;\nWysokość parkowanych pojazdów*: ▲-" + v(w.gor) + "cm, ▼-" + v(w.dol) + "cm;";
    }).join("\nlub\n");
    var garazTxt = o.garaz || ("przy " + (d.nazwa || "…"));
    var auto = {
      wstep: TT.wstep ? sub(TT.wstep, { n: m.platformy, mp: m.MP, typ: typ, garaz: garazTxt, oferte: o.powod === "rabat" ? "naszą zrabatowaną ofertę" : "naszą ofertę" }) : "w związku z " + (o.powod === "rabat" ? "Państwa prośbą o rabat przedstawiamy naszą zrabatowaną ofertę" : "otrzymanym zapytaniem przedstawiamy naszą ofertę") +
        " na dostawę i montaż " + m.platformy + " platform służących do niezależnego parkowania " + m.MP + " pojazdów w garażu " +
        (o.garaz || ("inwestycji " + (d.nazwa || "…"))) + ".",
      tech: tech,
      wyposazenie: [TT.obciazenie, TT.zabezpieczenie, d.barierki && !lista ? TT.barierki : ""].filter(Boolean).join("\n"),
      lista: ["S", "D", "NP"].map(function (k) { return d[k] ? sub(TY[k].oferta, { n: d[k], typ: typ }) : ""; }).concat([
        d.agregaty && r.szablon.opcje.agregaty ? d.agregaty + " szt. – " + eff.agregat + "." : ""]).filter(Boolean).join("\n"),
      platnosci: eff.platnosci,
      dostawa: "Pierwsza dostawa nastąpi nie wcześniej niż po ok. " + eff.dostawa + " tygodniach od zawarcia umowy, w zależności od aktualnie realizowanych zleceń.",
      montaz: "Przewidywany czas montażu " + (t[0] === t[1] ? "ok. " + t[0] : t[0] + "-" + t[1]) + " tygodni od dnia dostawy, w zależności od warunków panujących na budowie."
    };
    function txt(k) { return o.tekst[k] != null ? o.tekst[k] : auto[k]; }
    var opcjeDef = [
      maB && TT.opcjaQ2500 ? ["q2500", TT.opcjaQ2500, c(ws[1]) - c(ws[0])] : null,
      ["slupki37", "Słupki do e-ładowania na każdym ze " + m.MP + " miejsc postojowych, obejmujące montaż słupka pod ładowarkę, prowadnic, i puszki przyłączeniowej, bez samej stacji ładowania.", B ? r.opcje.slupki37b[0] : r.opcje.slupki37[0]],
      ["slupki22", "Słupki do e-ładowania do 22 kW na każdym ze " + m.MP + " miejsc postojowych, obejmujące montaż słupka pod ładowarkę, prowadnic, i puszki przyłączeniowej, bez samej stacji ładowania.", B ? r.opcje.slupki22b[0] : r.opcje.slupki22[0]],
      lista ? null : ["malowanie", "Malowanie proszkowe platform w kolorze RAL wybranym przez Zamawiającego.", B ? r.opcje.malowanieB : r.opcje.malowanie]
    ].concat((r.opcje.pozycje || []).map(function (p) { return ["poz_" + p.id, p.tekst || p.nazwa, B ? p.kwotaB : p.kwota]; })).filter(Boolean);
    var opcje = [], ceny = [{ klucz: "poz10", label: "Pozycja 1:", auto: ceil100(c(ws[0])) }];
    opcjeDef.forEach(function (x) {
      if (!o.opcje[x[0]]) return;
      var nr = "Opcja " + (opcje.length + 1) + ":";
      opcje.push({ label: nr, tekst: x[1] });
      ceny.push({ klucz: x[0], label: nr, auto: ceil100(x[2]) });
    });
    ceny.forEach(function (p) { p.kwota = o.ceny[p.klucz] != null && o.ceny[p.klucz] !== "" ? Number(o.ceny[p.klucz]) : p.auto; });
    return {
      naglowek: sz.naglowek.split("\n"), stopka: sz.stopka.split("\n"),
      miejsceData: (o.miejsce || "Kraków") + ", dnia " + data + "r.",
      adresat: adresatLinie(o.adr), nr: "Oferta nr " + (o.nr || o.nrAuto || "…"), zwrot: powitanie(o.adr), wymiary: wy, wymiaryPary: wpary,
      wstep: txt("wstep"), pozycja: sub(r.szablon.opisOferty || "Urządzenia {typ}", { typ: typ }),
      tech: txt("tech").split("\n"), uwagaTech: (TT.uwagaTech || sz.uwaga_tech).split("\n"), wyposazenie: txt("wyposazenie").split("\n"),
      lista: txt("lista").split("\n").filter(Boolean), opcje: opcje, ceny: ceny,
      poLiscie: (TT.poLiscie ? sub(TT.poLiscie, vars) : "").split("\n").filter(Boolean), eff: eff, opcjeDost: opcjeDef.map(function (x) { return { klucz: x[0], tekst: x[1] }; }),
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
        { spacing: { before: 200, after: 20, line: 240 }, indent: { left: IND, hanging: IND }, tabStops: [{ type: D.TabStopType.LEFT, position: IND }] });
    }
    /* Niebieska etykieta "Pozycja 1:" / "Opcja 1:" */
    function etykieta(label, extra) { return [run(label, Object.assign({ color: BLUE, bold: true }, extra || {}))]; }
    /* Pogrubia liczby i wymiary ("195/202", "▲-180(170)") w tekście danych technicznych. */
    function liczbyBold(text, opt) {
      var out = [], re = /([▲▼]?-?\d[\d\/\-().,]*)/g, last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) out.push(run(text.slice(last, m.index), opt));
        out.push(run(m[1], Object.assign({}, opt || {}, { bold: true })));
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
    oferta: oferta, domyslnaOferta: domyslnaOferta, widoczneWarianty: widoczneWarianty, wymiary: wymiary, wymiaryPary: wymiaryPary, opisAuto: opisAuto, opisEfektywny: opisEfektywny, SZABLON: SZABLON, zOpisu: zOpisu, ceil100: ceil100, raport: raport
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38X = api;
})(this);
