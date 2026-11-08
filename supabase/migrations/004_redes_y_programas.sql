-- Viwai · redes y programas de afiliación dados de alta (estado a 8 nov 2026, según la hoja de gestiones de Alba).
-- Se puede ejecutar más de una vez: actualiza nombre, panel, estado y notas.
insert into redes (id, nombre, panel_url, estado, notas) values
  ('awin',          'Awin',              'https://ui.awin.com',                                   'pendiente', 'Falta terminar el alta (web www.viwai.es, tipo cashback, depósito reembolsable).'),
  ('tradedoubler',  'Tradedoubler',      'https://login.tradedoubler.com',                        'alta',      'Lidl, Fever, GetYourGuide, Octopus Energy, Raisin, Tiendanimal, Viajes El Corte Inglés, Weekendesk.'),
  ('amazon',        'Amazon Afiliados',  'https://afiliados.amazon.es',                           'alta',      'Programa directo. Sin cashback: sus condiciones no permiten devolver comisión a las usuarias.'),
  ('temu',          'Temu',              'https://www.temu.com/es/affiliate_recruit.html',        'alta',      'Programa directo. Hasta 35 % en pedidos de clientes nuevos y premios por invitación.'),
  ('civitatis',     'Civitatis',         'https://www.civitatis.com/es/afiliados/',               'revision',  'Programa directo. Actividades y excursiones, 8–10 %.'),
  ('admitad',       'Admitad',           'https://store.admitad.com',                             'alta',      'Espacio web www.viwai.es («servicio de cashback») verificado y activo el 8 nov 2026. Falta rellenar los datos de pago. Se puede borrar el espacio antiguo de app (viwai.app).'),
  ('webgains',      'Webgains',          'https://www.webgains.com',                              'revision',  'Moda, deporte y hogar europeos.'),
  ('cj',            'CJ Affiliate',      'https://members.cj.com',                                'alta',      'Cuenta activada el 8 nov 2026. Sitio promocional www.viwai.es (modelo principal: cashback). W-8BEN enviado.'),
  ('aliexpress',    'AliExpress Portals','https://portals.aliexpress.com',                        'pendiente', 'Sin darse de alta. También disponible a través de Admitad.'),
  ('travelpayouts', 'Travelpayouts',     'https://www.travelpayouts.com',                         'pendiente', 'Sin darse de alta. Vuelos, hoteles, coches y seguros de viaje.'),
  ('uber',          'Uber y Uber Eats',  'https://www.uber.com/es/es-es/affiliate-program',       'pendiente', 'Sin darse de alta. Pago por primer viaje o pedido.')
on conflict (id) do update set nombre = excluded.nombre, panel_url = excluded.panel_url, estado = excluded.estado, notas = excluded.notas;

-- Los programas directos son a la vez su propia tienda.
insert into tiendas (id, nombre, red_id, categoria, web_url, programa_url, cashback, estado, notas) values
  ('amazon',    'Amazon',    'amazon',    'todo',      'https://www.amazon.es',     'https://afiliados.amazon.es',                    false, 'aprobada', 'Sin cashback por condiciones del programa.'),
  ('temu',      'Temu',      'temu',      'todo',      'https://www.temu.com/es',   'https://www.temu.com/es/affiliate_recruit.html', null,  'aprobada', 'Comprobar si permite cashback antes de devolver nada.'),
  ('civitatis', 'Civitatis', 'civitatis', 'viajes',    'https://www.civitatis.com', 'https://www.civitatis.com/es/afiliados/',        null,  'pedida',   null)
on conflict (id) do update set nombre = excluded.nombre, red_id = excluded.red_id, categoria = excluded.categoria, web_url = excluded.web_url,
  programa_url = excluded.programa_url, estado = excluded.estado, notas = coalesce(tiendas.notas, excluded.notas);
