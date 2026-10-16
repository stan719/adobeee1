// Filtrowanie list (osoby, miejsca, oś czasu) — bez polskich znaków i wielkości liter.
(function () {
  function norm(t) { return t.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var pole = document.getElementById('filtr'), rel = document.getElementById('rel');
  var lista = document.getElementById('lista-osob');
  if (!lista) return;
  function filtruj() {
    var q = norm(pole ? pole.value.trim() : ''), r = rel ? rel.value : '';
    var slowa = q.split(/\s+/).filter(Boolean);
    lista.querySelectorAll('li[data-s]').forEach(function (li) {
      var ok = slowa.every(function (s) { return li.dataset.s.indexOf(s) >= 0; }) && (!r || li.dataset.r === r);
      li.style.display = ok ? '' : 'none';
    });
    lista.querySelectorAll('.grupa').forEach(function (g) {
      var widoczne = g.querySelectorAll('li[data-s]:not([style*="none"])').length;
      g.style.display = widoczne ? '' : 'none';
    });
  }
  if (pole) pole.addEventListener('input', filtruj);
  if (rel) rel.addEventListener('change', filtruj);
})();
