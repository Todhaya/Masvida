-- Viwai · categorías por tienda y fuera productos para adultos (decisión de Alba, 13 nov 2026).
-- - Tienda de un solo tipo: todos sus productos en su categoría (Primor → Belleza, Juguetes Online → Peques…).
-- - Tiendas de todo (categoría «todo» o vacía: AliExpress, Amazon, Temu): categoría por palabras del título.
-- - La categoría elegida a mano en el panel manda siempre.
-- - Productos para adultos: nunca se muestran (una app para casas con peques).
-- Se puede ejecutar más de una vez.

update tiendas set categoria = 'belleza' where id = 'primor';
update tiendas set categoria = 'peques' where id in ('juguetesonline', 'eurekakids');
update tiendas set categoria = 'mascotas' where id = 'petolo';
update tiendas set categoria = 'tecnologia' where id = 'mibro';
update tiendas set categoria = 'todo' where id = 'aliexpress-awin';

create or replace function categoria_visible(p productos, t tiendas) returns text language sql stable as $$
  select coalesce(p.categoria_fija,
    case when t.categoria in ('mascotas', 'peques', 'belleza', 'electrodomesticos', 'tecnologia', 'cocina', 'hogar', 'deporte', 'moda', 'alimentacion', 'viajes')
         then t.categoria else p.categoria end)
$$;

create or replace function es_adulto(titulo text) returns boolean language sql immutable as $$
  select f_unaccent(lower(coalesce(titulo, ''))) ~ '(satisfyer|womanizer|succionador|vibrador|consolador|dildo|juguetes? (sexual|erotic)|erotic|lubricante|plug anal|clitoris|masturbador|preservativo|condon|sex toy|vibrator|lenceria sexy)'
$$;

create or replace function producto_visible(p productos, t tiendas) returns boolean
language sql stable as $$
  select t.estado = 'aprobada' and t.catalogo and p.disponible
    and coalesce(p.curado, '') <> 'descartado'
    and not es_adulto(coalesce(p.titulo_es, '') || ' ' || p.titulo)
    and (case when t.escaparate then p.curado = 'aprobado' else p.filtro_ok or p.curado = 'aprobado' end)
    and p.visto > now() - (case when p.curado = 'aprobado' then interval '30 days' else interval '3 days' end)
$$;

-- Lo mismo guardado en el producto, para el panel
update productos p set categoria = t.categoria from tiendas t
where t.id = p.tienda_id and t.categoria in ('mascotas', 'peques', 'belleza', 'electrodomesticos', 'tecnologia', 'cocina', 'hogar', 'deporte', 'moda', 'alimentacion', 'viajes')
  and p.categoria <> t.categoria;
update productos set filtro_ok = false where es_adulto(titulo) and filtro_ok;

create or replace function buscar_productos(
  q text default null, cat text default null, tienda text default null,
  orden text default 'relevancia', limite int default 40, desde int default 0
) returns table (
  id text, tienda_id text, tienda text, titulo text, marca text, categoria text,
  precio numeric, precio_min_30d numeric, descuento int, imagen text, url text, destacado boolean, total bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with base as (
    select p.*, titulo_limpio(coalesce(p.titulo_es, p.titulo)) as tvis, categoria_visible(p, t) as cvis, t.nombre as tnombre,
      case when coalesce(q, '') = '' then 0
           else ts_rank(p.busqueda, websearch_to_tsquery('spanish', f_unaccent(q))) end as rank
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t) and p.imagen is not null
      and (cat is null or categoria_visible(p, t) = cat)
      and (tienda is null or p.tienda_id = tienda)
      and (coalesce(q, '') = ''
           or p.busqueda @@ websearch_to_tsquery('spanish', f_unaccent(q))
           or f_unaccent(lower(coalesce(p.titulo_es, p.titulo))) like '%' || f_unaccent(lower(q)) || '%')
  ), conmin as (
    select b.*, precio_min_30d(b.id) as m from base b
  ), punt as (
    select c.*,
      case when c.m is not null and c.precio < c.m then 1 - c.precio / c.m end as dto,
      (case when c.destacado then 100 else 0 end)
      + (case when c.curado = 'aprobado' then 30 else 0 end)
      + (case when c.m is not null and c.precio < c.m then least(40, round((1 - c.precio / c.m) * 100)) else 0 end)
      + (case when c.precio between 12 and 250 then 15 when c.precio between 6 and 400 then 5 else 0 end)
      + (case when c.cvis = 'otros' then -10 else 0 end) as nota,
      -- desempate que cambia cada día, para que el escaparate no sea siempre el mismo
      md5(c.id || current_date::text) as giro
    from conmin c
  ), turno as (
    -- alterna tiendas y categorías: el mejor de cada tienda+categoría, luego el segundo…
    select x.*, row_number() over (partition by x.tienda_id, x.cvis order by x.nota desc, x.giro) as vuelta from punt x
  )
  select c.id, c.tienda_id, c.tnombre, c.tvis, nullif(nullif(lower(btrim(c.marca)), 'none'), '') , c.cvis, c.precio, c.m,
    case when c.dto is not null then round(c.dto * 100)::int end,
    c.imagen, c.url, c.destacado, count(*) over ()
  from turno c
  order by
    case when orden = 'precio' then c.precio end asc nulls last,
    case when orden = 'descuento' then c.dto end desc nulls last,
    case when coalesce(q, '') <> '' and orden = 'relevancia' then c.rank end desc nulls last,
    case when orden = 'relevancia' then c.destacado end desc,
    case when orden = 'relevancia' and coalesce(q, '') = '' then c.vuelta end asc,
    c.nota desc, c.giro
  limit least(greatest(limite, 1), 100) offset greatest(desde, 0)
$$;
grant execute on function buscar_productos(text, text, text, text, int, int) to anon, authenticated;

create or replace function categorias_catalogo() returns table (categoria text, n bigint)
language sql stable security definer set search_path = public as $$
  select categoria_visible(p, t), count(*) from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t) and p.imagen is not null
  group by 1 order by 2 desc
$$;
grant execute on function categorias_catalogo() to anon, authenticated;

select * from categorias_catalogo();
