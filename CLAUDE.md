# Opportuni (repo opportunixyz/opportuni)

Web de Opportuni en Next.js 14 (App Router), PostgreSQL con Docker y Vercel. Comunidad de más de 12 mil jóvenes en México y Colombia.

**El repo es público.** Nunca commitear secretos, llaves, IPs ni accesos del servidor (tampoco en docs).

## Feature en curso: Pasaporte Opportuni (sep 2026)

**Fuente de verdad: [docs/prd-pasaporte-opportuni.md](docs/prd-pasaporte-opportuni.md).** Leerlo antes de tocar código. También en Notion: "PRD · Pasaporte Opportuni v1" (la copia de Notion es anterior a la revisión del 28 sep).

Resumen: todo link de vacante pasa por `opportuni.xyz/v/{slug}`. La primera vez el joven llena el formulario del pasaporte (nombre, WhatsApp, estado, área de interés), acepta términos y usa su passkey, y cae en la vacante; después cada click va directo y queda registrado en la base con su pasaporte, canal y metadata. El pasaporte es una smart account en Stellar mainnet (`smart-account-kit`) con un permiso limitado para Opportuni (context rule con signer delegado), y Opportuni emite credenciales `vacante` (automática) y `cv_verificado` (manual) en un contrato de registro en Soroban. Fees con OpenZeppelin Channels y RPC gratuita. Base en servidor propio en Hetzner.

Decisiones ya tomadas (no reabrir):
- **`main` es la base** (26 sep se movió al commit de `sinlogin` del 30 ago, que ya retiró `@accesly/*`, la wallet y los pagos on-chain; dependían del backend en AWS, que ya no se paga). El `main` viejo de febrero quedó como `main-feb-2026`, solo de respaldo.
- **El pasaporte es obligatorio para ver vacantes** (28 sep). Sin "Ahora no". Términos y aviso de privacidad se aceptan una sola vez; el dispositivo se reconoce con cookie `httpOnly`.
- **Formulario del pasaporte** (autorizado por Vianey el 29 sep): nombre, WhatsApp, estado, área de interés y rango de edad. Se llena una sola vez, cada pregunta con su explicación, vive solo en la base (nunca en cadena) y se edita desde /admin. Una pregunta nueva no se le hace a quien ya tiene pasaporte. Áreas y edad como listas cerradas para poder sacar porcentajes. Solo mayores de 18: el rango de edad empieza en 18 y la casilla lo declara.
- **Otro dispositivo:** "Ya tengo pasaporte" con passkey deja el dispositivo confirmado; con solo el WhatsApp queda sin confirmar (suma clicks, no emite en Stellar ni abre el detalle privado).
- **A las empresas solo porcentajes, en PDF:** por estado, área, edad y de clicks a sus vacantes. Nunca nombres, WhatsApp ni ciudad. Grupos de menos de 5 personas van a "Otros", y la regla vive en funciones de la base. Lo único individual que ve una empresa es el pasaporte público `/p/{slug}`, si el joven le da su QR.
- **Ver la vacante nunca depende de la passkey:** si falla, se crea una cuenta de respaldo con la llave cifrada (llave maestra solo en Vercel) y el joven llega a la vacante. Si la base no responde, el link redirige igual.
- El formulario es el de la vacante externa, no el nuestro. Un click se registra como `vacante` ("Vacante abierta vía Opportuni"), **nunca como postulación**: no sabemos si llenó el formulario.
- El WhatsApp de quien da click no se puede leer del link: se pide una vez en la puerta. El link acepta un canal opcional (`/v/{slug}/{canal}`) desde la fase 1, pero los links por grupo (10 grupos de Opportuni MX) van en la fase 4.
- `cv_verificado` es manual: Vianey lo emite a quien pagó, desde /admin o la API.
- `/admin` sigue apagado en `main` (flag `ADMIN_API_ENABLED`, rutas en 503) hasta tener contraseña en env (`ADMIN_PASSWORD`) y cookie firmada. Los componentes del admin viejo están en el commit `c13f935`.
- API de admin con llaves por rol (`admin` para Roman, `operacion` para Vianey), guardadas como hash, solo en `Authorization: Bearer`, todo en `admin_audit`. /admin, la API y el servidor MCP comparten una sola capa de servicio.
- Vianey opera desde claude.ai web con un conector (el mismo servidor MCP con login OAuth), en v1.1; mientras tanto usa /admin. Roman usa el MCP desde Claude Code con su llave.
- Login con Google solo en v1.1 y solo si los errores de passkey lo justifican (Google bloquea su login dentro de Instagram, Facebook y TikTok).
- Metadata de clicks: solo la de la tabla de F1 del PRD. El estado que cuenta es el del formulario; del IP solo se guardan estado, país y un HMAC. Nunca IP en claro, ciudad, GPS, huella del navegador ni píxeles de terceros.
- `@stellar/stellar-sdk` 16.3.x, **no 17**.
- En cadena solo hash con salt. Nada de nombre, WhatsApp, ciudad, empresa ni puesto.
- `rpId` fijo `opportuni.xyz`; nunca probar passkeys desde `*.vercel.app`.
- El contrato de registro vive en este repo, en `contracts/credential-registry` (es del producto Opportuni, no de Accesly).
- **No se usan los contratos ni el SDK de Accesly** (`Accesly/SmartContracts`, `@accesly/*`). La smart account y el verificador de passkeys son los de OpenZeppelin que `smart-account-kit` ya tiene desplegados en mainnet (ver PRD 8.2).
- **Base nueva en PostgreSQL con Docker en Hetzner**, que arranca vacía: de Supabase (proyecto `gbdlfmkenfldrjnzxqst`, de la cuenta de Accesly) no se migra nada. Esquema con migraciones SQL en `db/migrations/`. La app la usa por PostgREST detrás de Caddy (PRD 8.10). El puerto de Postgres nunca se publica a internet. Los respaldos nunca van a la cuenta de Accesly.

Plan por fases (PRD sección 10): 0 base propia, 1 links, formulario y puerta, 2 Stellar (arranca de cero: los gates del 26 y 27 sep no se corrieron; solo se comprobó que en iPhone el link de WhatsApp abre Safari y la passkey funciona), 3 operación y API, 4 conector de Claude para Vianey.

Servidor: acceso de Claude Code con `ssh opportuni-db` (usuario `claude`, llave propia, permiso en `.claude/settings.local.json`). Antes de cambiar algo en el servidor, proponerlo y esperar el visto bueno de Roman.

## Git

- Commits como el usuario **opportunixyz** (identidad configurada solo en este repo). El código de Opportuni no vive en la cuenta de Accesly: son empresas separadas.
- Trabajar en `feature/pasaporte-stellar` (sale de `main`) y fusionar por PR. Nunca commits directos a `main`.
- Deploy: Vercel de la cuenta opportunixyz (Hobby), rama de producción `main`, dominio `opportuni.xyz`.

## Copy

- Español, voz cercana de Opportuni, sin guiones largos.
- Comunidad: "más de 12 mil jóvenes", nunca 10 mil.
- Marca: rosa `#e3216d`, naranja `#f89b0e`, lila `#7c5cfc`, teal `#0ec4a9`, cream `#fdf6ee`, dark `#1a1a2e`; Gabarito (títulos), Bricolage Grotesque (texto), Playfair Display itálica (énfasis). Clases existentes: `bento`, `btn-rosa`, `input-bento`.
