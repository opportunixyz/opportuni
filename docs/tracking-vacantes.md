# Tracking de vacantes

Desde la fase 1 del Pasaporte Opportuni todo vive en la **base propia** (Postgres + PostgREST en `db.opportuni.xyz`, ver [infra/db/README.md](../infra/db/README.md) y el PRD, secciones 5 F1 y 8.7). De Supabase no se migró nada.

## Cómo funciona un link

`opportuni.xyz/v/{slug}` (o `/v/{slug}/{canal}`) es la puerta del pasaporte:

1. **Crawlers** (preview de WhatsApp, redes, buscadores): reciben el Open Graph de la vacante y no cuentan como click.
2. **Dispositivo conocido** (cookie `opp_dev` firmada): el click se registra después de responder y el joven llega directo a la vacante.
3. **Dispositivo nuevo**: ve el formulario del pasaporte una sola vez. Al enviarlo se crea su pasaporte y llega a la vacante. Si su WhatsApp ya tiene pasaporte, entra con "Ya tengo pasaporte" y el dispositivo queda sin confirmar.
4. **Si la base no responde**, el link redirige igual.

El destino es `url_destino` de la vacante; si no tiene, su detalle interno `/vacantes/{slug}` (con el formulario propio `/postular/{slug}`).

## Crear una vacante

En **/admin › Vacantes › Nueva vacante**: pegar la URL de la vacante, el puesto y la empresa. El link sale solo (`pm-nubank`) y se puede editar. Desde ahí también se apaga un link sin borrar sus datos.

## Qué se guarda por click

Tabla `vacante_clicks`: pasaporte, dispositivo, vacante, canal, estado y país del IP (headers de Vercel), HMAC del IP, tipo de dispositivo, sistema, navegador, idioma, si vino de un navegador dentro de una app y si es repetido. Nunca el IP en claro ni la ciudad.

## Código

- `app/v/[id]/[[...canal]]/page.tsx`: la puerta.
- `app/api/pasaporte/route.ts` y `app/api/pasaporte/entrar/route.ts`: crear el pasaporte y "Ya tengo pasaporte".
- `app/lib/pasaporte/*`: cookie del dispositivo, metadata, formulario y términos.
- `app/lib/admin/*`: capa de servicio del admin (vacantes, formulario, jóvenes).
- `app/lib/supabase.ts`: cliente de la base (anon para lo público, service_role solo en servidor).
- `db/migrations/0002_pasaporte.sql`: tablas y funciones de la fase 1.

## Seguridad

- El rol anon solo lee vacantes activas e inserta postulantes. Todo lo del pasaporte (clicks, pasaportes, dispositivos, formulario, eventos) y las funciones de admin son solo de `service_role`, que usa la app desde el servidor con `DB_SERVICE_TOKEN`.
- /admin y `/api/admin/*` piden la sesión firmada (`ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET`).
- El reporte PDF de /admin es interno (trae nombres y WhatsApp de postulantes). A las empresas solo van porcentajes (fase 3).
