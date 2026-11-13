-- Viwai · búsqueda más rápida: lo de adultos ya se marca al guardar (filtro_ok = false, en la carga y aquí),
-- así que la búsqueda no repite esa comprobación en cada producto. Se puede ejecutar más de una vez.
update productos set filtro_ok = false where filtro_ok and es_adulto(coalesce(titulo_es, '') || ' ' || titulo);
update productos set curado = 'descartado' where curado = 'aprobado' and es_adulto(coalesce(titulo_es, '') || ' ' || titulo);

create or replace function producto_visible(p productos, t tiendas) returns boolean
language sql stable as $$
  select t.estado = 'aprobada' and t.catalogo and p.disponible
    and coalesce(p.curado, '') <> 'descartado'
    and (case when t.escaparate then p.curado = 'aprobado' else p.filtro_ok or p.curado = 'aprobado' end)
    and p.visto > now() - (case when p.curado = 'aprobado' then interval '30 days' else interval '3 days' end)
$$;
select 1;
