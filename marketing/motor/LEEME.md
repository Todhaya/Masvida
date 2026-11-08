# Motor de vídeos de funciones

Vídeos verticales 1080×1920 con cuatro escenas:
1. Gancho: icono, pregunta y foto de ambiente.
2. Problema.
3. La app en el móvil: capturas reales del prototipo con toques.
4. Cierre «Así de fácil. Así de ahorro. Así de más vida.», con el logo y «Lo que ahorras, lo vives.».

Usa la letra de la marca (Plus Jakarta Sans, en `marketing/redes/fuentes`) y los iconos del sistema de diseño (`diseno/iconos.js`).

## Pasos (en una carpeta de trabajo vacía)
1. `python3 tools/publicar_prototipo.py <trabajo>/proto/index.html` y enlaza `app/img` como `<trabajo>/proto/img` (fotos).
2. `node marketing/motor/cap.cjs <trabajo>/proto/index.html <trabajo>`: hace las capturas (800×1406) de todos los vídeos y guarda los toques en `pos.json`.
3. En `<trabajo>`: `node marketing/motor/render2.cjs marketing/motor/<video>.json <video>`. Esto crea las escenas.
4. Para unirlas: `ffmpeg -f concat -safe 0 -i <video>_list.txt`, recodificado con `-c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -movflags +faststart`. Se añade una pista de audio silenciosa (`-f lavfi -i anullsrc`) para que se abra en el móvil.

O todo de una vez: `bash marketing/motor/todos.sh <trabajo>`.

Cada vídeo nuevo es un `.json` con los textos, el icono, la foto, los colores y las capturas. Vídeos actuales: facturas, menu, armario, gasolina y casa.
