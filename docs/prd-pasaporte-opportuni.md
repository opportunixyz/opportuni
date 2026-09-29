# PRD · Pasaporte Opportuni v1

| | |
|---|---|
| **Estado** | Revisión del 28 y 29 sep 2026: el pasaporte pasa a ser la puerta de todas las vacantes. Construcción por fases (sección 10) |
| **Dueño y dev** | Roman (solo) |
| **Operación** | Vianey (links de vacantes, pagos y CV verificado desde /admin o desde Claude) |
| **One pager** | Notion › Opportuni › Tecnología › Propuesta con Blockchain › Pasaporte Opportuni × Stellar |

### Qué cambió el 28 y 29 sep

1. **Todo link de vacante pasa por Opportuni.** Vianey pega el link de la vacante en /admin y recibe un link `opportuni.xyz/v/{slug}`. La primera vez que alguien lo abre crea su pasaporte; desde ahí cada click va directo a la vacante y queda registrado a su nombre.
2. **Formulario del pasaporte, una sola vez** (autorizado por Vianey el 29 sep): nombre, WhatsApp, estado, área de interés y rango de edad, cada pregunta con su explicación. Vive en nuestra base, nunca en la cadena, y se edita desde /admin. El formulario de la vacante es el de la empresa, no el nuestro.
3. **La passkey nunca bloquea.** Si falla, se crea una cuenta de respaldo con la llave cifrada en nuestra base (8.3).
4. **CV verificado es manual:** Vianey lo emite a quien pagó, desde /admin o desde Claude.
5. **A las empresas solo se les muestran datos generales, en un PDF:** porcentajes por estado, área de interés, rango de edad y de clicks a sus vacantes. Nunca nombres, WhatsApp ni ciudad (F3).
6. **API de admin con llaves por rol** para operar desde Claude Code (Roman) y un conector de Claude en claude.ai para Vianey (v1.1).
7. **Base nueva en un servidor propio** en Hetzner (8.10). De Supabase no se migra nada.

### Qué cambió el 29 sep en la noche (fase 2)

1. **"Vacante abierta" ya no va a la cadena.** Abrir un link prueba poco y sería la credencial más frecuente, o sea la más cara (medido en testnet: ~0.1 XLM por credencial guardada, 97% renta). El click sigue en la base para métricas y reportes.
2. **En Stellar solo credenciales que valen:** `cv_verificado` (desde /admin › Jóvenes), y después LinkedIn revisado, credenciales de aliados (Platzi y otras) y postulación confirmada por la empresa. Se guardan en el contrato (~0.05 a 0.07 XLM cada una) para que una empresa las compruebe sin depender de nosotros.
3. **El permiso de Opportuni no tiene "Ahora no".** Sin él no se pueden emitir credenciales. Si el Face ID falla se reintenta; después de dos intentos el joven sigue a la vacante (RF1).
4. **Espera continua:** del primer Face ID hasta la vacante, el logo de Opportuni gira con tips de Opportuni. La puerta no dice "Stellar".
5. **Si Channels se acaba o se topa** (termina la alianza SDF y OpenZeppelin en dic 2026, y su tope diario no es público), Opportuni paga las comisiones desde la cuenta del emisor.

## 1. Qué es, en una frase

Cada vacante que Opportuni comparte en WhatsApp pasa por un link de Opportuni: la primera vez el joven crea su Pasaporte (una sola vez, con Face ID o huella) y cae en la vacante; desde entonces sabemos qué vacantes abre cada quien, y lo que Opportuni hace por él (su CV verificado) queda como credencial en Stellar mainnet que cualquier empresa puede comprobar con un QR.

## 2. Por qué ahora

1. **SCF.** El Build Award se gana con transacciones reales en mainnet de usuarios reales. Los proyectos de credenciales que ya fondeó el SCF (Chaincerts $178K, Stellar Attestation Service $120K, EA Kazi, ICanProveIt) están muertos o sin usuarios: el SAS suma 52 usos en mainnet en ~10 meses. Nuestro foso es la distribución: más de 12 mil jóvenes y empresas que ya nos pagan.
2. **Confianza.** Las postulaciones por vacante subieron 100% en dos años por la IA (Emerge, abr 2026). La empresa no sabe qué CV es real, y el joven que paga 300 MXN al mes no puede comprobar que sí trabajamos por él.
3. **Saber quién es quién.** Hoy un link cuenta clicks anónimos. Con el pasaporte sabemos quién abre qué vacante, de qué estado es, qué le interesa y qué tan activo es en la comunidad. A la empresa le mostramos el panorama en porcentajes, sin datos de nadie en particular.
4. **Base para cobrar después.** La misma cuenta del joven es donde luego caen bounties de referidos (fase 2) y pagos de empleadores de fuera (fase 3). Ver hoja de ruta en el one pager.

## 3. Usuarios y lo que necesitan

| Usuario | Qué necesita | Cómo lo resuelve v1 |
|---|---|---|
| **Joven de la comunidad** | Ver la vacante sin vueltas | La primera vez llena un formulario corto (nombre, WhatsApp, estado, área), usa Face ID y cae en la vacante. Los siguientes clicks van directo |
| **Cliente pagado (300 MXN/mes)** | Ver que Opportuni sí trabajó por él | Vianey registra su pago y emite su "CV verificado" en su pasaporte |
| **Equipo Opportuni (Vianey)** | Operar sin trabajo extra | Pega el link de la vacante y recibe el link Opportuni; registra pagos y emite CVs desde /admin o pidiéndoselo a Claude |
| **Empresa / reclutador** | Saber que el candidato es real y qué tanto interés generó su vacante | Opportuni le muestra un panel en porcentajes (estados, áreas, clicks a sus vacantes, actividad de la comunidad). El QR que el joven pone en su CV lleva a sus credenciales con prueba en Stellar |
| **Roman** | Operar y revisar desde Claude Code | API de admin con llave de rol `admin` (8.9) |

## 4. Alcance

### Entra en v1

- **Links Opportuni:** generador en /admin, puerta del pasaporte en `/v/{slug}` y redirect a la vacante externa.
- **Pasaporte obligatorio para ver vacantes:** formulario de una sola vez (editable desde /admin), términos aceptados una sola vez, reconocimiento del dispositivo en los siguientes clicks.
- **Registro de cada click** en la base con pasaporte, vacante, canal, estado y la metadata permitida (F1).
- Cuenta del joven: smart account de OpenZeppelin con passkey (`smart-account-kit`) en mainnet, o **cuenta de respaldo** si la passkey falla.
- Permiso limitado para Opportuni (context rule) para emitir sin volver a pedir Face ID.
- Credenciales en cadena: **`cv_verificado`** (manual, clientes pagados). Después, LinkedIn revisado, aliados y postulación confirmada. Abrir una vacante no es credencial (29 sep): queda en la base.
- Pasaporte público `/p/[slug]` y QR descargable.
- /admin con contraseña: Vacantes, Jóvenes, Pagos y CV verificado, Empresas (panel en porcentajes), Formulario, Emisiones.
- API de admin con llaves por rol y servidor MCP para Claude Code.
- Base de datos en servidor propio.
- Métricas (sección 9).

### Entra en v1.1

- Conector de Claude con login (OAuth) para que Vianey opere desde claude.ai (8.9).
- Reclamar la cuenta de respaldo: agregar passkey y borrar la llave en custodia (8.3).
- Login con Google como segundo intento antes de la custodia, solo si los errores de passkey lo justifican (8.3).
- Links por grupo (10 grupos y secciones de Opportuni MX), ver F1.

### No entra

- Pagos, bounties, USDC, off-ramp.
- API de WhatsApp (no la tenemos): ni login por WhatsApp ni leer el número de quien da click (ver F1).
- Login de empresas (v2; en v1 Vianey les comparte el panel).
- Mostrar a empresas datos de un joven en particular. Lo único individual que ve una empresa es el pasaporte público, y solo si el joven le da su QR.
- Que el joven edite sus respuestas del formulario (v1.1).
- Chat de WhatsApp para mejorar el CV (v2).
- Verificar un PDF subiéndolo (el QR basta en v1).
- Revocar desde la UI del joven (el contrato lo soporta).
- Integración con el tracker de clientes de Notion.
- Apps nativas.

## 5. Flujos

### F1. Link Opportuni y pasaporte (la puerta a las vacantes)

**Paso 0, Vianey.** En /admin › Vacantes pega la URL de la vacante (su formulario, LinkedIn, lo que sea), con título y empresa, o se lo pide a Claude. Recibe `opportuni.xyz/v/pm-nubank`: slug legible sacado de puesto y empresa, editable. 

**Links por grupo (después).** Opportuni MX tiene 10 grupos y secciones. Desde la fase 1 el link acepta un canal opcional (`opportuni.xyz/v/pm-nubank/cdmx`) y la base lo guarda, pero Vianey comparte un solo link como hoy. Generar las variantes por grupo va en la fase 4: implica pegar un link distinto en cada grupo en vez de reenviar el mismo mensaje. Mientras tanto, el estado que da cada joven en el formulario ya dice de dónde es la gente.

Para que el link no se note: dominio propio, slug en palabras, sin parámetros, y el preview de WhatsApp muestra el título y la empresa de la vacante con la marca de Opportuni (Open Graph de la puerta).

1. El joven toca el link en WhatsApp. El servidor descarta bots (el preview de WhatsApp y otros crawlers no cuentan como click) y lee la cookie del dispositivo.
2. **Dispositivo conocido:** registra el click en la base (pasaporte, vacante, canal y metadata) y hace redirect a la vacante (desde el 29 sep abrir una vacante ya no emite credencial en la cadena). No ve ninguna pantalla ni vuelve a llenar nada, y nada de esto frena el redirect.
3. **Dispositivo nuevo:** ve la puerta, una sola pantalla con la vacante arriba ("Nubank · Product Manager"):
   - *"Para ver esta vacante crea tu Pasaporte Opportuni. Lo llenas una sola vez."*
   - **El formulario del pasaporte**, cada pregunta con su explicación corta debajo:

     | Pregunta | Explicación (texto inicial, editable) | Cómo se llena |
     |---|---|---|
     | Tu nombre | "Así te saludamos y así aparece en tu pasaporte." | Texto, `autocomplete="name"` |
     | Tu WhatsApp | "Es tu llave: si cambias de teléfono, con él te reconocemos. Nunca se lo damos a una empresa." | Lada según el país del IP (+52 o +57) y número, `autocomplete="tel"` |
     | Tu estado | "Para mandarte vacantes cerca de ti. A las empresas solo les decimos cuánta gente hay por estado, nunca quién." | Lista de estados de México y departamentos de Colombia, preseleccionado con el del IP |
     | Tu área de interés | "Para que te lleguen vacantes que sí te sirven." | Botones (chips), hasta 3. Lista cerrada para poder sacar porcentajes, con "Otra" y texto libre |
     | Tu edad | "Para saber qué vacantes te tocan. A las empresas solo les decimos porcentajes por rango." | Botones: 18 a 20, 21 a 24, 25 a 29, 30 o más |

   - Casilla obligatoria de términos y aviso de privacidad, en una línea clara: *"Tengo 18 años o más. Opportuni guarda mis respuestas y las vacantes que abro desde sus links. A las empresas solo les comparte estadísticas generales, sin mi nombre."* (ver 7.2).
   - Botón **"Crear mi pasaporte y ver la vacante"**: guarda el formulario en la base, pide la passkey (Face ID o huella), crea la cuenta en mainnet, agrega el permiso para Opportuni (8.3), deja la cookie y hace redirect a la vacante.
   - Link secundario **"Ya tengo pasaporte"**: `kit.connectWallet({ prompt: true })` con Face ID, deja la cookie y hace redirect.
   - No hay "Ahora no": ver la vacante requiere el pasaporte (decisión del 28 sep). Pero nunca hay callejón sin salida.
4. **Si la passkey falla** (sin bloqueo de pantalla, navegador sin soporte, cancela, se tarda): el servidor crea la **cuenta de respaldo** con los mismos datos (8.3), deja la cookie y hace redirect. El joven ve *"Listo, ya tienes tu pasaporte ✦"*. Se registra el error con el user agent. Más adelante su pasaporte le ofrece "Protégelo con Face ID" (v1.1).
5. **Navegadores dentro de apps** (Instagram, Facebook, TikTok): se muestra "Abrir en Safari / Chrome" y, abajo, "Seguir aquí", que usa la cuenta de respaldo.

**El WhatsApp de quien da click.** No se puede leer: WhatsApp no manda el número al abrir un link. Lo cubrimos con dos cosas: el joven escribe su WhatsApp una vez en la puerta, y, más adelante, cada link podrá llevar el grupo de donde salió.

**Un pasaporte por persona.** El WhatsApp (normalizado a formato internacional) es único. Si alguien llena la puerta con un número que ya tiene pasaporte, no se crea otro: pasa a "Ya tengo pasaporte".

**Otro teléfono u otra app: cómo confirma que ya tiene pasaporte.** Cada navegador tiene su propia cookie, así que en un teléfono nuevo, en otra app o con la cookie borrada, la puerta pregunta. Toca **"Ya tengo pasaporte"** y confirma así, en este orden:

1. **Face ID o huella (su passkey).** Es la confirmación de verdad. La passkey se sincroniza sola entre los dispositivos de su misma cuenta de Apple o Google. Si cambió de iPhone a Android (o al revés), el navegador ofrece "usar otro teléfono" y escanea un QR con el teléfono donde la creó. El dispositivo queda **confirmado**.
2. **Si no puede con la passkey** (tiene cuenta de respaldo, ya no tiene el teléfono viejo, o está en el navegador de una app): escribe su WhatsApp. Si existe, el dispositivo queda ligado a su pasaporte como **sin confirmar**: sus clicks se suman a su historial, pero desde ese dispositivo no se emite nada en Stellar ni se abre el detalle privado de su pasaporte. Si alguien escribe un número ajeno, lo peor que pasa es que se le suman clicks a otra persona; no ve nada ni se lleva nada.
3. **Código por WhatsApp (v1.1):** con la API de WhatsApp Business (Meta cobra por cada mensaje de verificación) le mandamos un código y el dispositivo queda confirmado. Se hace solo si hay muchos dispositivos sin confirmar.

En ningún caso vuelve a llenar el formulario.

**Editar el formulario (/admin › Formulario, o por Claude).** Se puede cambiar el texto de cada pregunta y su explicación, el orden, si es obligatoria, las opciones de las listas (agregar "Derecho" a las áreas, por ejemplo) y agregar preguntas nuevas. Cada cambio guarda una versión nueva y cada respuesta queda ligada a la versión que contestó. Nombre, WhatsApp, estado, área y edad son columnas fijas porque de ellas salen los porcentajes; las preguntas nuevas se guardan aparte. **Una pregunta nueva no se le hace a quien ya tiene pasaporte**: el formulario se llena una sola vez.

**Qué se registra en cada click** (todo en la base, nada en la cadena, y todo dicho en el aviso de privacidad):

| Se guarda | Para qué |
|---|---|
| Pasaporte, vacante, canal, fecha y hora | Saber quién abrió qué y desde qué grupo |
| Estado y país del IP (headers de Vercel) | Contrastar con el estado que dio en el formulario |
| Tipo de dispositivo, sistema y navegador (del user agent) | Detectar fallas de passkey por plataforma |
| Idioma del navegador | Separar México y Colombia cuando el IP no alcanza |
| Si vino de un navegador dentro de una app | Saber cuántos abren desde Instagram, Facebook o TikTok |
| Primer click o repetido | Contar personas y no solo clicks |
| HMAC del IP | Detectar abuso o bots, sin guardar el IP |

**No se guarda:** el IP en claro, la ciudad, ubicación por GPS, huella del navegador (canvas, fuentes, etc.), píxeles de Meta o Google, cookies de terceros ni nada del WhatsApp aparte del número que la persona escribe.

### F2. CV verificado (manual, clientes pagados)

Lo que firma el joven al crear su pasaporte es el **permiso** para que Opportuni registre credenciales en su cuenta (8.3), no el CV. El CV verificado lo decide Vianey a mano, solo para quien pagó.

1. El cliente paga por SPEI. Vianey lo registra en /admin › Pagos, o por Claude ("registra el pago de Ana, 55…, 300 MXN, septiembre"): WhatsApp, monto, periodo y nota.
2. Cuando su CV ya pasa los filtros de ATS, Vianey da **"Emitir CV verificado"** en la ficha del joven. El PDF final es opcional: si lo sube, la huella es el `sha256` del PDF (una empresa podrá comprobar ese archivo exacto más adelante); si no, es un hash con salt del registro.
3. El servidor busca el pasaporte por WhatsApp:
   - **Si ya tiene pasaporte:** emite de inmediato con el permiso.
   - **Si no:** crea la credencial en estado `pendiente` con un `claim_token` y el link `opportuni.xyz/reclamar/{token}`. Al abrirlo pasa por la misma puerta de F1 (sin vacante) y la credencial se emite sola.
4. /admin (o Claude) devuelve el mensaje listo para WhatsApp: *"Tu CV ya quedó verificado 🔥 Míralo en tu Pasaporte Opportuni: {link}"*, más el **QR del pasaporte** (PNG) para el pie del CV.

Roman puede hacer lo mismo por la API con su llave `admin` (8.9).

### F3. Perfil del joven (interno) y panel de empresa (solo porcentajes)

El formulario de F1 es lo que llena el perfil. Hay dos vistas, con reglas distintas:

- **Ficha del joven, solo para el equipo** (/admin y API): respuestas del formulario, estado, fecha de alta, tipo de cuenta (passkey o respaldo), clicks totales, vacantes abiertas con fecha y canal, pagos y credenciales con su link a stellar.expert. Es lo que Vianey usa para operar; no sale del equipo.
- **Panel de empresa** `/admin/empresas/{empresa}`: **solo datos generales, nunca de una persona.**
  - **Sus vacantes:** clicks totales, personas únicas, y de esas personas el porcentaje por estado ("42% Querétaro"), por área ("30% Derecho") y por rango de edad ("55% de 21 a 24").
  - **La comunidad:** pasaportes totales y el mismo reparto por estado, área y edad.
  - **Lo que Opportuni ha hecho con el pasaporte:** vacantes compartidas, CVs verificados emitidos, credenciales en Stellar.
  - Cualquier grupo con menos de 5 personas se junta en "Otros", para que nadie se pueda identificar por descarte (una sola abogada de Tlaxcala, por ejemplo).
  - No muestra nombres, WhatsApp, ciudad ni la lista de quién abrió qué. En v1 lo abre admin y Vianey le manda a la empresa **un PDF** con la marca de Opportuni (botón "Descargar PDF" en el panel, o se lo pide a Claude). Login de empresas en v2.
- **Pasaporte público** `/p/{slug}` (el del QR): es lo único individual que ve una empresa, y solo si el joven le da su QR en su CV. Muestra nombre y primera letra del apellido y credenciales con tipo y fecha ("CV verificado por Opportuni · 28 sep 2026", "Vacante abierta vía Opportuni · sep 2026"), cada una con **"Ver prueba en Stellar"**. No muestra WhatsApp, estado, áreas ni las empresas de las vacantes que abrió. Se registra la visita con `src` (`?src=qr`).
- **Estado:** el que da el joven en el formulario es el que cuenta. El del IP solo sirve para preseleccionar la lista y para detectar datos raros; con datos móviles el IP suele caer en el estado del operador.

### F4. Operación diaria (Vianey y Roman)

- **Vacante nueva:** pegar la URL, copiar el link Opportuni y mandarlo a la comunidad.
- **Cliente pagó:** registrar el pago y, cuando su CV esté listo, emitir el CV verificado.
- **Consultar:** clicks por vacante, canal y estado; quién abrió qué (interno); panel de cada empresa en porcentajes.
- **Formulario:** ajustar preguntas, explicaciones y opciones.
- **Emisiones:** tabla con joven, tipo, estado `pendiente / enviada / confirmada / fallida`, fecha, link a la transacción y botón "Reintentar". Contadores arriba: pasaportes (passkey y respaldo), credenciales confirmadas, verificaciones por QR.
- **Desde Claude:** Roman en Claude Code con su llave `admin`. Vianey en claude.ai web con el conector de Opportuni y su login (v1.1): es el camino preferido para ella; hasta que salga, usa /admin. Las mismas acciones que /admin, con las mismas reglas (8.9).

## 6. Requisitos funcionales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF1 | Ver la vacante nunca depende de la passkey | Con la passkey fallando o cancelada, el joven llega a la vacante con cuenta de respaldo y su click queda registrado |
| RF2 | Link Opportuni en un paso | Vianey pega una URL y obtiene `opportuni.xyz/v/{slug}`; el preview en WhatsApp muestra título y empresa |
| RF3 | Formulario y puerta una sola vez | El formulario se llena en menos de un minuto desde el teléfono. El segundo click desde el mismo navegador va directo a la vacante, sin pantalla. Respuestas y términos quedan guardados con versión y fecha |
| RF4 | Cuenta con passkey en mainnet | Desde un iPhone con Safari abierto desde WhatsApp, la cuenta aparece en stellar.expert (mainnet) en menos de 20 s |
| RF5 | Permiso limitado para Opportuni | La cuenta tiene una context rule `CallContract(registro)` con el signer delegado de Opportuni y vencimiento a 12 meses. Una llamada de Opportuni a otro contrato falla |
| RF6 | Emisión sin pedir nada al joven | Con la regla puesta, `vacante` y `cv_verificado` se emiten sin ningún diálogo |
| RF7 | Cuenta de respaldo segura | La llave privada solo existe cifrada en la base; nunca sale del servidor de la app, ni en respuestas de la API ni en logs |
| RF8 | Clicks útiles | Cada click guarda lo de la tabla de F1 y nada de la lista "No se guarda". Los crawlers no cuentan |
| RF9 | Un pasaporte por WhatsApp | Llenar la puerta con un número que ya existe no crea un duplicado |
| RF10 | Navegadores dentro de apps | En Instagram, Facebook o TikTok se ofrece "Abrir en Safari / Chrome" y "Seguir aquí" |
| RF11 | Si la base no responde, el link funciona | El joven llega a la vacante aunque el click no se registre |
| RF12 | CV verificado manual | Desde /admin o la API produce la credencial (o el link de reclamo), el mensaje para copiar y el QR en PNG |
| RF13 | Reclamo de credencial pendiente | `/reclamar/{token}` termina con la credencial confirmada; el token no se puede usar dos veces |
| RF14 | Pasaporte público | `/p/{slug}` carga sin sesión, muestra credenciales confirmadas y links a stellar.expert, sin WhatsApp, estado, áreas ni empresas |
| RF15 | Privacidad en cadena | En la cadena solo hay tipo, hash y fecha |
| RF16 | Admin y API protegidos | /admin pide contraseña; la API pide llave con rol; una llave `operacion` no puede crear llaves ni borrar datos; toda escritura queda en `admin_audit` |
| RF17 | Métricas | Cada evento de la sección 9 queda en la base |
| RF18 | Formulario editable | Vianey cambia una explicación o agrega un área desde /admin y la puerta lo muestra sin deploy; quien ya tenía pasaporte no vuelve a ver el formulario |
| RF19 | Empresas solo ven porcentajes | El PDF de empresa no tiene ningún nombre, WhatsApp ni ciudad, y ningún grupo de menos de 5 personas aparece por separado |
| RF20 | Confirmar en otro dispositivo | En un navegador nuevo, "Ya tengo pasaporte" con Face ID deja el dispositivo confirmado; con solo el WhatsApp queda sin confirmar y no emite nada en Stellar |
| RF21 | Solo mayores de edad | El rango de edad empieza en 18 y la casilla obligatoria incluye "Tengo 18 años o más" |

## 7. Requisitos no funcionales

### 7.1 Compatibilidad

- **iPhone:** probado el 26 sep, un link desde WhatsApp abre en Safari, que sí soporta passkeys.
- **Android:** pendiente. Probar con 2 o 3 teléfonos de la comunidad (webauthn.io desde WhatsApp) antes de mover todos los links a la puerta.
- `rpId` fijo: `opportuni.xyz`. Nunca servir el flujo desde `opportuni.vercel.app` ni previews, o las passkeys quedan amarradas al dominio equivocado.
- La cookie vive por navegador: si el mismo teléfono abre links desde WhatsApp y desde Instagram, son dos navegadores. El segundo se reconoce con "Ya tengo pasaporte".

### 7.2 Privacidad y consentimiento

- En cadena: `hash = sha256(tipo | id_interno | salt_aleatorio)`, y `sha256(pdf)` para el CV con PDF. El `salt` vive en nuestra base, así nadie puede adivinar el hash probando números de WhatsApp.
- Formulario, clicks y datos personales solo en nuestra base. El IP no se guarda en claro: solo su HMAC, el estado y el país. La ciudad no se guarda.
- **A las empresas solo les llegan porcentajes** (F3), con grupos de menos de 5 personas juntados en "Otros". Como no reciben datos de nadie en particular, no hay transferencia de datos personales a terceros, que es lo más delicado en México (LFPDPPP) y Colombia (Ley 1581 de 2012).
- **Consentimiento:** casilla obligatoria una sola vez, guardada con versión del texto y fecha. El aviso de privacidad dice qué guardamos (respuestas del formulario, vacantes abiertas, la metadata de F1), para qué (mandarle vacantes, operar el servicio y hacer estadísticas generales) y que a las empresas solo les compartimos estadísticas sin nombres. Aun así hace falta un aviso de privacidad publicado: que alguien de legal le dé una leída antes de publicar la puerta.
- **Solo mayores de edad:** en México y Colombia los datos de menores piden permiso de padre, madre o tutor, así que el pasaporte es para 18 años o más y la casilla lo declara. Si nos enteramos de que alguien es menor, se borran sus datos.
- **Borrar a pedido:** si un joven lo pide por WhatsApp, Vianey borra sus datos desde /admin. En cadena queda un hash que sin el salt no dice nada; el salt se borra.

### 7.3 Costo

- Comisiones pagadas por el relayer gratuito de OpenZeppelin (Channels), con tope diario por API key.
- **Una credencial `vacante` por joven y vacante**, no por click: los clicks repetidos solo van a la base.
- RPC gratuita (sorobanrpc.com u otra de la lista oficial de Stellar).
- Almacenamiento del contrato: rentas de fracciones de XLM por credencial, pagadas por la cuenta emisora de Opportuni (fondear con ~20 XLM para empezar).
- Servidor de base: el que ya tiene Roman.

### 7.4 Rendimiento

- El redirect de un dispositivo conocido no espera nada lento: el click se escribe con `waitUntil` (`@vercel/functions`) después de responder, y la emisión en cadena va en cola.
- Crear el pasaporte, del toque en el botón a la vacante: menos de 20 s. Lo que no sea necesario para el permiso se confirma en segundo plano y el pasaporte lo muestra como "En camino".

## 8. Diseño técnico

### 8.1 Qué se reusa del repo (`opportunixyz/opportuni`, base: `main`)

Desde el 26 sep `main` apunta al commit `8639887` (antes rama `sinlogin`, 30 ago), que ya retiró el SDK de Accesly, la wallet, los pagos on-chain y `@stellar/stellar-sdk`; dejó públicas home, /chat, /convocatorias y /cv/asesoria, y **apagó /admin**: la página muestra un aviso y `/api/admin/*` responde 503 detrás del flag `ADMIN_API_ENABLED` en `app/lib/submissions.ts`. La feature se construye encima de `main`.

| Pieza existente | Cómo se usa |
|---|---|
| `app/v/[id]/route.ts` y `vacante_clicks` | **Se vuelve la puerta.** Con cookie válida: redirect como hoy, registrando más datos. Sin cookie: la pantalla de F1. Los crawlers reciben el Open Graph de la vacante. Se agrega `/v/{slug}/{canal}`. Se conserva la regla de hoy: si la base falla, redirect igual |
| `app/lib/supabase.ts` (`sbSelect`, `sbInsert`, `sbRpc`, `getVacanteById`) | Se apunta a la base propia (8.10) manteniendo las mismas funciones, para no tocar las páginas que las usan. Se agrega un cliente de escritura solo en servidor |
| `app/postular/[id]` + `app/api/postular/route.ts` | Se conserva para vacantes sin URL externa. No es parte de la puerta |
| `app/vacantes` y `app/vacantes/[id]` | Sin cambios. Los links a vacantes pasan por `/v/{slug}` |
| `AREAS` en `app/cv/revision/page.tsx` | Lista inicial de áreas del formulario (le falta Derecho, por ejemplo). Después la lista vive en la base y se edita desde /admin |
| `app/admin/page.tsx` | En `main` quedó reducido a un aviso. Los componentes (tabs, `SubTable`, modales, `CopyLinks`) se recuperan del commit `c13f935` y se agregan las pestañas nuevas |
| `app/lib/submissions.ts` (Vercel Blob) | Guardar el PDF del CV verificado (privado) junto con su hash |
| `globals.css` / Tailwind (`bento`, `btn-rosa`, `input-bento`, colores) | Todas las pantallas nuevas con la marca existente |
| `app/providers.tsx`, `wallet-modal.tsx`, `pay-modal.tsx` | **Ya retirados en `main`.** Dependían del backend de Accesly en AWS. Los cobros siguen por SPEI |

### 8.2 Dependencias

- `smart-account-kit` (sucesor de passkey-kit). **Aviso del propio proyecto: no auditado.** Riesgo aceptable porque estas cuentas no guardan dinero en v1.
- `@stellar/stellar-sdk@^16.3.0`, **no 17** (cambia la API de autorización). `main` ya no lo tiene en el `package.json`: volver a agregarlo en esa versión.
- Contratos ya desplegados en mainnet (manifest `docs/deployments-protocol-27-2026-07-09.md` del kit): WebAuthn verifier `CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR`, WASM de la cuenta `1b5f4534…785a`.
- Relayer: OpenZeppelin Channels (`channels.openzeppelin.com`, API key en `/gen`).
- `@vercel/functions` para `waitUntil`.
- `@modelcontextprotocol/sdk` para el servidor MCP (8.9).

### 8.3 La cuenta del joven, el permiso y el respaldo

**Con passkey (camino normal):**

- Se crea con `kit.createWallet('Opportuni', nombre, { autoSubmit: true })` y el `relayerUrl` de Channels. No usar el deployer compartido como fuente de fees (el kit lo prohíbe en mainnet).
- Regla adicional con `kit.rules` (firmada con `kit.signAndSubmitAdmin`, segundo Face ID):
  - tipo `CallContract(REGISTRO_ID)`
  - signer `Delegated(OPPORTUNI_ISSUER_G)`
  - sin policies, `valid_until` a ~12 meses
- **A verificar:** si la regla se puede instalar en la misma creación (un solo Face ID). Si no, son dos Face ID seguidos en la puerta, con texto que explique el segundo.

**Cuenta de respaldo (si la passkey falla):**

- El servidor genera un keypair ed25519 para el joven y despliega su smart account con ese keypair como signer `Delegated`, más la misma regla para Opportuni. Todo en el servidor: el joven no ve ningún diálogo.
- La llave secreta se guarda cifrada con AES-256-GCM (IV por renglón) usando `CUSTODIA_MASTER_KEY`, que vive solo en las variables de Vercel, **nunca en el servidor de la base**. Quien se robe la base no puede usar las llaves.
- La cuenta no guarda dinero, así que el riesgo de la custodia es que alguien emita credenciales falsas a su nombre, no que pierda fondos.
- **A verificar:** desplegar la cuenta del kit con un signer `Delegated` sin passkey (constructor del contrato de OZ).
- **v1.1, reclamar:** desde su pasaporte, el joven agrega su passkey como signer; Opportuni quita el signer de custodia y borra la llave cifrada.

**Login con Google (v1.1, condicional):** como identidad para recuperar una cuenta de respaldo en otro teléfono. No va primero porque Google bloquea su login dentro de los navegadores de Instagram, Facebook y TikTok, que es justo donde más falla la passkey. Se agrega si `passkey_error` sale alto fuera de esos navegadores.

**Login por WhatsApp:** requiere WhatsApp Business Platform. Fuera de v1.

**Cookie del dispositivo:** `opp_dev`, token aleatorio de 32 bytes, `httpOnly`, `Secure`, `SameSite=Lax`, hasta 400 días (el tope de Chrome), guardado como hash en `dispositivos` y renovado en cada click. Cada dispositivo está **confirmado** (lo creó, o entró con passkey o código) o **sin confirmar** (entró solo con su WhatsApp, ver F1). Solo los confirmados disparan credenciales en Stellar. Ver el detalle privado del pasaporte siempre pide la passkey.

### 8.4 Contrato de registro (Soroban, nuevo, mínimo)

Vive en este repo, en `contracts/credential-registry`.

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
- **Plan B:** si la autorización delegada no sale, `issue` exige solo `issuer.require_auth()`. Las credenciales `vacante` se emiten igual (con menos peso para el SCF, porque no las autoriza la cuenta del joven) y el CV pendiente se firma con Face ID al reclamar.
- Tipos en cadena (Symbol corto): `vacante` y `cv_verif`, que en la app se llaman `vacante` y `cv_verificado`.
- **Por qué `vacante` y no `postulacion`:** un click prueba que abrió la vacante vía Opportuni, no que llenó el formulario externo. Si una empresa ve "Postulación verificada" y el joven nunca se postuló, se cae la confianza que vende el pasaporte. `postulacion` queda reservado para cuando sí sepamos que se postuló (formulario propio o confirmación de la empresa).

### 8.5 Emisión en el servidor

- Función interna `emitir(credencial_id)`: arma la invocación `issue`, firma las entradas de autorización del emisor y del signer delegado con `OPPORTUNI_ISSUER_SECRET` y envía `{ func, auth }` a Channels.
- `vacante`: se encola desde el click con `waitUntil`, con candado único `(pasaporte_slug, tipo, ref_id)` para no emitir dos veces.
- Registra en `credenciales`: estado `enviada` con el hash de la transacción, y luego `confirmada` o `fallida` al consultar la RPC. Reintento desde /admin o la API.

### 8.6 Proteger /admin y la API

- **/admin:** contraseña en `ADMIN_PASSWORD` (env), cookie `httpOnly` firmada con `ADMIN_SESSION_SECRET`, middleware en `/admin` y `/api/admin/*`. Reemplaza el flag `ADMIN_API_ENABLED`. **Nunca** poner ese flag en `true` sin este gate: deja CVs, WhatsApps y postulantes abiertos.
- **API:** llaves por rol (8.9). El middleware acepta la cookie de admin o una llave válida.
- v1.1: login de admin con passkey.

### 8.7 Datos (base propia, ver 8.10)

| Tabla | Campos |
|---|---|
| `vacantes` | `id` (slug), `titulo`, `empresa`, `url_destino`, `activa`, `creada_por`, `created_at` |
| `vacante_clicks` | `id`, `vacante_id`, `pasaporte_slug` (nullable), `dispositivo_id`, `canal`, `estado_ip`, `pais_ip`, `ip_hash`, `dispositivo_tipo`, `sistema`, `navegador`, `idioma`, `inapp`, `repetido`, `created_at` |
| `formulario_preguntas` | `id`, `clave` (`nombre`, `whatsapp`, `estado`, `areas` o una nueva), `texto`, `explicacion`, `tipo` (`texto`, `telefono`, `lista`, `chips`), `opciones` (json), `obligatoria`, `orden`, `activa`, `version`, `updated_by`, `updated_at` |
| `pasaportes` | `slug` (pk, aleatorio de 8), `nombre`, `whatsapp` (único, E.164), `estado`, `pais`, `areas` (lista), `rango_edad`, `respuestas_extra` (json), `form_version`, `modo` (`passkey` / `respaldo`), `contract_id` (C…), `credential_id` (passkey), `clave_cifrada` + `clave_iv` (solo respaldo), `terminos_version`, `terminos_at`, `estado_ip`, `plataforma`, `created_at` |
| `dispositivos` | `id`, `pasaporte_slug`, `token_hash`, `confirmado`, `confirmado_por` (`creacion` / `passkey` / `codigo_wa`), `user_agent`, `created_at`, `last_seen_at` |
| `credenciales` | `id`, `pasaporte_slug` (nullable si pendiente), `tipo` (`vacante` / `cv_verificado`), `ref_id` (vacante o pago), `hash`, `salt`, `estado` (`pendiente/enviada/confirmada/fallida`), `tx_hash`, `onchain_id`, `claim_token`, `whatsapp_destino`, `emitida_por`, `created_at`, `confirmed_at` |
| `pagos` | `id`, `pasaporte_slug` o `whatsapp`, `monto`, `moneda`, `periodo`, `metodo` (SPEI), `nota`, `registrado_por`, `created_at` |
| `api_keys` | `id`, `nombre`, `prefijo`, `hash`, `rol` (`admin` / `operacion`), `created_at`, `last_used_at`, `revoked_at` |
| `admin_audit` | `id`, `actor` (llave o sesión), `accion`, `detalle` (sin llaves ni secretos), `ip_hash`, `created_at` |
| `pasaporte_eventos` | `id`, `tipo` (`puerta_vista`, `pasaporte_creado`, `passkey_ok`, `passkey_error`, `passkey_cancel`, `respaldo_creado`, `inapp_detectado`, `vista_pasaporte`), `slug`, `vacante_id`, `user_agent`, `src`, `detalle`, `created_at` |

Acceso: el navegador nunca habla con la base. Toda lectura y escritura pasa por server components o API routes. El pasaporte público lee por una función `security definer` que solo devuelve lo que la página muestra (misma técnica que `vacante_stats`). El panel de empresa sale de funciones que solo devuelven conteos y porcentajes y ya aplican el mínimo de 5 personas: la regla vive en la base, no en la página, así que ni la API ni el conector pueden saltársela.

### 8.8 Variables de entorno nuevas

```env
NEXT_PUBLIC_STELLAR_RPC_URL=...
NEXT_PUBLIC_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_ACCOUNT_WASM_HASH=1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a
NEXT_PUBLIC_WEBAUTHN_VERIFIER=CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR
NEXT_PUBLIC_REGISTRO_ID=C...            # contrato nuevo
NEXT_PUBLIC_OPPORTUNI_ISSUER=G...       # dirección pública del emisor
NEXT_PUBLIC_OPPORTUNI_WA=52...          # número oficial de WhatsApp
OPPORTUNI_ISSUER_SECRET=S...            # SOLO servidor
CHANNELS_API_KEY=...                    # SOLO servidor
DB_URL=https://...                      # API de la base propia (8.10), SOLO servidor
DB_SERVICE_TOKEN=...                    # token de escritura de la base, SOLO servidor
CUSTODIA_MASTER_KEY=...                 # 32 bytes, cifra llaves de respaldo, SOLO en Vercel
IP_HASH_SECRET=...                      # HMAC del IP
DEVICE_COOKIE_SECRET=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

Ninguna de las que dicen "SOLO servidor" lleva `NEXT_PUBLIC_`. El repo es público: ningún valor real va en el código, en docs ni en commits.

### 8.9 API de admin y conector de Claude

**Una sola capa de servicio** (`app/lib/admin/*`) con las acciones. /admin, la API REST y el servidor MCP la llaman; ninguno repite lógica.

| Acción | REST (`/api/admin/v1`) | Rol mínimo |
|---|---|---|
| Crear link de vacante (URL, título, empresa) | `POST /vacantes` | `operacion` |
| Stats de una vacante (clicks, únicos, por canal y estado) | `GET /vacantes/{slug}` | `operacion` |
| Buscar joven por nombre o WhatsApp / ver ficha | `GET /jovenes?q=` / `GET /jovenes/{slug}` | `operacion` |
| Registrar pago | `POST /pagos` | `operacion` |
| Emitir CV verificado | `POST /credenciales/cv-verificado` | `operacion` |
| Reintentar emisión | `POST /credenciales/{id}/reintentar` | `operacion` |
| Panel de empresa (solo porcentajes, PDF o JSON) | `GET /empresas/{empresa}` | `operacion` |
| Ver y editar el formulario | `GET /formulario`, `PUT /formulario/preguntas/{id}` | `operacion` |
| Borrar datos de un joven | `DELETE /jovenes/{slug}` | `admin` |
| Crear y revocar llaves | `POST /api-keys`, `DELETE /api-keys/{id}` | `admin` |

**Llaves:**

- Formato `opp_` + 32 bytes aleatorios. Se muestra una sola vez; en la base solo queda su `sha256` y el prefijo para reconocerla.
- Solo en el header `Authorization: Bearer`, nunca en la URL. Comparación en tiempo constante. Límite de peticiones por llave.
- Rol `admin` para Roman; rol `operacion` para Vianey. Revocar es inmediato. `last_used_at` visible en /admin.
- Toda escritura queda en `admin_audit`. Ninguna respuesta devuelve secretos de Stellar ni llaves de respaldo.
- La llave no se pega en chats, código ni docs. Roman la guarda en su variable de entorno local.

**Servidor MCP** en `opportuni.xyz/api/mcp` (Streamable HTTP), con las mismas acciones como herramientas y descripciones en español:

- **Roman, Claude Code (v1):** `claude mcp add --transport http opportuni https://opportuni.xyz/api/mcp --header "Authorization: Bearer $OPP_ADMIN_KEY"`.
- **Vianey, claude.ai web (v1.1, el camino preferido para ella):** sí se puede. El "conector" de claude.ai es este mismo servidor MCP; lo que le falta es el login. Los conectores propios de claude.ai usan OAuth (los headers fijos están en beta solo para algunas organizaciones). Opportuni expone un OAuth mínimo: `401` con `resource_metadata`, `/.well-known/oauth-protected-resource`, servidor de autorización con CIMD o DCR, PKCE S256, redirect `https://claude.ai/api/mcp/auth_callback` (y loopback para Claude Code), login con su contraseña de admin y consentimiento, tokens cortos con refresh rotado, rol `operacion`. Para ella: Ajustes › Conectores › pegar la URL › entrar con su login. Nada más.
- Las herramientas que escriben (registrar pago, emitir CV) se marcan como de escritura para que Claude pida confirmación antes de usarlas.
- Va en v1.1 porque el OAuth es la parte más larga; mientras tanto Vianey usa /admin.

### 8.10 Servidor de base de datos

La base del pasaporte vive en un **servidor propio de Opportuni en Hetzner, con PostgreSQL en Docker**. Roman entra por SSH. La IP y los accesos no van en este repo porque es público.

**Sin migración.** La base nueva arranca vacía: de Supabase (el proyecto `gbdlfmkenfldrjnzxqst`, que es de la cuenta de Accesly) no se pasa nada. El esquema y las funciones (`crear_vacante`, `vacante_stats` y las nuevas) se crean con migraciones SQL versionadas en el repo (`db/migrations/`). Supabase se queda como está; `docs/tracking-vacantes.md` se actualiza cuando la app cambie de base.

**Propuesta** (a confirmar cuando veamos qué tiene el servidor):

- Tres contenedores en la misma red de Docker: Postgres 16, PostgREST y Caddy.
- Postgres **sin puerto publicado**, o publicado solo como `127.0.0.1:5432:5432`. Ojo: un `-p 5432:5432` de Docker abre el puerto a internet aunque el firewall (ufw) diga lo contrario, porque Docker escribe sus propias reglas de iptables.
- PostgREST detrás de Caddy con HTTPS en un subdominio (`db.opportuni.xyz`). La app lo llama desde el servidor con un token de servicio. Así `sbSelect`, `sbInsert` y `sbRpc` siguen casi iguales y se conserva la técnica de funciones `security definer` y RLS.
- No conectar Vercel directo al puerto de Postgres: Vercel Hobby no tiene IP fija para limitarlo, habría que abrirlo a todo internet.

**Endurecer el servidor antes de meter datos de jóvenes:**

- Usuario que no sea root, entrar con llave SSH, `PasswordAuthentication no` y `PermitRootLogin no`.
- Firewall con solo 22, 80 y 443 (el firewall de Hetzner Cloud, que sí aplica antes que Docker, o ufw más la precaución de arriba). fail2ban. Actualizaciones de seguridad automáticas.
**Respaldos** (sin esto, si el servidor muere se pierden todos los pasaportes):

- **Backups de Hetzner Cloud** activados: copia diaria de todo el servidor, se prende con un switch en la consola. Cubre un disco dañado o un error nuestro, pero vive en la misma cuenta de Hetzner.
- **`pg_dump` diario, cifrado, fuera de Hetzner:** un bucket de Cloudflare R2 (tiene capa gratis) o Supabase Storage **en un proyecto de la cuenta de Opportuni, nunca en el de Accesly** (son empresas separadas).
- Una prueba de restauración antes de lanzar la puerta.

## 9. Métricas

| Métrica | Para qué | Dónde |
|---|---|---|
| Pasaportes creados, por modo (passkey / respaldo) | La cifra principal para el SCF | `pasaportes` + stellar.expert |
| Credenciales confirmadas, por tipo | Actividad real en cadena | `credenciales` |
| Conversión de la puerta: vistas → pasaportes → llegan a la vacante | Si la puerta espanta gente | `pasaporte_eventos` |
| Clicks por vacante: totales, únicos, por canal y estado | Operación de Vianey y panel de empresas | `vacante_clicks` |
| Reparto de la comunidad por estado y por área | Panel de empresas | `pasaportes` |
| Pasaportes con 2 o más vacantes abiertas | Uso recurrente | `vacante_clicks` |
| Errores de passkey por plataforma | Decidir el login con Google | `pasaporte_eventos` |
| Verificaciones por QR | Si las empresas lo usan | `pasaporte_eventos` con `src=qr` |

No hay metas numéricas todavía: la primera semana es la línea base. No se comunica ninguna cifra afuera sin dato propio.

## 10. Plan de construcción

Por fases, en orden de riesgo. Cada fase sale sola a producción.

| Fase | Qué | Gate para pasar |
|---|---|---|
| **0 · Base propia** | Endurecer el servidor, contenedores de Postgres + PostgREST + Caddy, respaldos, esquema desde cero con migraciones en el repo, apuntar `app/lib/supabase.ts` | Una vacante de prueba se crea y se abre con `/v/{slug}` leyendo del servidor, y un respaldo se restauró bien |
| **1 · Links, formulario y puerta** | /admin con contraseña, generador de links (ya acepta canal opcional), formulario editable, puerta con términos, cookie, clicks con metadata, filtro de bots. El pasaporte existe solo en la base | Vianey comparte una vacante real con link Opportuni y ve quién la abrió |
| **2 · Stellar** | Arranca de cero (los gates del 26 y 27 sep no se corrieron). Kit con passkey en mainnet, permiso delegado, cuenta de respaldo, contrato de registro, credencial `vacante`, `/p/[slug]` | Cuenta desde iPhone en stellar.expert; emisión con permiso delegado o plan B de 8.4. Prueba con 2 o 3 personas reales, al menos un Android |
| **3 · Operación** | Fichas, pagos, CV verificado con reclamo y QR, panel de empresa en porcentajes, API con llaves, `admin_audit`, MCP para Claude Code | Roman registra un pago y emite un CV verificado desde Claude Code |
| **4 · v1.1** | OAuth del conector para Vianey, reclamar respaldo con passkey, login con Google si los datos lo piden, links por grupo para los 10 grupos de Opportuni MX | Vianey crea un link desde claude.ai |

Los pasaportes creados en la fase 1 reciben su cuenta en Stellar en su siguiente click (Face ID) o, si no la completan, una cuenta de respaldo.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| La puerta obligatoria baja los clicks a las vacantes | Medir la conversión de la puerta desde el día 1; texto corto; respaldo instantáneo si la passkey falla |
| Consentimiento y datos personales | A empresas solo porcentajes; aviso de privacidad publicado y leído por legal, casilla con versión, borrado a pedido (7.2) |
| Alguien se identifica por descarte en los porcentajes | Grupos de menos de 5 personas van a "Otros", aplicado en la base (RF19) |
| Llaves de respaldo en custodia | Cifradas con llave maestra que no vive en el servidor de la base; cuentas sin dinero; reclamo en v1.1 |
| El servidor propio se cae o se pierde | Respaldo diario fuera del servidor con prueba de restauración; si la base no responde, el link manda a la vacante igual (RF11) |
| Servidor con root por contraseña | Endurecer antes de meter datos de jóvenes (8.10) |
| Se filtra una llave de API | Solo hash en la base, revocación inmediata, rol mínimo, límite de peticiones, `admin_audit` |
| El conector de Claude escribe algo por error | Rol `operacion` sin borrado ni llaves, confirmación en herramientas de escritura, todo auditado |
| El estado del IP no cuadra con datos móviles | Cuenta el estado que da el joven en el formulario; el del IP solo preselecciona |
| Cookie borrada u otro navegador | "Ya tengo pasaporte" y un pasaporte por WhatsApp |
| Passkeys fallan en Android o en navegadores dentro de apps | RF1, RF10, prueba con Android, eventos por plataforma |
| `smart-account-kit` no está auditado | Las cuentas no guardan dinero en v1; fijar versiones exactas |
| La autorización delegada es más difícil de lo previsto | Plan B de 8.4 |
| Tope diario de Channels | Una credencial por joven y vacante; una API key por ambiente; si se agota, se reintenta al otro día |
| Datos personales en cadena | RF15 y 7.2: solo hash con salt |
| Un solo desarrollador | Fases con gate; lo que no salga se recorta, no se estira |

## 12. Preguntas abiertas

1. ~~¿Qué rama está desplegada?~~ Resuelto el 26 sep: `main` (= el antiguo `sinlogin`) es la rama de producción en el Vercel de la cuenta opportunixyz.
2. ¿Número de WhatsApp oficial para `NEXT_PUBLIC_OPPORTUNI_WA`?
3. ¿El pasaporte público muestra el nombre completo o nombre y primera letra del apellido? (v1 asume lo segundo.)
4. ¿La credencial `cv_verificado` se emite también a los clientes de los meses anteriores?
5. ~~¿Qué pasó con los gates del 26 y 27 sep?~~ Resuelto el 29 sep: no se corrieron. Solo se comprobó que un link desde WhatsApp en iPhone abre en Safari y que ahí funcionan las passkeys. La fase 2 arranca de cero.
6. Servidor en Hetzner: ¿qué contenedores tiene ya, cuánta RAM y disco? ¿Respaldo en R2 o en un Supabase de la cuenta de Opportuni?
7. ~~¿Qué grupos distinguir en los links?~~ Resuelto el 29 sep: Opportuni MX tiene 10 grupos y secciones. Los links por grupo van en la fase 4; desde la fase 1 la base ya guarda el canal si viene.
8. ¿Quién redacta y revisa los términos y el aviso de privacidad?
9. ~~¿El panel de empresa se comparte en pantalla o en PDF?~~ Resuelto el 29 sep: en PDF.
10. ¿Lista inicial de áreas: la de `/cv/revision` más Derecho, o Vianey tiene otra?
11. Servidor: hoy comparte máquina con otros servicios y le queda poco disco. ¿La base del pasaporte va en ese servidor o en uno dedicado de Hetzner?
