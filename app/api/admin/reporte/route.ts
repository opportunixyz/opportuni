import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { sinSesion } from "../../../lib/admin/guard";
import { getVacanteById, svcRpc } from "../../../lib/supabase";

export const runtime = "nodejs";

// Paleta Opportuni (globals.css)
const DARK = rgb(26 / 255, 26 / 255, 46 / 255);
const ROSA = rgb(227 / 255, 33 / 255, 109 / 255);
const NAR = rgb(248 / 255, 155 / 255, 14 / 255);
const TEAL = rgb(14 / 255, 196 / 255, 169 / 255);
const CREAM = rgb(253 / 255, 246 / 255, 238 / 255);
const GRAY = rgb(0.42, 0.42, 0.48);
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_W = A4[0] - MARGIN * 2;

// WinAnsi no cubre emojis ni todo unicode; deja solo lo imprimible.
const clean = (s: string) =>
  s.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°·$€%&@#()/:.,+'"–—-]/g, "").trim();

const truncate = (s: string, font: PDFFont, size: number, maxW: number) => {
  let t = clean(s);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxW) t = t.slice(0, -1);
  return t + "…";
};

interface Postulante {
  nombre: string;
  carrera_area: string;
  whatsapp: string;
  cv_link: string | null;
  created_at: string;
}

// Reporte INTERNO de una vacante: clicks, postulaciones y lista de postulantes
// con WhatsApp. No es para empresas: a ellas solo van porcentajes (PRD F3).
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  const url = new URL(req.url);

  const id = url.searchParams.get("vacante") ?? "";
  const vacante = id ? await getVacanteById(id).catch(() => null) : null;
  if (!vacante) {
    return NextResponse.json({ ok: false, error: "Vacante no encontrada." }, { status: 404 });
  }

  const [stats, postulantes] = await Promise.all([
    svcRpc<{ vacante_id: string; clicks: number; postulantes: number }[]>("vacante_stats"),
    svcRpc<Postulante[]>("postulantes_por_vacante", { vid: id }),
  ]);
  const stat = stats.find((s) => s.vacante_id === id);
  const clicks = Number(stat?.clicks ?? 0);
  const numPost = Number(stat?.postulantes ?? postulantes.length);

  const origin = url.origin;
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const fecha = new Date().toLocaleDateString("es-MX", { dateStyle: "long" });
  const footer = (page: PDFPage) => {
    const txt = clean(`Generado desde el dashboard de Opportuni · ${fecha}`);
    page.drawText(txt, {
      x: (A4[0] - helv.widthOfTextAtSize(txt, 8)) / 2,
      y: 28,
      size: 8,
      font: helv,
      color: GRAY,
    });
  };

  let page = doc.addPage(A4);

  // ---- Encabezado ----
  page.drawRectangle({ x: 0, y: 752, width: A4[0], height: 90, color: DARK });
  page.drawRectangle({ x: 0, y: 748, width: A4[0], height: 4, color: ROSA });
  page.drawText("Opportuni", { x: MARGIN, y: 796, size: 24, font: bold, color: WHITE });
  page.drawSvgPath("M 0 -5 L 1.6 -1.6 L 5 0 L 1.6 1.6 L 0 5 L -1.6 1.6 L -5 0 L -1.6 -1.6 Z", {
    x: MARGIN + bold.widthOfTextAtSize("Opportuni", 24) + 12,
    y: 805,
    color: NAR,
  });
  page.drawText("REPORTE DE VACANTE", { x: MARGIN, y: 772, size: 10, font: bold, color: NAR });
  const fw = helv.widthOfTextAtSize(clean(fecha), 9);
  page.drawText(clean(fecha), { x: A4[0] - MARGIN - fw, y: 796, size: 9, font: helv, color: rgb(0.75, 0.75, 0.8) });

  // ---- Vacante ----
  let y = 706;
  page.drawText(truncate(vacante.titulo, bold, 20, CONTENT_W), { x: MARGIN, y, size: 20, font: bold, color: DARK });
  y -= 21;
  const meta = [vacante.empresa, vacante.ubicacion, vacante.tipo, vacante.salario]
    .filter(Boolean)
    .join("  ·  ");
  if (meta) {
    page.drawText(truncate(meta, helv, 11, CONTENT_W), { x: MARGIN, y, size: 11, font: helv, color: GRAY });
    y -= 16;
  }
  const pub = new Date(vacante.created_at).toLocaleDateString("es-MX", { dateStyle: "long" });
  page.drawText(clean(`Publicada el ${pub}`), { x: MARGIN, y, size: 9, font: helv, color: GRAY });
  y -= 22;

  // ---- Links ----
  page.drawRectangle({ x: MARGIN, y: y - 44, width: CONTENT_W, height: 48, color: CREAM, borderColor: DARK, borderWidth: 1.5 });
  page.drawText("Link corto:", { x: MARGIN + 12, y: y - 12, size: 9, font: bold, color: DARK });
  page.drawText(clean(`${origin}/v/${vacante.id}`), { x: MARGIN + 75, y: y - 12, size: 9, font: helv, color: ROSA });
  page.drawText("Postulación:", { x: MARGIN + 12, y: y - 32, size: 9, font: bold, color: DARK });
  page.drawText(clean(`${origin}/postular/${vacante.id}`), { x: MARGIN + 75, y: y - 32, size: 9, font: helv, color: ROSA });
  y -= 70;

  // ---- Tarjetas de métricas ----
  const cardW = (CONTENT_W - 20) / 2;
  const cardH = 96;
  const cards: { label: string; value: string; color: ReturnType<typeof rgb> }[] = [
    { label: "CLICKS EN EL LINK", value: String(clicks), color: ROSA },
    { label: "POSTULACIONES", value: String(numPost), color: TEAL },
  ];
  cards.forEach((c, i) => {
    const cx = MARGIN + i * (cardW + 20);
    page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: cardH, color: c.color, borderColor: DARK, borderWidth: 2 });
    const vw = bold.widthOfTextAtSize(c.value, 38);
    page.drawText(c.value, { x: cx + (cardW - vw) / 2, y: y - 52, size: 38, font: bold, color: WHITE });
    const lw = bold.widthOfTextAtSize(c.label, 10);
    page.drawText(c.label, { x: cx + (cardW - lw) / 2, y: y - 78, size: 10, font: bold, color: WHITE });
  });
  y -= cardH + 18;

  const conv = clicks > 0 ? `Tasa de conversión: ${((numPost / clicks) * 100).toFixed(1)}% (postulaciones por click)` : "Tasa de conversión: — (aún sin clicks)";
  page.drawText(clean(conv), { x: MARGIN, y, size: 10, font: helv, color: GRAY });
  y -= 30;

  // ---- Tabla de postulantes ----
  page.drawText(`Postulantes (${numPost})`, { x: MARGIN, y, size: 14, font: bold, color: DARK });
  y -= 20;

  const COLS = [
    { label: "Nombre", x: MARGIN + 8, w: 150 },
    { label: "Carrera / área", x: MARGIN + 166, w: 130 },
    { label: "WhatsApp", x: MARGIN + 304, w: 110 },
    { label: "Fecha", x: MARGIN + 422, w: 70 },
  ];
  const header = (p: PDFPage, yy: number) => {
    p.drawRectangle({ x: MARGIN, y: yy - 6, width: CONTENT_W, height: 20, color: DARK });
    COLS.forEach((c) => p.drawText(c.label, { x: c.x, y: yy, size: 9, font: bold, color: WHITE }));
    return yy - 22;
  };

  if (postulantes.length === 0) {
    page.drawText("Aún no hay postulantes para esta vacante.", { x: MARGIN, y, size: 10, font: helv, color: GRAY });
  } else {
    y = header(page, y);
    for (let i = 0; i < postulantes.length; i++) {
      if (y < 60) {
        footer(page);
        page = doc.addPage(A4);
        y = A4[1] - 60;
        y = header(page, y);
      }
      const p = postulantes[i];
      if (i % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: y - 5, width: CONTENT_W, height: 17, color: CREAM });
      }
      const f = new Date(p.created_at).toLocaleDateString("es-MX");
      page.drawText(truncate(p.nombre, helv, 9, COLS[0].w), { x: COLS[0].x, y, size: 9, font: helv, color: DARK });
      page.drawText(truncate(p.carrera_area, helv, 9, COLS[1].w), { x: COLS[1].x, y, size: 9, font: helv, color: DARK });
      page.drawText(truncate(p.whatsapp, helv, 9, COLS[2].w), { x: COLS[2].x, y, size: 9, font: helv, color: DARK });
      page.drawText(clean(f), { x: COLS[3].x, y, size: 9, font: helv, color: DARK });
      y -= 17;
    }
  }
  footer(page);

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${vacante.id}.pdf"`,
    },
  });
}
