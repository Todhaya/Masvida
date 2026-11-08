-- Viwai · solicitudes enviadas en CJ el 8 nov 2026 (la sincronización de CJ aún no trae las pendientes).
-- Cuando una tienda apruebe, la carga nocturna la encuentra por su id de programa y la pasa a «aprobada».
-- Se puede ejecutar más de una vez.
insert into tiendas (id, nombre, red_id, programa_id, estado, categoria) values
  ('shein', 'SHEIN', 'cj', '3773223', 'pedida', 'moda'),
  ('tous', 'TOUS', 'cj', '7129976', 'pedida', 'moda'),
  ('footshop', 'Footshop', 'cj', '4736192', 'pedida', 'moda'),
  ('pikolinos', 'Pikolinos', 'cj', '5052422', 'pedida', 'moda'),
  ('notino', 'Notino', 'cj', '4541237', 'pedida', 'belleza'),
  ('vueling', 'Vueling', 'cj', '3659001', 'pedida', 'viajes'),
  ('iberia', 'Iberia', 'cj', '4455265', 'pedida', 'viajes'),
  ('iberiaexpress', 'Iberia Express', 'cj', '3774518', 'pedida', 'viajes'),
  ('hotelscom', 'Hotels.com', 'cj', '5275610', 'pedida', 'viajes'),
  ('vrbo', 'Vrbo', 'cj', '4453383', 'pedida', 'viajes')
on conflict (id) do nothing;

update tiendas set notas = 'REGLAS ESPECIALES (Expedia, aceptadas 8 nov 2026): no pujar por su marca en anuncios (palabras negativas); '
  || 'no anunciar la relación sin su permiso escrito; solo en viwai.es, la app, el boletín y nuestras redes; sin tocar logos ni textos; '
  || 'solo pagan estancias disfrutadas y verificadas (hasta 90 días después) y por último clic; reclamar comisiones en 90 días; '
  || 'cashback sin confirmar. Detalle: docs/REGLAS_TIENDAS.md', cashback = null
where red_id = 'cj' and programa_id in ('5275610', '4453383');
