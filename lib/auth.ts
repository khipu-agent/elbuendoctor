// Autenticación y sesiones.
//
// Con Supabase configurado, la auth real es Supabase Auth (email + contraseña con
// verificación por correo). Sin llaves (demostración local/preview), se usa una
// sesión firmada con HMAC en cookie httpOnly contra la tabla `users` del seed.
// La firma HMAC impide falsificar sesiones; la cookie es httpOnly y SameSite=Lax.

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { obtenerUsuarioPorId, obtenerTenantPorId } from "@/lib/db";
import type { Tenant, User } from "@/lib/types";

const COOKIE = "ebd_session";
const DURACION_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

function secreto(): string {
  return process.env.SESSION_SECRET ?? "ebd-dev-secret-cambiar-en-produccion";
}

interface SesionPayload {
  userId: string;
  exp: number;
}

function firmar(payload: SesionPayload): string {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

function verificar(token: string): SesionPayload | null {
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
  if (firma !== esperada) return null;
  try {
    const payload = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as SesionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function crearSesion(userId: string): void {
  const token = firmar({ userId, exp: Date.now() + DURACION_MS });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_MS / 1000,
    path: "/",
  });
}

export function cerrarSesion(): void {
  cookies().delete(COOKIE);
}

export interface SesionActual {
  user: User;
  tenant: Tenant;
}

export async function obtenerSesion(): Promise<SesionActual | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const payload = verificar(token);
  if (!payload) return null;
  const user = await obtenerUsuarioPorId(payload.userId);
  if (!user) return null;
  const tenant = await obtenerTenantPorId(user.tenant_id);
  if (!tenant) return null;
  return { user, tenant };
}
