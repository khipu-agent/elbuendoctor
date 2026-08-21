// Detección de tenant por hostname (SPEC §5):
// - {slug}.elbuendoctor.com.mx → reescribe a /p/{slug} (micro-página pública)
// - dominio raíz → landing y app (/app/* autenticado)
// En preview/desarrollo (sin wildcard), la ruta /p/{slug} sirve lo mismo.

import { NextRequest, NextResponse } from "next/server";

const DOMINIOS_RAIZ = ["elbuendoctor.com.mx", "www.elbuendoctor.com.mx", "localhost"];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";

  // ¿Subdominio del dominio del producto?
  const esSubdominio =
    host.endsWith(".elbuendoctor.com.mx") && !DOMINIOS_RAIZ.includes(host);
  if (!esSubdominio) return NextResponse.next();

  const slug = host.replace(".elbuendoctor.com.mx", "");
  if (["app", "api", "www"].includes(slug)) return NextResponse.next();

  const url = req.nextUrl.clone();
  const ruta = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/p/${slug}${ruta}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
