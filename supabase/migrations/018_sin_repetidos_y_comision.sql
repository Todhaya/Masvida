-- Viwai · catálogo sin repetidos y por comisión (petición de Alba, 13 nov 2026).
-- - Uno por título y uno por foto en cada tienda (AliExpress repite el mismo producto por color o talla).
-- - «Recomendados»: además de la puntuación, antes las tiendas que más pagan (tiendas.comision_pct, lo rellena la carga).
-- - Moda: cada tienda puede tener su grupo por defecto (TOUS → Joyas) para lo que no encaja por palabras.
-- Se puede ejecutar más de una vez.

alter table tiendas add column if not exists comision_pct numeric;   -- % más alto que publica su red
alter table tiendas add column if not exists sub_defecto text;       -- grupo por defecto dentro de su categoría
update tiendas set sub_defecto = 'joyas' where nombre ilike 'tous%';

drop function if exists subcategoria(text, text);
create or replace function subcategoria(cat text, titulo text, defecto text default null) returns text language sql immutable as $$
  select case when cat <> 'moda' then null else (
    with t as (select f_unaccent(lower(coalesce(titulo, ''))) as x)
    select case
      when x ~ '\m(bolsos?|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote)\M' then 'bolsos'
      when x ~ '\m(zapat\w*|botas?|botines?|sandalias?|mocasin\w*|chanclas?|alpargatas?|bailarinas?|deportivas?|sneakers?|zuecos?|pantuflas?|zapatillas?)\M' then 'calzado'
      when x ~ '\m(collar\w*|pendientes?|anillos?|sortijas?|pulseras?|colgantes?|joyas?|joyeria|charms?|gargantillas?|brazaletes?|tobilleras?|relojes?|reloj|aros?|piercing\w*|broche\w*|alianzas?)\M' then 'joyas'
      when x ~ '\m(gafas|gorros?|gorras?|bufandas?|guantes?|cinturon\w*|panuelos?|sombreros?|paraguas|corbatas?|fulares?|diademas?|pinzas?|coleteros?|llaveros?)\M' then 'accesorios'
      else coalesce(defecto, 'ropa') end
    from t) end
$$;

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
      and (sub is null or subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto) = sub)
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



create or replace function subcategorias_catalogo(cat text) returns table (sub text, n bigint)
language sql stable security definer set search_path = public as $$
  select subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto) as s, count(*) from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t) and p.imagen is not null and categoria_visible(p, t) = cat
  group by 1 order by 2 desc
$$;
grant execute on function subcategorias_catalogo(text) to anon, authenticated;

select * from subcategorias_catalogo('moda');
