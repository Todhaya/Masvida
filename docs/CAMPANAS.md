# Calendario de campañas (push, correo, web y redes)

Solo a quien haya dado permiso (push activado o casilla de correo). Máximo 1 campaña de temporada por semana y siempre con ofertas comprobadas. Cada campaña: página en la web, aviso push, correo y 1–2 vídeos.

| Fecha | Campaña | Enfoque |
| --- | --- | --- |
| Enero (1–15) | Cuesta de enero + Reyes y rebajas | Revisa tus facturas, ayudas del año, rebajas en su talla |
| Febrero (1–14) | San Valentín | Regalos y planes para dos, escapadas |
| Marzo | Día del Padre (19) · Renta | Regalos · deducciones que te tocan en la declaración |
| Abril | Semana Santa · Renta | Escapadas · borrador de la renta y deducciones |
| Mayo | Día de la Madre (1.er domingo) | Regalos y planes |
| Junio | Verano y vacaciones | Lo que necesitas para viajar, escapadas, crema solar |
| Julio | Rebajas de verano | Ropa en su talla, armario de verano |
| Agosto–septiembre | Vuelta al cole | Mochilas, ropa y calzado en su talla, ayudas para libros y comedor |
| Octubre | Halloween · Cambio de hora | Disfraces y decoración · revisa la tarifa de la luz antes del invierno |
| Noviembre | Black Friday (último viernes) y Cyber Monday | Chollos comprobados y cómo evitar falsos descuentos |
| Diciembre | Navidad | Lista de regalos por persona, ideas por edad y talla |

## Rebajas y bajadas de precio
- **Aviso push y correo al empezar cada temporada de rebajas** (enero y julio, Black Friday, rebajas de tiendas concretas) y cuando baja algo que la persona ha guardado o que encaja con su perfil (su talla, su súper, sus categorías).
- **Apartado «Todo lo rebajado»** en Ofertas: todos los productos con descuento de las tiendas asociadas, con filtros por categoría, tienda, talla y porcentaje, y el reembolso al lado. Arriba, «Rebajado para ti» con lo que encaja con su casa.
- **Descuentos reales:** el porcentaje se calcula sobre el precio más bajo de los 30 días anteriores (lo que exige la ley para anunciar una rebaja). Para eso guardamos a diario el precio de cada producto de los catálogos de afiliación. Si no hay historial suficiente, no se muestra porcentaje.

## Catálogo adaptado a cada campaña
Mientras una campaña está activa, la app cambia sola:
- **Inicio:** una tarjeta de la campaña arriba («Vuelta al cole: todo lo que necesitan, en su talla»).
- **Ofertas:** la primera sección pasa a ser la colección de la campaña (p. ej. Halloween: disfraces, decoración, chuches), personalizada con el perfil (tallas y edades de cada miembro, código postal). Debajo, el catálogo normal.
- **Avisos:** el push y el correo de la campaña abren directamente esa colección.

Cómo se monta: una tabla `campanas` en la base de datos con nombre, fechas de inicio y fin, texto e imagen de portada, y los filtros que forman la colección (categorías, palabras clave, tiendas, edad o talla). Los productos salen de los catálogos de afiliación que ya se importan a diario, así que preparar una campaña es rellenar una fila, sin tocar código. Alba podrá crearlas desde su panel.
