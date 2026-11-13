-- Viwai · los seguros (Petolo) no salen en la web hasta consultarlo con la gestoría (decisión de Alba).
-- Las promociones solo de tiendas que muestran catálogo. Se puede ejecutar más de una vez.
update tiendas set catalogo = false, categoria = 'seguros' where id = 'petolo';

create or replace view promociones_activas as
  select pr.id, pr.tienda_id, t.nombre as tienda, t.logo_url, pr.tipo, pr.titulo, pr.descripcion, pr.codigo, pr.url, pr.fin
  from promociones pr join tiendas t on t.id = pr.tienda_id
  where t.estado = 'aprobada' and t.catalogo and coalesce(t.categoria, '') <> 'seguros'
    and (pr.fin is null or pr.fin > now()) and (pr.inicio is null or pr.inicio <= now() + interval '7 days')
    and pr.visto > now() - interval '3 days';
grant select on promociones_activas to anon, authenticated;
select count(*) from promociones_activas;

-- Enlace a la portada de TOUS y EcoFlow (CJ, enlace profundo); la carga lo mantiene después
update tiendas set enlace = 'https://www.anrdoezrs.net/links/101923458/type/dlg/https://www.tous.com/es-es/' where id = 'tous' and enlace is null;
update tiendas set enlace = 'https://www.anrdoezrs.net/links/101923458/type/dlg/https://es.ecoflow.com/' where id = 'ecoflow' and enlace is null;
