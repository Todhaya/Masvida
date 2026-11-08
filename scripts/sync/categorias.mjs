// Viwai · nuestras categorías de catálogo y cómo se asigna cada producto.
// Se decide con palabras del título y de la categoría de la tienda (sin acentos, en minúsculas).
// El orden importa: la primera categoría con una palabra que encaje gana.

export const CATEGORIAS = [
  ["peques", "Peques", ["bebe", "infantil", "nino", "nina", "ninos", "juguete", "juguetes", "lego", "peluche", "carrito de bebe", "panal", "panales", "kids", "toy", "toys", "baby", "puericultura", "mochila escolar"]],
  ["mascotas", "Mascotas", ["perro", "gato", "mascota", "mascotas", "pienso", "arena para gatos", "arenero", "rascador", "pet", "dog", "cat litter"]],
  ["belleza", "Belleza y cuidado", ["secador", "plancha de pelo", "rizador", "maquillaje", "serum", "crema", "perfume", "champu", "cosmetica", "belleza", "afeitadora", "depiladora", "cepillo de dientes", "skincare", "beauty", "hair dryer", "parafarmacia"]],
  ["electrodomesticos", "Electrodomésticos", ["freidora", "lavadora", "secadora", "lavavajillas", "frigorifico", "nevera", "horno", "microondas", "aspirador", "aspiradora", "robot aspirador", "cafetera", "batidora", "robot de cocina", "plancha de ropa", "calefactor", "ventilador", "aire acondicionado", "electrodomestico", "vacuum", "air fryer"]],
  ["tecnologia", "Tecnología", ["movil", "smartphone", "tablet", "portatil", "ordenador", "auriculares", "altavoz", "smartwatch", "reloj inteligente", "televisor", "tv ", "monitor", "teclado", "raton", "camara", "consola", "cargador", "power bank", "bateria portatil", "estacion de energia", "electronica", "laptop", "headphones", "phone"]],
  ["cocina", "Cocina", ["sarten", "olla", "cazo", "cuchillo", "vajilla", "vaso", "tupper", "menaje", "cocina", "bandeja de horno", "cubiertos", "taza", "kitchen", "cookware"]],
  ["hogar", "Hogar y deco", ["hogar", "textil", "cojin", "sofa", "colchon", "almohada", "sabanas", "edredon", "nordico", "cortina", "alfombra", "lampara", "mueble", "estanteria", "silla", "mesa", "cuadro", "lamina", "poster", "decoracion", "jardin", "maceta", "toalla", "organizador", "almacenaje", "herramienta", "taladro", "bricolaje", "home", "furniture", "garden", "decor"]],
  ["deporte", "Deporte", ["deporte", "deportivo", "deportiva", "running", "yoga", "fitness", "gimnasio", "bicicleta", "esterilla", "mancuerna", "sport", "camping", "senderismo"]],
  ["moda", "Moda", ["camiseta", "pantalon", "vaqueros", "jeans", "vestido", "falda", "abrigo", "chaqueta", "jersey", "sudadera", "zapatillas", "zapatos", "botas", "sandalias", "bolso", "cartera", "joya", "pendientes", "collar", "pulsera", "reloj", "gafas de sol", "ropa", "calzado", "moda", "fashion", "shoes", "dress", "lenceria", "pijama"]],
  ["alimentacion", "Súper y alimentación", ["cafe en grano", "capsulas", "aceite de oliva", "alimentacion", "comida", "bebida", "vino", "cerveza", "supermercado", "gourmet", "chocolate", "suplemento"]],
  ["viajes", "Viajes y planes", ["hotel", "vuelo", "viaje", "escapada", "maleta", "equipaje", "excursion", "entradas", "experiencia", "alquiler de coche", "travel"]],
];
export const NOMBRES = Object.fromEntries([...CATEGORIAS.map(([k, n]) => [k, n]), ["otros", "Otros"]]);

export const normaliza = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REGLAS = CATEGORIAS.map(([clave, , palabras]) => [clave, new RegExp("(^|[^a-z0-9])(" + palabras.map((p) => escapa(p.trim())).join("|") + ")s?($|[^a-z0-9])")]);

// Primero mira el título (más fiable); si no encaja, la categoría de la tienda.
export function categoriza(titulo, categoriaTienda = "", porDefecto = "otros") {
  for (const texto of [normaliza(titulo), normaliza(categoriaTienda)]) {
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
