/* Silnik obliczeń NK38 - port 1:1 z model_nk38.py (ta sama logika co Excel v1).
   Działa w przeglądarce (window.NK38) i w Node (module.exports). */
(function (root) {
  "use strict";

  var GLEBOKOSCI = [175, 180, 185, 190, 195, 200, 210, 220, 225];
  var WARIANTY = ["2000 kg", "2500 kg", "2000 kg + słupki", "2500 kg + słupki"];
  var OSOBY_ANALIZA = [2, 3, 4, 5, 6, 7];

  var CENNIK = {
    cena_D: 32500, doplata_NK37: 700, wsp_S: 0.61, wsp_NP: 0.85, q2500: 0.07,
    szer_260: 1170, szer_270: 1560, szer_520: 1820, szer_540: 3110,
    dl_500: 2340, dl_wsp: 0.00127,
    gl_doplata: { 175: 0, 180: 500, 185: 550, 190: 600, 195: 650, 200: 700, 210: 750, 220: 800, 225: 850 },
    agregat: 6500, olej: 1500, hydr_drobne: 200, transp_agregatu: 500, transp_silownikow: 50,
    sil_1700: 1080, sil_2000: 1175, sil_2250: 1250,
    magistrala: 0.2 * 11 + 0.4 * 11 + 2 * 14 + 6 * 11 + 6 * 5 + 6 * 10,
    barierka: 600, maskownica: 700, skrzynka_zasil: 1000, admin: 1800,
    mal_S: 6400, mal_D: 13500, mal_bar: 200, slupek: 1700, slupek22: 6300, slupek_rbd: 0.37,
    osd_S: 5.5, osd_D: 7, osd_NP: 7, osd_magistrala: 0.5, osd_barierka: 0.5,
    rozl_TIR: 0.5, dzwig: 2400, dzwig_D: 5, dzwig_wspS: 0.6,
    dni_tydzien: 5, km_montaz_dodatek: 50, km_krakow: 20, km_dzien: 650,
    spalanie: 12, paliwo: 9.4, pomiary_osoby: 1, odbiory_osoby: 2,
    stawka_1: 500, stawka_2: 400, stawka_kolejna: 350, dieta: 45, hotel: 130,
    kob: 0.005, gdw: 0.025, podatek: 0.14,
    konserw: [40, 45, 50]
  };

  /* Składowe na 1 platformę [S, D] w grupach - jak tabela w Cenniku Excela. */
  function skladowe() {
    var drobne = 2 * 3.3 + 2 * 10.8 + 2 * 10.95 + 2 * 3.81 + 4 * 2.84 + 4 * 4.4 +
      (2 * 25.71 + 2 * 22.85) + (3.09 + 4.99) * 20 + 5.4;
    var wsp = drobne + (4.8 * 2 * 45 + 4 * 8 + 2 * 36 + 2 * 90) + (2 * 207.28 + 2 * 40.14) + 300 + 40;
    return {
      Mechanika: [wsp + 345 + 2.98 * 110, wsp + 546 + 2.98 * 208],
      Hydraulika: [172 + 240, 207 + 240],
      Elektryka: [90 + 92 + 170, 90 + 112 + 170]
    };
  }

  function ceil(x) { return Math.ceil(Math.round(x * 1e9) / 1e9); }
  function ceilTo(x, step) { return ceil(x / step) * step; }
  function num(v, d) { return v === null || v === undefined || v === "" || isNaN(v) ? (d || 0) : Number(v); }
  function opt(v) { return v === null || v === undefined || v === "" || isNaN(v) ? null : Number(v); }
  function sumObj(o) { var s = 0; for (var k in o) s += num(o[k]); return s; }

  function domyslneDane() {
    return {
      nazwa: "", data: "", nr: "", opis: "",
      lok: "Poza Krakowem", km: 0, km_pom: null, km_mon: null,
      typ: "NK38", S: 0, D: 0, NP: 0, agregaty: 0, magistrala: 0, barierki: 0, maskownice: 0, utr_dod: 0,
      gl_S: {}, gl_D: {},
      szer1_S: 0, szer2_S: 0, szer1_D: 0, szer2_D: 0,
      dl500_S: 0, dl540_S: 0, dl550_S: 0, dl500_D: 0, dl540_D: 0, dl550_D: 0,
      tir: 0, tir_cena: 0, rozl_cena: 0, rozl_dni: null,
      osoby: 4, wyjazdy: null, wzor: "stary",
      zysk: 0.14, zysk2: 0.10, q2500: null, eur: 4.325, analiza: 0
    };
  }

  function materialy(d, c) {
    var S = num(d.S), D = num(d.D), NP = num(d.NP), DN = D + NP;
    var cenaD = c.cena_D + (d.typ === "NK37" ? c.doplata_NK37 : 0);
    var cenaS = c.wsp_S * cenaD, cenaNP = c.wsp_NP * cenaD;
    var platformy = S + D + NP, mp = 2 * S + 2 * NP + 4 * D;
    var glS = 0, glD = 0, sil2000 = 0, sil2250 = 0;
    GLEBOKOSCI.forEach(function (cm) {
      var s = num(d.gl_S[cm]), dd = num(d.gl_D[cm]);
      glS += s * c.gl_doplata[cm];
      glD += dd * c.gl_doplata[cm];
      if (cm <= 200) sil2000 += s + dd; else sil2250 += s + dd;
    });
    var platS = cenaS * S + c.szer_260 * num(d.szer1_S) + c.szer_270 * num(d.szer2_S) + glS +
      c.dl_500 * num(d.dl500_S) + ceilTo(cenaS * c.dl_wsp * 10, 100) * num(d.dl540_S) +
      ceilTo(cenaS * c.dl_wsp * 20, 100) * num(d.dl550_S);
    var platD = cenaD * D + c.szer_520 * num(d.szer1_D) + c.szer_540 * num(d.szer2_D) + glD +
      c.dl_500 * num(d.dl500_D) + cenaD * c.dl_wsp * 10 * num(d.dl540_D) + cenaD * c.dl_wsp * 20 * num(d.dl550_D);
    var platNP = cenaNP * NP;
    var silStd = platformy - sil2000 - sil2250;
    var sk = skladowe();
    function grupa(g) { return sk[g][0] * S + sk[g][1] * DN; }
    var A = num(d.agregaty);
    var hydraulika = A * (c.agregat + c.hydr_drobne + c.olej + c.transp_agregatu) + platformy * c.transp_silownikow +
      2 * (c.sil_1700 * silStd + c.sil_2000 * sil2000 + c.sil_2250 * sil2250) +
      num(d.magistrala) * c.magistrala + grupa("Hydraulika");
    var barierki = c.barierka * num(d.barierki) + c.maskownica * num(d.maskownice);
    var elektryka = A * c.skrzynka_zasil + grupa("Elektryka");
    var mechanika = A * c.admin + grupa("Mechanika");
    var suma = platS + platD + platNP + hydraulika + barierki + elektryka + mechanika;
    var q = opt(d.q2500) === null ? c.q2500 : Number(d.q2500);
    var utrAuto = ceil(num(d.magistrala) * c.osd_magistrala + (num(d.barierki) + num(d.maskownice)) * c.osd_barierka);
    return {
      cenaD: cenaD, cenaS: cenaS, cenaNP: cenaNP, platformy: platformy, MP: mp,
      platS: platS, platD: platD, platNP: platNP,
      sil: { std: silStd, s2000: sil2000, s2250: sil2250 },
      hydraulika: hydraulika, barierki: barierki, elektryka: elektryka, mechanika: mechanika,
      suma2000: suma, suma2500: suma * (1 + q), q2500: q,
      malowanie: c.mal_S * S + c.mal_D * DN + c.mal_bar * num(d.barierki),
      utrAuto: utrAuto, utr: utrAuto + num(d.utr_dod)
    };
  }

  function stawkaSrednia(n, c) {
    return (c.stawka_1 + (n >= 2 ? c.stawka_2 : 0) + Math.max(0, n - 2) * c.stawka_kolejna) / n;
  }

  function czasPodrozy(km, n, wzor, c) {
    if (wzor === "uproszczony") return 2 * km / c.km_dzien * n;
    return (1 + 0.1 * Math.max(0, 800 - km) / 100) * km * n / 500;
  }

  function wspolne(d, c) {
    var krk = d.lok === "Kraków";
    var kmPom = opt(d.km_pom) !== null ? Number(d.km_pom) : (krk ? c.km_krakow : num(d.km));
    var kmMon = opt(d.km_mon) !== null ? Number(d.km_mon) : (krk ? c.km_krakow : num(d.km) + c.km_montaz_dodatek);
    var rozl = opt(d.rozl_dni) !== null ? Number(d.rozl_dni) : c.rozl_TIR * num(d.tir);
    var DN = num(d.D) + num(d.NP);
    return {
      krk: krk, kmPom: kmPom, kmMon: kmMon, rozl: rozl,
      podrPom: (c.pomiary_osoby + c.odbiory_osoby) * czasPodrozy(kmPom, 1, d.wzor, c),
      dzwDni: ceil(DN / c.dzwig_D + num(d.S) * c.dzwig_wspS / c.dzwig_D)
    };
  }

  function montaz(d, c, m, w, q, sl, osoby) {
    var S = num(d.S), D = num(d.D), NP = num(d.NP);
    var os = Math.max(1, osoby), st = stawkaSrednia(os, c);
    var osd = c.osd_S * S + c.osd_D * D + c.osd_NP * NP + m.utr + (sl ? c.slupek_rbd * m.MP : 0);
    function podroze(wyj) { return w.podrPom + os * (w.rozl + czasPodrozy(w.kmMon, wyj, d.wzor, c)); }
    function zDni(dni) { return w.krk ? dni : ceil(dni / c.dni_tydzien); }
    var wyj = 1, iteracje = [];
    for (var i = 0; i < 5; i++) { wyj = zDni(ceil((osd + podroze(wyj)) / os)); iteracje.push(wyj); }
    if (opt(d.wyjazdy) !== null) wyj = Number(d.wyjazdy);
    var podr = podroze(wyj), osdAll = osd + podr, dni = ceil(osdAll / os);
    var km = 2 * (w.kmMon * wyj + 2 * w.kmPom);
    var k = {
      urzadzenia: q ? m.suma2500 : m.suma2000,
      slupki: sl ? c.slupek * m.MP : 0,
      paliwo: km / 100 * ceil(c.spalanie * c.paliwo),
      hotel: w.krk ? 0 : c.hotel * (dni + 1) * os,
      transport: num(d.tir_cena) * num(d.tir),
      dzwig: c.dzwig * w.dzwDni,
      rozladunek_sprzet: num(d.rozl_cena) * num(d.tir),
      rozladunek_ludzie: st * w.rozl * os,
      dojazdy: st * (podr - os * w.rozl),
      montaz: wyj > 0 ? st * osd : 0,
      diety: w.krk ? 0 : c.dieta * osdAll
    };
    var robocizna = k.rozladunek_ludzie + k.dojazdy + k.montaz + k.diety;
    var baza = 0;
    for (var key in k) baza += k[key];
    function narzuty(b, zysk) {
      var brutto = b / (1 - (c.kob + c.gdw + zysk));
      return { brutto: brutto, podatek: c.podatek * (robocizna + brutto * (c.gdw + zysk)) };
    }
    var zysk = num(d.zysk), zysk2 = num(d.zysk2);
    var n = narzuty(baza, zysk), n2 = narzuty(baza, zysk2);
    var cena = n.brutto + n.podatek, cena2 = n2.brutto + n2.podatek;
    var tyg = w.krk ? ceil(dni / c.dni_tydzien) : wyj;
    return {
      osoby: os, stawka: st, osd: osd, iteracje: iteracje, wyjazdy: wyj, podroze: podr,
      osobodni: osdAll, dni: dni, km: km, koszty: k, baza: baza,
      kob: n.brutto * c.kob, gdw: n.brutto * c.gdw, zysk: n.brutto * zysk, podatek: n.podatek,
      cena: cena, koszt: cena - n.brutto * zysk, cenaMP: m.MP ? cena / m.MP : 0,
      cenaMPeur: m.MP ? cena / m.MP / num(d.eur, 4.325) : 0,
      cena2: cena2, zysk2: n2.brutto * zysk2, podatek2: n2.podatek, cenaMP2: m.MP ? cena2 / m.MP : 0,
      tygodnie: tyg, tygodnieZakres: [tyg, Math.max(tyg, Math.round(tyg * 1.25))],
      noclegi: w.krk ? 0 : (dni + 1) * os
    };
  }

  function ostrzezenia(d) {
    var w = [], S = num(d.S), D = num(d.D), NP = num(d.NP);
    if (sumObj(d.gl_S) > S || sumObj(d.gl_D) > D) w.push({ typ: "blad", tekst: "Więcej zagłębień niż platform." });
    if (num(d.szer1_S) + num(d.szer2_S) > S || num(d.szer1_D) + num(d.szer2_D) > D)
      w.push({ typ: "blad", tekst: "Więcej szerokości niestandardowych niż platform." });
    if (num(d.dl500_S) + num(d.dl540_S) + num(d.dl550_S) > S || num(d.dl500_D) + num(d.dl540_D) + num(d.dl550_D) > D)
      w.push({ typ: "blad", tekst: "Więcej długości niestandardowych niż platform." });
    if (S + D + NP === 0) w.push({ typ: "uwaga", tekst: "Brak platform." });
    else {
      if (num(d.agregaty) === 0) w.push({ typ: "uwaga", tekst: "Brak agregatów." });
      else if (num(d.agregaty) * 6 < S + D + NP) w.push({ typ: "uwaga", tekst: "Mniej niż 1 agregat na 6 platform." });
      if (num(d.tir) === 0) w.push({ typ: "uwaga", tekst: "Brak transportów TIR." });
    }
    if (d.lok !== "Kraków" && num(d.km) === 0) w.push({ typ: "uwaga", tekst: "Brak odległości od Krakowa." });
    return w;
  }

  function oblicz(dane, cennik) {
    var d = Object.assign(domyslneDane(), dane || {});
    if ((dane || {}).zysk2 === undefined && (dane || {}).zysk_min !== undefined) d.zysk2 = dane.zysk_min;
    var c = Object.assign({}, CENNIK, cennik || {});
    var m = materialy(d, c), w = wspolne(d, c), os = Math.max(1, num(d.osoby, 4));
    var warianty = WARIANTY.map(function (nazwa, i) {
      return Object.assign({ nazwa: nazwa }, montaz(d, c, m, w, i % 2 === 1, i >= 2, os));
    });
    var a = Math.min(3, Math.max(0, num(d.analiza)));
    var analiza = OSOBY_ANALIZA.map(function (n) {
      return Object.assign({ n: n }, montaz(d, c, m, w, a % 2 === 1, a >= 2, n));
    });
    function mn(z) { return (1 + c.podatek * (c.gdw + z)) / (1 - (c.kob + c.gdw + z)); }
    var mnoznik = mn(num(d.zysk)), mnoznik2 = mn(num(d.zysk2));
    var sl37 = [warianty[2].cena - warianty[0].cena, warianty[3].cena - warianty[1].cena];
    var dop22 = (c.slupek22 - c.slupek) * m.MP * mnoznik;
    var sl37b = [warianty[2].cena2 - warianty[0].cena2, warianty[3].cena2 - warianty[1].cena2];
    var dop22b = (c.slupek22 - c.slupek) * m.MP * mnoznik2;
    return {
      dane: d, cennik: c, mat: m, wspolne: w, warianty: warianty,
      analiza: analiza, analizaWariant: WARIANTY[a],
      opcje: {
        slupki37: sl37, slupki22: [sl37[0] + dop22, sl37[1] + dop22],
        malowanie: m.malowanie * mnoznik,
        slupki37b: sl37b, slupki22b: [sl37b[0] + dop22b, sl37b[1] + dop22b],
        malowanieB: m.malowanie * mnoznik2
      },
      mnoznik: mnoznik, ostrzezenia: ostrzezenia(d)
    };
  }

  var api = {
    oblicz: oblicz, domyslneDane: domyslneDane, CENNIK: CENNIK, GLEBOKOSCI: GLEBOKOSCI,
    WARIANTY: WARIANTY, OSOBY_ANALIZA: OSOBY_ANALIZA, czasPodrozy: czasPodrozy, stawkaSrednia: stawkaSrednia
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NK38 = api;
})(this);
