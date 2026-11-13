-- Viwai · grupos dentro de cada categoría (petición de Alba, 13 nov 2026).
-- Las reglas están en la tabla «subcategorias» (palabras del título, sin acentos y en minúsculas; la primera que encaja gana).
-- Lo que no encaja va al grupo por defecto de la tienda (TOUS → Joyas) o a «Más».
-- Joyas solo en joyerías; en el resto, Bisutería. Se puede ejecutar más de una vez.

create table if not exists subcategorias (
  cat text not null, sub text not null, nombre text not null, orden int not null, regla text not null,
  primary key (cat, sub)
);
alter table subcategorias enable row level security;
drop policy if exists "todos leen" on subcategorias;
create policy "todos leen" on subcategorias for select using (true);
grant select on subcategorias to anon, authenticated;
grant all on subcategorias to service_role;

delete from subcategorias;
insert into subcategorias (cat, sub, nombre, orden, regla) values
-- Moda
('moda','bolsos','Bolsos',10,'\m(bolsos?|mochilas?|carteras?|monederos?|rinoneras?|bandoleras?|shopper|neceser|clutch|tote)\M'),
('moda','calzado','Calzado',20,'\m(zapatos?|zapatillas?|botas?|botines?|sandalias?|mocasin\w*|chanclas?|alpargatas?|bailarinas?|deportivas?|sneakers?|zuecos?|pantuflas?)\M'),
('moda','accesorios','Accesorios',30,'\m(correas?|protector\w*|fundas?|cargador\w*|cajas?|soportes?|estuches?|herramientas?|cristal\w*|pasador\w*|hebillas?|eslabon\w*|movimiento|esfera|bisel)\M.*\mrelo(j|jes)\M'),
('moda','relojes','Relojes',40,'\mrelo(j|jes)\M|\msmartwatch'),
('moda','joyas','Joyas',50,'\m(collar\w*|pendientes?|anillos?|sortijas?|pulseras?|colgantes?|joyas?|joyeria|charms?|gargantillas?|brazaletes?|tobilleras?|aros?|piercing\w*|broche\w*|alianzas?)\M'),
('moda','bisuteria','Bisutería',55,'x^'),
('moda','accesorios2','Accesorios',60,'\m(gafas|gorros?|gorras?|bufandas?|guantes?|cinturon\w*|panuelos?|sombreros?|paraguas|corbatas?|fulares?|diademas?|pinzas?|coleteros?|llaveros?)\M'),
('moda','ropa','Ropa',70,'.'),
-- Belleza
('belleza','perfumes','Perfumes',10,'\m(perfumes?|colonias?|eau de|fragancias?|body mist)\M'),
('belleza','maquillaje','Maquillaje',20,'\m(maquillaje|labial\w*|pintalabios|mascara de pestanas|rimel|sombras?|colorete|base de maquillaje|corrector|eyeliner|brochas?|esmaltes?|unas|pestanas|cejas|polvos)\M'),
('belleza','cabello','Pelo',30,'\m(champu|acondicionador|mascarilla capilar|cabello|pelo|tinte|secador|plancha de pelo|rizador|cepillo de pelo|laca|keratina)\M'),
('belleza','facial','Cuidado facial',40,'\m(facial|serum|contorno de ojos|crema de dia|crema de noche|antiarrugas|limpiador|tonico|micelar|exfoliante|protector solar|spf|retinol|hialuronico)\M'),
('belleza','corporal','Cuerpo y baño',50,'\m(corporal|body|gel de (bano|ducha)|locion|desodorante|crema de manos|aceite|jabon|bano|ducha)\M'),
('belleza','salud','Higiene y salud',60,'\m(dental|dientes|cepillo|pasta|bucal|enjuague|farmacia|parafarmacia|vitaminas?|suplementos?|capsulas|preservativ\w*|compresas|tampones|higiene|intimo)\M'),
('belleza','afeitado','Afeitado y depilación',70,'\m(afeitad\w*|maquinilla|cuchillas?|depilad\w*|cera|barba|recortadora)\M'),
('belleza','mas','Más',99,'.'),
-- Peques
('peques','bebe','Bebé',10,'\m(bebes?|recien nacido|sonajeros?|mordedor\w*|chupetes?|biberon\w*|cuna|carrito|trona|panal\w*|baby|0-12 meses|primera infancia)\M'),
('peques','construccion','Construcción',20,'\m(lego|construccion|bloques|piezas|playmobil|meccano|magnetic\w*)\M'),
('peques','munecas','Muñecas y figuras',30,'\m(munec\w*|figuras?|peluches?|barbie|casita|cocinita|disfraz\w*|marionetas?)\M'),
('peques','juegos','Juegos y puzzles',40,'\m(juegos? de mesa|puzzles?|puzles?|rompecabezas|cartas|domino|ajedrez|memory|trivial)\M'),
('peques','educativos','Educativos y libros',50,'\m(educativ\w*|aprend\w*|montessori|stem|ciencia|experimentos?|libros?|cuentos?|abecedario|numeros|didactic\w*)\M'),
('peques','manualidades','Manualidades',60,'\m(manualidades|plastilina|pintura|pinturas|colorear|dibujo|pulseras|abalorios|slime|creativ\w*)\M'),
('peques','exterior','Exterior y vehículos',70,'\m(piscina|hinchable|bicicleta|bici|patinete|triciclo|correpasillos|columpio|tobogan|arenero|coches?|camion\w*|tren\w*|radiocontrol|teledirigid\w*|exterior|agua)\M'),
('peques','mas','Más juguetes',99,'.'),
-- Hogar
('hogar','textil','Cama y textil',10,'\m(sabanas?|edredon\w*|nordico|funda nordica|almohadas?|colchon\w*|mantas?|cojin\w*|cortinas?|alfombras?|toallas?|albornoz|textil)\M'),
('hogar','orden','Orden y almacenaje',20,'\m(organizador\w*|almacenaje|cajas?|cestos?|perchas?|zapateros?|estanterias?|baldas?|ganchos?|colgador\w*)\M'),
('hogar','limpieza','Limpieza y colada',30,'\m(detergentes?|suavizantes?|limpia\w*|fregona|escoba|bayetas?|tendedero|lavanderia|quitapelusas|plancha)\M'),
('hogar','decoracion','Decoración e iluminación',40,'\m(decoracion|decorativ\w*|cuadros?|laminas?|espejos?|jarron\w*|velas?|lamparas?|luces|led|guirnalda\w*|navidad\w*|navideno|arbol)\M'),
('hogar','jardin','Jardín y bricolaje',50,'\m(jardin\w*|macetas?|plantas?|riego|manguera|herramientas?|taladro|destornillador\w*|bricolaje|tornillos?|pala)\M'),
('hogar','muebles','Muebles',60,'\m(muebles?|mesas?|sillas?|sofas?|armarios?|comodas?|escritorio|taburete\w*)\M'),
('hogar','mas','Más',99,'.'),
-- Tecnología
('tecnologia','energia','Energía portátil',10,'\m(estacion de energia|power station|bateria portatil|power ?bank|panel solar|generador|ecoflow|delta|river)\M'),
('tecnologia','movil','Móvil y accesorios',20,'\m(movil\w*|smartphone|iphone|samsung|xiaomi|fundas?|protector de pantalla|cargador\w*|cables?|soporte)\M'),
('tecnologia','audio','Audio',30,'\m(auriculares|cascos|altavoz\w*|earbuds|headphones|sonido|barra de sonido|microfono)\M'),
('tecnologia','relojes','Relojes inteligentes',40,'\m(smartwatch|reloj inteligente|pulsera de actividad|smart band)\M'),
('tecnologia','informatica','Informática',50,'\m(portatil|ordenador|tablet|teclado|raton|monitor|disco|usb|memoria|impresora|router|wifi)\M'),
('tecnologia','imagen','Tele, cámara y juegos',60,'\m(tv|televisor|proyector|camara|consola|gaming|mando|videojuego\w*)\M'),
('tecnologia','mas','Más',99,'.'),
-- Deporte
('deporte','ciclismo','Ciclismo',10,'\m(ciclismo|bicicleta|bici|maillot|culotte|casco|cycling|bike)\M'),
('deporte','fitness','Fitness y yoga',20,'\m(fitness|yoga|pilates|gimnasio|gym|mancuernas?|pesas?|esterilla|bandas? elasticas?|comba)\M'),
('deporte','montana','Montaña y camping',30,'\m(camping|tienda de campana|saco de dormir|senderismo|trekking|montana|hiking|linterna|frontal)\M'),
('deporte','agua','Agua y playa',40,'\m(natacion|bano|bikini|banador|gafas de natacion|surf|playa|piscina|snorkel|buceo)\M'),
('deporte','ropa','Ropa deportiva',50,'\m(camiseta|mallas?|leggings|sudadera|chaqueta|pantalon\w*|zapatillas?|running|deportiv\w*)\M'),
('deporte','mas','Más',99,'.'),
-- Electrodomésticos
('electrodomesticos','cocina','Cocina',10,'\m(freidora|cafetera|batidora|robot de cocina|horno|microondas|tostadora|hervidor|exprimidor|licuadora|sandwichera|airfryer|air fryer)\M'),
('electrodomesticos','limpieza','Limpieza',20,'\m(aspirador\w*|robot aspirador|fregasuelos|vaporeta|plancha|lavadora|secadora|lavavajillas)\M'),
('electrodomesticos','clima','Calor y frío',30,'\m(calefactor|radiador|estufa|ventilador|aire acondicionado|deshumidificador|humidificador|purificador)\M'),
('electrodomesticos','mas','Más',99,'.'),
-- Súper
('alimentacion','singluten','Sin gluten y sin lactosa',10,'\m(sin gluten|sin lactosa|vegan\w*|ecologic\w*|bio)\M'),
('alimentacion','dulce','Dulce y desayuno',20,'\m(chocolate\w*|galletas?|cereales?|mermelada|cacao|bizcocho\w*|caramelos?|turron\w*)\M'),
('alimentacion','bebidas','Bebidas',30,'\m(cafe|te|infusion\w*|vino|cerveza|zumo|refresco|agua|capsulas)\M'),
('alimentacion','mas','Despensa',99,'.'),
-- Cocina
('cocina','sartenes','Sartenes y ollas',10,'\m(sarten\w*|ollas?|cazos?|cacerolas?|wok|olla expres)\M'),
('cocina','utensilios','Utensilios',20,'\m(cuchillos?|utensilios?|espatula|tabla de cortar|rallador|pelador|abrelatas|tijeras)\M'),
('cocina','mesa','Vajilla y mesa',30,'\m(vajilla|platos?|vasos?|tazas?|copas?|cubiertos?|mantel\w*)\M'),
('cocina','conservar','Guardar comida',40,'\m(tupper\w*|fiambrera|recipientes?|botes?|bolsas? de congelacion|termo|botella)\M'),
('cocina','mas','Más',99,'.'),
-- Mascotas
('mascotas','perros','Perros',10,'\m(perros?|cachorro|dog|puppy)\M'),
('mascotas','gatos','Gatos',20,'\m(gatos?|gatitos?|cat|arena|rascador)\M'),
('mascotas','mas','Otras mascotas',99,'.'),
-- Viajes
('viajes','maletas','Maletas',10,'\m(maletas?|equipaje|trolley|mochila de viaje|neceser)\M'),
('viajes','mas','Accesorios de viaje',99,'.');

create or replace function subcategoria(cat text, titulo text, defecto text default null) returns text
language sql stable set search_path = public, extensions as $$
  with t as (select f_unaccent(lower(coalesce(titulo, ''))) as x),
  r as (
    select s.sub from subcategorias s, t
    where s.cat = subcategoria.cat and s.sub <> 'bisuteria' and t.x ~ s.regla and (s.regla <> '.' or defecto is null)
    order by s.orden limit 1
  )
  select case
    when not exists (select 1 from subcategorias where subcategorias.cat = subcategoria.cat) then null
    when (select sub from r) = 'joyas' and coalesce(defecto, '') <> 'joyas' then 'bisuteria'
    when (select sub from r) = 'accesorios2' then 'accesorios'
    else coalesce((select sub from r), defecto, 'mas') end
$$;

drop function if exists subcategorias_catalogo(text);
create or replace function subcategorias_catalogo(cat text) returns table (sub text, nombre text, n bigint)
language sql stable security definer set search_path = public as $$
  select x.s, coalesce((select nombre from subcategorias where subcategorias.cat = subcategorias_catalogo.cat and subcategorias.sub = x.s), x.s), x.n
  from (
    select subcategoria(categoria_visible(p, t), coalesce(p.titulo_es, p.titulo), t.sub_defecto) as s,
           count(distinct (p.tienda_id, lower(left(titulo_limpio(coalesce(p.titulo_es, p.titulo)), 70)))) as n
    from productos p join tiendas t on t.id = p.tienda_id
    where producto_visible(p, t) and p.imagen is not null and categoria_visible(p, t) = cat
    group by 1
  ) x where x.s is not null
  order by (x.s = 'mas'), x.n desc
$$;
grant execute on function subcategorias_catalogo(text) to anon, authenticated;

select * from subcategorias_catalogo('belleza');
