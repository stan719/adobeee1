// Trzy wersje graficzne oferty (A, B, C) jako podglądy 2 stron do porównania.
// To makiety HTML z prawdziwą treścią oferty (X.oferta), renderowane do PNG (Playwright, A4).
// Użycie: node oferta_warianty.cjs [katalog]   (domyślnie ../podglad/img); wynik: of-A-1.png … of-C-2.png
const fs = require("fs"), path = require("path");
const E = require("./nk38-engine.js"), X = require("./nk38-export.js");

const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const logo = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "logo.png")).toString("base64");

function przyklad() {
  const sz = E.szablonyWbudowane().find((s) => s.id === "nk38");
  const d = Object.assign(E.domyslneDane(), sz.domyslne, { szablon: "nk38", nazwa: "ul. Lipowa 12, Kraków", lok: "Kraków", S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3, agr3: 1, agr6: 2, agrOpis: "1A3+2A4", barierki: 12, maskownice: 2, tir: 3, tir_cena: 1600, rozl_cena: 1500 });
  const r = E.oblicz(d, sz, E.szablonyWbudowane());
  const o = Object.assign(X.domyslnaOferta(), { nr: "12/11/2026", nrAuto: "12/11/2026", adr: { zwrot: "Szanowny Pan", imie: "Jan Przykładowy", stanowisko: "Kierownik Budowy", tel: "+48 500 000 000", email: "jan.przykladowy@example.com", firma: "Przykładowy Inwestor Sp. z o.o.", ulica: "ul. Testowa 1", kod: "00-001 Warszawa", nip: "000-000-00-00" } });
  return { r, F: X.oferta(r, o, X.SZABLON) };
}

const P = (arr, cls) => arr.filter((l) => l !== "").map((l) => `<p class="${cls || ""}">${esc(l)}</p>`).join("");
const liczby = (t) => esc(t).replace(/([▲▼]?-?\d[\d\/\-().,]*)/g, "<b>$1</b>");   // jak w pliku Word: pogrubione wartości

/* ---------- wspólne: dane z oferty rozbite na części ---------- */
function czesci(F) {
  const ceny = F.ceny.map((c) => ({ label: c.label, kwota: F.kwota(c.kwota) }));
  const raty = F.platnosci.filter((l) => /^\d|^do /.test(l) || /%/.test(l));
  const uwagi = F.platnosci.filter((l) => raty.indexOf(l) < 0);
  const wy = F.wymiary;
  return { ceny, raty, uwagi, wy };
}

/* ---------- A: klasyczna, jak dziś (Verdana 8 pt, niebieskie etykiety) ---------- */
function wersjaA(F) {
  const c = czesci(F);
  const css = `
  .page { font: 8pt/1.35 Verdana, "DejaVu Sans", sans-serif; color: #000; padding: 14mm 14mm 12mm 18mm; }
  .hd { display: flex; align-items: flex-start; gap: 10mm; border-bottom: 1px solid #bbb; padding-bottom: 3mm; margin-bottom: 4mm; }
  .hd img { height: 12mm; } .hd .lh { flex: 1; text-align: center; font: 8.5pt "Century Gothic", "DejaVu Sans", sans-serif; color: #444; } .hd .lh b { display: block; font: bold 9pt "Times New Roman", serif; color: #000; }
  .pg { background: #9dbce3; color: #fff; font: bold 10pt serif; padding: 1mm 3mm; }
  h4 { font-size: 8pt; margin: 3.5mm 0 1mm; } .in { padding-left: 5mm; } p { margin: 0 0 1mm; text-align: justify; } .blue { color: #3366cc; font-weight: bold; } ul { margin: 1mm 0 1mm 4mm; padding-left: 3mm; } li { margin-bottom: .8mm; } li::marker { color: #3366cc; }
  .cena { display: flex; justify-content: space-between; } .cena u { font-weight: bold; }
  .kl { font-size: 6pt; color: #444; margin-top: 4mm; } .ft { border-top: 1px solid #bbb; margin-top: 3mm; padding-top: 1.5mm; text-align: center; font: 7.5pt "Century Gothic", "DejaVu Sans", sans-serif; }
  .it { font-style: italic; }`;
  const head = (n) => `<div class="hd"><img src="${logo}"><div class="lh"><b>${esc(F.naglowek[0])}</b><b>${esc(F.naglowek[1])}</b>${F.naglowek.slice(2).map(esc).join("<br>")}</div><span class="pg">${n}</span></div>`;
  const foot = `<div class="ft">${F.stopka.map(esc).join("<br>")}</div>`;
  const p1 = `<div class="page">${head(1)}
    <p>${esc(F.miejsceData)}</p><br>${F.adresat.map((l, i) => `<p>${i === 1 ? "<b>" + esc(l) + "</b>" : esc(l) || "&nbsp;"}</p>`).join("")}<br>
    <p><b><i><u>${esc(F.nr)}</u></i></b></p><p>${esc(F.zwrot)}</p><p>${esc(F.wstep)}</p>
    <h4>1. Specyfikacja oferty:</h4><div class="in"><p><span class="blue">Pozycja 1:</span> <span class="blue" style="font-weight:normal">${esc(F.pozycja)}</span></p><p><u>Dane techniczne:</u></p>
    ${F.tech.map((l) => `<p>${liczby(l)}</p>`).join("")}${P(F.uwagaTech, "it")}${F.wyposazenie.map((l) => `<p>${liczby(l)}</p>`).join("")}
    <ul>${F.lista.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>
    <h4>2. Wartość zamówienia netto.</h4><div class="in">${c.ceny.map((x) => `<div class="cena"><span>Warunki płatności:</span><span><span class="blue">${esc(x.label)}</span> <u>${esc(x.kwota)}</u></span></div>`).join("")}${P(F.platnosci)}</div>
    ${foot}</div>`;
  const p2 = `<div class="page">${head(2)}
    <h4>3. Dostawa i montaż.</h4><div class="in">${P([F.dostawa, F.montaz])}</div>
    <h4>4. Zakres oferty.</h4><div class="in">${P(F.zakres)}</div>
    <h4>5. Warunki montażu.</h4><div class="in">${P(F.warunki)}</div>
    <h4>6. Gwarancja.</h4><div class="in">${P(F.gwarancja)}</div><br>
    <div class="in">${P(F.zakonczenie)}<br><br>${P(F.podpis)}</div>
    <p class="kl">${esc(F.klauzula)}</p>${foot}</div>`;
  return { css, strony: [p1, p2] };
}

/* ---------- B: nowoczesna, akcent firmowy (Carlito, kafelki parametrów, cena w ramce) ---------- */
function wersjaB(F) {
  const c = czesci(F), w = c.wy;
  const kafel = (et, wart) => `<div class="kaf"><span>${et}</span><b>${wart}</b></div>`;
  const css = `
  .page { font: 9.4pt/1.38 Carlito, Calibri, sans-serif; color: #13202a; padding: 12mm 16mm 10mm 16mm; position: relative; }
  .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 3mm; border-bottom: 2px solid #0a6b74; }
  .top img { height: 11mm; } .top .kto { text-align: right; font-size: 8pt; color: #5f6d76; line-height: 1.35; } .top .kto b { color: #13202a; font-size: 8.6pt; }
  .tyt { display: flex; justify-content: space-between; align-items: flex-end; margin: 5mm 0 3mm; }
  .tyt h1 { margin: 0; font-size: 17pt; color: #0a6b74; letter-spacing: -.01em; } .tyt .dt { color: #5f6d76; font-size: 9pt; }
  .adr { display: flex; gap: 10mm; margin-bottom: 3mm; } .adr > div { flex: 1; } .adr small { display: block; color: #5f6d76; font-size: 7.4pt; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5mm; }
  p { margin: 0 0 1.4mm; text-align: justify; }
  h3 { display: flex; align-items: center; gap: 2.5mm; margin: 4mm 0 2mm; font-size: 11pt; color: #0a6b74; border-bottom: 1px solid #cfd7db; padding-bottom: 1mm; }
  h3 i { font-style: normal; background: #0a6b74; color: #fff; width: 5.2mm; height: 5.2mm; line-height: 5.2mm; text-align: center; border-radius: 50%; font-size: 8.6pt; }
  .poz { font-weight: 700; margin-bottom: 1.5mm; } .poz span { color: #0a6b74; }
  .kafle { display: flex; gap: 3mm; margin: 1.5mm 0 2.5mm; } .kaf { flex: 1; border: 1px solid #cfd7db; border-radius: 2mm; padding: 1.8mm 3mm; } .kaf span { display: block; font-size: 7.4pt; color: #5f6d76; text-transform: uppercase; letter-spacing: .04em; } .kaf b { font-size: 12.5pt; }
  .mut { color: #5f6d76; font-size: 8.4pt; }
  table { width: 100%; border-collapse: collapse; margin: 1.5mm 0 2mm; } td { padding: 1.3mm 2mm; border-bottom: 1px solid #e3e7ea; } td:first-child { width: 14mm; font-weight: 700; color: #0a6b74; white-space: nowrap; }
  .cenabox { display: flex; justify-content: space-between; align-items: center; border: 1.6px solid #0a6b74; border-radius: 2.4mm; padding: 3mm 5mm; margin: 2mm 0 3mm; } .cenabox span { font-weight: 700; } .cenabox b { font-size: 17pt; color: #0a6b74; }
  .raty { display: flex; gap: 2mm; margin-bottom: 2mm; } .rata { flex: 1; background: #eaf4f5; border-radius: 2mm; padding: 1.8mm 2.5mm; font-size: 8.4pt; }
  .dwie { display: flex; gap: 8mm; } .dwie > div { flex: 1; }
  .kl { font-size: 6.6pt; color: #5f6d76; margin-top: 3mm; } .ft { position: absolute; left: 16mm; right: 16mm; bottom: 8mm; border-top: 2px solid #0a6b74; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 7.6pt; color: #5f6d76; }
  .pod { margin-top: 5mm; } .pod b { display: block; } .linia { width: 55mm; border-top: 1px solid #13202a; margin-top: 12mm; padding-top: 1mm; }`;
  const top = `<div class="top"><img src="${logo}"><div class="kto"><b>${esc(F.stopka[0])}</b><br>${esc(F.stopka[1])}<br>${esc(F.stopka[2])}</div></div>`;
  const foot = (n) => `<div class="ft"><span>${esc(F.stopka[0])}</span><span>Oferta ${esc(F.nr.replace("Oferta nr ", "nr "))}</span><span>Strona ${n} z 2</span></div>`;
  const tech = `<div class="kafle">${kafel("Zagłębienie", w.h2 != null && w.h2 !== w.h1 ? "H1 " + w.h1 + " / H2 " + w.h2 + " cm" : w.h1 + " cm")}${kafel("Długość", w.dl + " cm")}${kafel("Prześwit", "min. " + w.p + " cm")}${kafel("Wysokość pojazdów", "▲ " + w.gor + " · ▼ " + w.dol + " cm")}</div>`;
  const p1 = `<div class="page">${top}
    <div class="tyt"><h1>${esc(F.nr)}</h1><span class="dt">${esc(F.miejsceData)}</span></div>
    <div class="adr"><div><small>Adresat</small>${F.adresat.slice(0, F.adresat.indexOf("")).map(esc).join("<br>")}</div><div><small>Firma</small>${F.adresat.slice(F.adresat.indexOf("") + 1).map(esc).join("<br>")}</div></div>
    <p>${esc(F.zwrot)}</p><p>${esc(F.wstep)}</p>
    <h3><i>1</i>Specyfikacja oferty</h3>
    <p class="poz"><span>Pozycja 1</span> · ${esc(F.pozycja)}</p>${tech}
    <p class="mut">${esc(F.uwagaTech.join(" "))}</p>
    <p class="mut">${F.wyposazenie.map(esc).join(" ")}</p>
    <table>${F.lista.map((l) => { const m = l.match(/^(\d+ szt\.)\s*[–-]\s*(.*)$/); return `<tr><td>${esc(m ? m[1] : "")}</td><td>${esc(m ? m[2] : l)}</td></tr>`; }).join("")}</table>
    <h3><i>2</i>Wartość zamówienia netto</h3>
    ${c.ceny.map((x) => `<div class="cenabox"><span>${esc(x.label.replace(":", ""))}</span><b>${esc(x.kwota)}</b></div>`).join("")}
    <p class="mut" style="margin-bottom:1mm">Warunki płatności</p><div class="raty">${c.raty.map((l) => `<div class="rata">${esc(l)}</div>`).join("")}</div><p class="mut">${esc(c.uwagi.join(" "))}</p>
    <h3><i>3</i>Dostawa i montaż</h3>${P([F.dostawa, F.montaz])}
    ${foot(1)}</div>`;
  const p2 = `<div class="page">${top}
    <div class="dwie"><div><h3 style="margin-top:2mm"><i>4</i>Zakres oferty</h3>${P(F.zakres)}</div><div><h3 style="margin-top:2mm"><i>6</i>Gwarancja</h3>${P(F.gwarancja)}</div></div>
    <h3><i>5</i>Warunki montażu</h3>${P(F.warunki)}
    <div class="pod">${P(F.zakonczenie)}<div class="linia"><b>${esc(F.podpis[0])}</b>${esc(F.podpis[1])}</div></div>
    <p class="kl">${esc(F.klauzula)}</p>${foot(2)}</div>`;
  return { css, strony: [p1, p2] };
}

/* ---------- C: kompaktowa, z boczną kolumną (cena, daty, kontakt) ---------- */
function wersjaC(F) {
  const c = czesci(F), w = c.wy;
  const css = `
  .page { font: 9.2pt/1.36 Carlito, Calibri, sans-serif; color: #101a21; display: flex; padding: 0; position: relative; }
  .side { width: 56mm; background: #f1f5f6; padding: 12mm 6mm 10mm 8mm; display: flex; flex-direction: column; gap: 4.5mm; border-right: 1px solid #d5dde1; }
  .side img { width: 40mm; } .side .e { font-size: 7.2pt; color: #5f6d76; text-transform: uppercase; letter-spacing: .06em; } .side .v { font-weight: 700; font-size: 9.6pt; }
  .side .cenaS { border-top: 2px solid #0a6b74; padding-top: 2mm; } .side .cenaS b { display: block; font-size: 16pt; color: #0a6b74; line-height: 1.15; }
  .side .kont { margin-top: auto; font-size: 7.6pt; color: #4a5962; line-height: 1.4; }
  .main { flex: 1; padding: 12mm 13mm 14mm 9mm; }
  h1 { margin: 0 0 1mm; font-size: 15pt; } .data { color: #5f6d76; font-size: 8.6pt; margin-bottom: 3mm; }
  h3 { margin: 3.6mm 0 1.4mm; font-size: 10.4pt; color: #0a6b74; text-transform: uppercase; letter-spacing: .04em; } h3 em { font-style: normal; color: #13202a; margin-right: 2mm; }
  p { margin: 0 0 1.3mm; text-align: justify; } .mut { color: #5f6d76; font-size: 8.3pt; }
  dl { display: grid; grid-template-columns: 34mm 1fr; margin: 1mm 0 2mm; border-top: 1px solid #d5dde1; } dt, dd { margin: 0; padding: 1mm 0; border-bottom: 1px solid #e6ebee; } dt { color: #5f6d76; } dd { font-weight: 700; }
  ul { margin: 1mm 0 2mm; padding-left: 4mm; } li { margin-bottom: .6mm; } li::marker { color: #0a6b74; }
  .rat { margin: 0 0 1.5mm; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; } .rat li { padding: 1mm 2mm; border-left: 3px solid #0a6b74; background: #f1f5f6; margin: 0; }
  .kl { font-size: 6.4pt; color: #5f6d76; margin-top: 3mm; } .ft { position: absolute; bottom: 7mm; left: 65mm; right: 13mm; font-size: 7.4pt; color: #5f6d76; display: flex; justify-content: space-between; border-top: 1px solid #d5dde1; padding-top: 1mm; }
  .podp { margin-top: 4mm; } .podp .linia { width: 52mm; border-top: 1px solid #13202a; margin-top: 11mm; padding-top: 1mm; }`;
  const side = (strona) => `<div class="side"><img src="${logo}">
    <div><div class="e">Numer oferty</div><div class="v">${esc(F.nr.replace("Oferta nr ", ""))}</div></div>
    <div><div class="e">Data</div><div class="v">${esc(F.miejsceData)}</div></div>
    <div><div class="e">Dla</div><div class="v">${F.adresat.filter(Boolean).slice(1, 2).map(esc).join("")}</div><div class="mut">${F.adresat.filter(Boolean).slice(2).map(esc).join("<br>")}</div></div>
    <div class="cenaS"><div class="e">${esc(c.ceny[0].label.replace(":", ""))} · netto</div><b>${esc(c.ceny[0].kwota)}</b></div>
    <div class="kont">${F.stopka.map(esc).join("<br>")}</div></div>`;
  const foot = (n) => `<div class="ft"><span>${esc(F.stopka[0])}</span><span>Strona ${n} z 2</span></div>`;
  const p1 = `<div class="page">${side(1)}<div class="main">
    <h1>Oferta na dostawę i montaż</h1><div class="data">${esc(F.pozycja)}</div>
    <p>${esc(F.zwrot)}</p><p>${esc(F.wstep)}</p>
    <h3><em>1</em>Specyfikacja</h3>
    <dl><dt>Zagłębienie</dt><dd>${w.h2 != null && w.h2 !== w.h1 ? "H1 " + w.h1 + " / H2 " + w.h2 : w.h1} cm</dd><dt>Długość</dt><dd>${w.dl} cm</dd><dt>Prześwit</dt><dd>min. ${w.p} cm</dd><dt>Wysokość pojazdów</dt><dd>▲ ${w.gor} cm · ▼ ${w.dol} cm</dd></dl>
    <p class="mut">${esc(F.uwagaTech.join(" "))}</p><p class="mut">${F.wyposazenie.map(esc).join(" ")}</p>
    <ul>${F.lista.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    <h3><em>2</em>Wartość i płatności</h3>
    <ul class="rat">${c.raty.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p class="mut">${esc(c.uwagi.join(" "))}</p>
    <h3><em>3</em>Dostawa i montaż</h3>${P([F.dostawa, F.montaz])}
    <h3><em>4</em>Zakres oferty</h3>${P(F.zakres)}
    ${foot(1)}</div></div>`;
  const p2 = `<div class="page">${side(2)}<div class="main">
    <h3 style="margin-top:0"><em>5</em>Warunki montażu</h3>${P(F.warunki)}
    <h3><em>6</em>Gwarancja</h3>${P(F.gwarancja)}
    <div class="podp">${P(F.zakonczenie)}<div class="linia"><b>${esc(F.podpis[0])}</b><br>${esc(F.podpis[1])}</div></div>
    <p class="kl">${esc(F.klauzula)}</p>${foot(2)}</div></div>`;
  return { css, strony: [p1, p2] };
}

const WERSJE = [
  ["A", "Klasyczna: jak dziś (Verdana 8 pt, niebieskie etykiety, jedna kolumna)", wersjaA],
  ["B", "Nowoczesna: akcent firmowy, kafelki parametrów, cena w ramce, płatności jako raty", wersjaB],
  ["C", "Kompaktowa: boczna kolumna (numer, data, adresat, cena) i tekst obok", wersjaC]
];

/* Zwraca wpisy do podglądu: [{ tytul, strony: [{ plik, sekcje }] }]; pliki PNG ląduje w katalogu img. */
async function generuj(img) {
  const { chromium } = require("playwright");
  fs.mkdirSync(img, { recursive: true });
  const { F } = przyklad(), wynik = [];
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.6 });
  for (const [id, opis, f] of WERSJE) {
    const w = f(F);
    const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box} body{margin:0;background:#fff} .page{width:210mm;height:297mm;overflow:hidden;position:relative;page-break-after:always} ${w.css}</style>${w.strony.join("")}`;
    await pg.setContent(html); await pg.waitForTimeout(250);
    const strony = [];
    for (let i = 0; i < w.strony.length; i++) {
      const el = pg.locator(".page").nth(i), plik = `of-${id}-${i + 1}.png`;
      await el.screenshot({ path: path.join(img, plik) });
      /* kontrola: czy treść nie wychodzi poza kartkę */
      const przepelnione = await el.evaluate((n) => Array.from(n.querySelectorAll("*")).some((x) => x.getBoundingClientRect().bottom > n.getBoundingClientRect().bottom + 1));
      if (przepelnione) console.error("UWAGA: wersja " + id + ", strona " + (i + 1) + " nie mieści się na kartce");
      strony.push({ plik: "img/" + plik, sekcje: [{ id: `of-${id}-${i + 1}`, nazwa: `Oferta, wersja ${id}, strona ${i + 1}`, y0: 0, y1: 297 }] });
    }
    wynik.push({ tytul: `Oferta · wersja ${id}: ${opis}`, strony });
  }
  await b.close();
  return wynik;
}
module.exports = { generuj };
if (require.main === module) generuj(path.resolve(process.argv[2] || path.join(__dirname, "..", "podglad", "img"))).then((w) => console.log("wygenerowano " + w.length + " wersje oferty")).catch((e) => { console.error(e); process.exit(1); });
