-- Viwai · Moda separada en grupos (petición de Alba, 13 nov 2026): Ropa, Calzado, Bolsos, Joyas y relojes, Accesorios.
-- Se decide por palabras del título; lo que no encaja, Ropa. Al elegir Moda en la web salen como botones.
-- Se puede ejecutar más de una vez.

create or replace function subcategoria(cat text, titulo text) returns text language sql immutable as $$
  select case when cat <> 'moda' then null else (
    with t as (select f_unaccent(lower(coalesce(titulo, ''))) as x)
    select case
      when x ~ '\m(bolsos?|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote)\M' then 'bolsos'
      when x ~ '\m(zapat\w*|botas?|botines?|sandalias?|mocasin\w*|chanclas?|alpargatas?|bailarinas?|deportivas?|sneakers?|zuecos?|pantuflas?|zapatillas?)\M' then 'calzado'
      when x ~ '\m(collar\w*|pendientes?|anillos?|sortijas?|pulseras?|colgantes?|joyas?|joyeria|charms?|gargantillas?|brazaletes?|tobilleras?|relojes?|reloj|aros?|piercing\w*|broche\w*|alianzas?)\M' then 'joyas'
      when x ~ '\m(gafas|gorros?|gorras?|bufandas?|guantes?|cinturon\w*|panuelos?|sombreros?|paraguas|corbatas?|fulares?|diademas?|pinzas?|coleteros?|llaveros?)\M' then 'accesorios'
      else 'ropa' end
    from t) end
$$;

drop function if exists buscar_productos(text, text, text, text, int, int);
create or replace function buscar_productos(
  q text default null, cat text default null, tienda text default null,
  orden text default 'relevancia', limite int default 40, desde int default 0, sub text default null
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
      and (sub is null or subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo)) = sub)
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
grant execute on function buscar_productos(text, text, text, text, int, int, text) to anon, authenticated;


create or replace function subcategorias_catalogo(cat text) returns table (sub text, n bigint)
language sql stable security definer set search_path = public as $$
  select subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo)) as s, count(*) from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t) and p.imagen is not null and categoria_visible(p, t) = cat
  group by 1 order by 2 desc
$$;
grant execute on function subcategorias_catalogo(text) to anon, authenticated;

select * from subcategorias_catalogo('moda');
