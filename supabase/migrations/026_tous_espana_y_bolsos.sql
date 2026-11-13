-- Viwai · TOUS solo de su web española, sus joyas siempre en «Joyas» y sus bolsos por modelo (13 nov 2026).
-- Se puede ejecutar más de una vez.

-- Productos que llevan a la web de otro país (tous.com/sk-sk/…): fuera
update productos set filtro_ok = false
where filtro_ok and tienda_id in (select id from tiendas where red_id = 'cj')
  and url ~* '(%2F|/)(pt|de|sk|cs|cz|pl|fr|it|nl|en|hu|ro|at|be)([-_][a-z]{2})?(%2F|/)';

-- Bolsos: también por nombre de modelo (City, Capazo, Hobo…)
update subcategorias set regla = '\m(bolsos?|bolsas? de mano|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote|city|capazo|hobo|bucket|saco|cartera|minibag|bandolerita)\M'
where cat = 'moda' and sub = 'bolsos';

create or replace function pon_subcategoria() returns trigger language plpgsql set search_path = public, extensions as $$
declare t tiendas; m mapa_categorias; ct text; cv text; hay boolean;
begin
  select * into t from tiendas where id = new.tienda_id;
  ct := f_unaccent(lower(coalesce(new.categoria_tienda, '')));
  select * into m from mapa_categorias where (tienda is null or tienda = new.tienda_id) and ct <> '' and ct ~ patron order by orden limit 1;
  hay := found;
  if hay and m.fuera then new.filtro_ok := false; end if;
  if hay and m.cat is not null and new.categoria_fija is null
     and coalesce(t.categoria, '') not in ('mascotas', 'peques', 'belleza', 'electrodomesticos', 'tecnologia', 'cocina', 'hogar', 'deporte', 'moda', 'alimentacion', 'viajes') then
    new.categoria := m.cat;
  end if;
  cv := categoria_visible(new, t);
  -- En joyerías (TOUS) el título decide (bolso, reloj, joya); «joyería» de la tienda no es bisutería
  if hay and m.sub is not null and m.cat = cv and coalesce(t.sub_defecto, '') <> 'joyas' then new.sub := m.sub;
  else new.sub := subcategoria(cv, coalesce(new.titulo_es, new.titulo), t.sub_defecto); end if;
  return new;
end $$;

update productos set titulo = titulo where tienda_id = 'tous' or (categoria = 'moda' and sub in ('joyas', 'bolsos', 'ropa'));

select sub, count(*) filter (where filtro_ok) visibles from productos where categoria = 'moda' or tienda_id = 'tous' group by 1 order by 2 desc;
