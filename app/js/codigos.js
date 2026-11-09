// Viwai · dibuja de verdad los códigos de las tarjetas (EAN-13, EAN-8, Code 128 y QR) para que el lector de la caja los lea,
// y escanea tarjetas con la cámara o desde una foto. Lectura: html5-qrcode (Apache 2.0, vendor/); QR: qrcode-generator (MIT, vendor/).
(function (g) {
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const R = L.map((p) => p.replace(/./g, (c) => (c === "0" ? "1" : "0")));
  const G = R.map((p) => p.split("").reverse().join(""));
  const PAR = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
  const C128 = ("212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112").split(" ");

  const sumaEAN = (d) => (10 - (d.split("").reverse().reduce((a, c, i) => a + +c * (i % 2 ? 1 : 3), 0) % 10)) % 10;
  const ean = (num) => {
    if (num.length === 13 || num.length === 8) num = num.slice(0, -1); // se recalcula el dígito de control
    if (num.length === 12) {
      const d = num + sumaEAN(num), p = PAR[+d[0]];
      return "101" + d.slice(1, 7).split("").map((c, i) => (p[i] === "L" ? L : G)[+c]).join("") + "01010" + d.slice(7).split("").map((c) => R[+c]).join("") + "101";
    }
    const d = num + sumaEAN(num);
    return "101" + d.slice(0, 4).split("").map((c) => L[+c]).join("") + "01010" + d.slice(4).split("").map((c) => R[+c]).join("") + "101";
  };
  const code128 = (t) => {
    const v = [104, ...t.split("").map((c) => c.charCodeAt(0) - 32)];
    v.push(v.reduce((a, x, i) => a + x * (i || 1), 0) % 103, 106);
    return v.map((x) => C128[x].split("").map((w, i) => (i % 2 ? "0" : "1").repeat(+w)).join("")).join("");
  };
  const svgBarras = (bits, alto = 70) => {
    let x = 10, r = "";
    for (let i = 0; i < bits.length; ) { let n = 0; while (bits[i + n] === bits[i]) n++; if (bits[i] === "1") r += `<rect x="${x}" width="${n}" height="${alto}"/>`; x += n; i += n; }
    return `<svg class="cod" viewBox="0 0 ${x + 10} ${alto}" preserveAspectRatio="none" role="img" aria-label="Código de barras">${r}</svg>`;
  };
  // formato: el que dio el lector (EAN_13, EAN_8, UPC_A, CODE_128, QR_CODE…). Sin formato: EAN si son 8 o 13 cifras, si no Code 128.
  g.viwaiCodigoSVG = (texto, formato) => {
    const t = String(texto || "").trim(), dig = t.replace(/\s/g, "");
    if (/QR|DATA_MATRIX|AZTEC|PDF_417/.test(formato || "") && g.qrcode) {
      const q = g.qrcode(0, "M"); q.addData(t); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace("<svg ", '<svg class="cod qr" ');
    }
    const valido = (d) => (d.length === 13 || d.length === 8) && sumaEAN(d.slice(0, -1)) === +d.slice(-1);
    if (/^\d+$/.test(dig) && (formato === "UPC_A" ? dig.length === 12 : (/^EAN/.test(formato || "") || !formato) && valido(dig)))
      return svgBarras(ean(formato === "UPC_A" ? "0" + dig : dig));
    if (/^[\x20-\x7e]+$/.test(t)) return svgBarras(code128(t));
    return "";
  };

  // Escaneo: carga el lector solo cuando hace falta
  let carga;
  const lector = () => carga || (carga = g.__Html5QrcodeLibrary__ ? Promise.resolve() : new Promise((ok, ko) => {
    const s = document.createElement("script"); s.src = "vendor/html5-qrcode.min.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
  }));
  const conf = { verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } };
  const formato = (r) => r?.result?.format?.formatName || r?.format?.formatName || "";
  g.viwaiEscaneaFoto = async (file) => {
    await lector(); const L5 = g.__Html5QrcodeLibrary__;
    let div = document.getElementById("vw-scan-tmp");
    if (!div) { div = document.createElement("div"); div.id = "vw-scan-tmp"; div.hidden = true; document.body.appendChild(div); }
    const h = new L5.Html5Qrcode("vw-scan-tmp", conf);
    const r = await h.scanFileV2(file, false);
    return { texto: r.decodedText, formato: formato(r) };
  };
  // Cámara a pantalla completa: devuelve {texto, formato} o null si se cierra
  g.viwaiEscaneaCamara = async () => {
    await lector(); const L5 = g.__Html5QrcodeLibrary__;
    const capa = document.createElement("div"); capa.className = "vw-scan";
    capa.innerHTML = `<div id="vw-scan-v"></div><p>Apunta al código de barras o al QR de la tarjeta</p><button class="btn">Cerrar</button>`;
    document.body.appendChild(capa);
    const h = new L5.Html5Qrcode("vw-scan-v", conf);
    return new Promise((ok) => {
      let hecho = false;
      const fin = async (v) => { if (hecho) return; hecho = true; try { await h.stop(); } catch (e) {} capa.remove(); ok(v); };
      capa.querySelector("button").onclick = () => fin(null);
      h.start({ facingMode: "environment" }, { fps: 12, qrbox: (w, hh) => ({ width: Math.min(w, 320) * 0.9, height: Math.min(hh, 220) }) },
        (txt, r) => { navigator.vibrate?.(60); fin({ texto: txt, formato: formato(r) }); }, () => {})
        .catch(() => { fin(undefined); });
    });
  };
})(self);
