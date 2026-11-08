// Viwai · cuenta instalaciones de la app y aperturas de la app instalada (sin datos personales).
(() => {
  const C = window.VIWAI; if (!C || navigator.webdriver) return;
  const suma = (campo) => fetch(C.supabaseUrl + "/rest/v1/rpc/suma_metrica", {
    method: "POST", keepalive: true,
    headers: { apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_fuente: "app", p_campo: campo }),
  }).catch(() => {});
  window.addEventListener("appinstalled", () => suma("instalaciones"));
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (instalada) suma("aperturas");
})();
