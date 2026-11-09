"""Hace la versión «prototipo» de la app (un HTML suelto con datos de ejemplo, como se publica en claude.ai)
a partir de app/index.html: sin bienvenida, sin conexión a Supabase, sin contadores ni service worker.
Las fotos van aparte (img/fotos/...), con la misma ruta.
Uso: python3 tools/publicar_prototipo.py [salida.html]"""
import sys
s = open("app/index.html", encoding="utf-8").read()
ini = s.index('<meta charset="utf-8">\n<title>Viwai</title>')
fin = s.index('<script src="config.js"></script>')
cuerpo = s[ini:fin].replace("</head>\n<body>\n", "")
cuerpo = cuerpo.replace('<title>Viwai</title>\n', '<title>Viwai</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n', 1)
# El prototipo es un solo archivo: el sistema de diseño va dentro
cuerpo = cuerpo.replace('<link rel="stylesheet" href="diseno/tokens.css">', "<style>\n" + open("diseno/tokens.css", encoding="utf-8").read() + "</style>")
cuerpo = cuerpo.replace('<link rel="stylesheet" href="diseno/componentes.css">', "<style>\n" + open("diseno/componentes.css", encoding="utf-8").read() + "</style>")
cuerpo = cuerpo.replace('<script src="diseno/iconos.js"></script>', "<script>\n" + open("diseno/iconos.js", encoding="utf-8").read() + "</script>")
cuerpo = cuerpo.replace('<script src="js/seguimiento.js"></script>', "<script>\n" + open("app/js/seguimiento.js", encoding="utf-8").read() + "</script>")
for js in ("js/archivos.js", "vendor/qrcode.js", "js/codigos.js"):
    cuerpo = cuerpo.replace(f'<script src="{js}"></script>', "<script>\n" + open("app/" + js, encoding="utf-8").read() + "</script>")
# El lector de códigos se carga al escanear; en el prototipo va incluido porque no hay carpeta vendor/
cuerpo = cuerpo.replace('<script>\n' + open("app/js/codigos.js", encoding="utf-8").read(), "<script>\n" + open("app/vendor/html5-qrcode.min.js", encoding="utf-8").read() + "</script>\n<script>\n" + open("app/js/codigos.js", encoding="utf-8").read(), 1)
salida = sys.argv[1] if len(sys.argv) > 1 else "prototipo.html"
open(salida, "w", encoding="utf-8").write(cuerpo.rstrip() + "\n")
print(salida, len(cuerpo))
