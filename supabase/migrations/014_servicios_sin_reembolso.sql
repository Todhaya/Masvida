-- Viwai · servicios sin reembolso (decisión de Alba, 9 nov 2026).
-- En luz, gas, telefonía, seguros… la usuaria se lleva el ahorro en la factura y Viwai la comisión entera.
-- El primer cambio de tarifa confirmado (con el clic de la casa) sí activa la invitación: 3 € para cada una.
-- Sustituye a reparte_comisiones() de la 013. Se puede ejecutar más de una vez.

create or replace function es_servicio(cat text) returns boolean language sql immutable as $$
  select lower(coalesce(cat, '')) in ('luz', 'gas', 'energia', 'fibra', 'movil', 'telefonia', 'internet', 'seguros', 'alarmas')
$$;

create or replace function reparte_comisiones() returns jsonb
language plpgsql security definer set search_path = public as $$
declare nuevos int := 0; cambiados int := 0; premios int := 0;
begin
  -- 1. Reembolsos nuevos (solo compras: tiendas con cashback comprobado y que no son servicios)
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
    where cl.hogar_id is not null and t.cashback is true and not es_servicio(t.categoria)
      and co.estado <> 'anulada' and co.comision > 0
      and not exists (select 1 from movimientos m where m.comision_id = co.id and m.tipo = 'reembolso')
  ) x
  where x.importe > 0;
  get diagnostics nuevos = row_count;

  -- 2. La tienda confirma o anula
  update movimientos m set estado = estado_reembolso(co.estado)
  from comisiones co
  where m.comision_id = co.id and m.tipo = 'reembolso' and m.estado <> estado_reembolso(co.estado);
  get diagnostics cambiados = row_count;

  -- 3. Premios por invitación: primera compra con reembolso confirmada o primer cambio de tarifa confirmado de la invitada
  with act as (
    update invitaciones i set activada = now()
    where i.activada is null and (
      exists (select 1 from movimientos m where m.hogar_id = i.hogar_invitado and m.tipo = 'reembolso' and m.estado = 'confirmada')
      or exists (select 1 from comisiones co join clics cl on cl.id = co.clic_id join tiendas t on t.id = co.tienda_id
                 where cl.hogar_id = i.hogar_invitado and es_servicio(t.categoria) and co.estado in ('confirmada', 'pagada')))
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
