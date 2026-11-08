// Viwai · enlaces de afiliada con id de clic.
// Al pinchar en un enlace de tienda (rel="sponsored" y data-tienda) se crea un id, se añade al enlace como «subid»
// de la red (así la comisión vuelve con él) y se apunta el clic. Sin cookies ni datos guardados en el navegador.
export const PARAMS = [
  [/(^|\.)awin1\.com$/, "clickref"],
  [/(^|\.)(admitad\.com|lenkmio\.com|alitems\.co[m]?|ali\.click|aliclick\.com|admitad\.pro|tc\.tradetracker\.net)$/, "subid"],
  [/(^|\.)(anrdoezrs\.net|jdoqocy\.com|tkqlhce\.com|dpbolvw\.net|kqzyfj\.com|qksrv\.net|emjcd\.com)$/, "sid"],
  [/(^|\.)tradedoubler\.com$/, "epi"],
];

export function conSubid(url, id) {
  let u;
  try { u = new URL(url); } catch { return url; }
  // Admitad usa muchos dominios (rzekl.com, alitems…), pero todos sus enlaces son /g/<código>/
  const regla = PARAMS.find(([re]) => re.test(u.hostname)) || (/^\/g\/[0-9a-f]{10,}\/?$/i.test(u.pathname) ? [null, "subid"] : null);
  if (!regla) return url;
  const p = regla[1];
  // CJ con enlaces del tipo /links/<pid>/type/dlg/<url>: el sid va en la ruta
  if (p === "sid" && /\/type\/dlg\//.test(u.pathname) && !/\/sid\//.test(u.pathname)) return url.replace("/type/dlg/", `/type/dlg/sid/${id}/`);
  // Tradedoubler: «url=» tiene que ir el último
  if (p === "epi" && /[?&]url=/.test(url)) return url.replace(/([?&])url=/, `$1epi=${id}&url=`);
  u.searchParams.set(p, id);
  return u.toString();
}

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

function apunta(a) {
  const C = window.VIWAI, tienda = a.dataset.tienda;
  if (!C || !tienda || navigator.webdriver) return;
  const original = a.dataset.href || (a.dataset.href = a.href);
  const id = uuid();
  a.href = conSubid(original, id);
  fetch(C.supabaseUrl + "/rest/v1/rpc/registra_clic", {
    method: "POST", keepalive: true,
    headers: { apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_id: id, p_tienda: tienda, p_origen: a.dataset.origen || "web" + location.pathname.replace(/\/$/, "").replace(/\//g, "-") }),
  }).catch(() => {});
}

if (typeof document !== "undefined") {
  const al = (e) => { if (e.button > 1) return; const a = e.target.closest?.('a[rel~="sponsored"][data-tienda]'); if (a) apunta(a); };
  document.addEventListener("click", al, true);
  document.addEventListener("auxclick", al, true);
}
