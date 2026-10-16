// Mapy Leaflet: lista miejsc (window.MIEJSCA) albo pojedyncze miejsce (atrybuty data-* na #mapa).
(function () {
  var el = document.getElementById('mapa');
  if (!el || !window.L) return;
  var mapa = L.map(el);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  if (el.dataset.lat) {
    var p = [+el.dataset.lat, +el.dataset.lon];
    L.marker(p).addTo(mapa).bindPopup(esc(el.dataset.nazwa));
    mapa.setView(p, 11);
    return;
  }
  var pkt = (window.MIEJSCA || []).map(function (m) {
    var r = Math.min(14, 4 + Math.sqrt(m.f) * 1.5);
    return L.circleMarker([m.lat, m.lon], {radius: r, color: '#7a2e2a', weight: 1, fillColor: '#9c6b1f', fillOpacity: .65})
      .addTo(mapa).bindPopup('<a href="miejsce-' + esc(m.id) + '.html">' + esc(m.n) + '</a><br>' + m.f + ' faktów');
  });
  if (!pkt.length) return;
  var wszystkie = L.featureGroup(pkt).getBounds().pad(0.1);
  var pl = L.featureGroup(pkt.filter(function (m) { var p = m.getLatLng(); return p.lat > 49 && p.lat < 55 && p.lng > 14 && p.lng < 24.2; }));
  var start = pl.getLayers().length ? pl.getBounds().pad(0.1) : wszystkie;
  mapa.fitBounds(start);
  var Przycisk = L.Control.extend({ onAdd: function () {
    var b = L.DomUtil.create('button', 'mapa-przycisk'); b.type = 'button'; b.textContent = 'Pokaż też miejsca za granicą';
    var swiat = false;
    L.DomEvent.on(b, 'click', function (e) { L.DomEvent.stop(e); swiat = !swiat; mapa.fitBounds(swiat ? wszystkie : start);
      b.textContent = swiat ? 'Wróć do Polski' : 'Pokaż też miejsca za granicą'; });
    return b; } });
  new Przycisk({ position: 'topright' }).addTo(mapa);
})();
