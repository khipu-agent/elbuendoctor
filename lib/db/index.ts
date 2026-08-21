// Repositorio de datos de ElBuenDoctor.
//
// DECISIÓN (ver DECISIONES.md #1): la app corre contra Supabase (Postgres + RLS)
// cuando SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están configuradas; sin ellas,
// usa el almacén de demostración JSON (lib/db/json-store.ts) cargado con el seed.
// El esquema SQL con RLS vive en supabase/migrations/0001_init.sql y este archivo
// es el ÚNICO punto de acceso a datos: la conexión a Supabase se enchufa aquí sin
// tocar páginas ni rutas.
//
// INVARIANTES aplicadas aquí (SPEC §10 y §15.3):
// - Ningún envío se encola sin verificar exclusion_list (verificarAntesDeEnviar).
// - Los contadores de uso se verifican e incrementan en el servidor ANTES de
//   encolar; si el envío falla, se reembolsa el contador.
// - exclusion_list NUNCA se borra.
// - Toda acción sensible queda en events_log.

import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { loadDb, mutateDb } from "./json-store";
import { PLANES, mesActual } from "@/lib/plans";
import type {
  Appointment,
  Campaign,
  Competitor,
  Contact,
  EventLog,
  ExclusionEntry,
  GoogleAccount,
  Message,
  MessageCategoria,
  Opinion,
  Review,
  ReviewEstado,
  Tenant,
  UsageCounter,
  User,
  Vertical,
  WaAccount,
} from "@/lib/types";

export function ahora(): string {
  return new Date().toISOString();
}

export function nuevoId(): string {
  return randomUUID();
}

export function esSupabaseConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---------- Tenants ----------

export async function obtenerTenantPorSlug(slug: string): Promise<Tenant | null> {
  const db = await loadDb();
  return db.tenants.find((t) => t.slug === slug) ?? null;
}

export async function obtenerTenantPorId(id: string): Promise<Tenant | null> {
  const db = await loadDb();
  return db.tenants.find((t) => t.id === id) ?? null;
}

export async function crearTenant(datos: {
  nombre: string;
  vertical: Vertical;
  slug: string;
  cedula_profesional: string;
  direccion: string;
  doctor_nombre: string;
}): Promise<Tenant> {
  return mutateDb((db) => {
    if (db.tenants.some((t) => t.slug === datos.slug)) {
      throw new Error("Esa dirección de página ya está en uso. Prueba con otra.");
    }
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    const tenant: Tenant = {
      id: nuevoId(),
      nombre: datos.nombre,
      vertical: datos.vertical,
      plan: "trial",
      slug: datos.slug,
      colores: { primario: "#0D6E5F", acento: "#F2B01E", fondo: "#FAF7F0" },
      logo_url: null,
      cedula_profesional: datos.cedula_profesional,
      direccion: datos.direccion,
      doctor_nombre: datos.doctor_nombre,
      servicios: [],
      fotos: [],
      pagina_titular: null,
      pagina_descripcion: null,
      onboarding_completado: false,
      tono_respuestas: "cercano",
      autopublicar_resenas: false,
      autopublicar_consent_at: null,
      founder_price: false,
      estado_suscripcion: "trial",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      trial_ends_at: trialEnds.toISOString(),
      created_at: ahora(),
    };
    db.tenants.push(tenant);
    registrarEventoEnDb(db, tenant.id, "tenant_creado", { slug: tenant.slug });
    return tenant;
  });
}

export async function actualizarTenant(id: string, cambios: Partial<Tenant>): Promise<Tenant> {
  return mutateDb((db) => {
    const t = db.tenants.find((x) => x.id === id);
    if (!t) throw new Error("Tenant no encontrado");
    if (cambios.slug && db.tenants.some((x) => x.slug === cambios.slug && x.id !== id)) {
      throw new Error("Esa dirección de página ya está en uso. Prueba con otra.");
    }
    Object.assign(t, cambios);
    return t;
  });
}

// ---------- Usuarios y auth ----------

function hashPassword(password: string, salt?: string): string {
  const s = salt ?? randomUUID();
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

function verificarPassword(password: string, almacenado: string): boolean {
  const [salt, hash] = almacenado.split(":");
  if (!salt || !hash) return false;
  const calculado = scryptSync(password, salt, 32);
  const esperado = Buffer.from(hash, "hex");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

export async function crearUsuario(datos: {
  tenant_id: string;
  email: string;
  password: string;
  nombre: string;
  rol?: User["rol"];
  whatsapp_personal?: string;
}): Promise<User> {
  return mutateDb((db) => {
    const email = datos.email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) {
      throw new Error("Ya existe una cuenta con ese correo. Intenta entrar.");
    }
    const user: User = {
      id: nuevoId(),
      tenant_id: datos.tenant_id,
      rol: datos.rol ?? "dueno",
      nombre: datos.nombre,
      email,
      password_hash: hashPassword(datos.password),
      whatsapp_personal: datos.whatsapp_personal ?? "",
      created_at: ahora(),
    };
    db.users.push(user);
    return user;
  });
}

export async function autenticarUsuario(email: string, password: string): Promise<User | null> {
  const db = await loadDb();
  const user = db.users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !user.password_hash) return null;
  return verificarPassword(password, user.password_hash) ? user : null;
}

export async function obtenerUsuarioPorId(id: string): Promise<User | null> {
  const db = await loadDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function actualizarUsuario(id: string, cambios: Partial<User>): Promise<User> {
  return mutateDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("Usuario no encontrado");
    Object.assign(u, cambios);
    return u;
  });
}

// ---------- Cuentas de WhatsApp y Google ----------

export async function obtenerWaAccount(tenantId: string): Promise<WaAccount | null> {
  const db = await loadDb();
  return db.wa_accounts.find((w) => w.tenant_id === tenantId) ?? null;
}

export async function guardarWaAccount(cuenta: Omit<WaAccount, "id" | "created_at">): Promise<WaAccount> {
  return mutateDb((db) => {
    const existente = db.wa_accounts.find((w) => w.tenant_id === cuenta.tenant_id);
    if (existente) {
      Object.assign(existente, cuenta);
      return existente;
    }
    const nuevo: WaAccount = { ...cuenta, id: nuevoId(), created_at: ahora() };
    db.wa_accounts.push(nuevo);
    return nuevo;
  });
}

export async function obtenerGoogleAccount(tenantId: string): Promise<GoogleAccount | null> {
  const db = await loadDb();
  return db.google_accounts.find((g) => g.tenant_id === tenantId) ?? null;
}

export async function guardarGoogleAccount(
  cuenta: Omit<GoogleAccount, "id" | "created_at">,
): Promise<GoogleAccount> {
  return mutateDb((db) => {
    const existente = db.google_accounts.find((g) => g.tenant_id === cuenta.tenant_id);
    if (existente) {
      Object.assign(existente, cuenta);
      return existente;
    }
    const nuevo: GoogleAccount = { ...cuenta, id: nuevoId(), created_at: ahora() };
    db.google_accounts.push(nuevo);
    return nuevo;
  });
}

// ---------- Competidores (máx 3 por tenant, SPEC §5) ----------

export async function obtenerCompetidores(tenantId: string): Promise<Competitor[]> {
  const db = await loadDb();
  return db.competitors.filter((c) => c.tenant_id === tenantId).slice(0, 3);
}

export async function guardarCompetidores(
  tenantId: string,
  competidores: Array<Pick<Competitor, "place_id" | "nombre" | "rating" | "total_reviews">>,
): Promise<void> {
  await mutateDb((db) => {
    db.competitors = db.competitors.filter((c) => c.tenant_id !== tenantId);
    for (const c of competidores.slice(0, 3)) {
      db.competitors.push({
        ...c,
        id: nuevoId(),
        tenant_id: tenantId,
        snapshot_fecha: ahora(),
      });
    }
    registrarEventoEnDb(db, tenantId, "competidores_actualizados", { total: competidores.length });
  });
}

// ---------- Reseñas ----------

export async function obtenerResenas(tenantId: string, estado?: ReviewEstado): Promise<Review[]> {
  const db = await loadDb();
  return db.reviews
    .filter((r) => r.tenant_id === tenantId && (!estado || r.estado === estado))
    .sort((a, b) => b.fecha_review.localeCompare(a.fecha_review));
}

export async function obtenerResenaPorId(id: string): Promise<Review | null> {
  const db = await loadDb();
  return db.reviews.find((r) => r.id === id) ?? null;
}

export async function insertarResena(
  datos: Omit<Review, "id" | "created_at" | "respondida" | "respuesta_ia" | "respuesta_publicada" | "estado">,
): Promise<Review> {
  return mutateDb((db) => {
    // Idempotencia: review_id_google es único por tenant.
    const duplicada = db.reviews.find(
      (r) => r.tenant_id === datos.tenant_id && r.review_id_google === datos.review_id_google,
    );
    if (duplicada) return duplicada;
    const review: Review = {
      ...datos,
      id: nuevoId(),
      respondida: false,
      respuesta_ia: null,
      respuesta_publicada: null,
      estado: "nueva",
      created_at: ahora(),
    };
    db.reviews.push(review);
    return review;
  });
}

export async function actualizarResena(id: string, cambios: Partial<Review>): Promise<Review> {
  return mutateDb((db) => {
    const r = db.reviews.find((x) => x.id === id);
    if (!r) throw new Error("Reseña no encontrada");
    Object.assign(r, cambios);
    return r;
  });
}

// ---------- Contactos ----------

export async function obtenerContactos(tenantId: string): Promise<Contact[]> {
  const db = await loadDb();
  return db.contacts.filter((c) => c.tenant_id === tenantId);
}

export async function obtenerContactoPorTelefono(
  tenantId: string,
  telefono: string,
): Promise<Contact | null> {
  const db = await loadDb();
  return db.contacts.find((c) => c.tenant_id === tenantId && c.telefono === telefono) ?? null;
}

export async function obtenerContactoPorId(id: string): Promise<Contact | null> {
  const db = await loadDb();
  return db.contacts.find((c) => c.id === id) ?? null;
}

export async function crearContacto(
  datos: Omit<Contact, "id" | "created_at">,
): Promise<Contact> {
  return mutateDb((db) => {
    const existente = db.contacts.find(
      (c) => c.tenant_id === datos.tenant_id && c.telefono === datos.telefono,
    );
    if (existente) return existente;
    const contacto: Contact = { ...datos, id: nuevoId(), created_at: ahora() };
    db.contacts.push(contacto);
    return contacto;
  });
}

export async function actualizarContacto(id: string, cambios: Partial<Contact>): Promise<Contact> {
  return mutateDb((db) => {
    const c = db.contacts.find((x) => x.id === id);
    if (!c) throw new Error("Contacto no encontrado");
    Object.assign(c, cambios);
    return c;
  });
}

// ---------- Citas ----------

export async function obtenerCitas(tenantId: string): Promise<Appointment[]> {
  const db = await loadDb();
  return db.appointments
    .filter((a) => a.tenant_id === tenantId)
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
}

// ---------- Campañas (estructura lista para Fase 3) ----------

export async function obtenerCampanas(tenantId: string): Promise<Campaign[]> {
  const db = await loadDb();
  return db.campaigns.filter((c) => c.tenant_id === tenantId);
}

// ---------- Lista de exclusión: NUNCA se borra (SPEC §10.1) ----------

export async function estaExcluido(tenantId: string, telefono: string): Promise<boolean> {
  const db = await loadDb();
  return db.exclusion_list.some((e) => e.tenant_id === tenantId && e.telefono === telefono);
}

export async function agregarExclusion(
  tenantId: string,
  telefono: string,
  motivo: ExclusionEntry["motivo"],
): Promise<void> {
  await mutateDb((db) => {
    if (db.exclusion_list.some((e) => e.tenant_id === tenantId && e.telefono === telefono)) return;
    db.exclusion_list.push({ id: nuevoId(), tenant_id: tenantId, telefono, motivo, fecha: ahora() });
    registrarEventoEnDb(db, tenantId, "exclusion_agregada", {
      motivo,
      telefono_enmascarado: enmascararTelefono(telefono),
    });
  });
}

// Nunca escribir teléfonos completos en logs (SPEC §5).
export function enmascararTelefono(telefono: string): string {
  if (telefono.length <= 6) return "***";
  return `${telefono.slice(0, 4)}••••${telefono.slice(-2)}`;
}

// ---------- Contadores de uso (SPEC §15.3: servidor, ANTES de encolar) ----------

export async function obtenerUso(tenantId: string, mes: string = mesActual()): Promise<UsageCounter> {
  const db = await loadDb();
  return (
    db.usage_counters.find((u) => u.tenant_id === tenantId && u.mes === mes) ?? {
      tenant_id: tenantId,
      mes,
      utility_usados: 0,
      marketing_usados: 0,
    }
  );
}

export type ResultadoLimite =
  | { permitido: true }
  | { permitido: false; motivo: "excluido" | "limite_plan" | "calidad_pausada" };

/**
 * Verificación previa a CUALQUIER envío. Devuelve si el envío está permitido.
 * No incrementa nada: el incremento ocurre en reservarEnvio(), justo antes de encolar.
 */
export async function verificarAntesDeEnviar(
  tenantId: string,
  telefono: string,
  categoria: MessageCategoria,
): Promise<ResultadoLimite> {
  if (await estaExcluido(tenantId, telefono)) return { permitido: false, motivo: "excluido" };
  if (categoria === "service") return { permitido: true };

  const tenant = await obtenerTenantPorId(tenantId);
  if (!tenant) return { permitido: false, motivo: "limite_plan" };

  // Freno automático de calidad (SPEC §6.3): con rating amarillo/rojo no salen campañas.
  const wa = await obtenerWaAccount(tenantId);
  if (wa && (wa.quality_rating === "yellow" || wa.quality_rating === "red")) {
    return { permitido: false, motivo: "calidad_pausada" };
  }

  const plan = PLANES[tenant.plan];
  const uso = await obtenerUso(tenantId);
  if (categoria === "utility" && uso.utility_usados >= plan.limiteUtility) {
    return { permitido: false, motivo: "limite_plan" };
  }
  if (categoria === "marketing" && uso.marketing_usados >= plan.limiteMarketing) {
    return { permitido: false, motivo: "limite_plan" };
  }
  return { permitido: true };
}

/** Incrementa el contador en el servidor ANTES de encolar (SPEC §15.3). */
export async function reservarEnvio(tenantId: string, categoria: MessageCategoria): Promise<void> {
  if (categoria === "service") return;
  await mutateDb((db) => {
    const mes = mesActual();
    let u = db.usage_counters.find((x) => x.tenant_id === tenantId && x.mes === mes);
    if (!u) {
      u = { tenant_id: tenantId, mes, utility_usados: 0, marketing_usados: 0 };
      db.usage_counters.push(u);
    }
    if (categoria === "utility") u.utility_usados += 1;
    else u.marketing_usados += 1;
  });
}

/** Si el envío falla, se reembolsa el contador (SPEC §15.3). */
export async function reembolsarEnvio(tenantId: string, categoria: MessageCategoria): Promise<void> {
  if (categoria === "service") return;
  await mutateDb((db) => {
    const mes = mesActual();
    const u = db.usage_counters.find((x) => x.tenant_id === tenantId && x.mes === mes);
    if (!u) return;
    if (categoria === "utility") u.utility_usados = Math.max(0, u.utility_usados - 1);
    else u.marketing_usados = Math.max(0, u.marketing_usados - 1);
  });
}

// ---------- Mensajes ----------

export async function registrarMensaje(
  datos: Omit<Message, "id" | "created_at">,
): Promise<Message> {
  return mutateDb((db) => {
    const msg: Message = { ...datos, id: nuevoId(), created_at: ahora() };
    db.messages.push(msg);
    return msg;
  });
}

export async function obtenerMensajes(tenantId: string): Promise<Message[]> {
  const db = await loadDb();
  return db.messages
    .filter((m) => m.tenant_id === tenantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------- Opiniones del flujo /opina ----------

export async function registrarOpinion(datos: Omit<Opinion, "id" | "created_at">): Promise<Opinion> {
  return mutateDb((db) => {
    const opinion: Opinion = { ...datos, id: nuevoId(), created_at: ahora() };
    db.opinions.push(opinion);
    return opinion;
  });
}

export async function obtenerOpiniones(tenantId: string): Promise<Opinion[]> {
  const db = await loadDb();
  return db.opinions
    .filter((o) => o.tenant_id === tenantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------- Bitácora de eventos (auditoría) ----------

function registrarEventoEnDb(
  db: { events_log: EventLog[] },
  tenantId: string | null,
  tipo: string,
  payload: Record<string, unknown>,
): void {
  db.events_log.push({ id: nuevoId(), tenant_id: tenantId, tipo, payload, created_at: ahora() });
}

export async function registrarEvento(
  tenantId: string | null,
  tipo: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await mutateDb((db) => registrarEventoEnDb(db, tenantId, tipo, payload));
}

export async function obtenerEventos(tenantId: string): Promise<EventLog[]> {
  const db = await loadDb();
  return db.events_log
    .filter((e) => e.tenant_id === tenantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
