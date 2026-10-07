# Dashboard de Opportuni en Dune

Queries públicas, en inglés, con la actividad del Pasaporte Opportuni en Stellar mainnet. Dashboard: https://dune.com/opportunixyz/opportuni (con link desde /traccion). Solo usan datos de la cadena: tipo de cuenta, fechas, credenciales y comisiones. Nunca nombres, WhatsApp ni otros datos personales, porque esos no están en la cadena.

| Archivo | Query en Dune | Qué muestra |
|---|---|---|
| `cuentas.sql` | [8872751](https://dune.com/queries/8872751) | Una fila por cuenta de pasaporte: fecha, modo (`passkey` o `backup`) y link a stellar.expert |
| `credenciales.sql` | [8872752](https://dune.com/queries/8872752) | Credenciales emitidas y revocadas en el contrato de registro, con su tipo |
| `resumen.sql` | [8872753](https://dune.com/queries/8872753) | Cifras principales: cuentas, con passkey, de respaldo, % con passkey y credenciales |
| `cuentas_por_dia.sql` | [8872754](https://dune.com/queries/8872754) | Cuentas nuevas por día (passkey y respaldo) y acumuladas |
| `credenciales_por_semana.sql` | [8872755](https://dune.com/queries/8872755) | Credenciales por semana y tipo |
| `comisiones.sql` | [8872756](https://dune.com/queries/8872756) | Transacciones y XLM de comisiones, separando lo que pagó Channels de lo que pagó Opportuni |

`resumen`, `cuentas_por_dia`, `credenciales_por_semana` y `comisiones` leen de `cuentas` y `credenciales` (`query_8872751` y `query_8872752`), así que todas cuentan igual.

## Cómo se reconocen las cuentas de Opportuni

- **El deployer no sirve para las de passkey.** `smart-account-kit` las despliega con un deployer que comparten todas las apps que lo usan.
- **Lo que sí distingue:** cada pasaporte recibe la regla "Opportuni" (`add_context_rule` sobre el contrato de registro `CCYQALCX…`) con el emisor de Opportuni `GCJOMP6D…` como signer delegado. `cuentas.sql` busca esa operación.
- **Respaldo (`backup`) o passkey:** las cuentas de respaldo las despliega el emisor de Opportuni (`create_contract_v2` con `address` igual al emisor); las demás son con passkey.
- **Cuentas sin la regla:** una cuenta con passkey cuyo permiso de Opportuni falló no aparece, porque no tiene la regla.
- **Cuentas que no son personas:** las de prueba del equipo y 20 cuentas duplicadas por el error del candado de respaldo (corregido el 7 oct 2026, migración 0019) están en la lista `test_accounts` de `cuentas.sql`. Las de prueba también están en `credenciales.sql`. Si se borra otro pasaporte de prueba de la base, hay que agregar su cuenta a las dos listas para que Dune cuadre con /traccion.
- **Retraso:** los datos de Stellar llegan a Dune con 1 a 2 horas de retraso (medido el 30 sep 2026). /traccion es la cifra en tiempo real.

## Cambiar una query

1. Edita el `.sql`. Para leer de otra query, usa `{{cuentas}}` o `{{credenciales}}`: el script pone el ID.
2. Corre `python3 scripts/dune.py`. Actualiza las queries que ya tienen ID en `queries.json`, crea las nuevas y corre todas para comprobar que no fallen.

Necesita `API_DUNE` en `.env`, que es solo local y nunca va al repo.

## Armar el dashboard (una vez, en la web de Dune)

La API de Dune crea queries, pero no gráficas ni dashboards. Los títulos van en inglés, como las queries.

1. Crea el dashboard: **Create › New dashboard**, llamado "Opportuni", público (`dune.com/opportunixyz/opportuni`).
2. En cada query, entra a su link, toca **New visualization** y después **Add to dashboard**:

   | Query | Gráfica |
   |---|---|
   | `resumen` | Un **Counter** por cada cifra: `accounts`, `passkey_accounts`, `backup_accounts`, `passkey_pct` (con sufijo %) y `credentials_issued` |
   | `cuentas_por_dia` | **Bar chart** con `day` en X y `passkey` y `backup` apiladas, más `total_accounts` como línea |
   | `credenciales_por_semana` | **Bar chart** con `week` en X, `issued` en Y y agrupado por `kind` |
   | `cuentas` | La tabla de resultados, con `created_at`, `mode` y `explorer` |
   | `comisiones` | Counters de `transactions` y `xlm_fees` |

3. Agrega un bloque de texto: "Accounts and credentials of the Opportuni Passport on Stellar mainnet. No personal data on-chain. Real-time numbers at opportuni.xyz/traccion".
