// Módulo de IA (SPEC §4): Gemini API (Google AI Studio), abstraído en lib/ai/.
// La clave vive solo en el servidor (GEMINI_API_KEY); sin clave, el modo demo usa
// un redactor determinístico para que el producto se pueda probar de punta a punta.
// INVARIANTE §15.7: toda salida de IA con consecuencias públicas es revisable,
// editable y aprobable por el cliente antes de publicarse.

import { filtrarCumplimiento, reglasPromptRespuestas } from "./compliance";
import type { Review, Tenant } from "@/lib/types";

export function iaConfigurada(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function llamarGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!texto) throw new Error("Gemini no devolvió texto");
  return texto;
}

/** Redactor determinístico de respaldo (modo demo, sin GEMINI_API_KEY). */
function redactorDeRespaldo(review: Review, tenant: Tenant): string {
  const tono = tenant.tono_respuestas;
  const saludo = tono === "formal" ? "Buen día" : "Hola";
  if (review.rating >= 4) {
    return `${saludo}: muchas gracias por tomarse el tiempo de compartir su experiencia. Para todo el equipo de ${tenant.nombre} es un gusto saber que su visita fue agradable. Aquí estaremos cuando nos necesite. — ${tenant.nombre}`;
  }
  return `${saludo}: gracias por compartir su opinión; la tomamos muy en serio. En ${tenant.nombre} nos importa que cada visita sea una buena experiencia, por eso nos gustaría platicar con usted directamente. ¿Nos escribe por WhatsApp para atender su caso personalmente? — ${tenant.nombre}`;
}

/**
 * Genera una respuesta a una reseña respetando las reglas del prompt (SPEC §6.1).
 * La respuesta generada pasa por el filtro de cumplimiento antes de devolverse;
 * si no pasa, se usa el redactor de respaldo (que nunca incluye datos clínicos).
 */
export async function generarRespuestaResena(review: Review, tenant: Tenant): Promise<string> {
  let propuesta: string;
  if (iaConfigurada()) {
    try {
      propuesta = await llamarGemini(
        `Eres el community manager de "${tenant.nombre}", una clínica en México. ` +
          `Redacta una respuesta pública y breve (máx. 80 palabras) a esta reseña de Google de ${review.rating} estrellas: "${review.texto}".\n` +
          `Tono ${tenant.tono_respuestas}.\n${reglasPromptRespuestas()}`,
      );
    } catch {
      propuesta = redactorDeRespaldo(review, tenant);
    }
  } else {
    propuesta = redactorDeRespaldo(review, tenant);
  }

  const filtro = filtrarCumplimiento(propuesta);
  if (!filtro.aprobado) return redactorDeRespaldo(review, tenant);
  return propuesta;
}

/**
 * Textos de micro-página a partir de las respuestas del onboarding (SPEC §6.4).
 * REGLAS: sin superlativos, sin promesas de resultados, sin nombres de medicamentos.
 */
export async function generarTextosMicropagina(datos: {
  tenant: Tenant;
  aQuienAtiende: string;
  queLeEncanta: string;
  anosExperiencia: string;
  servicios: string;
}): Promise<{ titular: string; descripcion: string }> {
  const servicios = datos.servicios
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  let titular = `${datos.tenant.doctor_nombre || datos.tenant.nombre} — atención ${etiquetaVertical(datos.tenant.vertical)} en ${ciudadDe(datos.tenant.direccion)}`;
  let descripcion =
    `${datos.queLeEncanta} Con ${datos.anosExperiencia} de experiencia atendiendo a ${datos.aQuienAtiende}. ` +
    `Agenda tu cita por WhatsApp, sin llamadas ni esperas.`;

  if (iaConfigurada()) {
    try {
      const texto = await llamarGemini(
        `Redacta un titular (máx. 10 palabras) y una descripción (máx. 40 palabras) para la página web de "${datos.tenant.nombre}".\n` +
          `Datos: atiende a ${datos.aQuienAtiende}; experiencia: ${datos.anosExperiencia}; servicios: ${servicios.join(", ")}; lo que le encanta de su trabajo: ${datos.queLeEncanta}.\n` +
          `Reglas estrictas: sin superlativos ("el mejor"), sin promesas de resultados, sin nombres de medicamentos ni tratamientos. Español mexicano, cálido y directo.\n` +
          `Formato de salida: TITULAR: ...\nDESCRIPCION: ...`,
      );
      const mTit = /TITULAR:\s*(.+)/i.exec(texto);
      const mDesc = /DESCRIPCION:\s*([\s\S]+)/i.exec(texto);
      if (mTit?.[1] && mDesc?.[1]) {
        titular = mTit[1].trim();
        descripcion = mDesc[1].trim();
      }
    } catch {
      // Se quedan los textos de respaldo.
    }
  }

  // El filtro de cumplimiento manda: si no pasa, se cae al texto seguro.
  if (!filtrarCumplimiento(`${titular} ${descripcion}`).aprobado) {
    titular = `${datos.tenant.doctor_nombre || datos.tenant.nombre} — atención ${etiquetaVertical(datos.tenant.vertical)}`;
    descripcion = `Agenda tu cita por WhatsApp, sin llamadas ni esperas. Te atendemos con gusto.`;
  }
  return { titular, descripcion };
}

export function etiquetaVertical(vertical: Tenant["vertical"]): string {
  switch (vertical) {
    case "dental":
      return "dental";
    case "estetica":
      return "estética";
    case "peso":
      return "de control de peso";
    case "especialista":
      return "de especialidad";
  }
}

function ciudadDe(direccion: string): string {
  const partes = direccion.split(",").map((p) => p.trim()).filter(Boolean);
  return partes[partes.length - 1] ?? "tu ciudad";
}
