// Drzewo genealogiczne — potomkowie / przodkowie / rodzina; wykres całego drzewa naraz (przesuwanie, powiększanie, mapka)
// i lista z numeracją (do druku). Dane: window.DRZEWO = {P: {id: [imiona, nazwisko, lata, płeć]}, F: {dziecko: [ojciec, matka,
// [rodzice wg innego przekazu]]}, S: {id: [małżonkowie]}, R: [[protoplasta, ród, liczba potomków]], Y: [[osoba, liczba przodków]]}.
// Adres: drzewo.html#potomkowie:<id> | #przodkowie:<id> | #rodzina:<id>
(function () {
  var D = window.DRZEWO, P = D.P, F = D.F, S = D.S;
  var W = 184, GX = 14, GY = 46, LH = 15, PAD = 40, ETYK = 64;
  var wykres = document.getElementById('wykres'), swiat = document.getElementById('swiat');
  var lista = document.getElementById('lista'), panel = document.getElementById('panel');
  var mini = document.getElementById('mini'), opis = document.getElementById('opis-drzewa');
  var wybor = document.getElementById('wybor-rodu'), znajdz = document.getElementById('znajdz');
  var stan = {tryb: 'potomkowie', id: D.R.length ? D.R[0][0] : Object.keys(P)[0], widok: 'wykres'};
  var zwiniete = {}, wezly = [], gdzie = {}, swiatW = 0, swiatH = 0, tx = 0, ty = 0, s = 1;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function nazwa(i) { return (P[i][0] + ' ' + P[i][1]).trim() || i; }
  function rokUr(i) { var m = /^(\d{3,4})/.exec(P[i][2] || ''); return m ? +m[1] : 9999; }
  function rzym(n) { var w = '', t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; t.forEach(function (p) { while (n >= p[0]) { w += p[1]; n -= p[0]; } }); return w; }

  // dzieci: [id, czy wg innego przekazu]
  var DZ = {};
  Object.keys(F).forEach(function (c) {
    var f = F[c];
    [f[0], f[1]].concat(f[2] || []).forEach(function (p, k) { if (p) (DZ[p] = DZ[p] || []).push([c, k >= 2]); });
  });
  Object.keys(DZ).forEach(function (p) { DZ[p].sort(function (a, b) { return rokUr(a[0]) - rokUr(b[0]) || (nazwa(a[0]) < nazwa(b[0]) ? -1 : 1); }); });

  // ---------------------------------------------------------------- budowa drzewa (węzły)
  function potomkowie(korzen) {
    var widz = {}, odlozone = [];
    function bud(i, alt) {
      var n = {id: i, kids: [], alt: alt, stub: !!widz[i], mz: S[i] || []};
      if (n.stub) return n;
      widz[i] = 1;
      n.ileDzieci = (DZ[i] || []).length;
      if (zwiniete[i]) return n;
      (DZ[i] || []).forEach(function (c) {
        if (c[1]) { var z = {id: c[0], kids: [], alt: true, stub: true, mz: S[c[0]] || [], odl: true}; odlozone.push(z); n.kids.push(z); }
        else n.kids.push(bud(c[0], false));
      });
      return n;
    }
    var k = bud(korzen, false);
    // dziecko tylko „wg innego przekazu” pod tym rodzicem, a nigdzie indziej w drzewie — rozwijamy tutaj
    odlozone.forEach(function (z) {
      if (!widz[z.id]) { var r = bud(z.id, true); for (var a in r) z[a] = r[a]; z.alt = true; }
    });
    return k;
  }
  function przodkowie(korzen) {
    var widz = {};
    function bud(i, alt) {
      var n = {id: i, kids: [], alt: alt, stub: !!widz[i], mz: []};
      if (n.stub) return n;
      widz[i] = 1;
      var f = F[i];
      if (!f) return n;
      n.ileDzieci = [f[0], f[1]].filter(Boolean).length + (f[2] || []).length;
      if (zwiniete[i]) return n;
      [f[0], f[1]].forEach(function (p) { if (p) n.kids.push(bud(p, false)); });
      (f[2] || []).forEach(function (p) { n.kids.push(bud(p, true)); });
      return n;
    }
    return bud(korzen, false);
  }

  // ---------------------------------------------------------------- układ (zwarty — kontury poddrzew)
  function wysokosc(n, zMalz) {
    var h = 10 + 3 * LH;
    if (zMalz && n.mz.length && !n.stub) h += 5 + Math.min(n.mz.length, 3) * LH;
    if (n.stub || n.alt) h += LH;
    return h;
  }
  function uloz(n, zMalz) {
    n.h = wysokosc(n, zMalz);
    if (!n.kids.length) { n.l = [-W / 2]; n.r = [W / 2]; return; }
    n.kids.forEach(function (k) { uloz(k, zMalz); });
    var off = [0], L = n.kids[0].l.slice(), R = n.kids[0].r.slice();
    for (var j = 1; j < n.kids.length; j++) {
      var c = n.kids[j], pot = -Infinity;
      for (var d = 0; d < Math.min(R.length, c.l.length); d++) pot = Math.max(pot, R[d] - c.l[d] + (d ? GX * 1.6 : GX));
      off.push(pot);
      for (d = 0; d < c.l.length; d++) {
        if (d < L.length) { L[d] = Math.min(L[d], c.l[d] + pot); R[d] = Math.max(R[d], c.r[d] + pot); }
        else { L.push(c.l[d] + pot); R.push(c.r[d] + pot); }
      }
    }
    var srodek = (off[0] + off[off.length - 1]) / 2;
    n.kids.forEach(function (k, j) { k.dx = off[j] - srodek; });
    n.l = [-W / 2].concat(L.map(function (v) { return v - srodek; }));
    n.r = [W / 2].concat(R.map(function (v) { return v - srodek; }));
  }
  function rozmiesc(n, x, g, kier, wiersze) {
    n.x = x; n.g = g; n.kier = kier;
    wiersze[g] = Math.max(wiersze[g] || 0, n.h);
    n.kids.forEach(function (k) { rozmiesc(k, x + k.dx, g + 1, kier, wiersze); });
  }
  function zbierz(n, wyn) { wyn.push(n); n.kids.forEach(function (k) { zbierz(k, wyn); }); return wyn; }

  // ---------------------------------------------------------------- rysowanie
  function karta(n, x, y, zMalz) {
    var p = P[n.id], kl = 'kt ' + (p[3] || '') + (n.stub ? ' stub' : '') + (n.alt ? ' alt' : '');
    var h = '<div class="' + kl + '" data-id="' + esc(n.id) + '" style="left:' + x + 'px;top:' + y + 'px;height:' + n.h + 'px">' +
      '<div class="i" title="' + esc(nazwa(n.id)) + '">' + esc(p[0] || '—') + '</div>' +
      '<div class="n" title="' + esc(nazwa(n.id)) + '">' + esc(p[1]) + '</div><div class="l">' + esc(p[2] || '') + '</div>';
    if (zMalz && !n.stub && n.mz.length) {
      h += '<div class="mz">';
      n.mz.slice(0, 3).forEach(function (m) {
        h += '<div title="∞ ' + esc(nazwa(m) + (P[m][2] ? ' (' + P[m][2] + ')' : '')) + '">∞ ' + esc(nazwa(m)) + (P[m][2] ? ' <span>' + esc(P[m][2]) + '</span>' : '') + '</div>';
      });
      if (n.mz.length > 3) h += '<div>∞ … (' + n.mz.length + ')</div>';
      h += '</div>';
    }
    if (n.stub && !n.odl) h += '<div class="uw">↪ już w drzewie — kliknij</div>';
    else if (n.alt) h += '<div class="uw">wg innego przekazu</div>';
    if (n.ileDzieci && !n.stub) h += '<button type="button" class="zw' + (n.kier < 0 ? ' gora' : '') + '" data-zw="' + esc(n.id) + '" title="' +
      (zwiniete[n.id] ? 'rozwiń gałąź' : 'zwiń gałąź') + '">' + (zwiniete[n.id] ? '+' + n.ileDzieci : '−') + '</button>';
    return h + '</div>';
  }

  function rysuj() {
    var drzewa = [], zMalz = stan.tryb !== 'przodkowie';
    if (stan.tryb === 'potomkowie' || stan.tryb === 'rodzina') { var d = potomkowie(stan.id); uloz(d, true); drzewa.push([d, 1]); }
    if (stan.tryb === 'przodkowie' || stan.tryb === 'rodzina') { var a = przodkowie(stan.id); uloz(a, false); drzewa.push([a, -1]); }
    wezly = [];
    var wierszeD = [], wierszeA = [];
    drzewa.forEach(function (t) { rozmiesc(t[0], 0, 0, t[1], t[1] > 0 ? wierszeD : wierszeA); });
    if (stan.tryb === 'rodzina') wierszeA[0] = wierszeD[0];
    // y wierszy: potomkowie w dół od 0, przodkowie w górę od 0
    var yD = [0], yA = [0];
    for (var g = 1; g < wierszeD.length; g++) yD[g] = yD[g - 1] + wierszeD[g - 1] + GY;
    for (g = 1; g < wierszeA.length; g++) yA[g] = yA[g - 1] - wierszeA[g] - GY;
    var wszystkie = [];
    drzewa.forEach(function (t) {
      zbierz(t[0], []).forEach(function (n, k) {
        if (stan.tryb === 'rodzina' && t[1] < 0 && k === 0) return;     // osoba środkowa — raz (z drzewa potomków)
        n.y = t[1] > 0 ? yD[n.g] : yA[n.g] + (n.g ? 0 : 0);
        if (t[1] < 0 && n.g > 0) n.y = yA[n.g];
        wszystkie.push(n);
      });
    });
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    wszystkie.forEach(function (n) {
      minX = Math.min(minX, n.x - W / 2); maxX = Math.max(maxX, n.x + W / 2);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y + n.h);
    });
    var ox = PAD + ETYK - minX, oy = PAD - minY;
    swiatW = maxX - minX + 2 * PAD + ETYK; swiatH = maxY - minY + 2 * PAD;
    var html = '', linie = '';
    gdzie = {};
    wszystkie.forEach(function (n) {
      var x = n.x - W / 2 + ox, y = n.y + oy;
      n.px = x; n.py = y;
      if (!n.stub && !(n.id in gdzie)) gdzie[n.id] = n;
      html += karta(n, x, y, zMalz && n.kier > 0);
    });
    // linie rodzic — dziecko
    drzewa.forEach(function (t) {
      zbierz(t[0], []).forEach(function (n) {
        if (!n.kids.length) return;
        var rodzic = (stan.tryb === 'rodzina' && t[1] < 0 && n === t[0]) ? drzewa[0][0] : n;
        var cx = n.x + ox;
        if (t[1] > 0) {
          var yb = rodzic.py + rodzic.h, ym = yD[n.g] + wierszeD[n.g] + oy + GY / 2;
          n.kids.forEach(function (k) {
            linie += '<path class="' + (k.alt ? 'alt' : '') + '" d="M' + cx + ',' + yb + 'V' + ym + 'H' + (k.x + ox) + 'V' + (k.py) + '"/>';
          });
        } else {
          var yt = rodzic.py, ym2 = yA[n.g] + oy - GY / 2;
          n.kids.forEach(function (k) {
            linie += '<path class="' + (k.alt ? 'alt' : '') + '" d="M' + cx + ',' + yt + 'V' + ym2 + 'H' + (k.x + ox) + 'V' + (k.py + k.h) + '"/>';
          });
        }
      });
    });
    // etykiety pokoleń
    var et = '';
    if (stan.tryb !== 'przodkowie') wierszeD.forEach(function (h, g) {
      et += '<div class="pok-et" style="top:' + (yD[g] + oy) + 'px;height:' + h + 'px">' + (stan.tryb === 'rodzina' && g === 0 ? 'osoba' : 'pok. ' + rzym(g + 1)) + '</div>';
    });
    if (stan.tryb !== 'potomkowie') wierszeA.forEach(function (h, g) {
      if (!g) { if (stan.tryb === 'przodkowie') et += '<div class="pok-et" style="top:' + (yA[0] + oy) + 'px;height:' + h + 'px">osoba</div>'; return; }
      et += '<div class="pok-et" style="top:' + (yA[g] + oy) + 'px;height:' + h + 'px">' + (g <= 3 ? ['', 'rodzice', 'dziadkowie', 'pradziad.'][g] : (g - 2) + '× pra-') + '</div>';
    });
    swiat.style.width = swiatW + 'px'; swiat.style.height = swiatH + 'px';
    swiat.innerHTML = '<svg class="linie" width="' + swiatW + '" height="' + swiatH + '">' + linie + '</svg>' + et + html;
    wezly = wszystkie;
    // opis i lista do wyszukiwania
    var ile = {}; wszystkie.forEach(function (n) { if (!n.stub) ile[n.id] = 1; n.mz.forEach(function (m) { if (stan.tryb !== 'przodkowie') ile[m] = 1; }); });
    var pok = stan.tryb === 'przodkowie' ? wierszeA.length : stan.tryb === 'rodzina' ? wierszeA.length + wierszeD.length - 1 : wierszeD.length;
    opis.innerHTML = '<b>' + {potomkowie: 'Potomkowie', przodkowie: 'Przodkowie', rodzina: 'Rodzina'}[stan.tryb] + ':</b> ' +
      '<a href="osoba-' + esc(stan.id) + '.html">' + esc(nazwa(stan.id)) + '</a> ' + esc(P[stan.id][2] || '') +
      ' — ' + Object.keys(ile).length + ' osób' + (stan.tryb !== 'przodkowie' ? ' (z małżonkami)' : '') + ', ' + pok + ' pokoleń.';
    document.getElementById('lista-os').innerHTML = Object.keys(ile).sort(function (a, b) { return nazwa(a) < nazwa(b) ? -1 : 1; })
      .map(function (i) { return '<option value="' + esc(nazwa(i) + (P[i][2] ? ' (' + P[i][2] + ')' : '')) + '">'; }).join('');
    rysujListe(drzewa);
  }

  // ---------------------------------------------------------------- lista z numeracją
  function rysujListe(drzewa) {
    var h = '';
    drzewa.forEach(function (t) {
      if (t[1] > 0) {
        h += '<h2>Potomkowie — ' + esc(nazwa(stan.id)) + '</h2><p class="drobne">Numeracja: 1 — protoplasta, 1.2 — jego drugie dziecko, 1.2.1 — pierwsze dziecko tegoż…</p>';
        var nr = {};
        (function lst(n, num) {
          if (!n.stub) nr[n.id] = num;
        })(t[0], '1');
        h += '<ul class="potomkowie">' + (function lst(n, num) {
          var w = '<li><span class="nr">' + num + '</span> ' + osLink(n.id);
          if (n.stub) w += ' <span class="drobne">' + (nr[n.id] ? '↪ zob. nr ' + nr[n.id] : '') + '</span>';
          else { nr[n.id] = num; if (n.alt) w += ' <span class="spor">wg innego przekazu</span>'; }
          if (!n.stub && n.mz.length) w += ' <span class="mz">' + n.mz.map(function (m) { return '∞ ' + osLink(m); }).join('; ') + '</span>';
          if (n.kids.length) w += '<ul>' + n.kids.map(function (k, j) { return lst(k, num + '.' + (j + 1)); }).join('') + '</ul>';
          return w + '</li>';
        })(t[0], '1') + '</ul>';
      } else {
        h += '<h2>Przodkowie — ' + esc(nazwa(stan.id)) + '</h2><p class="drobne">Numeracja Sosy-Kekulego: 1 — osoba, 2 — ojciec, 3 — matka, ' +
          'ojciec osoby nr n ma numer 2n, matka 2n+1.</p>';
        var poz = [[stan.id, 1, 0]], widz = {}, g = -1, wiersz = '';
        var NAZ = ['Osoba', 'Rodzice', 'Dziadkowie', 'Pradziadkowie', 'Prapradziadkowie'];
        while (poz.length) {
          var e = poz.shift();
          if (e[2] !== g) { if (g >= 0) h += wiersz + '</ul>'; g = e[2]; wiersz = ''; h += '<h3>' + (NAZ[g] || (g + '. pokolenie wstecz')) + '</h3><ul class="przodkowie">'; }
          wiersz += '<li><span class="nr">' + e[1] + '</span> ' + osLink(e[0]) + (widz[e[0]] ? ' <span class="drobne">↪ zob. nr ' + widz[e[0]] + '</span>' : '') + '</li>';
          if (widz[e[0]]) continue;
          widz[e[0]] = e[1];
          var f = F[e[0]];
          if (f && f[0]) poz.push([f[0], 2 * e[1], g + 1]);
          if (f && f[1]) poz.push([f[1], 2 * e[1] + 1, g + 1]);
        }
        h += wiersz + '</ul>';
      }
    });
    lista.innerHTML = h;
  }
  function osLink(i) { return '<a href="osoba-' + esc(i) + '.html">' + esc(nazwa(i)) + '</a>' + (P[i][2] ? ' <span class="lata">(' + esc(P[i][2]) + ')</span>' : ''); }

  // ---------------------------------------------------------------- widok: przesuwanie, powiększanie, mapka
  function zastosuj() {
    swiat.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    rysujMini();
  }
  function dopasuj() {
    var cw = wykres.clientWidth, ch = wykres.clientHeight;
    s = Math.min(cw / swiatW, ch / swiatH, 1);
    tx = (cw - swiatW * s) / 2; ty = (ch - swiatH * s) / 2;
    zastosuj();
  }
  function start() {
    var cw = wykres.clientWidth, ch = wykres.clientHeight, f = Math.min(cw / swiatW, ch / swiatH, 1);
    if (f >= 0.5) { dopasuj(); return; }
    s = 0.8;
    var n = gdzie[stan.id] || wezly[0];
    tx = cw / 2 - (n.px + W / 2) * s;
    ty = stan.tryb === 'przodkowie' ? ch - (n.py + n.h + PAD) * s : stan.tryb === 'rodzina' ? ch / 2 - (n.py + n.h / 2) * s : 20 - (n.py - 10) * s;
    zastosuj();
  }
  function powieksz(f, cx, cy) {
    var ns = Math.max(0.05, Math.min(2.5, s * f));
    if (cx == null) { cx = wykres.clientWidth / 2; cy = wykres.clientHeight / 2; }
    tx = cx - (cx - tx) * ns / s; ty = cy - (cy - ty) * ns / s; s = ns;
    zastosuj();
  }
  function wysrodkuj(id) {
    var n = gdzie[id]; if (!n) return;
    if (s < 0.6) s = 0.8;
    tx = wykres.clientWidth / 2 - (n.px + W / 2) * s; ty = wykres.clientHeight / 2 - (n.py + n.h / 2) * s;
    zastosuj();
    swiat.querySelectorAll('.kt.cel').forEach(function (e) { e.classList.remove('cel'); });
    var el = swiat.querySelector('.kt[data-id="' + id + '"]:not(.stub)') || swiat.querySelector('.kt[data-id="' + id + '"]');
    if (el) el.classList.add('cel');
  }
  function rysujMini() {
    var c = mini.getContext('2d'), mw = mini.width, mh = mini.height;
    var m = Math.min(mw / swiatW, mh / swiatH);
    c.clearRect(0, 0, mw, mh);
    var ox = (mw - swiatW * m) / 2, oy = (mh - swiatH * m) / 2;
    wezly.forEach(function (n) {
      c.fillStyle = P[n.id][3] === 'm' ? '#4a6fa5' : P[n.id][3] === 'k' ? '#b5577a' : '#888';
      c.fillRect(ox + n.px * m, oy + n.py * m, Math.max(1.5, W * m), Math.max(1.5, n.h * m));
    });
    c.strokeStyle = '#d4252a'; c.lineWidth = 1.5;
    c.strokeRect(ox + (-tx / s) * m, oy + (-ty / s) * m, wykres.clientWidth / s * m, wykres.clientHeight / s * m);
    mini.dataset.m = m; mini.dataset.ox = ox; mini.dataset.oy = oy;
  }
  mini.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    var r = mini.getBoundingClientRect(), m = +mini.dataset.m;
    var wx = (e.clientX - r.left - mini.dataset.ox) / m, wy = (e.clientY - r.top - mini.dataset.oy) / m;
    tx = wykres.clientWidth / 2 - wx * s; ty = wykres.clientHeight / 2 - wy * s;
    zastosuj();
  });

  var ciag = null;
  wykres.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.zoom, .panel, #mini, button')) return;
    ciag = {x: e.clientX, y: e.clientY, tx: tx, ty: ty, ruch: false, cel: e.target.closest('.kt')};
    wykres.setPointerCapture(e.pointerId);
  });
  wykres.addEventListener('pointermove', function (e) {
    if (!ciag) return;
    var dx = e.clientX - ciag.x, dy = e.clientY - ciag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) ciag.ruch = true;
    if (ciag.ruch) { tx = ciag.tx + dx; ty = ciag.ty + dy; zastosuj(); wykres.classList.add('ciagne'); }
  });
  wykres.addEventListener('pointerup', function () {
    if (ciag && !ciag.ruch && ciag.cel) pokazPanel(ciag.cel.dataset.id, ciag.cel.classList.contains('stub'));
    else if (ciag && !ciag.ruch) panel.hidden = true;
    ciag = null; wykres.classList.remove('ciagne');
  });
  wykres.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = wykres.getBoundingClientRect();
    powieksz(Math.pow(1.0015, -e.deltaY), e.clientX - r.left, e.clientY - r.top);
  }, {passive: false});
  swiat.addEventListener('click', function (e) {
    var b = e.target.closest('[data-zw]'); if (!b) return;
    var id = b.dataset.zw, n = gdzie[id], przed = n ? [n.px * s + tx, n.py * s + ty] : null;
    zwiniete[id] = !zwiniete[id];
    rysuj();
    var m = gdzie[id];
    if (przed && m) { tx = przed[0] - m.px * s; ty = przed[1] - m.py * s; }
    zastosuj();
  });
  wykres.addEventListener('keydown', function (e) {
    var k = {ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60]}[e.key];
    if (k) { tx += k[0]; ty += k[1]; zastosuj(); e.preventDefault(); }
    if (e.key === '+' || e.key === '=') powieksz(1.2); if (e.key === '-') powieksz(1 / 1.2);
  });
  document.querySelectorAll('.zoom button').forEach(function (b) {
    b.addEventListener('click', function () {
      var z = b.dataset.z;
      if (z === 'fit') dopasuj(); else if (z === '100') { powieksz(1 / s); } else if (z === 'druk') { dopasuj(); setTimeout(function () { window.print(); }, 100); }
      else powieksz(z === '1' ? 1.25 : 0.8);
    });
  });
  window.addEventListener('resize', rysujMini);

  // ---------------------------------------------------------------- okienko osoby
  function pokazPanel(id, stub) {
    var p = P[id], h = '<button type="button" class="zamknij" title="zamknij">×</button><b>' + esc(nazwa(id)) + '</b>' +
      (p[2] ? '<br><span class="lata">' + esc(p[2]) + '</span>' : '');
    if (stub && gdzie[id]) h += '<p><button type="button" class="przycisk maly" data-idz="' + esc(id) + '">↪ przejdź do tej osoby w drzewie</button></p>';
    h += '<p><a class="przycisk maly" href="osoba-' + esc(id) + '.html">karta osoby</a></p><p class="drobne">Pokaż w drzewie: ' +
      ['potomkowie', 'przodkowie', 'rodzina'].map(function (t) { return '<a href="#' + t + ':' + esc(id) + '">' + t + '</a>'; }).join(' · ') + '</p>';
    var f = F[id];
    if (f && (f[0] || f[1])) h += '<p class="drobne">Rodzice: ' + [f[0], f[1]].filter(Boolean).map(function (r) { return '<a href="#rodzina:' + esc(r) + '">' + esc(nazwa(r)) + '</a>'; }).join(', ') + '</p>';
    if ((S[id] || []).length) h += '<p class="drobne">Małżonkowie: ' + S[id].map(function (m) {
      return esc(nazwa(m)) + ' (<a href="osoba-' + esc(m) + '.html">karta</a>, <a href="#przodkowie:' + esc(m) + '">przodkowie</a>)'; }).join('; ') + '</p>';
    panel.innerHTML = h; panel.hidden = false;
  }
  panel.addEventListener('click', function (e) {
    if (e.target.closest('.zamknij')) panel.hidden = true;
    var b = e.target.closest('[data-idz]'); if (b) wysrodkuj(b.dataset.idz);
  });
  panel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

  // ---------------------------------------------------------------- sterowanie
  znajdz.addEventListener('change', function () {
    var v = znajdz.value.trim();
    var id = Object.keys(gdzie).filter(function (i) { return v === nazwa(i) + (P[i][2] ? ' (' + P[i][2] + ')' : '') || v === nazwa(i); })[0];
    if (!id) { var mz = wezly.filter(function (n) { return n.mz.some(function (m) { return v.indexOf(nazwa(m)) === 0; }); })[0]; if (mz) id = mz.id; }
    if (id) { if (stan.widok !== 'wykres') ustawWidok('wykres'); wysrodkuj(id); pokazPanel(id); }
  });
  wybor.addEventListener('change', function () { location.hash = wybor.value; });
  document.querySelectorAll('[data-tryb]').forEach(function (b) {
    b.addEventListener('click', function () { location.hash = b.dataset.tryb + ':' + stan.id; });
  });
  function ustawWidok(w) {
    stan.widok = w;
    wykres.hidden = w !== 'wykres'; lista.hidden = w !== 'lista';
    document.querySelectorAll('[data-widok]').forEach(function (b) { b.classList.toggle('on', b.dataset.widok === w); });
    if (w === 'wykres') start();
  }
  document.querySelectorAll('[data-widok]').forEach(function (b) { b.addEventListener('click', function () { ustawWidok(b.dataset.widok); }); });

  function zAdresu() {
    var m = /^#(potomkowie|przodkowie|rodzina):(.+)$/.exec(decodeURIComponent(location.hash));
    if (m && P[m[2]]) { stan.tryb = m[1]; stan.id = m[2]; }
    else if (/^#[\w-]+$/.test(location.hash) && P[location.hash.slice(1)]) { stan.tryb = 'rodzina'; stan.id = location.hash.slice(1); }
    zwiniete = {};
    document.querySelectorAll('[data-tryb]').forEach(function (b) { b.classList.toggle('on', b.dataset.tryb === stan.tryb); });
    var wart = stan.tryb + ':' + stan.id;
    wybor.value = [].some.call(wybor.options, function (o) { return o.value === wart; }) ? wart : '';
    panel.hidden = true;
    rysuj();
    if (stan.widok === 'wykres') start();
  }
  window.addEventListener('hashchange', zAdresu);
  zAdresu();
})();
