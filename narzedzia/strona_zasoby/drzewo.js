// Interaktywne drzewo: osoba w środku, przodkowie u góry, małżonkowie i dzieci u dołu (dane: window.DRZEWO).
(function () {
  var D = window.DRZEWO, P = D.P, R = D.R, M = D.M, DZ = {};
  Object.keys(R).forEach(function (c) { R[c].forEach(function (p) { (DZ[p] = DZ[p] || []).push(c); }); });
  var cel = document.getElementById('drzewo'), wybor = document.getElementById('wybor'), glebiej = document.getElementById('glebiej');
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function rodzice(i) { return R[i] || []; }
  function sporni(lista) {  // >2 rodziców albo dwoje tej samej płci = przekazy sprzeczne
    if (lista.length > 2) return true;
    return lista.length === 2 && P[lista[0]].s === P[lista[1]].s;
  }
  function karta(i, klasa) {
    var o = P[i]; if (!o) return '';
    return '<div class="os-k ' + (o.s || '') + ' ' + (klasa || '') + '" data-id="' + esc(i) + '">' +
      '<a href="osoba-' + esc(i) + '.html">' + esc(o.n) + '</a>' + (o.l ? '<span class="lata">' + esc(o.l) + '</span>' : '') + '</div>';
  }
  function rzad(ids, et, klasa) {
    if (!ids.length) return '';
    return (et ? '<div class="pok-et">' + et + '</div>' : '') + '<div class="pok">' + ids.map(function (i) { return karta(i, klasa); }).join('') + '</div>';
  }
  function unik(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function rysuj(c) {
    if (!P[c]) { cel.innerHTML = '<p>Wybierz osobę z listy.</p>'; return; }
    var h = '', gl = glebiej.checked;
    var rp = rodzice(c), dziadkowie = [], pradziadkowie = [];
    rp.forEach(function (p) { dziadkowie = dziadkowie.concat(rodzice(p)); });
    dziadkowie = unik(dziadkowie);
    if (gl) { dziadkowie.forEach(function (p) { pradziadkowie = pradziadkowie.concat(rodzice(p)); }); pradziadkowie = unik(pradziadkowie); }
    if (gl) h += rzad(pradziadkowie, 'Pradziadkowie');
    h += rzad(dziadkowie, 'Dziadkowie');
    h += rzad(rp, 'Rodzice', sporni(rp) ? 'spor' : '');
    var rodz = [];
    rp.forEach(function (p) { (DZ[p] || []).forEach(function (s) { if (s !== c) rodz.push(s); }); });
    rodz = unik(rodz);
    h += '<div class="pok-et">Osoba</div><div class="pok">' + karta(c, 'srodek') + '</div>';
    if (rodz.length) h += rzad(rodz, 'Rodzeństwo');
    var dz = DZ[c] || [], uzyte = {}, bloki = '';
    (M[c] || []).forEach(function (s) {
      var wsp = dz.filter(function (d) { return rodzice(d).indexOf(s) >= 0; });
      wsp.forEach(function (d) { uzyte[d] = 1; });
      bloki += '<div class="para"><div class="pok-et">Małżonek / małżonka</div><div class="pok">' + karta(s) + '</div>' +
        (wsp.length ? rzad(wsp, 'Dzieci') : '') + (gl ? wnuki(wsp) : '') + '</div>';
    });
    var reszta = dz.filter(function (d) { return !uzyte[d]; });
    if (reszta.length) bloki += '<div class="para"><div class="pok-et">Dzieci (w tych przekazach podany tylko ten rodzic)</div>' +
      rzad(reszta) + (gl ? wnuki(reszta) : '') + '</div>';
    if (bloki) h += '<div class="rodz">' + bloki + '</div>';
    cel.innerHTML = h;
    document.title = P[c].n + ' — drzewo — Radoszewscy herbu Oksza';
  }
  function wnuki(dzieci) {
    var w = [];
    dzieci.forEach(function (d) { w = w.concat(DZ[d] || []); });
    return w.length ? rzad(unik(w), 'Wnuki') : '';
  }
  function zHasha() { return decodeURIComponent(location.hash.slice(1)) || 'radoszewski-jerzy-1902'; }
  cel.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var k = e.target.closest('.os-k');
    if (k) location.hash = k.dataset.id;
  });
  wybor.addEventListener('change', function () {
    var opt = Array.prototype.find.call(document.querySelectorAll('#lista option'), function (o) { return o.value === wybor.value; });
    if (opt) { location.hash = opt.dataset.id; wybor.value = ''; }
  });
  glebiej.addEventListener('change', function () { rysuj(zHasha()); });
  window.addEventListener('hashchange', function () { rysuj(zHasha()); window.scrollTo(0, 0); });
  rysuj(zHasha());
})();
