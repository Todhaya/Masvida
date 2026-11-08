-- Viwai · panel de administración (viwai.es/admin)
-- Solo las cuentas cuyo email está en `admins` ven y editan estos datos (RLS).
-- Lo que la web y la app necesitan leer (campañas activas, ofertas y ayudas vigentes) es de lectura pública.
-- Se puede ejecutar más de una vez: todo usa "if not exists" / "or replace" / "on conflict".

-- Quién es admin -------------------------------------------------------------
create table if not exists admins (email text primary key);
insert into admins (email) values ('hola@viwai.es') on conflict do nothing;
alter table admins enable row level security;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))) $$;

drop policy if exists "admin ve admins" on admins;
create policy "admin ve admins" on admins for select using (es_admin());

-- Lectura de lo que ya existe (usuarias, lista de espera, dinero) -----------
do $$
declare t text;
begin
  foreach t in array array['hogares','cuentas','personas','perfiles','clics','comisiones','movimientos','invitaciones','lista_espera'] loop
    execute format('drop policy if exists "admin lee" on %I', t);
    execute format('create policy "admin lee" on %I for select using (es_admin())', t);
  end loop;
end $$;

-- Comisiones: mientras no hay importación automática, se meten a mano o por CSV desde el panel.
drop policy if exists "admin escribe comisiones" on comisiones;
create policy "admin escribe comisiones" on comisiones for all using (es_admin()) with check (es_admin());
-- Reembolsos: el panel marca retiradas como pagadas o anula premios fraudulentos.
drop policy if exists "admin actualiza movimientos" on movimientos;
create policy "admin actualiza movimientos" on movimientos for update using (es_admin()) with check (es_admin());

-- Ajustes del negocio (objetivos, reservas, reparto) --------------------------
create table if not exists ajustes (
  clave text primary key,
  valor jsonb not null,
  actualizado timestamptz not null default now()
);
insert into ajustes (clave, valor) values
  ('objetivos', '{"marca_oepm": 150, "cuota_autonoma": 300, "neto_mensual": 1500, "dejar_trabajo": 4000}'),
  ('reservas',  '{"irpf_pct": 20, "colchon_pct": 10}')
on conflict (clave) do nothing;

-- Gastos de estructura (dominio, herramientas, gestoría...)
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  concepto text not null,
  categoria text not null default 'herramientas' check (categoria in ('herramientas','dominios','publicidad','gestoria','impuestos','marca','otros')),
  importe numeric(10,2) not null check (importe >= 0),
  periodicidad text not null default 'unico' check (periodicidad in ('unico','mensual','anual'))
);

-- Métricas que aún no llegan solas (visitas, instalaciones, redes) -----------
create table if not exists metricas (
  fecha date not null,
  fuente text not null check (fuente in ('web','app','instagram','tiktok','facebook','email','push')),
  visitas int, visitantes int, instalaciones int, seguidores int, clics int,
  primary key (fecha, fuente)
);

-- Redes de afiliación y tiendas ----------------------------------------------
create table if not exists redes (
  id text primary key,
  nombre text not null,
  panel_url text,
  estado text not null default 'alta' check (estado in ('pendiente','revision','alta','rechazada')),
  notas text
);
insert into redes (id, nombre, panel_url, estado) values
  ('awin','Awin','https://ui.awin.com','pendiente'),
  ('tradedoubler','Tradedoubler','https://login.tradedoubler.com','alta'),
  ('admitad','Admitad','https://store.admitad.com','revision'),
  ('cj','CJ Affiliate','https://members.cj.com','alta')
on conflict (id) do nothing;

create table if not exists tiendas (
  id text primary key,                         -- mismo id que usa la función /ir y la tabla clics
  nombre text not null,
  red_id text references redes(id),
  categoria text,
  programa_url text,                           -- ficha del programa en la red
  web_url text,
  comision_texto text,                         -- "6 % ropa, 3 % hogar", tal como lo da la tienda
  cashback boolean,                            -- null = sin comprobar
  estado text not null default 'por_pedir' check (estado in ('por_pedir','pedida','aprobada','rechazada','pausada')),
  notas text
);

-- Campañas de temporada (alimentan la web y la app) --------------------------
create table if not exists campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  inicio date not null,
  fin date not null check (fin >= inicio),
  estado text not null default 'borrador' check (estado in ('borrador','programada','pausada')),
  titulo text,                                 -- titular en la portada de la web / inicio de la app
  texto text,
  imagen text,
  categorias text[] not null default '{}',
  palabras text[] not null default '{}',
  tiendas text[] not null default '{}',
  solo_rebajado boolean not null default false,
  objetivo_clics int,
  creado timestamptz not null default now()
);

-- Avisos push y correos ------------------------------------------------------
create table if not exists envios (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('push','email')),
  campana_id uuid references campanas(id) on delete set null,
  publico text not null default 'todas',      -- todas · lista_espera · sola · pareja · peques · compartido · sin_actividad_30d
  asunto text not null,
  texto text not null,
  enlace text,
  programado timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador','programado','enviado','cancelado')),
  enviados int, abiertos int, clics int, bajas int,
  creado timestamptz not null default now()
);

-- Catálogo (fichas de oferta) ------------------------------------------------
create table if not exists ofertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tienda_id text references tiendas(id),
  url text not null,
  imagen text,
  categoria text,
  precio numeric(10,2),
  precio_min_30d numeric(10,2),               -- base legal para anunciar un descuento
  campana_id uuid references campanas(id) on delete set null,
  activa boolean not null default true,
  caduca date,
  comprobada date
);

-- Ayudas, bonos y deducciones -------------------------------------------------
create table if not exists ayudas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ambito text not null default 'estatal',      -- estatal o código de comunidad
  para text,                                   -- a quién va (resumen)
  requisitos text,
  cuantia text,
  enlace text,
  plazo_fin date,
  activa boolean not null default true,
  revisada date
);

-- Calendario fiscal, legal y de renovaciones -----------------------------------
create table if not exists calendario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  titulo text not null,
  tipo text not null default 'fiscal' check (tipo in ('fiscal','legal','renovacion','campana','otro')),
  notas text,
  hecho boolean not null default false
);
insert into calendario (fecha, titulo, tipo, notas)
select * from (values
  ('2026-11-20'::date, 'Tiendas aprobadas para Black Friday', 'campana', 'Fecha límite para tener enlaces en la página de chollos'),
  ('2027-01-30'::date, 'IVA 4.º trimestre (modelo 303) y resumen anual (390)', 'fiscal', 'Solo si ya estás dada de alta en Hacienda'),
  ('2027-04-20'::date, 'IVA y pago fraccionado 1.er trimestre (303 y 130)', 'fiscal', 'Solo si ya estás dada de alta en Hacienda'),
  ('2027-06-30'::date, 'Fin de la campaña de la renta', 'fiscal', 'Incluye lo cobrado de afiliación'),
  ('2027-07-20'::date, 'IVA y pago fraccionado 2.º trimestre (303 y 130)', 'fiscal', null),
  ('2027-10-20'::date, 'IVA y pago fraccionado 3.er trimestre (303 y 130)', 'fiscal', null),
  ('2027-05-08'::date, 'Caduca el certificado SSL de viwai.es', 'renovacion', 'IONOS lo renueva solo; comprobar'),
  ('2027-11-06'::date, 'Renovación de viwai.es y viwai.app', 'renovacion', 'IONOS')
) v(fecha, titulo, tipo, notas)
where not exists (select 1 from calendario);

-- Seguridad ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ajustes','gastos','metricas','redes','tiendas','campanas','envios','ofertas','ayudas','calendario'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin todo" on %I', t);
    execute format('create policy "admin todo" on %I for all using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;

-- Lo público: lo que la web y la app enseñan
drop policy if exists "publico campanas en curso" on campanas;
create policy "publico campanas en curso" on campanas for select to anon, authenticated
  using (estado = 'programada' and current_date between inicio and fin);
drop policy if exists "publico ofertas activas" on ofertas;
create policy "publico ofertas activas" on ofertas for select to anon, authenticated
  using (activa and (caduca is null or caduca >= current_date));
drop policy if exists "publico ayudas activas" on ayudas;
create policy "publico ayudas activas" on ayudas for select to anon, authenticated
  using (activa and (plazo_fin is null or plazo_fin >= current_date));

grant select on campanas, ofertas, ayudas to anon, authenticated;
grant select, insert, update, delete on admins, ajustes, gastos, metricas, redes, tiendas, campanas, envios, ofertas, ayudas, calendario, comisiones to authenticated;
grant update on movimientos to authenticated;
grant select on hogares, cuentas, personas, perfiles, clics, comisiones, movimientos, invitaciones, lista_espera to authenticated;
