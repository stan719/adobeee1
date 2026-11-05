// Przykładowe oferty w wersji B (Word) dla różnych urządzeń: node oferta_word_b_przyklady.cjs [katalog]
const fs = require("fs"), path = require("path");
const D = require("docx"), E = require("./nk38-engine.js"), X = require("./nk38-export.js");
const { ofertaB } = require("./oferta_word_b.cjs");
const logo = { data: fs.readFileSync(path.join(__dirname, "logo.png")), w: 232, h: 58 };
const szablony = E.szablonyWbudowane();
const adr = { zwrot: "Szanowny Pan", imie: "Jan Przykładowy", stanowisko: "Kierownik Budowy", tel: "+48 500 000 000", email: "jan.przykladowy@example.com", firma: "Przykładowy Inwestor Sp. z o.o.", ulica: "ul. Testowa 1", kod: "00-001 Warszawa", nip: "000-000-00-00" };
const PRZ = [
  ["NK38_Lipowa", "nk38", { nazwa: "ul. Lipowa 12, Kraków", lok: "Kraków", S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3, agr3: 1, agr6: 2, agrOpis: "1A3+2A4", barierki: 12, maskownice: 2, tir: 3, tir_cena: 1600, rozl_cena: 1500 }, { q2500: true, slupki37: true }],
  ["NK41_Lesna", "nk41", { nazwa: "ul. Leśna 5, Wrocław", km: 270, S: 23, agregaty: 6, agr3: 4, agr6: 2, przeswit: 280, dlMiejsca: 400, dopB: 1000 }, { q2500: true, slupki37: true }],
  ["NKPXLH_Kwiatowa", "nkpxlh", { nazwa: "ul. Kwiatowa 24, Piastów", km: 310, S: 18, agregaty: 3, przeswit: 340, dlMiejsca: 500, agrOpis: "3xA3" }, { q2500: true }],
  ["NK6501_Ogrodowa", "nk6501", { nazwa: "ul. Ogrodowa 8, Warszawa", km: 300, S: 6, przeswit: 215, utr_dod: 2, poz: { mufas: 19900 } }, {}],
  ["Laczona_NK38_NK41", "nk38", { nazwa: "ul. Brzozowa 9, Poznań", km: 460, S: 4, D: 6, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 2, barierki: 6, tir_cena: 4500, rozl_cena: 2000, dodatkowe: [{ szablon: "nk41", S: 12, agr3: 2, agr6: 1, przeswit: 280, dlMiejsca: 400 }] }, {}]
];
(async () => {
  const out = path.resolve(process.argv[2] || path.join(__dirname, "..", "przyklady")); fs.mkdirSync(out, { recursive: true });
  for (const [plik, id, dd, opcje] of PRZ) {
    const sz = szablony.find((s) => s.id === id), dane = Object.assign(E.domyslneDane(), sz.domyslne, { szablon: id }, dd);
    const r = E.oblicz(dane, sz, szablony), o = Object.assign(X.domyslnaOferta(), { nr: "12/11/2026", nrAuto: "12/11/2026", adr }), F0 = r;
    o.opcje = Object.assign({}, o.opcje, { q2500: false, slupki37: false, malowanie: false }, opcje);
    const F = X.oferta(r, o, X.SZABLON);
    const doc = ofertaB(F, { D, logo, inwestycja: dane.nazwa, urz: r.razem.platformy, mp: r.razem.MP });
    fs.writeFileSync(path.join(out, "Oferta_B_" + plik + ".docx"), await D.Packer.toBuffer(doc));
  }
  console.log("zapisano " + PRZ.length + " ofert w wersji B w " + out);
})().catch((e) => { console.error(e); process.exit(1); });
