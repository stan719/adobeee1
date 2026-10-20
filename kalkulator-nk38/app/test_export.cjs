// Generuje Excel, raport PDF i ofertę Word dla przykładów WAW i KRK; raport PDF musi mieć maks. 4 strony.
// Użycie: npm install && npm test   (pliki lądują w ./out)
const fs = require("fs"), path = require("path");
const E = require("./nk38-engine.js"), X = require("./nk38-export.js");
const { jsPDF } = require("jspdf"); const at = require("jspdf-autotable"); const autoTable = at.default || at;
X.setLibs({ ExcelJS: require("exceljs"), jsPDF, autoTable: (d, o) => autoTable(d, o), docx: require("docx") });
const font = (f) => fs.readFileSync(path.join(__dirname, "fonts", f)).toString("base64");
const ctx = { GLEBOKOSCI: E.GLEBOKOSCI, zestawienie: "Zestawienie testowe ąęłńóśźż", uwagi: ["Uwaga testowa"],
  cennikPola: [["Platformy", null], ["cena_D", "Platforma D", "zł"], ["wsp_S", "Cena S jako część ceny D", "×"]], cennikZmiany: {}, oferta: {}, fonts: { regular: font("Carlito-Regular.ttf"), bold: font("Carlito-Bold.ttf") } };
const PRZYKLADY = {
  waw: { nazwa: "ul. Kasprowicza 18 Warszawa", data: "2026-10-14", h1: 195, h2: 202, dl: "530-584", przeswit: 380, lok: "Poza Krakowem", km: 280, D: 15, agregaty: 3, magistrala: 4, barierki: 30, maskownice: 5, gl_D: { 200: 15 }, tir: 3, tir_cena: 4000, rozl_cena: 5100, osoby: 4 },
  krk: { nazwa: "ul. Dekerta Kraków", data: "2026-10-15", h1: 220, h2: 225, dl: "530", przeswit: 392, lok: "Kraków", S: 12, D: 27, agregaty: 7, magistrala: 32, barierki: 58, maskownice: 4, gl_S: { 225: 12 }, gl_D: { 225: 27 }, tir: 6, tir_cena: 1800, rozl_cena: 3000, osoby: 5 }
};
(async () => {
  const out = path.join(__dirname, "out"); fs.mkdirSync(out, { recursive: true });
  for (const [k, d] of Object.entries(PRZYKLADY)) {
    const r = E.oblicz(d);
    fs.writeFileSync(path.join(out, k + ".xlsx"), Buffer.from(await X.xlsx(r, ctx)));
    const pdf = Buffer.from(X.pdf(r, ctx)); fs.writeFileSync(path.join(out, k + ".pdf"), pdf);
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    if (pages > 4) throw new Error(k + ": raport ma " + pages + " stron");
    const o = Object.assign(X.domyslnaOferta(), { nr: "TEST/INK", opcje: { q2500: true, slupki37: true },
      adr: { zwrot: "Szanowna Pani", imie: "Anna Nowak", stanowisko: "Specjalista ds. wycen", tel: "+48 500 600 700", email: "anna@firma.pl", firma: "Firma S.A.", ulica: "ul. Opolska 110", kod: "31-323 Kraków", nip: "" } });
    const logo = { data: fs.readFileSync(path.join(__dirname, "logo.png")), w: 232, h: 58, type: "png" };
    const podpisPlik = process.env.PODPIS && fs.existsSync(process.env.PODPIS) ? { data: fs.readFileSync(process.env.PODPIS), w: 180, h: 47, type: "jpg" } : null;
    fs.writeFileSync(path.join(out, k + ".docx"), await X.docx(r, o, X.SZABLON, logo, podpisPlik));
    console.log(k, "ok, raport PDF:", pages, "str., ceny oferty:", X.oferta(r, o, X.SZABLON).ceny.map((c) => c.kwota).join(" / "));
  }
})().catch((e) => { console.error(e); process.exit(1); });
