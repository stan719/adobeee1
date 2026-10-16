// Wyszukiwarka pełnotekstowa po stronie przeglądarki (indeks: dane-szukaj.js).
(function () {
  function norm(t) { return t.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  var TYPY = {o: 'osoba', m: 'miejsce', f: 'fakt', s: 'źródło'}, WAGA = {o: 0, m: 1, f: 2, s: 3};
  var pole = document.getElementById('q'), wyn = document.getElementById('wyniki');
  function podswietl(tekst, slowa) {
    var t = esc(tekst), n = norm(tekst);
    // podświetlenie po pozycjach w tekście znormalizowanym (ta sama długość dla polskich znaków)
    var zakresy = [];
    slowa.forEach(function (s) { var i = n.indexOf(s); if (i >= 0 && n.length === tekst.length) zakresy.push([i, i + s.length]); });
    if (!zakresy.length) return t;
    zakresy.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', p = 0;
    zakresy.forEach(function (z) { if (z[0] < p) return; out += esc(tekst.slice(p, z[0])) + '<mark>' + esc(tekst.slice(z[0], z[1])) + '</mark>'; p = z[1]; });
    return out + esc(tekst.slice(p));
  }
  function szukaj() {
    var q = norm(pole.value.trim());
    history.replaceState(null, '', '?q=' + encodeURIComponent(pole.value.trim()));
    if (q.length < 2) { wyn.innerHTML = ''; return; }
    var slowa = q.split(/\s+/).filter(Boolean);
    var traf = window.INDEKS.filter(function (e) { return slowa.every(function (s) { return e[4].indexOf(s) >= 0; }); });
    traf.sort(function (a, b) {
      var wa = WAGA[a[0]] - (norm(a[1]).indexOf(slowa[0]) === 0 ? .5 : 0), wb = WAGA[b[0]] - (norm(b[1]).indexOf(slowa[0]) === 0 ? .5 : 0);
      return wa - wb;
    });
    var licz = {}; traf.forEach(function (e) { licz[e[0]] = (licz[e[0]] || 0) + 1; });
    var h = '<p class="drobne">Znaleziono: ' + traf.length + ' (' + Object.keys(licz).map(function (k) { return TYPY[k] + ' ' + licz[k]; }).join(', ') + ')' +
      (traf.length > 300 ? ' — pokazano pierwsze 300' : '') + '</p>';
    traf.slice(0, 300).forEach(function (e) {
      h += '<div class="w"><span class="typ">' + TYPY[e[0]] + '</span><a href="' + esc(e[3]) + '">' + podswietl(e[1], slowa) + '</a> ' +
        (e[2] ? '<span class="drobne">' + esc(e[2]) + '</span>' : '') + '</div>';
    });
    wyn.innerHTML = h;
  }
  var p = new URLSearchParams(location.search).get('q');
  if (p) pole.value = p;
  pole.addEventListener('input', szukaj);
  szukaj();
})();
