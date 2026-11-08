-- Viwai · contadores propios de visitas e instalaciones (sin cookies ni almacenamiento en el navegador).
-- La web suma una visita por página vista; la app suma una instalación cuando el navegador la instala
-- y una apertura cada vez que se abre instalada. Solo se pueden sumar estos campos, de uno en uno.
alter table metricas add column if not exists aperturas int;

create or replace function suma_metrica(p_fuente text, p_campo text) returns void
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Europe/Madrid')::date;
begin
  if (p_fuente, p_campo) not in (('web','visitas'), ('app','instalaciones'), ('app','aperturas')) then
    raise exception 'métrica no permitida';
  end if;
  insert into metricas (fecha, fuente) values (d, p_fuente) on conflict (fecha, fuente) do nothing;
  execute format('update metricas set %I = coalesce(%I, 0) + 1 where fecha = $1 and fuente = $2', p_campo, p_campo) using d, p_fuente;
end $$;
revoke all on function suma_metrica(text, text) from public;
grant execute on function suma_metrica(text, text) to anon, authenticated;
