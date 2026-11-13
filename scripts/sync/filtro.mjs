// Viwai · primer filtro automático del catálogo: quita lo que casi nadie compraría desde Viwai
// (recambios, piezas sueltas, cosas de coche, lotes al por mayor, precios de céntimos).
// Lo que pasa el filtro no sale solo en las tiendas «solo escaparate»: ahí Alba aprueba una a una.
import { normaliza } from "./categorias.mjs";

const FUERA = [
  // coche, moto y piezas
  "car", "auto", "automotive", "vehicle", "motorcycle", "motorbike", "truck", "trailer", "engine", "diesel", "carburetor",
  "audi", "bmw", "toyota", "honda", "nissan", "ford", "volkswagen", "vw", "mercedes", "hyundai", "kia", "peugeot", "renault", "chevrolet", "mazda", "suzuki", "yamaha",
  "coche", "moto", "recambio",
  // piezas, recambios y material industrial
  "replacement", "spare", "part", "parts", "accessory kit", "screw", "screws", "bolt", "bolts", "nut", "nuts", "bearing", "gasket", "valve", "spring",
  "pcb", "module", "sensor", "relay", "resistor", "capacitor", "connector", "terminal", "wire", "cable tie", "diy kit", "industrial", "wholesale", "bulk",
  "repuesto", "repuestos", "de recambio", "embalaje", "para joyeria", "bolsas para joyas", "cajas para joyas", "movimiento nh35", "nh35",
  "movimiento de reloj", "caja de reloj", "esfera de reloj", "bisel", "watch movement", "watch case",
  "belt", "pulley", "nozzle", "fitting", "adapter plate", "bracket", "mount",
  // poco apropiado para una app familiar
  "sexy", "erotic", "adult", "lingerie", "tactical", "airsoft", "vape", "e-cigarette",
  "satisfyer", "womanizer", "succionador", "succionadores", "vibrador", "vibradores", "consolador", "dildo", "juguete sexual", "juguetes sexuales",
  "juguete erotico", "erotico", "erotica", "lubricante", "plug anal", "anal", "estimulador de clitoris", "clitoris", "masturbador", "preservativo", "preservativos", "condon", "sex toy", "vibrator",
];
const RE = new RegExp("(^|[^a-z0-9])(" + FUERA.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")s?($|[^a-z0-9])");

export function pasaFiltro(o) {
  const p = Number(o.precio);
  if (!Number.isFinite(p) || p < 4 || p > 600) return false;
  if (!o.imagen) return false;
  const t = normaliza(o.titulo);
  if (RE.test(t)) return false;
  if (/^\d+\s?(pc|pcs|pieces|set|lot)s?\b/.test(t) && p < 8) return false; // «10PCS …» baratos: piezas sueltas
  return true;
}
