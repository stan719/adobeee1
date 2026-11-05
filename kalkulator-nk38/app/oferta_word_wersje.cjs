// Oferta w Wordzie, wersje graficzne B (nowoczesna) i C (z boczną kolumną), do wypróbowania.
// Treść z X.oferta (ta sama co w aktualnym pliku Word), układ i kolory zmienione.
// Użycie: node oferta_word_wersje.cjs [katalog]   (domyślnie ../przyklady) → Oferta_wersja_B.docx, Oferta_wersja_C.docx
const fs = require("fs"), path = require("path");
const D = require("docx");
const E = require("./nk38-engine.js"), X = require("./nk38-export.js");

const TEAL = "0A6B74", INK = "13202A", MUT = "5F6D76", SOFT = "EAF4F5", LINE = "CFD7DB", SIDE = "F1F5F6", FONT = "Calibri";
const mm = (v) => Math.round(v * 56.69);
const logoBuf = fs.readFileSync(path.join(__dirname, "logo.png"));
const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const linia = (kolor, sz) => ({ style: D.BorderStyle.SINGLE, size: sz || 6, color: kolor || LINE });
const BORDER_ALL = (kolor, sz) => ({ top: linia(kolor, sz), bottom: linia(kolor, sz), left: linia(kolor, sz), right: linia(kolor, sz) });

function przyklad() {
  const sz = E.szablonyWbudowane().find((s) => s.id === "nk38");
  const d = Object.assign(E.domyslneDane(), sz.domyslne, { szablon: "nk38", nazwa: "ul. Lipowa 12, Kraków", lok: "Kraków", S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3, agr3: 1, agr6: 2, agrOpis: "1A3+2A4", barierki: 12, maskownice: 2, tir: 3, tir_cena: 1600, rozl_cena: 1500 });
  const r = E.oblicz(d, sz, E.szablonyWbudowane());
  const o = Object.assign(X.domyslnaOferta(), { nr: "12/11/2026", nrAuto: "12/11/2026", opcje: { q2500: true, slupki37: true, malowanie: false },
    adr: { zwrot: "Szanowny Pan", imie: "Jan Przykładowy", stanowisko: "Kierownik Budowy", tel: "+48 500 000 000", email: "jan.przykladowy@example.com", firma: "Przykładowy Inwestor Sp. z o.o.", ulica: "ul. Testowa 1", kod: "00-001 Warszawa", nip: "000-000-00-00" } });
  return X.oferta(r, o, X.SZABLON);
}

/* ---------- wspólne klocki ---------- */
const run = (t, o) => new D.TextRun(Object.assign({ text: t, font: FONT, size: 19, color: INK }, o || {}));
const para = (ch, o) => new D.Paragraph(Object.assign({ children: Array.isArray(ch) ? ch : [run(ch)], spacing: { after: 70, line: 264 } }, o || {}));
const txt = (t, o, po) => para([run(t, o)], Object.assign({ alignment: D.AlignmentType.JUSTIFIED }, po || {}));
const pusty = (pt) => para([run("", { size: 8 })], { spacing: { before: 0, after: pt || 0 } });
const komorka = (w, children, o) => new D.TableCell(Object.assign({ width: { size: w, type: D.WidthType.DXA }, borders: NOB, children: children.length ? children : [pusty()] }, o || {}));
const tabela = (W, cols, rows, o) => new D.Table(Object.assign({ width: { size: W, type: D.WidthType.DXA }, columnWidths: cols, rows,
  borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } }, o || {}));
const liczba = (F, k) => F.wymiary[k];
function lista(F) { return F.lista.map((l) => { const m = l.match(/^(\d+ szt\.)\s*[–-]\s*(.*)$/); return { n: m ? m[1] : "", t: m ? m[2] : l }; }); }
function podzielPlatnosci(F) {
  const raty = F.platnosci.filter((l) => /^(\d+%|do \d+%)/.test(l));
  return { raty: raty.map((l) => l.replace(/,\s*$/, "")), uwagi: F.platnosci.filter((l) => raty.indexOf(l) < 0) };
}
function adresat(F) { const i = F.adresat.indexOf(""); return { osoba: i < 0 ? F.adresat : F.adresat.slice(0, i), firma: i < 0 ? [] : F.adresat.slice(i + 1) }; }
const stronaF = () => [run("Strona ", { size: 15, color: MUT }), new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONT, size: 15, color: MUT }), run(" z ", { size: 15, color: MUT }), new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUT })];
const logoRun = (w) => new D.ImageRun({ type: "png", data: logoBuf, transformation: { width: w, height: Math.round(w * 58 / 232) } });
const bullets = { config: [{ reference: "pkt", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "•", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 340, hanging: 220 } }, run: { color: TEAL, size: 22 } } }] }] };

/* ================= WERSJA B: nowoczesna ================= */
function wersjaB(F) {
  const W = 10206;   // szerokość tekstu: A4 − marginesy 1,5 cm
  const w = F.wymiary, ad = adresat(F), pl = podzielPlatnosci(F);
  const h3 = (n, t) => para([run(" " + n + " ", { bold: true, color: "FFFFFF", size: 17, shading: { type: D.ShadingType.CLEAR, fill: TEAL, color: "auto" } }), run("   " + t, { bold: true, color: TEAL, size: 23 })],
    { spacing: { before: 200, after: 90 }, keepNext: true, border: { bottom: linia(LINE, 6) } });
  const kafel = (et, wart, szer) => komorka(szer, [para([run(et.toUpperCase(), { size: 14, color: MUT })], { spacing: { after: 20 } }), para([run(wart, { bold: true, size: 25 })], { spacing: { after: 0 } })],
    { borders: BORDER_ALL(LINE, 6), margins: { top: 80, bottom: 80, left: 140, right: 100 } });
  const odstep = (s) => komorka(s, [pusty()]);
  /* parametry techniczne: cztery kafelki z odstępami */
  const tile = (pary) => {
    const g = 120, k = Math.floor((W - g * (pary.length - 1)) / pary.length), cols = [], cells = [];
    pary.forEach((x, i) => { if (i) { cols.push(g); cells.push(odstep(g)); } cols.push(k); cells.push(kafel(x[0], x[1], k)); });
    return tabela(W, cols, [new D.TableRow({ cantSplit: true, children: cells })]);
  };
  const pary = w.h1 != null
    ? [["Zagłębienie", (w.h2 != null && w.h2 !== w.h1 ? "H1 " + w.h1 + " / H2 " + w.h2 : w.h1) + " cm"], ["Długość", w.dl + " cm"], ["Prześwit", "min. " + w.p + " cm"], ["Wysokość pojazdów", "▲ " + w.gor + " · ▼ " + w.dol + " cm"]] : null;
  const tabListy = () => tabela(W, [1300, W - 1300], lista(F).map((x) => new D.TableRow({ cantSplit: true, children: [
    komorka(1300, [para([run(x.n, { bold: true, color: TEAL })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: linia("E3E7EA", 4) }), margins: { top: 60, bottom: 60, left: 60 } }),
    komorka(W - 1300, [para([run(x.t)], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: linia("E3E7EA", 4) }), margins: { top: 60, bottom: 60 } })] })));
  const cenaTab = () => tabela(W, [W - 3600, 3600], F.ceny.map((c) => new D.TableRow({ cantSplit: true, children: [
    komorka(W - 3600, [para([run(c.label.replace(":", ""), { bold: true, size: 21 })], { spacing: { after: 0 } })], { borders: { top: linia(TEAL, 12), bottom: linia(TEAL, 12), left: linia(TEAL, 12), right: NONE }, margins: { top: 90, bottom: 90, left: 220 }, verticalAlign: D.VerticalAlign.CENTER }),
    komorka(3600, [para([run(F.kwota(c.kwota), { bold: true, size: 34, color: TEAL })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })], { borders: { top: linia(TEAL, 12), bottom: linia(TEAL, 12), right: linia(TEAL, 12), left: NONE }, margins: { top: 60, bottom: 60, right: 220 }, verticalAlign: D.VerticalAlign.CENTER })] })));
  const ratyTab = () => {
    const g = 100, k = Math.floor((W - g * (pl.raty.length - 1)) / pl.raty.length), cols = [], cells = [];
    pl.raty.forEach((r, i) => { if (i) { cols.push(g); cells.push(odstep(g)); } cols.push(k);
      cells.push(komorka(k, [para([run(r, { size: 17 })], { spacing: { after: 0 } })], { shading: { type: D.ShadingType.CLEAR, fill: SOFT, color: "auto" }, margins: { top: 90, bottom: 90, left: 130, right: 100 } })); });
    return tabela(W, cols, [new D.TableRow({ cantSplit: true, children: cells })]);
  };
  const dwie = (a, b) => tabela(W, [Math.floor((W - 400) / 2), 400, Math.floor((W - 400) / 2)], [new D.TableRow({ children: [komorka(Math.floor((W - 400) / 2), a), odstep(400), komorka(Math.floor((W - 400) / 2), b)] })]);
  const k = [];
  /* tytuł i data w jednej linii */
  k.push(new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: W }], spacing: { before: 120, after: 120 },
    children: [run(F.nr, { bold: true, size: 38, color: TEAL }), new D.TextRun({ children: [new D.Tab()] }), run(F.miejsceData, { size: 18, color: MUT })] }));
  const etyk = (t) => para([run(t, { size: 14, color: MUT })], { spacing: { after: 20 } });
  k.push(tabela(W, [W / 2, W / 2], [new D.TableRow({ children: [
    komorka(W / 2, [etyk("ADRESAT")].concat(ad.osoba.map((l, i) => para([run(l, { bold: i === 1 })], { spacing: { after: 10 } })))),
    komorka(W / 2, [etyk("FIRMA")].concat(ad.firma.map((l, i) => para([run(l, { bold: i === 0 })], { spacing: { after: 10 } }))))] })]));
  k.push(pusty(80));
  k.push(para(F.zwrot)); k.push(txt(F.wstep));
  k.push(h3(1, "Specyfikacja oferty"));
  k.push(para([run("Pozycja 1", { bold: true, color: TEAL }), run("  ·  " + F.pozycja, { bold: true })], { spacing: { after: 100 }, keepNext: true }));
  if (pary) k.push(tile(pary), pusty(60)); else F.tech.forEach((l) => k.push(txt(l)));
  F.uwagaTech.forEach((l) => k.push(txt(l, { size: 16, color: MUT, italics: true })));
  F.wyposazenie.forEach((l) => k.push(txt(l, { size: 16, color: MUT })));
  k.push(pusty(40), tabListy());
  F.poLiscie.forEach((l) => k.push(txt(l, { size: 17 })));
  F.dalsze.forEach((x, i) => {   // wycena łączona: kolejne pozycje
    k.push(pusty(80), para([run(x.label.replace(":", ""), { bold: true, color: TEAL }), run("  ·  " + x.pozycja, { bold: true })], { spacing: { after: 80 }, keepNext: true }));
    x.tech.forEach((l) => k.push(txt(l))); x.uwagaTech.forEach((l) => k.push(txt(l, { size: 16, color: MUT, italics: true })));
    x.wyposazenie.forEach((l) => k.push(txt(l, { size: 16, color: MUT })));
    x.lista.forEach((l) => k.push(new D.Paragraph({ numbering: { reference: "pkt", level: 0 }, children: [run(l)], spacing: { after: 30 } })));
  });
  F.opcje.forEach((op) => k.push(para([run(op.label + " ", { bold: true, color: TEAL }), run(op.tekst)], { spacing: { before: 100, after: 60 }, alignment: D.AlignmentType.JUSTIFIED })));
  k.push(h3(2, "Wartość zamówienia netto"), cenaTab(), pusty(100));
  if (pl.raty.length) { k.push(para([run("Warunki płatności", { size: 16, color: MUT })], { spacing: { after: 40 }, keepNext: true }), ratyTab()); }
  pl.uwagi.forEach((l) => k.push(txt(l, { size: 16, color: MUT }, { spacing: { before: 60, after: 20 } })));
  k.push(h3(3, "Dostawa i montaż"), txt(F.dostawa), txt(F.montaz));
  k.push(dwie([h3(4, "Zakres oferty")].concat(F.zakres.map((l) => txt(l, { size: 16 }))), [h3(6, "Gwarancja")].concat(F.gwarancja.map((l) => txt(l, { size: 16 })))));
  k.push(h3(5, "Warunki montażu"));
  F.warunki.forEach((l) => { const m = l.match(/^(\d+)\.\s*(.*)$/); k.push(m ? new D.Paragraph({ indent: { left: 400, hanging: 300 }, spacing: { after: 30, line: 252 }, children: [run(m[1] + ".  ", { bold: true, color: TEAL, size: 16 }), run(m[2], { size: 16 })] }) : txt(l, { size: 16 })); });
  k.push(pusty(30));
  F.zakonczenie.forEach((l) => k.push(txt(l)));
  k.push(pusty(260));
  k.push(new D.Paragraph({ border: { top: linia(INK, 6) }, indent: { right: W - 3200 }, spacing: { after: 0 }, children: [run(F.podpis[0], { bold: true })] }), para(F.podpis.slice(1).join(" "), { spacing: { after: 100 } }));
  k.push(txt(F.klauzula, { size: 13, color: MUT }, { spacing: { before: 60 } }));
  const kto = [["PSP NowinaKonopka Technologies Sp. z o.o. S.K.", true], [F.stopka[1], false], [F.stopka[2], false]];
  const header = new D.Header({ children: [tabela(W, [3000, W - 3000], [new D.TableRow({ children: [
    komorka(3000, [new D.Paragraph({ children: [logoRun(150)] })], { borders: Object.assign({}, NOB, { bottom: linia(TEAL, 18) }), margins: { bottom: 100 } }),
    komorka(W - 3000, kto.map(([t, b]) => para([run(t, { size: b ? 17 : 15, bold: b, color: b ? INK : MUT })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 } })), { borders: Object.assign({}, NOB, { bottom: linia(TEAL, 18) }), verticalAlign: D.VerticalAlign.CENTER, margins: { bottom: 100 } })] })])] });
  const footer = new D.Footer({ children: [new D.Paragraph({ border: { top: linia(TEAL, 18) }, tabStops: [{ type: D.TabStopType.CENTER, position: W / 2 }, { type: D.TabStopType.RIGHT, position: W }], spacing: { before: 60 },
    children: [run(F.stopka[0], { size: 15, color: MUT }), new D.TextRun({ children: [new D.Tab()] }), run(F.nr, { size: 15, color: MUT }), new D.TextRun({ children: [new D.Tab()] })].concat(stronaF()) })] });
  return new D.Document({ creator: "Kalkulator NK38", styles: { default: { document: { run: { font: FONT, size: 19 } } } }, numbering: bullets,
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1420, bottom: 950, left: 850, right: 850, header: 420, footer: 350 } } }, headers: { default: header }, footers: { default: footer }, children: k }] });
}

/* ================= WERSJA C: z boczną kolumną ================= */
function wersjaC(F) {
  const PW = 11906, SW = mm(58), MW = PW - SW, PAD = mm(9), IW = MW - PAD - mm(11);   // szerokość tekstu w kolumnie głównej
  const w = F.wymiary, ad = adresat(F), pl = podzielPlatnosci(F);
  const e = (t) => para([run(t.toUpperCase(), { size: 14, color: MUT })], { spacing: { before: 140, after: 10 } });
  const v = (t, o) => para([run(t, Object.assign({ bold: true, size: 20 }, o || {}))], { spacing: { after: 10 } });
  const m = (t) => para([run(t, { size: 15, color: MUT })], { spacing: { after: 0 } });
  const sidebar = () => [
    new D.Paragraph({ children: [logoRun(145)], spacing: { after: 160 } }),
    e("Numer oferty"), v(F.nr.replace("Oferta nr ", "")), e("Data"), v(F.miejsceData),
    e("Dla"), v(ad.osoba[1] || ad.osoba[0]), m(ad.osoba[2] || ""), m(ad.osoba[3] || ""), m(ad.osoba[4] || ""),
    pusty(60), v(ad.firma[0] || "", { size: 18 }), m(ad.firma[1] || ""), m(ad.firma[2] || ""), m(ad.firma[3] || ""),
    pusty(160),
    new D.Paragraph({ border: { top: linia(TEAL, 18) }, spacing: { before: 120, after: 10 }, children: [run((F.ceny[0].label.replace(":", "") + " · netto").toUpperCase(), { size: 14, color: MUT })] }),
    para([run(F.kwota(F.ceny[0].kwota), { bold: true, size: 32, color: TEAL })], { spacing: { after: 0 } })
  ].concat(F.ceny.slice(1).map((c) => para([run(c.label.replace(":", "") + ": ", { size: 16, color: MUT }), run(F.kwota(c.kwota), { size: 17, bold: true })], { spacing: { after: 0 } })))
   .concat([pusty(600)]).concat(F.stopka.map((l, i) => para([run(l, { size: 14, color: MUT, bold: i === 0 })], { spacing: { after: 10 } })));
  const h3 = (n, t) => para([run(n + "  ", { bold: true, size: 21 }), run(t.toUpperCase(), { bold: true, size: 21, color: TEAL })], { spacing: { before: 190, after: 70 }, keepNext: true });
  const def = (rows) => tabela(IW, [mm(34), IW - mm(34)], rows.map((r) => new D.TableRow({ cantSplit: true, children: [
    komorka(mm(34), [para([run(r[0], { color: MUT })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: linia("E3E7EA", 4) }), margins: { top: 60, bottom: 60 } }),
    komorka(IW - mm(34), [para([run(r[1], { bold: true })], { spacing: { after: 0 } })], { borders: Object.assign({}, NOB, { bottom: linia("E3E7EA", 4) }), margins: { top: 60, bottom: 60 } })] })), {
    borders: { top: linia("D5DDE1", 6), bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } });
  const pkt = (t) => new D.Paragraph({ numbering: { reference: "pkt", level: 0 }, children: [run(t)], spacing: { after: 30 } });
  const ratyTab = () => {
    const rows = [], g = 160, k = Math.floor((IW - g) / 2);
    for (let i = 0; i < pl.raty.length; i += 2) {
      const cell = (r) => komorka(k, r ? [para([run(r, { size: 17 })], { spacing: { after: 0 } })] : [], { borders: r ? Object.assign({}, NOB, { left: linia(TEAL, 24) }) : NOB, shading: r ? { type: D.ShadingType.CLEAR, fill: SIDE, color: "auto" } : undefined, margins: { top: 70, bottom: 70, left: 120 } });
      rows.push(new D.TableRow({ cantSplit: true, children: [cell(pl.raty[i]), komorka(g, []), cell(pl.raty[i + 1])] }));
      rows.push(new D.TableRow({ children: [komorka(k, [pusty()]), komorka(g, []), komorka(k, [])], height: { value: 60, rule: D.HeightRule.EXACT } }));
    }
    return tabela(IW, [k, g, k], rows);
  };
  const strona1 = [
    para([run("Oferta na dostawę i montaż", { bold: true, size: 32 })], { spacing: { after: 20 } }),
    para([run(F.pozycja, { size: 17, color: MUT })], { spacing: { after: 140 } }),
    para(F.zwrot), txt(F.wstep),
    h3("1", "Specyfikacja"),
    def(w.h1 != null ? [["Zagłębienie", (w.h2 != null && w.h2 !== w.h1 ? "H1 " + w.h1 + " / H2 " + w.h2 : w.h1) + " cm"], ["Długość", w.dl + " cm"], ["Prześwit", "min. " + w.p + " cm"], ["Wysokość pojazdów", "▲ " + w.gor + " cm · ▼ " + w.dol + " cm"]]
      : F.tech.map((l) => { const i = l.indexOf(":"); return i < 0 ? ["", l] : [l.slice(0, i), l.slice(i + 1).trim()]; })),
    pusty(60)
  ].concat(F.uwagaTech.map((l) => txt(l, { size: 16, color: MUT, italics: true }))).concat(F.wyposazenie.map((l) => txt(l, { size: 16, color: MUT })))
   .concat(F.lista.map(pkt)).concat(F.opcje.map((op) => para([run(op.label + " ", { bold: true, color: TEAL }), run(op.tekst)], { spacing: { before: 80, after: 40 }, alignment: D.AlignmentType.JUSTIFIED })))
   .concat([h3("2", "Wartość i płatności")]).concat(F.ceny.map((c) => para([run(c.label.replace(":", "") + ":  "), run(F.kwota(c.kwota), { bold: true, color: TEAL, size: 22 })], { spacing: { after: 40 } })))
   .concat([pusty(40), ratyTab()]).concat(pl.uwagi.map((l) => txt(l, { size: 16, color: MUT }, { spacing: { before: 40 } })))
   .concat([h3("3", "Dostawa i montaż"), txt(F.dostawa), txt(F.montaz)]);
  const strona2 = [h3("4", "Zakres oferty")].concat(F.zakres.map((l) => txt(l, { size: 17 }))).concat([h3("5", "Warunki montażu")]).concat(F.warunki.map((l) => { const mm_ = l.match(/^(\d+)\.\s*(.*)$/);
    return mm_ ? new D.Paragraph({ indent: { left: 360, hanging: 300 }, spacing: { after: 40, line: 264 }, children: [run(mm_[1] + ".  ", { bold: true, color: TEAL, size: 17 }), run(mm_[2], { size: 17 })] }) : txt(l, { size: 17 }); }))
    .concat([h3("6", "Gwarancja")]).concat(F.gwarancja.map((l) => txt(l, { size: 17 })))
    .concat([pusty(100)]).concat(F.zakonczenie.map((l) => txt(l))).concat([pusty(500),
      new D.Paragraph({ border: { top: linia(INK, 6) }, indent: { right: IW - 3000 }, spacing: { after: 0 }, children: [run(F.podpis[0], { bold: true })] }), para(F.podpis.slice(1).join(" ")),
      txt(F.klauzula, { size: 13, color: MUT }, { spacing: { before: 140 } })]);
  const rowH = (h, tresc) => new D.TableRow({ height: { value: h, rule: D.HeightRule.ATLEAST }, children: [
    new D.TableCell({ width: { size: SW, type: D.WidthType.DXA }, borders: Object.assign({}, NOB, { right: linia("D5DDE1", 6) }), shading: { type: D.ShadingType.CLEAR, fill: SIDE, color: "auto" }, margins: { top: mm(9), left: mm(8), right: mm(5), bottom: 100 }, children: sidebar() }),
    new D.TableCell({ width: { size: MW, type: D.WidthType.DXA }, borders: NOB, margins: { top: mm(9), left: PAD, right: mm(11), bottom: 100 }, children: tresc })] });
  const tab = tabela(PW, [SW, MW], [rowH(15150, strona1), rowH(14600, strona2)]);
  const footer = new D.Footer({ children: [new D.Paragraph({ indent: { left: SW + PAD }, tabStops: [{ type: D.TabStopType.RIGHT, position: PW - mm(11) }], border: { top: linia("D5DDE1", 6) },
    children: [run(F.stopka[0], { size: 15, color: MUT }), new D.TextRun({ children: [new D.Tab()] })].concat(stronaF()) })] });
  return new D.Document({ creator: "Kalkulator NK38", styles: { default: { document: { run: { font: FONT, size: 19 } } } }, numbering: bullets,
    sections: [{ properties: { page: { size: { width: PW, height: 16838 }, margin: { top: 0, bottom: 650, left: 0, right: 0, header: 0, footer: 250 } } }, footers: { default: footer },
      children: [tab, new D.Paragraph({ spacing: { after: 0, line: 20 }, children: [run("", { size: 2 })] })] }] });
}

(async () => {
  const out = path.resolve(process.argv[2] || path.join(__dirname, "..", "przyklady")); fs.mkdirSync(out, { recursive: true });
  const F = przyklad();
  for (const [id, f] of [["B", wersjaB], ["C", wersjaC]]) {
    const buf = await D.Packer.toBuffer(f(F)); fs.writeFileSync(path.join(out, "Oferta_wersja_" + id + ".docx"), buf);
  }
  console.log("zapisano Oferta_wersja_B.docx i Oferta_wersja_C.docx w " + out);
})().catch((e) => { console.error(e); process.exit(1); });
