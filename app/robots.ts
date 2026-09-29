import type { MetadataRoute } from "next";

// Solo producción se indexa. Preview (beta.opportuni.xyz y *.vercel.app) no.
// /v/* y /p/* se dejan rastrear: su propio noindex las saca del índice.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: "https://opportuni.xyz/sitemap.xml",
  };
}
