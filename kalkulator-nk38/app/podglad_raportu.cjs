// Podgląd raportu do wspólnej edycji komentarzami: strony raportu PDF i arkusz Podsumowanie z Excela
// jako obrazy, a na nich podpisane ramki części raportu (mapa z X.pdf, ctx.mapa).
// Użycie: node podglad_raportu.cjs [katalog]   (domyślnie ../podglad; wymaga pdftoppm i soffice)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const E = require("./nk38-engine.js"), X = require("./nk38-export.js");
const { jsPDF } = require("jspdf"); const at = require("jspdf-autotable"); const autoTable = at.default || at;
X.setLibs({ ExcelJS: require("exceljs"), jsPDF, autoTable: (d, o) => autoTable(d, o) });
const font = (f) => fs.readFileSync(path.join(__dirname, "fonts", f)).toString("base64");
const fonts = { regular: font("Carlito-Regular.ttf"), bold: font("Carlito-Bold.ttf") };
const wersja = (fs.readFileSync(path.join(__dirname, "index.html"), "utf8").match(/WERSJA = \{ nr: "([^"]+)"/) || [])[1] || "?";
const szablony = E.szablonyWbudowane();
const PRZYKLADY = [
  ["nk38", "lipowa", "ul. Lipowa 12, Kraków", { lok: "Kraków", S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3, agr3: 1, agr6: 2, agrOpis: "1A3+2A4", barierki: 12, maskownice: 2, tir_cena: 1600, rozl_cena: 1500 }],
  ["nk41", "lesna", "ul. Leśna 5, Wrocław", { km: 270, S: 23, agregaty: 6, agr3: 4, agr6: 2, przeswit: 280, dlMiejsca: 400 }],
  ["nk38", "brzozowa", "ul. Brzozowa 9, Poznań · NK38 + NK41", { km: 460, S: 4, D: 6, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 2, barierki: 6, tir_cena: 4500, rozl_cena: 2000,
    dodatkowe: [{ szablon: "nk41", S: 12, agr3: 2, agr6: 1, przeswit: 280, dlMiejsca: 400 }] }]   // wycena łączona
];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

(async () => {
  const out = path.resolve(process.argv[2] || path.join(__dirname, "..", "podglad")), img = path.join(out, "img"), tmp = path.join(out, "tmp");
  [out, img, tmp].forEach((d) => fs.mkdirSync(d, { recursive: true }));
  const dokumenty = [];
  for (const [id, klucz, nazwa, dd] of PRZYKLADY) {
    const sz = szablony.find((s) => s.id === id);
    const dane = Object.assign(E.domyslneDane(), sz.domyslne, { szablon: id, nazwa, data: new Date().toISOString().slice(0, 10) }, dd);
    const r = E.oblicz(dane, sz, szablony), mapa = [];
    const ctx = { GLEBOKOSCI: sz.glebokosci.map((g) => g.cm), zestawienie: "", uwagi: [], cennikPola: [], cennikZmiany: {}, oferta: X.domyslnaOferta(), fonts, mapa };
    const pdf = path.join(tmp, klucz + ".pdf"), xlsx = path.join(tmp, klucz + ".xlsx");
    fs.writeFileSync(pdf, Buffer.from(X.pdf(r, ctx)));
    fs.writeFileSync(xlsx, Buffer.from(await X.xlsx(r, ctx)));
    execFileSync("pdftoppm", ["-r", "130", "-png", pdf, path.join(img, "pdf-" + klucz)]);
    const strony = fs.readdirSync(img).filter((f) => f.startsWith("pdf-" + klucz + "-")).sort();
    dokumenty.push({ tytul: "Raport PDF · " + sz.nazwa + " · " + nazwa, strony: strony.map((f, i) => ({ plik: "img/" + f, sekcje: mapa.filter((m) => m.strona === i + 1) })) });
    try {   // Excel: arkusz Podsumowanie przeliczony przez LibreOffice (liczby w zapisie angielskim)
      execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", tmp, xlsx], { stdio: "ignore", timeout: 120000 });
      execFileSync("pdftoppm", ["-r", "110", "-png", "-f", "1", "-l", "3", path.join(tmp, klucz + ".pdf"), path.join(img, "xls-" + klucz)]);
    } catch (e) { console.error("Excel: " + e.message); }
    const xl = fs.readdirSync(img).filter((f) => f.startsWith("xls-" + klucz)).sort();
    if (xl.length) dokumenty.push({ tytul: "Excel · jeden arkusz · " + sz.nazwa + " · " + nazwa, strony: xl.map((f, i) => ({ plik: "img/" + f, sekcje: [{ id: "excel" + (i + 1), nazwa: ["Excel strona 1: podsumowanie", "Excel strona 2: koszty", "Excel strona 3: cennik"][i] || "Excel", y0: 0, y1: 297 }], excel: true })) });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(out, "index.html"), html(dokumenty));
  console.log("podgląd: " + out + " (" + dokumenty.length + " dokumentów, wersja " + wersja + ")");
})().catch((e) => { console.error(e); process.exit(1); });

function html(dokumenty) {
  let nr = 0;
  const sekcja = (s, d) => {
    nr++;
    const top = (s.y0 / 297 * 100).toFixed(2), h = ((s.y1 - s.y0) / 297 * 100).toFixed(2);
    return `<div class="ramka" id="r-${d}-${esc(s.id)}" style="top:${top}%;height:${h}%" tabindex="0" title="${nr}. ${esc(s.nazwa)}"><span class="nr" aria-hidden="true">${nr}</span><span class="etykieta">${nr}. ${esc(s.nazwa)}</span></div>`;
  };
  const strona = (p, di, si) => `<figure class="strona${p.excel ? " xls" : ""}"><figcaption>Strona ${si + 1}</figcaption><div class="arkusz"><img src="${p.plik}" alt="${p.excel ? "Arkusz Podsumowanie" : "Strona " + (si + 1)} raportu" loading="lazy">${p.sekcje.map((s) => sekcja(s, di + "-" + si)).join("")}</div></figure>`;
  return `<meta charset="utf-8">
<title>Podgląd raportu</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>
/* Układ: kolumna stron raportu jak na biurku; na każdej części podpisana ramka do komentowania. */
:root { --tlo: #eef1f2; --papier: #ffffff; --tusz: #13202a; --szary: #5f6d76; --linia: #cfd7db; --akcent: #0a6b74; --akcent-tlo: #dff0f1;
  --f-ui: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --tlo: #0d1417; --papier: #ffffff; --tusz: #e6edf0; --szary: #93a2aa; --linia: #2b3a41; --akcent: #4fc0c4; --akcent-tlo: #12302f; color-scheme: dark } }
:root[data-theme="dark"] { --tlo: #0d1417; --papier: #ffffff; --tusz: #e6edf0; --szary: #93a2aa; --linia: #2b3a41; --akcent: #4fc0c4; --akcent-tlo: #12302f; color-scheme: dark }
body { background: var(--tlo); color: var(--tusz); font: 15px/1.5 var(--f-ui); }
.wrap { max-width: 920px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 64px; display: flex; flex-direction: column; gap: 28px; }
header h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.01em; text-wrap: balance; }
header p { margin: 6px 0 0; color: var(--szary); max-width: 65ch; }
.kroki { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding: 0; list-style: none; }
.kroki li { font-size: 13px; padding: 4px 10px; border-radius: 99px; background: var(--akcent-tlo); color: var(--tusz); }
.meta { font-size: 12.5px; color: var(--szary); margin-top: 10px; font-variant-numeric: tabular-nums; }
section h2 { margin: 0 0 12px; font-size: 17px; font-weight: 600; }
.strona { margin: 0 0 20px; }
.strona figcaption { font-size: 12px; color: var(--szary); margin-bottom: 6px; letter-spacing: .04em; text-transform: uppercase; }
.arkusz { position: relative; background: var(--papier); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.08); border-radius: 3px; overflow: hidden; }
.arkusz img { display: block; width: 100%; height: auto; }
.ramka { position: absolute; left: 5.5%; width: 89%; border: 1.5px dashed transparent; border-radius: 4px; transition: border-color .15s, background .15s; }
.xls .ramka { left: 3%; width: 94%; }
.ramka:hover, .ramka:focus-visible { border-color: #0a6b74; background: rgba(10,107,116,.05); outline: none; }
.nr { position: absolute; top: 2px; right: -4.6%; min-width: 18px; text-align: center; font-size: 10.5px; font-weight: 600; color: #0a6b74; background: #e3f2f2; border-radius: 9px; padding: 0 4px; line-height: 18px; }
.ramka:not(:hover):not(:focus-visible) .etykieta { opacity: 0; }
.etykieta { position: absolute; top: 2px; right: 2px; transition: opacity .15s; font-size: 11px; font-weight: 500; line-height: 1.3; color: #0a6b74; background: rgba(255,255,255,.92); border: 1px solid #b9dcdf; border-radius: 4px; padding: 1px 6px; max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 600px) { .etykieta { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .ramka { transition: none; } }
</style>
<div class="wrap">
  <header>
    <h1>Podgląd raportu</h1>
    <p>Strony raportu PDF i arkusz Excela wygenerowane z przykładowych wycen. Każda część raportu ma podpisaną ramkę. Zaznacz ramkę albo fragment i dodaj komentarz, wyślij go do Claude, a poprawiony podgląd pojawi się pod tym samym linkiem.</p>
    <ul class="kroki"><li>1. Najedź na część raportu</li><li>2. Dodaj komentarz i wyślij do Claude</li><li>3. Odśwież po chwili</li></ul>
    <div class="meta">Kalkulator w wersji ${esc(wersja)} · wygenerowano ${esc(new Date().toLocaleString("pl-PL"))} · Excel przeliczony w LibreOffice, więc liczby mają zapis 800,611 zamiast 800 611</div>
  </header>
  ${dokumenty.map((d, di) => `<section><h2>${esc(d.tytul)}</h2>${d.strony.map((p, si) => strona(p, di, si)).join("")}</section>`).join("\n  ")}
</div>`;
}
