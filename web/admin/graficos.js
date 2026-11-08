// Viwai · gráficos del panel (SVG y HTML, sin librerías). Interactivos: pasa el ratón o toca para ver cifras,
// toca un trozo del donut o de su leyenda para resaltarlo (y, si el donut filtra algo, para filtrar).
// Paleta categórica validada (daltonismo y contraste) con el método de la skill de visualización: orden fijo.
// Los colores salen del sistema de diseño (diseno/tokens.css: --vw-g1…--vw-g6); estos son solo el respaldo.
const token = (n, x) => (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(n).trim()) || x;
export const PAL = ["#6A4CF5", "#1FA37A", "#E8A100", "#3B82F6", "#E0664F", "#C2479A"].map((x, i) => token("--vw-g" + (i + 1), x));
export const GRIS = token("--vw-g-otros", "#B9B4CC");

const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n0 = (x) => (Number(x) || 0).toLocaleString("es-ES");
let uid = 0;
const datos = new Map(); // id → datos de cada gráfico de líneas

// Donut con leyenda. segs: [{ k, l, v, c }]. filtra: nombre del filtro que se emite al tocar un trozo.
export function donut(segs, { centro = "Total", fmt = n0, filtra = "", vacio = "Sin datos todavía" } = {}) {
  const total = segs.reduce((s, x) => s + (x.v || 0), 0);
  const id = "d" + ++uid, R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  const vis = segs.filter((s) => s.v > 0);
  const gap = vis.length > 1 ? 1.6 : 0;
  const arcos = total ? vis.map((s) => {
    const largo = (s.v / total) * C, a = `<circle class="seg" data-seg="${esc(s.k)}" r="${R}" cx="60" cy="60" fill="none" stroke="${s.c}" stroke-width="15"
      stroke-dasharray="${Math.max(0.01, largo - gap)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"><title>${esc(s.l)}: ${esc(fmt(s.v))}</title></circle>`;
    acc += largo; return a;
  }).join("") : `<circle r="${R}" cx="60" cy="60" fill="none" stroke="var(--line)" stroke-width="15"/>`;
  return `<div class="donut" id="${id}" data-donut ${filtra ? `data-filtra="${esc(filtra)}"` : ""} data-total="${esc(fmt(total))}" data-centro="${esc(centro)}">
    <svg viewBox="0 0 120 120" role="img" aria-label="${esc(centro)}: ${segs.map((s) => `${s.l} ${fmt(s.v)}`).join(", ")}">${arcos}
      <text x="60" y="58" text-anchor="middle" class="dv" style="font-size:${String(fmt(total)).length > 6 ? 14 : 19}px">${esc(fmt(total))}</text><text x="60" y="74" text-anchor="middle" class="dl">${esc(centro)}</text></svg>
    <div class="dleg">${segs.map((s) => `<button class="dk" data-seg="${esc(s.k)}" ${s.v ? "" : "disabled"} data-v="${esc(fmt(s.v))}" data-l="${esc(s.l)}" data-p="${total ? Math.round((s.v / total) * 100) : 0}">
      <i style="background:${s.c}"></i><span>${esc(s.l)}</span><b>${esc(fmt(s.v))}</b></button>`).join("")}
      ${total ? "" : `<p class="note">${esc(vacio)}</p>`}</div></div>`;
}

// Líneas en el tiempo (un solo eje). series: [{ n, c, v: [números] }], x: etiquetas (fechas AAAA-MM-DD o texto)
export function lineas(series, x, { fmt = n0, alto = 190, area = true } = {}) {
  const id = "l" + ++uid, W = 640, H = alto, pt = 14, pb = 26, pl = 6, pr = 6;
  const max = Math.max(1, ...series.flatMap((s) => s.v));
  const techo = redondo(max);
  const px = (i) => pl + (x.length < 2 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (x.length - 1));
  const py = (v) => pt + (H - pt - pb) * (1 - v / techo);
  datos.set(id, { series, x, fmt, W, px });
  const guias = [0, 0.5, 1].map((f) => `<line x1="0" x2="${W}" y1="${py(techo * f)}" y2="${py(techo * f)}" class="gr"/><text x="${W - 2}" y="${py(techo * f) - 4}" text-anchor="end" class="ax">${esc(fmt(techo * f))}</text>`).join("");
  const etiq = x.map((d, i) => (i === 0 || i === x.length - 1 || (x.length > 8 && i === Math.floor(x.length / 2))) ? `<text x="${px(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === x.length - 1 ? "end" : "middle"}" class="ax">${esc(corta(d))}</text>` : "").join("");
  const trazos = series.map((s, si) => {
    const d = s.v.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join("");
    const relleno = area && si === 0 ? `<path d="${d}L${px(s.v.length - 1)},${py(0)}L${px(0)},${py(0)}Z" fill="url(#g${id})"/>` : "";
    return `${relleno}<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join("");
  const c0 = series[0]?.c || PAL[0];
  return `<div class="lc" id="${id}" data-lc><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(series.map((s) => s.n).join(", "))}">
      <defs><linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c0}" stop-opacity=".22"/><stop offset="1" stop-color="${c0}" stop-opacity="0"/></linearGradient></defs>
      ${guias}${trazos}${etiq}<line class="cruz" x1="0" x2="0" y1="${pt}" y2="${H - pb}" hidden/>
      ${series.map((s, si) => `<circle class="pto" data-s="${si}" r="4.5" fill="${s.c}" stroke="var(--surface)" stroke-width="2" hidden/>`).join("")}</svg>
    <div class="tip" hidden></div>
    ${series.length > 1 ? `<div class="leg">${series.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.n)} <b>${esc(fmt(s.v.reduce((a, b) => a + b, 0)))}</b></span>`).join("")}</div>` : ""}</div>`;
}

// Barras verticales (HTML). items: [{ l, v, v2? }] — v2 se apila encima en tono suave (p. ej. pendiente).
export function barras(items, { fmt = n0, c = PAL[0], n1 = "", n2 = "", alto = 150 } = {}) {
  const max = Math.max(1e-9, ...items.map((i) => (i.v || 0) + (i.v2 || 0)));
  const hay = items.some((i) => i.v || i.v2);
  return `<div class="bars" style="--h:${alto}px">${items.map((i) => `<div class="bar" tabindex="0" data-t="${esc(i.l)}: ${esc(fmt(i.v))}${n2 && i.v2 ? ` ${esc(n1)} · ${esc(fmt(i.v2))} ${esc(n2)}` : ""}">
      <div class="pila">${i.v2 ? `<span class="b2" style="height:${(i.v2 / max) * 100}%;background:${c}"></span>` : ""}<span class="b1" style="height:${hay ? Math.max(i.v ? 2 : 0, (i.v / max) * 100) : 0}%;background:${c}"></span></div>
      <small>${esc(i.l)}</small></div>`).join("")}</div>
    ${n2 ? `<div class="leg"><span><i style="background:${c}"></i>${esc(n1)}</span><span><i style="background:${c};opacity:.35"></i>${esc(n2)}</span></div>` : ""}`;
}

// Ranking horizontal. items: [{ l, v, c?, ir? }]
export function ranking(items, { fmt = n0, c = PAL[0], max: tope } = {}) {
  if (!items.length) return `<p class="note">Sin datos todavía.</p>`;
  const max = tope || Math.max(1, ...items.map((i) => i.v));
  return `<div class="rk">${items.map((i) => `<div class="rkf${i.ir ? " clic" : ""}" ${i.ir ? `data-ir="${esc(i.ir)}"` : ""}><span class="rkl">${esc(i.l)}</span>
    <span class="rkt"><i style="width:${Math.max(1.5, (i.v / max) * 100)}%;background:${i.c || c}"></i></span><b>${esc(fmt(i.v))}</b></div>`).join("")}</div>`;
}

// Anillo de progreso (0–100)
export function anillo(pct, { c = PAL[0], t = "" } = {}) {
  const R = 30, C = 2 * Math.PI * R, p = Math.max(0, Math.min(100, pct || 0));
  return `<svg class="ring" viewBox="0 0 72 72" role="img" aria-label="${esc(t)} ${p} %"><circle r="${R}" cx="36" cy="36" fill="none" stroke="var(--line)" stroke-width="7"/>
    <circle r="${R}" cx="36" cy="36" fill="none" stroke="${p >= 100 ? "var(--okc)" : c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(p / 100) * C} ${C}" transform="rotate(-90 36 36)"/>
    <text x="36" y="41" text-anchor="middle">${p}%</text></svg>`;
}

// Mini línea para las fichas de cifras
export function mini(v, c = PAL[0]) {
  if (!v?.length || !v.some(Boolean)) return "";
  const max = Math.max(1, ...v), W = 100, H = 28;
  const d = v.map((y, i) => `${i ? "L" : "M"}${((i * W) / Math.max(1, v.length - 1)).toFixed(1)},${(H - 2 - (y / max) * (H - 4)).toFixed(1)}`).join("");
  return `<svg class="mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${c}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>`;
}

// Diferencia contra el periodo anterior
export function delta(ahora, antes) {
  if (!antes && !ahora) return "";
  if (!antes) return `<span class="dt up">nuevo</span>`;
  const p = Math.round(((ahora - antes) / antes) * 100);
  return `<span class="dt ${p > 0 ? "up" : p < 0 ? "down" : ""}">${p > 0 ? "▲" : p < 0 ? "▼" : "="} ${Math.abs(p)} %</span>`;
}

const redondo = (m) => { const e = 10 ** Math.floor(Math.log10(m)); return Math.ceil(m / e) * e; };
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${+d.slice(8)} ${MES[+d.slice(5, 7) - 1]}` : /^\d{4}-\d{2}$/.test(d) ? MES[+d.slice(5, 7) - 1] : d);

// ---------- Interacción (delegada: vale para todo lo que se pinte después) ----------
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-donut] [data-seg]"); if (!s) return;
  const w = s.closest("[data-donut]"), k = s.dataset.seg, ya = w.dataset.sel === k;
  pintaDonut(w, ya ? "" : k);
  if (w.dataset.filtra) w.dispatchEvent(new CustomEvent("viwai:filtra", { bubbles: true, detail: { filtro: w.dataset.filtra, valor: ya ? "" : k } }));
});
export function pintaDonut(w, k) {
  w.dataset.sel = k || "";
  w.querySelectorAll("[data-seg]").forEach((x) => x.classList.toggle("apagado", !!k && x.dataset.seg !== k));
  const b = k && w.querySelector(`.dk[data-seg="${CSS.escape(k)}"]`);
  const dv = w.querySelector(".dv"); dv.textContent = b ? b.dataset.v : w.dataset.total; dv.style.fontSize = dv.textContent.length > 6 ? "14px" : "19px";
  w.querySelector(".dl").textContent = b ? `${b.dataset.l} · ${b.dataset.p} %` : w.dataset.centro;
}
document.addEventListener("pointermove", (e) => {
  const w = e.target.closest?.("[data-lc]");
  document.querySelectorAll("[data-lc].activo").forEach((x) => x !== w && apaga(x));
  if (!w) return;
  const d = datos.get(w.id); if (!d) return;
  const svg = w.querySelector("svg"), r = svg.getBoundingClientRect();
  const xs = ((e.clientX - r.left) / r.width) * d.W;
  let i = 0, best = Infinity;
  d.x.forEach((_, j) => { const dd = Math.abs(d.px(j) - xs); if (dd < best) { best = dd; i = j; } });
  w.classList.add("activo");
  const cruz = svg.querySelector(".cruz"); cruz.hidden = false; cruz.setAttribute("x1", d.px(i)); cruz.setAttribute("x2", d.px(i));
  const H = svg.viewBox.baseVal.height, pt = 14, pb = 26;
  const max = redondo(Math.max(1, ...d.series.flatMap((s) => s.v)));
  svg.querySelectorAll(".pto").forEach((p) => { const s = d.series[+p.dataset.s]; p.hidden = false; p.setAttribute("cx", d.px(i)); p.setAttribute("cy", pt + (H - pt - pb) * (1 - s.v[i] / max)); });
  const tip = w.querySelector(".tip"); tip.hidden = false;
  tip.innerHTML = `<b>${esc(corta(d.x[i]))}</b>${d.series.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.n)} <b>${esc(d.fmt(s.v[i]))}</b></span>`).join("")}`;
  const xPx = (d.px(i) / d.W) * r.width;
  tip.style.left = Math.min(Math.max(0, xPx - tip.offsetWidth / 2), r.width - tip.offsetWidth) + "px";
});
const apaga = (w) => { w.classList.remove("activo"); w.querySelectorAll(".cruz,.pto,.tip").forEach((x) => (x.hidden = true)); };
document.addEventListener("pointerleave", (e) => { if (e.target?.matches?.("[data-lc]")) apaga(e.target); }, true);
