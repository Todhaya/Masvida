-- Viwai · Black Friday 2026 en la web: campañas con slug, visibles también antes de empezar, y primeras fichas.
alter table campanas add column if not exists slug text unique;

-- Lo público: campañas programadas que no han terminado (la página puede anunciarlas antes de que empiecen).
drop policy if exists "publico campanas en curso" on campanas;
drop policy if exists "publico campanas programadas" on campanas;
create policy "publico campanas programadas" on campanas for select to anon, authenticated
  using (estado = 'programada' and current_date <= fin);

insert into campanas (slug, nombre, inicio, fin, estado, titulo, texto, categorias, solo_rebajado, objetivo_clics)
values ('black-friday-2026', 'Black Friday y Cyber Monday', '2026-11-20', '2026-11-30', 'programada',
  'Chollos de Black Friday de verdad',
  'Comprobamos cada descuento contra el precio más bajo de los 30 días anteriores. Si no es una rebaja de verdad, no sale aquí.',
  '{hogar,moda,peques,tecnologia,regalos}', true, 500)
on conflict (slug) do update set titulo = excluded.titulo, texto = excluded.texto, inicio = excluded.inicio, fin = excluded.fin;

-- Tiendas ya aprobadas o pedidas para la campaña
insert into tiendas (id, nombre, red_id, categoria, web_url, cashback, estado, notas) values
  ('aliexpress', 'AliExpress', 'admitad', 'todo', 'https://es.aliexpress.com', true, 'aprobada', 'Admitad «Aliexpress WW». Cashback permitido en sus normas.'),
  ('vevor', 'Vevor', 'admitad', 'hogar', 'https://www.vevor.es', null, 'pedida', 'Admitad, moderación hasta 5 días.'),
  ('decoandlemon', 'Deco and Lemon', 'cj', 'hogar', 'https://www.decoandlemon.com', null, 'pedida', 'CJ'),
  ('desenio', 'Desenio', 'cj', 'hogar', 'https://desenio.es', null, 'pedida', 'CJ'),
  ('disneystore', 'Disney Store', 'cj', 'peques', 'https://www.disneystore.es', null, 'pedida', 'CJ'),
  ('dormity', 'Dormity', 'cj', 'hogar', 'https://www.dormity.com', null, 'pedida', 'CJ'),
  ('dreame', 'Dreame', 'cj', 'tecnologia', 'https://www.dreame.eu', null, 'pedida', 'CJ'),
  ('dosfarma', 'Dosfarma', 'cj', 'belleza', 'https://www.dosfarma.com', null, 'pedida', 'CJ'),
  ('ecoflow', 'EcoFlow', 'cj', 'tecnologia', 'https://es.ecoflow.com', null, 'pedida', 'CJ'),
  ('expedia', 'Expedia', 'cj', 'viajes', 'https://www.expedia.es', null, 'por_pedir', 'CJ: exige aceptar términos especiales de Expedia; decide Alba.')
on conflict (id) do nothing;

-- Fichas de tienda (categoría «tienda»): llevan a las ofertas de cada tienda con nuestro enlace.
insert into ofertas (titulo, tienda_id, url, categoria, campana_id, activa, comprobada)
select v.titulo, v.tienda, v.url, 'tienda', c.id, true, current_date
from (values
  ('Todas las ofertas de Amazon', 'amazon', 'https://www.amazon.es/deals?tag=viwai-21'),
  ('Ofertas de AliExpress', 'aliexpress', 'https://rzekl.com/g/1e8d114494b9a6cff83d16525dc3e8/')
) v(titulo, tienda, url)
cross join (select id from campanas where slug = 'black-friday-2026') c
where not exists (select 1 from ofertas o where o.url = v.url);

-- Lista pública de tiendas aprobadas (solo nombre y web, sin notas internas)
create or replace view tiendas_publicas as select id, nombre, categoria, web_url from tiendas where estado = 'aprobada';
grant select on tiendas_publicas to anon, authenticated;
