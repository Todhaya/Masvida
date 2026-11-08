#!/usr/bin/env bash
# Viwai · rehace todos los vídeos de funciones con la app actual. Uso: bash marketing/motor/todos.sh <carpeta de trabajo>
set -euo pipefail
R="$(cd "$(dirname "$0")/../.." && pwd)"; W="${1:?carpeta de trabajo}"; mkdir -p "$W/proto"
python3 "$R/tools/publicar_prototipo.py" "$W/proto/index.html"
ln -sfn "$R/app/img" "$W/proto/img"
cd "$W"
node "$R/marketing/motor/cap.cjs" proto/index.html .
for v in ${VIDEOS:-facturas menu armario gasolina casa ofertas}; do
  node "$R/marketing/motor/render2.cjs" "$R/marketing/motor/$v.json" "$v"
  ffmpeg -y -loglevel error -f concat -safe 0 -i "${v}_list.txt" -f lavfi -i anullsrc=r=44100:cl=stereo -shortest \
    -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -crf 20 -movflags +faststart -c:a aac -b:a 64k "$R/marketing/videos/viwai-$v.mp4"
  echo "viwai-$v.mp4 listo"
done
