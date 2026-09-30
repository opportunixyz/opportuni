# Rutas de opportuni.xyz

Mapa de todas las rutas de la app: qué hacen, quién las usa y qué variables de entorno las prenden. Sin valores: esos viven solo en Vercel (el repo es público). Detalle de producto en [prd-pasaporte-opportuni.md](prd-pasaporte-opportuni.md); base de datos en [infra/db/README.md](../infra/db/README.md).

**Quién:** *pública* = cualquiera; *puerta* = el navegador del joven (cookie `opp_dev`); *equipo* = sesión de /admin (`ADMIN_PASSWORD`); *Claude* = token OAuth del conector.

## Páginas

| Ruta | Quién | Qué es |
|---|---|---|
| `/` | pública | Home |
| `/vacantes`, `/vacantes/{id}` | pública | Vacantes activas y su detalle |
| `/v/{vacante}` y `/v/{vacante}/{grupo}` | pública | La puerta del pasaporte. Crawlers (preview de WhatsApp): Open Graph. Dispositivo conocido: registra el click y redirige. Nuevo: formulario del pasaporte y, con Stellar prendido, su cuenta con passkey o de respaldo. `{grupo}` es el grupo de WhatsApp (ver Grupos) |
| `/p/{slug}` | pública | Pasaporte público (el del QR): nombre e inicial del apellido y credenciales confirmadas con su prueba en Stellar |
| `/traccion` | pública | Cuentas en Stellar, credenciales y pasaportes, con gráfica y links a stellar.expert. Sin datos personales |
| `/postular/{id}` | pública | Formulario propio para vacantes sin URL externa |
| `/convocatorias`, `/chat`, `/cv`, `/cv/revision`, `/cv/asesoria` | pública | Resto del sitio (convocatorias, chat con IA, servicios de CV) |
| `/privacidad` | pública | Aviso de privacidad |
| `/admin/login`, `/admin` | equipo | Dashboard |
| `/oauth/autorizar` | pública | Login del equipo para conectar Claude (no se puede meter en un iframe) |
| `/robots.txt`, `/sitemap.xml` | pública | SEO. En producción todo host distinto de opportuni.xyz redirige a opportuni.xyz |

**Pestañas de /admin:** Vacantes (crear link, links por grupo, quién abrió, reporte interno, prender o apagar), Grupos (grupos de WhatsApp por comunidad y su impacto), Reportes (PDF para empresas, solo porcentajes), Jóvenes (pasaportes, su cuenta y emitir CV verificado), Formulario (preguntas de la puerta), CVs, Reuniones y Equipo (usuarios del conector de Claude y bitácora).

## API de la puerta del pasaporte

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /api/pasaporte` | puerta | Crea el pasaporte con el formulario, deja la cookie y registra el click. Pide Turnstile si está prendido; si Cloudflare no carga, lo crea "sin verificar" con tope de 30 por hora |
| `POST /api/pasaporte/entrar` | puerta | "Ya tengo pasaporte" con WhatsApp: liga el dispositivo sin confirmar |
| `GET /api/pasaporte/reto` | puerta | Reto para entrar con Face ID o huella |
| `POST /api/pasaporte/passkey` | puerta | Verifica la passkey (ES256) y liga el dispositivo como confirmado |
| `POST /api/pasaporte/cuenta` | puerta | La puerta avisa cómo terminó la cuenta: con passkey (se verifica en la cadena y se guarda) o falló (se crea la de respaldo) |
| `POST /api/pasaporte/relayer` | puerta (dispositivo confirmado) | Relayer del kit hacia Channels. Solo deja pasar el despliegue de la cuenta con passkey y el permiso de Opportuni |

## API del equipo (`/api/admin/*`, pide sesión de /admin)

| Ruta | Qué hace |
|---|---|
| `POST /api/admin/login`, `POST /api/admin/logout` | Sesión (la de login está abierta, con límite de intentos) |
| `GET, POST, PATCH /api/admin/vacantes` | Listar con cifras; `?abrieron=` quién abrió; `?vacante=` postulantes; crear; prender o apagar |
| `GET, POST, PATCH /api/admin/grupos` | Grupos de WhatsApp y sus cifras (`?vacante=` para una vacante); crear; renombrar o apagar |
| `GET, POST /api/admin/jovenes` | Buscar (`?q=`), vacantes de una persona (`?slug=`); POST emite el CV verificado |
| `GET /api/admin/reporte?vacante=` | PDF interno de una vacante (con nombres: no es para empresas) |
| `GET /api/admin/reporte-general?empresa=` | PDF para empresas: solo porcentajes, grupos de menos de 5 en "Otros" |
| `GET, POST /api/admin/formulario`, `PUT /api/admin/formulario/{id}` | Preguntas del formulario del pasaporte |
| `GET, POST, PATCH /api/admin/equipo` | Usuarios del conector, cerrar sesiones de Claude y bitácora |
| `GET /api/admin/submissions`, `GET /api/admin/download` | CVs y asesorías recibidos, descarga del PDF |

## Conector de Claude (MCP con OAuth)

| Ruta | Qué hace |
|---|---|
| `/api/mcp` | Servidor MCP (Streamable HTTP, sin estado): las acciones de /admin como herramientas. Sin token responde 401 con `resource_metadata` |
| `/.well-known/oauth-protected-resource` | Metadata del recurso (RFC 9728). La sirve `/api/oauth/metadata/recurso` |
| `/.well-known/oauth-authorization-server` | Metadata del servidor de autorización (RFC 8414). La sirve `/api/oauth/metadata/servidor` |
| `POST /api/oauth/registro` | Registro dinámico de clientes: solo claude.ai y Claude Code (loopback) |
| `POST /api/oauth/autorizar` | Formulario de `/oauth/autorizar`: usuario del equipo, emite el código |
| `POST /api/oauth/token` | Canje del código con PKCE S256 y refresh rotado |

Conectar: claude.ai › Ajustes › Conectores › `https://opportuni.xyz/api/mcp`; Claude Code: `claude mcp add --transport http opportuni https://opportuni.xyz/api/mcp`. Los usuarios se crean en /admin › Equipo.

## Otras API públicas

| Ruta | Qué hace |
|---|---|
| `GET /api/vacantes` | Vacantes activas |
| `GET, POST /api/postular` | Datos de la vacante y registrar un postulante del formulario propio |
| `POST /api/chat` | Chat con IA del sitio |
| `POST /api/upload`, `POST /api/cv` | Formulario de CV (con PDF opcional) después del pago |
| `POST /api/asesoria` | Registro de asesoría después del pago |

## Variables de entorno: qué prende qué

| Variables | Qué prenden |
|---|---|
| `DB_URL`, `DB_SERVICE_TOKEN`, `SUPABASE_ANON_KEY` (`SUPABASE_URL` de respaldo) | La base propia (PostgREST). Sin ellas no hay vacantes ni pasaportes |
| `DEVICE_COOKIE_SECRET`, `IP_HASH_SECRET` | Cookie del dispositivo y HMAC del IP en la puerta |
| `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | /admin y `/api/admin/*` |
| `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_NETWORK_PASSPHRASE`, `NEXT_PUBLIC_ACCOUNT_WASM_HASH`, `NEXT_PUBLIC_WEBAUTHN_VERIFIER`, `NEXT_PUBLIC_ED25519_VERIFIER`, `NEXT_PUBLIC_REGISTRO_ID`, `NEXT_PUBLIC_OPPORTUNI_ISSUER`, `OPPORTUNI_ISSUER_SECRET`, `CHANNELS_API_KEY` | Stellar. Sin todas, la puerta sigue como en la fase 1 (sin cuentas ni credenciales). La red la define el passphrase |
| `CUSTODIA_MASTER_KEY` | Cifrado de las llaves de las cuentas de respaldo. Solo en Vercel |
| `STELLAR_TOPE_HORA` | Tope de envíos a Stellar por hora (600 si no está) |
| `STELLAR_PAGA_EMISOR` | `siempre` o `nunca`; sin valor, el emisor paga solo si Channels falla |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile en la puerta. Solo con las dos |
| `ANTHROPIC_API_KEY` | `/api/chat` |
| `BLOB_READ_WRITE_TOKEN` | Guardar PDFs de CV en Vercel Blob |
| `NEXT_PUBLIC_CALENDLY_URL`, `NEXT_PUBLIC_ADMIN_CALENDAR_URL` | Agenda de asesorías y la vista de agenda en /admin |

Production usa Stellar mainnet. El Preview de la rama `feature/pasaporte-stellar` usa testnet en `beta.opportuni.xyz` (con la llave de acceso a Previews de Vercel).
