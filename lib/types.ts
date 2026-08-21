// Modelo de datos de ElBuenDoctor — espejo de supabase/migrations/0001_init.sql
// Regla de oro (SPEC §5): una clínica = un tenant = su propio WhatsApp + su propia conexión de Google.

export type Vertical = "dental" | "especialista" | "estetica" | "peso";
export type PlanId = "trial" | "solo" | "pro" | "clinica";

export interface TenantColores {
  primario: string;
  acento: string;
  fondo: string;
}

export interface Tenant {
  id: string;
  nombre: string;
  vertical: Vertical;
  plan: PlanId;
  slug: string;
  colores: TenantColores;
  logo_url: string | null;
  cedula_profesional: string;
  direccion: string;
  doctor_nombre: string;
  servicios: string[];
  fotos: string[];
  pagina_titular: string | null;
  pagina_descripcion: string | null;
  onboarding_completado: boolean;
  tono_respuestas: "formal" | "cercano";
  autopublicar_resenas: boolean;
  autopublicar_consent_at: string | null;
  founder_price: boolean;
  estado_suscripcion: "trial" | "activa" | "pausada" | "cancelada";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export type Rol = "dueno" | "recepcion";

export interface User {
  id: string;
  tenant_id: string;
  rol: Rol;
  nombre: string;
  email: string;
  password_hash: string; // scrypt; vacío cuando el usuario vive en Supabase Auth
  whatsapp_personal: string; // E.164, alertas al dueño
  created_at: string;
}

export interface WaAccount {
  id: string;
  tenant_id: string;
  proveedor: "gupshup";
  waba_id: string | null;
  phone_number_id: string | null;
  numero_display: string;
  quality_rating: "green" | "yellow" | "red" | null;
  messaging_tier: number | null;
  estado: "pendiente" | "activo" | "pausado";
  created_at: string;
}

export interface GoogleAccount {
  id: string;
  tenant_id: string;
  gbp_location_id: string | null;
  place_id: string | null;
  oauth_tokens_cifrados: string | null;
  modo: "api" | "degradado";
  negocio_nombre: string;
  ultima_sync: string | null;
  created_at: string;
}

export type ReviewEstado = "nueva" | "pendiente_aprobacion" | "aprobada" | "publicada" | "ignorada";

export interface Review {
  id: string;
  tenant_id: string;
  review_id_google: string;
  rating: number;
  texto: string;
  autor_nombre: string;
  fecha_review: string;
  respondida: boolean;
  respuesta_ia: string | null;
  respuesta_publicada: string | null;
  estado: ReviewEstado;
  created_at: string;
}

export interface Competitor {
  id: string;
  tenant_id: string;
  place_id: string;
  nombre: string;
  rating: number;
  total_reviews: number;
  snapshot_fecha: string;
}

export type OptInStatus = "pendiente" | "activo" | "baja";

export interface OptInEvidencia {
  fecha: string;
  canal: string;
  mensaje: string;
  respuesta: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  telefono: string; // E.164
  nombre: string;
  origen: "excel" | "cita" | "micropagina" | "manual";
  opt_in_status: OptInStatus;
  opt_in_evidencia: OptInEvidencia | null;
  ultima_visita: string | null;
  created_at: string;
}

export type AppointmentEstado =
  | "agendada"
  | "confirmada"
  | "reagendar"
  | "asistio"
  | "no_asistio"
  | "cancelada";

export interface Appointment {
  id: string;
  tenant_id: string;
  contact_id: string;
  fecha_hora: string;
  nota: string;
  estado: AppointmentEstado;
  review_solicitada: boolean;
  created_at: string;
}

export type CampaignEstado = "borrador" | "activa" | "pausada_calidad" | "pausada_manual" | "terminada";

export interface Campaign {
  id: string;
  tenant_id: string;
  tipo: "reactivacion";
  nombre: string;
  estado: CampaignEstado;
  limite_diario: number;
  enviados_hoy: number;
  plantilla_oferta: string;
  created_at: string;
}

export type MessageCategoria = "utility" | "marketing" | "service";
export type MessageEstado = "encolado" | "enviado" | "entregado" | "leido" | "fallido";

export interface Message {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  direccion: "in" | "out";
  categoria: MessageCategoria;
  template_name: string | null;
  cuerpo: string;
  estado: MessageEstado;
  error_code: string | null;
  costo_usd: number | null;
  created_at: string;
}

export interface UsageCounter {
  tenant_id: string;
  mes: string; // 'YYYY-MM'
  utility_usados: number;
  marketing_usados: number;
}

export interface ExclusionEntry {
  id: string;
  tenant_id: string;
  telefono: string; // E.164
  motivo: "opt_out" | "rebote" | "reporte";
  fecha: string;
}

export interface EventLog {
  id: string;
  tenant_id: string | null;
  tipo: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// Respuestas del flujo /opina (pregunta de satisfacción previa a Google)
export interface Opinion {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  satisfaccion: "excelente" | "regular" | "mala";
  comentario_privado: string | null;
  fue_a_google: boolean;
  created_at: string;
}
