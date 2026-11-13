-- Viwai · más modelos de bolso de TOUS (Bowling, Bombonera, Saca…) y, en joyerías, si la tienda lo marca como bolso, a Bolsos.
update subcategorias set regla = '\m(bolsos?|bolsas? de mano|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote|city|capazo|hobo|bucket|saco|sacas?|bowling|bombonera|baguette|minibag|bandolerita|cartuchera|portamovil|porta movil|tarjetero)\M'
where cat = 'moda' and sub = 'bolsos';
update subcategorias set regla = '\m(collar\w*|pendientes?|anillos?|sortijas?|pulseras?|colgantes?|joyas?|joyeria|charms?|gargantillas?|brazaletes?|tobilleras?|aros?|piercing\w*|broche\w*|alianzas?|esclavas?|medallas?|earcuffs?|solitarios?|cadenas?)\M'
where cat = 'moda' and sub = 'joyas';

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
  if coalesce(t.sub_defecto, '') = 'joyas' and cv = 'moda' and ct ~ '\mbolsos?\M' then new.sub := 'bolsos';
  elsif hay and m.sub is not null and m.cat = cv and coalesce(t.sub_defecto, '') <> 'joyas' then new.sub := m.sub;
  else new.sub := subcategoria(cv, coalesce(new.titulo_es, new.titulo), t.sub_defecto); end if;
  return new;
end $$;

update productos set titulo = titulo where categoria = 'moda' or tienda_id = 'tous';
select sub, count(*) filter (where filtro_ok) from productos where tienda_id = 'tous' group by 1;
