"""Porównuje silnik JS aplikacji (nk38-engine.js) z model_nk38.py na losowych danych."""
import json
import random
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from build_kalkulator import PRZYKLADY, WARIANTY  # noqa: E402
from verify_excel import losuj, model  # noqa: E402


def do_js(inp):
    """Dane w formacie Excela (in_*) -> format aplikacji."""
    d = {k[3:]: v for k, v in inp.items() if k.startswith("in_") and k != "in_data"}
    d["gl_S"] = {str(k): v for k, v in inp.get("gl_S", {}).items()}
    d["gl_D"] = {str(k): v for k, v in inp.get("gl_D", {}).items()}
    d["wzor"] = "uproszczony" if inp.get("in_wzor") == "Uproszczony" else "stary"
    d["analiza"] = WARIANTY.index(inp.get("in_analiza", WARIANTY[0]))
    d["dzwig_koszt"] = inp.get("in_dzwig_koszt")
    d["szablon"] = "nk37" if inp.get("in_typ") == "NK37" else "nk38"
    return d


def main(n=200):
    rnd = random.Random(11)
    zestawy = [PRZYKLADY["waw"], PRZYKLADY["krk"]] + [losuj(rnd) for _ in range(n)]
    cases = []
    for inp in zestawy:
        exp = [model(inp, w) for w in WARIANTY]
        a = inp.get("in_analiza", WARIANTY[0])
        an = [model(inp, a, k) for k in range(2, 8)]
        cases.append({"dane": do_js(inp),
                      "warianty": [[e["cena"], e["cena2"], e["dni"], e["wyjazdy"], e["tygodnie"]] for e in exp],
                      "analiza": [[e["cena"], e["dni"]] for e in an]})
    js = """
const E = require(%s); const cases = JSON.parse(require('fs').readFileSync(0, 'utf8'));
let bad = 0;
cases.forEach((c, i) => {
  const r = E.oblicz(c.dane, E.szablonyWbudowane().find(x => x.id === c.dane.szablon));
  r.warianty.forEach((w, j) => { const e = c.warianty[j];
    [[w.cena, e[0]], [w.cena2, e[1]], [w.dni, e[2]], [w.wyjazdy, e[3]], [w.tygodnie, e[4]]].forEach(([a, b], k) => {
      if (Math.abs(a - b) > 0.01) { bad++; if (bad < 10) console.log('zestaw', i, 'wariant', j, 'pole', k, a, b); } }); });
  r.analiza.forEach((w, j) => { const e = c.analiza[j];
    if (Math.abs(w.cena - e[0]) > 0.01 || w.dni !== e[1]) { bad++; if (bad < 10) console.log('zestaw', i, 'osoby', j + 2, w.cena, e[0]); } });
});
console.log(cases.length + ' zestawów: ' + (bad ? bad + ' różnic' : 'OK')); process.exit(bad ? 1 : 0);
""" % json.dumps(str(HERE / "nk38-engine.js"))
    return subprocess.run(["node", "-e", js], input=json.dumps(cases), text=True).returncode


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 200))
