// Viwai · «Mi cesta»: guarda productos de varias tiendas, los agrupa por tienda y ayuda a pasarlos a cada tienda.
// Las tiendas no dejan meter productos en su carrito desde fuera, así que la cesta es una lista guiada:
// por cada producto, «Abrir en la tienda» abre su página (con nuestro enlace de afiliación) y la usuaria marca
// «Ya está en su carrito» cuando lo ha añadido allí.
// Se guarda solo en este navegador (sin cuenta). Los enlaces llevan rel="sponsored" y data-tienda: clic.js apunta el clic.
(function () {
  const K = "viwai-cesta";
  const lee = () => { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch (e) { return []; } };
  const guarda = (l) => { try { localStorage.setItem(K, JSON.stringify(l)); } catch (e) {} };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = (n) => Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  let L = lee();

  const css = `
  .cs-add{position:absolute;right:8px;bottom:8px;height:36px;padding:0 13px;border-radius:999px;border:0;background:var(--ink);color:#FAFAF8;font:800 14px/1 var(--f);cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
  .cs-add[aria-pressed=true]{background:var(--brand-strong)}
  .cs-add:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
  .cs-btn{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:20;border:0;border-radius:999px;padding:14px 20px;background:var(--brand-strong);color:#fff;font:800 16px var(--f);cursor:pointer;box-shadow:0 14px 30px -12px rgba(60,30,160,.6);display:flex;gap:8px;align-items:center}
  .cs-btn b{background:#fff;color:var(--brand-strong);border-radius:999px;min-width:24px;padding:1px 7px;font-size:14px}
  .cs-fondo{position:fixed;inset:0;z-index:30;background:rgba(15,15,14,.45)}
  .cs-panel{position:fixed;top:0;right:0;bottom:0;z-index:31;width:min(440px,100%);background:var(--bg);color:var(--ink);display:flex;flex-direction:column;box-shadow:-20px 0 40px -20px rgba(0,0,0,.3);padding-top:env(safe-area-inset-top,0px)}
  .cs-cab{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line)}
  .cs-cab h2{font-size:24px;letter-spacing:-.03em}
  .cs-x{border:0;background:none;font:800 15px var(--f);color:var(--brand-strong);cursor:pointer;padding:8px}
  .cs-cuerpo{overflow:auto;padding:16px 20px calc(24px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:18px}
  .cs-ayuda{font-size:14px;color:var(--muted);background:var(--cream);border-radius:16px;padding:12px 14px}
  .cs-tienda{background:var(--surface);border-radius:20px;box-shadow:inset 0 0 0 1.5px var(--line);padding:14px;display:flex;flex-direction:column;gap:10px}
  .cs-tienda h3{font-size:18px;display:flex;justify-content:space-between;gap:8px}
  .cs-tienda h3 span{font-size:15px;color:var(--muted);font-weight:700}
  .cs-item{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:center}
  .cs-item img{width:56px;height:56px;object-fit:contain;background:#fff;border-radius:10px;box-shadow:inset 0 0 0 1px var(--line)}
  .cs-item .t{font-size:14px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .cs-item .acc{grid-column:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .cs-item .p{font-weight:800}
  .cs-ir{background:var(--ink);color:#FAFAF8;border-radius:999px;padding:7px 12px;font:800 13px var(--f);text-decoration:none}
  .cs-item.hecho .cs-ir{background:var(--mint);color:var(--ink)}
  .cs-item.hecho .t{opacity:.6}
  .cs-q{border:0;background:none;color:var(--muted);font:600 13px var(--f);text-decoration:underline;cursor:pointer;padding:4px}
  .cs-pasos{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;counter-reset:p}
  .cs-pasos li{display:grid;grid-template-columns:28px 1fr;gap:10px;font-size:14px;line-height:1.4;counter-increment:p}
  .cs-pasos li::before{content:counter(p);width:28px;height:28px;border-radius:50%;background:var(--brand-strong);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
  .cs-prog{font-size:13px;font-weight:700;color:var(--muted)}
  .cs-prog.ok{color:var(--ink);background:var(--mint);border-radius:12px;padding:8px 10px}
  .cs-ya{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:600;cursor:pointer}
  .cs-ya input{width:18px;height:18px;accent-color:var(--brand-strong)}
  .cs-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:25;background:var(--ink);color:#FAFAF8;border-radius:999px;padding:10px 10px 10px 18px;font:700 14px var(--f);display:flex;gap:12px;align-items:center;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);max-width:calc(100% - 32px)}
  .cs-toast button{border:0;border-radius:999px;background:#FAFAF8;color:var(--ink);font:800 13px var(--f);padding:7px 12px;cursor:pointer}
  .cs-vacia{text-align:center;color:var(--muted);padding:30px 10px}
  .cs-pie{display:flex;justify-content:space-between;font-weight:800;font-size:17px;padding-top:4px}
  .cs-vaciar{align-self:center}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement("button");
  btn.className = "cs-btn"; btn.type = "button"; btn.hidden = true;
  document.body.appendChild(btn);

  function pintaBoton() {
    btn.hidden = !L.length;
    btn.innerHTML = `Mi cesta <b>${L.length}</b>`;
    btn.setAttribute("aria-label", `Mi cesta, ${L.length} productos`);
    document.querySelectorAll(".cs-add").forEach((b) => {
      const dentro = L.some((x) => x.id === b.dataset.id);
      b.setAttribute("aria-pressed", dentro); b.textContent = dentro ? "✓ En tu cesta" : "+ Cesta";
      b.setAttribute("aria-label", dentro ? "Quitar de mi cesta" : "Añadir a mi cesta");
    });
  }

  // Botón «+» en cada tarjeta de producto (lo llama la página al pintar)
  window.viwaiCestaBoton = (p) =>
    `<button type="button" class="cs-add" data-id="${esc(p.id)}" data-p='${esc(JSON.stringify({ id: p.id, tienda_id: p.tienda_id, tienda: p.tienda, titulo: p.titulo, precio: p.precio, imagen: p.imagen, url: p.url }))}' aria-pressed="false" aria-label="Añadir a mi cesta">+ Cesta</button>`;

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".cs-add"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const id = b.dataset.id;
    if (L.some((x) => x.id === id)) L = L.filter((x) => x.id !== id);
    else { try { L.push({ ...JSON.parse(b.dataset.p), hecho: false }); } catch (err) { return; } aviso(L.length === 1 ? "Guardado. Sigue añadiendo de cualquier tienda" : "Guardado en tu cesta"); }
    guarda(L); pintaBoton();
  }, true);

  let toast = null, tt = 0;
  function aviso(txt) {
    if (toast) toast.remove();
    toast = document.createElement("div"); toast.className = "cs-toast"; toast.setAttribute("role", "status");
    toast.innerHTML = `<span>${esc(txt)}</span><button type="button" data-cs-ver>Ver cesta</button>`;
    document.body.appendChild(toast);
    clearTimeout(tt); tt = setTimeout(() => { if (toast) { toast.remove(); toast = null; } }, 4000);
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-cs-ver]")) { if (toast) { toast.remove(); toast = null; } abre(); } });

  let panel = null;
  function abre() {
    cierra();
    panel = document.createElement("div");
    panel.innerHTML = `<div class="cs-fondo" data-cs="cerrar"></div><aside class="cs-panel" role="dialog" aria-modal="true" aria-label="Mi cesta"><div class="cs-cab"><h2>Mi cesta</h2><button class="cs-x" data-cs="cerrar">Cerrar</button></div><div class="cs-cuerpo"></div></aside>`;
    document.body.appendChild(panel);
    pintaPanel();
    panel.querySelector(".cs-x").focus();
  }
  function cierra() { if (panel) { panel.remove(); panel = null; btn.focus({ preventScroll: true }); } }

  function pintaPanel() {
    if (!panel) return;
    const cuerpo = panel.querySelector(".cs-cuerpo");
    if (!L.length) { cuerpo.innerHTML = `<p class="cs-vacia">Tu cesta está vacía. Toca «+» en los productos que quieras comprar.</p>`; return; }
    const grupos = {};
    L.forEach((x) => (grupos[x.tienda_id] = grupos[x.tienda_id] || []).push(x));
    const total = L.reduce((s, x) => s + Number(x.precio || 0), 0);
    cuerpo.innerHTML = `<ol class="cs-pasos"><li><span>Aquí tienes lo que has guardado, separado por tienda.</span></li>
      <li><span>Toca <b>«Abrir en la tienda»</b>: se abre el producto en su web. Añádelo a su carrito allí y vuelve aquí.</span></li>
      <li><span>Marca <b>«Ya está en su carrito»</b>. Cuando tengas todo, paga en la web de cada tienda.</span></li></ol>`
      + Object.values(grupos).map((g) => {
        const hechos = g.filter((x) => x.hecho).length, nom = esc(g[0].tienda);
        return `<section class="cs-tienda"><h3>${nom}<span>${eur(g.reduce((s, x) => s + Number(x.precio || 0), 0))}</span></h3>
        <p class="cs-prog${hechos === g.length ? " ok" : ""}">${hechos === g.length ? `Todo en el carrito de ${nom}. Ya puedes pagar allí.` : `${hechos} de ${g.length} en el carrito de ${nom}`}</p>`
        + g.map((x) => `<div class="cs-item${x.hecho ? " hecho" : ""}"><img src="${esc(x.imagen)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="t">${esc(x.titulo)}</span>
          <span class="acc"><span class="p">${eur(x.precio)}</span><a class="cs-ir" href="${esc(x.url)}" data-tienda="${esc(x.tienda_id)}" target="_blank" rel="sponsored noopener">Abrir en la tienda ↗</a></span>
          <span class="acc"><label class="cs-ya"><input type="checkbox" data-cs-ya="${esc(x.id)}"${x.hecho ? " checked" : ""}> Ya está en su carrito</label><button class="cs-q" data-cs-quita="${esc(x.id)}">Quitar</button></span></div>`).join("")
        + `</section>`;
      }).join("")
      + `<div class="cs-pie"><span>Total aproximado</span><span>${eur(total)}</span></div><p class="cs-ayuda">Los precios son los de anoche: el que vale es el de la tienda. Comprar desde aquí te cuesta lo mismo.</p><button class="btn ghost cs-vaciar" data-cs="vaciar">Vaciar cesta</button>`;
  }

  document.addEventListener("click", (e) => {
    if (e.target === btn || e.target.closest(".cs-btn")) { abre(); return; }
    if (!panel || !panel.contains(e.target)) return;
    const a = e.target.closest("[data-cs]"), q = e.target.closest("[data-cs-quita]");
    if (a && a.dataset.cs === "cerrar") cierra();
    if (a && a.dataset.cs === "vaciar") { L = []; guarda(L); pintaBoton(); pintaPanel(); }
    if (q) { L = L.filter((x) => x.id !== q.dataset.csQuita); guarda(L); pintaBoton(); pintaPanel(); }
    const ya = e.target.closest("[data-cs-ya]");
    if (ya) { const x = L.find((y) => y.id === ya.dataset.csYa); if (x) { x.hecho = ya.checked; guarda(L); pintaPanel(); } }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel) cierra(); });
  // Otra pestaña cambió la cesta
  window.addEventListener("storage", (e) => { if (e.key === K) { L = lee(); pintaBoton(); pintaPanel(); } });

  window.viwaiCestaRefresca = pintaBoton;
  pintaBoton();
})();
