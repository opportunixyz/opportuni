import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, sesionValida } from "./app/lib/admin/sesion";

// - /admin y /api/admin/*: piden la cookie de sesión firmada (PRD 8.6). Solo
//   el login queda abierto.
// - /v/*: renueva la cookie del dispositivo en cada click (PRD 8.3). La firma
//   la revisa la página; aquí solo se extiende su vida.

const DEVICE_COOKIE = "opp_dev";
const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;
const ABIERTAS = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/v/")) {
    const dev = req.cookies.get(DEVICE_COOKIE)?.value;
    const res = NextResponse.next();
    if (dev && dev.length < 200) {
      res.cookies.set(DEVICE_COOKIE, dev, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: DEVICE_MAX_AGE,
      });
    }
    return res;
  }

  if (ABIERTAS.has(pathname)) return NextResponse.next();

  if (await sesionValida(req.cookies.get(ADMIN_COOKIE)?.value)) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Inicia sesión en /admin." }, { status: 401 });
  }
  const login = req.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*", "/v/:path*"],
};
