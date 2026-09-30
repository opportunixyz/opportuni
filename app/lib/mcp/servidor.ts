import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { emitirCvVerificado } from "../admin/credenciales";
import { crearGrupo, linkDeGrupo, listarGrupos, statsGrupos, type Grupo } from "../admin/grupos";
import { listarJovenes, vacantesDeJoven } from "../admin/jovenes";
import { reporteGeneral } from "../admin/reportes";
import { activarVacante, crearVacante, ErrorServicio, linkDe, listarVacantes, quienAbrio } from "../admin/vacantes";
import type { SesionMcp } from "../oauth/tokens";
import { svcInsert } from "../supabase";

// Servidor MCP de Opportuni (PRD 8.9): las mismas acciones de /admin como
// herramientas para Claude. Una instancia por petición (sin estado). Todo lo
// que escribe queda en admin_audit con el usuario del equipo.

const INSTRUCCIONES = `Eres el asistente del equipo de Opportuni, comunidad de más de 12 mil jóvenes en México y Colombia que comparte vacantes por grupos de WhatsApp.
- Cada vacante tiene un link opportuni.xyz/v/{vacante} y un link por grupo de WhatsApp (opportuni.xyz/v/{vacante}/{grupo}). Cuando se cree una vacante, entrega los links por grupo ordenados por comunidad, listos para copiar y pegar, uno por grupo.
- "Pasaportes nuevos" de un grupo = personas cuyo primer click en Opportuni llegó por ese grupo: mide qué grupo trae gente.
- Nombres y WhatsApp de los jóvenes son solo para el equipo: nunca los pongas en mensajes para empresas. A una empresa solo se le dan porcentajes (reporte_para_empresa), sin nombres, WhatsApp ni ciudad.
- Emitir un CV verificado es permanente en la red Stellar: confírmalo con la persona antes de hacerlo y solo si pagó y su CV pasa filtros ATS.
- Escribe en español, claro y breve, sin guiones largos.`;

type Contenido = { content: { type: "text"; text: string }[]; isError?: boolean };

const texto = (t: string): Contenido => ({ content: [{ type: "text", text: t }] });
const json = (resumen: string, datos: unknown): Contenido =>
  texto(`${resumen}\n\n${JSON.stringify(datos, null, 2)}`);

/** Corre la acción y convierte los errores del servicio en un mensaje para Claude. */
async function seguro(fn: () => Promise<Contenido>): Promise<Contenido> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof ErrorServicio ? e.message : "No se pudo completar la acción.";
    if (!(e instanceof ErrorServicio)) console.error("[mcp]", e instanceof Error ? e.message : e);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}

function linksPorComunidad(vacante: string, grupos: Grupo[]): string {
  const bloques = new Map<string, string[]>();
  for (const g of grupos) {
    const c = g.comunidad || "Otros";
    if (!bloques.has(c)) bloques.set(c, []);
    bloques.get(c)!.push(`${g.nombre}: ${linkDeGrupo(vacante, g.slug)}`);
  }
  return Array.from(bloques.entries())
    .map(([c, l]) => `*${c}*\n${l.join("\n")}`)
    .join("\n\n");
}

type Forma = Record<string, z.ZodTypeAny>;
type Anotaciones = { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
type Config<F extends Forma> = { title: string; description: string; inputSchema?: F; annotations?: Anotaciones };

export function crearServidorMcp(s: SesionMcp): McpServer {
  const server = new McpServer({ name: "opportuni", version: "1.0.0" }, { instructions: INSTRUCCIONES });
  // registerTool con tipos simples: la inferencia de la SDK con esquemas
  // grandes revienta TypeScript (TS2589). La validación la sigue haciendo zod.
  const herramienta = <F extends Forma>(
    nombre: string,
    config: Config<F>,
    cb: (args: z.infer<z.ZodObject<F>>) => Promise<Contenido>
  ) => (server.registerTool as unknown as (n: string, c: Config<F>, f: typeof cb) => void).call(server, nombre, config, cb);
  const actor = `mcp:${s.usuario}`;
  const auditar = (accion: string, detalle: Record<string, unknown>) =>
    svcInsert("admin_audit", { usuario: s.usuario, rol: s.rol, via: "mcp", accion, detalle }).catch((e) =>
      console.error("[mcp] auditoría:", e instanceof Error ? e.message : e)
    );

  const lectura = { readOnlyHint: true, openWorldHint: false } as const;

  // ---- Vacantes ----

  herramienta(
    "listar_vacantes",
    {
      title: "Listar vacantes",
      description: "Vacantes de Opportuni con su link, si están prendidas y sus clicks y personas.",
      annotations: lectura,
    },
    () =>
      seguro(async () => {
        const v = await listarVacantes();
        return json(
          `${v.length} vacantes.`,
          v.map((x) => ({
            vacante: x.vacante_id,
            titulo: x.titulo,
            empresa: x.empresa,
            prendida: x.activa,
            link: linkDe(x.vacante_id),
            clicks: x.clicks,
            personas: x.personas,
            creada: x.created_at,
          }))
        );
      })
  );

  herramienta(
    "crear_vacante",
    {
      title: "Crear vacante",
      description:
        "Crea el link Opportuni de una vacante (opportuni.xyz/v/{vacante}) y devuelve sus links por grupo de WhatsApp, por comunidad, listos para pegar.",
      inputSchema: {
        titulo: z.string().min(1).max(200).describe("Puesto, ej. Product Manager"),
        empresa: z.string().max(120).optional().describe("Empresa, ej. Nubank"),
        url: z.string().max(1000).optional().describe("URL de la vacante (su formulario, LinkedIn, etc.)"),
        slug: z.string().max(60).optional().describe("Link corto opcional, ej. pm-nubank; si no, se arma solo"),
        ubicacion: z.string().max(120).optional(),
        tipo: z.enum(["remoto", "presencial", "hibrido"]).optional(),
        salario: z.string().max(120).optional(),
        descripcion: z.string().max(4000).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    (a) =>
      seguro(async () => {
        const v = await crearVacante(a, actor);
        await auditar("crear_vacante", { vacante: v.id, titulo: a.titulo, empresa: a.empresa ?? null });
        const grupos = await listarGrupos(true);
        return texto(
          `Vacante creada: ${v.id}\nLink general: ${v.link}\n\nLinks por grupo:\n\n${linksPorComunidad(v.id, grupos)}`
        );
      })
  );

  herramienta(
    "links_por_grupo",
    {
      title: "Links por grupo",
      description: "Los links de una vacante para cada grupo de WhatsApp, por comunidad, listos para copiar y pegar.",
      inputSchema: { vacante: z.string().min(2).max(40).describe("Id de la vacante, ej. pm-nubank") },
      annotations: lectura,
    },
    ({ vacante }) =>
      seguro(async () => {
        const grupos = await listarGrupos(true);
        return texto(`Link general: ${linkDe(vacante)}\n\n${linksPorComunidad(vacante, grupos)}`);
      })
  );

  herramienta(
    "prender_apagar_vacante",
    {
      title: "Prender o apagar vacante",
      description: "Prende o apaga el link de una vacante. Apagada, su link manda a /vacantes.",
      inputSchema: { vacante: z.string().min(2).max(40), prendida: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ vacante, prendida }) =>
      seguro(async () => {
        await activarVacante(vacante, prendida);
        await auditar("prender_apagar_vacante", { vacante, prendida });
        return texto(`${vacante} quedó ${prendida ? "prendida" : "apagada"}.`);
      })
  );

  herramienta(
    "cifras_de_vacante",
    {
      title: "Cifras de una vacante",
      description: "Clicks, personas y pasaportes nuevos de una vacante, en total y por grupo de WhatsApp.",
      inputSchema: { vacante: z.string().min(2).max(40) },
      annotations: lectura,
    },
    ({ vacante }) =>
      seguro(async () => {
        const [todas, porGrupo] = await Promise.all([listarVacantes(), statsGrupos(vacante)]);
        const v = todas.find((x) => x.vacante_id === vacante);
        if (!v) throw new ErrorServicio("No existe esa vacante.", 404);
        return json(`${v.titulo}${v.empresa ? ` · ${v.empresa}` : ""}`, {
          clicks: v.clicks,
          personas: v.personas,
          prendida: v.activa,
          por_grupo: porGrupo
            .filter((g) => g.clicks > 0 || g.nuevos > 0)
            .map((g) => ({ grupo: g.nombre, comunidad: g.comunidad, clicks: g.clicks, personas: g.personas, pasaportes_nuevos: g.nuevos })),
        });
      })
  );

  herramienta(
    "quien_abrio_vacante",
    {
      title: "Quién abrió una vacante",
      description:
        "Personas con pasaporte que abrieron una vacante: nombre, WhatsApp, estado, áreas, edad y grupo. Solo para el equipo; nunca se comparte con empresas.",
      inputSchema: { vacante: z.string().min(2).max(40) },
      annotations: lectura,
    },
    ({ vacante }) =>
      seguro(async () => {
        const p = await quienAbrio(vacante);
        return json(`${p.length} personas (solo equipo).`, p);
      })
  );

  // ---- Grupos ----

  herramienta(
    "impacto_de_grupos",
    {
      title: "Impacto de los grupos",
      description:
        "Por grupo de WhatsApp: pasaportes nuevos que trajo (primer click por ese grupo), personas, clicks y vacantes, de todas las vacantes.",
      annotations: lectura,
    },
    () =>
      seguro(async () => {
        const g = await statsGrupos();
        return json(
          "Por grupo (pasaportes nuevos = gente que ese grupo trajo a Opportuni).",
          g.map((x) => ({
            grupo: x.nombre,
            comunidad: x.comunidad,
            link: x.canal || "(link general)",
            prendido: x.activo,
            pasaportes_nuevos: x.nuevos,
            personas: x.personas,
            clicks: x.clicks,
            vacantes: x.vacantes,
          }))
        );
      })
  );

  herramienta(
    "crear_grupo",
    {
      title: "Crear grupo de WhatsApp",
      description: "Agrega un grupo de WhatsApp a la lista; desde ahí cada vacante tiene un link para él.",
      inputSchema: {
        nombre: z.string().min(1).max(80).describe("Ej. Ingeniería · MX 6.0"),
        comunidad: z.string().max(80).optional().describe("Ej. Opportuni MX 3.0"),
        slug: z.string().max(40).optional().describe("Link corto del grupo, ej. mx6-ing; no se puede cambiar después"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ nombre, comunidad, slug }) =>
      seguro(async () => {
        const g = await crearGrupo(nombre, slug, comunidad);
        await auditar("crear_grupo", { grupo: g.slug, nombre: g.nombre, comunidad: g.comunidad });
        return texto(`Grupo creado: ${g.nombre} (/${g.slug}).`);
      })
  );

  // ---- Jóvenes ----

  herramienta(
    "buscar_jovenes",
    {
      title: "Buscar jóvenes",
      description:
        "Busca pasaportes por nombre o WhatsApp (vacío = los más recientes). Datos personales: solo para el equipo.",
      inputSchema: { busqueda: z.string().max(80).optional().describe("Nombre o parte del WhatsApp") },
      annotations: lectura,
    },
    ({ busqueda }) =>
      seguro(async () => {
        const j = await listarJovenes(busqueda ?? "", 30);
        return json(
          `${j.length} pasaportes (solo equipo).`,
          j.map((x) => ({
            pasaporte: x.slug,
            nombre: x.nombre,
            whatsapp: x.whatsapp,
            estado: x.estado,
            areas: x.areas,
            edad: x.rango_edad,
            vacantes_abiertas: x.vacantes,
            clicks: x.clicks,
            cuenta: x.cuenta_modo,
            cv_verificado: x.cv_estado,
            alta: x.created_at,
          }))
        );
      })
  );

  herramienta(
    "vacantes_de_joven",
    {
      title: "Vacantes que abrió un joven",
      description: "Las vacantes que abrió una persona, con fechas y grupo. Solo para el equipo.",
      inputSchema: { pasaporte: z.string().regex(/^[a-z0-9]{8}$/).describe("Id del pasaporte (8 caracteres)") },
      annotations: lectura,
    },
    ({ pasaporte }) =>
      seguro(async () => {
        const v = await vacantesDeJoven(pasaporte);
        return json(`${v.length} vacantes.`, v);
      })
  );

  herramienta(
    "emitir_cv_verificado",
    {
      title: "Emitir CV verificado",
      description:
        "Emite en la red Stellar la credencial CV verificado a un pasaporte. Es permanente: solo si la persona pagó y su CV pasa filtros ATS. Confirma antes con quien lo pide.",
      inputSchema: { pasaporte: z.string().regex(/^[a-z0-9]{8}$/) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    ({ pasaporte }) =>
      seguro(async () => {
        const r = await emitirCvVerificado(pasaporte);
        await auditar("emitir_cv_verificado", { pasaporte, estado: r.estado });
        return texto(r.mensaje);
      })
  );

  // ---- Empresas ----

  herramienta(
    "reporte_para_empresa",
    {
      title: "Reporte para empresa",
      description:
        "Datos generales para una empresa (o de toda la comunidad si no se da empresa): personas, clicks y porcentajes por estado, área y edad. Sin nombres ni WhatsApp; grupos de menos de 5 personas van en 'Otros'. El PDF se descarga en /admin › Reportes.",
      inputSchema: { empresa: z.string().max(120).optional() },
      annotations: lectura,
    },
    ({ empresa }) =>
      seguro(async () => {
        const r = await reporteGeneral(empresa ?? "");
        return json(r.empresa ? `Reporte de ${r.empresa}.` : "Reporte de toda la comunidad.", r);
      })
  );

  return server;
}
