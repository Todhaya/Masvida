-- Viwai · logos de tienda, enlace de tienda y promociones de las redes (13 nov 2026).
-- - logo_url y enlace los rellena la carga con lo que da cada red (Awin, Admitad).
-- - promociones: ofertas y códigos activos que publican las tiendas aprobadas en su red (Awin). Se ven en Black Friday.
-- - Los contadores de categorías cuentan sin repetidos, igual que el buscador.
-- Se puede ejecutar más de una vez.

alter table tiendas add column if not exists logo_url text;
alter table tiendas add column if not exists enlace text;   -- enlace de afiliación a la portada de la tienda

create or replace view tiendas_publicas as
  select id, nombre, categoria, web_url, logo_url, enlace from tiendas where estado = 'aprobada';
grant select on tiendas_publicas to anon, authenticated;

create table if not exists promociones (
  id text primary key,                    -- <red>:<id de la promoción>
  tienda_id text not null references tiendas(id) on delete cascade,
  tipo text,                              -- 'codigo' o 'oferta'
  titulo text not null,
  descripcion text,
  codigo text,
  url text not null,                      -- enlace de afiliación
  inicio timestamptz,
  fin timestamptz,
  visto timestamptz not null default now()
);
alter table promociones enable row level security;
drop policy if exists "todos leen" on promociones;
create policy "todos leen" on promociones for select using (true);
grant select on promociones to anon, authenticated;
grant all on promociones to service_role;

-- Promociones visibles: de tiendas aprobadas, vigentes y vistas en la última carga
create or replace view promociones_activas as
  select pr.id, pr.tienda_id, t.nombre as tienda, t.logo_url, pr.tipo, pr.titulo, pr.descripcion, pr.codigo, pr.url, pr.fin
  from promociones pr join tiendas t on t.id = pr.tienda_id
  where t.estado = 'aprobada' and (pr.fin is null or pr.fin > now()) and (pr.inicio is null or pr.inicio <= now() + interval '7 days')
    and pr.visto > now() - interval '3 days';
grant select on promociones_activas to anon, authenticated;

create or replace function categorias_catalogo() returns table (categoria text, n bigint)
language sql stable security definer set search_path = public as $$
  select categoria_visible(p, t), count(distinct (p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70))))
  from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t) and p.imagen is not null
  group by 1 order by 2 desc
$$;
create or replace function subcategorias_catalogo(cat text) returns table (sub text, n bigint)
language sql stable security definer set search_path = public as $$
  select subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto) as s,
         count(distinct (p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70))))
  from productos p join tiendas t on t.id = p.tienda_id
  where producto_visible(p, t) and p.imagen is not null and categoria_visible(p, t) = cat
  group by 1 order by 2 desc
$$;

select * from subcategorias_catalogo('moda');
