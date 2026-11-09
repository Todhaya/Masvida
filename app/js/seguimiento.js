// Viwai · reconoce el envío a partir de lo que pega o comparte la usuaria (un enlace de seguimiento o un número)
// y da el enlace oficial de seguimiento de la empresa de transporte. Sin conexión con nadie: solo abre su web.
(function (g) {
  var T = [
    { id: "correos", n: "Correos", dom: /correos\.(es|com)/, num: /^(P[QXK][A-Z0-9]{14,22}|[A-Z]{2}\d{9}ES)$/, url: "https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=" },
    { id: "seur", n: "SEUR", dom: /seur\.(com|es)/, num: /^\d{14,16}$/, url: "https://www.seur.com/livetracking/?segOnlineIdentificador=" },
    { id: "gls", n: "GLS", dom: /gls-(group|spain)\.|gls\.es/, num: /^\d{11,12}$/, url: "https://gls-group.com/ES/es/seguimiento-envio/?match=" },
    { id: "mrw", n: "MRW", dom: /mrw\.es/, num: /^\d{12}$/, url: "https://www.mrw.es/seguimiento_envios/MRW_resultados_consultas.asp?modo=nacional&envio=" },
    { id: "nacex", n: "Nacex", dom: /nacex\.(es|com)/, num: /^\d{4}\/?\d{8}$/, url: "https://www.nacex.es/seguimientoDetalle.do?agencia_origen=&numero_albaran=" },
    { id: "ups", n: "UPS", dom: /ups\.com/, num: /^1Z[A-Z0-9]{16}$/, url: "https://www.ups.com/track?loc=es_ES&tracknum=" },
    { id: "dhl", n: "DHL", dom: /dhl\.(com|es)/, num: /^(\d{10}|JD\d{18})$/, url: "https://www.dhl.com/es-es/home/tracking.html?tracking-id=" },
    { id: "amazon", n: "Amazon", dom: /amazon\.(es|com)|track\.amazon/, num: /^TBA\d{12}$/, url: "https://track.amazon.es/tracking/" },
    { id: "ctt", n: "CTT Express", dom: /cttexpress\.com/, num: /^\d{22}$/, url: "https://www.cttexpress.com/localizador-de-envios/?sc=" },
    { id: "inpost", n: "InPost", dom: /inpost\.(es|eu)/, num: /^\d{24}$/, url: "https://inpost.es/seguimiento/?number=" },
  ];
  function detectaEnvio(texto) {
    var s = String(texto || "").trim();
    if (!s) return null;
    var url = (s.match(/https?:\/\/\S+/) || [])[0];
    if (url) {
      var t1 = T.find(function (t) { return t.dom.test(url); });
      var n1 = (decodeURIComponent(url).match(/(?:tracking[-_]?(?:number|id)?|tracknum|envio|match|number|segOnlineIdentificador|albaran|sc)=([A-Z0-9\/]{6,})/i) || [])[1]
        || (url.match(/\/tracking\/([A-Z0-9]{6,})/i) || [])[1] || null;
      return { transportista: t1 ? t1.id : null, nombre: t1 ? t1.n : null, numero: n1, url: url };
    }
    var num = (s.toUpperCase().match(/[A-Z0-9\/]{8,}/g) || []).find(function (x) { return T.some(function (t) { return t.num.test(x); }); })
      || (s.toUpperCase().match(/[A-Z0-9]{8,}/) || [])[0] || null;
    if (!num) return null;
    var posibles = T.filter(function (t) { return t.num.test(num); });
    var t2 = posibles.length === 1 ? posibles[0] : null;
    return { transportista: t2 ? t2.id : null, nombre: t2 ? t2.n : null, numero: num, url: t2 ? t2.url + encodeURIComponent(num) : null,
      posibles: posibles.map(function (t) { return t.id; }) };
  }
  function enlaceDe(transportista, numero) {
    var t = T.find(function (x) { return x.id === transportista; });
    return t && numero ? t.url + encodeURIComponent(numero) : null;
  }
  g.viwaiTransportistas = T.map(function (t) { return { id: t.id, n: t.n }; });
  g.viwaiDetectaEnvio = detectaEnvio;
  g.viwaiEnlaceEnvio = enlaceDe;
})(typeof window !== "undefined" ? window : globalThis);
