// FILTRO DE CUMPLIMIENTO (SPEC §10.3) — INVARIANTE.
// Función central usada por carruseles, textos de micro-página y CUALQUIER texto
// público generado. EXCLUYE contenido que mencione medicamentos por nombre,
// cifras de peso o resultados clínicos, "me curó", "garantizado", condiciones
// médicas específicas o superlativos. Ningún código puede saltarse este filtro.

export type ResultadoFiltro =
  | { aprobado: true }
  | { aprobado: false; motivos: string[] };

const MEDICAMENTOS = [
  "ozempic",
  "wegovy",
  "saxenda",
  "mounjaro",
  "semaglutida",
  "liraglutida",
  "tirzepatida",
  "botox",
  "toxina botulínica",
  "ácido hialurónico",
  "hidroquinona",
  "isotretinoína",
  "metformina",
  "orlistat",
];

const PATRONES_PROHIBIDOS: Array<{ patron: RegExp; motivo: string }> = [
  // OJO: \b no funciona con caracteres acentuados en JS; se usan patrones sin \b ahí.
  { patron: /me cur[óo]/i, motivo: "afirma una curación" },
  { patron: /garantizad[oa]s?/i, motivo: "promesa de resultado garantizado" },
  { patron: /garantiz[oaó]/i, motivo: "promesa de resultado garantizado" },
  { patron: /\bperd[íi]\s+\d+\s*(kg|kilo)/i, motivo: "cifra de pérdida de peso" },
  { patron: /\bbaj[éeo]\s+\d+\s*(kg|kilo)/i, motivo: "cifra de pérdida de peso" },
  { patron: /\b\d+\s*(kg|kilos)\s+menos\b/i, motivo: "cifra de pérdida de peso" },
  { patron: /\bel mejor\b/i, motivo: "superlativo prohibido" },
  { patron: /\bla mejor\b/i, motivo: "superlativo prohibido" },
  { patron: /\blos mejores\b/i, motivo: "superlativo prohibido" },
  { patron: /\bnadie (como|te)\b/i, motivo: "superlativo encubierto" },
  {
    patron: /\b(c[áa]ncer|diabetes|hipertensi[óo]n|depresi[óo]n|ansiedad|tiroides|hernia|infecci[óo]n|caries|endodoncia|implante[s]?\s+dental\w*|brackets?|ortodoncia|pr[óo]tesis)\b/i,
    motivo: "menciona una condición o tratamiento clínico específico",
  },
];

/**
 * Revisa un texto destinado a publicarse (carrusel, micro-página, respuesta).
 * Devuelve aprobado=false con motivos legibles cuando debe excluirse.
 */
export function filtrarCumplimiento(texto: string): ResultadoFiltro {
  const motivos: string[] = [];
  const normalizado = texto.toLowerCase();

  for (const med of MEDICAMENTOS) {
    if (normalizado.includes(med)) {
      motivos.push(`menciona un medicamento o sustancia (${med})`);
    }
  }
  for (const { patron, motivo } of PATRONES_PROHIBIDOS) {
    if (patron.test(texto)) motivos.push(motivo);
  }

  return motivos.length > 0 ? { aprobado: false, motivos } : { aprobado: true };
}

/** Autores solo con inicial del apellido: "María González" → "María G." (SPEC §10.3). */
export function nombreConInicial(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Paciente";
  const nombre = partes[0] ?? "Paciente";
  const apellido = partes.length > 1 ? partes[partes.length - 1] : null;
  return apellido ? `${nombre} ${apellido.charAt(0).toUpperCase()}.` : nombre;
}

/**
 * Reglas del prompt para respuestas a reseñas (SPEC §6.1): jamás confirmar que el
 * autor fue paciente, jamás mencionar tratamientos ni datos clínicos; agradecer,
 * reflejar el punto sin detalles médicos, invitar a canal privado si es negativa.
 */
export function reglasPromptRespuestas(): string {
  return [
    "Reglas estrictas e inviolables:",
    "- Jamás confirmes que la persona fue paciente de la clínica.",
    "- Jamás menciones tratamientos, padecimientos, diagnósticos ni datos clínicos.",
    "- Agradece la opinión y refleja el punto principal sin detalles médicos.",
    "- Si la reseña es negativa (3 estrellas o menos), invita a continuar por un canal privado (WhatsApp de la clínica).",
    "- No uses superlativos ni promesas de resultados.",
    "- Firma solo con el nombre de la clínica.",
  ].join("\n");
}
