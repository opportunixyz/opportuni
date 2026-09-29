#!/usr/bin/env bash
# Respaldo diario en el disco del mismo servidor: datos (pg_dump) y roles sin passwords,
# que pg_dump no incluye y hacen falta para restaurar en un servidor nuevo.
# Pendiente: copia fuera del servidor (R2 o un Supabase de la cuenta de Opportuni).
set -euo pipefail
# </dev/null en cada exec: docker compose exec -T se come la entrada estándar.
cd /opt/opportuni-db

dir=/var/backups/opportuni-db
install -d -m 700 "$dir"
fecha=$(date -u +%Y%m%dT%H%M%SZ)

docker compose exec -T postgres pg_dump -U postgres -d opportuni -Fc </dev/null > "$dir/opportuni-$fecha.dump.tmp"
mv "$dir/opportuni-$fecha.dump.tmp" "$dir/opportuni-$fecha.dump"
docker compose exec -T postgres pg_dumpall -U postgres --roles-only --no-role-passwords </dev/null > "$dir/roles-$fecha.sql"

find "$dir" \( -name 'opportuni-*.dump' -o -name 'roles-*.sql' \) -mtime +14 -delete
