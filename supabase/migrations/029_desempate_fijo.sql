-- Viwai · desempate fijo (id) al quitar repetidos, igual en el listado y en los contadores, para que siempre cuadren.
create or replace function buscar_productos(
  q text default null, cat text default null, tienda text default null,
  orden text default 'relevancia', limite int default 40, desde int default 0, sub text default null
) returns table (
  id text, tienda_id text, tienda text, titulo text, marca text, categoria text,
  precio numeric, precio_min_30d numeric, descuento int, imagen text, url text, destacado boolean, total bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with base as (
    select p.*, titulo_limpio(coalesce(p.titulo_es, p.titulo)) as tvis, categoria_visible(p, t) as cvis, t.nombre as tnombre, coalesce(t.comision_pct, 4) as pct,
      case when coalesce(q, '') = '' then 0
           else ts_rank(p.busqueda, websearch_to_tsquery('spanish', f_unaccent(q))) end as rank
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t) and p.imagen is not null
      and (cat is null or categoria_visible(p, t) = cat)
      and (buscar_productos.sub is null or p.sub = buscar_productos.sub)
      and (tienda is null or p.tienda_id = tienda)
      and (coalesce(q, '') = ''
           or p.busqueda @@ websearch_to_tsquery('spanish', f_unaccent(q))
           or f_unaccent(lower(coalesce(p.titulo_es, p.titulo))) like '%' || f_unaccent(lower(q)) || '%')
  ), unico as (
    -- AliExpress y otras dan cada color o talla como producto aparte: uno por título y uno por foto
    select * from (select b.*, row_number() over (partition by b.tienda_id, lower(left(b.tvis, 70)) order by b.destacado desc, b.precio, b.id) as r1,
                          row_number() over (partition by b.imagen order by b.destacado desc, b.precio, b.id) as r2 from base b) x
    where r1 = 1 and r2 = 1
  ), conmin as (
    select b.*, precio_min_30d(b.id) as m from unico b
  ), punt as (
    select c.*,
      case when c.m is not null and c.precio < c.m then 1 - c.precio / c.m end as dto,
      (case when c.destacado then 100 else 0 end)
      + (case when c.curado = 'aprobado' then 30 else 0 end)
      + (case when c.m is not null and c.precio < c.m then least(40, round((1 - c.precio / c.m) * 100)) else 0 end)
      + (case when c.precio between 12 and 250 then 15 when c.precio between 6 and 400 then 5 else 0 end)
      + (case when c.cvis = 'otros' then -10 else 0 end)
      + least(30, c.pct * 2) as nota,  -- las tiendas que más pagan, antes
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
    case when orden = 'relevancia' then c.pct end desc,
    c.nota desc, c.giro
  limit least(greatest(limite, 1), 100) offset greatest(desde, 0)
$$;
grant execute on function buscar_productos(text, text, text, text, int, int, text) to anon, authenticated;

-- Viwai · los contadores de categorías y grupos cuentan exactamente igual que el listado:
-- sin repetidos por título ni por foto (dentro de la categoría o del grupo, como hace buscar_productos), solo visibles con foto.
drop function if exists productos_unicos();
create or replace function productos_unicos() returns table (cat text, sub text, en_cat boolean, en_sub boolean)
language sql stable security definer set search_path = public, extensions as $$
  select x.cvis, x.sub, (x.c1 = 1 and x.c2 = 1), (x.s1 = 1 and x.s2 = 1) from (
    select categoria_visible(p, t) as cvis, p.sub,
      row_number() over (partition by categoria_visible(p, t), p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70)) order by p.destacado desc, p.precio, p.id) as c1,
      row_number() over (partition by categoria_visible(p, t), p.imagen order by p.destacado desc, p.precio, p.id) as c2,
      row_number() over (partition by categoria_visible(p, t), p.sub, p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70)) order by p.destacado desc, p.precio, p.id) as s1,
      row_number() over (partition by categoria_visible(p, t), p.sub, p.imagen order by p.destacado desc, p.precio, p.id) as s2
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t) and p.imagen is not null
  ) x
$$;

create or replace function categorias_catalogo() returns table (categoria text, n bigint)
language sql stable security definer set search_path = public as $$
  select cat, count(*) filter (where en_cat) from productos_unicos() group by 1 order by 2 desc
$$;

create or replace function subcategorias_catalogo(cat text) returns table (sub text, nombre text, n bigint)
language sql stable security definer set search_path = public as $$
  select u.sub, coalesce((select s.nombre from subcategorias s where s.cat = subcategorias_catalogo.cat and s.sub = u.sub), u.sub), count(*) filter (where u.en_sub)
  from productos_unicos() u where u.cat = subcategorias_catalogo.cat and u.sub is not null
  group by 1, 2 order by (u.sub = 'mas'), 3 desc
$$;
grant execute on function categorias_catalogo() to anon, authenticated;
grant execute on function subcategorias_catalogo(text) to anon, authenticated;

select * from subcategorias_catalogo('moda');
