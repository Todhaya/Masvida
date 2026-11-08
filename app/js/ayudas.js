// Viwai · qué ayudas le pueden tocar a una casa.
// Funciones puras: las usa la app (bienvenida y pestaña Ayudas) y el servidor (avisos de ayudas nuevas).
//
// Cada ayuda trae sus requisitos como reglas:
//   ccaa:["Cataluña"]        la casa vive en una de esas comunidades
//   hijos_min:1               al menos N hijos      menores3_min:1  al menos N menores de 3 años
//   hijo_edad_max:17          algún hijo con esa edad o menos
//   ingresos:["bajos"]        tramo de ingresos     vivienda:["alquiler"]   situación de la vivienda
//   situacion:["monoparental","numerosa"]   alguna de esas situaciones
//   edad_min / edad_max       edad de quien rellena el perfil     adultos_max:1   personas adultas en casa
//   calefaccion:["gas"]
//   comprueba:["ingresos"]    reglas que, si no se cumplen o no sabemos, no descartan: dejan la ayuda en «comprueba»
// Resultado: "si" (probablemente sí), "comprueba" (puede ser; hay que mirar), o null (no encaja).

const PROV = {
  "01": "País Vasco", "20": "País Vasco", "48": "País Vasco",
  "02": "Castilla-La Mancha", "13": "Castilla-La Mancha", "16": "Castilla-La Mancha", "19": "Castilla-La Mancha", "45": "Castilla-La Mancha",
  "03": "Comunitat Valenciana", "12": "Comunitat Valenciana", "46": "Comunitat Valenciana",
  "04": "Andalucía", "11": "Andalucía", "14": "Andalucía", "18": "Andalucía", "21": "Andalucía", "23": "Andalucía", "29": "Andalucía", "41": "Andalucía",
  "05": "Castilla y León", "09": "Castilla y León", "24": "Castilla y León", "34": "Castilla y León", "37": "Castilla y León", "40": "Castilla y León", "42": "Castilla y León", "47": "Castilla y León", "49": "Castilla y León",
  "06": "Extremadura", "10": "Extremadura",
  "07": "Illes Balears",
  "08": "Cataluña", "17": "Cataluña", "25": "Cataluña", "43": "Cataluña",
  "15": "Galicia", "27": "Galicia", "32": "Galicia", "36": "Galicia",
  "22": "Aragón", "44": "Aragón", "50": "Aragón",
  "26": "La Rioja", "28": "Comunidad de Madrid", "30": "Región de Murcia", "31": "Navarra", "33": "Asturias",
  "35": "Canarias", "38": "Canarias", "39": "Cantabria", "51": "Ceuta", "52": "Melilla",
};
export const CCAA = [...new Set(Object.values(PROV))].sort((a, b) => a.localeCompare(b, "es"));

export function ccaaDeCP(cp) {
  const s = String(cp ?? "").trim();
  return /^[0-9]{5}$/.test(s) ? PROV[s.slice(0, 2)] ?? null : null;
}

// Pasa el perfil de la app (P y los miembros de la casa) al formato que entienden las reglas.
export function perfilAyudas(P = {}, miembros = []) {
  const peques = miembros.filter((m) => m.kid);
  const edades = peques.map((m) => Number(m.age)).filter((n) => Number.isFinite(n));
  const hijos = peques.length || Number(P.hijos) || 0;
  return {
    ccaa: P.ccaa || ccaaDeCP(P.cp) || null,
    edad: Number(P.edad) || null,
    adultos: Math.max(1, Number(P.adultos) || miembros.filter((m) => !m.kid).length || 1),
    hijos,
    menores3: edades.length ? edades.filter((e) => e < 3).length : Number(P.menor3) || 0,
    edadesHijos: edades,
    ingresos: ["bajos", "medios", "altos"].includes(P.ingresos) ? P.ingresos : null, // null = prefiere no decirlo
    vivienda: P.vivienda || null,
    situacion: Array.isArray(P.situacion) ? P.situacion : [],
    calefaccion: P.calefaccion || null,
  };
}

// Cada regla devuelve true (cumple), false (no cumple) o null (no lo sabemos).
const REGLAS = {
  ccaa: (p, v) => (p.ccaa == null ? null : v.includes(p.ccaa)),
  hijos_min: (p, v) => p.hijos >= v,
  menores3_min: (p, v) => p.menores3 >= v,
  hijo_edad_max: (p, v) => (p.edadesHijos.length ? p.edadesHijos.some((e) => e <= v) : p.hijos > 0 ? null : false),
  ingresos: (p, v) => (p.ingresos == null ? null : v.includes(p.ingresos)),
  vivienda: (p, v) => (p.vivienda == null ? null : v.includes(p.vivienda)),
  situacion: (p, v) => v.some((s) => p.situacion.includes(s)),
  edad_min: (p, v) => (p.edad == null ? null : p.edad >= v),
  edad_max: (p, v) => (p.edad == null ? null : p.edad <= v),
  adultos_max: (p, v) => p.adultos <= v,
  calefaccion: (p, v) => (p.calefaccion == null ? null : v.includes(p.calefaccion)),
};

export function evalua(reglas = {}, perfil) {
  const blandas = new Set(reglas.comprueba || []);
  let dudosa = false;
  for (const [k, v] of Object.entries(reglas)) {
    if (k === "comprueba" || !REGLAS[k]) continue;
    const r = REGLAS[k](perfil, v);
    if (r === true) continue;
    if (r === null || blandas.has(k)) { dudosa = true; continue; }
    return null;
  }
  return dudosa ? "comprueba" : "si";
}

// Lista de ayudas que encajan, primero las «si»
export function misAyudas(ayudas, perfil) {
  return ayudas
    .map((a) => ({ ...a, nivel: evalua(a.reglas, perfil) }))
    .filter((a) => a.nivel)
    .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "si" ? -1 : 1));
}

// Las que no se habían propuesto antes a esta casa (para el aviso push)
export function nuevas(encajan, yaPropuestas) {
  const ya = new Set(yaPropuestas);
  return encajan.filter((a) => !ya.has(a.id));
}
