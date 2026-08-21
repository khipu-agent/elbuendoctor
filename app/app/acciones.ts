"use server";

// Acciones del panel de reseñas (SPEC §6.1). El humano conserva la última palabra
// sobre lo que decide la IA (§15.7): toda respuesta se aprueba antes de publicarse,
// salvo auto-publicación de 4-5⭐ activada expresamente con registro de consentimiento.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  actualizarResena,
  actualizarTenant,
  crearContacto,
  insertarResena,
  obtenerGoogleAccount,
  obtenerResenaPorId,
  obtenerResenas,
  obtenerWaAccount,
  registrarEvento,
} from "@/lib/db";
import { procesarResenaNueva } from "@/lib/resenas";
import { enviarMensaje } from "@/lib/whatsapp";

async function sesionSegura() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/** Sincroniza reseñas desde Google. Modo degradado (§6.1): lectura de las reseñas
 *  públicas más recientes; con GBP API aprobada sería la API oficial. */
export async function sincronizarResenas(): Promise<{ nuevas: number }> {
  const { tenant, user } = await sesionSegura();
  const google = await obtenerGoogleAccount(tenant.id);
  const numeroDueno = user.whatsapp_personal || "+520000000000";

  // Las reseñas con estado 'nueva' ya están en la base (llegaron por el cron o,
  // en esta demo, por el botón "Simular reseña"). Aquí se procesan.
  const nuevas = await obtenerResenas(tenant.id, "nueva");
  for (const review of nuevas) {
    await procesarResenaNueva(review, tenant, numeroDueno);
  }
  await registrarEvento(tenant.id, "sincronizacion_resenas", {
    modo: google?.modo ?? "degradado",
    nuevas: nuevas.length,
  });
  revalidatePath("/app");
  return { nuevas: nuevas.length };
}

/** Genera una reseña de prueba (solo demo/seed) para probar alerta + respuesta IA. */
export async function simularResenaDePrueba(): Promise<{ ok: boolean }> {
  const { tenant, user } = await sesionSegura();
  const n = Math.floor(Math.random() * 10000);
  const positiva = Math.random() > 0.4;
  const review = await insertarResena({
    tenant_id: tenant.id,
    review_id_google: `prueba-${Date.now()}-${n}`,
    rating: positiva ? 5 : 2,
    texto: positiva
      ? "Excelente atención de principio a fin, muy profesionales y puntuales."
      : "La atención del doctor bien, pero esperé mucho y nadie avisó del retraso.",
    autor_nombre: positiva ? "María González" : "José Hernández",
    fecha_review: new Date().toISOString(),
  });
  await procesarResenaNueva(review, tenant, user.whatsapp_personal || "+520000000000");
  revalidatePath("/app");
  return { ok: true };
}

export async function aprobarYPublicar(reseñaId: string, texto: string): Promise<void> {
  const { tenant } = await sesionSegura();
  const review = await obtenerResenaPorId(reseñaId);
  if (!review || review.tenant_id !== tenant.id) return;
  const google = await obtenerGoogleAccount(tenant.id);
  const esDegradado = google?.modo !== "api";

  // En modo API la respuesta se publicaría vía GBP; en degradado el humano la pega
  // en la consola de Google (el botón de copiar + deep-link está en la UI).
  await actualizarResena(reseñaId, {
    respuesta_publicada: texto,
    respondida: true,
    estado: "publicada",
  });
  await registrarEvento(tenant.id, "respuesta_publicada", {
    modo: esDegradado ? "degradado_copiada" : "api",
    rating: review.rating,
  });
  revalidatePath("/app");
}

export async function ignorarResena(reseñaId: string): Promise<void> {
  const { tenant } = await sesionSegura();
  const review = await obtenerResenaPorId(reseñaId);
  if (!review || review.tenant_id !== tenant.id) return;
  await actualizarResena(reseñaId, { estado: "ignorada" });
  revalidatePath("/app");
}

export async function toggleAutopublicar(activar: boolean): Promise<void> {
  const { tenant } = await sesionSegura();
  // §10.2: consentimiento expreso registrado con fecha/hora.
  await actualizarTenant(tenant.id, {
    autopublicar_resenas: activar,
    autopublicar_consent_at: activar ? new Date().toISOString() : null,
  });
  await registrarEvento(tenant.id, "toggle_autopublicar", { activar });
  revalidatePath("/app/configuracion");
}

export async function cambiarTono(tono: "formal" | "cercano"): Promise<void> {
  const { tenant } = await sesionSegura();
  await actualizarTenant(tenant.id, { tono_respuestas: tono });
  revalidatePath("/app/configuracion");
}

/** Envío manual de solicitud de reseña a un contacto (§6.1 disparador c). */
export async function enviarSolicitudManual(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { tenant } = await sesionSegura();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telRaw = String(formData.get("telefono") ?? "");
  const digitos = telRaw.replace(/\D/g, "");
  const telefono = digitos.length === 10 ? `+52${digitos}` : digitos.length >= 12 ? `+${digitos.replace(/^521/, "52")}` : null;

  if (nombre.length < 2) return { error: "Escribe el nombre de tu paciente." };
  if (!telefono) return { error: "Revisa el número: 10 dígitos, con lada." };

  const contacto = await crearContacto({
    tenant_id: tenant.id,
    telefono,
    nombre,
    origen: "manual",
    opt_in_status: "pendiente",
    opt_in_evidencia: null,
    ultima_visita: null,
  });

  const resultado = await enviarMensaje({
    tenantId: tenant.id,
    contactId: contacto.id,
    numeroDestino: telefono,
    categoria: "utility",
    plantilla:
      "Hola {{1}}, gracias por tu visita a {{2}} 🙏 ¿Cómo fue tu experiencia? (Botones: 😊 Excelente / 😐 Regular / 😞 Mala)",
    variables: [nombre, tenant.nombre],
  });
  if (!resultado.enviado) return { error: resultado.motivo };
  revalidatePath("/app/mensajes");
  return { ok: true };
}

export async function estadoWa(tenantId: string) {
  return obtenerWaAccount(tenantId);
}
