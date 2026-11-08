-- Viwai · reparto automático del reembolso. Lo ejecuta la sincronización de cada noche, después de importar comisiones.
-- Reglas (las mismas que app/js/reembolso.js y docs/DECISIONES.md):
--  - Solo en tiendas con cashback comprobado (tiendas.cashback = true) y con el clic de una casa.
--  - La casa recibe el % de su nivel sobre el importe de la compra: 1 %, 1,5 % (1 amiga), 2 % (3), 2,5 % (5), 3 % (10).
--    Si la red no da el importe (pago fijo por alta), 10 veces el % sobre la comisión (10–30 %).
--  - Tope: Viwai se queda al menos el 30 % de cada comisión.
--  - El reembolso está «pendiente» hasta que la tienda confirma; si la anula, se anula.
--  - Invitaciones: cuando la casa invitada tiene su primer reembolso confirmado, 3 € para cada una.
-- Se puede ejecutar las veces que haga falta: no repite nada.

create or replace function nivel_pct(h uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select case when n >= 10 then 0.03 when n >= 5 then 0.025 when n >= 3 then 0.02 when n >= 1 then 0.015 else 0.01 end
  from (select count(*) as n from invitaciones where hogar_invita = h and activada is not null) x
$$;

create or replace function estado_reembolso(estado_comision text) returns text language sql immutable as $$
  select case when estado_comision in ('confirmada', 'pagada') then 'confirmada' when estado_comision = 'anulada' then 'anulada' else 'pendiente' end
$$;

create or replace function reparte_comisiones() returns jsonb
language plpgsql security definer set search_path = public as $$
declare nuevos int := 0; cambiados int := 0; premios int := 0;
begin
  -- 1. Reembolsos nuevos
  insert into movimientos (hogar_id, tipo, importe, estado, comision_id, concepto)
  select x.hogar_id, 'reembolso', x.importe, estado_reembolso(x.estado), x.id, 'Compra en ' || x.tienda
  from (
    select co.id, co.estado, cl.hogar_id, coalesce(t.nombre, co.tienda_id) as tienda,
      round(least(case when co.importe_venta > 0 then co.importe_venta * nivel_pct(cl.hogar_id)
                       else co.comision * nivel_pct(cl.hogar_id) * 10 end,
                  co.comision * 0.7), 2) as importe
    from comisiones co
    join clics cl on cl.id = co.clic_id
    join tiendas t on t.id = co.tienda_id
    where cl.hogar_id is not null and t.cashback is true and co.estado <> 'anulada' and co.comision > 0
      and not exists (select 1 from movimientos m where m.comision_id = co.id and m.tipo = 'reembolso')
  ) x
  where x.importe > 0;
  get diagnostics nuevos = row_count;

  -- 2. La tienda confirma o anula
  update movimientos m set estado = estado_reembolso(co.estado)
  from comisiones co
  where m.comision_id = co.id and m.tipo = 'reembolso' and m.estado <> estado_reembolso(co.estado);
  get diagnostics cambiados = row_count;

  -- 3. Premios por invitación (primera compra confirmada de la invitada)
  with act as (
    update invitaciones i set activada = now()
    where i.activada is null and exists (
      select 1 from movimientos m where m.hogar_id = i.hogar_invitado and m.tipo = 'reembolso' and m.estado = 'confirmada')
    returning i.hogar_invita, i.hogar_invitado
  )
  insert into movimientos (hogar_id, tipo, importe, estado, concepto)
  select hogar_invita, 'premio', 3, 'confirmada', 'Premio por invitar a una amiga' from act
  union all
  select hogar_invitado, 'premio', 3, 'confirmada', 'Premio de bienvenida por invitación' from act;
  get diagnostics premios = row_count;

  return jsonb_build_object('nuevos', nuevos, 'cambiados', cambiados, 'premios', premios);
end $$;
revoke all on function reparte_comisiones() from public, anon, authenticated;
grant execute on function reparte_comisiones() to service_role;
