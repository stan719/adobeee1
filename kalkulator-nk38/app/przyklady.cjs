// Audyt i dane próbne: przykładowe wyceny dla każdego wbudowanego urządzenia (Excel, raport PDF, oferta Word)
// oraz kopia zapasowa z tymi wycenami do wczytania w aplikacji. Dane są zmyślone i oznaczone "PRZYKŁAD".
// Użycie: node przyklady.cjs   (pliki lądują w ../przyklady)
const fs = require("fs"), path = require("path"), assert = require("assert");
const E = require("./nk38-engine.js"), X = require("./nk38-export.js");
const { jsPDF } = require("jspdf"); const at = require("jspdf-autotable"); const autoTable = at.default || at;
X.setLibs({ ExcelJS: require("exceljs"), jsPDF, autoTable: (d, o) => autoTable(d, o), docx: require("docx") });
const font = (f) => fs.readFileSync(path.join(__dirname, "fonts", f)).toString("base64");
const fonts = { regular: font("Carlito-Regular.ttf"), bold: font("Carlito-Bold.ttf") };
const logo = { data: fs.readFileSync(path.join(__dirname, "logo.png")), w: 232, h: 58, type: "png" };
const szablony = E.szablonyWbudowane();
const P = [
  ["nk38", "PRZYKŁAD – ul. Lipowa 12, Kraków", { lok: "Kraków", S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3, barierki: 12, maskownice: 2, tir: 2, tir_cena: 1600, rozl_cena: 1500 }],
  ["nk38", "PRZYKŁAD – ul. Polna 5, Katowice", { km: 80, D: 20, gl_D: { 200: 20 }, h1: 200, h2: 205, dl: "540", przeswit: 390, agregaty: 4, magistrala: 6, barierki: 20, tir: 3, tir_cena: 2500, rozl_cena: 2000, dl540_D: 4 }],
  ["nk37", "PRZYKŁAD – ul. Słoneczna 3, Wrocław", { km: 270, S: 4, D: 8, h1: 185, h2: 190, dl: "520", przeswit: 350, agregaty: 2, barierki: 8, tir: 2, tir_cena: 3300, rozl_cena: 2500 }],
  ["nk6501", "PRZYKŁAD – ul. Ogrodowa 8, Warszawa", { km: 300, S: 6, przeswit: 215, utr_dod: 2, poz: { mufas: 19900 } }],
  ["nkpxlh", "PRZYKŁAD – ul. Kwiatowa 24, Piastów", { km: 310, S: 18, agregaty: 3, przeswit: 340, dlMiejsca: 500, agrOpis: "3xA3" }],
  ["nk41", "PRZYKŁAD – ul. Leśna 5, Wrocław", { km: 270, S: 23, agregaty: 6, przeswit: 280, dlMiejsca: 400 }]
];
const adr = { zwrot: "Szanowny Pan", imie: "Jan Przykładowy", stanowisko: "Kierownik Budowy", tel: "+48 500 000 000", email: "jan.przykladowy@example.com",
  firma: "Przykładowy Inwestor Sp. z o.o.", ulica: "ul. Testowa 1", kod: "00-001 Warszawa", nip: "000-000-00-00" };
const slug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
(async () => {
  const out = path.join(__dirname, "..", "przyklady"); fs.mkdirSync(out, { recursive: true });
  const wyceny = [], raport = [];
  for (const [id, nazwa, dd] of P) {
    const sz = szablony.find((s) => s.id === id);
    const dane = Object.assign(E.domyslneDane(), sz.domyslne, { szablon: id, nazwa: nazwa.replace("PRZYKŁAD – ", ""), data: "2026-10-21" }, dd);
    const r = E.oblicz(dane, sz), w = r.warianty[0], N = r.negocjacje;
    /* audyt: liczby skończone, sensowne relacje, drabinka malejąca */
    const liczby = [w.cena, w.cena2, w.koszt, w.zyskN, w.osobodni, r.mat.suma2000, N.cenaMin];
    liczby.forEach((v) => assert(Number.isFinite(v) && v >= 0, nazwa + ": nieprawidłowa liczba " + v));
    assert(w.cena > w.koszt && w.koszt > r.mat.suma2000, nazwa + ": cena > koszt rzeczywisty > urządzenia");
    assert(Math.abs(N.cenaA - w.cena) < 0.01, nazwa + ": drabinka zaczyna się od ceny ofertowej");
    N.wiersze.reduce((a, x) => { assert(x.cena <= a + 0.01, nazwa + ": drabinka nie maleje"); return x.cena; }, Infinity);
    assert(r.ostrzezenia.filter((a) => a.typ === "blad").length === 0, nazwa + ": błędy w danych " + JSON.stringify(r.ostrzezenia));
    const o = Object.assign(X.domyslnaOferta(), { nr: "PRZYKLAD/INK", adr });
    const F = X.oferta(r, o, X.SZABLON);
    const tekst = [F.wstep, F.pozycja].concat(F.tech, F.lista, F.wyposazenie, F.platnosci, F.zakres, F.warunki, F.gwarancja).join("\n");
    assert(!/\{[A-Za-z]+\}/.test(tekst), nazwa + ": niewypełnione pole w ofercie: " + (tekst.match(/\{[A-Za-z]+\}/) || [])[0]);
    assert(!/…/.test(F.tech.join(" ")), nazwa + ": brak wymiaru w danych technicznych");
    const ctx = { GLEBOKOSCI: sz.glebokosci.map((g) => g.cm), zestawienie: nazwa, uwagi: [], cennikPola: [["Montaż", null], ["hotel", "Hotel / doba / osoba", "zł"], ["dieta", "Dieta dzienna", "zł"]], cennikZmiany: {}, oferta: o, fonts };
    const plik = slug(nazwa.replace("PRZYKŁAD – ", "")) + "_" + sz.nazwa;
    fs.writeFileSync(path.join(out, "Kalkulator_" + plik + ".xlsx"), Buffer.from(await X.xlsx(r, ctx)));
    const pdf = Buffer.from(X.pdf(r, ctx)); fs.writeFileSync(path.join(out, "Raport_" + plik + ".pdf"), pdf);
    const strony = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert(strony <= 4, nazwa + ": raport ma " + strony + " stron");
    fs.writeFileSync(path.join(out, "Oferta_" + plik + ".docx"), await X.docx(r, o, X.SZABLON, logo, null));
    wyceny.push({ nazwa, kiedy: "21.10.2026, 12:00:00", ts: Date.parse("2026-10-21T10:00:00Z") + wyceny.length * 60000, cena: w.cena, dane: Object.assign({}, dd, dane, { oferta: o }) });
    raport.push([sz.nazwa, nazwa.replace("PRZYKŁAD – ", ""), Math.round(w.cena), Math.round(N.cenaB), Math.round(N.cenaMin), w.tygodnie, strony]);
  }
  fs.writeFileSync(path.join(out, "Kopia_zapasowa_przyklady.json"), JSON.stringify({ aplikacja: "kalkulator-nk38", wersja: 1, utworzono: new Date().toISOString(), szablony: [], wyceny }, null, 1));
  console.log("urządzenie | inwestycja | cena ofertowa | przy zysku 2 | próg | tyg. | str. PDF");
  raport.forEach((x) => console.log(x.join(" | ")));
  console.log("przykłady: OK (" + raport.length + " wycen, pliki w przyklady/)");
})().catch((e) => { console.error(e.message || e); process.exit(1); });
