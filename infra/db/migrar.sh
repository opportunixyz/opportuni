#!/usr/bin/env bash
# Aplica en orden las migraciones que todavía no están en meta.schema_migrations.
# En el servidor las busca en ./migrations; en el repo, en ../../db/migrations.
set -euo pipefail
cd "$(dirname "$0")"

dir=migrations
[ -d "$dir" ] || dir=../../db/migrations

psql() { docker compose exec -T postgres psql -U postgres -d opportuni -v ON_ERROR_STOP=1 -q "$@"; }

psql -c "create schema if not exists meta;
         create table if not exists meta.schema_migrations (
           version text primary key,
           applied_at timestamptz not null default now());" </dev/null

for f in "$dir"/*.sql; do
  v=$(basename "$f" .sql)
  [[ "$v" =~ ^[0-9]{4}_[a-z0-9_]+$ ]] || { echo "nombre de migración inválido: $v" >&2; exit 1; }
  if [ -z "$(psql -tAc "select 1 from meta.schema_migrations where version = '$v'" </dev/null)" ]; then
    echo "aplicando $v"
    { echo "begin;"; cat "$f"; echo "insert into meta.schema_migrations (version) values ('$v');"; echo "commit;"; } | psql
  fi
done

# El password de authenticator vive solo en .env; va por stdin para que no salga en ps.
set -a; . ./.env; set +a
printf "alter role authenticator with password '%s';\n" "$AUTHENTICATOR_PASSWORD" | psql
psql -c "notify pgrst, 'reload schema';" </dev/null
echo "migraciones al día"
