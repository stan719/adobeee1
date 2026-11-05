// Kontrola struktury oferty Word w wersji B pod kątem Worda: stały układ tabel, spójne siatki kolumn, brak cieniowania runów i pisma poniżej 8,5 pkt.
const fs = require("fs"), path = require("path"), os = require("os"), assert = require("assert"), { execFileSync } = require("child_process");
const D = require("docx"), E = require("./nk38-engine.js"), X = require("./nk38-export.js");
const { ofertaB } = require("./oferta_word_b.cjs");
const logo = { data: fs.readFileSync(path.join(__dirname, "logo.png")), w: 232, h: 58 };
const szt = E.szablonyWbudowane();
(async () => {
  for (const [id, dd] of [["nk38", { S: 6, D: 10, h1: 190, h2: 195, dl: "530", przeswit: 360, agregaty: 3 }], ["nk41", { S: 12, agregaty: 3, przeswit: 280 }], ["nk6501", { S: 4, przeswit: 215 }]]) {
    const sz = szt.find((s) => s.id === id), r = E.oblicz(Object.assign(E.domyslneDane(), sz.domyslne, { szablon: id, nazwa: "ul. Testowa 1, Kraków" }, dd), sz, szt);
    const F = X.oferta(r, Object.assign(X.domyslnaOferta(), { nr: "1/2026", opcje: { q2500: true, slupki37: true } }), X.SZABLON);
    const plik = path.join(os.tmpdir(), "ofertaB_" + id + ".docx"); fs.writeFileSync(plik, await D.Packer.toBuffer(ofertaB(F, { D, logo, inwestycja: "ul. Testowa 1, Kraków" })));
    const xml = execFileSync("unzip", ["-p", plik, "word/document.xml"], { maxBuffer: 1e8 }).toString();
    const tabele = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
    assert(tabele.length > 0, id + ": brak tabel");
    tabele.forEach((t, i) => {
      assert(/<w:tblLayout w:type="fixed"\/>/.test(t), id + ": tabela " + i + " bez stałego układu");
      const tblW = +(t.match(/<w:tblW [^>]*w:w="(\d+)"/) || [])[1], kol = (t.match(/<w:gridCol w:w="(\d+)"/g) || []).map((x) => +x.match(/\d+/)[0]);
      assert.strictEqual(kol.reduce((a, b) => a + b, 0), tblW, id + ": tabela " + i + " ma siatkę ≠ szerokość tabeli");
      assert(kol.every((w) => w >= 900), id + ": tabela " + i + " ma kolumnę węższą niż 900 twips (kolumna-odstęp): " + kol.join(","));
    });
    assert(!/<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<w:shd /.test(xml), id + ": cieniowanie pojedynczych runów");
    const rozm = (xml.match(/<w:sz w:val="(\d+)"/g) || []).map((x) => +x.match(/\d+/)[0]);
    assert(Math.min.apply(null, rozm.filter((z) => z > 8)) >= 17, id + ": pismo mniejsze niż 8,5 pkt");
    console.log("  ok oferta B (" + id + "): " + tabele.length + " tabel, stały układ, siatki spójne");
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
