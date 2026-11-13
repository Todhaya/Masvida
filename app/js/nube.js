// Viwai · cuenta y datos en la nube.
// - Sin sesión: pantalla para entrar con un enlace al correo.
// - Primera vez: bienvenida (perfil → ayudas → tutorial) y la casa empieza vacía, sin los datos de ejemplo.
// - Después: cada cambio que la app guarda (S.set) se sube a Supabase (tabla estado_app) y al entrar
//   desde otro dispositivo se descarga todo.
// Con ?demo en la dirección se salta todo y se ve el prototipo con datos de ejemplo.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { bienvenida, estadoInicial } from "./bienvenida.js";
import { perfilAyudas, misAyudas } from "./ayudas.js";
import { escuchaClics } from "./clic.js";

const C = window.VIWAI || {};
const PREF = "pj2-";
const DEMO = new URLSearchParams(location.search).has("demo");
export const sb = C.supabaseUrl ? createClient(C.supabaseUrl, C.supabaseAnonKey) : null;

const muestra = () => document.documentElement.classList.remove("bv-espera");
const claves = () => Object.keys(localStorage).filter((k) => k.startsWith(PREF)).map((k) => k.slice(PREF.length));

let hogar = null, pendientes = new Map(), temporizador = null;

function subeLuego(k, v) {
  if (!hogar || !/^[a-z0-9_-]{1,40}$/.test(k)) return;
  pendientes.set(k, v);
  clearTimeout(temporizador);
  temporizador = setTimeout(sube, 1200);
}
async function sube() {
  if (!pendientes.size) return;
  const filas = [...pendientes].map(([clave, valor]) => ({ hogar_id: hogar, clave, valor, actualizado: new Date().toISOString() }));
  pendientes = new Map();
  const { error } = await sb.from("estado_app").upsert(filas);
  if (error) { console.warn("No se ha podido guardar en la nube", error.message); filas.forEach((f) => pendientes.set(f.clave, f.valor)); }
  if (filas.some((f) => f.clave === "profile" || f.clave === "mem")) guardaPerfil();
}
addEventListener("pagehide", () => { if (pendientes.size) sube(); });

// El perfil también va en columnas (lo usa el servidor para avisar de ayudas nuevas)
async function guardaPerfil() {
  try {
    const P = JSON.parse(localStorage.getItem(PREF + "profile") || "{}");
    const M = JSON.parse(localStorage.getItem(PREF + "mem") || "[]");
    const pf = perfilAyudas(P, M);
    await sb.from("perfiles").upsert({
      hogar_id: hogar, ccaa: pf.ccaa, codigo_postal: P.cp || null, vivienda: pf.vivienda,
      tramo_ingresos: pf.ingresos, situacion: pf.situacion, adultos: pf.adultos, hijos: pf.hijos,
      menores3: pf.menores3, edades_hijos: pf.edadesHijos, edad: pf.edad, calefaccion: pf.calefaccion,
      completo: P.completo || null, actualizado: new Date().toISOString(),
    });
  } catch (e) { console.warn("perfil", e); }
}

// Las ayudas reales (publicadas en el panel) sustituyen a las de ejemplo de la pestaña Ayudas
async function ayudasReales() {
  const { data } = await sb.from("ayudas").select("id,nombre,para,cuantia,requisitos,como_pedirla,enlace,organismo,ambito,plazo_fin,reglas");
  return data || [];
}
function pintaAyudas(lista) {
  const el = document.getElementById("aids"), n = document.getElementById("a-count");
  if (!el) return;
  // P y MEM son variables globales del script de la app
  const pf = perfilAyudas(typeof P !== "undefined" ? P : {}, typeof MEM !== "undefined" ? MEM : []);
  const mias = misAyudas(lista, pf);
  if (n) n.textContent = mias.length + (mias.length === 1 ? " ayuda" : " ayudas");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  el.innerHTML = mias.map((a) => `<div class="aid"><div class="h"><span class="n">${esc(a.nombre)}</span><span class="lvl ${a.nivel === "si" ? "l-yes" : "l-maybe"}">${a.nivel === "si" ? "Probablemente sí" : "Comprueba"}</span></div>
    <span class="amt">${esc(a.cuantia)}</span><span class="small muted">${esc([a.organismo, a.ambito === "estatal" ? "Estatal" : a.ambito].filter(Boolean).join(" · "))}${a.plazo_fin ? " · plazo hasta " + new Date(a.plazo_fin).toLocaleDateString("es-ES") : ""}</span>
    ${a.requisitos ? `<span class="small">${esc(a.requisitos)}</span>` : ""}
    <div class="btns">${a.enlace ? `<a class="btn" href="${esc(a.enlace)}" target="_blank" rel="noopener">Cómo pedirla</a>` : ""}</div></div>`).join("")
    || '<div class="aid">Con tu perfil no hemos encontrado ayudas por ahora. Te avisaremos si sale alguna nueva.</div>';
}

async function pantallaEntrar() {
  const d = document.createElement("div");
  d.id = "bv";
  d.innerHTML = `<div class="bv-caja">
    <img src="icons/icono.svg" alt="" width="64" height="64">
    <h1>Lo que ahorras,<br>lo vives.</h1>
    <p>Entra con tu correo. Te mandamos un enlace para entrar, sin contraseña.</p>
    <form id="bv-f"><input id="bv-em" type="email" autocomplete="email" placeholder="tu@correo.com" required aria-label="Correo"><button class="bv-btn">Enviarme el enlace</button></form>
    <p class="bv-nota" id="bv-msg" aria-live="polite"></p>
    <p class="bv-nota">Al entrar aceptas las <a href="https://www.viwai.es/legal/condiciones.html" target="_blank" rel="noopener">condiciones</a> y la <a href="https://www.viwai.es/legal/privacidad.html" target="_blank" rel="noopener">política de privacidad</a>.</p>
  </div>`;
  document.body.append(d);
  muestra();
  d.querySelector("#bv-f").onsubmit = async (e) => {
    e.preventDefault();
    const email = d.querySelector("#bv-em").value.trim();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    d.querySelector("#bv-msg").textContent = error ? "No se ha podido enviar: " + error.message : `Listo. Abre el correo que te hemos enviado a ${email} desde este mismo móvil.`;
  };
}

async function arranca() {
  if (DEMO || !sb) { muestra(); return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return pantallaEntrar();
  const uid = session.user.id;
  const { data: h, error } = await sb.rpc("mi_casa");
  if (error) {
    console.error(error);
    const d = document.createElement("div"); d.id = "bv";
    d.innerHTML = `<div class="bv-caja"><h1>No hemos podido conectar.</h1><p class="bv-lead">Inténtalo de nuevo en un rato. Tus datos están a salvo.</p><button class="bv-btn" onclick="location.reload()">Reintentar</button></div>`;
    document.body.append(d); muestra(); return;
  }
  hogar = h;

  // ¿Ya cargamos los datos de la nube en esta sesión del navegador?
  if (sessionStorage.getItem("viwai-cargado") !== uid) {
    const { data: filas } = await sb.from("estado_app").select("clave,valor");
    if (filas && filas.length) {
      claves().forEach((k) => localStorage.removeItem(PREF + k));
      filas.forEach((f) => localStorage.setItem(PREF + f.clave, JSON.stringify(f.valor)));
      sessionStorage.setItem("viwai-cargado", uid);
      location.reload();
      return;
    }
    // Casa nueva: bienvenida y estado inicial vacío (sin los datos de ejemplo)
    const res = await bienvenida({ email: session.user.email, ayudas: await ayudasReales() });
    claves().forEach((k) => localStorage.removeItem(PREF + k));
    const ini = estadoInicial(res);
    Object.entries(ini).forEach(([k, v]) => localStorage.setItem(PREF + k, JSON.stringify(v)));
    await sb.from("estado_app").upsert(Object.entries(ini).map(([clave, valor]) => ({ hogar_id: hogar, clave, valor })));
    await guardaPerfil();
    if (res.propuestas?.length) await sb.from("ayudas_hogar").upsert(res.propuestas.map((a) => ({ hogar_id: hogar, ayuda_id: a.id, nivel: a.nivel })));
    sessionStorage.setItem("viwai-cargado", uid);
    location.reload();
    return;
  }

  // Sesión normal: cada guardado de la app se sube a la nube
  const original = S.set;
  S.set = (k, v) => { original.call(S, k, v); subeLuego(k, v); };
  muestra();
  // Cuenta real: fuera la etiqueta de prototipo y la foto de ejemplo
  document.querySelector(".demo")?.remove();
  const av = document.querySelector("header .avatar, .avatar[data-v=perfil]");
  if (av) { av.querySelector("img")?.remove(); av.textContent = ((typeof P !== "undefined" && P.nombre) || session.user.email || "?")[0].toUpperCase(); }
  const lista = await ayudasReales();
  const pfActual = () => perfilAyudas(typeof P !== "undefined" ? P : {}, typeof MEM !== "undefined" ? MEM : []);
  window.viwaiMisAyudas = () => misAyudas(lista, pfActual()).map((a) => ({
    n: a.nombre, amt: a.cuantia || "", who: [a.organismo, a.ambito].filter(Boolean).join(" · "), docs: a.requisitos ? [a.requisitos] : [],
    lvl: a.nivel === "si" ? "yes" : "maybe", t: () => (a.nivel === "si" ? "yes" : "maybe"),
  }));
  globalThis.renderAids = () => pintaAyudas(lista);
  // Facturas: se leen con la función leer-factura (Claude); la app solo recibe los datos, sin identificadores
  globalThis.viwaiLeeFactura = async (file) => {
    const fd = new FormData(); fd.append("archivo", file);
    const { data, error } = await sb.functions.invoke("leer-factura", { body: fd });
    if (error) { let m = ""; try { m = await error.context?.text?.(); } catch (e) {} throw new Error(m || "No hemos podido leer la factura ahora. Inténtalo en unos minutos."); }
    return data;
  };
  document.querySelector("#step-up .aff")?.replaceChildren("La leemos con IA y solo guardamos lo necesario para comparar: nunca tu nombre, DNI, dirección ni cuenta.");
  // Ofertas reales del catálogo (las de ejemplo solo se ven en el prototipo) y clics apuntados a la casa
  await ofertasReales();
  escuchaClics((id, tienda, origen) => { sb.rpc("registra_clic", { p_id: id, p_tienda: tienda, p_origen: origen }).then(() => {}, () => {}); });
  if (typeof renderAll === "function") renderAll(false);
}

// Catálogo de la web → formato de las ofertas de la app (categorías de la app: super, belleza, mascotas, ninos, moda, deporte, tecnologia, hogar)
const CAT_APP = { alimentacion: "super", belleza: "belleza", mascotas: "mascotas", peques: "ninos", moda: "moda", deporte: "deporte", tecnologia: "tecnologia", hogar: "hogar", cocina: "hogar", electrodomesticos: "hogar" };
// Aviso de campaña en Inicio: cuenta atrás la semana antes y «ya ha empezado» mientras dura
function avisoCampana(c, hoy) {
  const el = document.getElementById("camp-aviso");
  if (!el || !c) return;
  const dias = Math.ceil((new Date(c.inicio) - new Date(hoy)) / 864e5);
  if (dias > 7) return;
  const fin = new Date(c.fin).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  el.innerHTML = `<button class="tile wide" data-v="ofertas" style="background:var(--ink);color:var(--bg);text-align:left">
    <span style="opacity:.75">${dias > 0 ? "Muy pronto" : "Ya ha empezado"}</span>
    <span class="big">${dias > 0 ? `${c.titulo} en ${dias} ${dias === 1 ? "día" : "días"}` : c.titulo}</span>
    <span style="opacity:.85">${dias > 0 ? "Te enseñaremos solo las bajadas de verdad" : `Solo bajadas de verdad, hasta el ${fin}`}</span></button>`;
  el.hidden = false;
  globalThis.viwaiCampana = { ...c, empezada: dias <= 0 };
}

// Producto del catálogo → oferta de la app («c» es la categoría de la app, «cat» la del catálogo)
const aOferta = (p) => ({
  id: p.id, c: CAT_APP[p.categoria] || "hogar", cat: p.categoria, n: p.titulo, s: p.tienda, t: p.tienda_id, url: p.url, img: p.imagen,
  p: Number(p.precio), o: Number(p.precio_min_30d) > Number(p.precio) ? Number(p.precio_min_30d) : Number(p.precio), real: 1,
});
async function ofertasReales() {
  if (typeof OFF === "undefined") return;
  const lotes = await Promise.all(Object.keys(CAT_APP).map((cat) => sb.rpc("buscar_productos", { cat, limite: 8 }).then((r) => r.data || [], () => [])));
  const reales = lotes.flat().map(aOferta).filter((o) => o.p > 0);
  // Para js/catalogo.js: el catálogo entero, con las mismas reglas que la web
  globalThis.viwaiCatalogo = {
    cats: () => sb.rpc("categorias_catalogo").then((r) => r.data || [], () => []),
    subs: (cat) => sb.rpc("subcategorias_catalogo", { cat }).then((r) => r.data || [], () => []),
    chollos: () => sb.rpc("chollos_automaticos", { limite: 12 }).then((r) => r.data || [], () => []),
    busca: (o) => sb.rpc("buscar_productos", { q: o.q || null, cat: o.cat || null, sub: o.sub || null, orden: o.orden || "relevancia", limite: o.limite || 30, desde: o.desde || 0 }).then((r) => r.data || [], () => []),
    aOferta,
  };
  // Chollos de campaña (Black Friday…): se ven dentro de la app para que el clic quede a nombre de la casa
  // y la compra sume reembolso. Si se abrieran en la web, el clic sería anónimo.
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: camps } = await sb.from("campanas").select("id,titulo,inicio,fin").gte("fin", hoy).then((r) => r, () => ({}));
  avisoCampana((camps || []).sort((a, b) => a.inicio.localeCompare(b.inicio))[0], hoy);
  if (camps?.length) {
    const [{ data: co }, { data: ti }] = await Promise.all([
      sb.from("ofertas").select("titulo,tienda_id,url,imagen,categoria,precio,precio_min_30d,campana_id").in("campana_id", camps.map((c) => c.id)).neq("categoria", "tienda"),
      sb.from("tiendas_publicas").select("id,nombre"),
    ]).catch(() => [{}, {}]);
    const nom = (id) => (ti || []).find((t) => t.id === id)?.nombre || id;
    (co || []).forEach((o) => { if (!(Number(o.precio) > 0) || !o.url) return;
      reales.unshift({ c: CAT_APP[o.categoria] || "hogar", n: o.titulo, s: nom(o.tienda_id), t: o.tienda_id, url: o.url, img: o.imagen,
        p: Number(o.precio), o: Math.max(Number(o.precio_min_30d) || 0, Number(o.precio)), real: 1, camp: (camps.find((c) => c.id === o.campana_id) || {}).titulo }); });
  }
  OFF.length = 0; OFF.push(...reales);
}

sb?.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { sessionStorage.removeItem("viwai-cargado"); location.reload(); } });
export const salir = async () => { await sube(); await sb.auth.signOut(); };
globalThis.viwaiSalir = salir;
arranca();
