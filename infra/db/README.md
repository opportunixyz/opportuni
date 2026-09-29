# Base propia de Opportuni

Postgres 16 + PostgREST detrás de Caddy, en Docker, en el servidor de Opportuni (PRD 8.10). La app habla con `https://db.opportuni.xyz/rest/v1/`, la misma ruta que Supabase, así `app/lib/supabase.ts` solo cambia de variables.

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Los tres contenedores. Solo Caddy publica puertos (80 y 443); **el puerto de Postgres nunca se publica** |
| `Caddyfile` | HTTPS automático para `db.opportuni.xyz` y proxy a PostgREST |
| `.env.example` | Los tres secretos del servidor. El `.env` real vive solo en el servidor |
| `migrar.sh` | Aplica las migraciones de `db/migrations` que falten |
| `generar-llaves.sh` | Crea `llaves-app.env` con las llaves para Vercel (anon y servicio) |
| `respaldo.sh` | Respaldo diario en `/var/backups/opportuni-db`, guarda 14 días |

## Desplegar

En el servidor, como root, en `/opt/opportuni-db` (esta carpeta más `db/migrations` copiada como `migrations/`):

```bash
cp .env.example .env && chmod 600 .env   # llenar con openssl rand -hex 32
docker compose up -d
./migrar.sh
docker compose restart postgrest          # la primera vez, ya con el password de authenticator
./generar-llaves.sh
```

Requiere el registro DNS `db.opportuni.xyz` apuntando al servidor para que Caddy saque el certificado.

## Respaldo

`/etc/cron.d/opportuni-db`:

```
15 9 * * * root /opt/opportuni-db/respaldo.sh >> /var/log/opportuni-db-respaldo.log 2>&1
```

Restaurar en una base de prueba:

```bash
docker compose exec -T postgres createdb -U postgres prueba
docker compose exec -T postgres pg_restore -U postgres -d prueba < /var/backups/opportuni-db/opportuni-FECHA.dump
```

En un servidor nuevo, cargar primero `roles-FECHA.sql` y volver a correr `migrar.sh` para poner el password de authenticator.
