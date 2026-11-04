# Puesta en marcha

Cuentas que tiene que crear Alba (con su correo; todas gratis al empezar). Las gestiones legales y de afiliación están en el documento «Masvida · Lo que tienes que gestionar tú».

## 1. Supabase (base de datos)

1. Crear cuenta en https://supabase.com y un proyecto llamado `masvida`, región **Frankfurt o París** (datos en la UE).
2. En *SQL Editor*, pegar y ejecutar `supabase/migrations/001_esquema.sql`.
3. En *Project Settings › API*, copiar la **URL** y la clave **anon** en `web/config.js`. La clave `service_role` no se copia nunca en el repositorio.
4. En *Authentication › Providers*, dejar activado solo **Email** (enlace mágico).

## 2. Cloudflare Pages (publicar la web y la app)

1. Crear cuenta en https://dash.cloudflare.com y, en *Workers & Pages › Create › Pages*, conectar el repositorio `Todhaya/masvida`.
2. Proyecto `masvida-web`: carpeta de salida `web`. Proyecto `masvida-app`: carpeta de salida `app`. Sin comando de compilación.
3. Conectar el dominio: `masvida.app` a la web y `app.masvida.app` a la app.

## 3. API de Claude (leer facturas)

1. Crear cuenta en https://console.anthropic.com, añadir un método de pago y crear una clave de API.
2. Poner un límite de gasto mensual (por ejemplo, 20 €).
3. Guardarla en Supabase como secreto `ANTHROPIC_API_KEY` (*Edge Functions › Secrets*). No pegarla en el chat ni en el repositorio.

## 4. Enlaces de afiliación

Cuando una red apruebe una tienda, su enlace de seguimiento se añade al secreto `ENLACES_JSON` de Supabase, con `{subid}` donde va el id del clic. Ejemplo de forma (no son ids reales):

```
{"octopus": "https://clk.tradedoubler.com/click?p=PROGRAMA&a=AFILIADA&epi={subid}&url={url}"}
```
