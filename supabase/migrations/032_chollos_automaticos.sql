-- Viwai · chollos automáticos (Black Friday y campañas): productos que hoy cuestan al menos un 10 % menos
-- que el precio MÁS BAJO que hemos visto antes de su último cambio de precio (desde que seguimos ese producto).
-- Así un producto que bajó hace unos días y sigue bajado sigue contando. Se muestra la fecha desde la que lo seguimos.
-- Cuando haya 30 días de historial, el descuento legal (precio_min_30d) ya sale en el buscador.
create or replace function chollos_automaticos(limite int default 24, cat text default null)
returns table (id text, tienda_id text, tienda text, titulo text, categoria text, precio numeric, minimo_antes numeric,
               desde date, bajada int, imagen text, url text)
language sql stable security definer set search_path = public, extensions as $$
  with u as (select producto_id, max(fecha) as ultima from precios group by 1),
  h as (
    select pr.producto_id, min(pr.precio) filter (where pr.fecha < u.ultima) as minimo, min(pr.fecha) as desde
    from precios pr join u using (producto_id) group by 1
  )
  select p.id, p.tienda_id, t.nombre, titulo_limpio(coalesce(p.titulo_es, p.titulo)), categoria_visible(p, t), p.precio, h.minimo, h.desde,
         round((1 - p.precio / h.minimo) * 100)::int, p.imagen, p.url
  from productos p join tiendas t on t.id = p.tienda_id join h on h.producto_id = p.id
  where producto_visible(p, t) and p.imagen is not null and h.minimo is not null
    and p.precio <= h.minimo * 0.9 and p.precio >= 5
    and (cat is null or categoria_visible(p, t) = cat)
  order by (1 - p.precio / h.minimo) * least(p.precio, 200) desc  -- bajadas grandes en cosas de precio razonable
  limit least(greatest(limite, 1), 60)
$$;
grant execute on function chollos_automaticos(int, text) to anon, authenticated;
select count(*) from chollos_automaticos(60);
