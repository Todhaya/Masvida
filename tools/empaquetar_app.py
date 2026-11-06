"""Convierte el prototipo (un HTML suelto, como se publica en claude.ai) en app/index.html instalable.
Uso: python3 tools/empaquetar_app.py ruta/al/prototipo.html"""
import sys
s = open(sys.argv[1], encoding="utf-8").read()
head = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F0F0E">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icono.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icono.svg">
"""
i = s.index("<style>")
s = head + s[:i].replace('<meta name="claude:viewport-fit-sides" content="cover">', "") + s[i:]
j = s.index("</style>") + len("</style>")
s = s[:j] + "\n</head>\n<body>\n" + s[j:]
s = s.replace("laura@viwai.app", "tu-buzon@viwai.app")
s = s.rstrip() + '\n<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});</script>\n</body>\n</html>\n'
open("app/index.html", "w", encoding="utf-8").write(s)
print("app/index.html actualizado")
