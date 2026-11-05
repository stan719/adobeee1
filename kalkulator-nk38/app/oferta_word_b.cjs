// Oferta w Wordzie, wersja B ("nowoczesna"): nagłówek z logo, pasek najważniejszych liczb, kafelki parametrów,
// cena w ramce, płatności jako etapy, dostawa i montaż obok siebie, dwukolumnowe zakres i gwarancja.
// Moduł: ofertaB(F, ctx) → obiekt docx.Document (F = X.oferta(...)); ctx: { D (biblioteka docx), logo: {data, w, h}, inwestycja, podpis: {data, w, h, type} }.
const TEAL = "0A6B74", TEAL_D = "07505A", INK = "13202A", MUT = "5F6D76", SOFT = "EAF4F5", PALE = "F4F8F8", LINE = "CFD7DB", HAIR = "E3E7EA", FONT = "Calibri";

function ofertaB(F, ctx) {
  const D = ctx.D, W = 10206;   // szerokość tekstu: A4 − marginesy 1,5 cm
  const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
  const ln = (c, sz) => ({ style: D.BorderStyle.SINGLE, size: sz || 6, color: c || LINE });
  const run = (t, o) => new D.TextRun(Object.assign({ text: t, font: FONT, size: 19, color: INK }, o || {}));
  const para = (ch, o) => new D.Paragraph(Object.assign({ children: Array.isArray(ch) ? ch : [run(ch)], spacing: { after: 70, line: 264 } }, o || {}));
  const txt = (t, o, po) => para([run(t, o)], Object.assign({ alignment: D.AlignmentType.JUSTIFIED }, po || {}));
  const gap = (after) => para([run("", { size: 4 })], { spacing: { before: 0, after: after || 0, line: 20 } });
  const cell = (w, ch, o) => new D.TableCell(Object.assign({ width: { size: w, type: D.WidthType.DXA }, borders: NOB, children: ch.length ? ch : [gap()] }, o || {}));
  const tbl = (cols, rows, o) => new D.Table(Object.assign({ width: { size: cols.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, columnWidths: cols, rows,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } }, o || {}));
  const row = (cells, o) => new D.TableRow(Object.assign({ cantSplit: true, children: cells }, o || {}));
  const odstep = (w) => cell(w, [gap()]);
  const shade = (c) => ({ type: D.ShadingType.CLEAR, fill: c, color: "auto" });
  const logoRun = (w) => new D.ImageRun({ type: "png", data: ctx.logo.data, transformation: { width: w, height: Math.round(w * ctx.logo.h / ctx.logo.w) } });
  /* kafelki / karty w jednym rzędzie z odstępami */
  const rzad = (n, g, fn) => { const k = Math.floor((W - g * (n - 1)) / n), cols = [], cells = []; for (let i = 0; i < n; i++) { if (i) { cols.push(g); cells.push(odstep(g)); } cols.push(k); cells.push(fn(i, k)); } return tbl(cols, [row(cells)]); };
  const czysc = (t) => String(t).replace(/(\d)cm/g, "$1 cm").replace(/(\d)kg/g, "$1 kg").replace(/[▲▼]-/g, (m) => m[0] + " ").replace(/[;,]\s*$/, "").replace(/\.\s*$/, "").trim();
  const pary = (lines) => lines.map((l) => { const i = l.indexOf(":"); return i > 0 && i < 48 ? [l.slice(0, i).replace(/\*$/, ""), czysc(l.slice(i + 1))] : ["", czysc(l)]; });

  const h3 = (n, t) => para([run(" " + n + " ", { bold: true, color: "FFFFFF", size: 17, shading: shade(TEAL) }), run("   " + t, { bold: true, color: TEAL, size: 24 })],
    { spacing: { before: 210, after: 100 }, keepNext: true, border: { bottom: ln(LINE, 6) } });
  const etyk = (t, o) => para([run(t.toUpperCase(), Object.assign({ size: 14, color: MUT }, o || {}))], { spacing: { after: 20 } });

  /* ---- paski: najważniejsze liczby ---- */
  const wyciagnij = (tekst, re, dom) => { const m = String(tekst).match(re); return m ? m[1] : dom; };
  const stat = (liczba, podpis) => (i, k) => cell(k, [para([run(liczba, { bold: true, size: 30, color: TEAL })], { spacing: { after: 0 } }), para([run(podpis, { size: 15, color: MUT })], { spacing: { after: 0 } })],
    { shading: shade(SOFT), margins: { top: 50, bottom: 60, left: 170, right: 100 }, borders: Object.assign({}, NOB, { top: ln(TEAL, 18) }) });
  const staty = [
    ctx.urz != null ? [String(ctx.urz), "urządzeń"] : null, ctx.mp != null ? [String(ctx.mp), "miejsc postojowych"] : null,
    [wyciagnij(F.dostawa, /po ok\.\s*(\d+)/, "–") + " tyg.", "od umowy do pierwszej dostawy"], [wyciagnij(F.montaz, /montażu (?:ok\.\s*)?([\d\-–]+)/, "–") + " tyg.", "czas montażu od dostawy"]
  ].filter(Boolean);

  /* ---- specyfikacja ---- */
  const kafle = (lista) => {
    const g = 110, kk = Math.floor((W - g * 3) / 4), cols = [kk, g, kk, g, kk, g, kk], rows = [];
    for (let st = 0; st < lista.length; st += 4) {
      const grupa = lista.slice(st, st + 4), cells = [];
      for (let i = 0; i < 4; i++) { if (i) cells.push(odstep(g)); const x = grupa[i];
        cells.push(x ? cell(kk, [etyk(x[0]), para([run(x[1], { bold: true, size: 24 })], { spacing: { after: 0 } })], { borders: { top: ln(LINE), bottom: ln(LINE), left: ln(TEAL, 18), right: ln(LINE) }, margins: { top: 55, bottom: 55, left: 140, right: 80 } }) : cell(kk, [gap()])); }
      rows.push(row(cells));
      if (st + 4 < lista.length) rows.push(row([cell(kk, [gap(60)]), odstep(g), cell(kk, [gap()]), odstep(g), cell(kk, [gap()]), odstep(g), cell(kk, [gap()])]));
    }
    return tbl(cols, rows);
  };
  const kv = (lista, szer) => tbl([szer || 2900, W - (szer || 2900)], lista.map((x) => row([
    cell(szer || 2900, [para([run(x[0], { color: MUT, size: 17 })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln(HAIR, 4) }), margins: { top: 40, bottom: 40 } }),
    cell(W - (szer || 2900), [para([run(x[1], { size: 18 })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln(HAIR, 4) }), margins: { top: 40, bottom: 40 } })])));
  const uwaga = (liniee) => tbl([W], [row([cell(W, liniee.map((l) => txt(l, { size: 15, color: MUT, italics: true }, { spacing: { after: 30, line: 250 } })), { shading: shade(PALE), borders: Object.assign({}, NOB, { left: ln(TEAL, 24) }), margins: { top: 70, bottom: 50, left: 160, right: 120 } })])]);
  const urzadzenia = (listaL) => tbl([1250, W - 1250], listaL.map((l) => { const m = l.match(/^(\d+ szt\.)\s*[–-]\s*(.*)$/);
    return row([cell(1250, [para([run(m ? m[1] : "", { bold: true, color: TEAL })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln(HAIR, 4) }), margins: { top: 60, bottom: 60, left: 60 } }),
      cell(W - 1250, [para([run((m ? m[2] : l).replace(/[,;]\s*$/, ""))], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln(HAIR, 4) }), margins: { top: 60, bottom: 60 } })]); }));
  const tytulPozycji = (label, opis) => para([run("\u00A0" + label.replace(":", "") + "\u00A0", { bold: true, color: "FFFFFF", size: 17, shading: shade(TEAL_D) }), run("  " + opis, { bold: true, size: 21 })], { spacing: { before: 60, after: 100 }, keepNext: true });
  /* dane techniczne jako kafelki: NK38 z wymiarów, pozostałe z linii "Etykieta: wartość" */
  const w = F.wymiary;
  const techKafle = (tech, wym, nk38) => {
    if (nk38 && wym && wym.h1 != null) return [["Zagłębienie", (wym.h2 != null && wym.h2 !== wym.h1 ? "H1 " + wym.h1 + " / H2 " + wym.h2 : wym.h1) + " cm"], ["Długość", wym.dl + " cm"], ["Prześwit", "min. " + wym.p + " cm"], ["Wysokość pojazdów", "▲ " + wym.gor + " · ▼ " + wym.dol + " cm"]];
    return pary(tech).map((x) => [x[0].replace(/^Wysokość prześwitu$/, "Prześwit").replace(/^Wysokość parkowanych pojazdów$/, "Wysokość pojazdów").replace(/^Długość parkowanych pojazdów$/, "Długość pojazdów").replace(/^Prześwit między-kondygnacyjny$/, "Prześwit"),
      x[1].replace(/^min\.\s*/, "min. ").replace(/ cm, ([▲▼])/, " · $1").replace(/^([▲▼] \d+) cm · ([▲▼] \d+) cm$/, "$1 · $2 cm")]);
  };
  const zakaz = F.dalsze || [];
  const pozycja = (label, opis, tech, uwagiT, wyp, listaL, poL, wym, nk38) => {
    const out = [tytulPozycji(label, opis)];
    const kk = techKafle(tech, wym, nk38).filter((x) => x[1]);
    if (kk.length) out.push(kafle(kk));
    if (uwagiT.length) out.push(uwaga(uwagiT));
    out.push(gap(50));
    const pw = pary(wyp);
    if (pw.length) out.push(kv(pw));
    out.push(gap(60), urzadzenia(listaL));
    poL.forEach((l) => out.push(txt(l, { size: 17 }, { spacing: { before: 60 } })));
    return out;
  };
  const jestNK38 = F.wymiary && F.wymiary.h1 != null;

  /* ---- ceny ---- */
  const kwota = (c) => F.kwota(c.kwota);
  const glowne = F.ceny.filter((c) => !/^Opcja/.test(c.label)), opcjeC = F.ceny.filter((c) => /^Opcja/.test(c.label));
  const cenaTab = () => tbl([W - 3700, 3700], glowne.map((c, i) => row([
    cell(W - 3700, [para([run(c.label.replace(":", ""), { bold: true, size: 22 })], { spacing: { after: 0 } }), para([run(i === 0 ? "cena netto" : "", { size: 15, color: MUT })], { spacing: { after: 0 } })], { borders: { top: ln(TEAL, 14), bottom: ln(TEAL, 14), left: ln(TEAL, 14), right: NONE }, margins: { top: 90, bottom: 90, left: 240 }, verticalAlign: D.VerticalAlign.CENTER, shading: shade(PALE) }),
    cell(3700, [para([run(kwota(c), { bold: true, size: 36, color: TEAL })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: { top: ln(TEAL, 14), bottom: ln(TEAL, 14), right: ln(TEAL, 14), left: NONE }, margins: { top: 70, bottom: 70, right: 240 }, verticalAlign: D.VerticalAlign.CENTER, shading: shade(PALE) })])));
  const opcjeTab = () => tbl([1100, W - 1100 - 2500, 2500], opcjeC.map((c, i) => { const op = F.opcje[i], opis = op ? op.tekst : "", b = Object.assign({}, NOB, { bottom: ln(HAIR, 4) });
    return row([cell(1100, [para([run(c.label.replace(":", ""), { bold: true, color: TEAL })], { spacing: { after: 0 } })], { borders: b, margins: { top: 65, bottom: 65, left: 60 } }),
      cell(W - 1100 - 2500, [para([run(opis, { size: 17 })], { spacing: { after: 0, line: 250 } })], { borders: b, margins: { top: 65, bottom: 65, right: 160 } }),
      cell(2500, [para([run("+ " + kwota(c), { bold: true, size: 21 })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: b, margins: { top: 65, bottom: 65, right: 60 }, verticalAlign: D.VerticalAlign.CENTER })]); }));
  const etapy = F.platnosci.filter((l) => /^(do )?\d+%/i.test(l)), uwagiPl = F.platnosci.filter((l) => etapy.indexOf(l) < 0);
  const etapyTab = () => rzad(etapy.length, 110, (i, k) => { const m = etapy[i].match(/^(do )?(\d+%)\s*(.*?)[,.]?$/i);
    return cell(k, [para([run(m ? (m[1] || "").toLowerCase() : "", { size: 16, color: MUT })], { spacing: { after: 0 } }), para([run(m ? m[2] : "", { bold: true, size: 28, color: TEAL })], { spacing: { after: 10 } }), para([run(m ? m[3] : etapy[i], { size: 16 })], { spacing: { after: 0, line: 245 } })],
      { shading: shade(SOFT), borders: Object.assign({}, NOB, { top: ln(TEAL, 18) }), margins: { top: 50, bottom: 70, left: 140, right: 100 } }); });

  /* ---- układ dokumentu ---- */
  const k = [];
  k.push(new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: W }], spacing: { before: 40, after: ctx.inwestycja ? 0 : 90 }, children: [run(F.nr, { bold: true, size: 42, color: TEAL }), new D.TextRun({ children: [new D.Tab()] }), run(F.miejsceData, { size: 18, color: MUT })] }));
  if (ctx.inwestycja) k.push(para([run("Inwestycja: ", { size: 19, color: MUT }), run(ctx.inwestycja, { size: 19, bold: true })], { spacing: { after: 110 } }));
  const i0 = F.adresat.indexOf(""), osoba = i0 < 0 ? F.adresat : F.adresat.slice(0, i0), firma = i0 < 0 ? [] : F.adresat.slice(i0 + 1);
  const blokAdr = (et, linie, grube) => cell(W / 2, [etyk(et)].concat(linie.map((l, i) => para([run(l, { bold: grube === i, size: 19 })], { spacing: { after: 10 } }))), { borders: Object.assign({}, NOB, { left: ln(TEAL, 24) }), margins: { left: 160, top: 20, bottom: 20 } });
  k.push(tbl([W / 2, W / 2], [row([blokAdr("Adresat", osoba, 1), blokAdr("Firma", firma, 0)])]));
  k.push(gap(110));
  if (staty.length) k.push(rzad(staty.length, 110, (i, kk) => stat(staty[i][0], staty[i][1])(i, kk)), gap(100));
  k.push(para(F.zwrot, { spacing: { before: 60 } }), txt(F.wstep));
  k.push(h3(1, "Specyfikacja oferty"));
  k.push(...pozycja("Pozycja 1", F.pozycja, F.tech, F.uwagaTech, F.wyposazenie, F.lista, F.poLiscie, w, jestNK38));
  zakaz.forEach((x) => { k.push(gap(90)); k.push(...pozycja(x.label, x.pozycja, x.tech, x.uwagaTech, x.wyposazenie, x.lista, x.poLiscie, null, false)); });
  k.push(h3(2, "Wartość zamówienia netto"), cenaTab());
  if (opcjeC.length) k.push(gap(90), etyk("Opcje dodatkowe (dopłata do ceny podstawowej)"), opcjeTab());
  if (etapy.length) k.push(gap(80), new D.Paragraph({ keepNext: true, spacing: { after: 20 }, children: [run("WARUNKI PŁATNOŚCI", { size: 14, color: MUT })] }), etapyTab());
  uwagiPl.forEach((l) => k.push(txt(l, { size: 16, color: MUT }, { spacing: { before: 70, after: 0 } })));
  k.push(h3(3, "Dostawa i montaż"));
  const karta = (et, t) => (i, kk) => cell(kk, [etyk(et, { color: TEAL, bold: true }), txt(t)], { borders: Object.assign({}, NOB, { top: ln(LINE) }), margins: { top: 60 } });
  k.push(rzad(2, 400, (i, kk) => (i ? karta("Montaż", F.montaz) : karta("Dostawa", F.dostawa))(i, kk)));
  k.push(h3(4, "Zakres oferty"));
  F.zakres.forEach((l) => { const m = l.match(/^(Poza ofertą pozostają:)(.*)$/); k.push(m ? para([run(m[1], { bold: true, size: 17 }), run(m[2], { size: 17 })], { alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 70 } }) : txt(l, { size: 17 })); });
  k.push(h3(5, "Warunki montażu"));
  F.warunki.forEach((l) => { const m = l.match(/^(\d+)\.\s*(.*)$/); k.push(m ? new D.Paragraph({ indent: { left: 400, hanging: 300 }, spacing: { after: 30, line: 252 }, children: [run(m[1] + ".  ", { bold: true, color: TEAL, size: 17 }), run(m[2], { size: 17 })] }) : txt(l, { size: 17 })); });
  k.push(h3(6, "Gwarancja"));
  F.gwarancja.forEach((l, i, a) => k.push(txt(l, { size: 17 }, { keepNext: i === a.length - 1, keepLines: true })));
  k.push(new D.Paragraph({ keepNext: true, spacing: { before: 0, after: 120, line: 20 }, children: [run("", { size: 4 })] }));
  F.zakonczenie.forEach((l) => k.push(txt(l, { size: 19 }, { keepNext: true, keepLines: true })));
  if (ctx.podpis) k.push(new D.Paragraph({ keepNext: true, spacing: { before: 60, after: 0 }, children: [new D.ImageRun({ type: ctx.podpis.type || "png", data: ctx.podpis.data, transformation: { width: ctx.podpis.w, height: ctx.podpis.h } })] }));
  else k.push(new D.Paragraph({ keepNext: true, spacing: { before: 0, after: 420, line: 20 }, children: [run("", { size: 4 })] }));
  k.push(new D.Paragraph({ keepNext: true, border: { top: ln(INK, 6) }, indent: { right: W - 3300 }, spacing: { after: 0 }, children: [run(F.podpis[0], { bold: true })] }), para(F.podpis.slice(1).join(" "), { keepNext: true, spacing: { after: 100 } }));
  k.push(txt(F.klauzula, { size: 13, color: MUT }, { spacing: { before: 60 } }));

  /* ---- nagłówki i stopka ---- */
  const kto = [[F.stopka[0], true], [F.stopka[1], false], [F.stopka[2], false]];
  const naglowekPierwszy = new D.Header({ children: [tbl([3300, W - 3300], [row([
    cell(3300, [new D.Paragraph({ children: [logoRun(160)] })], { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 18) }), margins: { bottom: 110 } }),
    cell(W - 3300, kto.map(([t, b]) => para([run(t, { size: b ? 17 : 15, bold: b, color: b ? INK : MUT })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })), { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 18) }), verticalAlign: D.VerticalAlign.CENTER, margins: { bottom: 110 } })])])] });
  const naglowekDalsze = new D.Header({ children: [tbl([3300, W - 3300], [row([
    cell(3300, [new D.Paragraph({ children: [logoRun(105)] })], { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 12) }), margins: { bottom: 70 } }),
    cell(W - 3300, [para([run(F.nr + (ctx.inwestycja ? "  ·  " + ctx.inwestycja : ""), { size: 15, color: MUT })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 12) }), verticalAlign: D.VerticalAlign.CENTER, margins: { bottom: 70 } })])])] });
  const stopka = new D.Footer({ children: [new D.Paragraph({ style: "Stopka", border: { top: ln(TEAL, 12) }, tabStops: [{ type: D.TabStopType.CENTER, position: W / 2 }, { type: D.TabStopType.RIGHT, position: W }], spacing: { before: 50 },
    children: [run(F.stopka[0], { size: 14, color: MUT }), new D.TextRun({ children: [new D.Tab()] }), run(F.stopka[2], { size: 14, color: MUT }), new D.TextRun({ children: [new D.Tab()] }),
      new D.TextRun({ children: ["Strona ", D.PageNumber.CURRENT, " z ", D.PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: MUT })] })] });
  return new D.Document({ creator: "PSP NowinaKonopka Technologies", title: F.nr, styles: { default: { document: { run: { font: FONT, size: 19, language: { value: "pl-PL" } } } }, paragraphStyles: [{ id: "Stopka", name: "Stopka", run: { font: FONT, size: 14, color: MUT } }] },
    sections: [{ properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1380, bottom: 900, left: 850, right: 850, header: 400, footer: 330 } } },
      headers: { first: naglowekPierwszy, default: naglowekDalsze }, footers: { first: stopka, default: stopka }, children: k }] });
}
module.exports = { ofertaB };
