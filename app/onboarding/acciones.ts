"use server";

// Acciones del onboarding wizard (SPEC §6.7): 15 minutos máximo, operable por una
// recepcionista. Cada paso valida y persiste; errores en lenguaje humano.

import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  actualizarTenant,
  actualizarUsuario,
  guardarCompetidores,
  guardarGoogleAccount,
  guardarWaAccount,
  obtenerTenantPorId,
  registrarEvento,
} from "@/lib/db";
import { generarTextosMicropagina } from "@/lib/ai";
import { enviarMensaje } from "@/lib/whatsapp";
import type { Vertical } from "@/lib/types";

export interface ResultadoPaso {
  ok: boolean;
  error?: string;
}

async function sesionSegura() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

// ---------- Paso 1: datos de la clínica + 4 preguntas para textos ----------

export async function paso1DatosClinica(
  _prev: ResultadoPaso,
  formData: FormData,
): Promise<ResultadoPaso> {
  const { tenant } = await sesionSegura();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const cedula = String(formData.get("cedula") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const color = String(formData.get("color") ?? "#0D6E5F").trim();
  const aQuienAtiende = String(formData.get("a_quien") ?? "").trim();
  const queLeEncanta = String(formData.get("que_encanta") ?? "").trim();
  const anos = String(formData.get("anos") ?? "").trim();
  const servicios = String(formData.get("servicios") ?? "").trim();

  if (nombre.length < 2) return { ok: false, error: "Escribe el nombre de tu clínica." };
  if (!/^[a-z0-9-]{3,32}$/.test(slug)) {
    return { ok: false, error: "La dirección de tu página solo puede tener letras, números y guiones (3 a 32)." };
  }
  if (cedula.length < 6) {
    return { ok: false, error: "La cédula profesional es obligatoria: aparece en tu página pública y da confianza." };
  }
  if (direccion.length < 8) return { ok: false, error: "Escribe la dirección completa, tal como la buscarías en Google." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "Elige un color válido." };

  try {
    const actual = await obtenerTenantPorId(tenant.id);
    const textos = await generarTextosMicropagina({
      tenant: { ...actual!, nombre, direccion },
      aQuienAtiende: aQuienAtiende || "pacientes de tu ciudad",
      queLeEncanta: queLeEncanta || "Nos encanta atender a nuestros pacientes.",
      anosExperiencia: anos || "varios años",
      servicios: servicios || "Consulta general",
    });
    await actualizarTenant(tenant.id, {
      nombre,
      slug,
      cedula_profesional: cedula,
      direccion,
      colores: { primario: color, acento: "#F2B01E", fondo: "#FAF7F0" },
      servicios: servicios
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      pagina_titular: textos.titular,
      pagina_descripcion: textos.descripcion,
    });
    await registrarEvento(tenant.id, "onboarding_paso1", { slug });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No pudimos guardar, inténtalo de nuevo." };
  }
  return { ok: true };
}

// ---------- Paso 2: conectar Google (modo degradado + estructura GBP) ----------

export interface NegocioEncontrado {
  place_id: string;
  nombre: string;
  direccion: string;
  rating: number;
  total_reviews: number;
}

/** Busca negocios por nombre. Con GOOGLE_PLACES_API_KEY usa Places; sin ella,
 *  devuelve sugerencias de demostración claramente derivadas del nombre buscado. */
export async function buscarNegociosGoogle(busqueda: string): Promise<NegocioEncontrado[]> {
  await sesionSegura();
  const q = busqueda.trim();
  if (q.length < 3) return [];

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({ textQuery: q, languageCode: "es", regionCode: "MX", maxResultCount: 5 }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          places?: Array<{
            id: string;
            displayName?: { text: string };
            formattedAddress?: string;
            rating?: number;
            userRatingCount?: number;
          }>;
        };
        return (data.places ?? []).map((p) => ({
          place_id: p.id,
          nombre: p.displayName?.text ?? q,
          direccion: p.formattedAddress ?? "",
          rating: p.rating ?? 0,
          total_reviews: p.userRatingCount ?? 0,
        }));
      }
    } catch {
      // Cae al modo demostración.
    }
  }

  // Modo demostración: sugerencias determinísticas derivadas de la búsqueda.
  return [0, 1, 2].map((i) => ({
    place_id: `demo-${q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}-${i}`,
    nombre: i === 0 ? q : `${q} (${["Sucursal Norte", "Centro", "Providencia"][i]})`,
    direccion: ["Av. de los Insurgentes 1200, CDMX", "Av. Chapultepec 450, Guadalajara", "Calz. del Valle 210, Monterrey"][i]!,
    rating: [4.8, 4.5, 4.2][i]!,
    total_reviews: [87, 152, 43][i]!,
  }));
}

export async function paso2ConfirmarGoogle(placeId: string, nombre: string): Promise<ResultadoPaso> {
  const { tenant } = await sesionSegura();
  if (!placeId) return { ok: false, error: "Elige tu negocio de la lista." };
  // Modo degradado obligatorio mientras no haya aprobación de GBP API (§6.1):
  // el producto es 100% vendible así; la estructura OAuth queda lista.
  await guardarGoogleAccount({
    tenant_id: tenant.id,
    gbp_location_id: null,
    place_id: placeId,
    oauth_tokens_cifrados: null,
    modo: "degradado",
    negocio_nombre: nombre,
    ultima_sync: null,
  });
  await registrarEvento(tenant.id, "google_conectado", { modo: "degradado", negocio: nombre });
  return { ok: true };
}

// ---------- Paso 3: 3 competidores ----------

export async function paso3Competidores(
  seleccion: Array<{ place_id: string; nombre: string; rating: number; total_reviews: number }>,
): Promise<ResultadoPaso> {
  const { tenant } = await sesionSegura();
  if (seleccion.length === 0) return { ok: false, error: "Elige al menos un competidor para comparar tu avance." };
  if (seleccion.length > 3) return { ok: false, error: "Son máximo 3 competidores." };
  await guardarCompetidores(tenant.id, seleccion);
  return { ok: true };
}

// ---------- Paso 4: conectar WhatsApp ----------

function normalizarE164(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) return `+52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith("52")) return `+${digitos}`;
  if (digitos.length === 13 && digitos.startsWith("521")) return `+52${digitos.slice(3)}`;
  return null;
}

export async function paso4WhatsApp(
  _prev: ResultadoPaso,
  formData: FormData,
): Promise<ResultadoPaso> {
  const { tenant } = await sesionSegura();
  const numeroNegocio = normalizarE164(String(formData.get("numero_negocio") ?? ""));
  const numeroDueno = normalizarE164(String(formData.get("numero_dueno") ?? ""));
  if (!numeroNegocio) return { ok: false, error: "Revisa el número de WhatsApp de tu clínica (10 dígitos)." };
  if (!numeroDueno) return { ok: false, error: "Revisa tu número personal de WhatsApp (10 dígitos): ahí te llegan las alertas." };

  // Embedded signup real: con llaves de Gupshup queda 'pendiente' hasta aprobación
  // de Meta; en modo demo queda activo para probar de punta a punta (§6.7 paso 4).
  const conBSP = Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_ID);
  await guardarWaAccount({
    tenant_id: tenant.id,
    proveedor: "gupshup",
    waba_id: null,
    phone_number_id: null,
    numero_display: numeroNegocio,
    quality_rating: "green",
    messaging_tier: 1,
    estado: conBSP ? "pendiente" : "activo",
  });

  // El número del dueño vive en users.whatsapp_personal (alertas).
  const { user } = await sesionSegura();
  await actualizarUsuario(user.id, { whatsapp_personal: numeroDueno });
  await registrarEvento(tenant.id, "whatsapp_conectado", { modo: conBSP ? "bsp" : "demo" });
  return { ok: true };
}

// ---------- Paso 5: primera solicitud de prueba al número del dueño ----------

export async function paso5EnviarPrueba(): Promise<ResultadoPaso> {
  const { tenant, user } = await sesionSegura();
  if (!user.whatsapp_personal) {
    return { ok: false, error: "Primero registra tu número de WhatsApp en el paso anterior." };
  }
  const resultado = await enviarMensaje({
    tenantId: tenant.id,
    contactId: null,
    numeroDestino: user.whatsapp_personal,
    categoria: "utility",
    plantilla:
      "Hola {{1}}, gracias por tu visita a {{2}} 🙏 ¿Cómo fue tu experiencia? (Botones: 😊 Excelente / 😐 Regular / 😞 Mala)",
    variables: [user.nombre.split(" ")[0] ?? user.nombre, tenant.nombre],
  });
  if (!resultado.enviado) return { ok: false, error: resultado.motivo };

  await actualizarTenant(tenant.id, { onboarding_completado: true });
  // Métrica de activación (§6.7): primera solicitud real en las primeras 24h.
  await registrarEvento(tenant.id, "primera_solicitud_enviada", { via: "onboarding" });
  return { ok: true };
}

export async function terminarOnboarding(): Promise<void> {
  const { tenant } = await sesionSegura();
  await actualizarTenant(tenant.id, { onboarding_completado: true });
  redirect("/app");
}
