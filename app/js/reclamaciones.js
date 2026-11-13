// Viwai · «Recupera tu dinero»: si te toca reclamar, cuánto y hasta cuándo, y la carta lista para enviar.
// Funciones puras (sin pantalla). Las usa la app (apartado Reclamaciones) y los tests.
// Solo cifras y plazos que marca la ley (comprobados el 13 nov 2026). Viwai no reclama en tu nombre ni da asesoramiento legal:
// te dice si encaja, te prepara la carta y te recuerda los plazos. Decisión: docs/DECISIONES.md (13 nov 2026).
//
// Fuentes:
//  · Vuelos: Reglamento (CE) 261/2004 (250/400/600 € desde 3 h de retraso a la llegada; mitad en largo radio entre 3 y 4 h,
//    sentencia Sturgeon). Plazo en España: 5 años (art. 1964 del Código Civil). La reforma (Reglamento (UE) 2026/2202)
//    mantiene importes y umbral; cuando se aplique (previsto en 2027) habrá 9 meses para reclamar y la aerolínea tendrá 30 días.
//  · Trenes: Reglamento (UE) 2021/782, art. 19: 25 % del billete desde 60 min de retraso, 50 % desde 120 min.
//  · Garantía: Ley de consumidores (RDL 7/2021): 3 años en productos nuevos comprados desde el 1 ene 2022 (antes, 2);
//    segunda mano, mínimo 1 año. Se presume que el fallo ya estaba los 2 primeros años (1 en segunda mano).
//  · Compras a distancia: 14 días naturales para desistir; si no te informaron, 12 meses más.
//  · Equipaje (Convenio de Montreal): daños, 7 días; retraso, 21 días desde que te lo entregan; demanda, 2 años.
//  · Cobros indebidos: Ley 10/2025 de atención a la clientela; desde el 28 dic 2026, 5 días para un cobro indebido
//    (grandes empresas y servicios básicos) y 15 días hábiles para el resto, salvo plazo propio del sector.
(function (g) {
  // Aeropuertos más usados desde España. ue = se aplica el Reglamento 261 (UE, Noruega, Islandia y Suiza).
  const AEROPUERTOS = [
    ["MAD", "Madrid", 40.472, -3.561, 1], ["BCN", "Barcelona", 41.297, 2.078, 1], ["AGP", "Málaga", 36.675, -4.499, 1],
    ["PMI", "Palma de Mallorca", 39.552, 2.739, 1], ["ALC", "Alicante", 38.282, -0.558, 1], ["VLC", "Valencia", 39.489, -0.482, 1],
    ["SVQ", "Sevilla", 37.418, -5.893, 1], ["BIO", "Bilbao", 43.301, -2.911, 1], ["LPA", "Gran Canaria", 27.932, -15.387, 1],
    ["TFS", "Tenerife Sur", 28.044, -16.573, 1], ["TFN", "Tenerife Norte", 28.483, -16.342, 1], ["ACE", "Lanzarote", 28.946, -13.605, 1],
    ["FUE", "Fuerteventura", 28.453, -13.864, 1], ["IBZ", "Ibiza", 38.873, 1.373, 1], ["MAH", "Menorca", 39.863, 4.219, 1],
    ["SCQ", "Santiago de Compostela", 42.896, -8.415, 1], ["VGO", "Vigo", 42.232, -8.627, 1], ["OVD", "Asturias", 43.564, -6.035, 1],
    ["SDR", "Santander", 43.427, -3.820, 1], ["GRX", "Granada", 37.189, -3.777, 1], ["XRY", "Jerez", 36.744, -6.060, 1],
    ["ZAZ", "Zaragoza", 41.666, -1.041, 1], ["RMU", "Murcia", 37.803, -1.125, 1], ["GRO", "Girona", 41.901, 2.760, 1], ["REU", "Reus", 41.147, 1.167, 1],
    ["LIS", "Lisboa", 38.774, -9.134, 1], ["OPO", "Oporto", 41.248, -8.681, 1], ["FAO", "Faro", 37.014, -7.966, 1],
    ["CDG", "París Charles de Gaulle", 49.010, 2.548, 1], ["ORY", "París Orly", 48.723, 2.379, 1], ["NCE", "Niza", 43.658, 7.216, 1],
    ["LYS", "Lyon", 45.726, 5.091, 1], ["MRS", "Marsella", 43.439, 5.221, 1], ["FCO", "Roma", 41.800, 12.239, 1],
    ["MXP", "Milán Malpensa", 45.630, 8.723, 1], ["BGY", "Bérgamo", 45.674, 9.704, 1], ["VCE", "Venecia", 45.505, 12.352, 1],
    ["NAP", "Nápoles", 40.886, 14.291, 1], ["AMS", "Ámsterdam", 52.310, 4.768, 1], ["BRU", "Bruselas", 50.901, 4.484, 1],
    ["FRA", "Fráncfort", 50.033, 8.571, 1], ["MUC", "Múnich", 48.354, 11.786, 1], ["BER", "Berlín", 52.366, 13.503, 1],
    ["VIE", "Viena", 48.110, 16.570, 1], ["ZRH", "Zúrich", 47.458, 8.548, 1], ["GVA", "Ginebra", 46.238, 6.109, 1],
    ["DUB", "Dublín", 53.421, -6.270, 1], ["CPH", "Copenhague", 55.618, 12.656, 1], ["ARN", "Estocolmo", 59.650, 17.930, 1],
    ["OSL", "Oslo", 60.194, 11.100, 1], ["HEL", "Helsinki", 60.317, 24.963, 1], ["ATH", "Atenas", 37.936, 23.947, 1],
    ["WAW", "Varsovia", 52.166, 20.967, 1], ["PRG", "Praga", 50.101, 14.260, 1], ["BUD", "Budapest", 47.437, 19.256, 1],
    ["OTP", "Bucarest", 44.571, 26.085, 1], ["MLA", "Malta", 35.857, 14.477, 1],
    ["LHR", "Londres Heathrow", 51.470, -0.454, 0], ["LGW", "Londres Gatwick", 51.148, -0.190, 0], ["STN", "Londres Stansted", 51.885, 0.235, 0],
    ["MAN", "Mánchester", 53.354, -2.275, 0], ["EDI", "Edimburgo", 55.950, -3.372, 0], ["IST", "Estambul", 41.275, 28.752, 0],
    ["RAK", "Marrakech", 31.607, -8.036, 0], ["CMN", "Casablanca", 33.367, -7.590, 0], ["TNG", "Tánger", 35.727, -5.917, 0],
    ["DXB", "Dubái", 25.253, 55.365, 0], ["DOH", "Doha", 25.273, 51.608, 0], ["JFK", "Nueva York", 40.641, -73.778, 0],
    ["MIA", "Miami", 25.796, -80.287, 0], ["CUN", "Cancún", 21.037, -86.877, 0], ["MEX", "Ciudad de México", 19.436, -99.072, 0],
    ["PUJ", "Punta Cana", 18.567, -68.363, 0], ["HAV", "La Habana", 22.989, -82.409, 0], ["BOG", "Bogotá", 4.702, -74.147, 0],
    ["MDE", "Medellín", 6.164, -75.423, 0], ["UIO", "Quito", -0.129, -78.358, 0], ["LIM", "Lima", -12.022, -77.114, 0],
    ["CCS", "Caracas", 10.601, -66.991, 0], ["EZE", "Buenos Aires", -34.822, -58.536, 0], ["GRU", "São Paulo", -23.435, -46.473, 0],
    ["SCL", "Santiago de Chile", -33.393, -70.786, 0],
  ].map(([id, n, lat, lon, ue]) => ({ id, n, lat, lon, ue: !!ue }));
  const aeropuerto = (id) => AEROPUERTOS.find((a) => a.id === String(id || "").toUpperCase()) || null;

  // Distancia por círculo máximo, como la cuenta el Reglamento.
  function distanciaKm(a, b) {
    const A = typeof a === "string" ? aeropuerto(a) : a, B = typeof b === "string" ? aeropuerto(b) : b;
    if (!A || !B) return null;
    const r = Math.PI / 180, dLat = (B.lat - A.lat) * r, dLon = (B.lon - A.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
  }

  // ---- fechas (ISO «2026-11-13») ----
  const dia = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00Z") : null);
  const iso = (d) => d.toISOString().slice(0, 10);
  const suma = (s, { d = 0, m = 0, a = 0 }) => { const x = dia(s); x.setUTCFullYear(x.getUTCFullYear() + a, x.getUTCMonth() + m, x.getUTCDate() + d); return iso(x); };
  const entre = (a, b) => Math.round((dia(b) - dia(a)) / 864e5);
  const hoyISO = () => iso(new Date());

  // ---- Vuelos (Reglamento 261) ----
  // datos: { origen, destino (códigos), incidencia: "retraso"|"cancelacion"|"embarque", retraso: "menos3"|"3a4"|"4mas",
  //          aviso: "menos7"|"7a13"|"14mas", causa: "nose"|"tecnica"|"huelga_propia"|"externa", aerolineaUE: bool, fecha, km? }
  // Resultado: { encaja: "si"|"comprueba"|"no", importe, km, motivo, notas[], plazo }
  function vuelo(datos = {}, hoy = hoyISO()) {
    const O = aeropuerto(datos.origen), D = aeropuerto(datos.destino);
    const km = Number(datos.km) > 0 ? Math.round(Number(datos.km)) : O && D ? distanciaKm(O, D) : null;
    const notas = [], res = (encaja, importe, motivo) => ({ encaja, importe, km, motivo, notas, plazo: plazoVuelo(datos.fecha, hoy) });
    if (km == null) return res("comprueba", null, "Dinos desde dónde y hasta dónde volabas.");
    const saleUE = O ? O.ue : datos.saleUE !== false, llegaUE = D ? D.ue : !!datos.llegaUE;
    if (!saleUE) {
      if (!llegaUE) return res("no", 0, "El vuelo no sale ni llega a un país donde se aplique la norma europea.");
      if (datos.aerolineaUE === false) return res("no", 0, "Si el vuelo llega a Europa desde fuera, solo se aplica con aerolíneas europeas.");
      if (datos.aerolineaUE == null) notas.push("Como sale de fuera de Europa, solo se aplica si la aerolínea es europea.");
    }
    const intraUE = saleUE && llegaUE;
    let base = km <= 1500 ? 250 : intraUE || km <= 3500 ? 400 : 600;
    if (Math.abs(km - 1500) < 60 || (!intraUE && Math.abs(km - 3500) < 60)) notas.push("La distancia está justo en el límite entre dos importes: la aerolínea puede calcularla un poco distinta.");

    const inc = datos.incidencia || "retraso";
    if (inc === "retraso") {
      if (datos.retraso === "menos3") return res("no", 0, "Por debajo de 3 horas de retraso a la llegada no hay compensación (sí comida y bebida mientras esperas).");
      if (!datos.retraso) return res("comprueba", null, "Dinos con cuánto retraso llegaste a tu destino final.");
      if (base === 600 && datos.retraso === "3a4") { base = 300; notas.push("En vuelos de más de 3.500 km con entre 3 y 4 horas de retraso, la compensación es la mitad."); }
    } else if (inc === "cancelacion") {
      if (datos.aviso === "14mas") return res("no", 0, "Si te avisaron con 14 días o más, no hay compensación (sí el reembolso del billete o otro vuelo).");
      if (!datos.aviso) return res("comprueba", null, "Dinos con cuánto tiempo te avisaron de la cancelación.");
      notas.push("Si te ofrecieron otro vuelo con horarios muy parecidos al tuyo, la compensación puede bajar o desaparecer.");
    } else if (inc === "embarque") {
      notas.push("Si cediste tu plaza a cambio de algo que te ofreció la aerolínea, no hay compensación.");
    }
    if (inc !== "embarque") {
      if (datos.causa === "externa") return res("no", 0, "El mal tiempo, una huelga de controladores o el cierre del aeropuerto son causas extraordinarias: la aerolínea no paga compensación (sí debe atenderte y devolverte el billete si no viajas).");
      if (datos.causa === "tecnica") notas.push("Una avería del avión no libra a la aerolínea de pagar.");
      if (datos.causa === "huelga_propia") notas.push("Una huelga del personal de la propia aerolínea no la libra de pagar.");
      if (!datos.causa || datos.causa === "nose") notas.push("La aerolínea puede alegar causas extraordinarias (tiempo, controladores). Si lo hace, pídele que lo demuestre.");
    }
    return res(notas.some((n) => /^Como sale/.test(n)) ? "comprueba" : "si", base, `Te corresponden ${base} € por persona, aparte de lo que cueste el billete.`);
  }
  function plazoVuelo(fecha, hoy = hoyISO()) {
    if (!fecha) return null;
    const hasta = suma(fecha, { a: 5 });
    return { hasta, dias: entre(hoy, hasta), texto: "En España tienes 5 años desde el vuelo. Con la reforma europea (prevista para 2027) serán 9 meses: mejor no esperar." };
  }

  // ---- Trenes (Reglamento 2021/782) ----
  function tren({ precio, retrasoMin } = {}) {
    const p = Number(precio), r = Number(retrasoMin);
    if (!(r >= 0)) return { encaja: "comprueba", importe: null, motivo: "Dinos con cuánto retraso llegaste." };
    if (r < 60) return { encaja: "no", importe: 0, motivo: "La ley europea compensa desde 60 minutos de retraso a la llegada. Mira si la compañía tiene un compromiso de puntualidad propio." };
    const pct = r >= 120 ? 50 : 25, imp = p > 0 ? Math.round(p * pct) / 100 : null;
    const notas = ["La compañía puede tener un compromiso de puntualidad mejor que la ley: revisa sus condiciones.", "Deben pagarte en el mes siguiente a tu solicitud."];
    if (imp != null && imp < 4) notas.push("Las compañías pueden no pagar compensaciones de menos de 4 €.");
    return { encaja: imp != null && imp < 4 ? "comprueba" : "si", importe: imp, pct, motivo: `Te corresponde al menos el ${pct} % del billete${imp != null ? ` (${fmt(imp)})` : ""}.`, notas };
  }

  // ---- Garantía ----
  function garantia({ fechaCompra, segundaMano } = {}, hoy = hoyISO()) {
    if (!fechaCompra) return { encaja: "comprueba", motivo: "Dinos cuándo lo compraste." };
    const nueva = fechaCompra >= "2022-01-01";
    const anos = segundaMano ? 1 : nueva ? 3 : 2, presun = segundaMano ? 1 : nueva ? 2 : 0.5;
    const hasta = suma(fechaCompra, { a: anos }), dias = entre(hoy, hasta);
    const presHasta = presun === 0.5 ? suma(fechaCompra, { m: 6 }) : suma(fechaCompra, { a: presun });
    const notas = ["Primero, que te lo reparen o te lo cambien gratis. Si no se puede o tardan demasiado, una rebaja o que te devuelvan el dinero."];
    if (hoy <= presHasta) notas.push("En este periodo se da por hecho que el fallo venía de fábrica: no tienes que demostrarlo tú.");
    else if (dias >= 0) notas.push("Pasado el primer periodo, la tienda puede pedirte que demuestres que el fallo venía de origen.");
    if (segundaMano) notas.push("En segunda mano el mínimo es 1 año si lo vende una tienda o profesional.");
    if (dias < 0) return { encaja: "no", hasta, dias, anos, motivo: `La garantía legal acabó el ${fechaLarga(hasta)}. Mira si tiene garantía comercial del fabricante.`, notas: [] };
    return { encaja: "si", hasta, dias, anos, motivo: `Está en garantía hasta el ${fechaLarga(hasta)} (${anos} ${anos === 1 ? "año" : "años"}).`, notas };
  }

  // ---- Devolver una compra por internet o por teléfono (desistimiento) ----
  function desistimiento({ fechaRecibido, informado = true } = {}, hoy = hoyISO()) {
    if (!fechaRecibido) return { encaja: "comprueba", motivo: "Dinos cuándo lo recibiste." };
    const hasta = informado ? suma(fechaRecibido, { d: 14 }) : suma(suma(fechaRecibido, { m: 12 }), { d: 14 });
    const dias = entre(hoy, hasta);
    const notas = ["Tienen que devolverte el dinero, con el envío normal incluido, en 14 días desde que les avisas.", "No vale para productos personalizados, comida, ni productos de higiene precintados que se han abierto."];
    if (dias < 0) return { encaja: "no", hasta, dias, motivo: `El plazo para devolverlo sin motivo acabó el ${fechaLarga(hasta)}. Si tiene un fallo, usa la garantía.`, notas: [] };
    return { encaja: "si", hasta, dias, motivo: `Puedes devolverlo sin dar explicaciones hasta el ${fechaLarga(hasta)}.`, notas };
  }

  // ---- Maleta (Convenio de Montreal) ----
  function equipaje({ problema = "danada", fecha } = {}, hoy = hoyISO()) {
    if (!fecha) return { encaja: "comprueba", motivo: problema === "perdida" ? "Dinos qué día volaste." : "Dinos qué día te entregaron la maleta." };
    const notas = ["Rellena el parte (PIR) en el mostrador del aeropuerto si aún estás a tiempo, y guarda los tiques de lo que compres."];
    if (problema === "perdida") {
      const perdida = suma(fecha, { d: 21 });
      return { encaja: "si", hasta: suma(fecha, { a: 2 }), dias: entre(hoy, suma(fecha, { a: 2 })), motivo: hoy >= perdida ? "Han pasado 21 días: la maleta se considera perdida y puedes pedir que te paguen su contenido." : `Si no aparece antes del ${fechaLarga(perdida)}, se considera perdida.`, notas };
    }
    const n = problema === "danada" ? 7 : 21, hasta = suma(fecha, { d: n }), dias = entre(hoy, hasta);
    if (dias < 0) return { encaja: "no", hasta, dias, motivo: `El plazo para reclamar por escrito (${n} días) acabó el ${fechaLarga(hasta)}.`, notas: [] };
    return { encaja: "si", hasta, dias, motivo: `Tienes que reclamar por escrito a la aerolínea antes del ${fechaLarga(hasta)} (${n} días).`, notas };
  }

  // ---- Cobro de más (banco, luz, teléfono, suscripción…) ----
  function cobro({ sector = "otro", importe } = {}, hoy = hoyISO()) {
    const imp = Number(importe) > 0 ? Number(importe) : null;
    const leyNueva = hoy >= "2026-12-28";
    const notas = [];
    if (sector === "banco") notas.push("Si no te responden en un mes o te dicen que no, puedes reclamar gratis al Banco de España.");
    else notas.push("Si no te responden en un mes o te dicen que no, puedes ir a la oficina de consumo (OMIC) o a arbitraje de consumo, que es gratis.");
    notas.push(leyNueva ? "Las grandes empresas y las de luz, gas, agua o teléfono tienen 5 días para resolver un cobro indebido, salvo que su sector tenga otro plazo." : "Desde el 28 de diciembre de 2026, las grandes empresas y las de luz, gas, agua o teléfono tendrán 5 días para resolver un cobro indebido.");
    return { encaja: "si", importe: imp, esperaDias: 30, motivo: imp ? `Pide que te devuelvan ${fmt(imp)}.` : "Pide que te devuelvan lo cobrado de más.", notas };
  }

  const EVALUA = { vuelo, tren, garantia, desistimiento, equipaje, cobro };

  // Tipos que ofrece la app: id, nombre, icono (diseno/iconos.json), a quién se reclama y qué hacer si no responden.
  const TIPOS = [
    { id: "vuelo", n: "Vuelo con retraso o cancelado", s: "Hasta 600 € por persona", ic: "avion", a: "la aerolínea", siNo: "Si en un mes no te responden o te dicen que no, reclama gratis a AESA (Agencia Estatal de Seguridad Aérea)." },
    { id: "equipaje", n: "Maleta rota, retrasada o perdida", s: "Plazos muy cortos: 7 y 21 días", ic: "maleta", a: "la aerolínea", siNo: "Si no te responden, puedes ir a la oficina de consumo (OMIC); tienes 2 años para ir a juicio." },
    { id: "tren", n: "Tren con retraso", s: "25 % o 50 % del billete", ic: "reloj", a: "la compañía de tren", siNo: "Si no te responden en un mes, ve a la oficina de consumo (OMIC) o a arbitraje de consumo." },
    { id: "cobro", n: "Te han cobrado de más", s: "Banco, luz, teléfono, suscripciones", ic: "recibo", a: "la empresa", siNo: "" },
    { id: "garantia", n: "Se ha roto y está en garantía", s: "3 años en lo comprado nuevo", ic: "escudo", a: "la tienda", siNo: "Si la tienda no responde o se niega, ve a la oficina de consumo (OMIC) o a arbitraje de consumo." },
    { id: "desistimiento", n: "Devolver una compra por internet", s: "14 días sin dar explicaciones", ic: "paquete-devolver", a: "la tienda", siNo: "Si no te devuelven el dinero en 14 días, ve a la oficina de consumo (OMIC)." },
  ];

  // Carta lista para copiar. d: datos del formulario + { nombre, empresa, referencia, detalle } y r: resultado de evaluar.
  function carta(tipo, d = {}, r = {}) {
    const nom = d.nombre || "[Tu nombre y apellidos]", emp = d.empresa || "[Nombre de la empresa]", ref = d.referencia ? ` (referencia ${d.referencia})` : "";
    const f = d.fecha ? fechaLarga(d.fecha) : "[fecha]", det = d.detalle ? `\n\n${d.detalle}` : "";
    const cab = `A la atención de ${emp}\nServicio de atención al cliente\n\n`;
    const pie = `\n\nPor favor, confirmad que habéis recibido esta reclamación. Adjunto los justificantes.\n\nUn saludo,\n${nom}${d.contacto ? "\n" + d.contacto : ""}`;
    const O = aeropuerto(d.origen), D = aeropuerto(d.destino);
    const T = {
      vuelo: () => `${cab}Asunto: Solicitud de compensación · vuelo ${d.referencia || "[número de vuelo]"} del ${f}\n\nViajé en el vuelo ${d.referencia || "[número de vuelo]"} de ${O ? O.n : "[origen]"} a ${D ? D.n : "[destino]"} el ${f}. ${d.incidencia === "cancelacion" ? "El vuelo fue cancelado con menos de 14 días de aviso." : d.incidencia === "embarque" ? "Se me denegó el embarque contra mi voluntad." : "El vuelo llegó a destino con más de 3 horas de retraso."}${det}\n\nDe acuerdo con el Reglamento (CE) 261/2004 y la jurisprudencia del Tribunal de Justicia de la UE, solicito una compensación de ${r.importe ? r.importe + " €" : "[importe] €"} por pasajero, además del reembolso de los gastos de comida y transporte que adjunto, si los hubo.\n\nSi consideráis que hubo circunstancias extraordinarias, os pido que me lo justifiquéis por escrito y con documentos.\n\nOs pido el pago por transferencia en un plazo de 30 días.${pie}`,
      tren: () => `${cab}Asunto: Solicitud de indemnización por retraso${ref}\n\nViajé el ${f} con el billete${ref} y llegué a mi destino con ${d.retrasoMin || "[minutos]"} minutos de retraso.${det}\n\nDe acuerdo con el artículo 19 del Reglamento (UE) 2021/782, solicito una indemnización del ${r.pct || "[25 o 50]"} % del precio del billete${r.importe ? ` (${fmt(r.importe)})` : ""}, o la que corresponda según vuestro compromiso de puntualidad si es mayor.${pie}`,
      garantia: () => `${cab}Asunto: Reparación en garantía${ref}\n\nEl ${d.fechaCompra ? fechaLarga(d.fechaCompra) : "[fecha de compra]"} compré ${d.producto || "[producto]"}, que ha dejado de funcionar correctamente.${det}\n\nComo está dentro del plazo de garantía legal (artículos 114 y siguientes de la Ley General para la Defensa de los Consumidores y Usuarios), solicito que lo reparéis o lo sustituyáis sin coste, incluido el transporte. Si no es posible en un plazo razonable, solicito la devolución del precio.${pie}`,
      desistimiento: () => `${cab}Asunto: Desistimiento de la compra${ref}\n\nOs comunico que desisto del contrato de compra de ${d.producto || "[producto]"}${ref}, recibido el ${d.fechaRecibido ? fechaLarga(d.fechaRecibido) : "[fecha]"}, dentro del plazo de 14 días naturales (artículo 102 de la Ley General para la Defensa de los Consumidores y Usuarios).${det}\n\nSolicito la devolución de todo lo pagado, incluido el envío, en un plazo máximo de 14 días, y que me indiquéis cómo devolveros el producto.${pie}`,
      equipaje: () => `${cab}Asunto: Reclamación de equipaje · vuelo ${d.referencia || "[número de vuelo]"} del ${f}\n\n${d.problema === "perdida" ? "Mi maleta no ha llegado y han pasado más de 21 días." : d.problema === "retrasada" ? "Mi maleta llegó con retraso y tuve que comprar lo imprescindible." : "Mi maleta llegó dañada."}${d.pir ? ` Número de parte (PIR): ${d.pir}.` : ""}${det}\n\nDe acuerdo con el Convenio de Montreal, solicito que me indemnicéis por ${d.problema === "danada" ? "la reparación o el valor de la maleta" : d.problema === "perdida" ? "el valor de la maleta y su contenido" : "los gastos que adjunto"}${d.importe ? `, por un total de ${fmt(Number(d.importe))}` : ""}.${pie}`,
      cobro: () => `${cab}Asunto: Reclamación por cobro indebido${ref}\n\nEn ${d.concepto || "mi cuenta"} aparece un cargo de ${r.importe ? fmt(r.importe) : "[importe]"} del ${f} que no corresponde.${det}\n\nSolicito que me devolváis ese importe y que me confirméis por escrito que el error está corregido.${pie}`,
    };
    return (T[tipo] || T.cobro)();
  }

  // Estados de una reclamación guardada y el aviso que toca.
  const ESTADOS = [["borrador", "Sin enviar"], ["enviada", "Enviada"], ["respuesta", "Han respondido"], ["cobrada", "Cobrada"], ["rechazada", "Rechazada"]];
  function aviso(rec, hoy = hoyISO()) {
    if (rec.estado === "borrador" && rec.hasta) { const d = entre(hoy, rec.hasta); return d < 0 ? null : { dias: d, texto: d <= 7 ? `Envíala ya: el plazo acaba en ${d} ${d === 1 ? "día" : "días"}` : "Pendiente de enviar" }; }
    if (rec.estado === "enviada" && rec.enviada) { const d = 30 - entre(rec.enviada, hoy); return d <= 0 ? { dias: 0, texto: "Ya ha pasado un mes: puedes ir al siguiente paso" } : { dias: d, texto: `Esperando respuesta · ${d} ${d === 1 ? "día" : "días"} para el mes` }; }
    return null;
  }
  const recuperado = (lista = []) => lista.filter((r) => r.estado === "cobrada").reduce((s, r) => s + (Number(r.cobrado ?? r.importe) || 0), 0);
  const enJuego = (lista = []) => lista.filter((r) => ["borrador", "enviada", "respuesta"].includes(r.estado)).reduce((s, r) => s + (Number(r.importe) || 0), 0);

  function fmt(n) { return Number(n).toLocaleString("es-ES", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }) + " €"; }
  function fechaLarga(s) { const M = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"], d = dia(s); return `${d.getUTCDate()} de ${M[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; }

  g.viwaiReclama = { TIPOS, AEROPUERTOS, ESTADOS, aeropuerto, distanciaKm, evalua: (t, d, hoy) => EVALUA[t](d, hoy), vuelo, tren, garantia, desistimiento, equipaje, cobro, carta, aviso, recuperado, enJuego, fechaLarga, fmt, suma, entre };
})(typeof window !== "undefined" ? window : globalThis);
