# Arquitectura

Objetivo: coste casi cero hasta miles de familias, sin servidores que mantener y sin depender de ningún ordenador.

```
Navegador (web/ y app/, estáticos)
   │  lectura y escritura de datos del hogar (RLS: cada hogar solo ve lo suyo)
   ▼
Supabase: Postgres + Auth (enlace mágico por correo) + Storage (facturas, privado)
   │
   ├─ función ir            → apunta el clic y redirige a la tienda con el subid
   ├─ función leer-factura  → envía la factura a la API de Claude y devuelve datos sin identificadores
   └─ (fase 2) importar-comisiones → descarga a diario las comisiones de Awin, Tradedoubler, etc.
                                  y crea los movimientos de reembolso con app/js/reembolso.js
```

- **Alojamiento de `web/` y `app/`:** Cloudflare Pages (gratis), conectado a este repositorio. Cada push a `main` publica.
- **Sin paso de compilación:** HTML, CSS y JavaScript con módulos nativos. Menos piezas, menos fallos.
- **Atribución de comisiones:** cada clic tiene un id (`clics.id`) que viaja a la red como subid (`clickref` en Awin, `epi` en Tradedoubler). Al importar comisiones se cruza por ese id.
- **Dinero:** el reembolso se crea como `pendiente` al llegar la comisión y pasa a `confirmada` cuando la red la confirma. Solo lo confirmado se puede retirar.
- **Amazon:** sus enlaces se muestran sin reembolso (lo prohíben sus normas) y, dentro de una app, solo cuentan si la app está en Apple o Google Play.

## Fases

1. **Base (hecho):** esquema, funciones, lógica de reembolso y comparador con tests, web con lista de espera, textos legales en borrador.
2. **App conectada:** inicio de sesión, perfil y familia, módulos guardados en la base de datos, facturas leídas por IA, ofertas con enlaces reales.
3. **Comisiones:** importación diaria desde las redes, saldo y retiradas, premios por invitación.
4. **Panel para Alba:** familias activas, clics, comisiones por tienda, reembolso pendiente.
5. **Tiendas de apps y Mi dinero.**
