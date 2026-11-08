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
