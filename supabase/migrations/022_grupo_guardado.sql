-- Viwai · el grupo de cada producto se guarda en el producto (rápido) en vez de calcularse en cada búsqueda.
-- Se rellena al guardar el producto (disparador) y con recalcula_subcategorias() cuando cambian las reglas o la tienda.
-- Se puede ejecutar más de una vez.

alter table productos add column if not exists sub text;
create index if not exists productos_cat_sub on productos (categoria, sub);

create or replace function pon_subcategoria() returns trigger language plpgsql set search_path = public, extensions as $$
declare t tiendas;
begin
  select * into t from tiendas where id = new.tienda_id;
  new.sub := subcategoria(categoria_visible(new, t), coalesce(new.titulo_es, new.titulo), t.sub_defecto);
  return new;
end $$;
drop trigger if exists productos_sub on productos;
create trigger productos_sub before insert or update of titulo, titulo_es, categoria, categoria_fija on productos
  for each row execute function pon_subcategoria();

create or replace function recalcula_subcategorias() returns int language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  update productos p set sub = subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto)
  from tiendas t where t.id = p.tienda_id
    and p.sub is distinct from subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function recalcula_subcategorias() from public, anon, authenticated;
grant execute on function recalcula_subcategorias() to service_role;

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
    select * from (select b.*, row_number() over (partition by b.tienda_id, lower(left(b.tvis, 70)) order by b.destacado desc, b.precio) as r1,
                          row_number() over (partition by b.imagen order by b.destacado desc, b.precio) as r2 from base b) x
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

drop function if exists subcategorias_catalogo(text);
create or replace function subcategorias_catalogo(cat text) returns table (sub text, nombre text, n bigint)
language sql stable security definer set search_path = public as $$
  select x.s, coalesce((select s.nombre from subcategorias s where s.cat = subcategorias_catalogo.cat and s.sub = x.s), x.s), x.n
  from (
    select p.sub as s, count(distinct (p.tienda_id, lower(left(coalesce(p.titulo_es, p.titulo), 70)))) as n
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t) and p.imagen is not null and categoria_visible(p, t) = cat and p.sub is not null
    group by 1
  ) x
  order by (x.s = 'mas'), x.n desc
$$;
grant execute on function subcategorias_catalogo(text) to anon, authenticated;

select recalcula_subcategorias() as productos_actualizados;
