-- Viwai · escaparate elegido: Alba decide qué productos salen en el buscador.
-- - Cada tienda puede salir «entera» (todo su catálogo, menos lo descartado) o «solo escaparate» (solo lo aprobado).
-- - El primer filtro es automático (filtro_ok, lo calcula la sincronización) y Claude propone una selección con
--   título en español (data/escaparate.json); Alba aprueba, descarta, corrige y destaca desde el panel.
-- Se puede ejecutar más de una vez.

alter table tiendas add column if not exists escaparate boolean not null default false;  -- true = solo lo aprobado

alter table productos add column if not exists titulo_es text;        -- título en español (sustituye al de la tienda)
alter table productos add column if not exists categoria_fija text;   -- categoría elegida a mano (manda sobre la automática)
alter table productos add column if not exists curado text check (curado in ('propuesto', 'aprobado', 'descartado'));
alter table productos add column if not exists destacado boolean not null default false;
alter table productos add column if not exists filtro_ok boolean not null default true;  -- pasa el filtro automático
create index if not exists productos_curado on productos (tienda_id, curado);

-- La búsqueda también mira el título en español
drop index if exists productos_busqueda;
alter table productos drop column if exists busqueda;
alter table productos add column busqueda tsvector generated always as (
  setweight(to_tsvector('spanish', f_unaccent(coalesce(titulo_es, ''))), 'A') ||
  setweight(to_tsvector('spanish', f_unaccent(coalesce(titulo, ''))), 'B') ||
  setweight(to_tsvector('spanish', f_unaccent(coalesce(marca, ''))), 'B') ||
  setweight(to_tsvector('spanish', f_unaccent(coalesce(categoria_tienda, ''))), 'C')
) stored;
create index if not exists productos_busqueda on productos using gin (busqueda);

-- Qué productos se ven en la web (una sola regla para el buscador y para las categorías)
create or replace function producto_visible(p productos, t tiendas) returns boolean
language sql stable as $$
  select t.estado = 'aprobada' and t.catalogo and p.disponible
    and coalesce(p.curado, '') <> 'descartado'
    and (case when t.escaparate then p.curado = 'aprobado' else p.filtro_ok or p.curado = 'aprobado' end)
    -- lo aprobado aguanta más aunque deje de venir en el catálogo de la tienda
    and p.visto > now() - (case when p.curado = 'aprobado' then interval '30 days' else interval '3 days' end)
$$;

drop function if exists buscar_productos(text, text, text, text, int, int);
create or replace function buscar_productos(
  q text default null, cat text default null, tienda text default null,
  orden text default 'relevancia', limite int default 40, desde int default 0
) returns table (
  id text, tienda_id text, tienda text, titulo text, marca text, categoria text,
  precio numeric, precio_min_30d numeric, descuento int, imagen text, url text, destacado boolean, total bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with base as (
    select p.*, coalesce(p.titulo_es, p.titulo) as tvis, coalesce(p.categoria_fija, p.categoria) as cvis, t.nombre as tnombre,
      case when coalesce(q, '') = '' then 0
           else ts_rank(p.busqueda, websearch_to_tsquery('spanish', f_unaccent(q))) end as rank
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t)
      and (cat is null or coalesce(p.categoria_fija, p.categoria) = cat)
      and (tienda is null or p.tienda_id = tienda)
      and (coalesce(q, '') = ''
           or p.busqueda @@ websearch_to_tsquery('spanish', f_unaccent(q))
           or f_unaccent(lower(coalesce(p.titulo_es, p.titulo))) like '%' || f_unaccent(lower(q)) || '%')
  ), conmin as (
    select b.*, precio_min_30d(b.id) as m from base b
  )
  select c.id, c.tienda_id, c.tnombre, c.tvis, c.marca, c.cvis, c.precio, c.m,
    case when c.m is not null and c.precio < c.m then round((1 - c.precio / c.m) * 100)::int end,
    c.imagen, c.url, c.destacado, count(*) over ()
  from conmin c
  order by
    case when orden = 'precio' then c.precio end asc nulls last,
    case when orden = 'descuento' then (case when c.m is not null and c.precio < c.m then 1 - c.precio / c.m end) end desc nulls last,
    c.destacado desc, c.rank desc, (c.curado = 'aprobado') desc, c.precio asc nulls last
  limit least(greatest(limite, 1), 100) offset greatest(desde, 0)
$$;
grant execute on function buscar_productos(text, text, text, text, int, int) to anon, authenticated;

create or replace function categorias_catalogo() returns table (categoria text, n bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(p.categoria_fija, p.categoria), count(*) from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t)
  group by 1 order by 2 desc
$$;
grant execute on function categorias_catalogo() to anon, authenticated;

-- AliExpress: catálogo de «más vendidos», pero solo sale lo que Alba apruebe
update tiendas set catalogo = true, escaparate = true where nombre ilike 'aliexpress%';

grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
