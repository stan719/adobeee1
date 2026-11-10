"""Buduje jednoplikową wersję offline kalkulatora: Kalkulator_offline.html.

Wstawia silnik, eksporty, logo i czcionki do jednego pliku HTML, który działa
po otwarciu w przeglądarce bez claude.ai (dane w przeglądarce, przenoszone kopią zapasową).
Logo, podpis (domyślny, własny wgrany ma pierwszeństwo), czcionki i biblioteki eksportu
(ExcelJS, jsPDF, jsPDF-AutoTable, docx, pdf.js) są wbudowane, więc plik działa bez internetu.
Biblioteki biorą się z node_modules (npm install w tym katalogu).
"""
import base64
import pathlib

APP = pathlib.Path(__file__).resolve().parent


def b64(name):
    return base64.b64encode((APP / name).read_bytes()).decode()


# (klucz w index.html LIBS, plik w node_modules)
BIBLIOTEKI = [
    ("exceljs", "exceljs/dist/exceljs.min.js"),
    ("jspdf", "jspdf/dist/jspdf.umd.min.js"),
    ("autotable", "jspdf-autotable/dist/jspdf.plugin.autotable.min.js"),
    ("docx", "docx/build/index.umd.js"),
    ("pdfjs", "pdfjs-dist/build/pdf.min.js"),
    ("pdfjsworker", "pdfjs-dist/build/pdf.worker.min.js"),
]


def biblioteki():
    """Osadzone teksty bibliotek jako <script type="text/plain">: index.html robi z nich adresy blob:."""
    out = ""
    for klucz, sciezka in BIBLIOTEKI:
        src = (APP / "node_modules" / sciezka).read_text(encoding="utf8")
        src = src.replace("</script", "<\\/script").replace("//# sourceMappingURL=", "// sourceMappingURL=").replace("\ufffd", "\\uFFFD")
        out += '<script type="text/plain" data-lib="%s">%s</script>\n' % (klucz, src)
    return out


def main():
    html = (APP / "index.html").read_text(encoding="utf8")
    for js in ("nk38-engine.js", "nk38-export.js"):
        tag = '<script src="%s"></script>' % js
        assert tag in html, js
        body = (APP / js).read_text(encoding="utf8").replace("</script", "<\\/script")
        html = html.replace(tag, "<script>\n" + body + "\n</script>")
    pre = ("<script>window.NK38_OFFLINE = true;\nwindow.NK38_LOGO = \"data:image/png;base64,%s\";\n"
           "window.NK38_FONTS = { regular: \"%s\", bold: \"%s\" };</script>\n") % (
        b64("logo.png"), b64("fonts/Carlito-Regular.ttf"), b64("fonts/Carlito-Bold.ttf"))
    # podpis (domyślny, z pliku podpis.png; bez pliku wersja działa bez wbudowanego podpisu): wysokość 47 px jak w ofercie
    if (APP / "podpis.png").exists():
        from PIL import Image
        w, h = Image.open(APP / "podpis.png").size
        pre += ('<script>window.NK38_PODPIS = { dataUrl: "data:image/png;base64,%s", w: %d, h: 47 };</script>\n'
                % (b64("podpis.png"), round(w * 47 / h)))
    pre += biblioteki()
    first = html.index("<script")
    html = html[:first] + pre + html[first:]
    head = ('<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n')
    html = head + html.replace('<meta charset="utf-8">\n', "", 1)
    out = APP / "Kalkulator_offline.html"
    out.write_text(html, encoding="utf8")
    print("zapisano", out, len(html) // 1024, "KB")


if __name__ == "__main__":
    main()
