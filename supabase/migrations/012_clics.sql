-- Viwai · clics a tiendas desde la web y la app.
-- Cada enlace de afiliada lleva un id de clic (subid) que la red nos devuelve con la comisión: así sabemos qué
-- clic (y, con la app, qué casa) generó cada venta. La página crea el id y lo apunta con esta función.
-- Solo se apuntan clics a tiendas que existen; la casa sale de la sesión (si la hay), nunca del navegador.
alter table clics add column if not exists origen text;
create index if not exists clics_creado on clics (creado);

create or replace function registra_clic(p_id uuid, p_tienda text, p_origen text default 'web') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_id is null or not exists (select 1 from tiendas where id = p_tienda) then return; end if;
  insert into clics (id, hogar_id, tienda_id, origen)
  values (p_id, mi_hogar(), p_tienda, left(coalesce(p_origen, 'web'), 24))
  on conflict (id) do nothing;
end $$;
revoke all on function registra_clic(uuid, text, text) from public;
grant execute on function registra_clic(uuid, text, text) to anon, authenticated;
