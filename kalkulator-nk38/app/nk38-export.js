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
      ["Transport", (d.tir || 0) + " TIR × " + zl(d.tir_cena || 0) + ", rozładunek " + zl(d.rozl_cena || 0) + "/TIR, " + n2(w.rozl) + " dni"],
      ["Ekipa", ws[0].osoby + " os., średnio " + zl(ws[0].stawka) + "/dzień"],
      ["Dźwig", w.dzwDni + " dni"],
      ["Czas podróży", d.wzor === "uproszczony" ? "uproszczony (650 km/dzień)" : "stary wzór (poprawiony)"],
      ["Zysk A / zysk B", pct(d.zysk) + " / " + pct(d.zysk2)],
      ["Dopłata Q=2500 / kurs EUR", pct(m.q2500) + " / " + d.eur]
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
    var NF = { zl: '#,##0 "zł"', eur: '#,##0 "€"', int: "#,##0", n: "#,##0.00" };
    var HEAD = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A6B74" } };
    var SOFT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2F2" } };

    function title(ws, t, sub) {
      ws.addRow([t]).font = { bold: true, size: 14 };
      if (sub) ws.addRow([sub]).font = { color: { argb: "FF6A7780" } };
      ws.addRow([]);
    }
    function table(ws, head, rows) {
      var h = ws.addRow(head);
      h.eachCell(function (c) { c.fill = HEAD; c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.alignment = { horizontal: "center", wrapText: true }; });
      h.getCell(1).alignment = { horizontal: "left" };
      rows.forEach(function (row) {
        var x = ws.addRow([row.label].concat(row.vals));
        row.vals.forEach(function (v, i) { x.getCell(i + 2).numFmt = NF[row.fmt] || "General"; });
        if (row.bold) { x.font = { bold: true }; x.eachCell(function (c) { c.fill = SOFT; }); }
      });
      ws.addRow([]);
    }
    function pairs(ws, list) {
      list.forEach(function (p) { var x = ws.addRow(p); x.getCell(1).font = { color: { argb: "FF6A7780" } }; x.getCell(2).alignment = { wrapText: true }; });
      ws.addRow([]);
    }

    var s1 = wb.addWorksheet("Podsumowanie", { views: [{ showGridLines: false }] });
    s1.columns = [{ width: 38 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];
    title(s1, "Kalkulator NK38: " + (d.nazwa || "wycena"), "Wygenerowano " + new Date().toLocaleString("pl-PL"));
    s1.addRow(["Dane wejściowe"]).font = { bold: true, size: 12 };
    pairs(s1, R.dane);
    s1.addRow(["Warianty"]).font = { bold: true, size: 12 };
    table(s1, R.wynik.head, R.wynik.rows);
    s1.addRow(["Opcje do oferty (cena z narzutami)"]).font = { bold: true, size: 12 };
    table(s1, R.opcje.head, R.opcje.rows);

    var s2 = wb.addWorksheet("Ekipa", { views: [{ showGridLines: false }] });
    s2.columns = [{ width: 34 }].concat(r.analiza.map(function () { return { width: 16 }; }));
    title(s2, "Analiza liczby osób", "Wariant: " + r.analizaWariant + ". Wpisana liczba osób: " + r.warianty[0].osoby + ".");
    table(s2, R.ekipa.head, R.ekipa.rows);

    var s3 = wb.addWorksheet("Obliczenia", { views: [{ showGridLines: false }] });
    s3.columns = [{ width: 40 }, { width: 24 }, { width: 20 }, { width: 20 }, { width: 20 }];
    title(s3, "Obliczenia krok po kroku");
    s3.addRow(["Materiały i urządzenia"]).font = { bold: true, size: 12 };
    pairs(s3, R.mat);
    s3.addRow(["Montaż i cena"]).font = { bold: true, size: 12 };
    table(s3, R.mon.head, R.mon.rows);

    var s4 = wb.addWorksheet("Do oferty", { views: [{ showGridLines: false }] });
    s4.columns = [{ width: 110 }];
    ctx.zestawienie.split("\n").forEach(function (l) { s4.addRow([l]).font = { name: "Consolas", size: 10 }; });
    s4.addRow([]);
    s4.addRow(["Uwagi do sprawdzenia"]).font = { bold: true };
    ctx.uwagi.forEach(function (u) { s4.addRow(["• " + u]).alignment = { wrapText: true }; });

    var s5 = wb.addWorksheet("Cennik", { views: [{ showGridLines: false }] });
    s5.columns = [{ width: 44 }, { width: 16 }, { width: 10 }];
    title(s5, "Cennik użyty w wycenie");
    ctx.cennikPola.forEach(function (p) {
      if (!p[1]) { s5.addRow([p[0]]).font = { bold: true }; return; }
      var x = s5.addRow([p[1], r.cennik[p[0]], p[2]]);
      if (ctx.cennikZmiany[p[0]] !== undefined) x.getCell(1).font = { bold: true, color: { argb: "FF8A5300" } };
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
      nr: "", miejsce: "Kraków", adresat: "", zwrot: "Szanowna Pani,", powod: "zapytanie", garaz: "",
      h: "", l: "", p: "", hg: "", hd: "", agregat: "Agregat hydrauliczny 400V, 50Hz, 6kW", kw: "6kW",
      opcje: { q2500: true, slupki37: false, slupki22: false, malowanie: false },
      zysk: "A", ceny: {}, platnosci: "30% zaliczka na 22 tygodnie przed dostawą,\ndo 60% płatność na 5 dni przed dostawą,\ndo 90% płatność do 21 dni po dostawie,\ndo 100% płatność do 21 dni po pierwszym badaniu UDT.\nOferta ważna jest 2 miesiące.",
      dostawa: 24, montaz: "", tir: 20, gw: "36/60", tekst: {}
    };
  }

  /* Rozbija opis "H-195/202 | L-530-544-584 | P-380 | Hpoj. G-180. D-180" na pola oferty. */
  function zOpisu(opis) {
    var o = {}, s = String(opis || "");
    var m;
    if ((m = s.match(/\bH-\s*([\d\/(),.]+)/))) o.h = m[1].replace(/[.,]$/, "");
    if ((m = s.match(/\bL-\s*([\d\-\/(),.]+)/))) o.l = m[1].replace(/[.,]$/, "");
    if ((m = s.match(/\bP-\s*([\d\/(),.?]+)/))) o.p = m[1].replace(/[.,]$/, "");
    if ((m = s.match(/G-\s*([\d\/()]+)/))) o.hg = m[1];
    if ((m = s.match(/D-\s*([\d\/()]+)/))) o.hd = m[1];
    return o;
  }

  function sub(t, v) { return String(t).replace(/\{(\w+)\}/g, function (a, k) { return v[k] !== undefined ? v[k] : a; }); }

  /* Treść oferty jako struktura (podgląd HTML i plik Word używają tego samego). */
  function oferta(r, o, sz) {
    var d = r.dane, m = r.mat, ws = r.warianty, B = o.zysk === "B";
    var c = function (x) { return B ? x.cena2 : x.cena; };
    var opisy = zOpisu(d.opis), pole = function (k) { return o[k] || opisy[k] || "…"; };
    var t = ws[0].tygodnieZakres, typ = d.typ;
    var vars = { tir: o.tir, kw: o.kw, gw: o.gw, typ: typ };
    var data = d.data ? d.data.split("-").reverse().join(".") : new Date().toLocaleDateString("pl-PL");
    var auto = {
      wstep: "w związku z " + (o.powod === "rabat" ? "Państwa prośbą o rabat przedstawiamy naszą zrabatowaną ofertę" : "otrzymanym zapytaniem przedstawiamy naszą ofertę") +
        " na dostawę i montaż " + m.platformy + " platform służących do niezależnego parkowania " + m.MP + " pojazdów w garażu " +
        (o.garaz || ("inwestycji " + (d.nazwa || "…"))) + ".",
      tech: "Zagłębienie: wysokość " + pole("h") + "cm; długość " + pole("l") + "cm;\nPrześwit między-kondygnacyjny: min. " + pole("p") +
        "cm;\nWysokość parkowanych pojazdów*: ▲-" + pole("hg") + "cm, ▼-" + pole("hd") + "cm;",
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
    var opcje = [], ceny = [{ klucz: "poz10", label: "Pozycja 10:", auto: ceil100(c(ws[0])) }];
    opcjeDef.forEach(function (x) {
      if (!o.opcje[x[0]]) return;
      var nr = "Opcja " + (opcje.length + 1) * 10 + ":";
      opcje.push({ label: nr, tekst: x[1] });
      ceny.push({ klucz: x[0], label: nr, auto: ceil100(x[2]) });
    });
    ceny.forEach(function (p) { p.kwota = o.ceny[p.klucz] != null && o.ceny[p.klucz] !== "" ? Number(o.ceny[p.klucz]) : p.auto; });
    return {
      naglowek: sz.naglowek.split("\n"), stopka: sz.stopka.split("\n"),
      miejsceData: (o.miejsce || "Kraków") + ", dnia " + data + "r.",
      adresat: (o.adresat || "").split("\n"), nr: "Oferta nr " + (o.nr || "…"), zwrot: o.zwrot,
      wstep: txt("wstep"), pozycja: "Urządzenia " + typ + " do niezależnego parkowania pojazdów (z zagłębieniem)",
      tech: txt("tech").split("\n"), uwagaTech: sz.uwaga_tech.split("\n"), wyposazenie: txt("wyposazenie").split("\n"),
      lista: txt("lista").split("\n").filter(Boolean), opcje: opcje, ceny: ceny,
      platnosci: o.platnosci.split("\n"), dostawa: txt("dostawa"), montaz: txt("montaz"),
      zakres: sz.zakres.split("\n"), warunki: sub(sz.warunki, vars).split("\n"), gwarancja: sub(sz.gwarancja, vars).split("\n"),
      zakonczenie: sz.zakonczenie.split("\n"), podpis: sz.podpis.split("\n"), klauzula: sz.klauzula,
      auto: auto, kwota: kwotaOferta
    };
  }

  function docxOferta(r, o, sz, logo) {
    var D = L.docx, F = oferta(r, o, sz);
    var BLUE = "1F4E9A", RIGHT = 9638;
    function run(text, opt) { return new D.TextRun(Object.assign({ text: text }, opt || {})); }
    function para(children, opt) { return new D.Paragraph(Object.assign({ children: Array.isArray(children) ? children : [run(children)], spacing: { after: 0, line: 252 } }, opt || {})); }
    function lines(arr, opt) { return arr.map(function (l) { return para(l, opt); }); }
    function indent(arr, opt) { return lines(arr, Object.assign({ indent: { left: 284 }, alignment: D.AlignmentType.JUSTIFIED }, opt || {})); }
    function heading(t) { return para([run(t, { bold: true })], { spacing: { before: 160, after: 40 } }); }
    var NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    var noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
    var logoCell = logo ? [new D.Paragraph({ children: [new D.ImageRun({ data: logo.data, transformation: { width: logo.w, height: logo.h } })] })] : [para("")];
    var header = new D.Header({ children: [
      new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders, rows: [new D.TableRow({ children: [
        new D.TableCell({ width: { size: 40, type: D.WidthType.PERCENTAGE }, borders: noBorders, children: logoCell }),
        new D.TableCell({ width: { size: 60, type: D.WidthType.PERCENTAGE }, borders: noBorders,
          children: F.naglowek.map(function (l, i) { return para([run(l, { bold: i < 2, size: i < 2 ? 18 : 16 })], { alignment: D.AlignmentType.CENTER }); }) })
      ] })] }),
      para([run("", {}), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16 })], { alignment: D.AlignmentType.RIGHT })
    ] });
    var footer = new D.Footer({ children: F.stopka.map(function (l) { return para([run(l, { size: 16, color: "555555" })], { alignment: D.AlignmentType.CENTER }); }) });
    var kids = [];
    kids.push(para(F.miejsceData));
    kids.push(para(""));
    F.adresat.forEach(function (l, i) { kids.push(para([run(l, { bold: i === 1 })])); });
    kids.push(para(""));
    kids.push(para([run(F.nr, { bold: true, italics: true, underline: {} })], { spacing: { before: 120, after: 120 } }));
    kids.push(para(F.zwrot));
    kids.push(para(F.wstep, { alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 120 } }));
    kids.push(heading("1. Specyfikacja oferty:"));
    kids.push(para([run("Pozycja 10: ", { bold: true, color: BLUE }), run(F.pozycja)], { indent: { left: 284 } }));
    kids.push(para([run("Dane techniczne:", { underline: {} })], { indent: { left: 284 } }));
    kids = kids.concat(indent(F.tech), indent(F.uwagaTech));
    kids = kids.concat(indent(F.wyposazenie));
    F.lista.forEach(function (l) { kids.push(new D.Paragraph({ children: [run(l)], bullet: { level: 0 }, spacing: { after: 0 } })); });
    F.opcje.forEach(function (op) {
      kids.push(para([run(op.label, { bold: true, color: BLUE })], { indent: { left: 284 }, spacing: { before: 120 } }));
      kids.push(para(op.tekst, { indent: { left: 284 }, alignment: D.AlignmentType.JUSTIFIED }));
    });
    kids.push(new D.Paragraph({ children: [run("2. Wartość zamówienia netto.", { bold: true }), new D.TextRun({ children: [new D.Tab()] }),
      run(F.ceny[0].label + " ", { bold: true, color: BLUE }), run(F.kwota(F.ceny[0].kwota), { bold: true })],
      tabStops: [{ type: D.TabStopType.RIGHT, position: RIGHT }], spacing: { before: 160, after: 0 } }));
    var lewa = ["Warunki płatności:"].concat(F.platnosci), prawa = F.ceny.slice(1);
    for (var i = 0; i < Math.max(lewa.length, prawa.length); i++) {
      var ch = [run(lewa[i] || "")], pr = prawa[i];
      if (pr) ch.push(new D.TextRun({ children: [new D.Tab()] }), run(pr.label + " ", { bold: true, color: BLUE }), run(F.kwota(pr.kwota), { bold: true }));
      kids.push(new D.Paragraph({ children: ch, indent: { left: 284 }, tabStops: [{ type: D.TabStopType.RIGHT, position: RIGHT - 284 }], spacing: { after: 0 } }));
    }
    kids.push(heading("3. Dostawa i montaż."));
    kids = kids.concat(indent([F.dostawa, F.montaz]));
    kids.push(heading("4. Zakres oferty."));
    kids = kids.concat(indent(F.zakres, { spacing: { after: 80 } }));
    kids.push(heading("5. Warunki montażu."));
    kids = kids.concat(indent(F.warunki));
    kids.push(heading("6. Gwarancja."));
    kids = kids.concat(indent(F.gwarancja));
    kids.push(para(""));
    kids = kids.concat(indent(F.zakonczenie));
    kids.push(para("")); kids.push(para("")); kids.push(para(""));
    F.podpis.forEach(function (l) { kids.push(para(l, { indent: { left: 567 } })); });
    kids.push(para("")); kids.push(para(""));
    kids.push(para([run(F.klauzula, { size: 14, color: "555555" })], { alignment: D.AlignmentType.JUSTIFIED }));
    var doc = new D.Document({
      styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 425, footer: 425 } } },
        headers: { default: header }, footers: { default: footer }, children: kids }]
    });
    return typeof window === "undefined" ? D.Packer.toBuffer(doc) : D.Packer.toBlob(doc);
  }

  var api = {
    setLibs: function (x) { Object.assign(L, x); }, xlsx: xlsx, pdf: pdf, docx: docxOferta,
    oferta: oferta, domyslnaOferta: domyslnaOferta, SZABLON: SZABLON, zOpisu: zOpisu, ceil100: ceil100, raport: raport
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38X = api;
})(this);
