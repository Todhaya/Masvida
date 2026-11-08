-- Viwai · la app guarda sus datos en la nube, ayudas con requisitos ordenados, coincidencias por casa y avisos push.
-- Se puede ejecutar más de una vez.

-- 1. Estado de la app por casa: cada apartado (menú, armario, tareas…) es una clave con su JSON.
--    Así la app actual se conecta sin rehacer cada pantalla; se puede normalizar más adelante.
create table if not exists estado_app (
  hogar_id uuid not null references hogares(id) on delete cascade,
  clave text not null check (clave ~ '^[a-z0-9_-]{1,40}$'),
  valor jsonb not null,
  actualizado timestamptz not null default now(),
  primary key (hogar_id, clave)
);
alter table estado_app enable row level security;
drop policy if exists "estado de mi casa" on estado_app;
create policy "estado de mi casa" on estado_app for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());
grant select, insert, update, delete on estado_app to authenticated;

-- Perfil: lo que se usa para las ayudas, en columnas (lo lee el servidor para avisar de ayudas nuevas)
alter table perfiles add column if not exists adultos smallint;
alter table perfiles add column if not exists hijos smallint;
alter table perfiles add column if not exists menores3 smallint;
alter table perfiles add column if not exists edades_hijos smallint[] not null default '{}';
alter table perfiles add column if not exists edad smallint;            -- de quien rellena el perfil
alter table perfiles add column if not exists calefaccion text;
alter table perfiles add column if not exists completo timestamptz;    -- terminó la bienvenida

-- La persona crea su casa al entrar por primera vez (si no tiene ya una).
create or replace function mi_casa() returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  select hogar_id into h from cuentas where user_id = auth.uid();
  if h is null then h := crear_hogar(null); end if;
  return h;
end $$;
grant execute on function mi_casa() to authenticated;

-- 2. Ayudas: requisitos en forma de reglas (las evalúa app/js/ayudas.js, igual en la app y en el servidor)
alter table ayudas add column if not exists reglas jsonb not null default '{}';
alter table ayudas add column if not exists estado text not null default 'publicada'
  check (estado in ('pendiente', 'publicada', 'descartada', 'revisar'));
alter table ayudas add column if not exists fuente text;          -- bdns, boe, manual
alter table ayudas add column if not exists fuente_id text;       -- id de la convocatoria en su fuente
alter table ayudas add column if not exists como_pedirla text;
alter table ayudas add column if not exists organismo text;
alter table ayudas add column if not exists creada timestamptz not null default now();
create unique index if not exists ayudas_fuente on ayudas (fuente, fuente_id) where fuente_id is not null;

drop policy if exists "publico ayudas activas" on ayudas;
create policy "publico ayudas activas" on ayudas for select to anon, authenticated
  using (estado = 'publicada' and activa and (plazo_fin is null or plazo_fin >= current_date));

-- 3. Qué ayudas se han propuesto ya a cada casa (para avisar solo de las nuevas)
create table if not exists ayudas_hogar (
  hogar_id uuid not null references hogares(id) on delete cascade,
  ayuda_id uuid not null references ayudas(id) on delete cascade,
  nivel text not null check (nivel in ('si', 'comprueba')),
  propuesta timestamptz not null default now(),
  avisada timestamptz,
  primary key (hogar_id, ayuda_id)
);
alter table ayudas_hogar enable row level security;
drop policy if exists "mis ayudas" on ayudas_hogar;
create policy "mis ayudas" on ayudas_hogar for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());
drop policy if exists "admin lee" on ayudas_hogar;
create policy "admin lee" on ayudas_hogar for select using (es_admin());
grant select, insert, update, delete on ayudas_hogar to authenticated;

-- 4. Avisos push: una suscripción por dispositivo
create table if not exists suscripciones_push (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  hogar_id uuid references hogares(id) on delete cascade,
  claves jsonb not null,                 -- p256dh y auth del navegador
  creada timestamptz not null default now(),
  fallos smallint not null default 0
);
alter table suscripciones_push enable row level security;
drop policy if exists "mis dispositivos" on suscripciones_push;
create policy "mis dispositivos" on suscripciones_push for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on suscripciones_push to authenticated;

-- El correo de cada casa (para avisar por email si no tiene push); solo lo usa el servidor.
create or replace view correos_hogar as
  select c.hogar_id, u.email from cuentas c join auth.users u on u.id = c.user_id;
revoke all on correos_hogar from anon, authenticated;
