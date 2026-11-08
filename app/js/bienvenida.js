// Viwai · bienvenida de una casa nueva: perfil (para buscar ayudas) → ayudas que le pueden tocar → tutorial.
// Textos según docs/specs/BIENVENIDA_Y_TUTORIAL.md. Todo es saltable menos quién vive en casa y el código postal.
import { ccaaDeCP, perfilAyudas, misAyudas } from "./ayudas.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COLORES = ["peach", "mint", "lav", "sky", "butter"];

const TUTORIAL = [
  ["Ahorra en lo de siempre.", "Revisamos tus facturas con tu consumo real y te decimos si pagas de más. También te avisamos de las ayudas que te tocan."],
  ["La casa, en orden.", "Menú y compra, tareas repartidas, armario de cada uno, calendario y papeles con aviso. Todo compartido con quien vive contigo."],
  ["Ofertas que te sirven.", "En tu súper, en la talla de tus peques y en lo que de verdad usas. También escapadas y planes."],
  ["Una parte vuelve a ti.", "Compra al mismo precio en las tiendas asociadas y te devolvemos hasta un 3 %. A partir de 10 € lo pasas a tu cuenta."],
  ["Invita y sube de nivel.", "Cada amiga que se une os da 3 € a las dos y sube tu porcentaje para siempre."],
];

// Estado inicial de una casa real: lo que ha contado en la bienvenida y el resto vacío (sin datos de ejemplo).
export function estadoInicial(r) {
  const yo = { id: "yo", n: r.nombre || "Yo", c: "peach", kid: 0, talla: "", home: "siempre", acc: "titular" };
  const adultos = Array.from({ length: Math.max(0, r.adultos - 1) }, (_, i) => ({ id: "a" + (i + 1), n: `Adulto ${i + 2}`, c: COLORES[(i + 1) % 5], kid: 0, talla: "", home: "siempre" }));
  const peques = r.peques.map((p, i) => ({ id: "k" + (i + 1), n: p.n || `Peque ${i + 1}`, c: COLORES[(i + 3) % 5], kid: 1, age: p.edad, talla: "", home: "siempre" }));
  const mem = [yo, ...adultos, ...peques];
  const profile = {
    nombre: r.nombre || "", cp: r.cp, ccaa: ccaaDeCP(r.cp) || "", edad: r.edad || null,
    adultos: r.adultos, hijos: peques.length, menor3: peques.filter((p) => p.age < 3).length,
    escolar: peques.filter((p) => p.age >= 3 && p.age <= 17).length,
    ingresos: r.ingresos, vivienda: r.vivienda, calefaccion: r.calefaccion, situacion: r.situacion,
    coche: "no", mascotas: [], intereses: [], tiendas: [], solo: r.adultos === 1 && !peques.length,
    completo: new Date().toISOString(),
  };
  return {
    profile, mem, stars: Object.fromEntries(mem.map((m) => [m.id, 0])),
    ch: [], clog: [], wd: [], look: {}, ev: [], share: { inv: [], feed: [] }, docx: [], pdx: [],
    tasks: [], mant: [], cards: [], refs: 0, done: {}, luz: false, dinero: false,
    shopchk: {}, shophome: {}, shopstore: {}, shopextra: [], tutorial: true,
  };
}

// Muestra la bienvenida y devuelve las respuestas (y las ayudas propuestas) cuando termina.
export function bienvenida({ email, ayudas = [] }) {
  return new Promise((listo) => {
    const r = { nombre: "", edad: null, adultos: 1, peques: [], cp: "", ingresos: null, situacion: [], vivienda: null, calefaccion: null, propuestas: [] };
    const d = document.createElement("div");
    d.id = "bv";
    document.body.append(d);
    document.documentElement.classList.remove("bv-espera");
    let paso = 0;
    const PASOS = 7;

    const barra = () => `<div class="bv-prog" aria-hidden="true"><i style="width:${Math.round((paso / (PASOS - 1)) * 100)}%"></i></div>`;
    const nav = (sig = "Siguiente", saltar = false) => `<div class="bv-nav">${paso ? `<button type="button" class="bv-sec" data-atras>Atrás</button>` : "<span></span>"}
      <div>${saltar ? `<button type="button" class="bv-sec" data-saltar>Prefiero no decirlo</button>` : ""}<button class="bv-btn">${sig}</button></div></div>`;
    const opcion = (grupo, val, txt, sel, multi) => `<label class="bv-op"><input type="${multi ? "checkbox" : "radio"}" name="${grupo}" value="${val}" ${sel ? "checked" : ""}><span>${txt}</span></label>`;

    function pinta() {
      let h = "";
      if (paso === 0) h = `<h1>Vamos a buscar tus ayudas.</h1>
        <p class="bv-lead">Con estas preguntas buscamos las ayudas, bonos y deducciones que te pueden tocar. Son 2 minutos.</p>
        <label class="bv-campo">¿Cómo te llamas? <input name="nombre" value="${esc(r.nombre)}" autocomplete="given-name" placeholder="Tu nombre"></label>
        <label class="bv-campo">¿Cuántos años tienes? <input name="edad" type="number" min="16" max="110" inputmode="numeric" value="${r.edad ?? ""}"></label>
        <p class="bv-nota">Algunas ayudas son para menores de 35 o mayores de 65.</p>${nav("Empezar")}`;
      if (paso === 1) h = `<h1>¿Quién vive en casa?</h1><p class="bv-nota">Para ayudas por hijos, familia numerosa o monoparental.</p>
        <div class="bv-ops">${opcion("solo", "1", "Solo yo", r.adultos === 1 && !r.peques.length && r._solo, false)}${opcion("solo", "0", "Somos más", !(r.adultos === 1 && !r.peques.length && r._solo), false)}</div>
        <div id="bv-mas" ${r._solo ? "hidden" : ""}>
          <label class="bv-campo">Personas adultas (contándote) <input name="adultos" type="number" min="1" max="12" value="${r.adultos}" inputmode="numeric"></label>
          <p class="bv-campo" style="margin-bottom:6px">Peques y menores de 18</p>
          <div id="bv-peques">${r.peques.map((p, i) => `<div class="bv-peque"><input name="pn${i}" placeholder="Nombre" value="${esc(p.n)}"><input name="pe${i}" type="number" min="0" max="17" placeholder="Edad" value="${p.edad ?? ""}" inputmode="numeric"><button type="button" class="bv-sec" data-quita="${i}" aria-label="Quitar">✕</button></div>`).join("")}</div>
          <button type="button" class="bv-sec" data-anade>+ Añadir un peque</button>
          <p class="bv-nota">Sirve igual si vivís en pareja o compartís piso.</p>
        </div>${nav()}`;
      if (paso === 2) h = `<h1>¿Dónde vivís?</h1><p class="bv-nota">Cada comunidad y ayuntamiento tiene sus propias ayudas.</p>
        <label class="bv-campo">Código postal <input name="cp" value="${esc(r.cp)}" inputmode="numeric" maxlength="5" placeholder="08001" autocomplete="postal-code"></label>
        <p class="bv-nota" id="bv-ccaa">${r.cp && ccaaDeCP(r.cp) ? ccaaDeCP(r.cp) : ""}</p>${nav()}`;
      if (paso === 3) h = `<h1>Ingresos de la casa</h1><p class="bv-nota">Muchas ayudas dependen de los ingresos. No lo compartimos con nadie. Sumando todo lo que entra en casa al mes, aproximadamente:</p>
        <div class="bv-ops">${opcion("ing", "bajos", "Menos de 1.500 € al mes", r.ingresos === "bajos")}${opcion("ing", "medios", "Entre 1.500 y 3.500 € al mes", r.ingresos === "medios")}${opcion("ing", "altos", "Más de 3.500 € al mes", r.ingresos === "altos")}</div>${nav("Siguiente", true)}`;
      if (paso === 4) h = `<h1>¿Os pasa alguna de estas cosas?</h1><p class="bv-nota">Solo para saber qué te corresponde. Marca las que sean.</p>
        <div class="bv-ops">${[["numerosa", "Familia numerosa"], ["monoparental", "Familia monoparental"], ["discapacidad", "Alguien con discapacidad reconocida"], ["desempleo", "Alguien en paro"], ["estudiantes", "Estudiantes en casa"], ["mayores", "Personas mayores a cargo"]].map(([v, t]) => opcion("sit", v, t, r.situacion.includes(v), true)).join("")}</div>${nav()}`;
      if (paso === 5) h = `<h1>Tu vivienda</h1><p class="bv-nota">Para las ayudas al alquiler, el bono social y las ayudas de energía.</p>
        <p class="bv-campo">La casa es…</p><div class="bv-ops">${opcion("viv", "alquiler", "De alquiler", r.vivienda === "alquiler")}${opcion("viv", "hipoteca", "Propia, con hipoteca", r.vivienda === "hipoteca")}${opcion("viv", "propiedad", "Propia, ya pagada", r.vivienda === "propiedad")}${opcion("viv", "otra", "Otra situación", r.vivienda === "otra")}</div>
        <p class="bv-campo">La calefacción es…</p><div class="bv-ops">${opcion("cal", "gas", "De gas", r.calefaccion === "gas")}${opcion("cal", "electrica", "Eléctrica", r.calefaccion === "electrica")}${opcion("cal", "otra", "Otra o no tenemos", r.calefaccion === "otra")}</div>${nav("Ver mis ayudas")}`;
      if (paso === 6) {
        const pf = perfilAyudas({ ...r, cp: r.cp, ccaa: ccaaDeCP(r.cp), situacion: [...r.situacion, ...(r.vivienda === "alquiler" ? [] : [])], hijos: r.peques.length },
          [{ kid: 0 }, ...Array.from({ length: Math.max(0, r.adultos - 1) }, () => ({ kid: 0 })), ...r.peques.map((p) => ({ kid: 1, age: p.edad }))]);
        r.propuestas = misAyudas(ayudas, pf);
        h = `<h1>${r.propuestas.length ? `Estas son las ayudas que te pueden corresponder` : "Ya está"}</h1>
          ${r.propuestas.length ? `<div class="bv-ayudas">${r.propuestas.map((a) => `<div class="bv-ayuda"><div class="bv-ah"><b>${esc(a.nombre)}</b><span class="bv-niv ${a.nivel}">${a.nivel === "si" ? "Probablemente sí" : "A comprobar"}</span></div>
            ${a.cuantia ? `<span class="bv-cuantia">${esc(a.cuantia)}</span>` : ""}${a.para ? `<span class="bv-nota">${esc(a.para)}</span>` : ""}
            ${a.enlace ? `<a href="${esc(a.enlace)}" target="_blank" rel="noopener">Cómo pedirla ↗</a>` : ""}</div>`).join("")}</div>
            <p class="bv-nota">Lo decide la Administración; te avisamos si cambia algo o si te sale una ayuda nueva.</p>`
          : `<p class="bv-lead">Estamos terminando de revisar las ayudas de este año. En cuanto haya alguna que encaje con tu casa, te avisamos.</p>`}
          <div class="bv-nav"><button type="button" class="bv-sec" data-atras>Revisar mis respuestas</button><button class="bv-btn">Entrar en Viwai</button></div>`;
      }
      if (paso >= 7) {
        const i = paso - 7, [t, x] = TUTORIAL[i];
        h = `<div class="bv-tuto"><span class="bv-paso">${i + 1} de ${TUTORIAL.length}</span><h1>${t}</h1><p class="bv-lead">${x}</p>
          <div class="bv-puntos">${TUTORIAL.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div></div>
          <div class="bv-nav"><button type="button" class="bv-sec" data-fin>Saltar</button><button class="bv-btn">${i === TUTORIAL.length - 1 ? "Empezar" : "Siguiente"}</button></div>`;
      }
      d.innerHTML = `<form class="bv-caja" novalidate>${paso < 7 ? barra() : ""}${h}<p class="bv-err" id="bv-err" aria-live="assertive"></p></form>`;
      const f = d.querySelector("form");
      f.querySelector("input:not([type=radio]):not([type=checkbox])")?.focus();
      f.onsubmit = (e) => { e.preventDefault(); if (lee(f, true)) avanza(); };
      f.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.atras != null) { lee(f, false); paso = paso >= 7 ? 6 : Math.max(0, paso - 1); pinta(); }
        if (b.dataset.saltar != null) { r.ingresos = null; avanza(); }
        if (b.dataset.fin != null) termina();
        if (b.dataset.anade != null) { lee(f, false); r.peques.push({ n: "", edad: null }); pinta(); }
        if (b.dataset.quita != null) { lee(f, false); r.peques.splice(+b.dataset.quita, 1); pinta(); }
      };
      f.onchange = (e) => {
        if (e.target.name === "solo") { r._solo = e.target.value === "1"; f.querySelector("#bv-mas").hidden = r._solo; }
      };
      f.oninput = (e) => { if (e.target.name === "cp") f.querySelector("#bv-ccaa").textContent = ccaaDeCP(e.target.value) || ""; };
    }

    function lee(f, validar) {
      const v = (n) => f.elements[n]?.value?.trim?.() ?? "";
      const err = (m) => { if (validar) f.querySelector("#bv-err").textContent = m; return !validar; };
      if (paso === 0) { r.nombre = v("nombre").slice(0, 30); r.edad = v("edad") ? Math.min(110, Math.max(16, +v("edad"))) : null; }
      if (paso === 1) {
        r._solo = f.querySelector('input[name="solo"]:checked')?.value === "1";
        r.peques = r.peques.map((p, i) => ({ n: v("pn" + i).slice(0, 20), edad: v("pe" + i) === "" ? null : Math.min(17, Math.max(0, +v("pe" + i))) }));
        if (r._solo) { r.adultos = 1; r.peques = []; }
        else {
          r.adultos = Math.min(12, Math.max(1, +v("adultos") || 1));
          if (validar && r.peques.some((p) => p.edad == null)) return err("Pon la edad de cada peque (es lo que cuenta para las ayudas).");
          if (validar && r.adultos === 1 && !r.peques.length) return err("Si vives sola o solo, marca «Solo yo». Si no, añade quién vive contigo.");
        }
      }
      if (paso === 2) { r.cp = v("cp"); if (validar && !ccaaDeCP(r.cp)) return err("Escribe un código postal de 5 números, por ejemplo 08001."); }
      if (paso === 3) r.ingresos = f.querySelector('input[name="ing"]:checked')?.value ?? r.ingresos;
      if (paso === 4) r.situacion = [...f.querySelectorAll('input[name="sit"]:checked')].map((x) => x.value);
      if (paso === 5) { r.vivienda = f.querySelector('input[name="viv"]:checked')?.value ?? null; r.calefaccion = f.querySelector('input[name="cal"]:checked')?.value ?? null; }
      return true;
    }
    function avanza() { paso++; if (paso >= 7 + TUTORIAL.length) return termina(); pinta(); }
    function termina() { d.remove(); const { _solo, ...res } = r; listo(res); }
    r._solo = false;
    pinta();
  });
}
