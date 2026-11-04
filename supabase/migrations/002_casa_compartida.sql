-- Masvida · casa compartida y calendario
-- Varias personas adultas gestionan el mismo hogar y ven lo mismo en tiempo real.
-- Permisos: 'todo' (todo menos Mi dinero y facturas), 'organizacion' (calendario, tareas, menú, armario), 'calendario'.

alter table cuentas add column if not exists permiso text not null default 'todo'
  check (permiso in ('todo', 'organizacion', 'calendario'));
alter table cuentas add column if not exists persona_id uuid references personas(id) on delete set null;

-- Mi dinero y facturas son solo de quien las sube
alter table facturas add column if not exists propietaria uuid references auth.users(id) default auth.uid();
drop policy if exists "facturas de mi hogar" on facturas;
create policy "mis facturas" on facturas for all using (propietaria = auth.uid()) with check (propietaria = auth.uid() and hogar_id = mi_hogar());

create or replace function mi_permiso() returns text
language sql stable security definer set search_path = public as
$$ select permiso from cuentas where user_id = auth.uid() $$;

-- Módulos según permiso
drop policy if exists "modulos de mi hogar" on modulos;
create policy "modulos segun permiso" on modulos for all
  using (hogar_id = mi_hogar() and (mi_permiso() = 'todo' or (mi_permiso() = 'organizacion' and modulo in ('menu', 'compra', 'tareas', 'premios', 'armario', 'calendario', 'eventos'))))
  with check (hogar_id = mi_hogar() and (mi_permiso() = 'todo' or (mi_permiso() = 'organizacion' and modulo in ('menu', 'compra', 'tareas', 'premios', 'armario', 'calendario', 'eventos'))));

-- Perfil del hogar (ayudas, ingresos): solo permiso 'todo'
drop policy if exists "perfil de mi hogar" on perfiles;
create policy "perfil con permiso todo" on perfiles for all using (hogar_id = mi_hogar() and mi_permiso() = 'todo') with check (hogar_id = mi_hogar() and mi_permiso() = 'todo');

-- Calendario: tabla propia para poder repetir eventos y avisar
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  titulo text not null check (length(titulo) between 1 and 120),
  categoria text not null default 'otro' check (categoria in ('cole', 'extra', 'medico', 'cumple', 'plan', 'casa', 'otro')),
  dia date not null,
  hora time,
  repeticion text check (repeticion in ('semana', 'año')),
  para uuid[] not null default '{}',      -- personas
  lleva uuid references personas(id) on delete set null,
  nota text,
  creado_por uuid references auth.users(id) default auth.uid(),
  actualizado timestamptz not null default now()
);
alter table eventos enable row level security;
create policy "eventos de mi hogar" on eventos for all using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar());

-- Invitar a otra persona adulta a gestionar la casa (distinto de invitar a una amiga a Masvida)
create table if not exists invitaciones_casa (
  codigo text primary key default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)),
  hogar_id uuid not null references hogares(id) on delete cascade,
  nombre text not null,
  permiso text not null default 'todo' check (permiso in ('todo', 'organizacion', 'calendario')),
  creada_por uuid not null default auth.uid() references auth.users(id),
  caduca timestamptz not null default now() + interval '7 days',
  usada timestamptz
);
alter table invitaciones_casa enable row level security;
create policy "ver invitaciones de mi casa" on invitaciones_casa for select using (hogar_id = mi_hogar());
create policy "crear invitaciones (titular o todo)" on invitaciones_casa for insert with check (hogar_id = mi_hogar() and mi_permiso() = 'todo');
create policy "anular invitaciones de mi casa" on invitaciones_casa for delete using (hogar_id = mi_hogar() and mi_permiso() = 'todo');

create or replace function unirse_casa(codigo_inv text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invitaciones_casa; p uuid;
begin
  select * into inv from invitaciones_casa where codigo = upper(codigo_inv) for update;
  if inv is null or inv.usada is not null or inv.caduca < now() then
    raise exception 'La invitación no es válida o ha caducado. Pide un enlace nuevo.';
  end if;
  if exists (select 1 from cuentas where user_id = auth.uid()) then
    raise exception 'Ya formas parte de una casa en Masvida.';
  end if;
  insert into personas (hogar_id, nombre, es_peque) values (inv.hogar_id, inv.nombre, false) returning id into p;
  insert into cuentas (user_id, hogar_id, rol, permiso, persona_id) values (auth.uid(), inv.hogar_id, 'adulto', inv.permiso, p);
  update invitaciones_casa set usada = now() where codigo = inv.codigo;
  return inv.hogar_id;
end $$;

-- Quitar acceso: solo la titular
create policy "titular quita accesos" on cuentas for delete using (
  hogar_id = mi_hogar() and rol = 'adulto' and exists (select 1 from cuentas c where c.user_id = auth.uid() and c.rol = 'titular'));

-- Tiempo real: lo que cambia una persona lo ven las demás al momento
alter publication supabase_realtime add table eventos, modulos, personas;
