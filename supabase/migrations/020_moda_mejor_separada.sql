-- Viwai · Moda mejor separada (petición de Alba, 13 nov 2026).
-- - Fuera de Moda lo que es de casa (detergente, cestos de ropa sucia, zapateros, perchas…): a Hogar.
-- - Joyas (solo joyerías, como TOUS) · Bisutería (el resto) · Relojes (solo relojes) · accesorios de reloj a Accesorios.
-- Se puede ejecutar más de una vez.

update productos set categoria = 'hogar'
where categoria = 'moda' and categoria_fija is null
  and f_unaccent(lower(titulo)) ~ '\m(detergentes?|suavizantes?|cestos?|zapateros?|perchas?|tendederos?|organizador\w*|lavanderia|quitapelusas|armarios?|burros? para ropa|ropa sucia)\M';

create or replace function subcategoria(cat text, titulo text, defecto text default null) returns text language sql immutable as $$
  select case when cat <> 'moda' then null else (
    with t as (select f_unaccent(lower(coalesce(titulo, ''))) as x)
    select case
      when x ~ '\m(bolsos?|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote)\M' then 'bolsos'
      when x ~ '\m(zapatos?|zapatillas?|botas?|botines?|sandalias?|mocasin\w*|chanclas?|alpargatas?|bailarinas?|deportivas?|sneakers?|zuecos?|pantuflas?)\M' then 'calzado'
      -- piezas y complementos de reloj: no son relojes
      when x ~ '\m(correas?|pulseras? de repuesto|protector\w*|fundas?|cargador\w*|cajas?|soportes?|estuches?|herramientas?|cristal\w*|pasador\w*|hebillas?|eslabon\w*|movimiento|esfera|bisel)\M.*\mrelo(j|jes)\M' then 'accesorios'
      when x ~ '\mrelo(j|jes)\M|\msmartwatch' then 'relojes'
      when x ~ '\m(collar\w*|pendientes?|anillos?|sortijas?|pulseras?|colgantes?|joyas?|joyeria|charms?|gargantillas?|brazaletes?|tobilleras?|aros?|piercing\w*|broche\w*|alianzas?)\M'
        then case when defecto = 'joyas' then 'joyas' else 'bisuteria' end
      when x ~ '\m(gafas|gorros?|gorras?|bufandas?|guantes?|cinturon\w*|panuelos?|sombreros?|paraguas|corbatas?|fulares?|diademas?|pinzas?|coleteros?|llaveros?)\M' then 'accesorios'
      else coalesce(defecto, 'ropa') end
    from t) end
$$;

select * from subcategorias_catalogo('moda');
