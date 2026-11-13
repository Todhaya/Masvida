-- Viwai · herramienta «¿Es rebaja de verdad?» (web /es-rebaja/): historial de precio de un producto visible.
-- Solo lectura. Devuelve un punto por día con precio guardado (desde que seguimos el producto).
-- Se puede ejecutar más de una vez.
create or replace function historial_precio(pid text)
returns table (fecha date, precio numeric)
language sql stable security definer set search_path = public, extensions as $$
  select pr.fecha, pr.precio
  from precios pr
  join productos p on p.id = pr.producto_id
  join tiendas t on t.id = p.tienda_id
  where pr.producto_id = pid and producto_visible(p, t)
  order by pr.fecha
  limit 400
$$;
grant execute on function historial_precio(text) to anon, authenticated;

select count(*) as dias_con_precio, min(fecha) as desde from precios;
