// Oferta w Wordzie, wersja B ("spokojna"): nagłówek z logo, prosta tabela parametrów, wartość zamówienia w jednej tabeli,
// płatności w czterech kolumnach, reszta jako zwykły tekst z numerowanymi sekcjami.
// Konstrukcja pod Worda: wszystkie tabele mają stały układ (layout fixed), jawne szerokości kolumn i komórek, bez kolumn-odstępów,
// bez tabel zagnieżdżonych i bez cieniowania pojedynczych runów; najmniejsze pismo 8,5 pkt, brak białego tekstu na kolorze.
// Moduł: ofertaB(F, ctx) → docx.Document (F = X.oferta(...)); ctx: { D (biblioteka docx), logo: {data, w, h}, inwestycja, podpis: {data, w, h, type} }.
const TEAL = "075058", INK = "13202A", LAB = "3F4C55", LINE = "9FB2B8", HEAD = "E4F0F2", FONT = "Calibri";

function ofertaB(F, ctx) {
  const D = ctx.D, W = 10106;   // szerokość tekstu: A4 − marginesy po 1,6 cm
  const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }, NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
  const ln = (c, sz) => ({ style: D.BorderStyle.SINGLE, size: sz || 6, color: c || LINE });
  const SIATKA = { top: ln(), bottom: ln(), left: ln(), right: ln() };
  const run = (t, o) => new D.TextRun(Object.assign({ text: t, font: FONT, size: 19, color: INK }, o || {}));
  const para = (ch, o) => new D.Paragraph(Object.assign({ children: Array.isArray(ch) ? ch : [run(ch)], spacing: { after: 70, line: 264 } }, o || {}));
  const txt = (t, o, po) => para([run(t, o)], Object.assign({ alignment: D.AlignmentType.JUSTIFIED }, po || {}));
  const cell = (w, ch, o) => new D.TableCell(Object.assign({ width: { size: w, type: D.WidthType.DXA }, borders: NOB, children: ch, margins: { top: 50, bottom: 50, left: 100, right: 100 } }, o || {}));
  /* tabela o stałym układzie; kolumny podane jawnie, szerokość tabeli = suma kolumn */
  const tbl = (cols, rows) => new D.Table({ width: { size: cols.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, columnWidths: cols, layout: D.TableLayoutType.FIXED, rows,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } });
  const row = (cells) => new D.TableRow({ cantSplit: true, children: cells });
  const rowsCols = (n) => { const k = Math.floor(W / n), c = Array(n).fill(k); c[n - 1] += W - k * n; return c; };
  const cienie = (c) => ({ type: D.ShadingType.CLEAR, fill: c, color: "auto" });
  const logoRun = (w) => new D.ImageRun({ type: "png", data: ctx.logo.data, transformation: { width: w, height: Math.round(w * ctx.logo.h / ctx.logo.w) } });
  const etyk = (t) => para([run(t.toUpperCase(), { size: 17, bold: true, color: LAB })], { spacing: { after: 30 } });
  const h2 = (n, t) => para([run(n + ".  " + t, { bold: true, size: 25, color: TEAL })], { spacing: { before: 220, after: 100 }, keepNext: true, border: { bottom: ln(LINE, 8) } });
  const czysc = (t) => String(t).replace(/(\d)cm/g, "$1 cm").replace(/(\d)kg/g, "$1 kg").replace(/[▲▼]-/g, (m) => m[0] + " ").replace(/[;,]\s*$/, "").replace(/\.\s*$/, "").trim();
  const pary = (lines) => lines.map((l) => { const i = l.indexOf(":"); return i > 0 && i < 48 ? [l.slice(0, i).replace(/\*$/, ""), czysc(l.slice(i + 1))] : ["", czysc(l)]; });

  /* ---- specyfikacja ---- */
  const parametry = (lista) => {   // jeden wiersz nagłówków i jeden wartości, do 4 kolumn w rzędzie
    const out = [];
    for (let st = 0; st < lista.length; st += 4) {
      const g = lista.slice(st, st + 4), cols = rowsCols(4);
      out.push(tbl(cols, [
        row(cols.map((w, i) => cell(w, [para([run(g[i] ? g[i][0].toUpperCase() : "", { size: 17, bold: true, color: LAB })], { spacing: { after: 0 } })], { borders: SIATKA, shading: cienie(HEAD) }))),
        row(cols.map((w, i) => cell(w, [para([run(g[i] ? g[i][1] : "", { bold: true, size: 23 })], { spacing: { after: 0 } })], { borders: SIATKA, margins: { top: 70, bottom: 70, left: 100, right: 100 } })))]));
      out.push(para([run("", { size: 8 })], { spacing: { after: 40 } }));
    }
    return out;
  };
  const kv = (lista) => { const c = [2700, W - 2700]; return tbl(c, lista.map((x) => row([
    cell(c[0], [para([run(x[0], { size: 17, color: LAB })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln("D5DDE1", 4) }), margins: { top: 50, bottom: 50, left: 0, right: 100 } }),
    cell(c[1], [para([run(x[1], { size: 18 })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: ln("D5DDE1", 4) }) })]))); };
  const urzadzenia = (listaL) => { const c = [1200, W - 1200]; return tbl(c, listaL.map((l) => { const m = l.match(/^(\d+ szt\.)\s*[–-]\s*(.*)$/), b = Object.assign({}, NOB, { bottom: ln("D5DDE1", 4) });
    return row([cell(c[0], [para([run(m ? m[1] : "", { bold: true, color: TEAL })], { spacing: { after: 0 } })], { borders: b, margins: { top: 50, bottom: 50, left: 0, right: 100 } }),
      cell(c[1], [para([run((m ? m[2] : l).replace(/[,;]\s*$/, ""))], { spacing: { after: 0 } })], { borders: b })]); })); };
  const tytulPozycji = (label, opis) => para([run(label.replace(":", "") + "  ·  ", { bold: true, size: 21, color: TEAL }), run(opis, { bold: true, size: 21 })], { spacing: { before: 40, after: 90 }, keepNext: true });
  const techParametry = (tech, wym, nk38) => {
    if (nk38 && wym && wym.h1 != null) return [["Zagłębienie", (wym.h2 != null && wym.h2 !== wym.h1 ? "H1 " + wym.h1 + " / H2 " + wym.h2 : wym.h1) + " cm"], ["Długość", wym.dl + " cm"], ["Prześwit", "min. " + wym.p + " cm"], ["Wysokość pojazdów", "▲ " + wym.gor + " · ▼ " + wym.dol + " cm"]];
    return pary(tech).map((x) => [x[0].replace(/^Wysokość prześwitu$/, "Prześwit").replace(/^Wysokość parkowanych pojazdów$/, "Wysokość pojazdów").replace(/^Długość parkowanych pojazdów$/, "Długość pojazdów").replace(/^Prześwit między-kondygnacyjny$/, "Prześwit"),
      x[1].replace(/ cm, ([▲▼])/, " · $1").replace(/^([▲▼] \d+) cm · ([▲▼] \d+) cm$/, "$1 · $2 cm")]);
  };
  const pozycja = (label, opis, tech, uwagiT, wyp, listaL, poL, wym, nk38) => {
    const out = [tytulPozycji(label, opis)];
    const kk = techParametry(tech, wym, nk38).filter((x) => x[1]);
    if (kk.length) out.push(...parametry(kk));
    uwagiT.forEach((l) => out.push(txt(l, { size: 17, italics: true, color: LAB }, { spacing: { after: 40, line: 250 } })));
    out.push(para([run("", { size: 6 })], { spacing: { after: 30 } }));
    const pw = pary(wyp);
    if (pw.length) out.push(kv(pw), para([run("", { size: 6 })], { spacing: { after: 40 } }));
    out.push(urzadzenia(listaL));
    poL.forEach((l) => out.push(txt(l, { size: 18 }, { spacing: { before: 60 } })));
    return out;
  };

  /* ---- ceny i płatności ---- */
  const kwota = (c) => F.kwota(c.kwota);
  const glowne = F.ceny.filter((c) => !/^Opcja/.test(c.label)), opcjeC = F.ceny.filter((c) => /^Opcja/.test(c.label));
  const ceny = () => { const c = [W - 3300, 3300], rows = [];
    glowne.forEach((x) => rows.push(row([
      cell(c[0], [para([run(x.label.replace(":", ""), { bold: true, size: 22 }), run("   cena netto", { size: 17, color: LAB })], { spacing: { after: 0 } })], { borders: SIATKA, shading: cienie(HEAD), margins: { top: 90, bottom: 90, left: 140, right: 100 }, verticalAlign: D.VerticalAlign.CENTER }),
      cell(c[1], [para([run(kwota(x), { bold: true, size: 30, color: TEAL })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: SIATKA, shading: cienie(HEAD), margins: { top: 90, bottom: 90, left: 100, right: 140 }, verticalAlign: D.VerticalAlign.CENTER })])));
    opcjeC.forEach((x, i) => { const op = F.opcje[i];
      rows.push(row([
        cell(c[0], [para([run(x.label.replace(":", "") + "   ", { bold: true, color: TEAL }), run(op ? op.tekst : "", { size: 18 })], { spacing: { after: 0, line: 250 } })], { borders: SIATKA, margins: { top: 70, bottom: 70, left: 140, right: 100 } }),
        cell(c[1], [para([run("+ " + kwota(x), { bold: true, size: 22, color: TEAL })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: SIATKA, margins: { top: 70, bottom: 70, left: 100, right: 140 }, verticalAlign: D.VerticalAlign.CENTER })])); });
    return tbl(c, rows); };
  const etapy = F.platnosci.filter((l) => /^(do )?\d+%/i.test(l)), uwagiPl = F.platnosci.filter((l) => etapy.indexOf(l) < 0);
  const platnosci = () => { const c = rowsCols(etapy.length);
    return tbl(c, [row(etapy.map((e, i) => { const m = e.match(/^(do )?(\d+%)\s*(.*?)[,.]?$/i);
      return cell(c[i], [para([run(m ? ((m[1] || "").toLowerCase() + m[2]) : "", { bold: true, size: 28, color: TEAL })], { spacing: { after: 10 } }), para([run(m ? m[3] : e, { size: 18 })], { spacing: { after: 0, line: 250 } })], { borders: SIATKA, margins: { top: 70, bottom: 80, left: 110, right: 90 } }); }))]); };

  /* ---- treść ---- */
  const k = [];
  k.push(new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: W }], spacing: { before: 40, after: ctx.inwestycja ? 20 : 120 }, children: [run(F.nr, { bold: true, size: 40, color: TEAL }), new D.TextRun({ children: [new D.Tab()] }), run(F.miejsceData, { size: 19, color: LAB })] }));
  if (ctx.inwestycja) k.push(para([run("Inwestycja: ", { color: LAB }), run(ctx.inwestycja, { bold: true })], { spacing: { after: 130 } }));
  const i0 = F.adresat.indexOf(""), osoba = i0 < 0 ? F.adresat : F.adresat.slice(0, i0), firma = i0 < 0 ? [] : F.adresat.slice(i0 + 1);
  const blok = (et, linie, grube) => cell(W / 2, [etyk(et)].concat(linie.map((l, i) => para([run(l, { bold: grube === i })], { spacing: { after: 10 } }))), { margins: { top: 20, bottom: 20, left: 0, right: 100 } });
  k.push(tbl([W / 2, W / 2], [row([blok("Adresat", osoba, 1), blok("Firma", firma, 0)])]));
  k.push(para([run("", { size: 8 })], { spacing: { after: 100 } }));
  k.push(para(F.zwrot, { spacing: { before: 60 } }), txt(F.wstep));
  k.push(h2(1, "Specyfikacja oferty"));
  k.push(...pozycja("Pozycja 1", F.pozycja, F.tech, F.uwagaTech, F.wyposazenie, F.lista, F.poLiscie, F.wymiary, !!(F.wymiary && F.wymiary.h1 != null)));
  (F.dalsze || []).forEach((x) => { k.push(para([run("", { size: 8 })], { spacing: { after: 100 } })); k.push(...pozycja(x.label, x.pozycja, x.tech, x.uwagaTech, x.wyposazenie, x.lista, x.poLiscie, null, false)); });
  k.push(h2(2, "Wartość zamówienia netto"), ceny());
  if (etapy.length) { k.push(para([run("Warunki płatności", { bold: true })], { spacing: { before: 140, after: 50 }, keepNext: true }), platnosci()); }
  uwagiPl.forEach((l) => k.push(txt(l, { size: 18 }, { spacing: { before: 60, after: 0 } })));
  k.push(h2(3, "Dostawa i montaż"));
  k.push(para([run("Dostawa. ", { bold: true }), run(F.dostawa)], { alignment: D.AlignmentType.JUSTIFIED }), para([run("Montaż. ", { bold: true }), run(F.montaz)], { alignment: D.AlignmentType.JUSTIFIED }));
  k.push(h2(4, "Zakres oferty"));
  F.zakres.forEach((l) => { const m = l.match(/^(Poza ofertą pozostają:)(.*)$/); k.push(m ? para([run(m[1], { bold: true, size: 18 }), run(m[2], { size: 18 })], { alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 70 } }) : txt(l, { size: 18 })); });
  k.push(h2(5, "Warunki montażu"));
  F.warunki.forEach((l) => { const m = l.match(/^(\d+)\.\s*(.*)$/); k.push(m ? new D.Paragraph({ indent: { left: 400, hanging: 320 }, spacing: { after: 30, line: 252 }, children: [run(m[1] + ".  ", { bold: true, color: TEAL, size: 18 }), run(m[2], { size: 18 })] }) : txt(l, { size: 18 })); });
  k.push(h2(6, "Gwarancja"));
  F.gwarancja.forEach((l, i, a) => k.push(txt(l, { size: 18 }, { keepNext: i === a.length - 1, keepLines: true })));
  k.push(new D.Paragraph({ keepNext: true, spacing: { before: 0, after: 100, line: 20 }, children: [run("", { size: 4 })] }));
  F.zakonczenie.forEach((l) => k.push(txt(l, {}, { keepNext: true, keepLines: true })));
  if (ctx.podpis) k.push(new D.Paragraph({ keepNext: true, spacing: { before: 60, after: 0 }, children: [new D.ImageRun({ type: ctx.podpis.type || "png", data: ctx.podpis.data, transformation: { width: ctx.podpis.w, height: ctx.podpis.h } })] }));
  else k.push(new D.Paragraph({ keepNext: true, spacing: { before: 0, after: 400, line: 20 }, children: [run("", { size: 4 })] }));
  k.push(new D.Paragraph({ keepNext: true, border: { top: ln(INK, 6) }, indent: { right: W - 3300 }, spacing: { after: 0 }, children: [run(F.podpis[0], { bold: true })] }), para(F.podpis.slice(1).join(" "), { keepNext: true, spacing: { after: 100 } }));
  k.push(txt(F.klauzula, { size: 17, color: LAB }, { spacing: { before: 60 } }));

  /* ---- nagłówek i stopka ---- */
  const c2 = [3600, W - 3600];
  const naglowek = new D.Header({ children: [tbl(c2, [row([
    cell(c2[0], [new D.Paragraph({ children: [logoRun(150)] })], { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 16) }), margins: { top: 0, bottom: 100, left: 0, right: 100 } }),
    cell(c2[1], [F.stopka[0], F.stopka[1], F.stopka[2]].map((t, i) => para([run(t, { size: i ? 17 : 18, bold: !i, color: i ? LAB : INK })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })), { borders: Object.assign({}, NOB, { bottom: ln(TEAL, 16) }), verticalAlign: D.VerticalAlign.CENTER, margins: { top: 0, bottom: 100, left: 100, right: 0 } })])])] });
  const stopka = new D.Footer({ children: [new D.Paragraph({ style: "Stopka", border: { top: ln(LINE, 8) }, tabStops: [{ type: D.TabStopType.RIGHT, position: W }], spacing: { before: 60 },
    children: [new D.TextRun({ text: F.stopka[0] }), new D.TextRun({ children: [new D.Tab()] }), new D.TextRun({ children: ["Strona ", D.PageNumber.CURRENT, " z ", D.PageNumber.TOTAL_PAGES] })] })] });
  return new D.Document({ creator: "PSP NowinaKonopka Technologies", title: F.nr,
    styles: { default: { document: { run: { font: FONT, size: 19, language: { value: "pl-PL" } } } }, paragraphStyles: [{ id: "Stopka", name: "Stopka", run: { font: FONT, size: 17, color: LAB } }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1500, bottom: 1000, left: 900, right: 900, header: 450, footer: 380 } } },
      headers: { default: naglowek }, footers: { default: stopka }, children: k }] });
}
module.exports = { ofertaB };
