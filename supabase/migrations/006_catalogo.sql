-- Viwai · catálogo de productos de las tiendas aprobadas, con buscador y precio más bajo de 30 días.
-- Lo rellena cada noche la sincronización automática (scripts/sync, GitHub Actions) con la clave de servicio.
-- Se puede ejecutar más de una vez.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent no es "immutable"; esta envoltura sí, para poder indexar.
create or replace function f_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = public, extensions
as $$ select unaccent('unaccent', $1) $$;

-- Datos de sincronización en cada tienda
alter table tiendas add column if not exists programa_id text;          -- id del programa en su red
alter table tiendas add column if not exists catalogo boolean not null default true;  -- la tienda deja mostrar su catálogo
alter table tiendas add column if not exists max_productos int not null default 3000;  -- tope para no llenar la base de datos
alter table tiendas add column if not exists sincronizada timestamptz;
alter table tiendas add column if not exists alta_auto boolean not null default false; -- la dio de alta la sincronización

create table if not exists productos (
  id text primary key,                    -- <tienda>:<referencia en la tienda>
  tienda_id text not null references tiendas(id) on delete cascade,
  titulo text not null,
  marca text,
  categoria text not null default 'otros', -- nuestra categoría (ver scripts/sync/categorias.mjs)
  categoria_tienda text,
  precio numeric(10,2),
  precio_tachado numeric(10,2),           -- el "antes" que pone la tienda (no lo usamos para anunciar descuentos)
  imagen text,
  url text not null,                      -- enlace de afiliación (deeplink)
  disponible boolean not null default true,
  visto timestamptz not null default now(),  -- última vez que vino en el catálogo
  busqueda tsvector generated always as (
    setweight(to_tsvector('spanish', f_unaccent(coalesce(titulo, ''))), 'A') ||
    setweight(to_tsvector('spanish', f_unaccent(coalesce(marca, ''))), 'B') ||
    setweight(to_tsvector('spanish', f_unaccent(coalesce(categoria_tienda, ''))), 'C')
  ) stored
);
create index if not exists productos_busqueda on productos using gin (busqueda);
create index if not exists productos_titulo_trgm on productos using gin (f_unaccent(lower(titulo)) extensions.gin_trgm_ops);
create index if not exists productos_categoria on productos (categoria, precio);
create index if not exists productos_tienda on productos (tienda_id);

-- Historial: solo se guarda una fila cuando el precio cambia (ahorra espacio).
create table if not exists precios (
  producto_id text not null references productos(id) on delete cascade,
  fecha date not null default current_date,
  precio numeric(10,2) not null,
  primary key (producto_id, fecha)
);

-- Registro de cada sincronización (lo enseña el panel)
create table if not exists sincronizaciones (
  id bigint generated always as identity primary key,
  inicio timestamptz not null default now(),
  fin timestamptz,
  red text not null,
  ok boolean,
  tiendas_nuevas text[] not null default '{}',
  productos int not null default 0,
  mensaje text
);

alter table productos enable row level security;
alter table precios enable row level security;
alter table sincronizaciones enable row level security;
drop policy if exists "admin todo" on productos;
create policy "admin todo" on productos for all using (es_admin()) with check (es_admin());
drop policy if exists "admin todo" on precios;
create policy "admin todo" on precios for all using (es_admin()) with check (es_admin());
drop policy if exists "admin lee" on sincronizaciones;
create policy "admin lee" on sincronizaciones for select using (es_admin());
grant select, insert, update, delete on productos, precios to authenticated;
grant select on sincronizaciones to authenticated;

-- Precio más bajo de los 30 días anteriores (base legal del descuento)
create or replace function precio_min_30d(pid text) returns numeric
language sql stable security definer set search_path = public as $$
  select min(p.precio) from precios p
  where p.producto_id = pid and p.fecha >= current_date - 30 and p.fecha < current_date
    -- solo si hay historial de al menos 30 días
    and exists (select 1 from precios q where q.producto_id = pid and q.fecha <= current_date - 30)
$$;

-- Búsqueda pública: solo tiendas aprobadas que dejan mostrar catálogo, productos disponibles y vistos en los últimos 3 días.
create or replace function buscar_productos(
  q text default null, cat text default null, tienda text default null,
  orden text default 'relevancia', limite int default 40, desde int default 0
) returns table (
  id text, tienda_id text, tienda text, titulo text, marca text, categoria text,
  precio numeric, precio_min_30d numeric, descuento int, imagen text, url text, total bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with base as (
    select p.*, t.nombre as tnombre,
      case when coalesce(q, '') = '' then 0
           else ts_rank(p.busqueda, websearch_to_tsquery('spanish', f_unaccent(q))) end as rank
    from productos p join tiendas t on t.id = p.tienda_id
    where t.estado = 'aprobada' and t.catalogo and p.disponible and p.visto > now() - interval '3 days'
      and (cat is null or p.categoria = cat)
      and (tienda is null or p.tienda_id = tienda)
      and (coalesce(q, '') = ''
           or p.busqueda @@ websearch_to_tsquery('spanish', f_unaccent(q))
           or f_unaccent(lower(p.titulo)) like '%' || f_unaccent(lower(q)) || '%')
  ), conmin as (
    select b.*, precio_min_30d(b.id) as m from base b
  )
  select c.id, c.tienda_id, c.tnombre, c.titulo, c.marca, c.categoria, c.precio, c.m,
    case when c.m is not null and c.precio < c.m then round((1 - c.precio / c.m) * 100)::int end,
    c.imagen, c.url, count(*) over ()
  from conmin c
  order by
    case when orden = 'precio' then c.precio end asc nulls last,
    case when orden = 'descuento' then (case when c.m is not null and c.precio < c.m then 1 - c.precio / c.m end) end desc nulls last,
    c.rank desc, c.precio asc nulls last
  limit least(greatest(limite, 1), 100) offset greatest(desde, 0)
$$;
grant execute on function buscar_productos(text, text, text, text, int, int) to anon, authenticated;

-- Cuántos productos hay por categoría (para los botones de categorías)
create or replace function categorias_catalogo() returns table (categoria text, n bigint)
language sql stable security definer set search_path = public as $$
  select p.categoria, count(*) from productos p join tiendas t on t.id = p.tienda_id
  where t.estado = 'aprobada' and t.catalogo and p.disponible and p.visto > now() - interval '3 days'
  group by 1 order by 2 desc
$$;
grant execute on function categorias_catalogo() to anon, authenticated;

-- Las tiendas públicas también dicen si tienen catálogo
create or replace view tiendas_publicas as
  select id, nombre, categoria, web_url from tiendas where estado = 'aprobada';
grant select on tiendas_publicas to anon, authenticated;
