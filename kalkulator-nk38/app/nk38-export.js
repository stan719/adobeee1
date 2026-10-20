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

  /* Wartości: liczba + format ("zl" | "eur" | "n" | "int" | "pct" | "txt"). */
  function raport(r, GL) {
    var d = r.dane, m = r.mat, w = r.wspolne, ws = r.warianty, an = r.analiza, wy = opisWymiarow(d, GL);
    var jed = w.krk ? "dni" : "tyg.";
    var dane = [
      ["Inwestycja", d.nazwa || "-"], ["Data / nr oferty", (d.data || "-") + " / " + (d.nr || "-")],
      ["Opis / wariant", d.opis || "-"],
      ["Lokalizacja", d.lok + (w.krk ? "" : ", " + (d.km || 0) + " km od Krakowa")],
      ["Km pomiary / montaż", w.kmPom + " / " + w.kmMon + " km"],
      ["Urządzenia", d.typ + ": " + [d.S ? d.S + " × S" : "", d.D ? d.D + " × D" : "", d.NP ? d.NP + " × N.P." : ""].filter(Boolean).join(", ") + " = " + m.MP + " MP"],
      ["Agregaty", (d.agregaty || 0) + " szt."],
      ["Magistrala / barierki / maskownice", (d.magistrala || 0) + " × 6 m / " + (d.barierki || 0) + " / " + (d.maskownice || 0)],
      ["Utrudnienia", n2(m.utr) + " osd (auto " + n2(m.utrAuto) + ", ręcznie " + n2(d.utr_dod || 0) + ")"],
      ["Zagłębienia", wy.gl], ["Wymiary", wy.dims],
      ["Transport", (d.tir || 0) + " TIR × " + zl(d.tir_cena || 0) + ", rozładunek sprzętu " + zl(d.rozl_cena || 0) + " jednorazowo, " + n2(w.rozl) + " dni"],
      ["Ekipa", ws[0].osoby + " os., średnio " + zl(ws[0].stawka) + "/dzień"],
      ["Dźwig", w.dzwDni + " dni"],
      ["Czas podróży", d.wzor === "uproszczony" ? "uproszczony (650 km/dzień)" : "stary wzór (poprawiony)"],
      ["Zysk A / zysk B", pct(d.zysk) + " / " + pct(d.zysk2)],
      ["Dopłata Q=2500 / kurs EUR", pct(m.q2500) + " / " + d.eur],
      ["Zagłębienie H1 / H2, długość, prześwit", (d.h1 || "–") + " / " + (d.h2 || "–") + " cm, " + (d.dl || "–") + " cm, " + (d.przeswit || "–") + " cm"],
      ["Konserwacja A / B", r.konserwacja.map(function (k) { return zl(k.rok) + " rocznie, " + zl(k.pol) + " półrocznie (" + k.stawka + " zł/MP/mies.)"; }).join("; ")]
    ];
    var wynik = {
      head: ["Pozycja"].concat(ws.map(function (x) { return x.nazwa; })),
      rows: [
        ["Cena netto, zysk A " + pct(d.zysk), "zl", "cena", 1], ["Cena netto, zysk B " + pct(d.zysk2), "zl", "cena2", 1],
        ["Cena za MP, zysk A", "zl", "cenaMP"], ["Cena za MP, zysk B", "zl", "cenaMP2"], ["Cena za MP w euro, zysk A", "eur", "cenaMPeur"],
        ["Zysk A", "zl", "zysk"], ["Zysk B", "zl", "zysk2"], ["Koszt rzeczywisty", "zl", "koszt"],
        ["Urządzenia", "zl", function (x) { return x.koszty.urzadzenia; }],
        ["Słupki e-ładowarek", "zl", function (x) { return x.koszty.slupki; }],
        ["Transport, dźwig, rozładunek", "zl", function (x) { return x.koszty.transport + x.koszty.dzwig + x.koszty.rozladunek_sprzet; }],
        ["Robocizna", "zl", function (x) { return x.koszty.montaz + x.koszty.rozladunek_ludzie + x.koszty.dojazdy; }],
        ["Hotel, diety, paliwo", "zl", function (x) { return x.koszty.hotel + x.koszty.diety + x.koszty.paliwo; }],
        ["KOB, GDW, podatek (zysk A)", "zl", function (x) { return x.kob + x.gdw + x.podatek; }],
        ["Dni pracy ekipy", "int", "dni", 1], ["Tygodnie montażu", "int", "tygodnie", 1], ["Osobodni razem", "n", "osobodni"]
      ].map(function (row) {
        return { label: row[0], fmt: row[1], bold: !!row[3], vals: ws.map(function (x) { return typeof row[2] === "function" ? row[2](x) : x[row[2]]; }) };
      })
    };
    var opcje = {
      head: ["Opcja", "Q=2000, zysk A", "Q=2500, zysk A", "Q=2000, zysk B", "Q=2500, zysk B"],
      rows: [
        { label: "Słupki e-ładowarek 3,7 kW", fmt: "zl", vals: [r.opcje.slupki37[0], r.opcje.slupki37[1], r.opcje.slupki37b[0], r.opcje.slupki37b[1]] },
        { label: "Słupki e-ładowarek 22 kW", fmt: "zl", vals: [r.opcje.slupki22[0], r.opcje.slupki22[1], r.opcje.slupki22b[0], r.opcje.slupki22b[1]] },
        { label: "Malowanie proszkowe RAL", fmt: "zl", vals: [r.opcje.malowanie, r.opcje.malowanie, r.opcje.malowanieB, r.opcje.malowanieB] }
      ]
    };
    var ekipa = {
      head: ["Liczba osób (" + r.analizaWariant + ")"].concat(an.map(function (a) { return a.n + " os."; })),
      rows: [
        ["Cena, zysk A", "zl", "cena", 1], ["Cena, zysk B", "zl", "cena2"], ["Średnia stawka", "zl", "stawka"],
        ["Dni pracy", "int", "dni"], ["Tygodnie montażu", "int", "tygodnie"], ["Noclegi (osobonoce)", "int", "noclegi"],
        ["Km auta ekipy", "int", "km"],
        ["Hotel i diety", "zl", function (a) { return a.koszty.hotel + a.koszty.diety; }],
        ["Robocizna", "zl", function (a) { return a.koszty.montaz + a.koszty.dojazdy + a.koszty.rozladunek_ludzie; }]
      ].map(function (row) {
        return { label: row[0], fmt: row[1], bold: !!row[3], vals: an.map(function (a) { return typeof row[2] === "function" ? row[2](a) : a[row[2]]; }) };
      })
    };
    var mat = [
      ["Cena platformy D / S / N.P.", zl(m.cenaD) + " / " + zl(m.cenaS) + " / " + zl(m.cenaNP)],
      ["Platformy S z dopłatami", zl(m.platS)], ["Platformy D z dopłatami", zl(m.platD)], ["Platformy N.P.", zl(m.platNP)],
      ["Siłowniki (pary): std / 2000 / 2250", m.sil.std + " / " + m.sil.s2000 + " / " + m.sil.s2250],
      ["Hydraulika", zl(m.hydraulika)], ["Barierki i maskownice", zl(m.barierki)], ["Elektryka", zl(m.elektryka)],
      ["Mechanika zakupowa i pozostałe", zl(m.mechanika)], ["Suma Q=2000 (dawne F87)", zl(m.suma2000)],
      ["Suma Q=2500 (dawne F90, +" + pct(m.q2500) + ")", zl(m.suma2500)]
    ];
    var mon = {
      head: ["Pozycja"].concat(ws.map(function (x) { return x.nazwa; })),
      rows: [
        ["Osobodni montażu (F50)", "n", "osd"], ["Tygodnie / dni montażu (B55)", "int", "wyjazdy"],
        ["Osobodni podróży i rozładunku (G59)", "n", "podroze"], ["Dni pracy ekipy (J39)", "int", "dni"],
        ["Kilometry auta", "int", "km"], ["Noclegi (osobonoce)", "int", "noclegi"],
        ["Urządzenia", "zl", "urzadzenia", 0, 1], ["Słupki", "zl", "slupki", 0, 1], ["Paliwo", "zl", "paliwo", 0, 1],
        ["Hotel", "zl", "hotel", 0, 1], ["Transport TIR", "zl", "transport", 0, 1], ["Spider Crane", "zl", "dzwig", 0, 1],
        ["Rozładunek, sprzęt", "zl", "rozladunek_sprzet", 0, 1], ["Rozładunek, ludzie", "zl", "rozladunek_ludzie", 0, 1],
        ["Dojazdy, ludzie", "zl", "dojazdy", 0, 1], ["Montaż", "zl", "montaz", 0, 1], ["Diety", "zl", "diety", 0, 1],
        ["Suma przed narzutami", "zl", "baza", 1], ["KOB", "zl", "kob"], ["GDW", "zl", "gdw"], ["Zysk A", "zl", "zysk"],
        ["Podatek", "zl", "podatek"], ["Cena kontraktu, zysk A (K39)", "zl", "cena", 1]
      ].map(function (row) {
        return { label: row[0], fmt: row[1], bold: !!row[3], vals: ws.map(function (x) { return row[4] ? x.koszty[row[2]] : x[row[2]]; }) };
      })
    };
    return { dane: dane, wynik: wynik, opcje: opcje, ekipa: ekipa, mat: mat, mon: mon, jed: jed };
  }

  function fmtVal(v, f) {
    if (f === "zl") return zl(v);
    if (f === "eur") return eur(v);
    if (f === "int") return fmt0.format(v);
    if (f === "n") return n2(v);
    return String(v);
  }

  /* ------------------------------------------------------------ Excel */
  function xlsx(r, ctx) {
    var R = raport(r, ctx.GLEBOKOSCI), d = r.dane;
    var wb = new L.ExcelJS.Workbook();
    wb.creator = "Kalkulator NK38";
    var FONT = "Arial";
    var C = { acc: "FF0A6B74", accSoft: "FFE3F2F2", ink: "FF0E171C", muted: "FF6A7780", line: "FFD3D9DD", zebra: "FFF7F8F9", good: "FFE3F4EA", goodInk: "FF13794A", warn: "FF8A5300" };
    var NF = { zl: '#,##0 "zł";-#,##0 "zł";"–"', eur: '#,##0 "€"', int: "#,##0", n: "#,##0.00" };
    var thin = { style: "thin", color: { argb: C.line } };
    var box = { top: thin, bottom: thin, left: thin, right: thin };
    function fill(argb) { return { type: "pattern", pattern: "solid", fgColor: { argb: argb } }; }
    function font(o) { return Object.assign({ name: FONT, size: 10, color: { argb: C.ink } }, o || {}); }

    function sheet(name, widths, landscape) {
      var ws = wb.addWorksheet(name, { views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } } });
      ws.columns = widths.map(function (w) { return { width: w }; });
      ws.properties.defaultRowHeight = 16;
      ws.headerFooter.oddFooter = "&L&8" + (d.nazwa || "Kalkulator NK38") + "&R&8Strona &P z &N";
      return ws;
    }
    function banner(ws, title, sub, cols) {
      var r1 = ws.addRow([title]); ws.mergeCells(r1.number, 1, r1.number, cols);
      r1.height = 26; r1.getCell(1).font = font({ size: 15, bold: true, color: { argb: "FFFFFFFF" } });
      r1.getCell(1).fill = fill(C.acc); r1.getCell(1).alignment = { vertical: "middle", indent: 1 };
      var r2 = ws.addRow([sub]); ws.mergeCells(r2.number, 1, r2.number, cols);
      r2.getCell(1).font = font({ size: 9, color: { argb: C.muted } }); r2.getCell(1).alignment = { indent: 1 };
      ws.addRow([]);
    }
    function section(ws, title, cols) {
      var x = ws.addRow([title]); ws.mergeCells(x.number, 1, x.number, cols);
      x.height = 20; x.getCell(1).font = font({ size: 11, bold: true, color: { argb: C.acc } });
      x.getCell(1).alignment = { vertical: "bottom" };
      x.getCell(1).border = { bottom: { style: "medium", color: { argb: C.acc } } };
      return x;
    }
    function table(ws, head, rows, opt) {
      opt = opt || {};
      var h = ws.addRow(head);
      h.height = 30;
      h.eachCell(function (c, i) {
        c.fill = fill(C.accSoft); c.border = box;
        c.font = font({ bold: true, size: 9, color: { argb: C.acc } });
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
        if (opt.best && row.best) {
          var vals = row.vals, min = Math.min.apply(null, vals);
          vals.forEach(function (v, i) { if (v === min) { var c = x.getCell(i + 2); c.fill = fill(C.good); c.font = font({ bold: true, color: { argb: C.goodInk } }); } });
        }
      });
      ws.addRow([]);
    }
    function pairs(ws, list, cols) {
      list.forEach(function (p, i) {
        var x = ws.addRow([p[0], p[1]]);
        ws.mergeCells(x.number, 2, x.number, cols);
        var a = x.getCell(1), b = x.getCell(2);
        a.font = font({ color: { argb: C.muted } }); a.fill = fill(C.zebra); a.border = box; a.alignment = { indent: 1, vertical: "top" };
        b.font = font(); b.border = box; b.alignment = { wrapText: true, vertical: "top", indent: 1 };
        var len = String(p[1]).length; if (len > 70) x.height = 16 * Math.ceil(len / 70);
      });
      ws.addRow([]);
    }
    var gen = "Wygenerowano " + new Date().toLocaleString("pl-PL") + " · ceny netto w zł";

    /* Podsumowanie */
    var s1 = sheet("Podsumowanie", [40, 21, 21, 21, 21], true);
    banner(s1, "Kalkulator NK38 · " + (d.nazwa || "wycena"), gen, 5);
    section(s1, "Cena kontraktu", 5);
    var top = { head: R.wynik.head, rows: R.wynik.rows.slice(0, 5) };
    table(s1, top.head, top.rows);
    section(s1, "Struktura kosztów i czas montażu", 5);
    table(s1, R.wynik.head, R.wynik.rows.slice(5));
    s1.lastRow.addPageBreak();
    section(s1, "Opcje do oferty (cena z narzutami)", 5);
    table(s1, R.opcje.head, R.opcje.rows);
    section(s1, "Dane wejściowe", 5);
    pairs(s1, R.dane, 5);
    s1.views = [{ showGridLines: false, state: "frozen", ySplit: 2 }];

    /* Ekipa */
    var s2 = sheet("Ekipa", [34].concat(r.analiza.map(function () { return 15; })), true);
    banner(s2, "Analiza liczby osób", "Wariant: " + r.analizaWariant + " · wpisana liczba osób: " + r.warianty[0].osoby + " · zielone = najtańsza", r.analiza.length + 1);
    var ek = R.ekipa.rows.map(function (row, i) { return Object.assign({}, row, { best: i === 0 }); });
    table(s2, R.ekipa.head, ek, { best: true });
    var n = s2.addRow(["Praca to stała liczba osobodni: więcej osób skraca montaż, noclegi i diety prawie się nie zmieniają, km auta maleją z liczbą tygodni."]);
    s2.mergeCells(n.number, 1, n.number, r.analiza.length + 1); n.getCell(1).font = font({ size: 9, italic: true, color: { argb: C.muted } }); n.getCell(1).alignment = { wrapText: true }; n.height = 28;

    /* Obliczenia */
    var s3 = sheet("Obliczenia", [42, 20, 20, 20, 20], false);
    banner(s3, "Obliczenia krok po kroku", "Te same kroki co w starym arkuszu (adresy komórek w nawiasach)", 5);
    section(s3, "Materiały i urządzenia (dawny arkusz NK38)", 5);
    pairs(s3, R.mat, 5);
    section(s3, "Montaż i cena (dawny arkusz montażu)", 5);
    table(s3, R.mon.head, R.mon.rows);

    /* Do oferty */
    var s4 = sheet("Do oferty", [24, 96], false);
    banner(s4, "Zestawienie do oferty", gen, 2);
    ctx.zestawienie.split("\n").forEach(function (l) {
      var m = l.match(/^([^:]{3,22}):\s{2,}(.*)$/);
      var x = m ? s4.addRow([m[1], m[2]]) : s4.addRow([l]);
      if (!m) s4.mergeCells(x.number, 1, x.number, 2);
      x.eachCell(function (c, i) { c.font = font({ name: m ? FONT : "Consolas", size: m ? 10 : 9.5, color: { argb: m && i === 1 ? C.muted : C.ink } }); c.alignment = { wrapText: true, vertical: "top" }; });
    });
    s4.addRow([]);
    section(s4, "Uwagi do sprawdzenia", 2);
    ctx.uwagi.forEach(function (u) {
      var x = s4.addRow(["•", u]); x.getCell(1).alignment = { horizontal: "right", vertical: "top" };
      x.getCell(2).alignment = { wrapText: true, vertical: "top" }; x.getCell(2).font = font(); x.height = 16 * Math.max(1, Math.ceil(u.length / 95));
    });

    /* Cennik */
    var s5 = sheet("Cennik", [46, 16, 10], false);
    banner(s5, "Cennik użyty w wycenie", "Pogrubione na pomarańczowo = zmienione względem domyślnego", 3);
    ctx.cennikPola.forEach(function (p) {
      if (!p[1]) { section(s5, p[0], 3); return; }
      var x = s5.addRow([p[1], r.cennik[p[0]], p[2]]), ch = ctx.cennikZmiany[p[0]] !== undefined;
      x.eachCell(function (c, i) { c.border = box; c.font = font({ bold: ch, color: { argb: ch ? C.warn : (i === 3 ? C.muted : C.ink) } }); });
      x.getCell(1).alignment = { indent: 1 };
      x.getCell(2).numFmt = p[2] === "zł" ? '#,##0.00' : (p[2] === "×" ? "0.00###" : "#,##0.##");
    });
    return wb.xlsx.writeBuffer();
  }

  /* ------------------------------------------------------------ PDF (max 4 strony) */
  function pdf(r, ctx) {
    var R = raport(r, ctx.GLEBOKOSCI), d = r.dane;
    var doc = new L.jsPDF({ unit: "mm", format: "a4" });
    doc.addFileToVFS("Carlito-Regular.ttf", ctx.fonts.regular);
    doc.addFileToVFS("Carlito-Bold.ttf", ctx.fonts.bold);
    doc.addFont("Carlito-Regular.ttf", "Carlito", "normal");
    doc.addFont("Carlito-Bold.ttf", "Carlito", "bold");
    doc.setFont("Carlito", "normal");
    var ACC = [10, 107, 116], INK = [14, 23, 28], MUT = [106, 119, 128], LINE = [227, 231, 234];
    var base = { styles: { font: "Carlito", fontSize: 8.5, cellPadding: 1.3, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: ACC, textColor: 255, fontStyle: "bold", halign: "right" },
      columnStyles: { 0: { halign: "left" } }, margin: { left: 14, right: 14 }, theme: "grid" };
    function head(t, sub) {
      doc.setFont("Carlito", "bold"); doc.setFontSize(15); doc.setTextColor.apply(doc, INK); doc.text(t, 14, 18);
      doc.setFont("Carlito", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, MUT); doc.text(sub, 14, 23.5);
      doc.setDrawColor.apply(doc, ACC); doc.setLineWidth(0.6); doc.line(14, 26, 196, 26);
    }
    function h2(t, y) { doc.setFont("Carlito", "bold"); doc.setFontSize(11); doc.setTextColor.apply(doc, INK); doc.text(t, 14, y); return y + 2; }
    function numTable(T, y, opts) {
      L.autoTable(doc, Object.assign({}, base, opts || {}, {
        startY: y, head: [T.head],
        body: T.rows.map(function (row) { return [row.label].concat(row.vals.map(function (v) { return fmtVal(v, row.fmt); })); }),
        columnStyles: Object.assign({ 0: { halign: "left", cellWidth: 58 } }, (opts && opts.columnStyles) || {}),
        bodyStyles: { halign: "right" },
        didParseCell: function (h) {
          if (h.section === "head" && h.column.index === 0) h.cell.styles.halign = "left";
          if (h.section === "body" && T.rows[h.row.index].bold) { h.cell.styles.fontStyle = "bold"; h.cell.styles.fillColor = [227, 242, 242]; }
        }
      }));
      return doc.lastAutoTable.finalY + 7;
    }
    var stopka = (d.nazwa || "Wycena") + (d.nr ? " · " + d.nr : "") + " · wygenerowano " + new Date().toLocaleDateString("pl-PL");

    head("Kalkulator NK38 · " + (d.nazwa || "wycena"), stopka);
    var y = h2("Dane wejściowe", 33);
    var half = Math.ceil(R.dane.length / 2), body = [];
    for (var i = 0; i < half; i++) body.push([R.dane[i][0], R.dane[i][1], R.dane[i + half] ? R.dane[i + half][0] : "", R.dane[i + half] ? R.dane[i + half][1] : ""]);
    L.autoTable(doc, Object.assign({}, base, { startY: y, body: body, theme: "plain",
      columnStyles: { 0: { textColor: MUT, cellWidth: 34 }, 1: { cellWidth: 57 }, 2: { textColor: MUT, cellWidth: 34 }, 3: { cellWidth: 57 } } }));
    y = h2("Warianty", doc.lastAutoTable.finalY + 8);
    numTable(R.wynik, y);

    doc.addPage(); head("Opcje i ekipa", stopka);
    y = numTable(R.opcje, h2("Opcje do oferty (cena z narzutami)", 33));
    y = h2("Analiza liczby osób · wariant " + r.analizaWariant + " · wpisano " + r.warianty[0].osoby + " os.", y);
    numTable(R.ekipa, y, { columnStyles: { 0: { halign: "left", cellWidth: 46 } } });

    doc.addPage(); head("Obliczenia krok po kroku", stopka);
    y = h2("Materiały i urządzenia (dawny arkusz NK38)", 33);
    L.autoTable(doc, Object.assign({}, base, { startY: y, body: R.mat, theme: "striped",
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } } }));
    y = h2("Montaż i cena (dawny arkusz montażu)", doc.lastAutoTable.finalY + 8);
    numTable(R.mon, y, { styles: Object.assign({}, base.styles, { fontSize: 7.8, cellPadding: 0.9 }) });

    doc.addPage(); head("Zestawienie do oferty", stopka);
    doc.setFont("Carlito", "normal"); doc.setFontSize(8.6); doc.setTextColor.apply(doc, INK);
    y = 34;
    ctx.zestawienie.split("\n").forEach(function (l) {
      var lines = doc.splitTextToSize(l || " ", 182);
      doc.text(lines, 14, y); y += 4 * lines.length;
    });
    y = h2("Uwagi do sprawdzenia", y + 5) + 3;
    doc.setFont("Carlito", "normal"); doc.setFontSize(8.6);
    ctx.uwagi.forEach(function (u) { var lines = doc.splitTextToSize("• " + u, 182); doc.text(lines, 14, y); y += 4 * lines.length + 1; });

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
    zakonczenie: "Wyrażamy przekonanie iż przedstawiona oferta zyska Państwa aprobatę i przyczyni się do dalszej owocnej współpracy.\nZ poważaniem,",
    podpis: "arch. Iwo Nowina Konopka\nPrezes Zarządu",
    klauzula: "Klauzula poufności. Klient zobowiązuje się do zachowania najwyższej poufności względem zawartości i przedmiotu niniejszej oferty i załączonej dokumentacji. Zobowiązuje się również do nie rozpowszechniania jej treści ani do nie używania jej w celach innych niż ocena tej oferty."
  };

  function domyslnaOferta() {
    return {
      nr: "", nrAuto: "", miejsce: "Kraków", powod: "zapytanie", garaz: "",
      adr: { zwrot: "Szanowna Pani", imie: "", stanowisko: "", tel: "", email: "", firma: "", ulica: "", kod: "", nip: "" },
      hg: "", hd: "", montOd: "", montDo: "", agregat: "Agregat hydrauliczny 400V, 50Hz, 6kW", kw: "6kW",
      opcje: { q2500: true, slupki37: false, slupki22: false, malowanie: false },
      zysk: "A", ceny: {}, platnosci: "30% zaliczka na 22 tygodnie przed dostawą,\ndo 60% płatność na 5 dni przed dostawą,\ndo 90% płatność do 21 dni po dostawie,\ndo 100% płatność do 21 dni po pierwszym badaniu UDT.\nOferta ważna jest 2 miesiące.",
      dostawa: 24, montaz: "", tir: 20, gw: "36/60", tekst: {}
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
    var dolAuto = hs.length ? Math.min.apply(null, hs) - 15 : null;
    var dol = num(o.hd) != null ? num(o.hd) : dolAuto;
    var gorAuto = p != null && dol != null ? (p - 320) - (dol - 150) + 150 : null;
    var gor = num(o.hg) != null ? num(o.hg) : gorAuto;
    return { h1: h1, h2: h2, p: p, dl: dl, dolAuto: dolAuto, gorAuto: gorAuto, dol: dol, gor: gor };
  }

  /* Treść oferty jako struktura (podgląd HTML i plik Word używają tego samego). */
  function oferta(r, o, sz) {
    var d = r.dane, m = r.mat, ws = r.warianty, B = o.zysk === "B";
    var c = function (x) { return B ? x.cena2 : x.cena; };
    var wy = wymiary(d, o), v = function (x) { return x == null || x === "" ? "…" : x; };
    var t = [o.montOd !== "" && o.montOd != null ? Number(o.montOd) : ws[0].tygodnieZakres[0], o.montDo !== "" && o.montDo != null ? Number(o.montDo) : ws[0].tygodnieZakres[1]];
    var typ = d.typ;
    var vars = { tir: o.tir || 20, kw: o.kw, gw: o.gw, typ: typ };
    var dz = new Date(), data = ("0" + dz.getDate()).slice(-2) + "." + ("0" + (dz.getMonth() + 1)).slice(-2) + "." + dz.getFullYear();
    var zagl = wy.h2 != null && wy.h2 !== wy.h1 ? "H1-" + v(wy.h1) + ", H2-" + v(wy.h2) : v(wy.h1);
    var auto = {
      wstep: "w związku z " + (o.powod === "rabat" ? "Państwa prośbą o rabat przedstawiamy naszą zrabatowaną ofertę" : "otrzymanym zapytaniem przedstawiamy naszą ofertę") +
        " na dostawę i montaż " + m.platformy + " platform służących do niezależnego parkowania " + m.MP + " pojazdów w garażu " +
        (o.garaz || ("inwestycji " + (d.nazwa || "…"))) + ".",
      tech: "Zagłębienie: wysokość " + zagl + "cm; długość " + v(wy.dl) + "cm;\nPrześwit między-kondygnacyjny: min. " + v(wy.p) +
        "cm;\nWysokość parkowanych pojazdów*: ▲-" + v(wy.gor) + "cm, ▼-" + v(wy.dol) + "cm;",
      wyposazenie: "Obciążenie platformy: 2000kg/miejsce postojowe, 500kg/koło;\nZabezpieczenie antykorozyjne: urządzenie zabezpieczone ocynkiem ogniowym oraz częściowo lakierowane." +
        (d.barierki ? "\nZabezpieczenie po bokach: barierki systemowe lub profile zmniejszające prześwit poziomy mocowane do ścian wszędzie tam gdzie istnieje przerwa pomiędzy platformami bądź platformami i ścianami co najmniej 20cm, zg. z PN." : ""),
      lista: [d.S ? d.S + " szt. – " + typ + "-S szer. użytkowa platformy 250cm, szer. zewnętrzna urządzenia 280cm," : "",
        d.D ? d.D + " szt. – " + typ + "-D szer. użytkowa platformy 500cm, szer. zewnętrzna urządzenia 530cm," : "",
        d.NP ? d.NP + " szt. – " + typ + " dla osób niepełnosprawnych," : "",
        d.agregaty ? d.agregaty + " szt. – " + o.agregat + "." : ""].filter(Boolean).join("\n"),
      dostawa: "Pierwsza dostawa nastąpi nie wcześniej niż po ok. " + o.dostawa + " tygodniach od zawarcia umowy, w zależności od aktualnie realizowanych zleceń.",
      montaz: "Przewidywany czas montażu " + (t[0] === t[1] ? "ok. " + t[0] : t[0] + "-" + t[1]) + " tygodni od dnia dostawy, w zależności od warunków panujących na budowie."
    };
    function txt(k) { return o.tekst[k] != null ? o.tekst[k] : auto[k]; }
    var opcjeDef = [
      ["q2500", "Obciążenie platformy: 2500kg/miejsce postojowe, 625kg/koło.", c(ws[1]) - c(ws[0])],
      ["slupki37", "Słupki do e-ładowania na każdym ze " + m.MP + " miejsc postojowych, obejmujące montaż słupka pod ładowarkę, prowadnic, i puszki przyłączeniowej, bez samej stacji ładowania.", B ? r.opcje.slupki37b[0] : r.opcje.slupki37[0]],
      ["slupki22", "Słupki do e-ładowania do 22 kW na każdym ze " + m.MP + " miejsc postojowych, obejmujące montaż słupka pod ładowarkę, prowadnic, i puszki przyłączeniowej, bez samej stacji ładowania.", B ? r.opcje.slupki22b[0] : r.opcje.slupki22[0]],
      ["malowanie", "Malowanie proszkowe platform w kolorze RAL wybranym przez Zamawiającego.", B ? r.opcje.malowanieB : r.opcje.malowanie]
    ];
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
      adresat: adresatLinie(o.adr), nr: "Oferta nr " + (o.nr || o.nrAuto || "…"), zwrot: powitanie(o.adr), wymiary: wy,
      wstep: txt("wstep"), pozycja: "Urządzenia " + typ + " do niezależnego parkowania pojazdów (z zagłębieniem)",
      tech: txt("tech").split("\n"), uwagaTech: sz.uwaga_tech.split("\n"), wyposazenie: txt("wyposazenie").split("\n"),
      lista: txt("lista").split("\n").filter(Boolean), opcje: opcje, ceny: ceny,
      platnosci: o.platnosci.split("\n"), dostawa: txt("dostawa"), montaz: txt("montaz"),
      zakres: sz.zakres.split("\n"), warunki: sub(sz.warunki, vars).split("\n"), gwarancja: sub(sz.gwarancja, vars).split("\n"),
      zakonczenie: sz.zakonczenie.split("\n"), podpis: sz.podpis.split("\n"), klauzula: sz.klauzula,
      auto: auto, kwota: kwotaOferta
    };
  }

  /* Oferta Word w układzie oryginalnych ofert PSP: Verdana 8 pt, nagłówek Times/Century Gothic,
     niebieskie etykiety "Pozycja 1", pogrubione liczby, niebieskie punktory. */
  function docxOferta(r, o, sz, logo) {
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
    var stopka = new D.Footer({ children: F.stopka.map(function (l, i) {
      var last = i === F.stopka.length - 1;
      var runs = last ? l.split(/(\S+@\S+|https?:\/\/\S+)/).filter(Boolean).map(function (x) {
        var link = /@|https?:/.test(x);
        return new D.TextRun({ text: x, font: GOTH, size: link ? 16 : 18, color: link ? "0000FF" : "000000", underline: link ? {} : undefined });
      }) : [new D.TextRun({ text: l, font: GOTH, size: 20 })];
      return p(runs, { alignment: D.AlignmentType.CENTER, border: i === 0 ? { top: { style: D.BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } } : undefined });
    }) });

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
    k.push(p([run(F.wstep)], { alignment: D.AlignmentType.JUSTIFIED }));
    k.push(blank());

    k.push(heading(1, "Specyfikacja oferty:"));
    var poz = F.pozycja.split(r.dane.typ);
    k.push(body(etykieta("Pozycja 1:").concat([run(" " + poz[0], { color: BLUE }), run(r.dane.typ, { color: BLUE, bold: true }), run(poz.slice(1).join(r.dane.typ), { color: BLUE })])));
    k.push(body([run("Dane techniczne:", { underline: {} })]));
    F.tech.forEach(function (l) { k.push(body(opisowa(l))); });
    F.uwagaTech.forEach(function (l) { k.push(body([run(l, { italics: true })])); });
    F.wyposazenie.forEach(function (l) { k.push(body(opisowa(l))); });
    F.lista.forEach(function (l) {
      k.push(new D.Paragraph({ children: pozycjaUrzadzen(l), numbering: { reference: "punkty", level: 0 }, spacing: { before: 40, after: 0, line: 240 } }));
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
    k.push(blank(), blank(), blank());
    F.podpis.forEach(function (l) { k.push(p([run(l)], { indent: { left: 567 }, alignment: D.AlignmentType.LEFT })); });
    k.push(blank(), blank());
    k.push(p([run(F.klauzula, { size: 12, color: GREY })], { alignment: D.AlignmentType.JUSTIFIED }));

    var doc = new D.Document({
      creator: "Kalkulator NK38",
      styles: { default: { document: { run: { font: BODY, size: 16 } } } },
      numbering: { config: [{ reference: "punkty", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "•", alignment: D.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 709, hanging: 284 } }, run: { color: BLUE, size: 22 } } }] }] },
      sections: [{
        properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1134, right: 1134, header: 425, footer: 425 } } },
        headers: { first: glowka(true), default: glowka(false) },
        footers: { first: stopka, default: stopka },
        children: k
      }]
    });
    return typeof window === "undefined" ? D.Packer.toBuffer(doc) : D.Packer.toBlob(doc);
  }

  var api = {
    setLibs: function (x) { Object.assign(L, x); }, xlsx: xlsx, pdf: pdf, docx: docxOferta,
    oferta: oferta, domyslnaOferta: domyslnaOferta, wymiary: wymiary, SZABLON: SZABLON, zOpisu: zOpisu, ceil100: ceil100, raport: raport
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38X = api;
})(this);
