// Viwai · nuestras categorías de catálogo y cómo se asigna cada producto.
// Se decide con palabras del título y de la categoría de la tienda (sin acentos, en minúsculas).
// El orden importa: la primera categoría con una palabra que encaje gana.

export const CATEGORIAS = [
  ["mascotas", "Mascotas", ["perro", "gato", "mascota", "mascotas", "pienso", "arena para gatos", "arenero", "rascador", "pet", "dog", "cat litter", "cat", "puppy", "kitten", "pet bed"]],
  ["peques", "Peques", ["bebe", "infantil", "nino", "nina", "ninos", "juguete", "juguetes", "lego", "peluche", "carrito de bebe", "panal", "panales", "kids", "toy", "toys", "baby", "children", "toddler", "infant", "puericultura", "mochila escolar", "muneca", "munecas", "puzzle", "juego de mesa", "disfraz", "patinete", "triciclo", "sonajero", "mordedor", "chupete", "biberon"]],
  ["belleza", "Belleza y cuidado", ["secador", "plancha de pelo", "rizador", "maquillaje", "serum", "crema", "perfume", "champu", "cosmetica", "belleza", "afeitadora", "depiladora", "cepillo de dientes", "skincare", "beauty", "hair dryer", "makeup", "nail", "lipstick", "hair straightener", "curling", "massager", "facial", "parafarmacia", "pasta de dientes", "cepillo dental", "dental", "acondicionador", "mascarilla", "desodorante", "colonia", "gel de ducha", "locion", "tonico", "brocha", "esmalte", "pestanas", "labial"]],
  ["electrodomesticos", "Electrodomésticos", ["freidora", "lavadora", "secadora", "lavavajillas", "frigorifico", "nevera", "horno", "microondas", "aspirador", "aspiradora", "robot aspirador", "cafetera", "batidora", "robot de cocina", "plancha de ropa", "calefactor", "ventilador", "aire acondicionado", "electrodomestico", "vacuum", "air fryer", "blender", "kettle", "coffee maker", "juicer", "humidifier", "heater", "toaster", "mixer"]],
  ["tecnologia", "Tecnología", ["movil", "smartphone", "tablet", "portatil", "ordenador", "auriculares", "altavoz", "smartwatch", "reloj inteligente", "televisor", "tv ", "monitor", "teclado", "raton", "camara", "consola", "cargador", "power bank", "bateria portatil", "estacion de energia", "electronica", "laptop", "headphones", "phone", "earbuds", "earphones", "bluetooth speaker", "smart watch", "charger", "projector", "keyboard", "mouse", "power bank", "tablet stand", "funda", "iphone", "samsung galaxy", "protector de pantalla", "smart tv", "airpods", "case for", "phone case"]],
  ["cocina", "Cocina", ["sarten", "olla", "cazo", "cuchillo", "vajilla", "vaso", "tupper", "menaje", "cocina", "bandeja de horno", "cubiertos", "taza", "kitchen", "cookware", "frying pan", "knife", "mug", "water bottle", "lunch box", "spatula", "cutting board"]],
  ["hogar", "Hogar y deco", ["hogar", "textil", "cojin", "sofa", "colchon", "almohada", "sabanas", "edredon", "nordico", "cortina", "alfombra", "lampara", "mueble", "estanteria", "silla", "mesa", "cuadro", "lamina", "poster", "decoracion", "jardin", "maceta", "toalla", "organizador", "almacenaje", "herramienta", "taladro", "bricolaje", "home", "furniture", "garden", "decor", "lamp", "pillow", "blanket", "curtain", "rug", "storage", "organizer", "shelf", "towel", "bedding", "bathroom"]],
  ["deporte", "Deporte", ["deporte", "deportivo", "deportiva", "running", "yoga", "fitness", "gimnasio", "bicicleta", "esterilla", "mancuerna", "sport", "camping", "senderismo", "gym", "cycling", "bike", "hiking", "swimming"]],
  ["moda", "Moda", ["camiseta", "pantalon", "vaqueros", "jeans", "vestido", "falda", "abrigo", "chaqueta", "jersey", "sudadera", "zapatillas", "zapatos", "botas", "sandalias", "bolso", "cartera", "joya", "pendientes", "collar", "pulsera", "reloj", "gafas de sol", "ropa", "calzado", "moda", "fashion", "shoes", "dress", "bag", "wallet", "necklace", "earrings", "bracelet", "sunglasses", "t-shirt", "hoodie", "jacket", "socks", "sneakers", "lenceria", "pijama"]],
  ["alimentacion", "Súper y alimentación", ["cafe en grano", "capsulas", "aceite de oliva", "alimentacion", "comida", "bebida", "vino", "cerveza", "supermercado", "gourmet", "chocolate", "suplemento", "sin gluten", "sin lactosa", "galletas", "cereales", "grisines", "infusion", "snack", "tostadas", "mermelada", "aperitivo", "frutos secos"]],
  ["viajes", "Viajes y planes", ["hotel", "vuelo", "viaje", "escapada", "maleta", "equipaje", "excursion", "entradas", "experiencia", "alquiler de coche", "travel"]],
];
export const NOMBRES = Object.fromEntries([...CATEGORIAS.map(([k, n]) => [k, n]), ["otros", "Otros"]]);

export const normaliza = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REGLAS = CATEGORIAS.map(([clave, , palabras]) => [clave, new RegExp("(^|[^a-z0-9])(" + palabras.map((p) => escapa(p.trim())).join("|") + ")s?($|[^a-z0-9])")]);

// Palabras que no dejan duda y pasan por delante del orden general
// (p. ej. «Copos de cereales sin gluten» en una perfumería es comida, aunque la tienda sea de belleza).
const SEGURAS = [
  // cosas de casa que llevan «ropa» o «zapato» en el nombre
  ["hogar", ["detergente", "suavizante", "cesto", "cesto para ropa", "cesta para ropa", "zapatero", "zapateros", "percha", "perchas", "tendedero",
    "organizador", "lavanderia", "quitapelusas", "burro para ropa", "armario", "bolsa para ropa sucia"]],
  ["alimentacion", ["sin gluten", "sin lactosa", "galletas", "cereales", "grisines", "infusion", "mermelada", "frutos secos"]],
  ["tecnologia", ["funda", "protector de pantalla", "phone case", "case for"]],
].map(([k, ps]) => [k, new RegExp("(^|[^a-z0-9])(" + ps.map((p) => escapa(p)).join("|") + ")s?($|[^a-z0-9])")]);

// Primero mira el título (más fiable); si no encaja, la categoría de la tienda.
export function categoriza(titulo, categoriaTienda = "", porDefecto = "otros") {
  const t = normaliza(titulo);
  for (const [clave, re] of SEGURAS) if (re.test(t)) return clave;
  for (const texto of [t, normaliza(categoriaTienda)]) {
    if (!texto) continue;
    for (const [clave, re] of REGLAS) if (re.test(texto)) return clave;
  }
  return porDefecto;
}

// Categoría de la tienda en nuestro catálogo → por defecto para sus productos
export function categoriaTiendaPorDefecto(cat) {
  const c = normaliza(cat);
  return CATEGORIAS.some(([k]) => k === c) ? c : "otros";
}

// Títulos limpios: sin reclamos de la tienda delante («¡19% DTO!», «OFERTA:») ni espacios dobles.
export function limpiaTitulo(t) {
  return String(t ?? "").replace(/^\s*(¡?\s*-?\d+\s*%\s*(dto|desc(uento)?|off)\.?\s*!?|oferta\s*[:!-]|outlet\s*[:!-])\s*/i, "").replace(/\s+/g, " ").trim();
}
