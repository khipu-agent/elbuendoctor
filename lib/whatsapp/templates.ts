// Plantillas de WhatsApp (SPEC §8): crear y someter a aprobación del BSP en Fase 1.
// Categorías honestas: recordatorios = Utility, reactivación = Marketing.
// Toda plantilla Marketing incluye vía de baja visible.

export type CategoriaPlantilla = "UTILITY" | "MARKETING";

export interface PlantillaWa {
  nombre: string;
  categoria: CategoriaPlantilla;
  cuerpo: string; // variables {{n}}
  botones: string[];
}

export const PLANTILLAS: PlantillaWa[] = [
  {
    nombre: "recordatorio_cita",
    categoria: "UTILITY",
    cuerpo: "Hola {{1}}, te recordamos tu cita en {{2}} mañana a las {{3}}. ¿Nos confirmas?",
    botones: ["Confirmo ✔", "Necesito reagendar"],
  },
  {
    nombre: "solicitud_resena",
    categoria: "UTILITY",
    cuerpo: "Hola {{1}}, gracias por tu visita a {{2}} 🙏 ¿Cómo fue tu experiencia?",
    botones: ["😊 Excelente", "😐 Regular", "😞 Mala"],
  },
  {
    nombre: "reactivacion_optin",
    categoria: "MARKETING",
    cuerpo:
      "Hola {{1}} 👋 Soy el asistente de {{2}}, donde te atendiste anteriormente. Estamos actualizando nuestra agenda de pacientes. ¿Te gustaría recibir un beneficio especial para tu próxima visita? Si ya no deseas mensajes, responde BAJA.",
    botones: ["Sí, me interesa", "No, gracias"],
  },
  {
    nombre: "reactivacion_beneficio",
    categoria: "MARKETING",
    cuerpo:
      "¡Qué gusto, {{1}}! 🎉 {{2}} te ofrece: {{3}}. Agenda aquí: {{4}}. Si ya no deseas mensajes, responde BAJA.",
    botones: [],
  },
  {
    nombre: "alerta_dueno_resena",
    categoria: "UTILITY",
    cuerpo:
      "⭐ Nueva reseña en Google ({{1}}⭐) de {{2}}: '{{3}}'. Respuesta sugerida lista. Responde OK para publicarla o entra al panel.",
    botones: ["Aprobar y publicar", "Editar en el panel"],
  },
  {
    nombre: "reporte_mensual",
    categoria: "UTILITY",
    cuerpo:
      "📊 Tu mes en Google: +{{1}} reseñas (total {{2}}), calificación {{3}} {{4}}, respondiste {{5}}%. {{6}} ¡{{7}}!",
    botones: [],
  },
];

/** Palabras que en CUALQUIER mensaje entrante significan opt-out inmediato (SPEC §8). */
const PALABRAS_BAJA = ["baja", "stop", "ya no", "no gracias", "no, gracias", "cancelar", "unsubscribe"];

export function esSolicitudDeBaja(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  return PALABRAS_BAJA.some((p) => t === p || t.startsWith(p + " ") || t.endsWith(" " + p));
}
