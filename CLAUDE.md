# Opportuni (repo opportunixyz/opportuni)

Web de Opportuni en Next.js 14 (App Router), Supabase y Vercel. Comunidad de más de 12 mil jóvenes en México y Colombia.

## Feature en curso: Pasaporte Opportuni (sep 2026)

**Fuente de verdad: [docs/prd-pasaporte-opportuni.md](docs/prd-pasaporte-opportuni.md).** Leerlo antes de tocar código. También en Notion: "PRD · Pasaporte Opportuni v1".

Resumen: historial laboral verificado en Stellar mainnet. El joven crea una smart account con passkey (`smart-account-kit`) al postularse, da un permiso limitado a Opportuni (context rule con signer delegado) y Opportuni emite credenciales `postulacion` y `cv_verificado` en un contrato de registro en Soroban. Fees con OpenZeppelin Channels y RPC gratuita. Sin AWS.

Decisiones ya tomadas (no reabrir):
- **`main` es la base** (26 sep se movió al commit de `sinlogin` del 30 ago, que ya retiró `@accesly/*`, la wallet y los pagos on-chain; dependían del backend en AWS, que ya no se paga). El `main` viejo de febrero quedó como `main-feb-2026`, solo de respaldo.
- `/admin` está apagado en `main` (flag `ADMIN_API_ENABLED`, rutas en 503). Reactivarlo solo con contraseña en env (`ADMIN_PASSWORD`). Los componentes del admin viejo están en el commit `c13f935`.
- `@stellar/stellar-sdk` 16.3.x, **no 17**.
- La postulación nunca depende de la passkey: si falla, el registro en `postulantes` ya quedó.
- En cadena solo hash con salt. Nada de nombre, WhatsApp, empresa ni puesto.
- `rpId` fijo `opportuni.xyz`; nunca probar passkeys desde `*.vercel.app`.
- El contrato de registro vive en este repo, en `contracts/credential-registry` (es del producto Opportuni, no de Accesly).
- **No se usan los contratos ni el SDK de Accesly** (`Accesly/SmartContracts`, `@accesly/*`). La smart account y el verificador de passkeys son los de OpenZeppelin que `smart-account-kit` ya tiene desplegados en mainnet (ver PRD 8.2).

Gates del fin de semana (26 y 27 sep): sábado 13:00 cuenta con passkey en mainnet desde iPhone, o plan B de cuentas patrocinadas; sábado 19:00 emisión con permiso delegado, o plan B de Face ID por credencial.

## Git

- Commits como el usuario **opportunixyz** (identidad configurada solo en este repo). El código de Opportuni no vive en la cuenta de Accesly: son empresas separadas.
- Trabajar en `feature/pasaporte-stellar` (sale de `main`) y fusionar por PR. Nunca commits directos a `main`.
- Deploy: Vercel de la cuenta opportunixyz (Hobby), rama de producción `main`, dominio `opportuni.xyz`.

## Copy

- Español, voz cercana de Opportuni, sin guiones largos.
- Comunidad: "más de 12 mil jóvenes", nunca 10 mil.
- Marca: rosa `#e3216d`, naranja `#f89b0e`, lila `#7c5cfc`, teal `#0ec4a9`, cream `#fdf6ee`, dark `#1a1a2e`; Gabarito (títulos), Bricolage Grotesque (texto), Playfair Display itálica (énfasis). Clases existentes: `bento`, `btn-rosa`, `input-bento`.
