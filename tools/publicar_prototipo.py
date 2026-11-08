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
salida = sys.argv[1] if len(sys.argv) > 1 else "prototipo.html"
open(salida, "w", encoding="utf-8").write(cuerpo.rstrip() + "\n")
print(salida, len(cuerpo))
