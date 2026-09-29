#!/usr/bin/env bash
# Genera las llaves (JWT) que usa la app en Vercel y las guarda en llaves-app.env.
# No las imprime: se leen directo en el servidor con `cat llaves-app.env`.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  local h p s
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '{"role":"%s","iss":"opportuni"}' "$1" | b64url)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}

umask 077
cat > llaves-app.env <<EOF
# Para Vercel (Settings > Environment Variables). No subir a git.
SUPABASE_URL=https://db.opportuni.xyz
SUPABASE_ANON_KEY=$(jwt anon)
DB_SERVICE_TOKEN=$(jwt service_role)
EOF
echo "llaves-app.env listo"
