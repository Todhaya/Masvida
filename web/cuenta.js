// Viwai · cuenta una visita a la web (sin cookies ni nada guardado en tu navegador).
(() => {
  const C = window.VIWAI; if (!C || /^\/admin/.test(location.pathname) || navigator.webdriver) return;
  fetch(C.supabaseUrl + "/rest/v1/rpc/suma_metrica", {
    method: "POST", keepalive: true,
    headers: { apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_fuente: "web", p_campo: "visitas" }),
  }).catch(() => {});
})();
