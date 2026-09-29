import type { MetadataRoute } from "next";

// Páginas públicas. Las vacantes (/v/*) y los pasaportes (/p/*) llevan
// noindex y no van aquí.
const PAGINAS = ["", "/vacantes", "/convocatorias", "/cv", "/cv/revision", "/cv/asesoria", "/chat", "/traccion", "/privacidad"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGINAS.map((ruta) => ({ url: `https://opportuni.xyz${ruta}` }));
}
