// Pokrewieństwo dwóch osób: najbliższy wspólny przodek (obie linie) i najkrótszy łańcuch powiązań (także przez małżeństwa).
// Dane: window.DRZEWO (jak w drzewo.js). Adres: pokrewienstwo.html#<id> albo #<id1>,<id2>
(function () {
  var D = window.DRZEWO, P = D.P, F = D.F, S = D.S;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function nazwa(i) { return (P[i][0] + ' ' + P[i][1]).trim() || i; }
  function etyk(i) { return nazwa(i) + (P[i][2] ? ' (' + P[i][2] + ')' : ''); }
  function link(i) { return '<a href="osoba-' + esc(i) + '.html">' + esc(nazwa(i)) + '</a>' + (P[i][2] ? ' <span class="lata">(' + esc(P[i][2]) + ')</span>' : ''); }
  var poEtyk = {}, ids = Object.keys(P).sort(function (a, b) { return nazwa(a) < nazwa(b) ? -1 : 1; });
  ids.forEach(function (i) { poEtyk[etyk(i)] = i; });
  document.getElementById('lista-os').innerHTML = ids.map(function (i) { return '<option value="' + esc(etyk(i)) + '">'; }).join('');
  var A = document.getElementById('os-a'), B = document.getElementById('os-b'), wyn = document.getElementById('wynik-pokr');
  var DZ = {};
  Object.keys(F).forEach(function (c) { [F[c][0], F[c][1]].concat(F[c][2] || []).forEach(function (p) { if (p) (DZ[p] = DZ[p] || []).push(c); }); });
  function rodzice(i) { var f = F[i]; return f ? [f[0], f[1]].concat(f[2] || []).filter(Boolean) : []; }
  function plec(i, m, k, n) { return P[i][3] === 'm' ? m : P[i][3] === 'k' ? k : n; }

  function przodkowie(i) {             // id -> {d: pokolenia, nast: osoba bliżej i}
    var w = {}, kol = [i]; w[i] = {d: 0, nast: null};
    while (kol.length) {
      var x = kol.shift();
      rodzice(x).forEach(function (p) { if (!(p in w)) { w[p] = {d: w[x].d + 1, nast: x}; kol.push(p); } });
    }
    return w;
  }
  function linia(prz, od) { var w = [od]; while (prz[od].nast) { od = prz[od].nast; w.push(od); } return w; }   // od przodka w dół
  function okresl(a, b, dA, dB, liniaA, liniaB) {
    // kim jest A dla B
    var pra = function (k) { return k <= 0 ? '' : (k === 1 ? 'pra' : k === 2 ? 'prapra' : (k + '× pra')); };
    if (dA === 0 && dB === 0) return 'to ta sama osoba';
    if (dA === 0) return dB === 1 ? plec(a, 'ojcem', 'matką', 'rodzicem') : dB === 2 ? plec(a, 'dziadkiem', 'babką', 'dziadkiem/babką') :
      plec(a, pra(dB - 2) + 'dziadkiem', pra(dB - 2) + 'babką', pra(dB - 2) + 'dziadkiem');
    if (dB === 0) return dA === 1 ? plec(a, 'synem', 'córką', 'dzieckiem') : dA === 2 ? plec(a, 'wnukiem', 'wnuczką', 'wnukiem') :
      plec(a, pra(dA - 2) + 'wnukiem', pra(dA - 2) + 'wnuczką', pra(dA - 2) + 'wnukiem');
    if (dA === 1 && dB === 1) return plec(a, 'bratem', 'siostrą', 'rodzeństwem');
    if (dA === 1 && dB === 2) { var rB = liniaB[1]; return plec(a, P[rB][3] === 'm' ? 'stryjem (bratem ojca)' : 'wujem (bratem matki)', 'ciotką (siostrą ' + (P[rB][3] === 'm' ? 'ojca' : 'matki') + ')', 'rodzeństwem rodzica'); }
    if (dA === 2 && dB === 1) { var rA = liniaA[1]; return plec(a, P[rA][3] === 'm' ? 'bratankiem' : 'siostrzeńcem', P[rA][3] === 'm' ? 'bratanicą' : 'siostrzenicą', 'dzieckiem rodzeństwa'); }
    if (dA === 2 && dB === 2) return plec(a, 'bratem ciotecznym lub stryjecznym (kuzynem)', 'siostrą cioteczną lub stryjeczną (kuzynką)', 'kuzynem');
    if (dA === 1) return 'rodzeństwem ' + (dB - 1 === 2 ? 'dziadka lub babki' : (pra(dB - 3) + 'dziadka lub ' + pra(dB - 3) + 'babki'));
    if (dB === 1) { var rr = liniaA[1]; return plec(a, 'potomkiem', 'potomkinią', 'potomkiem') + ' ' + plec(rr, 'brata', 'siostry', 'rodzeństwa') + ' (w ' + (dA - 1) + '. pokoleniu)'; }
    return 'krewn' + plec(a, 'ym', 'ą', 'ym') + ' w linii bocznej: ' + (dA - 1) + '. i ' + (dB - 1) + '. pokolenie od wspólnych ' + (dA === dB ? 'przodków' : 'przodków') +
      ' (stopień pokrewieństwa wg prawa kanonicznego: ' + Math.max(dA, dB) + ', wg prawa cywilnego: ' + (dA + dB) + ')';
  }
  function lancuch(a, b) {             // najkrótsza ścieżka przez rodziców, dzieci i małżonków
    var prev = {}, kol = [a]; prev[a] = null;
    while (kol.length) {
      var x = kol.shift();
      if (x === b) break;
      var sas = [];
      rodzice(x).forEach(function (p) { sas.push([p, plec(p, 'ojciec', 'matka', 'rodzic')]); });
      (DZ[x] || []).forEach(function (c) { sas.push([c, plec(c, 'syn', 'córka', 'dziecko')]); });
      (S[x] || []).forEach(function (m) { sas.push([m, plec(m, 'mąż', 'żona', 'małżonek')]); });
      sas.forEach(function (e) { if (!(e[0] in prev)) { prev[e[0]] = [x, e[1]]; kol.push(e[0]); } });
    }
    if (!(b in prev)) return null;
    var w = [], y = b;
    while (prev[y]) { w.unshift([prev[y][0], prev[y][1], y]); y = prev[y][0]; }
    return w;
  }
  function licz() {
    var a = poEtyk[A.value.trim()], b = poEtyk[B.value.trim()];
    if (!a || !b) { wyn.innerHTML = '<p class="drobne">Wybierz obie osoby z listy podpowiedzi (zacznij pisać imię lub nazwisko).</p>'; return; }
    history.replaceState(null, '', '#' + a + ',' + b);
    var pa = przodkowie(a), pb = przodkowie(b), naj = null, wspolni = [];
    Object.keys(pa).forEach(function (x) {
      if (!(x in pb)) return;
      var sum = pa[x].d + pb[x].d;
      if (naj === null || sum < naj) { naj = sum; wspolni = [x]; } else if (sum === naj) wspolni.push(x);
    });
    var h = '<h2>' + link(a) + ' i ' + link(b) + '</h2>';
    if (wspolni.length) {
      var w = wspolni[0], dA = pa[w].d, dB = pb[w].d, lA = linia(pa, w), lB = linia(pb, w);
      h += '<p class="werdykt"><b>' + esc(nazwa(a)) + '</b> jest <b>' + esc(okresl(a, b, dA, dB, lA, lB)) + '</b> — względem osoby: ' + esc(nazwa(b)) + '.</p>';
      h += '<p>Najbliżs' + (wspolni.length > 1 ? 'i wspólni przodkowie' : 'zy wspólny przodek') + ': ' + wspolni.map(link).join(' i ') + '.</p>';
      if (dA && dB) {
        h += '<div class="dwie-linie"><ol>' + lA.map(function (x) { return '<li>' + link(x) + '</li>'; }).join('') + '</ol><ol>' +
          lB.map(function (x) { return '<li>' + link(x) + '</li>'; }).join('') + '</ol></div>';
      } else {
        var l = dA ? lA : lB;
        h += '<ol class="jedna-linia">' + l.map(function (x) { return '<li>' + link(x) + '</li>'; }).join('') + '</ol>';
      }
    } else {
      h += '<p class="werdykt">Według zgromadzonych źródeł te osoby <b>nie mają wspólnego przodka</b> — mogą być spowinowacone (przez małżeństwa).</p>';
    }
    var l2 = lancuch(a, b);
    if (l2 && l2.length) {
      h += '<h3>Najkrótszy łańcuch powiązań (' + l2.length + ' krok' + (l2.length === 1 ? '' : l2.length < 5 ? 'i' : 'ów') + ')</h3><ol class="lancuch"><li>' + link(a) + '</li>' +
        l2.map(function (e) { return '<li><span class="rel">' + esc(e[1]) + ' →</span> ' + link(e[2]) + '</li>'; }).join('') + '</ol>' +
        '<p class="drobne">Każdy krok: kim jest następna osoba dla poprzedniej.</p>';
    } else if (!wspolni.length) h += '<p>Nie znaleziono żadnego łańcucha powiązań w bazie.</p>';
    h += '<p><a class="przycisk maly" href="drzewo.html#rodzina:' + esc(a) + '">drzewo: ' + esc(nazwa(a)) + '</a> <a class="przycisk maly" href="drzewo.html#rodzina:' + esc(b) + '">drzewo: ' + esc(nazwa(b)) + '</a></p>';
    wyn.innerHTML = h;
  }
  document.getElementById('licz').addEventListener('click', licz);
  [A, B].forEach(function (e) { e.addEventListener('change', function () { if (A.value && B.value) licz(); }); });
  var h = decodeURIComponent(location.hash.slice(1)).split(',');
  if (h[0] && P[h[0]]) A.value = etyk(h[0]);
  if (h[1] && P[h[1]]) { B.value = etyk(h[1]); licz(); }
  else if (h[0] && P[h[0]]) { B.value = etyk('radoszewski-jerzy-1902' in P && h[0] !== 'radoszewski-jerzy-1902' ? 'radoszewski-jerzy-1902' : Object.keys(P)[0]); licz(); }
})();
