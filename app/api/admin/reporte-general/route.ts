import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, RGB, StandardFonts } from "pdf-lib";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";
import { A4, CONTENT_W, CREAM, DARK, GRAY, LILA, MARGIN, NAR, ROSA, TEAL, WHITE, clean, encabezado, pie, truncate } from "../../../lib/admin/pdf";
import { Reparto, reporteGeneral } from "../../../lib/admin/reportes";
import { slugify } from "../../../lib/admin/vacantes";

export const runtime = "nodejs";

// Reporte general en PDF para empresas: toda la comunidad, o ?empresa=X para
// las personas que abrieron sus vacantes. Solo porcentajes, nunca nombres ni
// WhatsApp (PRD F3); el mínimo de 5 personas por grupo lo aplica la base.
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;

  try {
    const r = await reporteGeneral(new URL(req.url).searchParams.get("empresa") ?? "");
    const esEmpresa = r.alcance === "empresa";

    const doc = await PDFDocument.create();
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fecha = new Date().toLocaleDateString("es-MX", { dateStyle: "long" });

    let page = doc.addPage(A4);
    encabezado(page, bold, helv, esEmpresa ? "REPORTE PARA EMPRESA" : "REPORTE DE LA COMUNIDAD", fecha);

    let y = 706;
    const titulo = esEmpresa ? r.empresa ?? "" : "Comunidad Opportuni";
    page.drawText(truncate(titulo, bold, 20, CONTENT_W), { x: MARGIN, y, size: 20, font: bold, color: DARK });
    y -= 18;
    const bajada = esEmpresa
      ? "Quién abrió sus vacantes a través de Opportuni, en datos generales."
      : "Quiénes forman la comunidad de Opportuni, en datos generales.";
    page.drawText(clean(bajada), { x: MARGIN, y, size: 10, font: helv, color: GRAY });
    y -= 30;

    // ---- Tarjetas ----
    const cards: { label: string; value: number; color: RGB }[] = esEmpresa
      ? [
          { label: "PERSONAS", value: r.personas, color: ROSA },
          { label: "CLICKS", value: r.clicks, color: NAR },
          { label: "VACANTES", value: r.vacantes.length, color: TEAL },
        ]
      : [
          { label: "PASAPORTES", value: r.comunidad.pasaportes, color: ROSA },
          { label: "VACANTES", value: r.comunidad.vacantes, color: NAR },
          { label: "CLICKS", value: r.comunidad.clicks, color: TEAL },
        ];
    const cardW = (CONTENT_W - 24) / 3;
    const cardH = 80;
    cards.forEach((c, i) => {
      const cx = MARGIN + i * (cardW + 12);
      page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: cardH, color: c.color, borderColor: DARK, borderWidth: 2 });
      const v = c.value.toLocaleString("es-MX");
      page.drawText(v, { x: cx + (cardW - bold.widthOfTextAtSize(v, 30)) / 2, y: y - 44, size: 30, font: bold, color: WHITE });
      page.drawText(c.label, { x: cx + (cardW - bold.widthOfTextAtSize(c.label, 9)) / 2, y: y - 66, size: 9, font: bold, color: WHITE });
    });
    y -= cardH + 30;

    const nuevaPagina = () => {
      pie(page, helv, `opportuni.xyz · ${fecha}`);
      page = doc.addPage(A4);
      y = A4[1] - 60;
    };
    const espacio = (alto: number) => {
      if (y - alto < 70) nuevaPagina();
    };

    // ---- Vacantes de la empresa ----
    if (esEmpresa && r.vacantes.length > 0) {
      espacio(60);
      page.drawText("Sus vacantes", { x: MARGIN, y, size: 14, font: bold, color: DARK });
      y -= 22;
      const cols = [
        { label: "Vacante", x: MARGIN + 8, w: 330 },
        { label: "Clicks", x: MARGIN + 350, w: 70 },
        { label: "Personas", x: MARGIN + 425, w: 70 },
      ];
      const cabecera = () => {
        page.drawRectangle({ x: MARGIN, y: y - 6, width: CONTENT_W, height: 20, color: DARK });
        cols.forEach((c) => page.drawText(c.label, { x: c.x, y, size: 9, font: bold, color: WHITE }));
        y -= 22;
      };
      cabecera();
      r.vacantes.forEach((v, i) => {
        if (y < 70) {
          nuevaPagina();
          cabecera();
        }
        if (i % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 5, width: CONTENT_W, height: 17, color: CREAM });
        const t = v.activa ? v.titulo : `${v.titulo} (cerrada)`;
        page.drawText(truncate(t, helv, 9, cols[0].w), { x: cols[0].x, y, size: 9, font: helv, color: DARK });
        page.drawText(String(v.clicks), { x: cols[1].x, y, size: 9, font: helv, color: DARK });
        page.drawText(String(v.personas), { x: cols[2].x, y, size: 9, font: helv, color: DARK });
        y -= 17;
      });
      y -= 22;
    }

    // ---- Repartos ----
    const barra = (titulo: string, datos: Reparto[], color: RGB, nota?: string) => {
      espacio(50 + Math.min(datos.length, 3) * 20);
      page.drawText(titulo, { x: MARGIN, y, size: 14, font: bold, color: DARK });
      y -= 20;
      if (nota) {
        page.drawText(clean(nota), { x: MARGIN, y, size: 8, font: helv, color: GRAY });
        y -= 16;
      }
      const labelW = 160;
      const barMax = CONTENT_W - labelW - 110;
      for (const d of datos) {
        espacio(20);
        page.drawText(truncate(d.etiqueta, helv, 9, labelW - 8), { x: MARGIN, y, size: 9, font: helv, color: DARK });
        const w = Math.max(2, (barMax * Math.min(d.pct, 100)) / 100);
        page.drawRectangle({ x: MARGIN + labelW, y: y - 3, width: barMax, height: 12, color: CREAM });
        page.drawRectangle({ x: MARGIN + labelW, y: y - 3, width: w, height: 12, color });
        const txt = `${d.pct.toLocaleString("es-MX")}% · ${d.personas}`;
        page.drawText(txt, { x: MARGIN + labelW + barMax + 10, y, size: 9, font: bold, color: DARK });
        y -= 20;
      }
      y -= 14;
    };

    if (r.personas < r.minimo_grupo) {
      espacio(40);
      const msg = `Todavía no hay suficientes personas para mostrar el reparto (se necesitan al menos ${r.minimo_grupo}).`;
      page.drawText(clean(msg), { x: MARGIN, y, size: 10, font: helv, color: GRAY });
      y -= 30;
    } else {
      barra("Por estado", r.por_estado, ROSA);
      barra("Por área de interés", r.por_area, LILA, "Cada persona puede elegir hasta 3 áreas, por eso esta sección suma más de 100%.");
      barra("Por edad", r.por_edad, NAR);
    }

    // ---- Nota de privacidad ----
    espacio(40);
    const nota = [
      "Solo datos generales: sin nombres, WhatsApp ni ciudad.",
      `Los grupos de menos de ${r.minimo_grupo} personas se juntan en "Otros".`,
    ];
    nota.forEach((l) => {
      page.drawText(clean(l), { x: MARGIN, y, size: 8, font: helv, color: GRAY });
      y -= 12;
    });
    pie(page, helv, `opportuni.xyz · ${fecha}`);

    const nombre = esEmpresa ? slugify(r.empresa ?? "empresa") || "empresa" : "comunidad";
    const dia = new Date().toISOString().slice(0, 10);
    return new NextResponse(Buffer.from(await doc.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-${nombre}-${dia}.pdf"`,
      },
    });
  } catch (e) {
    return respuestaError(e, "reporte general");
  }
}
