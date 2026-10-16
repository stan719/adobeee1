// Całe drzewo: pokolenia od lewej do prawej (dane: window.CALE = {N: {id: [nazwa, lata, płeć, [małżonkowie], [dzieci], [uwagi]]}, T: [[korzeń, liczba]]}).
(function () {
  var N = window.CALE.N, T = window.CALE.T;
  var W = 230, GX = 46, GY = 10, KOL = W + GX;
  var plotno = document.getElementById('plotno'), okno = document.getElementById('cale');
  var wybor = document.getElementById('rod'), szukaj = document.getElementById('szukaj-os');
  var skala = 1, rozmiar = [0, 0];
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  // w którym drzewie jest osoba (także jako małżonek w ramce partnera)
  var gdzie = {}, ramka = {};
  // najpierw własne ramki (osoba w swoim rodzie), dopiero potem małżonkowie w ramkach partnerów
  [true, false].forEach(function (wlasne) {
    T.forEach(function (t) {
      (function chodz(i, byly) {
        if (byly[i]) return; byly[i] = 1;
        if (wlasne && !(i in gdzie)) { gdzie[i] = t[0]; ramka[i] = i; }
        if (!wlasne) N[i][3].forEach(function (s) { if (!(s in gdzie)) { gdzie[s] = t[0]; ramka[s] = i; } });
        N[i][4].forEach(function (c) { chodz(c, byly); });
      })(t[0], {});
    });
  });

  function wysokosc(i) { return 40 + 18 * N[i][3].length + 16 * N[i][5].length; }

  function uloz(korzen, y0) {
    var wezly = [], dno = {}, kursor = y0, byly = {};
    function przesun(w, d) { w.y += d; w.dz.forEach(function (c) { przesun(c, d); }); }
    function dnaPoddrzewa(w) { dno[w.g] = Math.max(dno[w.g] || 0, w.y + w.h + GY); w.dz.forEach(dnaPoddrzewa); }
    function rek(i, g) {
      if (byly[i]) return null; byly[i] = 1;
      var w = {id: i, g: g, h: wysokosc(i), dz: []};
      N[i][4].forEach(function (c) { var r = rek(c, g + 1); if (r) w.dz.push(r); });
      if (!w.dz.length) {
        w.y = Math.max(kursor, dno[g] || y0);
      } else {
        var a = w.dz[0], b = w.dz[w.dz.length - 1];
        w.y = (a.y + a.h / 2 + b.y + b.h / 2) / 2 - w.h / 2;
        var min = dno[g] || y0;
        if (w.y < min) { var d = min - w.y; przesun(w, d); w.dz.forEach(dnaPoddrzewa); }
      }
      dno[g] = w.y + w.h + GY;
      kursor = Math.max(kursor, w.y + w.h + GY);
      wezly.push(w);
      return w;
    }
    var k = rek(korzen, 0);
    var dol = y0;
    wezly.forEach(function (w) { dol = Math.max(dol, w.y + w.h); });
    return {wezly: wezly, dol: dol};
  }

  function rysuj(korzenie) {
    var html = '', linie = '', y = 0, maxG = 0;
    korzenie.forEach(function (k) {
      if (korzenie.length > 1) { html += '<div class="rod-tytul" style="top:' + y + 'px">' + esc(N[k][0]) + '</div>'; y += 34; }
      var u = uloz(k, y);
      u.wezly.forEach(function (w) {
        var o = N[w.id], x = w.g * KOL; maxG = Math.max(maxG, w.g);
        html += '<div class="wz ' + o[2] + '" id="w-' + esc(w.id) + '" style="left:' + x + 'px;top:' + w.y + 'px;height:' + w.h + 'px">' +
          '<a class="im" href="osoba-' + esc(w.id) + '.html" title="' + esc(o[0]) + '">' + esc(o[0]) + '</a>' +
          '<a class="rodz" href="drzewo-osoba.html#' + esc(w.id) + '" title="rodzina tej osoby">⤢</a>' +
          (o[1] ? '<span class="lata">' + esc(o[1]) + '</span>' : '') +
          o[3].map(function (s) {
            var inne = ramka[s] && ramka[s] === s && gdzie[s] !== k;
            return '<div class="mz">∞ <a href="osoba-' + esc(s) + '.html" title="' + esc(N[s][0]) + '">' + esc(N[s][0]) + '</a>' +
              (N[s][1] ? ' <span class="lata">' + esc(N[s][1]) + '</span>' : '') +
              (inne ? ' <a class="skok" href="#' + esc(s) + '" title="jej/jego ród">→</a>' : '') + '</div>';
          }).join('') +
          o[5].map(function (u) { return '<div class="alt">' + esc(u) + '</div>'; }).join('') + '</div>';
        w.dz.forEach(function (c) {
          var x1 = x + W, y1 = w.y + 20, x2 = c.g * KOL, y2 = c.y + 20, xm = x1 + GX / 2;
          linie += '<path d="M' + x1 + ' ' + y1 + 'H' + xm + 'V' + y2 + 'H' + x2 + '"/>';
        });
      });
      y = u.dol + 40;
    });
    rozmiar = [(maxG + 1) * KOL, y];
    plotno.innerHTML = '<svg class="linie" width="' + rozmiar[0] + '" height="' + rozmiar[1] + '">' + linie + '</svg>' + html;
    skaluj();
  }

  function skaluj() {
    plotno.style.transform = 'scale(' + skala + ')';
    plotno.style.width = rozmiar[0] + 'px'; plotno.style.height = rozmiar[1] + 'px';
    okno.style.setProperty('--w', rozmiar[0] * skala + 'px'); okno.style.setProperty('--h', rozmiar[1] * skala + 'px');
  }

  function pokaz(sel) {
    rysuj(sel === '*' ? T.filter(function (t) { return t[1] > 1; }).map(function (t) { return t[0]; }) : [sel]);
  }

  function znajdz(id) {
    if (!(id in gdzie)) return;
    if (wybor.value !== '*' && wybor.value !== gdzie[id]) { wybor.value = gdzie[id]; pokaz(gdzie[id]); }
    var el = document.getElementById('w-' + ramka[id]);
    if (!el) return;
    document.querySelectorAll('.wz.cel').forEach(function (e) { e.classList.remove('cel'); });
    el.classList.add('cel');
    var r = el.getBoundingClientRect(), o = okno.getBoundingClientRect();
    okno.scrollBy({left: r.left - o.left - o.width / 3, top: r.top - o.top - o.height / 3, behavior: 'smooth'});
    okno.scrollIntoView({block: 'nearest'});
  }

  wybor.addEventListener('change', function () { pokaz(wybor.value); okno.scrollTo(0, 0); });
  szukaj.addEventListener('change', function () {
    var opt = Array.prototype.find.call(document.querySelectorAll('#lista-os option'), function (o) { return o.value === szukaj.value; });
    if (opt) { location.hash = opt.dataset.id; szukaj.value = ''; }
  });
  document.querySelectorAll('.zoom button').forEach(function (b) {
    b.addEventListener('click', function () {
      var z = +b.dataset.z; skala = z === 0 ? 1 : Math.max(0.3, Math.min(1.6, skala * (z > 0 ? 1.25 : 0.8))); skaluj();
    });
  });
  window.addEventListener('hashchange', function () { znajdz(decodeURIComponent(location.hash.slice(1))); });
  var start = decodeURIComponent(location.hash.slice(1));
  if (start && gdzie[start]) wybor.value = gdzie[start];
  pokaz(wybor.value);
  if (start) setTimeout(function () { znajdz(start); }, 50);
})();
