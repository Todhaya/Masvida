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
5. Altas en redes de afiliación (Awin, Tradedoubler, Amazon, Temu, Civitatis). Antes de activar enlaces: alta censal en Hacienda (037), domiciliación y añadir NIF y domicilio a las páginas legales.

## Siguiente trabajo técnico (por orden)
1. App conectada a Supabase: inicio de sesión con enlace mágico y Google, hogar, miembros y módulos guardados.
2. Panel para Alba (lista de espera, uso, comisiones, pagos y neto).
3. Vídeos de gasolina, casa compartida y escapadas (motor en `marketing/motor/`; no usar en anuncios las fotos de auriculares ni del juego de construcción por parecido con marcas).
4. Importación diaria de comisiones de las redes.
