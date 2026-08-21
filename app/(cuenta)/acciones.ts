"use server";

// Acciones de cuenta: registro, login, logout.
// Errores como frases humanas dentro de la página, nunca alert() (SPEC §15.8).

import { redirect } from "next/navigation";
import { autenticarUsuario, crearTenant, crearUsuario } from "@/lib/db";
import { cerrarSesion, crearSesion } from "@/lib/auth";
import type { Vertical } from "@/lib/types";

export interface EstadoForma {
  error?: string;
}

function slugDesdeNombre(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "mi-clinica";
}

export async function accionRegistro(
  _prev: EstadoForma,
  formData: FormData,
): Promise<EstadoForma> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const clinica = String(formData.get("clinica") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const vertical = String(formData.get("vertical") ?? "dental") as Vertical;

  if (nombre.length < 2) return { error: "Cuéntanos tu nombre para saludarte como se debe." };
  if (clinica.length < 2) return { error: "Escribe el nombre de tu clínica tal como la conocen tus pacientes." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa tu correo: parece que le falta algo." };
  if (password.length < 8) return { error: "Tu contraseña necesita al menos 8 caracteres." };
  if (!["dental", "especialista", "estetica", "peso"].includes(vertical)) {
    return { error: "Elige el tipo de clínica." };
  }

  try {
    // Slug provisional único; el dueño elige el definitivo en el onboarding.
    const slug = `${slugDesdeNombre(clinica)}-${Math.random().toString(36).slice(2, 6)}`;
    const tenant = await crearTenant({
      nombre: clinica,
      vertical,
      slug,
      cedula_profesional: "",
      direccion: "",
      doctor_nombre: nombre,
    });
    const user = await crearUsuario({
      tenant_id: tenant.id,
      email,
      password,
      nombre,
      rol: "dueno",
    });
    crearSesion(user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo salió mal, inténtalo de nuevo." };
  }
  redirect("/onboarding");
}

export async function accionLogin(_prev: EstadoForma, formData: FormData): Promise<EstadoForma> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await autenticarUsuario(email, password);
  if (!user) return { error: "Ese correo y contraseña no coinciden. Verifica e inténtalo de nuevo." };
  crearSesion(user.id);
  redirect("/app");
}

export async function accionLogout(): Promise<void> {
  cerrarSesion();
  redirect("/");
}
