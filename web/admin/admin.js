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
const kpi = (titulo, valor, sub = "", ir = "") => `<div class="cifra${ir ? " clic" : ""}" ${ir ? `data-ir="${ir}" role="link" tabindex="0"` : ""}><small>${esc(titulo)}</small><div class="v">${valor}</div><div class="s">${sub}</div></div>`;
const cab = (titulo, texto = "", acciones = "") => `<div class="cab"><div><h1>${esc(titulo)}</h1>${texto ? `<p>${texto}</p>` : ""}</div>${acciones ? `<div class="acc">${acciones}</div>` : ""}</div>`;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("ve");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("ve"), 2600);
}
const quitaTags = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

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
    <div class="caja obj"><div class="t"><span>${esc(o.nombre)}</span><span>${o.pct} %</span></div>
    <div class="prog"><i class="${o.pct >= 100 ? "full" : ""}" style="width:${o.pct}%"></i></div>
    <div class="note">${o.falta > 0 ? `Faltan <b>${eur(o.falta)}</b>${o.clave === "marca" ? "" : " al mes"} · meta ${eur(o.meta)}` : "¡Conseguido!"}<br>${esc(o.nota)}</div></div>`).join("")}</div>`;
}

// Tabla editable genérica: buscador, filtros por estado, orden por columna, cambios en línea y diálogo de edición.
// cfg.chips = { k: "estado", o: [[valor, texto], ...] }   cfg.inline = { k: "estado", o: [[valor, texto]], tag: (v) => clase }
async function crud(el, cfg) {
  const { tabla, titulo, campos, cols, orden, desc, nuevo = {}, filtrar, despues, sinAlta, chips, inline, clave = "id", porDefecto } = cfg;
  let filas = await cargar(tabla, { orden, desc }, true);
  if (filtrar) filas = filas.filter(filtrar);
  const columnas = cols || campos.slice(0, 5).map((c) => ({ l: c.l, v: (f) => esc(f[c.k]) }));
  const st = el._st || (el._st = { q: "", chip: porDefecto ?? "", ord: null, dir: 1 });
  el._cfg = cfg;
  el.innerHTML = `<div class="herr"><h3>${esc(titulo)}</h3>
      ${filas.length > 6 ? `<input type="search" placeholder="Buscar…" aria-label="Buscar en ${esc(titulo)}" value="${esc(st.q)}" data-q>` : ""}
      ${sinAlta ? "" : `<button class="btn sec peq" data-nuevo>+ Añadir</button>`}</div>
    ${chips ? `<div class="embudo" role="group" aria-label="Filtrar por ${esc(chips.k)}">${[["", "Todas"], ...chips.o].map(([v, t]) => {
      const n = v === "" ? filas.length : filas.filter((f) => String(f[chips.k]) === v).length;
      return n || v === "" ? `<button class="chip" data-chip="${esc(v)}" aria-pressed="${st.chip === v}">${esc(t)} <span class="c">${n}</span></button>` : "";
    }).join("")}</div>` : ""}
    <div class="tw"><table><thead><tr>${columnas.map((c, i) => `<th class="${c.n ? "n " : ""}${c.l ? "ord" : ""}" data-col="${i}" ${st.ord === i ? `aria-sort="${st.dir > 0 ? "ascending" : "descending"}"` : ""}>${esc(c.l)}</th>`).join("")}</tr></thead><tbody></tbody></table></div>
    <div class="cuenta"></div>`;
  const tbody = el.querySelector("tbody");
  const pinta = () => {
    let vis = filas.map((f, i) => [f, i]);
    if (chips && st.chip !== "") vis = vis.filter(([f]) => String(f[chips.k]) === st.chip);
    if (st.q) { const q = st.q.toLowerCase(); vis = vis.filter(([f]) => JSON.stringify(f).toLowerCase().includes(q)); }
    if (st.ord != null) {
      const c = columnas[st.ord], val = (f) => (c.s ? c.s(f) : quitaTags(c.v(f)));
      vis.sort(([a], [b]) => { const x = val(a), y = val(b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es", { numeric: true })) * st.dir; });
    }
    tbody.innerHTML = vis.length ? vis.map(([f, i]) => `<tr class="clic" data-i="${i}">${columnas.map((c) => `<td class="${c.n ? "n" : ""}">${c.v(f)}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${columnas.length}" class="vacio">${filas.length ? "Nada coincide con el filtro." : "Todavía no hay nada aquí."}</td></tr>`;
    el.querySelector(".cuenta").textContent = filas.length ? `${vis.length} de ${filas.length}` : "";
  };
  pinta();
  el.querySelector("[data-q]")?.addEventListener("input", (e) => { st.q = e.target.value.trim(); pinta(); });
  el.querySelectorAll("[data-chip]").forEach((b) => (b.onclick = () => {
    st.chip = b.dataset.chip; el.querySelectorAll("[data-chip]").forEach((x) => x.setAttribute("aria-pressed", x === b)); pinta();
  }));
  el.querySelectorAll("th.ord").forEach((th) => (th.onclick = () => {
    const i = +th.dataset.col; st.dir = st.ord === i ? -st.dir : 1; st.ord = i;
    el.querySelectorAll("th").forEach((x) => x.removeAttribute("aria-sort")); th.setAttribute("aria-sort", st.dir > 0 ? "ascending" : "descending"); pinta();
  }));
  el.querySelector("[data-nuevo]")?.addEventListener("click", () => editar(cfg, { ...nuevo }, el, false));
  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]");
    if (!tr || e.target.closest("a,button,input,select")) return;
    editar(cfg, filas[+tr.dataset.i], el, true);
  });
  // Cambio rápido (p. ej. estado de una tienda) sin abrir el formulario
  if (inline) tbody.addEventListener("change", async (e) => {
    const sel = e.target.closest("select[data-inline]"); if (!sel) return;
    const f = filas[+sel.closest("tr").dataset.i];
    const { error } = await [].concat(clave).reduce((q, k) => q.eq(k, f[k]), sb.from(tabla).update({ [inline.k]: sel.value }));
    if (error) return toast("No se ha guardado: " + error.message);
    f[inline.k] = sel.value; sel.className = "mini " + (inline.tag?.(sel.value) || "");
    toast("Guardado"); refrescaContadores();
  });
  despues?.(el, filas);
}
const selInline = (inline, v) => `<select class="mini ${inline.tag?.(v) || ""}" data-inline aria-label="Cambiar ${esc(inline.k)}">${inline.o.map(([val, t]) => `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;

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
    <div class="acc-f">${existe ? `<button type="button" class="btn bad" data-borrar>Borrar</button>` : ""}<span style="flex:1"></span>
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
    dlg.close(); limpiar(); crud(el, cfg); toast(existe ? "Cambios guardados" : "Añadido"); refrescaContadores();
  };
  dlg.querySelector("[data-borrar]")?.addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres borrarlo?")) return;
    const { error } = await donde(sb.from(tabla).delete());
    if (error) return ($("#dlgErr").textContent = error.message);
    dlg.close(); limpiar(); crud(el, cfg); toast("Borrado"); refrescaContadores();
  });
}

// ---------- Secciones ----------
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TABS = [
  ["resumen", "Hoy", I('<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')],
  ["dinero", "Dinero y objetivos", I('<circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 1 0 0 5M8 11h5M8 13h5"/>')],
  ["afiliados", "Tiendas y redes", I('<path d="M4 7h16l-1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>')],
  ["catalogo", "Escaparate y ayudas", I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')],
  ["campanas", "Campañas", I('<path d="M4 10v4l12 5V5z"/><path d="M16 9a3 3 0 0 1 0 6"/>')],
  ["envios", "Push y correo", I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')],
  ["usuarias", "Usuarias", I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>')],
  ["reembolsos", "Reembolsos", I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>')],
  ["calendario", "Calendario", I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')],
];
const V = {};

// Qué está esperando a Alba. Lo usan el menú (contadores) y la portada (lista de tareas).
async function pendientes() {
  const hoyS = hoy();
  const [propuestos, retiradas, calVencido, ayudasRev, tiendas, syncs, campanas] = await Promise.all([
    cuenta("productos", (q) => q.eq("curado", "propuesto")),
    cuenta("movimientos", (q) => q.eq("tipo", "retirada").eq("estado", "pendiente")),
    cuenta("calendario", (q) => q.eq("hecho", false).lte("fecha", haceDias(-7))),
    cuenta("ayudas", (q) => q.in("estado", ["pendiente", "revisar"])),
    cargar("tiendas", { select: "id,nombre,estado,cashback,alta_auto,red_id" }, true),
    cargar("sincronizaciones", { orden: "inicio", desc: true }, true),
    cargar("campanas", { orden: "inicio" }),
  ]);
  const aprobadasSinCashback = tiendas.filter((t) => t.estado === "aprobada" && t.cashback == null).length;
  const pedidas = tiendas.filter((t) => t.estado === "pedida").length;
  const ultimaPorRed = Object.values(syncs.reduce((a, x) => (a[x.red] ??= x, a), {}));
  const conError = ultimaPorRed.filter((x) => !x.ok);
  const prox = campanas.find((c) => estadoCampana(c) === "próxima");
  const enCurso = campanas.find((c) => estadoCampana(c) === "en curso");
  return { propuestos, retiradas, calVencido, ayudasRev, aprobadasSinCashback, pedidas, conError, prox, enCurso, tiendas, syncs, hoyS };
}
let P = null;
async function refrescaContadores() {
  P = await pendientes().catch(() => P);
  if (!P) return;
  const badges = { catalogo: P.propuestos + P.ayudasRev, reembolsos: P.retiradas, calendario: P.calVencido, afiliados: P.aprobadasSinCashback + P.conError.length };
  document.querySelectorAll("#tabs button").forEach((b) => {
    const n = badges[b.dataset.t] || 0;
    b.querySelector(".badge")?.remove();
    if (n) b.insertAdjacentHTML("beforeend", `<span class="badge">${n}</span>`);
  });
  $("#act").textContent = "Actualizado a las " + new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const diasHasta = (f) => Math.round((new Date(f + "T12:00:00") - new Date(hoy() + "T12:00:00")) / 864e5);

V.resumen = async (m) => {
  const [aj, lista, comisiones, movimientos, gastos, metricas, clics] = await Promise.all([
    ajustes(), cargar("lista_espera", { select: "id,consentimiento,origen", orden: "consentimiento" }),
    cargar("comisiones"), cargar("movimientos"), cargar("gastos"), cargar("metricas", { orden: "fecha", desc: true }),
    cargar("clics", { select: "id,tienda_id,creado", desde: haceDias(90), campoFecha: "creado" }),
  ]);
  P = await pendientes();
  const hogares = await cuenta("hogares");
  const desde30 = haceDias(30), desde7 = haceDias(7);
  const serie = Array.from({ length: 30 }, (_, i) => { const d = haceDias(29 - i); return { d, v: lista.filter((x) => x.consentimiento.slice(0, 10) === d).length }; });
  const sum = (fuente, campo) => metricas.filter((x) => x.fuente === fuente && x.fecha >= desde30).reduce((s, x) => s + (x[campo] || 0), 0);
  const ym = hoy().slice(0, 7);
  const mes = resumenMes({ comisiones, movimientos, gastos }, ym, aj.reservas);
  const meses = ultimosMeses(new Date(), 12).map((y) => resumenMes({ comisiones, movimientos, gastos }, y, aj.reservas));
  const aprobadas = P.tiendas.filter((t) => t.estado === "aprobada").length;
  const nuevasSemana = lista.filter((x) => x.consentimiento >= desde7).length;

  // La frase de estado
  const trozosFrase = [];
  if (P.enCurso) trozosFrase.push(`<b>${esc(P.enCurso.nombre)}</b> está en marcha hasta el ${fecha(P.enCurso.fin)}`);
  else if (P.prox) { const d = diasHasta(P.prox.inicio); trozosFrase.push(`Faltan <b>${d} ${d === 1 ? "día" : "días"}</b> para ${esc(P.prox.nombre)}`); }
  trozosFrase.push(`tienes <b>${aprobadas} ${aprobadas === 1 ? "tienda aprobada" : "tiendas aprobadas"}</b> y ${P.pedidas} esperando respuesta`);
  trozosFrase.push(mes.confirmada || mes.pendiente ? `este mes llevas <b>${eur(mes.confirmada)}</b> confirmados` : `todavía no hay comisiones este mes`);
  const frase = trozosFrase.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";

  // Lo que toca hacer
  const t = [];
  if (P.conError.length) t.push({ n: P.conError.length, urg: 1, txt: `La carga de ${P.conError.map((x) => x.red).join(", ")} ha fallado`, ir: "afiliados" });
  if (P.retiradas) t.push({ n: P.retiradas, urg: 1, txt: "Retiradas de usuarias por pagar", ir: "reembolsos" });
  if (P.calVencido) t.push({ n: P.calVencido, urg: 1, txt: "Fechas del calendario vencidas o en la próxima semana", ir: "calendario" });
  if (P.aprobadasSinCashback) t.push({ n: P.aprobadasSinCashback, txt: "Tiendas aprobadas: mira si permiten cashback", ir: "afiliados" });
  if (P.propuestos) t.push({ n: P.propuestos, txt: "Productos propuestos para el escaparate", ir: "catalogo" });
  if (P.ayudasRev) t.push({ n: P.ayudasRev, txt: "Ayudas nuevas o por revisar", ir: "catalogo" });
  if (P.prox && diasHasta(P.prox.inicio) <= 21) t.push({ n: diasHasta(P.prox.inicio) + " d", txt: `Prepara ${P.prox.nombre}: chollos y avisos`, ir: "campanas" });

  m.innerHTML = `<section class="hoy">
      <div><p class="fecha">${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p><p class="frase">${frase}</p>
        <div class="cifras">
          ${kpi("Lista de espera", num(lista.length), nuevasSemana ? `+${nuevasSemana} esta semana` : "sin altas esta semana", "usuarias")}
          ${kpi("Disponible del mes", eur(mes.disponible), "ya apartados impuestos y gastos", "dinero")}
        </div></div>
      <div><b>Qué toca hacer</b>
        <ul class="tareas" style="margin-top:10px">${t.length ? t.map((x) => `<li${x.urg ? ` class="urg"` : ""}><button data-ir="${x.ir}"><span class="n">${x.n}</span>${esc(x.txt)}<span class="ir">abrir</span></button></li>`).join("")
          : `<li class="vacia">Nada pendiente. Todo al día.</li>`}</ul></div>
    </section>
    <div class="cifras">
      ${kpi("Visitas web · 30 días", sum("web", "visitas") ? num(sum("web", "visitas")) : "—", sum("web", "visitas") ? `${num(sum("web", "visitantes"))} personas` : "se apuntan abajo, en Métricas")}
      ${kpi("Casas con cuenta en la app", num(hogares), sum("app", "instalaciones") ? `${num(sum("app", "instalaciones"))} instalaciones en 30 días` : "")}
      ${kpi("Clics a tiendas · 30 días", num(clics.filter((c) => c.creado >= desde30).length), "desde la web y la app", "afiliados")}
      ${kpi("Comisión del mes", eur(mes.confirmada), `${eur(mes.pendiente)} pendiente de confirmar`, "dinero")}
      ${kpi("Tiendas aprobadas", num(aprobadas), `${P.pedidas} pedidas`, "afiliados")}
    </div>
    <div class="dos">
      <div class="caja"><b>Altas en la lista de espera · 30 días</b>${spark(serie)}</div>
      <div class="caja"><b>Objetivos</b>${progresoObjetivos(meses, aj.objetivos).map((o) => `
        <div class="obj" style="margin-top:12px"><div class="t"><span>${esc(o.nombre)}</span><span>${o.pct} %</span></div>
        <div class="prog"><i class="${o.pct >= 100 ? "full" : ""}" style="width:${o.pct}%"></i></div></div>`).join("")}
        <p class="note"><a href="#dinero">Ver el detalle</a></p></div>
    </div>
    <details class="caja" style="margin-top:12px"><summary>Métricas que se apuntan a mano</summary><div id="met"></div>
      <p class="note">Las visitas exactas de la web están en Cloudflare → viwai-web → Métricas. Mientras no las conectemos, apunta aquí el total de cada semana.</p></details>`;
  crud($("#met", m), {
    tabla: "metricas", titulo: "Métricas", clave: ["fecha", "fuente"], orden: "fecha", desc: true,
    nuevo: { fecha: hoy(), fuente: "web" },
    campos: [
      { k: "fecha", l: "Fecha", t: "date", req: true }, { k: "fuente", l: "Fuente", t: "select", o: ["web", "app", "instagram", "tiktok", "facebook", "email", "push"], req: true },
      { k: "visitas", l: "Visitas", t: "number" }, { k: "visitantes", l: "Personas", t: "number" }, { k: "instalaciones", l: "Instalaciones", t: "number" },
      { k: "seguidores", l: "Seguidores", t: "number" }, { k: "clics", l: "Clics", t: "number" },
    ],
    cols: [
      { l: "Fecha", v: (f) => fecha(f.fecha), s: (f) => f.fecha }, { l: "Fuente", v: (f) => esc(f.fuente) }, { l: "Visitas", n: 1, v: (f) => num(f.visitas), s: (f) => f.visitas || 0 },
      { l: "Personas", n: 1, v: (f) => num(f.visitantes), s: (f) => f.visitantes || 0 }, { l: "Instal.", n: 1, v: (f) => num(f.instalaciones), s: (f) => f.instalaciones || 0 }, { l: "Seguidores", n: 1, v: (f) => num(f.seguidores), s: (f) => f.seguidores || 0 },
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
  m.innerHTML = `${cab("Dinero y objetivos", "Lo que pagan las tiendas, lo que devuelves a las usuarias y lo que te queda después de apartar impuestos y gastos.")}
    <div class="caja"><b>De cada 100 € que pagan las tiendas (últimos 12 meses)</b>
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
    <form id="fAj" class="caja grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
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
    <div class="caja"><p class="note">Mientras no se importan solas: exporta el informe de transacciones de cada red en CSV y pégalo aquí. Columnas: red, ref_red, tienda_id, importe_venta, comision, estado (pendiente/confirmada/anulada/pagada), fecha (AAAA-MM-DD). Si una transacción ya existe, se actualiza.</p>
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

const ESTADOS_TIENDA = [["por_pedir", "Por pedir"], ["pedida", "Pedida"], ["aprobada", "Aprobada"], ["rechazada", "Rechazada"], ["pausada", "Pausada"]];
const tagTienda = (v) => ({ aprobada: "ok", pedida: "warn", rechazada: "bad", pausada: "", por_pedir: "lav" }[v] || "");
V.afiliados = async (m) => {
  const [redes, clics, comisiones] = await Promise.all([
    cargar("redes", { orden: "nombre" }, true), cargar("clics", { select: "id,tienda_id,creado", desde: haceDias(90), campoFecha: "creado" }), cargar("comisiones"),
  ]);
  const porTienda = (id) => kpis(clics.filter((c) => c.tienda_id === id), comisiones.filter((c) => c.tienda_id === id && c.fecha >= haceDias(90)));
  const tiendas = await cargar("tiendas", {}, true);
  const [syncs, nProductos] = await Promise.all([cargar("sincronizaciones", { orden: "inicio", desc: true }, true), cuenta("productos")]);
  const ultimas = Object.values(syncs.reduce((a, x) => (a[x.red] ??= x, a), {}));
  const fallan = ultimas.filter((x) => !x.ok);
  const ult = syncs[0];
  const n = (e) => tiendas.filter((t) => t.estado === e).length;
  m.innerHTML = `${cab("Tiendas y redes", "Cada noche se comprueba en cada red qué tiendas te aprueban, cuáles siguen pendientes y qué comisiones hay. Lo nuevo entra solo.",
      `<a class="btn sec" href="/ofertas/" target="_blank" rel="noopener">Ver el buscador</a>`)}
    <div class="cifras">
      ${kpi("Aprobadas", num(n("aprobada")), "venden ya en Viwai")}${kpi("Esperando respuesta", num(n("pedida")), "solicitudes enviadas")}
      ${kpi("Rechazadas", num(n("rechazada")), "se pueden volver a pedir")}${kpi("Productos en el catálogo", num(nProductos), ult ? "carga del " + fecha(ult.inicio) : "")}
    </div>
    ${fallan.length ? `<div class="aviso" style="background:var(--badbg)"><b>La última carga ha fallado en ${fallan.map((x) => esc(x.red)).join(", ")}.</b><br>${fallan.map((x) => esc(x.mensaje || "")).join("<br>")}</div>` : ""}
    <div id="tiendas"></div>
    <div id="redes"></div>
    <details class="caja" style="margin-top:12px"><summary>Historial de cargas</summary>
      ${syncs.slice(0, 12).map((x) => `<div class="row"><span class="tag ${x.ok ? "ok" : "bad"}">${esc(x.red)}</span> ${new Date(x.inicio).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} · ${num(x.productos)} productos${x.tiendas_nuevas?.length ? ` · nuevas: <b>${esc(x.tiendas_nuevas.join(", "))}</b>` : ""}${x.mensaje ? `<br><span class="note">${esc(x.mensaje).replace(/\n/g, "<br>")}</span>` : ""}</div>`).join("") || `<p class="note">Todavía no se ha ejecutado ninguna carga.</p>`}
      <p class="note">Para lanzarla a mano: GitHub → Actions → «Catálogo de tiendas» → Run workflow.</p></details>`;
  const inline = { k: "estado", o: ESTADOS_TIENDA, tag: tagTienda };
  crud($("#tiendas", m), {
    tabla: "tiendas", titulo: "Tiendas", clave: "id", orden: "nombre", nuevo: { estado: "por_pedir" },
    chips: { k: "estado", o: ESTADOS_TIENDA }, inline,
    campos: [{ k: "id", l: "Id (el de los enlaces /ir)", req: true }, { k: "nombre", l: "Nombre", req: true },
      { k: "red_id", l: "Red", t: "select", o: () => redes.map((r) => [r.id, r.nombre]) }, { k: "categoria", l: "Categoría" },
      { k: "estado", l: "Estado", t: "select", o: ESTADOS_TIENDA, req: true },
      { k: "cashback", l: "Permite cashback (comprobado)", t: "bool" }, { k: "comision_texto", l: "Comisión (tal como la da la tienda)", w: 1 },
      { k: "programa_url", l: "Ficha del programa en la red", t: "url", w: 1 }, { k: "web_url", l: "Web de la tienda", t: "url", w: 1 },
      { k: "catalogo", l: "Mostrar su catálogo en la web", t: "bool" }, { k: "escaparate", l: "Solo lo que yo apruebe (escaparate)", t: "bool" }, { k: "max_productos", l: "Máximo de productos", t: "number" },
      { k: "programa_id", l: "Id del programa en la red" }, { k: "notas", l: "Notas", t: "textarea" }],
    cols: [{ l: "Tienda", v: (f) => `<b>${esc(f.nombre)}</b>${f.alta_auto ? ` <span class="tag info">auto</span>` : ""}${f.sincronizada ? `<br><span class="note">catálogo ${fecha(f.sincronizada)}</span>` : ""}`, s: (f) => f.nombre.toLowerCase() },
      { l: "Red", v: (f) => esc(f.red_id) },
      { l: "Estado", v: (f) => selInline(inline, f.estado), s: (f) => f.estado },
      { l: "Cashback", v: (f) => (f.cashback ? `<span class="tag ok">sí</span>` : f.cashback === false ? `<span class="tag">no</span>` : f.estado === "aprobada" ? `<span class="tag warn">comprobar</span>` : ""), s: (f) => String(f.cashback) },
      { l: "Clics", n: 1, v: (f) => num(porTienda(f.id).clics), s: (f) => porTienda(f.id).clics }, { l: "Ventas", n: 1, v: (f) => num(porTienda(f.id).ventas), s: (f) => porTienda(f.id).ventas },
      { l: "€/clic", n: 1, v: (f) => eur(porTienda(f.id).epc), s: (f) => porTienda(f.id).epc }, { l: "Comisión", n: 1, v: (f) => eur(porTienda(f.id).comision), s: (f) => porTienda(f.id).comision },
      { l: "", v: (f) => [f.programa_url && `<a href="${esc(f.programa_url)}" target="_blank" rel="noopener">programa</a>`, f.web_url && `<a href="${esc(f.web_url)}" target="_blank" rel="noopener">web</a>`].filter(Boolean).join(" · ") }],
  });
  crud($("#redes", m), {
    tabla: "redes", titulo: "Redes de afiliación", clave: "id", orden: "nombre", nuevo: { estado: "pendiente" },
    campos: [{ k: "id", l: "Id (minúsculas)", req: true }, { k: "nombre", l: "Nombre", req: true }, { k: "panel_url", l: "Enlace al panel", t: "url", w: 1 },
      { k: "estado", l: "Estado", t: "select", o: [["pendiente", "pendiente"], ["revision", "en revisión"], ["alta", "dada de alta"], ["rechazada", "rechazada"]], req: true }, { k: "notas", l: "Notas", t: "textarea" }],
    cols: [{ l: "Red", v: (f) => `<b>${esc(f.nombre)}</b>${f.notas ? `<br><span class="note">${esc(f.notas.slice(0, 90))}</span>` : ""}`, s: (f) => f.nombre },
      { l: "Estado", v: (f) => tagEstado(f.estado) },
      { l: "Aprobadas", n: 1, v: (f) => num(tiendas.filter((t) => t.red_id === f.id && t.estado === "aprobada").length), s: (f) => tiendas.filter((t) => t.red_id === f.id && t.estado === "aprobada").length },
      { l: "Pedidas", n: 1, v: (f) => num(tiendas.filter((t) => t.red_id === f.id && t.estado === "pedida").length), s: (f) => tiendas.filter((t) => t.red_id === f.id && t.estado === "pedida").length },
      { l: "Comisión 90 d", n: 1, v: (f) => eur(comisiones.filter((c) => c.red === f.id && c.estado !== "anulada" && c.fecha >= haceDias(90)).reduce((s, c) => s + Number(c.comision), 0)) },
      { l: "", v: (f) => (f.panel_url ? `<a href="${esc(f.panel_url)}" target="_blank" rel="noopener">Abrir panel</a>` : "") }],
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
  m.innerHTML = `${cab("Campañas", "Una campaña programada sale sola en la web y en la app entre su inicio y su fin.")}
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
  m.innerHTML = `${cab("Push y correo", "Prepara y programa los avisos. El envío automático se conecta cuando la app esté publicada; mientras, apunta a mano los resultados.")}
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
  m.innerHTML = `${cab("Usuarias", "Quién se apunta, desde dónde y quién invita a más gente.")}
    <div class="cifras">${kpi("Lista de espera", num(lista.length))}${kpi("Casas con cuenta", num(hogares), `${num(cuentas)} personas con acceso`)}
      ${kpi("Casas con peques", num(conPeques))}${kpi("Invitaciones", num(invit.length), `${num(invit.filter((i) => i.activada).length)} activadas`)}</div>
    <div class="dos">
      <div class="caja"><b>De dónde vienen</b>${porOrigen.map(([o, n]) => `<div class="row"><span class="tag lav">${esc(o)}</span> ${num(n)}</div>`).join("") || `<p class="note">Sin datos.</p>`}</div>
      <div class="caja"><b>Provincias (por código postal)</b>${porProv.map(([p, n]) => `<div class="row"><span class="tag info">${esc(p)}</span> ${num(n)}</div>`).join("") || `<p class="note">Sin datos.</p>`}</div>
    </div>
    <h3>Quién invita más</h3>
    <div class="caja">${invitadoras.length ? invitadoras.map(([h, n]) => `<div class="row"><code>${esc(h.slice(0, 8))}</code> ${num(n)} invitaciones ${n >= 10 ? `<span class="tag bad">revisar</span>` : ""}</div>`).join("") : `<p class="note">Aún no hay invitaciones.</p>`}
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
  m.innerHTML = `${cab("Reembolsos", "El dinero que les devuelves a las usuarias. Su saldo es suyo: tenlo siempre apartado.")}
    <div class="cifras">${kpi("Saldo de usuarias", eur(deuda), "confirmado y aún no retirado")}${kpi("Pendiente de confirmar", eur(s((x) => x.tipo !== "retirada" && x.estado === "pendiente")), "hasta que la tienda confirme")}
      ${kpi("Retiradas por pagar", num(retiradas.length), eur(retiradas.reduce((t, x) => t + Number(x.importe), 0)))}</div>
    <p class="note">Retirada mínima: 10 €.</p>
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
  m.innerHTML = `${cab("Escaparate y ayudas", "Qué productos salen en el buscador de la web, fichas de oferta para campañas y las ayudas que ve cada casa.")}<div id="esc"></div><div id="of"></div><div id="ay"></div>`;
  escaparate($("#esc", m), tiendas);
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

// ---------- Escaparate: qué productos salen en el buscador de la web ----------
const CATS = [["hogar", "Hogar y deco"], ["cocina", "Cocina"], ["electrodomesticos", "Electrodomésticos"], ["tecnologia", "Tecnología"],
  ["belleza", "Belleza y cuidado"], ["moda", "Moda"], ["peques", "Peques"], ["mascotas", "Mascotas"], ["deporte", "Deporte"],
  ["alimentacion", "Súper y alimentación"], ["viajes", "Viajes y planes"], ["otros", "Otros"]];
const POR_PAGINA = 48;
function escaparate(el, tiendas) {
  const conCatalogo = tiendas.filter((t) => t.catalogo || t.escaparate);
  const st = { tienda: (conCatalogo.find((t) => t.escaparate) || conCatalogo[0] || {}).id || "", estado: "propuesto", q: "", pag: 0 };
  el.innerHTML = `<h3>Escaparate</h3>
    <p class="note">Decides qué productos salen en <a href="https://www.viwai.es/ofertas/" target="_blank" rel="noopener">viwai.es/ofertas</a>.
    En las tiendas marcadas como «solo escaparate» solo sale lo aprobado; en las demás sale todo lo que pasa el filtro automático, menos lo descartado.
    «Propuestos» son los que he elegido yo, ya con título en español.</p>
    <div class="filtros" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <select id="e-t" aria-label="Tienda">${conCatalogo.map((t) => `<option value="${esc(t.id)}">${esc(t.nombre)}${t.escaparate ? " · solo escaparate" : ""}</option>`).join("")}</select>
      <select id="e-e" aria-label="Estado"><option value="propuesto">Propuestos por Claude</option><option value="sin">Sin revisar (pasan el filtro)</option>
        <option value="aprobado">Aprobados (se ven)</option><option value="descartado">Descartados</option><option value="todos">Todos</option></select>
      <input id="e-q" type="search" placeholder="Buscar en el título" aria-label="Buscar">
    </div><div id="e-n" class="note"></div><div id="e-l" class="grid esc"></div>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sec" id="e-ant">← Anteriores</button><button class="btn sec" id="e-sig">Siguientes →</button></div>`;
  $("#e-t", el).value = st.tienda; $("#e-e", el).value = st.estado;
  const pinta = async () => {
    let q = sb.from("productos").select("id,titulo,titulo_es,categoria,categoria_fija,precio,imagen,url,curado,destacado,filtro_ok", { count: "exact" }).eq("tienda_id", st.tienda);
    if (st.estado === "sin") q = q.is("curado", null).eq("filtro_ok", true);
    else if (st.estado !== "todos") q = q.eq("curado", st.estado);
    if (st.q) q = q.or(`titulo.ilike.%${st.q.replace(/[,()%]/g, " ")}%,titulo_es.ilike.%${st.q.replace(/[,()%]/g, " ")}%`);
    const { data, count, error } = await q.order("destacado", { ascending: false }).order("precio", { ascending: false }).range(st.pag * POR_PAGINA, st.pag * POR_PAGINA + POR_PAGINA - 1);
    if (error) { $("#e-l", el).innerHTML = `<p class="err">${esc(error.message)}</p>`; return; }
    $("#e-n", el).textContent = `${num(count)} productos · página ${st.pag + 1} de ${Math.max(1, Math.ceil(count / POR_PAGINA))}`;
    $("#e-ant", el).disabled = st.pag === 0; $("#e-sig", el).disabled = (st.pag + 1) * POR_PAGINA >= count;
    $("#e-l", el).innerHTML = (data || []).map((p) => `<div class="caja prod" data-id="${esc(p.id)}">
      ${p.imagen ? `<img src="${esc(p.imagen)}" alt="" loading="lazy">` : ""}
      <div class="note" title="${esc(p.titulo)}">${esc(p.titulo.slice(0, 90))}</div>
      <input class="t-es" value="${esc(p.titulo_es || "")}" placeholder="Título en español" aria-label="Título en español">
      <select class="cat" aria-label="Categoría">${CATS.map(([k, n]) => `<option value="${k}" ${(p.categoria_fija || p.categoria) === k ? "selected" : ""}>${n}</option>`).join("")}</select>
      <div class="fila"><b>${eur(p.precio)}</b> <a href="${esc(p.url)}" target="_blank" rel="noopener">ver ↗</a> ${p.curado ? `<span class="tag ${p.curado === "aprobado" ? "ok" : p.curado === "descartado" ? "bad" : "lav"}">${p.curado}</span>` : ""}</div>
      <div class="fila"><button class="btn" data-a="aprobado">Aprobar</button><button class="btn sec" data-a="descartado">Descartar</button>
        <button class="btn sec" data-a="destacado" aria-pressed="${p.destacado}" title="Sale primero">${p.destacado ? "★" : "☆"}</button></div></div>`).join("")
      || `<p class="vacio">No hay productos en este apartado.</p>`;
  };
  el.onclick = async (e) => {
    const b = e.target.closest("button[data-a]");
    if (b) {
      const c = b.closest(".prod"), id = c.dataset.id, a = b.dataset.a;
      const datos = { titulo_es: c.querySelector(".t-es").value.trim() || null, categoria_fija: c.querySelector(".cat").value };
      if (a === "destacado") datos.destacado = b.getAttribute("aria-pressed") !== "true";
      else datos.curado = a;
      if (a === "aprobado" && !datos.titulo_es && !confirm("No tiene título en español. ¿Aprobarlo con el título de la tienda?")) return;
      const { error } = await sb.from("productos").update(datos).eq("id", id);
      if (error) return alert(error.message);
      if (a === "destacado") { b.setAttribute("aria-pressed", datos.destacado); b.textContent = datos.destacado ? "★" : "☆"; }
      else if (st.estado !== "todos" && st.estado !== a) c.remove();
      else pinta();
      return;
    }
    if (e.target.id === "e-ant") { st.pag--; pinta(); }
    if (e.target.id === "e-sig") { st.pag++; pinta(); }
  };
  $("#e-t", el).onchange = (e) => { st.tienda = e.target.value; st.pag = 0; pinta(); };
  $("#e-e", el).onchange = (e) => { st.estado = e.target.value; st.pag = 0; pinta(); };
  let tq; $("#e-q", el).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value.trim(); st.pag = 0; pinta(); }, 300); };
  pinta();
}

V.calendario = async (m) => {
  m.innerHTML = `${cab("Calendario", "Impuestos, temas legales, renovaciones y campañas. Las de IVA y pagos fraccionados solo te tocan cuando te des de alta en Hacienda; confírmalas con la gestoría.")}<div id="cal"></div>`;
  crud($("#cal", m), {
    tabla: "calendario", titulo: "Fechas", orden: "fecha", nuevo: { fecha: hoy(), tipo: "fiscal", hecho: false },
    campos: [{ k: "titulo", l: "Qué", req: true, w: 1 }, { k: "fecha", l: "Fecha", t: "date", req: true },
      { k: "tipo", l: "Tipo", t: "select", o: ["fiscal", "legal", "renovacion", "campana", "otro"], req: true }, { k: "notas", l: "Notas", t: "textarea" }, { k: "hecho", l: "Hecho", t: "bool" }],
    cols: [{ l: "Fecha", v: (f) => `${fecha(f.fecha)} ${f.hecho ? `<span class="tag ok">hecho</span>` : f.fecha < hoy() ? `<span class="tag bad">vencida</span>` : f.fecha <= haceDias(-15) ? `<span class="tag warn">pronto</span>` : ""}` },
      { l: "Qué", v: (f) => `<b>${esc(f.titulo)}</b><br><span class="note">${esc(f.notas)}</span>` }, { l: "Tipo", v: (f) => `<span class="tag lav">${esc(f.tipo)}</span>` }],
  });
};

// ---------- Navegación, buscador ⌘K y sesión ----------
async function ir(id) {
  if (!V[id]) id = "resumen";
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  document.querySelectorAll("#tabs button").forEach((b) => (b.dataset.t === id ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  const m = $("#vista");
  m.innerHTML = `<p class="cargando">Cargando…</p>`;
  await cargar("redes");
  try { await V[id](m); } catch (e) { m.innerHTML = `<p class="err">No se ha podido cargar: ${esc(e.message)}</p>`; console.error(e); }
  m.focus?.();
}
// Cifras y tareas que llevan a otra sección
document.addEventListener("click", (e) => { const x = e.target.closest("[data-ir]"); if (x) ir(x.dataset.ir); });
document.addEventListener("keydown", (e) => {
  const x = e.target.closest?.("[data-ir][role=link]"); if (x && e.key === "Enter") ir(x.dataset.ir);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !$("#app").hidden) { e.preventDefault(); abrePaleta(); }
});

async function abrePaleta() {
  const dlg = $("#paleta"), inp = $("#pq"), ul = $("#pl");
  const tiendas = await cargar("tiendas", { select: "id,nombre,estado,red_id" });
  const base = TABS.map(([id, t]) => ({ t, sub: "sección", go: () => ir(id) }));
  let sel = 0, res = base;
  const pinta = () => {
    const q = inp.value.trim().toLowerCase();
    res = q ? [...base.filter((x) => x.t.toLowerCase().includes(q)),
      ...tiendas.filter((t) => t.nombre.toLowerCase().includes(q)).slice(0, 12).map((t) => ({ t: t.nombre, sub: `${t.red_id || ""} · ${t.estado.replace("_", " ")}`,
        go: async () => { await ir("afiliados"); const box = $("#tiendas"); if (box) { box._st.q = t.nombre; crud(box, box._cfg); } } }))] : base;
    sel = Math.min(sel, res.length - 1);
    ul.innerHTML = res.map((x, i) => `<li><button role="option" data-i="${i}" aria-selected="${i === sel}">${esc(x.t)}<span>${esc(x.sub)}</span></button></li>`).join("") || `<li class="vacio">Nada con ese nombre.</li>`;
  };
  const elegir = (i) => { dlg.close(); res[i]?.go(); };
  inp.value = ""; pinta(); dlg.showModal(); inp.focus();
  inp.oninput = () => { sel = 0; pinta(); };
  inp.onkeydown = (e) => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, res.length - 1); pinta(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); pinta(); e.preventDefault(); }
    if (e.key === "Enter") elegir(sel);
  };
  ul.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) elegir(+b.dataset.i); };
  dlg.onclick = (e) => { if (e.target === dlg) dlg.close(); };
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
  $("#tabs").innerHTML = TABS.map(([id, t, ic]) => `<button data-t="${id}">${ic}<span>${t}</span></button>`).join("");
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) ir(b.dataset.t); };
  $("#abrirPaleta").onclick = abrePaleta;
  $("#refrescar").onclick = () => { limpiar(); refrescaContadores(); ir(location.hash.slice(1)); toast("Datos actualizados"); };
  ir(location.hash.slice(1));
  refrescaContadores();
  setInterval(() => { if (document.visibilityState === "visible") refrescaContadores(); }, 5 * 60e3);
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
