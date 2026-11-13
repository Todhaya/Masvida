// Viwai · Ofertas con el catálogo real (con sesión): categorías y grupos con icono, «Recomendados», todo el catálogo
// por categoría, búsqueda en todo el catálogo y cesta. Mismos datos y reglas que la web (buscar_productos…).
// Los datos los da nube.js (window.viwaiCatalogo). Sin catálogo real (prototipo), la app usa sus ofertas de ejemplo.
(function () {
  const NOMBRES = { moda: "Moda", belleza: "Belleza y cuidado", peques: "Peques", hogar: "Hogar y deco", cocina: "Cocina", electrodomesticos: "Electrodomésticos", tecnologia: "Tecnología", deporte: "Deporte", mascotas: "Mascotas", alimentacion: "Súper", viajes: "Viajes y planes", otros: "Otros" };
  const ICO = { moda: "ropa", belleza: "perfume", peques: "bebe", hogar: "hogar", cocina: "olla", electrodomesticos: "lavadora", tecnologia: "movil", deporte: "pesa", mascotas: "perro", alimentacion: "compra", viajes: "maleta", otros: "caja" };
  // Categoría de la app (intereses del perfil) que corresponde a cada categoría del catálogo
  const APP = { alimentacion: "super", peques: "ninos", cocina: "hogar", electrodomesticos: "hogar" };
  const SUBICO = { ropa: "ropa", calzado: "pisadas", bolsos: "bolso", joyas: "joya", bisuteria: "destellos", relojes: "reloj-pulsera", accesorios: "gafas",
    perfumes: "perfume", maquillaje: "pincel", cabello: "tijeras", facial: "flor", corporal: "bano", salud: "farmacia", afeitado: "tijeras",
    bebe: "bebe", construccion: "bloques", munecas: "corazon", juegos: "puzle", educativos: "libro", manualidades: "paleta", exterior: "bici",
    textil: "cama", orden: "caja", limpieza: "gota", decoracion: "lampara", jardin: "hoja", muebles: "sofa",
    energia: "bateria", movil: "movil", audio: "auriculares", informatica: "portatil", imagen: "camara",
    ciclismo: "bici", fitness: "pesa", montana: "montana", agua: "gota", sartenes: "olla", utensilios: "cubiertos", mesa: "cubiertos", conservar: "caja",
    clima: "termometro", singluten: "hoja", dulce: "galleta", bebidas: "cafe", perros: "perro", gatos: "gato", maletas: "maleta" };
  const subIco = (cat, sub) => sub === "mas" ? "mas" : sub === "cocina" ? "olla" : sub === "limpieza" && cat === "electrodomesticos" ? "lavadora" : sub === "relojes" && cat === "tecnologia" ? "reloj-pulsera" : SUBICO[sub] || "rejilla";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => Number(n).toLocaleString("es-ES");
  const ico = (n) => (self.viwaiIcono ? self.viwaiIcono(n) : "");

  const css = `
  .ccats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 6px}
  .ccat,.cg{border:0;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:2px;color:var(--ink);font:700 12.5px/1.2 var(--f-body,inherit);text-align:center;min-width:0}
  .ccat i,.cg i{width:56px;height:56px;border-radius:18px;background:var(--surface);display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px var(--line)}
  .ccat i svg,.cg i svg{width:25px;height:25px}
  .ccat small,.cg small{display:block;font-weight:600;opacity:.6;font-size:11px}
  .ccat.mio i{background:var(--pastel);color:var(--pastel-ink);box-shadow:none}
  .cgs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin:0 -2px}
  .cgs::-webkit-scrollbar{display:none}
  .cg{flex:none;width:78px}
  .cg[aria-pressed=true] i{background:var(--accent);color:var(--accent-ink);box-shadow:none}
  .ctit{display:flex;align-items:center;gap:12px}
  .ctit i{width:46px;height:46px;border-radius:16px;background:var(--pastel);color:var(--pastel-ink);display:grid;place-items:center}
  .ctit b{font:800 24px/1.1 var(--f-display,inherit);letter-spacing:-.03em}
  .cord{border:1.5px solid var(--line);border-radius:999px;padding:8px 12px;font:600 13px var(--f-body,inherit);background:var(--surface);color:var(--ink)}
  .cbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
  .cs-btn{bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const E = { cat: null, sub: null, orden: "relevancia", desde: 0, total: 0, cats: null, q: "" };

  async function cats() {
    if (!E.cats) E.cats = await self.viwaiCatalogo.cats();
    return E.cats;
  }

  // Lo llama renderOffers de la app cuando hay catálogo real. ctx: { el, q, card, top, capr, catOn }
  self.viwaiCatalogoUI = async function (ctx) {
    E.ctx = ctx;
    if (ctx.q) { E.q = ctx.q; return pintaBusqueda(); }
    E.q = "";
    if (E.cat) return pintaCategoria();
    const lista = await cats();
    const n = Object.fromEntries(lista.map((c) => [c.categoria, c.n]));
    const orden = ["moda", "belleza", "peques", "hogar", "cocina", "electrodomesticos", "tecnologia", "deporte", "mascotas", "alimentacion", "viajes", "otros"].filter((k) => n[k]);
    const mio = (k) => ctx.catOn(APP[k] || k);
    const ordenadas = orden.filter(mio).concat(orden.filter((k) => !mio(k)));
    // Bajadas de verdad (campañas): al menos un 10 % bajo el precio más bajo que habíamos visto
    const ch = self.viwaiCatalogo.chollos ? await self.viwaiCatalogo.chollos() : [];
    const camp = self.viwaiCampana;
    const bajadas = ch.length ? `<div class="view" style="gap:8px"><div class="row-h"><div><h2>${esc(camp && camp.empezada ? camp.titulo + ": bajadas de verdad" : "Bajadas de verdad")}</h2><span class="freq">Más baratos que nunca desde que los seguimos</span></div></div><div class="rail">${ch.map((p) => ctx.card(self.viwaiCatalogo.aOferta({ ...p, precio_min_30d: p.minimo_antes }))).join("")}</div></div>` : "";
    if (E.cat || E.q) return; // la usuaria ya ha cambiado de vista mientras cargaba
    ctx.el.innerHTML = bajadas + ctx.top
      + `<div class="view" style="gap:10px"><div class="row-h"><div><h2>Categorías</h2><span class="freq">Las tuyas, primero</span></div></div>
         <div class="ccats">${ordenadas.map((k) => `<button class="ccat${mio(k) ? " mio" : ""}" data-ccat="${k}"><i>${ico(ICO[k] || "caja")}</i><span>${esc(NOMBRES[k] || k)}<small>${num(n[k])}</small></span></button>`).join("")}</div></div>`
      + ctx.capr;
  };

  async function pintaCategoria(anadir) {
    const ctx = E.ctx;
    if (!anadir) {
      E.desde = 0;
      const subs = (await self.viwaiCatalogo.subs(E.cat)).filter((s) => s.sub);
      const total = (await cats()).find((c) => c.categoria === E.cat)?.n || 0;
      ctx.el.innerHTML = `<div class="row-h"><button class="backb" data-cvolver style="margin:0">${ico("atras")}<span>Todas las categorías</span></button></div>
        <div class="ctit"><i>${ico(ICO[E.cat] || "caja")}</i><b>${esc(NOMBRES[E.cat] || E.cat)}</b></div>
        ${subs.length > 1 ? `<div class="cgs" role="group" aria-label="Tipo de producto"><button class="cg" data-csub="" aria-pressed="${!E.sub}"><i>${ico("rejilla")}</i><span>Todo<small>${num(total)}</small></span></button>${subs.map((s) => `<button class="cg" data-csub="${esc(s.sub)}" aria-pressed="${E.sub === s.sub}"><i>${ico(subIco(E.cat, s.sub))}</i><span>${esc(s.nombre)}<small>${num(s.n)}</small></span></button>`).join("")}</div>` : ""}
        <div class="cbar"><span class="muted small" id="c-res"></span><select class="cord" id="c-orden" aria-label="Ordenar"><option value="relevancia">Recomendados</option><option value="precio">Más baratos</option><option value="descuento">Más rebajados</option></select></div>
        <div class="offers" id="c-lista"></div><button class="btn" id="c-mas" hidden>Ver más</button>`;
      ctx.el.querySelector("#c-orden").value = E.orden;
    }
    const filas = await self.viwaiCatalogo.busca({ cat: E.cat, sub: E.sub, orden: E.orden, limite: 30, desde: E.desde });
    pintaFilas(filas, anadir);
  }

  async function pintaBusqueda(anadir) {
    const ctx = E.ctx;
    if (!anadir) {
      E.desde = 0;
      ctx.el.innerHTML = `<span class="muted small" id="c-res">Buscando…</span><div class="offers" id="c-lista"></div><button class="btn" id="c-mas" hidden>Ver más</button>`;
    }
    const filas = await self.viwaiCatalogo.busca({ q: E.q, orden: "relevancia", limite: 30, desde: E.desde });
    pintaFilas(filas, anadir);
    if (!E.total) ctx.el.querySelector("#c-res").textContent = `No hemos encontrado «${E.q}». Prueba con otra palabra.`;
  }

  function pintaFilas(filas, anadir) {
    const ctx = E.ctx, lista = ctx.el.querySelector("#c-lista");
    if (!lista) return;
    E.total = Number(filas[0]?.total || (anadir ? E.total : 0));
    const html = filas.map((p) => ctx.card(self.viwaiCatalogo.aOferta(p))).join("");
    lista.insertAdjacentHTML("beforeend", html);
    E.desde += filas.length;
    const mas = ctx.el.querySelector("#c-mas"); if (mas) mas.hidden = E.desde >= E.total;
    const res = ctx.el.querySelector("#c-res");
    if (res && E.total) res.textContent = E.q ? `${num(E.total)} productos para «${E.q}»` : `${num(E.total)} productos`;
    if (self.viwaiCestaRefresca) self.viwaiCestaRefresca();
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ccat],[data-csub],[data-cvolver],#c-mas");
    if (!b || !E.ctx || !E.ctx.el.contains(b)) return;
    if (b.dataset.ccat) { E.cat = b.dataset.ccat; E.sub = null; pintaCategoria(); scrollTo({ top: 0 }); return; }
    if (b.dataset.cvolver != null) { E.cat = null; E.sub = null; self.viwaiCatalogoUI(E.ctx); scrollTo({ top: 0 }); return; }
    if (b.dataset.csub != null) { E.sub = b.dataset.csub || null; E.ctx.el.querySelectorAll(".cg").forEach((x) => x.setAttribute("aria-pressed", x === b)); E.desde = 0; E.ctx.el.querySelector("#c-lista").innerHTML = ""; pintaCategoria(true); return; }
    if (b.id === "c-mas") { E.q ? pintaBusqueda(true) : pintaCategoria(true); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id !== "c-orden" || !E.ctx) return;
    E.orden = e.target.value; E.desde = 0; E.ctx.el.querySelector("#c-lista").innerHTML = ""; pintaCategoria(true);
  });
})();
