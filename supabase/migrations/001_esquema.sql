-- Viwai · esquema inicial (Supabase / Postgres)
-- Principio: cada dato pertenece a un hogar; solo los adultos con cuenta en ese hogar lo ven (RLS).
-- Las comisiones y los movimientos de dinero solo los escribe el servidor (service role).

create extension if not exists pgcrypto;

-- Hogares y cuentas -------------------------------------------------------
create table hogares (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  codigo_invitacion text unique not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  invitado_por uuid references hogares(id)
);

create table cuentas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hogar_id uuid not null references hogares(id) on delete cascade,
  rol text not null default 'adulto' check (rol in ('titular', 'adulto')),
  creado timestamptz not null default now()
);

create or replace function mi_hogar() returns uuid
language sql stable security definer set search_path = public as
$$ select hogar_id from cuentas where user_id = auth.uid() $$;

-- Personas de la casa (no necesitan cuenta: niños, otros adultos)
create table personas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 40),
  es_peque boolean not null default false,
  edad smallint check (edad between 0 and 120),
  talla text,
  pie smallint,
  en_casa text not null default 'siempre' check (en_casa in ('siempre', 'alterno')),
  color text,
  orden smallint not null default 0
);

-- Perfil para ayudas y ofertas (datos mínimos, sin identificadores)
create table perfiles (
  hogar_id uuid primary key references hogares(id) on delete cascade,
  ccaa text,
  codigo_postal text check (codigo_postal ~ '^[0-9]{5}$'),
  vivienda text,
  tramo_ingresos text check (tramo_ingresos in ('bajos', 'medios', 'altos')),
  situacion text[] not null default '{}',
  intereses text[] not null default '{}',
  tiendas text[] not null default '{}',
  coche boolean,
  actualizado timestamptz not null default now()
);

-- Facturas: el archivo va a Storage (bucket privado 'facturas/<hogar_id>/...'); aquí solo lo leído
create table facturas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  tipo text not null check (tipo in ('luz', 'gas', 'fibra', 'movil', 'seguro', 'otra')),
  archivo text,
  leido jsonb,            -- importe, periodo, potencia, consumo, compañía... (sin titular ni DNI)
  importe_mensual numeric(8,2),
  creado timestamptz not null default now()
);

-- Módulos de organización (menú, tareas, armario, documentos): datos flexibles por módulo
create table modulos (
  hogar_id uuid not null references hogares(id) on delete cascade,
  modulo text not null check (modulo in ('menu', 'compra', 'tareas', 'premios', 'armario', 'documentos', 'pedidos', 'wallet', 'mantenimiento', 'calendario', 'eventos')),
  datos jsonb not null default '{}',
  actualizado timestamptz not null default now(),
  primary key (hogar_id, modulo)
);

-- Afiliación ---------------------------------------------------------------
-- Cada clic a una tienda genera un id que viaja a la red como subid: así se atribuye la comisión al hogar.
create table clics (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid references hogares(id) on delete set null,
  tienda_id text not null,
  creado timestamptz not null default now()
);

create table comisiones (
  id uuid primary key default gen_random_uuid(),
  red text not null,
  ref_red text not null,               -- id de la transacción en la red
  clic_id uuid references clics(id),
  tienda_id text not null,
  importe_venta numeric(10,2),
  comision numeric(10,2) not null,
  estado text not null check (estado in ('pendiente', 'confirmada', 'anulada', 'pagada')),
  fecha timestamptz not null,
  unique (red, ref_red)
);

-- Saldo de cada hogar: reembolsos, premios por invitar y retiradas
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  tipo text not null check (tipo in ('reembolso', 'premio', 'retirada')),
  importe numeric(8,2) not null check (importe >= 0),
  estado text not null check (estado in ('pendiente', 'confirmada', 'anulada')),
  comision_id uuid references comisiones(id),
  concepto text,
  creado timestamptz not null default now()
);

-- Invitaciones: el premio se activa cuando la invitada hace su primera acción con comisión confirmada
create table invitaciones (
  hogar_invita uuid not null references hogares(id) on delete cascade,
  hogar_invitado uuid not null unique references hogares(id) on delete cascade,
  activada timestamptz,
  primary key (hogar_invita, hogar_invitado)
);

-- Lista de espera de la web (anónima, solo inserción)
create table lista_espera (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  codigo_postal text check (codigo_postal is null or codigo_postal ~ '^[0-9]{5}$'),
  consentimiento timestamptz not null default now(),
  origen text
);

-- Seguridad (RLS) ------------------------------------------------------------
alter table hogares enable row level security;
alter table cuentas enable row level security;
alter table personas enable row level security;
alter table perfiles enable row level security;
alter table facturas enable row level security;
alter table modulos enable row level security;
alter table clics enable row level security;
alter table comisiones enable row level security;
alter table movimientos enable row level security;
alter table invitaciones enable row level security;
alter table lista_espera enable row level security;

create policy "ver mi hogar" on hogares for select using (id = mi_hogar());
create policy "ver mi cuenta" on cuentas for select using (hogar_id = mi_hogar());

create policy "personas de mi hogar" on personas for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());
create policy "perfil de mi hogar" on perfiles for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());
create policy "facturas de mi hogar" on facturas for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());
create policy "modulos de mi hogar" on modulos for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());

-- Lectura de dinero e invitaciones: solo ver; escribir lo hace el servidor
create policy "ver mis movimientos" on movimientos for select using (hogar_id = mi_hogar());
create policy "ver mis invitaciones" on invitaciones for select using (hogar_invita = mi_hogar() or hogar_invitado = mi_hogar());

-- Lista de espera: cualquiera puede apuntarse, nadie puede leerla desde la web
create policy "apuntarse" on lista_espera for insert to anon, authenticated with check (true);
grant usage on schema public to anon, authenticated;
grant insert on lista_espera to anon, authenticated;

-- clics y comisiones: sin políticas = solo el servidor (service role) accede

-- Alta de un hogar al crear la cuenta -------------------------------------------
create or replace function crear_hogar(codigo text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid; inv uuid;
begin
  if exists (select 1 from cuentas where user_id = auth.uid()) then
    return mi_hogar();
  end if;
  if codigo is not null then
    select id into inv from hogares where codigo_invitacion = upper(codigo);
  end if;
  insert into hogares (invitado_por) values (inv) returning id into h;
  insert into cuentas (user_id, hogar_id, rol) values (auth.uid(), h, 'titular');
  insert into perfiles (hogar_id) values (h);
  if inv is not null then
    insert into invitaciones (hogar_invita, hogar_invitado) values (inv, h);
  end if;
  return h;
end $$;

-- Número de amigas activas (para el nivel)
create or replace function amigas_activas() returns int
language sql stable security definer set search_path = public as
$$ select count(*)::int from invitaciones where hogar_invita = mi_hogar() and activada is not null $$;
