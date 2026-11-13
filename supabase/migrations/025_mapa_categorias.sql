-- Viwai · clasificación con la categoría que pone cada tienda (petición de Alba, 13 nov 2026: «se siguen mezclando»).
-- mapa_categorias: patrón sobre la categoría de la tienda (sin acentos, minúsculas) → nuestra categoría y grupo, o «fuera».
-- Lo aplica la base de datos al guardar cada producto (disparador). Sin coincidencia, se sigue usando el título.
-- Las tiendas de un solo tipo (Primor, Juguetes Online…) no cambian de categoría: el mapa solo les pone el grupo.
-- Se puede ejecutar más de una vez.

create table if not exists mapa_categorias (
  orden int not null, tienda text, patron text not null, cat text, sub text, fuera boolean not null default false
);
alter table mapa_categorias enable row level security;
grant all on mapa_categorias to service_role;

insert into subcategorias (cat, sub, nombre, orden, regla) values ('peques', 'ropa', 'Ropa y calzado', 5, 'x^')
on conflict (cat, sub) do update set nombre = excluded.nombre;

delete from mapa_categorias;
insert into mapa_categorias (orden, tienda, patron, cat, sub, fuera) values
-- Fuera: recambios, industria, coche y moto, piezas sueltas
(1, null, 'automovil|recambio|motocicleta|motos|electrical equipment|equipamiento electrico|power tool parts|tool parts|industrial|procesamiento de metales|soldadura|abrasiv|instrumentos de medicion|laptop parts|computer components|componentes de ordenador|walkie|tattoo|extensiones y pelucas|pelucas|correo y envio|impresion 3d|recambios para electrodomesticos|accesorios y recambios|materiales de costura|ropa de trabajo|cosplay|ropa de baile|ropa del mundo|caja sorpresa|hobbies y piezas|automatizacion de edificios|mejoras para el hogar > hardware|equipos de manipulacion', null, null, true),
-- Moda
(10, null, 'relojes > accesorios', 'moda', 'accesorios', false),
(11, null, '^relojes', 'moda', 'relojes', false),
(12, null, 'joyeria', 'moda', 'bisuteria', false),
(13, null, 'bolsos y maletas > equipaje|equipaje', 'viajes', 'maletas', false),
(14, null, 'bolsos', 'moda', 'bolsos', false),
(15, null, 'complementos de moda', 'moda', 'accesorios', false),
(16, null, 'calzado deportivo', 'deporte', 'ropa', false),
(17, null, '^calzado', 'moda', 'calzado', false),
(18, null, 'moda mujer|moda hombre|men''s clothing|women''s clothing|ropa interior', 'moda', 'ropa', false),
-- Peques
(20, null, 'madres y ninos > (ropa|zapatos)', 'peques', 'ropa', false),
(21, null, 'madres y ninos', 'peques', 'bebe', false),
(22, null, 'juguetes.*construccion', 'peques', 'construccion', false),
(23, null, 'juguetes.*(figuras|munecas|peluche)', 'peques', 'munecas', false),
(24, null, 'juguetes.*(vehiculos|aire libre)', 'peques', 'exterior', false),
(25, null, '^juguetes', 'peques', 'mas', false),
-- Hogar y cocina
(30, null, 'textil de hogar', 'hogar', 'textil', false),
(31, null, 'decoracion|articulos para fiestas|luces e iluminacion|iluminacion', 'hogar', 'decoracion', false),
(32, null, 'almacenamiento y organizacion', 'hogar', 'orden', false),
(33, null, 'jardineria|muebles de exterior|herramientas electricas|^herramientas', 'hogar', 'jardin', false),
(34, null, '^muebles', 'hogar', 'muebles', false),
(35, null, 'articulos para mascotas', 'mascotas', null, false),
(36, null, 'utensilios de cocina|accesorios de cocina|kitchen|dining', 'cocina', null, false),
(37, null, '^hogar y jardin|^home & garden|sistema de inteligencia familiar', 'hogar', 'mas', false),
-- Tecnología
(40, null, 'telefonos|accesorios para telefonos|phones', 'tecnologia', 'movil', false),
(41, null, 'electronica inteligente|wearable', 'tecnologia', 'relojes', false),
(42, null, 'audio', 'tecnologia', 'audio', false),
(43, null, 'juegos y accesorios|camara y fotografia|video', 'tecnologia', 'imagen', false),
(44, null, 'informatica|computer & office', 'tecnologia', 'informatica', false),
(45, null, 'videovigilancia|seguridad y proteccion', 'tecnologia', 'mas', false),
-- Electrodomésticos
(50, null, 'electrodomesticos > electrodomesticos de cocina', 'electrodomesticos', 'cocina', false),
(51, null, 'electrodomesticos > aparatos de limpieza', 'electrodomesticos', 'limpieza', false),
(52, null, 'electrodomesticos > cuidado personal', 'belleza', 'cabello', false),
(53, null, '^electrodomesticos', 'electrodomesticos', 'mas', false),
-- Deporte
(60, null, 'ciclismo', 'deporte', 'ciclismo', false),
(61, null, 'fitness', 'deporte', 'fitness', false),
(62, null, 'camping|senderismo', 'deporte', 'montana', false),
(63, null, '^deportes', 'deporte', 'mas', false),
-- Súper
(70, null, 'cafe|bebidas', 'alimentacion', 'bebidas', false),
(71, null, '^alimentacion', 'alimentacion', 'mas', false),
-- Belleza (AliExpress y Primor)
(80, null, 'perfume', 'belleza', 'perfumes', false),
(81, null, 'maquillaje|unas|manicura|objetos cosmeticos', 'belleza', 'maquillaje', false),
(82, null, 'capilar|cabello|peluqueria|coloracion', 'belleza', 'cabello', false),
(83, null, 'cuidado de la piel|protector solar|bronceador|limpieza facial', 'belleza', 'facial', false),
(84, null, 'afeitado|depilacion', 'belleza', 'afeitado', false),
(85, null, 'bucal|dental|cuidado de la salud|vitaminas|sanitarios femeninos|masajes', 'belleza', 'salud', false),
(86, null, 'desodorante|bano y cuidado corporal|banera y ducha|esponjas', 'belleza', 'corporal', false),
(87, 'primor', '.', 'belleza', 'mas', false),
-- Juguetes Online
(90, 'juguetesonline', 'primera infancia', 'peques', 'bebe', false),
(91, 'juguetesonline', 'munecas|peluches|figuras|oficios|cocinitas|cocina de juguete|decoracion y menaje|limpieza para ninos', 'peques', 'munecas', false),
(92, 'juguetesonline', 'construccion', 'peques', 'construccion', false),
(93, 'juguetesonline', 'juegos de mesa|puzzles|futbolin|air hockey|pinball', 'peques', 'juegos', false),
(94, 'juguetesonline', 'educativos|stream|pizarras|piano|guitarra|karaoke|musica', 'peques', 'educativos', false),
(95, 'juguetesonline', 'rotuladores|ceras|slime|manualidades|plastilina', 'peques', 'manualidades', false),
(96, 'juguetesonline', 'patinete|patines|coches|camiones|vehiculos|todoterreno|pistas|piscinas|flotadores|barcas|playa|pompero|canasta|porterias|natacion|agua|verano|montar', 'peques', 'exterior', false),
-- EcoFlow
(100, 'ecoflow', 'power|solar|generator|bkw|batter|energy', 'tecnologia', 'energia', false);

create or replace function pon_subcategoria() returns trigger language plpgsql set search_path = public, extensions as $$
declare t tiendas; m mapa_categorias; ct text; cv text; hay boolean;
begin
  select * into t from tiendas where id = new.tienda_id;
  ct := f_unaccent(lower(coalesce(new.categoria_tienda, '')));
  select * into m from mapa_categorias where (tienda is null or tienda = new.tienda_id) and ct <> '' and ct ~ patron order by orden limit 1;
  hay := found;
  if hay and m.fuera then new.filtro_ok := false; end if;
  -- Tiendas de todo: la categoría de la tienda manda sobre el título
  if hay and m.cat is not null and new.categoria_fija is null
     and coalesce(t.categoria, '') not in ('mascotas', 'peques', 'belleza', 'electrodomesticos', 'tecnologia', 'cocina', 'hogar', 'deporte', 'moda', 'alimentacion', 'viajes') then
    new.categoria := m.cat;
  end if;
  cv := categoria_visible(new, t);
  if hay and m.sub is not null and m.cat = cv then new.sub := m.sub;
  else new.sub := subcategoria(cv, coalesce(new.titulo_es, new.titulo), t.sub_defecto); end if;
  return new;
end $$;
drop trigger if exists productos_sub on productos;
create trigger productos_sub before insert or update of titulo, titulo_es, categoria, categoria_fija, categoria_tienda on productos
  for each row execute function pon_subcategoria();

-- Reclasificar todo lo que ya hay
update productos set titulo = titulo;

select categoria, sub, count(*) filter (where filtro_ok) as visibles, count(*) filter (where not filtro_ok) as fuera
from productos group by 1, 2 order by 1, 3 desc;
