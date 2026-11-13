# Black Friday 2026 · precampaña y campaña

Objetivo: llevar gente a `www.viwai.es/black-friday/`, que se apunten a los avisos eligiendo sus tiendas y, el día grande, mandar a cada persona las ofertas de sus tiendas. Solo a quien se ha apuntado y ha confirmado (LSSI art. 21). Decisión del 13 nov en `DECISIONES.md`.

## 1. Montar Brevo (Alba, una vez)
1. Crear cuenta gratis en brevo.com con hola@viwai.es (plan gratis: 300 correos/día).
2. *Remitentes y dominios* → añadir `viwai.es` y copiar los registros DNS que dé (DKIM, DMARC y el de verificación) en IONOS. Remitente: `Viwai <hola@viwai.es>`.
3. *Contactos → Configuración → Atributos*: crear `TIENDAS` (texto), `ORIGEN` (texto) y `CONSENTIMIENTO` (fecha o texto).
4. *Contactos → Listas*: crear la lista «Avisos de ofertas» y apuntar su número (ID).
5. *Plantillas*: crear la de confirmación (tipo «doble opt-in», texto abajo) y apuntar su número.
6. *SMTP y API → Claves API*: crear una clave. Ponerla en Supabase → Edge Functions → Secrets como `BREVO_API_KEY`, junto con `BREVO_LISTA_ID` y `BREVO_PLANTILLA_DOI`. La clave no se pega en el chat ni en el repositorio.
7. Avisar a Claude: despliega la función `avisame`, prueba un alta y deja visible el formulario de la página.

## 2. Segmentos en Brevo
- Por tienda elegida: `TIENDAS contiene amazon`, `contiene tous`… (uno por tienda del orden).
- Por interés real: quien pulsó el enlace de una tienda en un correo nuestro (Brevo guarda los clics de cada campaña). En el correo del día grande, cada persona recibe primero las tiendas que eligió o que abrió.

## 3. Correo de confirmación (doble opt-in)
**Asunto:** Confirma y te avisamos del precio de verdad
> ¡Hola! Pulsa el botón para confirmar que quieres recibir las bajadas de Black Friday de las tiendas que has elegido.
> [Sí, avisadme]
> Si no has sido tú, ignora este correo y no te escribiremos.

## 4. Precampaña (correo 1 · lunes 16 o al confirmar)
**Asunto:** No busques entre mil webs: te lo traemos comprobado
> Este Black Friday no hace falta abrir veinte pestañas. En Viwai tienes juntas las ofertas de {{tiendas elegidas}} y comprobamos cada precio contra el más bajo de los 30 días anteriores: si no es rebaja de verdad, no te la enseñamos.
> Hasta el 27 te iremos avisando de lo que ya ha bajado. Mientras, haz tu lista: apunta lo que de verdad hace falta en casa.
> [Ver las tiendas y sus códigos]

**Correo 2 · viernes 20 (empiezan las ofertas):** «Ya han empezado: esto es lo que ha bajado de verdad en {{tienda}}», con 4–6 productos de `chollos_automaticos` de sus tiendas y los códigos vigentes.

## 5. Campaña del día (viernes 27 y Cyber Monday 30)
Un correo por segmento de tienda, en el orden fijado (Amazon, EcoFlow, Mibro, Tous, Primor, Eurekakids, Juguetes Online, Temu, AliExpress). Quien tenga varias tiendas recibe un único correo con un bloque por tienda.
**Asunto:** Hoy es el día: lo mejor de {{tienda}}, comprobado
> {{tienda}} ha bajado esto de verdad (precio de antes y de ahora). Y los códigos que siguen activos hoy.
> [Ir a {{tienda}}]

Cada enlace lleva el id de clic, así la comisión vuelve atribuida.

## 6. Redes propias (16–30 nov)
| Día | Pieza | Mensaje |
| --- | --- | --- |
| Lun 16 | Reel | «No busques entre mil webs»: pantalla con 20 pestañas → la página de Viwai |
| Mié 18 | Carrusel | Cómo detectar un falso descuento (los 4 trucos de la página) |
| Vie 20 | Reel + historias | «Ya ha empezado»: 3 bajadas de verdad con precio de antes y ahora |
| Lun 23 | Historias | Tienda a tienda, en el orden fijado, con su código |
| Mié 25 | Reel | «Hazte la lista antes»: lo que hace falta en casa vs. lo que es gasto rebajado |
| Vie 27 | Reel + historias cada pocas horas | Lo mejor del día, comprobado |
| Lun 30 | Reel | Cyber Monday: tecnología y lo que queda |
Todas terminan en «Apúntate y te avisamos» con el enlace de la página.

## 7. Recordatorio de compra a medias (automatización)
Solo para personas con cuenta en la app que hayan activado avisos.
- **Cuándo:** añadió algo a la cesta de Viwai o entró en una tienda desde la app, y a las 48 h no ha llegado ninguna venta con su id de clic.
- **Qué:** un aviso push (o correo si no tiene push): «¿Te quedó a medias? Lo que guardaste en {{tienda}} sigue a {{precio}}». Uno por cesta, como mucho uno cada 3 días, y nunca si el precio ha subido.
- **Límite:** no vemos el carrito de la tienda, solo nuestra cesta y nuestros clics. Las ventas llegan de las redes con retraso (horas o días), así que puede salir algún recordatorio a quien ya compró: el texto no da por hecho que no compró.
