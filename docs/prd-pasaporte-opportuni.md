# PRD · Pasaporte Opportuni v1

| | |
|---|---|
| **Estado** | Borrador para construir el 26 y 27 sep 2026, salir el lunes 28 sep |
| **Dueño y dev** | Roman (solo) |
| **Operación** | Vianey (emite CVs verificados desde /admin) |
| **One pager** | Notion › Opportuni › Tecnología › Propuesta con Blockchain › Pasaporte Opportuni × Stellar |

## 1. Qué es, en una frase

Un historial laboral verificado en Stellar mainnet: cada vez que Opportuni hace algo real por un joven (le arma el CV, lo postula a una vacante), queda una credencial en su propia cuenta, que él controla con Face ID o huella y que cualquier empresa puede verificar con un QR.

## 2. Por qué ahora

1. **SCF.** El Build Award se gana con transacciones reales en mainnet de usuarios reales. Los proyectos de credenciales que ya fondeó el SCF (Chaincerts $178K, Stellar Attestation Service $120K, EA Kazi, ICanProveIt) están muertos o sin usuarios: el SAS suma 52 usos en mainnet en ~10 meses. Nuestro foso es la distribución: más de 12 mil jóvenes y empresas que ya nos pagan.
2. **Confianza.** Las postulaciones por vacante subieron 100% en dos años por la IA (Emerge, abr 2026). La empresa no sabe qué CV es real, y el joven que paga 300 MXN al mes no puede comprobar que sí lo postulamos.
3. **Base para cobrar después.** La misma cuenta del joven es donde luego caen bounties de referidos (fase 2) y pagos de empleadores de fuera (fase 3). Ver hoja de ruta en el one pager.

## 3. Usuarios y lo que necesitan

| Usuario | Qué necesita | Cómo lo resuelve v1 |
|---|---|---|
| **Joven de la comunidad** | Postularse rápido y tener algo que demuestre su avance | Se postula como siempre y, en la misma pantalla, guarda la postulación en su pasaporte con Face ID |
| **Cliente pagado (300 MXN/mes)** | Ver que Opportuni sí trabajó por él | Recibe su "CV verificado" y cada postulación queda fechada en su pasaporte |
| **Equipo Opportuni (Vianey)** | Emitir sin trabajo extra | Un botón en /admin genera la credencial y el mensaje de WhatsApp listo para copiar |
| **Empresa / reclutador** | Saber que el candidato es real y que Opportuni lo avala | Escanea el QR del CV y ve las credenciales con su prueba en Stellar |

## 4. Alcance

### Entra en v1 (lunes 28 sep)

- Dos credenciales: **`postulacion`** y **`cv_verificado`**.
- Cuenta del joven: smart account de OpenZeppelin con passkey, creada con `smart-account-kit` en mainnet.
- Permiso limitado para Opportuni (context rule), para emitir sin volver a pedir Face ID.
- Página pública del pasaporte `/p/[slug]` y QR descargable.
- Pestaña **Pasaportes** en /admin: emitir CV verificado, ver estado de emisiones, copiar mensaje de WhatsApp.
- Métricas mínimas para el SCF (sección 9).

### No entra en v1

- Pagos, bounties, USDC, off-ramp.
- API de WhatsApp (no existe; todo mensaje se copia y pega a mano).
- Verificar un PDF subiéndolo (el QR basta en v1).
- Revocar desde la UI del joven (el contrato lo soporta; la UI va en v1.1).
- Integración con el tracker de clientes de Notion (se emite desde /admin).
- Apps nativas.

## 5. Flujos

### F1. Postulación con pasaporte (el que da volumen)

1. El joven ve la vacante en la comunidad y abre `opportuni.xyz/v/{id}` o `/postular/{id}`.
2. Llena el formulario de siempre y envía. **La postulación se guarda en `postulantes` exactamente como hoy, pase lo que pase después.**
3. La pantalla de éxito ahora dice: *"¡Postulación enviada! 🎉 ¿La guardamos en tu Pasaporte Opportuni? Es tu historial verificado, para que cualquier empresa vea que es real."*, con el botón **"Guardar con Face ID / huella"** y el link secundario "Ahora no".
4. **Primera vez:** `kit.createWallet('Opportuni', nombre)` pide la passkey (Face ID o huella) y despliega su cuenta. Después, una segunda confirmación agrega la regla "Opportuni puede registrar credenciales" (ver 8.3). Pantalla: *"Listo ✨ Este es tu pasaporte"* con link a `/p/{slug}` y botón **"Volver a WhatsApp"** (`wa.me` al número de Opportuni).
5. **Siguientes veces:** si el navegador tiene la sesión, el botón dice "Guardar en mi pasaporte" y no pide nada: el servidor emite con el permiso. Si no tiene sesión (otro teléfono, se borró), `kit.connectWallet({ prompt: true })` con Face ID.
6. El servidor emite la credencial `postulacion` (ver 8.4). La pantalla no espera la confirmación en cadena: muestra "Guardando…" y el pasaporte la muestra como "En camino" hasta que confirme.

**Si la passkey falla** (no hay bloqueo de pantalla, el navegador no soporta, el usuario cancela): mensaje *"No pasa nada, tu postulación ya quedó registrada ✦"*, se registra el error con el user agent y se ofrece reintentar. Nunca un callejón sin salida.

### F2. CV verificado (clientes pagados)

1. Vianey termina el CV del cliente. En /admin › Pasaportes › **"Emitir CV verificado"** llena: nombre, WhatsApp y el **PDF final** del CV.
2. El servidor calcula el `sha256` del PDF y busca un pasaporte con ese WhatsApp.
   - **Si ya tiene pasaporte:** emite de inmediato con el permiso.
   - **Si no:** crea la credencial en estado `pendiente` con un `claim_token` y un link `opportuni.xyz/reclamar/{token}`.
3. /admin muestra el mensaje listo para copiar y pegar en WhatsApp: *"Tu CV ya quedó verificado 🔥 Guárdalo en tu Pasaporte Opportuni aquí: {link}. Es una sola vez con tu Face ID o huella."*, más el **QR del pasaporte** (PNG) para pegar en el pie del CV.
4. El cliente abre el link y sigue el paso 4 de F1. Al terminar, la credencial pendiente se emite sola.

### F3. Verificación por una empresa

1. La empresa escanea el QR del CV y abre `/p/{slug}?src=qr`.
2. Ve el nombre (nombre y primera letra del apellido), la lista de credenciales con tipo y fecha ("CV verificado por Opportuni · 28 sep 2026", "Postulación verificada · sep 2026") y, en cada una, un link **"Ver prueba en Stellar"** a la transacción en stellar.expert.
3. **No ve** empresa ni puesto de las postulaciones (privacidad, ver 7.2). El dueño, con sesión, sí ve el detalle.
4. Se registra la visita con `src` para medir verificaciones.

### F4. Operación diaria (Vianey)

- Pestaña **Pasaportes**: tabla de emisiones (joven, tipo, estado `pendiente / enviada / confirmada / fallida`, fecha, link a la transacción) y botón "Reintentar" en fallidas.
- Contadores arriba: pasaportes creados, credenciales confirmadas, verificaciones por QR.

## 6. Requisitos funcionales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF1 | La postulación nunca depende de la passkey | Con la passkey fallando o cancelada, el renglón en `postulantes` existe y la pantalla dice que quedó registrada |
| RF2 | Crear cuenta con passkey en mainnet | Desde un iPhone con Safari abierto desde WhatsApp, la cuenta aparece en stellar.expert (mainnet) en menos de 20 s |
| RF3 | Permiso limitado para Opportuni | La cuenta tiene una context rule `CallContract(registro)` con el signer delegado de Opportuni y vencimiento a 12 meses. Una llamada de Opportuni a otro contrato falla |
| RF4 | Emisión sin pedir nada al joven | Con la regla puesta, el servidor emite una credencial y el joven no ve ningún diálogo |
| RF5 | Pasaporte público | `/p/{slug}` carga sin sesión, muestra credenciales confirmadas y links a stellar.expert |
| RF6 | Privacidad en cadena | En la cadena solo hay tipo, hash y fecha. Ni nombre, ni WhatsApp, ni empresa, ni puesto |
| RF7 | CV verificado desde /admin | Subir el PDF produce la credencial (o el link de reclamo), el mensaje para copiar y el QR en PNG |
| RF8 | Reclamo de credencial pendiente | Abrir `/reclamar/{token}`, completar la passkey y ver la credencial confirmada; el token no se puede usar dos veces |
| RF9 | Navegadores dentro de apps | En el navegador de Instagram, Facebook o TikTok se muestra "Abrir en Safari / Chrome" en vez del botón de passkey |
| RF10 | Admin sin Accesly | /admin se protege sin depender del backend de Accesly (ver 8.6) |
| RF11 | Métricas | Cada evento de la sección 9 queda en Supabase |

## 7. Requisitos no funcionales

### 7.1 Compatibilidad

- **iPhone:** probado el 26 sep, un link desde WhatsApp abre en Safari, que sí soporta passkeys.
- **Android:** pendiente. Probar con 2 o 3 teléfonos de la comunidad (webauthn.io desde WhatsApp) antes del domingo en la tarde.
- `rpId` fijo: `opportuni.xyz`. Nunca servir el flujo desde `opportuni.vercel.app` ni previews, o las passkeys quedan amarradas al dominio equivocado.

### 7.2 Privacidad

- En cadena: `hash = sha256(tipo | id_interno | salt_aleatorio)` para postulaciones, y `sha256(pdf)` para el CV. El `salt` vive en Supabase, así nadie puede adivinar el hash probando números de WhatsApp.
- Datos personales solo en Supabase, con RLS. El pasaporte público muestra nombre y primera letra del apellido.
- Aviso de privacidad de una línea en el botón: *"Guardamos en Stellar solo una huella digital de tu postulación, nunca tus datos."*

### 7.3 Costo

- Comisiones pagadas por el relayer gratuito de OpenZeppelin (Channels), con tope diario por API key.
- RPC gratuita (sorobanrpc.com u otra de la lista oficial de Stellar).
- Almacenamiento del contrato: rentas de fracciones de XLM por credencial, pagadas por la cuenta emisora de Opportuni (fondear con ~20 XLM para empezar).
- Meta: menos de USD 5 en total la primera semana.

### 7.4 Rendimiento

- La pantalla de éxito no espera la confirmación en cadena (más de 5 s se siente roto). Emisión asíncrona, estado visible en el pasaporte.

## 8. Diseño técnico

### 8.1 Qué se reusa del repo (`opportunixyz/opportuni`, base: `main`)

Desde el 26 sep `main` apunta al commit `8639887` (antes rama `sinlogin`, 30 ago), que ya retiró el SDK de Accesly, la wallet, los pagos on-chain y `@stellar/stellar-sdk`; dejó públicas home, /chat, /convocatorias y /cv/asesoria, y **apagó /admin**: la página muestra un aviso y `/api/admin/*` responde 503 detrás del flag `ADMIN_API_ENABLED` en `app/lib/submissions.ts`. La feature se construye encima de `main`.

| Pieza existente | Cómo se usa |
|---|---|
| `app/postular/[id]/page.tsx` + `app/api/postular/route.ts` | Se conserva tal cual. Solo se extiende la pantalla `done` con el paso del pasaporte y el API devuelve el `id` del postulante |
| `app/lib/supabase.ts` (`sbSelect`, `sbInsert`, `sbRpc`) | Base para las tablas nuevas. Agregar un cliente con **service role** solo en servidor para emitir |
| `app/v/[id]/route.ts` y `vacante_clicks` | Sin cambios. El link corto sigue contando clicks |
| `app/admin/page.tsx` | En `main` quedó reducido a un aviso. Los componentes (tabs, `SubTable`, modales, `CopyLinks`) se recuperan del historial, commit `c13f935` de `Accesly-Opportuni`, y se agrega la pestaña **Pasaportes** |
| `app/lib/submissions.ts` (Vercel Blob) | Guardar el PDF del CV verificado (privado) junto con su hash |
| `globals.css` / Tailwind (`bento`, `btn-rosa`, `input-bento`, colores) | Todas las pantallas nuevas con la marca existente |
| `app/providers.tsx`, `wallet-modal.tsx`, `pay-modal.tsx` | **Ya retirados en `main`.** Dependían del backend de Accesly en AWS. Los cobros siguen por SPEI |

### 8.2 Dependencias

- `smart-account-kit` (sucesor de passkey-kit). **Aviso del propio proyecto: no auditado.** Riesgo aceptable porque estas cuentas no guardan dinero en v1.
- `@stellar/stellar-sdk@^16.3.0`, **no 17** (cambia la API de autorización). `main` ya no lo tiene en el `package.json`: volver a agregarlo en esa versión.
- Contratos ya desplegados en mainnet (manifest `docs/deployments-protocol-27-2026-07-09.md` del kit): WebAuthn verifier `CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR`, WASM de la cuenta `1b5f4534…785a`.
- Relayer: OpenZeppelin Channels (`channels.openzeppelin.com`, API key en `/gen`).

### 8.3 La cuenta del joven y el permiso

- Se crea con `kit.createWallet('Opportuni', nombre, { autoSubmit: true })` y el `relayerUrl` de Channels. No usar el deployer compartido como fuente de fees (el kit lo prohíbe en mainnet).
- Regla adicional con `kit.rules` (firmada con `kit.signAndSubmitAdmin`, segundo Face ID):
  - tipo `CallContract(REGISTRO_ID)`
  - signer `Delegated(OPPORTUNI_ISSUER_G)`
  - sin policies, `valid_until` a ~12 meses
- **A verificar el sábado:** si la regla se puede instalar en la misma creación (un solo Face ID). Si no, son dos Face ID seguidos en la misma pantalla, con texto que explique el segundo.

### 8.4 Contrato de registro (Soroban, nuevo, mínimo)

```rust
// Interfaz propuesta
fn init(env, issuer: Address);
fn issue(env, subject: Address, kind: Symbol, hash: BytesN<32>) -> u64;
    // issuer.require_auth(); subject.require_auth();
    // guarda Credential { kind, hash, ts, revoked: false } bajo (subject, id)
    // emite evento ("issued", subject, id, kind)
fn revoke(env, subject: Address, id: u64);   // issuer.require_auth()
fn list(env, subject: Address) -> Vec<Credential>;
```

- `subject.require_auth()` se cumple con la regla de 8.3: la cuenta del joven autoriza, firmada por el signer delegado de Opportuni. **Esto es lo que hace que la transacción cuente como actividad de la cuenta del joven.**
- **Plan B (decisión el sábado a las 19:00):** si la autorización delegada no sale, `issue` exige solo `issuer.require_auth()` y el joven firma con Face ID cada credencial de postulación (ya está en el navegador, casi no se nota). El CV pendiente se firma al reclamar.
- Tipos en cadena (Symbol corto): `postulacion` y `cv_verif`, que en la app se llaman `postulacion` y `cv_verificado`.

### 8.5 Emisión en el servidor

- `POST /api/pasaporte/emitir` (interno): arma la invocación `issue`, firma las entradas de autorización del emisor y del signer delegado con `OPPORTUNI_ISSUER_SECRET` y envía `{ func, auth }` a Channels.
- Registra en `credenciales`: estado `enviada` con el hash de la transacción, y luego `confirmada` o `fallida` al consultar la RPC. Reintento manual desde /admin.

### 8.6 Proteger /admin sin Accesly

- v1: contraseña única en `ADMIN_PASSWORD` (env), cookie httpOnly firmada, middleware en `/admin` y `/api/admin/*`. Reemplaza el flag `ADMIN_API_ENABLED`. **Nunca** poner ese flag en `true` sin este gate: deja CVs, WhatsApps y postulantes abiertos.
- v1.1: login de admin con la misma passkey del kit.

### 8.7 Datos (Supabase, proyecto `gbdlfmkenfldrjnzxqst`)

| Tabla | Campos |
|---|---|
| `pasaportes` | `slug` (pk, aleatorio de 8), `contract_id` (C…), `credential_id`, `nombre`, `whatsapp`, `plataforma`, `created_at` |
| `credenciales` | `id`, `pasaporte_slug` (nullable si pendiente), `tipo`, `ref_id` (postulante o CV), `hash`, `salt`, `estado` (`pendiente/enviada/confirmada/fallida`), `tx_hash`, `onchain_id`, `claim_token`, `whatsapp_destino`, `created_at`, `confirmed_at` |
| `pasaporte_eventos` | `id`, `tipo` (`passkey_ok`, `passkey_error`, `passkey_cancel`, `inapp_detectado`, `vista_pasaporte`), `slug`, `user_agent`, `src`, `detalle`, `created_at` |

RLS: la anon key solo lee lo que el pasaporte público necesita, vía RPC `security definer` (misma técnica que `vacante_stats`). Toda escritura pasa por API routes con service role.

### 8.8 Variables de entorno nuevas

```env
NEXT_PUBLIC_STELLAR_RPC_URL=...
NEXT_PUBLIC_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_ACCOUNT_WASM_HASH=1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a
NEXT_PUBLIC_WEBAUTHN_VERIFIER=CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR
NEXT_PUBLIC_REGISTRO_ID=C...            # contrato nuevo
NEXT_PUBLIC_OPPORTUNI_ISSUER=G...       # dirección pública del emisor
OPPORTUNI_ISSUER_SECRET=S...            # SOLO servidor, nunca NEXT_PUBLIC
CHANNELS_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...           # SOLO servidor
ADMIN_PASSWORD=...
NEXT_PUBLIC_OPPORTUNI_WA=52...          # número para "Volver a WhatsApp"
```

## 9. Métricas

| Métrica | Para qué | Dónde |
|---|---|---|
| Pasaportes creados (cuentas únicas con passkey en mainnet) | La cifra principal para el SCF | `pasaportes` + stellar.expert |
| Credenciales confirmadas, por tipo | Actividad real en cadena | `credenciales` |
| Conversión postulación → pasaporte | Si el paso se entiende | `postulantes` vs `pasaportes` |
| Errores de passkey por plataforma | Detectar si Android o algún navegador falla | `pasaporte_eventos` |
| Verificaciones por QR | Si las empresas lo usan (el valor para el Plan Alcance) | `pasaporte_eventos` con `src=qr` |

No hay metas numéricas todavía: la primera semana es la línea base. No se comunica ninguna cifra afuera sin dato propio.

## 10. Plan de construcción

| Cuándo | Qué | Gate |
|---|---|---|
| Sáb 9 a 12 | Subir `stellar-sdk` a 16.3, instalar el kit, crear cuenta con passkey en mainnet desde iPhone vía Channels | **13:00:** si no hay cuenta en stellar.expert, pasar a cuentas patrocinadas (plan B de infraestructura) |
| Sáb 12 a 15 | Contrato de registro: escribir, probar en testnet, desplegar en mainnet | |
| Sáb 15 a 19 | Context rule con signer delegado y emisión desde el servidor | **19:00:** si no sale, plan B de 8.4 (Face ID por credencial) |
| Sáb 19 a 21 | `/p/[slug]` y tablas de Supabase | |
| Dom 9 a 12 | Paso del pasaporte en `/postular`, eventos y detección de navegadores dentro de apps | |
| Dom 12 a 15 | /admin: contraseña, pestaña Pasaportes, CV verificado, reclamo y QR | |
| Dom 15 a 18 | Prueba completa con 2 o 3 personas reales (al menos un Android) | Si Android falla, el botón se oculta en Android y solo se registra la postulación |
| Dom 18 a 20 | Deploy a opportuni.xyz y variables en Vercel | |
| Lun | Siguiente vacante en la comunidad con el flujo, links de reclamo a clientes pagados | |

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Passkeys fallan en Android o en navegadores dentro de apps | RF1 (la postulación nunca se pierde), RF9, prueba del domingo, eventos por plataforma |
| `smart-account-kit` no está auditado | Las cuentas no guardan dinero en v1; fijar versiones exactas |
| La autorización delegada es más difícil de lo previsto | Plan B de 8.4 con hora de corte |
| Tope diario de Channels | Una API key por ambiente; si se agota, la emisión queda `enviada/fallida` y se reintenta al otro día |
| /admin queda abierto al quitar Accesly | RF10 antes del deploy |
| El dominio o el deploy no están en manos de Roman | Confirmado el 26 sep: Roman tiene el DNS de opportuni.xyz. Verificar acceso al proyecto de Vercel antes del domingo |
| Datos personales en cadena | RF6 y 7.2: solo hash con salt |
| Un solo desarrollador | Gates con hora; lo que no salga se recorta, no se estira |

## 12. Preguntas abiertas

1. ~~¿Qué rama está desplegada?~~ Resuelto el 26 sep: `main` (= el antiguo `sinlogin`) es la rama de producción en el Vercel de la cuenta opportunixyz.
2. ¿Número de WhatsApp oficial para el botón "Volver a WhatsApp"?
3. ¿El pasaporte público muestra el nombre completo o nombre y primera letra del apellido? (v1 asume lo segundo.)
4. ¿La credencial `cv_verificado` se emite también a los clientes de los meses anteriores? Si sí, Vianey necesita sus PDFs finales.
