"use server";

import { obtenerTenantPorSlug, registrarOpinion, registrarEvento } from "@/lib/db";

/** Registra cada respuesta del flujo /opina (SPEC §6.1: registrar cada respuesta). */
export async function registrarOpinionAction(
  slug: string,
  satisfaccion: "excelente" | "regular" | "mala",
  comentario: string | null,
): Promise<{ ok: boolean }> {
  const tenant = await obtenerTenantPorSlug(slug);
  if (!tenant) return { ok: false };
  if (!["excelente", "regular", "mala"].includes(satisfaccion)) return { ok: false };
  await registrarOpinion({
    tenant_id: tenant.id,
    contact_id: null,
    satisfaccion,
    comentario_privado: comentario?.trim() ? comentario.trim().slice(0, 500) : null,
    fue_a_google: false, // el clic a Google no es rastreable sin sesión; se deja en falso
  });
  await registrarEvento(tenant.id, "opinion_recibida", { satisfaccion });
  return { ok: true };
}
