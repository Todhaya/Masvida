// Viwai · panel de administración. Datos en Supabase; solo entra quien está en la tabla `admins` (RLS).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import {
  resumenMes, reparto100, progresoObjetivos, ultimosMeses, kpis, descuentoReal, estadoCampana, parseComisionesCSV,
} from "./calculos.js";

const sb = createClient(window.VIWAI.supabaseUrl, window.VIWAI.supabaseAnonKey);
const $ = (s, el = document) => el.querySelector(s);
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = (x) => (Number(x) || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const num = (x) => (Number(x) || 0).toLocaleString("es-ES");
const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const fecha = (f) => (f ? new Date(f.length === 10 ? f + "T12:00:00" : f).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "");

// ---------- Datos ----------
const cache = {};
async function cargar(tabla, { select = "*", orden, desc = false, desde, campoFecha } = {}, forzar = false) {
  const k = tabla + select + (desde || "");
  if (cache[k] && !forzar) return cache[k];
  let q = sb.from(tabla).select(select);
  if (desde && campoFecha) q = q.gte(campoFecha, desde);
  if (orden) q = q.order(orden, { ascending: !desc });
  const { data, error } = await q.limit(5000);
  if (error) { console.warn(tabla, error.message); return (cache[k] = []); }
  return (cache[k] = data || []);
}
const limpiar = () => Object.keys(cache).forEach((k) => delete cache[k]);
async function cuenta(tabla, filtro) {
  let q = sb.from(tabla).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count || 0;
}
async function ajustes() {
  const filas = await cargar("ajustes");
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}

// ---------- Componentes ----------
const kpi = (titulo, valor, sub = "") => `<div class="card kpi"><small>${esc(titulo)}</small><div class="v">${valor}</div><div class="s">${sub}</div></div>`;

function spark(serie) {
  if (!serie.length) return "";
  const max = Math.max(1, ...serie.map((p) => p.v));
  const w = 100 / serie.length;
  return `<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Altas por día">${serie
    .map((p, i) => `<rect x="${i * w + w * 0.15}" y="${40 - (p.v / max) * 38}" width="${w * 0.7}" height="${(p.v / max) * 38 || 0.4}" rx="0.6" fill="var(--brand)"><title>${p.d}: ${p.v}</title></rect>`)
    .join("")}</svg>`;
}

function objetivos(lista) {
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${lista.map((o) => `
    <div class="card obj"><div class="t"><span>${esc(o.nombre)}</span><span>${o.pct} %</span></div>
    <div class="prog"><i class="${o.pct >= 100 ? "full" : ""}" style="width:${o.pct}%"></i></div>
    <div class="note">${o.falta > 0 ? `Faltan <b>${eur(o.falta)}</b>${o.clave === "marca" ? "" : " al mes"} · meta ${eur(o.meta)}` : "¡Conseguido!"}<br>${esc(o.nota)}</div></div>`).join("")}</div>`;
}

// Tabla editable genérica: lista + diálogo de alta/edición.
async function crud(el, cfg) {
  const { tabla, titulo, campos, cols, orden, desc, nuevo = {}, filtrar, despues, sinAlta } = cfg;
  let filas = await cargar(tabla, { orden, desc }, true);
  if (filtrar) filas = filas.filter(filtrar);
  const columnas = cols || campos.slice(0, 5).map((c) => ({ l: c.l, v: (f) => esc(f[c.k]) }));
  el.innerHTML = `<div class="row"><h3 style="margin:0">${esc(titulo)}</h3>${sinAlta ? "" : `<button class="btn sec" data-nuevo>+ Añadir</button>`}</div>
    <div class="tw"><table><thead><tr>${columnas.map((c) => `<th class="${c.n ? "n" : ""}">${esc(c.l)}</th>`).join("")}</tr></thead>
    <tbody>${filas.length ? filas.map((f, i) => `<tr class="clic" data-i="${i}">${columnas.map((c) => `<td class="${c.n ? "n" : ""}">${c.v(f)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columnas.length}" class="vacio">Todavía no hay nada aquí.</td></tr>`}</tbody></table></div>`;
  el.querySelector("[data-nuevo]")?.addEventListener("click", () => editar(cfg, { ...nuevo }, el, false));
  el.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("a,button,input")) return;
    editar(cfg, filas[+tr.dataset.i], el, true);
  }));
  despues?.(el, filas);
}

function campoHTML(c, v) {
  const id = "f_" + c.k;
  const lbl = esc(c.l) + (c.req ? " *" : "");
  const w = c.w || c.t === "textarea" ? " w" : "";
  if (c.t === "bool") return `<label class="c${w}"><input type="checkbox" id="${id}" ${v ? "checked" : ""}> ${lbl}</label>`;
  if (c.t === "select") {
    const ops = typeof c.o === "function" ? c.o() : c.o;
    return `<label class="f${w}">${lbl}<select id="${id}">${c.req ? "" : `<option value=""></option>`}${ops.map((o) => {
      const [val, txt] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(val)}" ${String(v ?? "") === String(val) ? "selected" : ""}>${esc(txt)}</option>`;
    }).join("")}</select></label>`;
  }
  if (c.t === "textarea") return `<label class="f w">${lbl}<textarea id="${id}">${esc(v)}</textarea></label>`;
  const tipo = { number: "number", date: "date", datetime: "datetime-local", url: "url" }[c.t] || "text";
  let val = v ?? "";
  if (c.t === "array") val = (v || []).join(", ");
  if (c.t === "datetime" && v) val = new Date(v).toISOString().slice(0, 16);
  return `<label class="f${w}">${lbl}<input id="${id}" type="${tipo}" ${c.t === "number" ? 'step="any"' : ""} value="${esc(val)}" ${c.ph ? `placeholder="${esc(c.ph)}"` : ""}></label>`;
}

function leerCampo(c) {
  const el = $("#f_" + c.k);
  if (c.t === "bool") return el.checked;
  const v = el.value.trim();
  if (c.t === "number") return v === "" ? null : Number(v);
  if (c.t === "array") return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (c.t === "datetime") return v ? new Date(v).toISOString() : null;
  return v === "" ? null : v;
}

function editar(cfg, fila, el, existe) {
  const { tabla, campos, clave = "id", titulo } = cfg;
  const claves = [].concat(clave);
  const donde = (q) => claves.reduce((acc, k) => acc.eq(k, fila[k]), q);
  const dlg = $("#dlg");
  dlg.innerHTML = `<form method="dialog"><h3>${existe ? "Editar" : "Añadir"} · ${esc(titulo)}</h3>
    ${campos.map((c) => campoHTML(c, fila[c.k])).join("")}
    <p class="err w" id="dlgErr"></p>
    <div class="acc">${existe ? `<button type="button" class="btn bad" data-borrar>Borrar</button>` : ""}<span style="flex:1"></span>
    <button type="button" class="btn sec" data-cerrar>Cancelar</button><button class="btn" data-guardar>Guardar</button></div></form>`;
  dlg.showModal();
  dlg.querySelector("[data-cerrar]").onclick = () => dlg.close();
  dlg.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(campos.map((c) => [c.k, leerCampo(c)]));
    const falta = campos.find((c) => c.req && (datos[c.k] == null || datos[c.k] === ""));
    if (falta) return ($("#dlgErr").textContent = `Falta: ${falta.l}`);
    const q = existe ? donde(sb.from(tabla).update(datos)) : sb.from(tabla).insert(datos);
    const { error } = await q;
    if (error) return ($("#dlgErr").textContent = error.message);
    dlg.close(); limpiar(); crud(el, cfg);
  };
  dlg.querySelector("[data-borrar]")?.addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres borrarlo?")) return;
    const { error } = await donde(sb.from(tabla).delete());
    if (error) return ($("#dlgErr").textContent = error.message);
    dlg.close(); limpiar(); crud(el, cfg);
  });
}

// ---------- Pestañas ----------
const TABS = [
  ["resumen", "Resumen"], ["dinero", "Dinero y objetivos"], ["afiliados", "Afiliados"], ["campanas", "Campañas"],
  ["envios", "Push y correo"], ["usuarias", "Usuarias"], ["reembolsos", "Reembolsos"], ["catalogo", "Catálogo y ayudas"], ["calendario", "Calendario"],
];
const V = {};

V.resumen = async (m) => {
  const [aj, lista, comisiones, movimientos, gastos, metricas, campanas, cal, clics] = await Promise.all([
    ajustes(), cargar("lista_espera", { select: "id,consentimiento,origen", orden: "consentimiento" }),
    cargar("comisiones"), cargar("movimientos"), cargar("gastos"), cargar("metricas", { orden: "fecha", desc: true }),
    cargar("campanas", { orden: "inicio" }), cargar("calendario", { orden: "fecha" }),
    cargar("clics", { select: "id,tienda_id,creado", desde: haceDias(90), campoFecha: "creado" }),
  ]);
  const hogares = await cuenta("hogares");
  const desde30 = haceDias(30), desde7 = haceDias(7);
  const serie = Array.from({ length: 30 }, (_, i) => {
    const d = haceDias(29 - i);
    return { d, v: lista.filter((x) => x.consentimiento.slice(0, 10) === d).length };
  });
  const sum = (fuente, campo) => metricas.filter((x) => x.fuente === fuente && x.fecha >= desde30).reduce((s, x) => s + (x[campo] || 0), 0);
  const ym = hoy().slice(0, 7);
  const mes = resumenMes({ comisiones, movimientos, gastos }, ym, aj.reservas);
  const meses = ultimosMeses(new Date(), 12).map((y) => resumenMes({ comisiones, movimientos, gastos }, y, aj.reservas));
  const enCurso = campanas.filter((c) => estadoCampana(c) === "en curso");
  const proximas = campanas.filter((c) => estadoCampana(c) === "próxima").slice(0, 3);
  const pend = cal.filter((c) => !c.hecho && c.fecha >= haceDias(7)).slice(0, 5);
  const visitas = sum("web", "visitas"), inst = sum("app", "instalaciones");
  m.innerHTML = `<h2>Resumen</h2>
    <div class="grid">
      ${kpi("Lista de espera", num(lista.length), `+${lista.filter((x) => x.consentimiento >= desde7).length} esta semana`)}
      ${kpi("Visitas web · 30 días", visitas ? num(visitas) : "—", visitas ? `${num(sum("web", "visitantes"))} personas` : "Añádelas en Métricas")}
      ${kpi("Instalaciones app · 30 días", inst ? num(inst) : "—", `${num(hogares)} casas con cuenta`)}
      ${kpi("Clics a tiendas · 30 días", num(clics.filter((c) => c.creado >= desde30).length), "desde la web y la app")}
      ${kpi("Comisión del mes", eur(mes.confirmada), `${eur(mes.pendiente)} pendiente de confirmar`)}
      ${kpi("Disponible del mes", eur(mes.disponible), "ya apartados impuestos y gastos")}
    </div>
    <div class="split" style="margin-top:16px">
      <div class="card"><b>Altas en la lista de espera · 30 días</b>${spark(serie)}</div>
      <div class="card"><b>Campañas</b>
        ${enCurso.length ? enCurso.map((c) => `<div class="row"><span class="tag ok">en curso</span> ${esc(c.nombre)} <span class="note">hasta ${fecha(c.fin)}</span></div>`).join("") : `<p class="note">Ninguna en curso.</p>`}
        ${proximas.map((c) => `<div class="row"><span class="tag info">próxima</span> ${esc(c.nombre)} <span class="note">${fecha(c.inicio)}</span></div>`).join("")}
      </div>
    </div>
    <h3>Objetivos</h3>${objetivos(progresoObjetivos(meses, aj.objetivos))}
    <h3>Lo próximo en el calendario</h3>
    <div class="card">${pend.length ? pend.map((c) => `<div class="row"><span class="tag ${c.fecha < hoy() ? "bad" : "lav"}">${fecha(c.fecha)}</span> ${esc(c.titulo)}</div>`).join("") : `<p class="note">Nada pendiente.</p>`}</div>
    <div id="met"></div>
    <p class="note">Las visitas exactas de la web están en Cloudflare → viwai-web → Métricas (Web Analytics). Mientras no las conectemos aquí, apunta el total de cada semana en Métricas.</p>`;
  crud($("#met", m), {
    tabla: "metricas", titulo: "Métricas que se apuntan a mano", clave: ["fecha", "fuente"], orden: "fecha", desc: true,
    nuevo: { fecha: hoy(), fuente: "web" },
    campos: [
      { k: "fecha", l: "Fecha", t: "date", req: true }, { k: "fuente", l: "Fuente", t: "select", o: ["web", "app", "instagram", "tiktok", "facebook", "email", "push"], req: true },
      { k: "visitas", l: "Visitas", t: "number" }, { k: "visitantes", l: "Personas", t: "number" }, { k: "instalaciones", l: "Instalaciones", t: "number" },
      { k: "seguidores", l: "Seguidores", t: "number" }, { k: "clics", l: "Clics", t: "number" },
    ],
    cols: [
      { l: "Fecha", v: (f) => fecha(f.fecha) }, { l: "Fuente", v: (f) => esc(f.fuente) }, { l: "Visitas", n: 1, v: (f) => num(f.visitas) },
      { l: "Personas", n: 1, v: (f) => num(f.visitantes) }, { l: "Instal.", n: 1, v: (f) => num(f.instalaciones) }, { l: "Seguidores", n: 1, v: (f) => num(f.seguidores) },
    ],
  });
};

V.dinero = async (m) => {
  const [aj, comisiones, movimientos, gastos] = await Promise.all([ajustes(), cargar("comisiones", { orden: "fecha", desc: true }), cargar("movimientos"), cargar("gastos")]);
  const meses = ultimosMeses(new Date(), 12).map((y) => resumenMes({ comisiones, movimientos, gastos }, y, aj.reservas));
  const anyo = meses.reduce((t, r) => { for (const k of Object.keys(r)) if (k !== "ym") t[k] = (t[k] || 0) + r[k]; return t; }, {});
  const rep = reparto100(anyo);
  const res = aj.reservas || {}, obj = aj.objetivos || {};
  const bloques = rep ? [["usuarias", "A usuarias", "var(--mint)"], ["gastos", "Gastos", "var(--sky)"], ["irpf", "IRPF", "var(--peach)"], ["colchon", "Colchón", "var(--butter)"], ["tuyo", "Tuyo", "var(--lav)"]] : [];
  m.innerHTML = `<h2>Dinero y objetivos</h2>
    <div class="card"><b>De cada 100 € que pagan las tiendas (últimos 12 meses)</b>
      ${rep ? `<div class="reparto" style="margin-top:10px">${bloques.map(([k, , c]) => `<span style="flex:${Math.max(0, rep[k])};background:${c}">${rep[k] >= 8 ? rep[k].toFixed(0) + " €" : ""}</span>`).join("")}</div>
      <div class="leg">${bloques.map(([k, l, c]) => `<span><i style="background:${c}"></i>${l}: ${rep[k].toFixed(2)} €</span>`).join("")}</div>`
      : `<p class="note">Cuando entren las primeras comisiones confirmadas verás aquí el reparto real. Con tus ajustes: de cada beneficio apartas un ${res.irpf_pct ?? 0} % para IRPF y un ${res.colchon_pct ?? 0} % de colchón.</p>`}
      <p class="note">El IVA no entra en estas cuentas: si alguna red te paga IVA aparte, ese dinero es de Hacienda entero. Esto es una guía para apartar dinero, no asesoramiento fiscal.</p>
    </div>
    <h3>Objetivos</h3>${objetivos(progresoObjetivos(meses, obj))}
    <h3>Mes a mes</h3>
    <div class="tw"><table><thead><tr><th>Mes</th><th class="n">Comisión confirmada</th><th class="n">Pendiente</th><th class="n">A usuarias</th><th class="n">Gastos</th><th class="n">IRPF</th><th class="n">Colchón</th><th class="n">Disponible</th></tr></thead>
    <tbody>${meses.slice().reverse().map((r) => `<tr><td>${r.ym}</td><td class="n">${eur(r.confirmada)}</td><td class="n">${eur(r.pendiente)}</td><td class="n">${eur(r.aUsuarias)}</td><td class="n">${eur(r.gastos)}</td><td class="n">${eur(r.irpf)}</td><td class="n">${eur(r.colchon)}</td><td class="n"><b>${eur(r.disponible)}</b></td></tr>`).join("")}</tbody></table></div>
    <h3>Ajustes</h3>
    <form id="fAj" class="card grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      <label class="f">Coste de registrar la marca (€)<input type="number" step="any" name="marca_oepm" value="${obj.marca_oepm ?? ""}"></label>
      <label class="f">Cuota de autónoma al mes (€)<input type="number" step="any" name="cuota_autonoma" value="${obj.cuota_autonoma ?? ""}"></label>
      <label class="f">Neto que quieres al mes (€)<input type="number" step="any" name="neto_mensual" value="${obj.neto_mensual ?? ""}"></label>
      <label class="f">Para dejar el trabajo, al mes (€)<input type="number" step="any" name="dejar_trabajo" value="${obj.dejar_trabajo ?? ""}"></label>
      <label class="f">Reserva IRPF (% del beneficio)<input type="number" step="any" name="irpf_pct" value="${res.irpf_pct ?? ""}"></label>
      <label class="f">Colchón (% del beneficio)<input type="number" step="any" name="colchon_pct" value="${res.colchon_pct ?? ""}"></label>
      <div class="row"><button class="btn">Guardar ajustes</button><span class="note" id="ajMsg"></span></div>
    </form>
    <div id="gastos"></div>
    <h3>Comisiones</h3>
    <div class="card"><p class="note">Mientras no se importan solas: exporta el informe de transacciones de cada red en CSV y pégalo aquí. Columnas: red, ref_red, tienda_id, importe_venta, comision, estado (pendiente/confirmada/anulada/pagada), fecha (AAAA-MM-DD). Si una transacción ya existe, se actualiza.</p>
      <textarea id="csv" placeholder="red;ref_red;tienda_id;importe_venta;comision;estado;fecha"></textarea>
      <div class="row"><button class="btn" id="imp">Importar</button><span class="note" id="impMsg"></span></div></div>
    <div id="com"></div>`;
  $("#fAj", m).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), n = (k) => (f.get(k) === "" ? null : Number(f.get(k)));
    const filas = [
      { clave: "objetivos", valor: { marca_oepm: n("marca_oepm"), cuota_autonoma: n("cuota_autonoma"), neto_mensual: n("neto_mensual"), dejar_trabajo: n("dejar_trabajo") } },
      { clave: "reservas", valor: { irpf_pct: n("irpf_pct"), colchon_pct: n("colchon_pct") } },
    ];
    const { error } = await sb.from("ajustes").upsert(filas);
    $("#ajMsg").textContent = error ? error.message : "Guardado";
    limpiar(); if (!error) setTimeout(() => ir("dinero"), 600);
  };
  $("#imp", m).onclick = async () => {
    const { ok, errores } = parseComisionesCSV($("#csv").value);
    if (!ok.length) return ($("#impMsg").textContent = "No he encontrado filas válidas.");
    const { error } = await sb.from("comisiones").upsert(ok, { onConflict: "red,ref_red" });
    $("#impMsg").textContent = error ? error.message : `${ok.length} importadas${errores.length ? ` · revisa las líneas ${errores.join(", ")}` : ""}`;
    limpiar(); if (!error) crud($("#com"), cfgComisiones);
  };
  crud($("#gastos", m), {
    tabla: "gastos", titulo: "Gastos de estructura", orden: "fecha", desc: true, nuevo: { fecha: hoy(), periodicidad: "unico", categoria: "herramientas" },
    campos: [
      { k: "concepto", l: "Concepto", req: true, w: 1 }, { k: "importe", l: "Importe (€)", t: "number", req: true }, { k: "fecha", l: "Fecha (o inicio)", t: "date", req: true },
      { k: "categoria", l: "Categoría", t: "select", o: ["herramientas", "dominios", "publicidad", "gestoria", "impuestos", "marca", "otros"], req: true },
      { k: "periodicidad", l: "Se paga", t: "select", o: [["unico", "Una vez"], ["mensual", "Cada mes"], ["anual", "Cada año"]], req: true },
    ],
    cols: [{ l: "Fecha", v: (f) => fecha(f.fecha) }, { l: "Concepto", v: (f) => esc(f.concepto) }, { l: "Categoría", v: (f) => esc(f.categoria) }, { l: "Se paga", v: (f) => esc(f.periodicidad) }, { l: "Importe", n: 1, v: (f) => eur(f.importe) }],
  });
  crud($("#com", m), cfgComisiones);
};
const cfgComisiones = {
  tabla: "comisiones", titulo: "Transacciones", orden: "fecha", desc: true, nuevo: { estado: "pendiente", fecha: hoy() },
  campos: [
    { k: "red", l: "Red", t: "select", o: () => (cache["redes*"] || []).map((r) => r.id), req: true }, { k: "ref_red", l: "Referencia en la red", req: true },
    { k: "tienda_id", l: "Tienda (id)", req: true }, { k: "fecha", l: "Fecha", t: "date", req: true },
    { k: "importe_venta", l: "Importe de la venta", t: "number" }, { k: "comision", l: "Comisión (€)", t: "number", req: true },
    { k: "estado", l: "Estado", t: "select", o: ["pendiente", "confirmada", "anulada", "pagada"], req: true },
  ],
  cols: [{ l: "Fecha", v: (f) => fecha(f.fecha) }, { l: "Red", v: (f) => esc(f.red) }, { l: "Tienda", v: (f) => esc(f.tienda_id) }, { l: "Estado", v: (f) => tagEstado(f.estado) }, { l: "Venta", n: 1, v: (f) => eur(f.importe_venta) }, { l: "Comisión", n: 1, v: (f) => eur(f.comision) }],
};
const TAGS = { confirmada: "ok", pagada: "ok", aprobada: "ok", alta: "ok", enviado: "ok", "en curso": "ok", pendiente: "warn", pedida: "warn", revision: "warn", programado: "info", programada: "info", "próxima": "info", anulada: "bad", rechazada: "bad", cancelado: "bad" };
const tagEstado = (e) => `<span class="tag ${TAGS[e] || ""}">${esc(e)}</span>`;

V.afiliados = async (m) => {
  const [redes, clics, comisiones] = await Promise.all([
    cargar("redes", { orden: "nombre" }, true), cargar("clics", { select: "id,tienda_id,creado", desde: haceDias(90), campoFecha: "creado" }), cargar("comisiones"),
  ]);
  const porTienda = (id) => kpis(clics.filter((c) => c.tienda_id === id), comisiones.filter((c) => c.tienda_id === id && c.fecha >= haceDias(90)));
  await cargar("tiendas", {}, true);
  const [syncs, nProductos] = await Promise.all([cargar("sincronizaciones", { orden: "inicio", desc: true }, true), cuenta("productos")]);
  const ult = syncs[0];
  m.innerHTML = `<h2>Afiliados</h2>
    <div class="card"><b>Catálogo automático</b>
      <p class="note">Cada madrugada se comprueba qué tiendas te han aprobado en cada red y se descargan sus productos. Las tiendas nuevas aparecen solas como «aprobada» (marcadas como alta automática).</p>
      ${ult ? `<div class="row">${ult.ok ? `<span class="tag ok">bien</span>` : `<span class="tag bad">con errores</span>`} Última: ${new Date(ult.inicio).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} · ${num(nProductos)} productos en el catálogo</div>` : `<p class="note">Todavía no se ha ejecutado ninguna sincronización.</p>`}
      ${syncs.slice(0, 8).map((x) => `<div class="row"><span class="tag ${x.ok ? "ok" : "bad"}">${esc(x.red)}</span> ${fecha(x.inicio)} · ${num(x.productos)} productos${x.tiendas_nuevas?.length ? ` · nuevas: <b>${esc(x.tiendas_nuevas.join(", "))}</b>` : ""}${x.mensaje ? `<br><span class="note">${esc(x.mensaje).replace(/\n/g, "<br>")}</span>` : ""}</div>`).join("")}
      <p class="note"><a href="/ofertas/" target="_blank" rel="noopener">Ver el buscador de la web ↗</a> · Lanzar a mano: GitHub → Actions → «Catálogo de tiendas» → Run workflow.</p>
    </div>
    <div id="redes"></div><div id="tiendas"></div>
    <p class="note">Clics, ventas, conversión y € por clic de los últimos 90 días. «Cashback» indica si la tienda permite devolver parte a las usuarias (sin comprobar = no se devuelve nada).</p>`;
  crud($("#redes", m), {
    tabla: "redes", titulo: "Redes", clave: "id", orden: "nombre", nuevo: { estado: "pendiente" },
    campos: [{ k: "id", l: "Id (minúsculas)", req: true }, { k: "nombre", l: "Nombre", req: true }, { k: "panel_url", l: "Enlace al panel", t: "url", w: 1 },
      { k: "estado", l: "Estado", t: "select", o: [["pendiente", "pendiente"], ["revision", "en revisión"], ["alta", "dada de alta"], ["rechazada", "rechazada"]], req: true }, { k: "notas", l: "Notas", t: "textarea" }],
    cols: [{ l: "Red", v: (f) => `<b>${esc(f.nombre)}</b>` }, { l: "Estado", v: (f) => tagEstado(f.estado) },
      { l: "Tiendas", n: 1, v: (f) => num((cache["tiendas*"] || []).filter((t) => t.red_id === f.id && t.estado === "aprobada").length) },
      { l: "Comisión 90 d", n: 1, v: (f) => eur(comisiones.filter((c) => c.red === f.id && c.estado !== "anulada" && c.fecha >= haceDias(90)).reduce((s, c) => s + Number(c.comision), 0)) },
      { l: "Panel", v: (f) => (f.panel_url ? `<a href="${esc(f.panel_url)}" target="_blank" rel="noopener">Abrir ↗</a>` : "") }],
  });
  crud($("#tiendas", m), {
    tabla: "tiendas", titulo: "Tiendas", clave: "id", orden: "nombre", nuevo: { estado: "por_pedir" },
    campos: [{ k: "id", l: "Id (el de los enlaces /ir)", req: true }, { k: "nombre", l: "Nombre", req: true },
      { k: "red_id", l: "Red", t: "select", o: () => redes.map((r) => [r.id, r.nombre]) }, { k: "categoria", l: "Categoría" },
      { k: "estado", l: "Estado", t: "select", o: [["por_pedir", "por pedir"], ["pedida", "pedida"], ["aprobada", "aprobada"], ["rechazada", "rechazada"], ["pausada", "pausada"]], req: true },
      { k: "cashback", l: "Permite cashback (comprobado)", t: "bool" }, { k: "comision_texto", l: "Comisión (tal como la da la tienda)", w: 1 },
      { k: "programa_url", l: "Ficha del programa en la red", t: "url", w: 1 }, { k: "web_url", l: "Web de la tienda", t: "url", w: 1 },
      { k: "catalogo", l: "Mostrar su catálogo en la web", t: "bool" }, { k: "max_productos", l: "Máximo de productos", t: "number" },
      { k: "programa_id", l: "Id del programa en la red" }, { k: "notas", l: "Notas", t: "textarea" }],
    cols: [{ l: "Tienda", v: (f) => `<b>${esc(f.nombre)}</b>${f.alta_auto ? ` <span class="tag info">auto</span>` : ""}<br><span class="note">${esc(f.categoria)}${f.sincronizada ? ` · catálogo ${fecha(f.sincronizada)}` : ""}</span>` }, { l: "Red", v: (f) => esc(f.red_id) },
      { l: "Estado", v: (f) => tagEstado(f.estado === "por_pedir" ? "por pedir" : f.estado) }, { l: "Cashback", v: (f) => (f.cashback ? "sí" : f.cashback === false ? "no" : "sin comprobar") },
      { l: "Clics", n: 1, v: (f) => num(porTienda(f.id).clics) }, { l: "Ventas", n: 1, v: (f) => num(porTienda(f.id).ventas) },
      { l: "Conv.", n: 1, v: (f) => porTienda(f.id).conversion + " %" }, { l: "€/clic", n: 1, v: (f) => eur(porTienda(f.id).epc) }, { l: "Comisión", n: 1, v: (f) => eur(porTienda(f.id).comision) },
      { l: "Enlaces", v: (f) => [f.programa_url && `<a href="${esc(f.programa_url)}" target="_blank" rel="noopener">programa ↗</a>`, f.web_url && `<a href="${esc(f.web_url)}" target="_blank" rel="noopener">web ↗</a>`].filter(Boolean).join("<br>") }],
  });
};

// Campañas de temporada para un año (borradores que luego se ajustan).
function campanasDelAnyo(y) {
  const d = (m, dia) => `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const ultimoViernesNov = (() => { const f = new Date(Date.UTC(y, 10, 30)); while (f.getUTCDay() !== 5) f.setUTCDate(f.getUTCDate() - 1); return f.getUTCDate(); })();
  const primerDomMayo = (() => { const f = new Date(Date.UTC(y, 4, 1)); while (f.getUTCDay() !== 0) f.setUTCDate(f.getUTCDate() + 1); return f.getUTCDate(); })();
  return [
    ["Cuesta de enero y rebajas", d(1, 2), d(1, 31), "Revisa tus facturas, ayudas del año y rebajas en su talla", ["moda", "hogar"], true],
    ["San Valentín", d(2, 1), d(2, 14), "Regalos y planes para dos, escapadas", ["regalos", "viajes"], false],
    ["Día del Padre", d(3, 5), d(3, 19), "Regalos y planes", ["regalos"], false],
    ["Renta: deducciones que te tocan", d(4, 8), d(6, 30), "Borrador de la renta y deducciones", [], false],
    ["Día de la Madre", d(4, 20), d(5, primerDomMayo), "Regalos y planes", ["regalos"], false],
    ["Verano y vacaciones", d(6, 1), d(6, 30), "Lo que necesitas para viajar, escapadas, crema solar", ["viajes", "belleza"], false],
    ["Rebajas de verano", d(7, 1), d(7, 31), "Ropa en su talla, armario de verano", ["moda"], true],
    ["Vuelta al cole", d(8, 16), d(9, 15), "Mochilas, ropa y calzado en su talla, ayudas para libros y comedor", ["peques", "moda"], false],
    ["Halloween y cambio de hora", d(10, 15), d(10, 31), "Disfraces y decoración · revisa la tarifa de la luz", ["peques", "hogar"], false],
    ["Black Friday y Cyber Monday", d(11, ultimoViernesNov - 7), d(11, Math.min(30, ultimoViernesNov + 3)), "Chollos comprobados y cómo evitar falsos descuentos", [], true],
    ["Navidad", d(12, 1), d(12, 24), "Lista de regalos por persona, ideas por edad y talla", ["regalos", "peques"], false],
    ["Reyes", d(12, 26), `${y + 1}-01-06`, "Regalos de última hora en su talla y edad", ["regalos", "peques"], false],
  ].map(([nombre, inicio, fin, texto, categorias, solo_rebajado]) => ({ nombre, inicio, fin, texto, titulo: nombre, categorias, solo_rebajado, estado: "borrador" }));
}

V.campanas = async (m) => {
  const [clics, comisiones, envios] = await Promise.all([cargar("clics", { select: "id,tienda_id,creado", desde: haceDias(400), campoFecha: "creado" }), cargar("comisiones"), cargar("envios")]);
  const kc = (c) => {
    const dentro = (f) => f && f.slice(0, 10) >= c.inicio && f.slice(0, 10) <= c.fin;
    const enTienda = (t) => !c.tiendas?.length || c.tiendas.includes(t);
    return kpis(clics.filter((x) => dentro(x.creado) && enTienda(x.tienda_id)), comisiones.filter((x) => dentro(x.fecha) && enTienda(x.tienda_id)));
  };
  m.innerHTML = `<h2>Campañas</h2>
    <div class="aviso">Una campaña <b>programada</b> aparece sola en la web (y en la app) entre su inicio y su fin: tarjeta en portada y colección de ofertas filtrada por sus categorías, palabras y tiendas. En <b>borrador</b> o <b>pausada</b> no se ve.</div>
    <div class="row"><button class="btn sec" id="gen">Crear las campañas de ${new Date().getFullYear() + 1} como borrador</button><span class="note" id="genMsg"></span></div>
    <div id="lista"></div>`;
  $("#gen", m).onclick = async () => {
    const { error } = await sb.from("campanas").insert(campanasDelAnyo(new Date().getFullYear() + 1));
    $("#genMsg").textContent = error ? error.message : "Creadas. Revísalas y prográmalas.";
    limpiar(); crud($("#lista"), cfg);
  };
  const cfg = {
    tabla: "campanas", titulo: "Campañas", orden: "inicio", nuevo: { estado: "borrador", inicio: hoy(), fin: hoy() },
    campos: [{ k: "nombre", l: "Nombre interno", req: true, w: 1 }, { k: "inicio", l: "Empieza", t: "date", req: true }, { k: "fin", l: "Acaba", t: "date", req: true },
      { k: "estado", l: "Estado", t: "select", o: ["borrador", "programada", "pausada"], req: true }, { k: "objetivo_clics", l: "Objetivo de clics", t: "number" },
      { k: "titulo", l: "Titular (web y app)", w: 1 }, { k: "texto", l: "Texto", t: "textarea" }, { k: "imagen", l: "Imagen de portada (URL)", t: "url", w: 1 },
      { k: "categorias", l: "Categorías (separadas por comas)", t: "array", w: 1, ph: "moda, peques, hogar" }, { k: "palabras", l: "Palabras clave", t: "array", w: 1, ph: "disfraz, calabaza" },
      { k: "tiendas", l: "Solo estas tiendas (ids, vacío = todas)", t: "array", w: 1 }, { k: "solo_rebajado", l: "Solo productos rebajados", t: "bool" }],
    cols: [{ l: "Campaña", v: (f) => `<b>${esc(f.nombre)}</b><br><span class="note">${esc(f.titulo)}</span>` }, { l: "Fechas", v: (f) => `${fecha(f.inicio)} → ${fecha(f.fin)}` },
      { l: "Estado", v: (f) => tagEstado(estadoCampana(f)) },
      { l: "Clics", n: 1, v: (f) => `${num(kc(f).clics)}${f.objetivo_clics ? ` / ${num(f.objetivo_clics)}` : ""}` }, { l: "Ventas", n: 1, v: (f) => num(kc(f).ventas) },
      { l: "Conv.", n: 1, v: (f) => kc(f).conversion + " %" }, { l: "Comisión", n: 1, v: (f) => eur(kc(f).comision) },
      { l: "Avisos", n: 1, v: (f) => num(envios.filter((e) => e.campana_id === f.id).length) }],
  };
  crud($("#lista", m), cfg);
};

const PUBLICOS = [["todas", "Todas"], ["lista_espera", "Lista de espera"], ["sola", "Viven solas"], ["pareja", "En pareja"], ["peques", "Con peques"], ["compartido", "Piso compartido"], ["sin_actividad_30d", "Sin entrar en 30 días"]];
V.envios = async (m) => {
  const campanas = await cargar("campanas", { orden: "inicio" });
  const pct = (a, b) => (b ? Math.round((a || 0) / b * 1000) / 10 + " %" : "—");
  m.innerHTML = `<h2>Push y correo</h2>
    <div class="aviso">Aquí se preparan y programan los avisos. El envío automático se conecta cuando la app tenga cuentas (push) y elijamos el servicio de correo; hasta entonces, apunta a mano los resultados de lo que envíes.</div>
    <div id="push"></div><div id="mail"></div>`;
  const base = (canal, titulo) => ({
    tabla: "envios", titulo, orden: "programado", desc: true, filtrar: (f) => f.canal === canal, nuevo: { canal, estado: "borrador", publico: "todas" },
    campos: [{ k: "canal", l: "Canal", t: "select", o: [["push", "Push (app)"], ["email", "Correo"]], req: true },
      { k: "estado", l: "Estado", t: "select", o: ["borrador", "programado", "enviado", "cancelado"], req: true },
      { k: "asunto", l: canal === "push" ? "Título" : "Asunto", req: true, w: 1 }, { k: "texto", l: "Texto", t: "textarea", req: true },
      { k: "enlace", l: "Abre (enlace o pantalla)", w: 1, ph: "/ofertas/black-friday" },
      { k: "campana_id", l: "Campaña", t: "select", o: () => campanas.map((c) => [c.id, c.nombre]) }, { k: "publico", l: "Para quién", t: "select", o: PUBLICOS, req: true },
      { k: "programado", l: "Cuándo", t: "datetime" }, { k: "enviados", l: "Enviados", t: "number" }, { k: "abiertos", l: "Abiertos", t: "number" }, { k: "clics", l: "Clics", t: "number" }, { k: "bajas", l: "Bajas", t: "number" }],
    cols: [{ l: "Cuándo", v: (f) => (f.programado ? new Date(f.programado).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "sin fecha") },
      { l: titulo === "Correos" ? "Asunto" : "Título", v: (f) => `<b>${esc(f.asunto)}</b><br><span class="note">${esc((PUBLICOS.find((p) => p[0] === f.publico) || [, f.publico])[1])}</span>` },
      { l: "Estado", v: (f) => tagEstado(f.estado) }, { l: "Enviados", n: 1, v: (f) => num(f.enviados) },
      { l: "Apertura", n: 1, v: (f) => pct(f.abiertos, f.enviados) }, { l: "Clics", n: 1, v: (f) => pct(f.clics, f.enviados) }, { l: "Bajas", n: 1, v: (f) => pct(f.bajas, f.enviados) }],
  });
  crud($("#push", m), base("push", "Avisos push"));
  crud($("#mail", m), base("email", "Correos"));
};

V.usuarias = async (m) => {
  const [lista, invit, personas] = await Promise.all([
    cargar("lista_espera", { orden: "consentimiento", desc: true }), cargar("invitaciones"), cargar("personas", { select: "hogar_id,es_peque" }),
  ]);
  const hogares = await cuenta("hogares"), cuentas = await cuenta("cuentas");
  const porOrigen = Object.entries(lista.reduce((a, x) => ((a[x.origen || "web"] = (a[x.origen || "web"] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const porProv = Object.entries(lista.filter((x) => x.codigo_postal).reduce((a, x) => ((a[x.codigo_postal.slice(0, 2)] = (a[x.codigo_postal.slice(0, 2)] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const conPeques = new Set(personas.filter((p) => p.es_peque).map((p) => p.hogar_id)).size;
  const invitadoras = Object.entries(invit.reduce((a, x) => ((a[x.hogar_invita] = (a[x.hogar_invita] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
  m.innerHTML = `<h2>Usuarias</h2>
    <div class="grid">${kpi("Lista de espera", num(lista.length))}${kpi("Casas con cuenta", num(hogares), `${num(cuentas)} personas con acceso`)}
      ${kpi("Casas con peques", num(conPeques))}${kpi("Invitaciones", num(invit.length), `${num(invit.filter((i) => i.activada).length)} activadas`)}</div>
    <div class="split" style="margin-top:16px">
      <div class="card"><b>De dónde vienen</b>${porOrigen.map(([o, n]) => `<div class="row"><span class="tag lav">${esc(o)}</span> ${num(n)}</div>`).join("") || `<p class="note">Sin datos.</p>`}</div>
      <div class="card"><b>Provincias (por código postal)</b>${porProv.map(([p, n]) => `<div class="row"><span class="tag info">${esc(p)}</span> ${num(n)}</div>`).join("") || `<p class="note">Sin datos.</p>`}</div>
    </div>
    <h3>Quién invita más</h3>
    <div class="card">${invitadoras.length ? invitadoras.map(([h, n]) => `<div class="row"><code>${esc(h.slice(0, 8))}</code> ${num(n)} invitaciones ${n >= 10 ? `<span class="tag bad">revisar</span>` : ""}</div>`).join("") : `<p class="note">Aún no hay invitaciones.</p>`}
      <p class="note">Más de 10 invitaciones de una misma casa en poco tiempo puede ser fraude (cuentas falsas). Los premios se pueden anular en Reembolsos.</p></div>
    <h3>Lista de espera</h3>
    <div class="row"><input id="busca" placeholder="Buscar correo…" style="max-width:320px"><button class="btn sec" id="csvL">Descargar CSV</button></div>
    <div class="tw"><table><thead><tr><th>Correo</th><th>CP</th><th>Origen</th><th>Fecha</th></tr></thead><tbody id="tl"></tbody></table></div>`;
  const pinta = (q = "") => ($("#tl").innerHTML = lista.filter((x) => x.email.includes(q.toLowerCase())).slice(0, 300)
    .map((x) => `<tr><td>${esc(x.email)}</td><td>${esc(x.codigo_postal)}</td><td>${esc(x.origen)}</td><td>${fecha(x.consentimiento)}</td></tr>`).join("") || `<tr><td colspan="4" class="vacio">Nadie todavía.</td></tr>`);
  pinta();
  $("#busca").oninput = (e) => pinta(e.target.value);
  $("#csvL").onclick = () => {
    const csv = "email;codigo_postal;origen;fecha\n" + lista.map((x) => [x.email, x.codigo_postal || "", x.origen || "", x.consentimiento].join(";")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `lista-espera-${hoy()}.csv` });
    a.click();
  };
};

V.reembolsos = async (m) => {
  const movs = await cargar("movimientos", { orden: "creado", desc: true }, true);
  const s = (f) => movs.filter(f).reduce((t, x) => t + Number(x.importe), 0);
  const deuda = s((x) => x.tipo !== "retirada" && x.estado === "confirmada") - s((x) => x.tipo === "retirada" && x.estado === "confirmada");
  const retiradas = movs.filter((x) => x.tipo === "retirada" && x.estado === "pendiente");
  m.innerHTML = `<h2>Reembolsos</h2>
    <div class="grid">${kpi("Saldo de usuarias", eur(deuda), "confirmado y aún no retirado")}${kpi("Pendiente de confirmar", eur(s((x) => x.tipo !== "retirada" && x.estado === "pendiente")), "hasta que la tienda confirme")}
      ${kpi("Retiradas por pagar", num(retiradas.length), eur(retiradas.reduce((t, x) => t + Number(x.importe), 0)))}</div>
    <div class="aviso">El saldo de usuarias es dinero que les debes: tenlo siempre apartado. Retirada mínima: 10 €.</div>
    <h3>Retiradas por pagar</h3>
    <div class="tw"><table><thead><tr><th>Fecha</th><th>Casa</th><th class="n">Importe</th><th>Concepto</th><th></th></tr></thead><tbody>
    ${retiradas.map((x) => `<tr><td>${fecha(x.creado)}</td><td><code>${esc(x.hogar_id.slice(0, 8))}</code></td><td class="n">${eur(x.importe)}</td><td>${esc(x.concepto)}</td>
      <td><button class="btn" data-pagar="${x.id}">Marcar pagada</button></td></tr>`).join("") || `<tr><td colspan="5" class="vacio">No hay retiradas pendientes.</td></tr>`}
    </tbody></table></div>
    <h3>Últimos movimientos</h3>
    <div class="tw"><table><thead><tr><th>Fecha</th><th>Casa</th><th>Tipo</th><th>Estado</th><th class="n">Importe</th><th></th></tr></thead><tbody>
    ${movs.slice(0, 100).map((x) => `<tr><td>${fecha(x.creado)}</td><td><code>${esc(x.hogar_id.slice(0, 8))}</code></td><td>${esc(x.tipo)}</td><td>${tagEstado(x.estado)}</td><td class="n">${eur(x.importe)}</td>
      <td>${x.tipo === "premio" && x.estado !== "anulada" ? `<button class="btn sec" data-anular="${x.id}">Anular</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6" class="vacio">Sin movimientos todavía.</td></tr>`}
    </tbody></table></div>`;
  const cambia = async (id, estado, pregunta) => {
    if (!confirm(pregunta)) return;
    const { error } = await sb.from("movimientos").update({ estado }).eq("id", id);
    if (error) return alert(error.message);
    limpiar(); V.reembolsos(m);
  };
  m.querySelectorAll("[data-pagar]").forEach((b) => (b.onclick = () => cambia(b.dataset.pagar, "confirmada", "¿Ya has hecho la transferencia?")));
  m.querySelectorAll("[data-anular]").forEach((b) => (b.onclick = () => cambia(b.dataset.anular, "anulada", "¿Anular este premio por invitación?")));
};

V.catalogo = async (m) => {
  const [campanas, tiendas] = await Promise.all([cargar("campanas", { orden: "inicio" }), cargar("tiendas", { orden: "nombre" })]);
  m.innerHTML = `<h2>Catálogo y ayudas</h2><div id="of"></div><div id="ay"></div>`;
  crud($("#of", m), {
    tabla: "ofertas", titulo: "Fichas de oferta", orden: "comprobada", desc: true, nuevo: { activa: true, comprobada: hoy() },
    campos: [{ k: "titulo", l: "Producto", req: true, w: 1 }, { k: "tienda_id", l: "Tienda", t: "select", o: () => tiendas.map((t) => [t.id, t.nombre]) },
      { k: "categoria", l: "Categoría" }, { k: "url", l: "Enlace al producto", t: "url", req: true, w: 1 }, { k: "imagen", l: "Imagen (URL)", t: "url", w: 1 },
      { k: "precio", l: "Precio ahora (€)", t: "number" }, { k: "precio_min_30d", l: "Precio más bajo 30 días antes (€)", t: "number" },
      { k: "campana_id", l: "Campaña", t: "select", o: () => campanas.map((c) => [c.id, c.nombre]) }, { k: "caduca", l: "Caduca", t: "date" },
      { k: "comprobada", l: "Comprobada el", t: "date" }, { k: "activa", l: "Visible", t: "bool" }],
    cols: [{ l: "Producto", v: (f) => `<b>${esc(f.titulo)}</b><br><span class="note">${esc(f.tienda_id)} · ${esc(f.categoria)}</span>` },
      { l: "Precio", n: 1, v: (f) => eur(f.precio) }, { l: "Descuento real", n: 1, v: (f) => { const d = descuentoReal(f.precio, f.precio_min_30d); return d ? `-${d} %` : "—"; } },
      { l: "Campaña", v: (f) => esc((campanas.find((c) => c.id === f.campana_id) || {}).nombre) },
      { l: "Estado", v: (f) => (!f.activa ? tagEstado("oculta") : f.caduca && f.caduca < hoy() ? `<span class="tag bad">caducada</span>` : `<span class="tag ok">visible</span>`) },
      { l: "Comprobada", v: (f) => fecha(f.comprobada) }, { l: "", v: (f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">ver ↗</a>` }],
  });
  crud($("#ay", m), {
    tabla: "ayudas", titulo: "Ayudas, bonos y deducciones", orden: "plazo_fin", nuevo: { activa: true, ambito: "estatal", revisada: hoy() },
    campos: [{ k: "nombre", l: "Nombre", req: true, w: 1 }, { k: "ambito", l: "Ámbito (estatal o comunidad)", req: true }, { k: "cuantia", l: "Cuantía" },
      { k: "para", l: "Para quién", w: 1 }, { k: "requisitos", l: "Requisitos", t: "textarea" }, { k: "enlace", l: "Enlace oficial", t: "url", w: 1 },
      { k: "plazo_fin", l: "Plazo hasta", t: "date" }, { k: "revisada", l: "Revisada el", t: "date" }, { k: "activa", l: "Visible", t: "bool" }],
    cols: [{ l: "Ayuda", v: (f) => `<b>${esc(f.nombre)}</b><br><span class="note">${esc(f.para)}</span>` }, { l: "Ámbito", v: (f) => esc(f.ambito) }, { l: "Cuantía", v: (f) => esc(f.cuantia) },
      { l: "Plazo", v: (f) => (f.plazo_fin ? `${fecha(f.plazo_fin)} ${f.plazo_fin < hoy() ? `<span class="tag bad">cerrada</span>` : f.plazo_fin < haceDias(-30) ? `<span class="tag warn">cierra pronto</span>` : ""}` : "abierta") },
      { l: "Revisada", v: (f) => `${fecha(f.revisada)} ${!f.revisada || f.revisada < haceDias(90) ? `<span class="tag warn">revisar</span>` : ""}` },
      { l: "", v: (f) => (f.enlace ? `<a href="${esc(f.enlace)}" target="_blank" rel="noopener">oficial ↗</a>` : "") }],
  });
};

V.calendario = async (m) => {
  m.innerHTML = `<h2>Calendario</h2><div class="aviso">Fechas de impuestos, temas legales, renovaciones y campañas. Las de IVA y pagos fraccionados solo te tocan cuando te des de alta en Hacienda; confírmalas con la gestoría.</div><div id="cal"></div>`;
  crud($("#cal", m), {
    tabla: "calendario", titulo: "Fechas", orden: "fecha", nuevo: { fecha: hoy(), tipo: "fiscal", hecho: false },
    campos: [{ k: "titulo", l: "Qué", req: true, w: 1 }, { k: "fecha", l: "Fecha", t: "date", req: true },
      { k: "tipo", l: "Tipo", t: "select", o: ["fiscal", "legal", "renovacion", "campana", "otro"], req: true }, { k: "notas", l: "Notas", t: "textarea" }, { k: "hecho", l: "Hecho", t: "bool" }],
    cols: [{ l: "Fecha", v: (f) => `${fecha(f.fecha)} ${f.hecho ? `<span class="tag ok">hecho</span>` : f.fecha < hoy() ? `<span class="tag bad">vencida</span>` : f.fecha <= haceDias(-15) ? `<span class="tag warn">pronto</span>` : ""}` },
      { l: "Qué", v: (f) => `<b>${esc(f.titulo)}</b><br><span class="note">${esc(f.notas)}</span>` }, { l: "Tipo", v: (f) => `<span class="tag lav">${esc(f.tipo)}</span>` }],
  });
};

// ---------- Navegación y sesión ----------
async function ir(id) {
  if (!V[id]) id = "resumen";
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.t === id));
  const m = $("#vista");
  m.innerHTML = `<p class="note">Cargando…</p>`;
  await cargar("redes");
  try { await V[id](m); } catch (e) { m.innerHTML = `<p class="err">No se ha podido cargar: ${esc(e.message)}</p>`; console.error(e); }
}

async function arrancar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { $("#login").hidden = false; $("#app").hidden = true; return; }
  const { data: admin } = await sb.rpc("es_admin");
  if (!admin) {
    $("#login").hidden = false; $("#app").hidden = true;
    $("#loginMsg").textContent = `${session.user.email} no tiene acceso al panel.`;
    await sb.auth.signOut();
    return;
  }
  $("#login").hidden = true; $("#app").hidden = false;
  $("#yo").textContent = session.user.email;
  $("#tabs").innerHTML = TABS.map(([id, t]) => `<button role="tab" data-t="${id}">${t}</button>`).join("");
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) ir(b.dataset.t); };
  ir(location.hash.slice(1));
}

$("#enviar").onclick = async () => {
  const email = $("#email").value.trim();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + "/admin/", shouldCreateUser: true } });
  $("#loginMsg").textContent = error ? error.message : "Revisa tu correo y abre el enlace en este mismo navegador.";
};
$("#salir").onclick = async () => { await sb.auth.signOut(); location.hash = ""; arrancar(); };
addEventListener("hashchange", () => { if (!$("#app").hidden) ir(location.hash.slice(1)); });
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN") arrancar(); });
arrancar();
