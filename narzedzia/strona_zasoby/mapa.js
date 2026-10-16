// Mapy Leaflet: lista miejsc (window.MIEJSCA, window.KOLORY) albo pojedyncze miejsce (atrybuty data-* na #mapa).
// Kafle tile.openstreetmap.org i CARTO są blokowane, gdy stronę otwiera się z pliku (brak adresu strony w zapytaniu) —
// dlatego najpierw Esri, który tego nie wymaga.
(function () {
  var el = document.getElementById('mapa');
  if (!el || !window.L) return;
  var mapa = L.map(el, {scrollWheelZoom: false});
  // Podkłady po kolei: gdy kafle jednego się nie ładują, przełączamy na następny.
  var PODKLADY = [
    ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
     {maxZoom: 19, attribution: 'Podkład &copy; Esri, HERE, Garmin, &copy; współtwórcy OpenStreetMap'}],
    ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
     {maxZoom: 17, subdomains: 'abc', attribution: '&copy; współtwórcy OpenStreetMap, SRTM | styl &copy; OpenTopoMap (CC-BY-SA)'}],
    ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; współtwórcy OpenStreetMap'}]
  ];
  var nr = 0, bledy = 0, warstwa;
  function podklad() {
    if (warstwa) mapa.removeLayer(warstwa);
    warstwa = L.tileLayer(PODKLADY[nr][0], PODKLADY[nr][1]).addTo(mapa);
    bledy = 0;
    warstwa.on('tileerror', function () { if (++bledy > 4 && nr < PODKLADY.length - 1) { nr++; podklad(); } });
  }
  podklad();
  mapa.on('click', function () { mapa.scrollWheelZoom.enable(); });
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  if (el.dataset.lat) {
    var p = [+el.dataset.lat, +el.dataset.lon];
    L.marker(p).addTo(mapa).bindPopup(esc(el.dataset.nazwa));
    mapa.setView(p, 11);
    return;
  }
  var KOL = window.KOLORY || {}, warstwy = {}, znaczniki = {};
  (window.MIEJSCA || []).forEach(function (m) {
    var r = Math.min(15, 5 + Math.sqrt(m.f) * 1.4);
    var z = L.circleMarker([m.lat, m.lon], {radius: r, color: '#fff', weight: 1.5, fillColor: KOL[m.k] || '#888', fillOpacity: .85})
      .bindPopup('<a href="miejsce-' + esc(m.id) + '.html"><b>' + esc(m.n) + '</b></a><br>' + m.f + ' faktów');
    (warstwy[m.k] = warstwy[m.k] || L.layerGroup().addTo(mapa)).addLayer(z);
    znaczniki[m.id] = z;
  });
  var wszystkie = Object.keys(znaczniki).map(function (k) { return znaczniki[k]; });
  if (!wszystkie.length) return;
  var calosc = L.featureGroup(wszystkie).getBounds().pad(0.1);
  var pl = L.featureGroup(wszystkie.filter(function (m) { var p = m.getLatLng(); return p.lat > 49 && p.lat < 55 && p.lng > 14 && p.lng < 24.2; }));
  var start = pl.getLayers().length ? pl.getBounds().pad(0.05) : calosc;
  mapa.fitBounds(start);
  var Przycisk = L.Control.extend({ onAdd: function () {
    var b = L.DomUtil.create('button', 'mapa-przycisk'); b.type = 'button'; b.textContent = 'Pokaż też miejsca za granicą';
    var swiat = false;
    L.DomEvent.on(b, 'click', function (e) { L.DomEvent.stop(e); swiat = !swiat; mapa.fitBounds(swiat ? calosc : start);
      b.textContent = swiat ? 'Wróć do Polski' : 'Pokaż też miejsca za granicą'; });
    return b; } });
  new Przycisk({position: 'topright'}).addTo(mapa);
  document.querySelectorAll('#legenda input').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var w = warstwy[cb.dataset.k]; if (!w) return;
      if (cb.checked) w.addTo(mapa); else mapa.removeLayer(w);
    });
  });
  document.querySelectorAll('.na-mapie').forEach(function (b) {
    b.addEventListener('click', function () {
      var z = znaczniki[b.dataset.id]; if (!z) return;
      el.scrollIntoView({behavior: 'smooth', block: 'center'});
      mapa.flyTo(z.getLatLng(), 11); setTimeout(function () { z.openPopup(); }, 900);
    });
  });
})();
