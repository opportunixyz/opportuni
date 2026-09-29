// Límite de intentos en memoria, por instancia. No es un límite global (cada
// función de Vercel tiene el suyo), pero frena a quien prueba números o
// contraseñas en ráfaga desde una misma conexión.

const ventanas = new Map<string, { n: number; hasta: number }>();

export function dentroDelLimite(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  if (ventanas.size > 5000) {
    for (const [k, v] of Array.from(ventanas)) if (v.hasta < ahora) ventanas.delete(k);
  }
  const v = ventanas.get(clave);
  if (!v || v.hasta < ahora) {
    ventanas.set(clave, { n: 1, hasta: ahora + ventanaMs });
    return true;
  }
  v.n += 1;
  return v.n <= max;
}

export function ipDe(h: Headers): string {
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || "sin-ip";
}
