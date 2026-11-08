import test from "node:test";
import assert from "node:assert/strict";
import { conSubid } from "../web/clic.js";
const id = "11111111-2222-4333-8444-555555555555";

test("Awin: clickref", () => {
  assert.equal(conSubid("https://www.awin1.com/cread.php?awinmid=1&awinaffid=3148698", id), `https://www.awin1.com/cread.php?awinmid=1&awinaffid=3148698&clickref=${id}`);
});
test("Admitad: subid", () => {
  assert.match(conSubid("https://ad.admitad.com/g/abc/?ulp=https%3A%2F%2Fx.es", id), new RegExp(`subid=${id}`));
});
test("CJ: sid en enlaces de clic y en la ruta de los deep links", () => {
  assert.match(conSubid("https://www.anrdoezrs.net/click-8120936-1234", id), new RegExp(`\\?sid=${id}$`));
  assert.equal(conSubid("https://www.anrdoezrs.net/links/8120936/type/dlg/https://www.notino.es/", id), `https://www.anrdoezrs.net/links/8120936/type/dlg/sid/${id}/https://www.notino.es/`);
});
test("Tradedoubler: epi antes de url", () => {
  assert.equal(conSubid("https://clk.tradedoubler.com/click?p=1&a=2&url=https%3A%2F%2Fx.es", id), `https://clk.tradedoubler.com/click?p=1&a=2&epi=${id}&url=https%3A%2F%2Fx.es`);
});
test("Tiendas sin subid y enlaces raros se quedan igual", () => {
  assert.equal(conSubid("https://www.amazon.es/dp/B0?tag=viwai-21", id), "https://www.amazon.es/dp/B0?tag=viwai-21");
  assert.equal(conSubid("no es una url", id), "no es una url");
});
