# Estado de Viwai · 6 de noviembre de 2026

Punto de partida para cualquier sesión nueva (Claude o ChatGPT). Las decisiones están en `docs/DECISIONES.md`; las fotos, en `docs/FOTOS.md`.

## Hecho
- Marca: nombre Viwai, logo definitivo (Plus Jakarta Sans + ola lila + moneda dorada), colores y archivos en `marca/`. Instagram @viwai.app, TikTok creado. Dominios viwai.es y viwai.app (IONOS).
- Web (`web/`): estilo de los anuncios, fotos de ambiente, historia del nombre, lista de espera conectada a Supabase y funcionando. Publicada en Cloudflare Pages (proyecto viwai-web; app en viwai-app).
- Legal: responsable Alba Piñana, contacto hola@viwai.es, páginas ocultas a buscadores. Retirada mínima 10 €.
- App (`app/`, prototipo con datos de ejemplo): estilo suave por apartados, fotos en perfiles, recetas, armarios, ofertas y escapadas; iconos en facturas; seguros solo con recordatorio.
- Base de datos Supabase creada (proyecto adoznvxwqvcwyimqnxtj, Frankfurt) con las migraciones 001 y 002.
- Vídeos en `marketing/videos/`: armario, facturas, menú. Motor para más en `marketing/motor/`.

## Pendiente de Alba
1. Correo hola@viwai.es en IONOS (activación hasta 24 h).
2. Cuenta de la API de Claude (lectura de facturas) y guardar la clave como secreto `ANTHROPIC_API_KEY` en Supabase.
3. Conectar dominios a Cloudflare cuando el correo funcione: viwai.es → web, viwai.app → app.
4. Solicitud de marca en la OEPM (clases 9 limitada a software, 35, 36, 42) con `marca/viwai-logo-color.jpg`.
6. Pedir la clave gratuita de AEMET OpenData (opendata.aemet.es → «Obtención de API Key», con su correo) para conectar el tiempo de la app. Guardarla como secreto `AEMET_API_KEY` (no pasarla por el chat).
5. Altas en redes de afiliación (Awin, Tradedoubler, Amazon, Temu, Civitatis). Antes de activar enlaces: alta censal en Hacienda (037), domiciliación y añadir NIF y domicilio a las páginas legales.

## Siguiente trabajo técnico (por orden)
0. Página «Chollos de Black Friday de verdad» y 2–3 vídeos de Black Friday (antes del 20 de noviembre; necesita Amazon y alguna tienda aprobada).
1. Bienvenida, perfil obligatorio y tutoriales (`docs/specs/BIENVENIDA_Y_TUTORIAL.md`), en el prototipo y en la app.
2. App conectada a Supabase: inicio de sesión con enlace mágico y Google, hogar, miembros y módulos guardados.
3. Panel para Alba (lista de espera, uso, comisiones, pagos y neto).
4. Vídeos de gasolina, casa compartida y escapadas (motor en `marketing/motor/`; no usar en anuncios las fotos de auriculares ni del juego de construcción por parecido con marcas).
5. Importación diaria de comisiones de las redes.
6. **Tiempo (pendiente, decidido el 8 nov 2026):** conectar la tarjeta «Hoy» de la app a AEMET OpenData. La consulta se haría desde el servidor, cada pocas horas y por municipio (según el código postal de la casa), y se guardaría en Supabase citando a AEMET. Hasta entonces la app muestra datos de ejemplo. Necesita la clave de Alba (punto 6 de arriba).
7. **Farmacias de guardia (pendiente, decidido el 8 nov 2026):** no hay servicio nacional; cada Colegio de Farmacéuticos publica las suyas. Primera fase: la tarjeta abre la página oficial de guardias del colegio de la provincia de la casa. Más adelante: conectar las provincias con datos abiertos, empezando por las que tengan más usuarias. No copiar automáticamente webs que no lo permitan.
9. **Seguimiento de pedidos (pendiente, decidido el 8 nov 2026):**
   - pegar o escanear el número de seguimiento, consultando el estado en un servicio de seguimiento (elegir entre 17TRACK, AfterShip u otro según precio);
   - «Compartir con Viwai», con la app instalada como destino;
   - pedidos automáticos a partir de las compras hechas desde Viwai.
   Conectar el correo, más adelante.
8. Pasar al sistema de diseño (`diseno/`) las pantallas que faltan: Calendario, Armario, Menú y Luz (Pedidos, Wallet y Tareas ya están).
