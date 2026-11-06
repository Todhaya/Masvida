# Motor de vídeos de funciones

Vídeos verticales 1080×1920 con cuatro escenas: gancho (pregunta + foto de ambiente), problema, la app en el móvil (capturas con toques) y cierre «Así de fácil. Así de ahorro. Así de más vida.» con el logo.

1. `node cap.js` desde una carpeta junto al prototipo: hace las capturas (800×1406) y guarda en `pos.json` dónde van los toques.
2. Copia las fotos de ambiente (`web/img/fotos/ambiente-*.jpg`) a la misma carpeta.
3. `node render2.js facturas.json facturas` crea las escenas; luego se unen con ffmpeg (`-f concat`) y se recodifican con `-profile:v high -level 4.1 -movflags +faststart` y una pista de audio silenciosa para que se abran en el móvil.

Cada vídeo nuevo es un `.json` con los textos, la foto, los colores y las capturas.
