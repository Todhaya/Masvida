# Sistema de diseño de Viwai

Un único sitio define cómo es Viwai. La app, la web y el panel sacan de aquí sus colores, sus iconos y sus piezas.
Montado y visible en **viwai.es/estilo/**.

## Qué hay

| Archivo | Qué es |
|---|---|
| `tokens.css` | Colores de marca, pasteles de cada apartado, colores de estado, colores de gráficos, letra, bordes y sombras (`--vw-…`). |
| `componentes.css` | Piezas de la app: cabecera de apartado (`.vh`), tarjeta con icono y cuenta atrás (`.vi`), grupos (`.vg`), etiquetas (`.pill`), accesos rápidos (`.qa`), línea de tiempo (`.tl2`), tarjetas deslizables (`.sv`), comparativa con barras (`.fb`), botón de hecho (`.ckb`), franja del año (`.yr`) y los resúmenes de Ahorro, Hogar y Tú. |
| `graficos.css` + `web/admin/graficos.js` | Fichas de cifras y gráficos: donut con leyenda que se toca, líneas con cifras al pasar el ratón, barras, ranking, anillos y mini líneas. |
| `iconos.json` → `iconos.js` | Iconos con nombre en español. Todos de [Lucide](https://lucide.dev) (licencia ISC, `LUCIDE_LICENSE.txt`). En el código: `viwaiIcono("facturas")`, o `<svg data-ico="facturas"></svg>` en HTML fijo. |
| `colores_heredados.txt` | Colores sueltos que ya existían antes de esto. No se añaden más; se van quitando al pasar cada pantalla al sistema. |

## Reglas (para personas e IA)

1. **Colores:** siempre con variable (`var(--vw-lila)`, `var(--lav)`…). Un color nuevo de verdad se añade primero a `tokens.css`. La prueba automática falla si aparece un color suelto nuevo.
2. **Iconos:** solo de la biblioteca. Para uno nuevo: buscarlo en lucide.dev, añadir `"nombre-en-español": "nombre-lucide"` a `iconos.json` y ejecutar `node tools/diseno.mjs <carpeta icons de un clon de lucide>`. Nada de dibujar SVG a mano. Excepción: logos de otras marcas (WhatsApp, Telegram…) y el código de barras de la Wallet.
3. **Piezas:** una pantalla nueva se monta con las piezas de `componentes.css` y `graficos.css`. Si hace falta una pieza nueva, se añade aquí, se enseña en `/estilo/` y después se usa.
4. **Gráficos:** colores en el orden fijo `--vw-g1…g6` (validados para daltonismo); más de seis series → «Otros». Siempre con leyenda o etiqueta, nunca solo el color.
5. **Copias:** `app/diseno/` y `web/diseno/` son copias (cada web se publica por separado). Se actualizan con `node tools/diseno.mjs`; la prueba falla si no coinciden.
6. **Prototipo de claude.ai:** se genera con `python3 tools/publicar_prototipo.py`, que mete dentro tokens, piezas e iconos.

## Pasos al cambiar algo del diseño
1. Editar el archivo de `diseno/`.
2. `node tools/diseno.mjs` (y, si son iconos, con la carpeta de Lucide).
3. `npm test`.
4. Mirar `/estilo/` y las pantallas afectadas.
5. Publicar el prototipo si cambia la app.
