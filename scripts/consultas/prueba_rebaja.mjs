// Prueba de solo lectura del comprobador «¿Es rebaja?»: llama a las funciones como la web (clave pública).
const URL_ = "https://adoznvxwqvcwyimqnxtj.supabase.co/rest/v1/rpc/", KEY = "sb_publishable_US1tdE0bVjHd26Iz6KNRLA_UiB8CLKo";
const llama = async (f, b) => { const t = Date.now(); const r = await fetch(URL_ + f, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(b) }); const x = await r.text(); console.log(f, JSON.stringify(b), "→", r.status, Date.now() - t + "ms", x.slice(0, 300)); };
for (const q of ["abrigo con capucha de inserciones imitacion joa gris", "abrigo capucha", "pulsera oso"])
  await llama("buscar_productos", { q, tienda: null, orden: "relevancia", limite: 12, desde: 0 });
await llama("historial_precio", { pid: "x" });
