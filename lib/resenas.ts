// Lógica central del motor de reseñas (SPEC §6.1), compartida por el panel,
// el cron y el webhook. No importa nada de next/headers: es usable en cualquier
// contexto de servidor.

import { actualizarResena, registrarEvento } from "@/lib/db";
import { generarRespuestaResena } from "@/lib/ai";
import { enviarMensaje } from "@/lib/whatsapp";
import type { Review, Tenant } from "@/lib/types";

/** Alerta al dueño por WhatsApp (§6.1). Rating ≤3 → URGENTE con respuesta sugerida. */
export async function alertarDueno(
  review: Review,
  tenant: Tenant,
  numeroDueno: string,
): Promise<void> {
  const urgente = review.rating <= 3;
  await enviarMensaje({
    tenantId: tenant.id,
    contactId: null,
    numeroDestino: numeroDueno,
    categoria: "utility",
    plantilla:
      (urgente ? "🔴 URGENTE — " : "") +
      "⭐ Nueva reseña en Google ({{1}}⭐) de {{2}}: '{{3}}'. Respuesta sugerida lista. Responde OK para publicarla o entra al panel. (Botones: Aprobar y publicar / Editar en el panel)",
    variables: [String(review.rating), review.autor_nombre, review.texto.slice(0, 120)],
  });
}

/**
 * Trata una reseña nueva: genera la respuesta IA y decide el siguiente estado.
 * INVARIANTE §15.7 + §6.1: auto-publicación SOLO si el tenant activó el toggle
 * expresamente (con registro de consentimiento) Y el rating es 4-5.
 */
export async function procesarResenaNueva(
  review: Review,
  tenant: Tenant,
  numeroDueno: string,
): Promise<void> {
  const respuesta = await generarRespuestaResena(review, tenant);
  const autopublicable =
    tenant.autopublicar_resenas && tenant.autopublicar_consent_at && review.rating >= 4;

  if (autopublicable) {
    await actualizarResena(review.id, {
      respuesta_ia: respuesta,
      respuesta_publicada: respuesta,
      respondida: true,
      estado: "publicada",
    });
  } else {
    await actualizarResena(review.id, { respuesta_ia: respuesta, estado: "pendiente_aprobacion" });
  }
  await alertarDueno(review, tenant, numeroDueno);
  await registrarEvento(tenant.id, "resena_procesada", {
    rating: review.rating,
    estado: autopublicable ? "publicada" : "pendiente_aprobacion",
  });
}
