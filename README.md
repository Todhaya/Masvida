# Masvida

Ahorro sin esfuerzo para familias: revisa facturas, encuentra ayudas, organiza la casa y devuelve dinero por lo que ya se compra.
Eslogan: «Lo que ahorras, lo vives».

## Qué hay en este repositorio

| Carpeta | Qué es |
| --- | --- |
| `web/` | Web pública con lista de espera y textos legales (borradores). |
| `app/` | App web instalable en el móvil. Hoy es el prototipo con datos de ejemplo; se conecta a la base de datos en la fase 2. |
| `app/js/` | Lógica pura con tests: reembolso por tienda y niveles (`reembolso.js`), comparador de luz (`facturas.js`). |
| `data/` | Catálogo de tiendas con sus condiciones comprobadas y tarifas de luz verificadas. |
| `supabase/` | Esquema de base de datos con seguridad por hogar y funciones del servidor (`ir`: enlaces de afiliación; `leer-factura`: lectura con IA). |
| `docs/` | Arquitectura, decisiones y puesta en marcha. |
| `tests/` | Tests (`npm test`, sin dependencias). |

## Reglas que no se rompen

- **Sin datos verificados, la app calla.** Una tarifa sin precios comprobados no se compara; una tienda sin cashback confirmado no da reembolso.
- **La IA extrae, el código calcula.** La IA lee la factura; las cuentas las hace `app/js/`.
- **Ningún secreto en el repositorio.** Claves de API, ids de afiliada y la clave `service_role` van en los secretos de Supabase y Cloudflare.
- **Ningún dato personal de usuarias en el repositorio.** Los datos de prueba son inventados.

## Ejecutar los tests

```
npm test
```

Requiere Node 20 o superior. No hay dependencias que instalar.

## Puesta en marcha

Ver [docs/PUESTA_EN_MARCHA.md](docs/PUESTA_EN_MARCHA.md).
