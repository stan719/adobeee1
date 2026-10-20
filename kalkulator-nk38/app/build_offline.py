"""Buduje jednoplikową wersję offline kalkulatora: Kalkulator_offline.html.

Wstawia silnik, eksporty, logo i czcionki do jednego pliku HTML, który działa
po otwarciu w przeglądarce bez claude.ai (dane w przeglądarce, przenoszone kopią zapasową).
Biblioteki eksportu (ExcelJS, jsPDF, docx) nadal są pobierane z internetu przy pierwszym eksporcie.
"""
import base64
import pathlib

APP = pathlib.Path(__file__).resolve().parent


def b64(name):
    return base64.b64encode((APP / name).read_bytes()).decode()


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
