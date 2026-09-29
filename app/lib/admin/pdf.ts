import { PDFFont, PDFPage, rgb } from "pdf-lib";

// Piezas compartidas de los reportes PDF del admin (marca de globals.css).

export const DARK = rgb(26 / 255, 26 / 255, 46 / 255);
export const ROSA = rgb(227 / 255, 33 / 255, 109 / 255);
export const NAR = rgb(248 / 255, 155 / 255, 14 / 255);
export const LILA = rgb(124 / 255, 92 / 255, 252 / 255);
export const TEAL = rgb(14 / 255, 196 / 255, 169 / 255);
export const CREAM = rgb(253 / 255, 246 / 255, 238 / 255);
export const GRAY = rgb(0.42, 0.42, 0.48);
export const WHITE = rgb(1, 1, 1);

export const A4: [number, number] = [595.28, 841.89];
export const MARGIN = 48;
export const CONTENT_W = A4[0] - MARGIN * 2;

// WinAnsi no cubre emojis ni todo unicode; deja solo lo imprimible.
export const clean = (s: string) =>
  s.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ¿¡°·$€%&@#()/:.,+'"–—-]/g, "").trim();

export const truncate = (s: string, font: PDFFont, size: number, maxW: number) => {
  let t = clean(s);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxW) t = t.slice(0, -1);
  return t + "…";
};

/** Banda oscura con la marca, el subtítulo en naranja y la fecha a la derecha. */
export function encabezado(page: PDFPage, bold: PDFFont, helv: PDFFont, subtitulo: string, fecha: string) {
  page.drawRectangle({ x: 0, y: 752, width: A4[0], height: 90, color: DARK });
  page.drawRectangle({ x: 0, y: 748, width: A4[0], height: 4, color: ROSA });
  page.drawText("Opportuni", { x: MARGIN, y: 796, size: 24, font: bold, color: WHITE });
  page.drawSvgPath("M 0 -5 L 1.6 -1.6 L 5 0 L 1.6 1.6 L 0 5 L -1.6 1.6 L -5 0 L -1.6 -1.6 Z", {
    x: MARGIN + bold.widthOfTextAtSize("Opportuni", 24) + 12,
    y: 805,
    color: NAR,
  });
  page.drawText(clean(subtitulo), { x: MARGIN, y: 772, size: 10, font: bold, color: NAR });
  const f = clean(fecha);
  page.drawText(f, { x: A4[0] - MARGIN - helv.widthOfTextAtSize(f, 9), y: 796, size: 9, font: helv, color: rgb(0.75, 0.75, 0.8) });
}

export function pie(page: PDFPage, helv: PDFFont, texto: string) {
  const t = clean(texto);
  page.drawText(t, { x: (A4[0] - helv.widthOfTextAtSize(t, 8)) / 2, y: 28, size: 8, font: helv, color: GRAY });
}
