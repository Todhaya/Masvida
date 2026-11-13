-- Viwai · los contadores de categorías y grupos cuentan exactamente igual que el listado:
-- sin repetidos por título ni por foto (dentro de la categoría o del grupo, como hace buscar_productos), solo visibles con foto.
drop function if exists productos_unicos();
create or replace function productos_unicos() returns table (cat text, sub text, en_cat boolean, en_sub boolean)
language sql stable security definer set search_path = public, extensions as $$
  select x.cvis, x.sub, (x.c1 = 1 and x.c2 = 1), (x.s1 = 1 and x.s2 = 1) from (
    select categoria_visible(p, t) as cvis, p.sub,
      row_number() over (partition by categoria_visible(p, t), p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70)) order by p.destacado desc, p.precio) as c1,
      row_number() over (partition by categoria_visible(p, t), p.imagen order by p.destacado desc, p.precio) as c2,
      row_number() over (partition by categoria_visible(p, t), p.sub, p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70)) order by p.destacado desc, p.precio) as s1,
      row_number() over (partition by categoria_visible(p, t), p.sub, p.imagen order by p.destacado desc, p.precio) as s2
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
