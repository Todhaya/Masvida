# Panel de administración (viwai.es/admin)

**Acceso:** `https://www.viwai.es/admin/`. Se entra con un enlace mágico enviado a un correo de la tabla `admins` (de inicio, hola@viwai.es). Cualquier otra cuenta ve «no tiene acceso». La seguridad la pone RLS en Supabase (`es_admin()`), no la página.

**Puesta en marcha (una vez):**
1. Ejecutar `supabase/migrations/003_panel_admin.sql` en el editor SQL de Supabase. Se puede repetir sin romper nada.
2. Supabase → Authentication → URL Configuration: *Site URL* `https://www.viwai.es` y añadir `https://www.viwai.es/admin/` en *Redirect URLs*.

**Pestañas:**
- **Resumen:** lista de espera (con altas de los últimos 30 días), visitas e instalaciones, clics a tiendas, comisión y disponible del mes, campañas en curso y próximas, objetivos y fechas próximas. Métricas que todavía no llegan solas se apuntan a mano (tabla `metricas`).
- **Dinero y objetivos:** reparto de cada 100 € (usuarias, gastos, IRPF, colchón, tuyo), mes a mes, objetivos (marca, cuota de autónoma, 1.500 € netos, dejar el trabajo), ajustes, gastos de estructura e importación de comisiones por CSV. Cálculos en `web/admin/calculos.js` (tests en `tests/admin.test.mjs`).
- **Afiliados:** redes (con enlace al panel de cada una) y tiendas con KPIs de 90 días: clics, ventas, conversión, € por clic, comisión.
- **Campañas:** tabla `campanas`. Una campaña *programada* es pública entre inicio y fin (la leerán la web y la app). Botón para crear las campañas del año siguiente como borrador.
- **Push y correo:** planificación de envíos (tabla `envios`) con apertura, clics y bajas. El envío automático se conecta más adelante.
- **Usuarias:** lista de espera (búsqueda y CSV), origen, provincias, casas, invitaciones y aviso de posible fraude.
- **Reembolsos:** saldo que se debe a usuarias, retiradas por pagar («Marcar pagada») y anulación de premios.
- **Catálogo y ayudas:** fichas de oferta con descuento real (sobre el mínimo de 30 días) y ayudas con plazo y fecha de revisión.
- **Calendario:** fechas fiscales, legales, renovaciones y campañas.

**Pendiente de conectar:** visitas desde Cloudflare Web Analytics (necesita un token como secreto y una función), importación automática de comisiones por API de cada red, envío real de push y correo.

## Diseño (8 nov 2026)
- **Hoy**: una frase con el estado (días para la próxima campaña, tiendas aprobadas y pendientes, comisión del mes) y «Qué toca hacer», que se calcula sola: cargas con error, retiradas por pagar, fechas que vencen, tiendas aprobadas sin comprobar el cashback, productos propuestos, ayudas por revisar y campaña próxima.
- **Menú lateral con contadores** (se recalculan cada 5 minutos y al guardar). En el móvil, el menú es una tira arriba.
- **Tablas**: buscador, filtros por estado con recuento, orden al pulsar la cabecera y cambio de estado de una tienda sin abrir el formulario.
- **⌘K / Ctrl+K**: ir a una sección o buscar una tienda.
- **Automático cada noche** (GitHub Actions): tiendas aprobadas, pendientes y rechazadas de Awin y Admitad; catálogos; comisiones de Awin y Admitad de los últimos 30 días.
