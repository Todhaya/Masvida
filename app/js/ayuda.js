// Viwai · tutorial general y ayuda de cada apartado («Para qué sirve» · «Cómo se usa»).
// Textos: docs/specs/BIENVENIDA_Y_TUTORIAL.md. Lo que ya se ha visto se guarda con la casa (clave «ayuda»).
(function (g) {
  g.VIWAI_TUTORIAL = [
    ["ahorro", "Ahorra en lo de siempre.", "Revisamos tus facturas con tu consumo real y te decimos si pagas de más. También te avisamos de las ayudas que te tocan."],
    ["hogar", "La casa, en orden.", "Menú y compra, tareas repartidas, armario de cada uno, calendario y papeles con aviso. Todo compartido con quien vive contigo."],
    ["ofertas", "Ofertas que te sirven.", "En tu súper, en la talla de tus peques y en lo que de verdad usas. También escapadas y planes."],
    ["reembolso", "Una parte vuelve a ti.", "Compra al mismo precio en las tiendas asociadas y te devolvemos hasta un 3 %. A partir de 10 € lo pasas a tu cuenta."],
    ["regalo", "Invita y sube de nivel.", "Cada amiga que se une os da 3 € a las dos y sube tu porcentaje para siempre."],
  ];
  // apartado: [icono, para qué sirve, [pasos]]
  const A = {
    inicio: ["inicio", "Lo urgente de toda la casa en un vistazo.", ["Mira «Hoy en casa».", "Toca cualquier aviso para ir a él."]],
    facturas: ["facturas", "Saber si pagas de más en luz, gas, fibra o seguros.", ["Elige qué revisar.", "Sube una foto o el PDF.", "Te enseñamos lo que ahorrarías y cambias en un clic. En seguros solo te recordamos la renovación."]],
    luz: ["luz", "Ver tu consumo real hora a hora y la tarifa que te conviene.", ["Autoriza en Datadis con tu DNI y el CUPS de la factura.", "Te avisamos si otra tarifa te sale mejor."]],
    ayudas: ["ayudas", "Las ayudas, bonos y deducciones que te pueden tocar.", ["Revisa la lista.", "Toca «Cómo pedirla» para ver los pasos y papeles.", "Si cambia tu situación, actualiza el perfil."]],
    gasolina: ["gasolina", "La gasolinera más barata cerca, con precios oficiales del día.", ["Mira la lista.", "Toca «Cómo llegar»."]],
    ofertas: ["ofertas", "Ofertas en lo que compras, con lo que te devolvemos al lado.", ["Busca o entra en una categoría.", "Toca «Ver oferta»: compras en la tienda al mismo precio."]],
    reembolso: ["reembolso", "Lo que te devolvemos por tus compras y lo que llevas acumulado.", ["Lo pendiente se confirma cuando la tienda valida la compra.", "Desde 10 € confirmados, «Retirar a mi cuenta»."]],
    menu: ["menu", "Planificar las comidas y tener la lista hecha.", ["Acepta o cambia los platos propuestos.", "En «Compra» tienes la lista por pasillos.", "Marca lo que ya tienes en casa."]],
    tareas: ["tareas", "Repartir las tareas de casa sin discutir.", ["Elige por turnos o equilibrado.", "Marca lo hecho y suma estrellas.", "Canjead premios en «Premios»."]],
    armario: ["armario", "Saber qué tiene cada uno y qué se le ha quedado pequeño.", ["Añade prendas con su talla.", "Marca lo que se queda pequeño.", "Te enseñamos qué le falta en su talla o lo vendes."]],
    talla: ["ropa", "Ofertas en la talla y el número de cada peque.", ["Revisa por tipo de prenda.", "Toca «Ver» para ir a la tienda."]],
    vender: ["devolver", "Dar una segunda vida a la ropa pequeña.", ["Elige las prendas y su estado.", "Te preparamos el anuncio con precio orientativo.", "Publícalo en Vinted o Wallapop, o pásaselo a otra familia."]],
    cal: ["calendario", "Quién lleva, quién recoge y qué toca cada día.", ["Añade un plan y quién va.", "Filtra por persona.", "Marca los días en la otra casa."]],
    eventos: ["eventos", "Organizar un cumple o una celebración entre todos.", ["Crea el evento y su presupuesto.", "Reparte tareas.", "Apunta los gastos compartidos."]],
    docs: ["documentos", "Que no se te pase ninguna fecha: ITV, DNI, garantías, seguros.", ["Añade la fecha o haz una foto del documento.", "Te avisamos antes de que venza."]],
    pedidos: ["pedidos", "Tus pedidos y plazos de devolución en un sitio.", ["Lo que compras desde Viwai aparece solo.", "Para el resto, pega el número o el enlace de seguimiento, o usa «Compartir → Viwai» desde la tienda o el correo.", "Te avisamos antes de que acabe el plazo de devolución."]],
    wallet: ["wallet", "Tus tarjetas de cliente y tus entradas, a mano.", ["Escanea la tarjeta con la cámara o desde una foto.", "Las entradas: elige el PDF o la captura, o compártelas desde el correo.", "En caja o en la puerta, toca la tarjeta y enseña el código."]],
    mant: ["mantenimiento", "Cuidar la casa a tiempo para evitar averías caras.", ["Marca qué tienes en casa.", "Dinos cuándo lo hiciste por última vez.", "Te avisamos cuando toque."]],
    familia: ["familia", "Quién vive en casa y quién la gestiona contigo.", ["Añade miembros con su talla, su edad y, si quieres, su foto.", "Invita a otra persona adulta con su permiso."]],
    dinero: ["dinero", "Ver en qué se va el dinero, conectando tu banco.", ["Conecta tu banco.", "Revisa gastos por categoría y suscripciones."]],
  };
  g.VIWAI_AYUDA = A;
  const K = "pj2-ayuda";
  const lee = () => { try { return JSON.parse(localStorage.getItem(K) || "{}"); } catch (e) { return {}; } };
  const guarda = (o) => { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} };
  const ico = (n) => (g.viwaiIcono ? g.viwaiIcono(n) : "");

  function tarjeta(v) {
    const [ic, para, pasos] = A[v];
    return `<div class="ayu" role="note"><div class="ayu-h"><i>${ico(ic)}</i><span><small>Para qué sirve</small><b>${para}</b></span></div>
      <small>Cómo se usa</small><ol>${pasos.map((p) => `<li>${p}</li>`).join("")}</ol>
      <div class="btns"><button class="btn pri" data-ayu-ok="${v}">Entendido</button><button class="btn" data-ayu-no>No volver a mostrar</button></div></div>`;
  }
  // Se llama al entrar en cada apartado. forzar: desde el botón «?»
  g.viwaiAyuda = (v, forzar) => {
    document.querySelectorAll(".ayu").forEach((x) => x.remove());
    const q = document.getElementById("ayu-q"); if (q) { q.hidden = !A[v]; q.dataset.ayv = v; }
    const st = lee(), sec = document.getElementById("v-" + v);
    if (!A[v] || !sec || (!forzar && (st.nunca || st[v]))) return;
    sec.insertAdjacentHTML("afterbegin", tarjeta(v));
    if (forzar) scrollTo({ top: 0, behavior: "smooth" });
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ayu-ok],[data-ayu-no],#ayu-q,[data-tutorial],[data-ayuda-reset]"); if (!b) return;
    if (b.id === "ayu-q") { const ya = document.querySelector(".ayu"); if (ya) ya.remove(); else g.viwaiAyuda(b.dataset.ayv, true); return; }
    if (b.dataset.tutorial != null) { g.viwaiTutorial(); return; }
    if (b.dataset.ayudaReset != null) { guarda({}); if (g.toast) g.toast("Listo: verás la explicación al entrar en cada apartado"); return; }
    const st = lee();
    if (b.dataset.ayuOk) st[b.dataset.ayuOk] = 1; else st.nunca = 1;
    guarda(st); b.closest(".ayu").remove();
    if (b.dataset.ayuNo != null && g.toast) g.toast("Vale. Si la necesitas, toca «?» junto al título");
  });

  // Tutorial general: tarjetas deslizables con «Saltar»
  g.viwaiTutorial = () => new Promise((fin) => {
    const T = g.VIWAI_TUTORIAL; let i = 0;
    const d = document.createElement("div"); d.className = "tuto"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Tutorial de Viwai");
    const pinta = () => {
      const [ic, t, x] = T[i];
      d.innerHTML = `<div class="tuto-c"><button class="tuto-x" data-t="fin">Saltar</button><span class="tuto-i">${ico(ic)}</span>
        <span class="tuto-n">${i + 1} de ${T.length}</span><h2>${t}</h2><p>${x}</p>
        <div class="tuto-p">${T.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>
        <div class="btns">${i ? `<button class="btn" data-t="atras">Atrás</button>` : ""}<button class="btn pri" data-t="sig">${i === T.length - 1 ? "Empezar" : "Siguiente"}</button></div></div>`;
    };
    const cierra = () => { d.remove(); fin(); };
    d.addEventListener("click", (e) => { const t = e.target.closest("[data-t]")?.dataset.t; if (t === "fin") cierra(); if (t === "atras") { i--; pinta(); } if (t === "sig") { if (++i >= T.length) cierra(); else pinta(); } });
    let x0 = null;
    d.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (dx < -50 && i < T.length - 1) { i++; pinta(); } else if (dx > 50 && i > 0) { i--; pinta(); } });
    pinta(); document.body.appendChild(d);
  });
})(self);
