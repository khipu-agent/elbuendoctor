// Seed de desarrollo (SPEC §4): 3 clínicas ficticias (dental, estética, peso),
// 200 contactos falsos, 40 reseñas falsas y 30 citas. Determinístico: mismos
// datos en cada corrida. Todo el desarrollo se hace contra este seed.
//
// Uso: npm run seed

import { scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { emptyDb, type Database } from "../lib/db/json-store";

// ---------- PRNG determinístico (mulberry32) ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260821);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T;
const entre = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

const NOMBRES = [
  "María González", "José Hernández", "Ana Martínez", "Luis García", "Carmen López",
  "Jorge Ramírez", "Rosa Flores", "Miguel Torres", "Laura Vázquez", "Carlos Morales",
  "Patricia Reyes", "Fernando Castro", "Sofía Mendoza", "Ricardo Ortiz", "Elena Ríos",
  "Gabriel Navarro", "Lucía Salazar", "Andrés Delgado", "Valeria Campos", "Héctor Aguilar",
];
const APELLIDOS = ["Pérez", "Sánchez", "Jiménez", "Cruz", "Romero", "Vega", "Luna", "Silva", "Paredes", "Quiroz"];

const RESEÑAS_POSITIVAS = [
  "Excelente atención, desde recepción hasta la consulta. Muy puntuales.",
  "Me atendieron con mucho profesionalismo y el lugar está impecable.",
  "El doctor explicó todo con calma y respondió mis dudas. Lo recomiendo.",
  "Muy buena experiencia, el trato fue cálido y respetuoso en todo momento.",
  "Agendé por WhatsApp y fue rapidísimo. La atención, de primera.",
  "Instalaciones modernas y limpias. El personal es muy amable.",
  "Puntuales y profesionales. Salí muy contenta de mi consulta.",
  "El seguimiento después de la consulta fue un detalle que se agradece.",
];
const RESEÑAS_NEUTRAS = [
  "La atención bien, aunque esperé más de lo que me dijeron.",
  "Buen servicio, pero el estacionamiento es complicado.",
  "Me atendieron bien, aunque tuve que confirmar mi cita dos veces.",
];
const RESEÑAS_NEGATIVAS = [
  "Esperé casi una hora y nadie me avisó del retraso. Mala organización.",
  "El trato en recepción fue seco y poco amable. El doctor, eso sí, muy bien.",
  "Caro para lo que ofrecen y no me respetaron la promoción anunciada.",
];

const SERVICIOS: Record<string, string[]> = {
  dental: ["Limpieza dental", "Diseño de sonrisa", "Blanqueamiento", "Resinas", "Revisión general"],
  estetica: ["Facial hidratante", "Depilación láser", "Limpieza profunda", "Masaje relajante", "Peeling suave"],
  peso: ["Consulta de valoración", "Plan de alimentación", "Seguimiento mensual", "Reeducación alimentaria"],
};

function telefonoMx(): string {
  return `+5255${String(entre(10000000, 99999999))}`;
}

function fechaISO(diasAtras: number, hora = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, entre(0, 59), 0, 0);
  return d.toISOString();
}

function hashPasswordDemo(password: string): string {
  const salt = "ebd-seed-salt";
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

async function main(): Promise<void> {
  const db: Database = emptyDb();
  const ahora = new Date().toISOString();

  const clinicas = [
    {
      id: "t-sonrisa",
      nombre: "Consultorio Dental Sonrisa MX",
      slug: "sonrisa-mx",
      vertical: "dental" as const,
      doctor: "Dra. Mariana Solís",
      cedula: "12345678",
      direccion: "Av. Insurgentes Sur 1234, Col. Del Valle, Ciudad de México",
      email: "mariana@sonrisamx.mx",
      plan: "trial" as const,
    },
    {
      id: "t-aura",
      nombre: "Estética Aura",
      slug: "estetica-aura",
      vertical: "estetica" as const,
      doctor: "Dra. Fernanda Ríos",
      cedula: "87654321",
      direccion: "Blvd. Ávila Camacho 88, Guadalajara, Jalisco",
      email: "fernanda@esteticaaura.mx",
      plan: "trial" as const,
    },
    {
      id: "t-vital",
      nombre: "Centro Vital Control de Peso",
      slug: "centro-vital",
      vertical: "peso" as const,
      doctor: "Dr. Rodrigo Peña",
      cedula: "11223344",
      direccion: "Calzada del Valle 450, San Pedro Garza García, Nuevo León",
      email: "rodrigo@centrovital.mx",
      plan: "trial" as const,
    },
  ];

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  for (const c of clinicas) {
    db.tenants.push({
      id: c.id,
      nombre: c.nombre,
      vertical: c.vertical,
      plan: c.plan,
      slug: c.slug,
      colores: { primario: "#0D6E5F", acento: "#F2B01E", fondo: "#FAF7F0" },
      logo_url: null,
      cedula_profesional: c.cedula,
      direccion: c.direccion,
      doctor_nombre: c.doctor,
      servicios: SERVICIOS[c.vertical] ?? [],
      fotos: [],
      pagina_titular: null,
      pagina_descripcion: null,
      onboarding_completado: true,
      tono_respuestas: "cercano",
      autopublicar_resenas: false,
      autopublicar_consent_at: null,
      founder_price: false,
      estado_suscripcion: "trial",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      trial_ends_at: trialEnds.toISOString(),
      created_at: ahora,
    });

    db.users.push({
      id: `u-${c.id}`,
      tenant_id: c.id,
      rol: "dueno",
      nombre: c.doctor,
      email: c.email,
      password_hash: hashPasswordDemo("ElBuenDoctor!1"),
      whatsapp_personal: "+5215511223344",
      created_at: ahora,
    });

    db.wa_accounts.push({
      id: `wa-${c.id}`,
      tenant_id: c.id,
      proveedor: "gupshup",
      waba_id: null,
      phone_number_id: null,
      numero_display: "+52 55 1234 5678",
      quality_rating: "green",
      messaging_tier: 1,
      estado: "activo",
      created_at: ahora,
    });

    db.google_accounts.push({
      id: `g-${c.id}`,
      tenant_id: c.id,
      gbp_location_id: null,
      place_id: `place-seed-${c.slug}`,
      oauth_tokens_cifrados: null,
      modo: "degradado",
      negocio_nombre: c.nombre,
      ultima_sync: ahora,
      created_at: ahora,
    });

    // 3 competidores por clínica
    for (let i = 1; i <= 3; i++) {
      db.competitors.push({
        id: `c-${c.id}-${i}`,
        tenant_id: c.id,
        place_id: `place-comp-${c.slug}-${i}`,
        nombre: `Clínica Cercana ${i}`,
        rating: Math.round((3.8 + rnd() * 1.1) * 10) / 10,
        total_reviews: entre(60, 320),
        snapshot_fecha: ahora,
      });
    }
  }

  // ---------- 200 contactos falsos ----------
  const contactosIds: Record<string, string[]> = { "t-sonrisa": [], "t-aura": [], "t-vital": [] };
  for (let i = 0; i < 200; i++) {
    const tenantId = clinicas[i % 3]!.id;
    const id = `ct-${i}`;
    contactosIds[tenantId]!.push(id);
    const nombre = `${pick(NOMBRES).split(" ")[0]} ${pick(APELLIDOS)}`;
    const optIn = rnd() < 0.7 ? "activo" : rnd() < 0.85 ? "pendiente" : "baja";
    db.contacts.push({
      id,
      tenant_id: tenantId,
      telefono: telefonoMx(),
      nombre,
      origen: pick(["excel", "cita", "micropagina", "manual"] as const),
      opt_in_status: optIn,
      opt_in_evidencia:
        optIn === "activo"
          ? { fecha: fechaISO(entre(10, 90)), canal: "whatsapp", mensaje: "reactivacion_optin", respuesta: "Sí, me interesa" }
          : null,
      ultima_visita: fechaISO(entre(5, 400)).slice(0, 10),
      created_at: fechaISO(entre(30, 400)),
    });
    if (optIn === "baja") {
      db.exclusion_list.push({
        id: `ex-${i}`,
        tenant_id: tenantId,
        telefono: db.contacts[db.contacts.length - 1]!.telefono,
        motivo: "opt_out",
        fecha: fechaISO(entre(1, 60)),
      });
    }
  }

  // ---------- 40 reseñas falsas ----------
  const ratings = [5, 5, 5, 5, 5, 4, 4, 4, 3, 2];
  for (let i = 0; i < 40; i++) {
    const tenantId = clinicas[i % 3]!.id;
    const rating = pick(ratings);
    const texto =
      i === 13
        ? // Reseña que DEBE ser excluida del carrusel por mencionar un medicamento (aceptación Fase 3).
          "Bajé 12 kilos con ozempic y el acompañamiento del doctor. ¡Garantizado que funciona!"
        : rating >= 4
          ? pick(RESEÑAS_POSITIVAS)
          : rating === 3
            ? pick(RESEÑAS_NEUTRAS)
            : pick(RESEÑAS_NEGATIVAS);
    const dias = entre(1, 60);
    const estado =
      i >= 38
        ? ("nueva" as const) // Las 2 últimas quedan "nueva": sirven para probar alerta + respuesta IA.
        : rating >= 4
          ? ("publicada" as const)
          : ("ignorada" as const);
    db.reviews.push({
      id: `r-${i}`,
      tenant_id: tenantId,
      review_id_google: `g-review-seed-${i}`,
      rating,
      texto,
      autor_nombre: pick(NOMBRES),
      fecha_review: fechaISO(dias),
      respondida: estado === "publicada",
      respuesta_ia: estado === "nueva" ? null : "Gracias por su opinión, la tomamos muy en cuenta.",
      respuesta_publicada: estado === "publicada" ? "Gracias por su opinión, la tomamos muy en cuenta." : null,
      estado,
      created_at: fechaISO(dias),
    });
  }

  // ---------- 30 citas ----------
  const estados = ["agendada", "confirmada", "asistio", "asistio", "no_asistio", "cancelada"] as const;
  for (let i = 0; i < 30; i++) {
    const tenantId = clinicas[i % 3]!.id;
    const contactos = contactosIds[tenantId]!;
    const futura = i % 4 === 0;
    db.appointments.push({
      id: `ap-${i}`,
      tenant_id: tenantId,
      contact_id: contactos[i % contactos.length]!,
      fecha_hora: futura ? fechaISO(-entre(1, 5), entre(9, 18)) : fechaISO(entre(1, 30), entre(9, 18)),
      nota: pick(["Revisión general", "Primera visita", "Seguimiento", "Limpieza", "Valoración"]),
      estado: futura ? pick(["agendada", "confirmada"] as const) : pick(estados),
      review_solicitada: rnd() < 0.4,
      created_at: fechaISO(entre(31, 60)),
    });
  }

  // ---------- Opiniones del flujo /opina ----------
  for (let i = 0; i < 6; i++) {
    const tenantId = clinicas[i % 3]!.id;
    db.opinions.push({
      id: `op-${i}`,
      tenant_id: tenantId,
      contact_id: null,
      satisfaccion: pick(["excelente", "excelente", "regular", "mala"] as const),
      comentario_privado: i % 3 === 2 ? "La sala de espera podría tener más revistas." : null,
      fue_a_google: i % 3 !== 2,
      created_at: fechaISO(entre(1, 20)),
    });
  }

  db.usage_counters.push(
    { tenant_id: "t-sonrisa", mes: mesActual(), utility_usados: 12, marketing_usados: 0 },
    { tenant_id: "t-aura", mes: mesActual(), utility_usados: 8, marketing_usados: 0 },
    { tenant_id: "t-vital", mes: mesActual(), utility_usados: 5, marketing_usados: 0 },
  );

  db.events_log.push({
    id: "ev-seed",
    tenant_id: null,
    tipo: "seed_cargado",
    payload: { clinicas: 3, contactos: 200, resenas: 40, citas: 30 },
    created_at: ahora,
  });

  await escribir(db);

  function mesActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}

async function escribir(db: Database): Promise<void> {
  const dir = path.join(process.cwd(), "data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "demo-db.json"), JSON.stringify(db, null, 2), "utf8");
  console.log("✔ Seed listo: 3 clínicas, 200 contactos, 40 reseñas, 30 citas.");
  console.log("  Cuenta demo: mariana@sonrisamx.mx / ElBuenDoctor!1");
}

void main();
