// Fixture mínima de base de datos para tests: escribe el archivo JSON del
// almacén demo y limpia la caché antes de cada prueba.

import { promises as fs } from "fs";
import path from "path";
import { dataDir, emptyDb, invalidateCache, type Database } from "@/lib/db/json-store";
import { scryptSync } from "crypto";

export function hashDemo(password: string): string {
  const salt = "test-salt";
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function dbBase(): Database {
  const db = emptyDb();
  const ahora = new Date().toISOString();
  db.tenants.push({
    id: "t1",
    nombre: "Clínica Test",
    vertical: "dental",
    plan: "pro",
    slug: "clinica-test",
    colores: { primario: "#0D6E5F", acento: "#F2B01E", fondo: "#FAF7F0" },
    logo_url: null,
    cedula_profesional: "12345678",
    direccion: "Calle 1, CDMX",
    doctor_nombre: "Dra. Test",
    servicios: [],
    fotos: [],
    pagina_titular: null,
    pagina_descripcion: null,
    onboarding_completado: true,
    tono_respuestas: "cercano",
    autopublicar_resenas: false,
    autopublicar_consent_at: null,
    founder_price: false,
    estado_suscripcion: "activa",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    trial_ends_at: null,
    created_at: ahora,
  });
  db.users.push({
    id: "u1",
    tenant_id: "t1",
    rol: "dueno",
    nombre: "Dra. Test",
    email: "dra@test.mx",
    password_hash: hashDemo("secreto123"),
    whatsapp_personal: "+525511223344",
    created_at: ahora,
  });
  db.wa_accounts.push({
    id: "w1",
    tenant_id: "t1",
    proveedor: "gupshup",
    waba_id: null,
    phone_number_id: null,
    numero_display: "+52 55 0000 0000",
    quality_rating: "green",
    messaging_tier: 1,
    estado: "activo",
    created_at: ahora,
  });
  return db;
}

export async function escribirDb(db: Database): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(path.join(dataDir(), "demo-db.json"), JSON.stringify(db), "utf8");
  invalidateCache();
}

export async function leerDb(): Promise<Database> {
  invalidateCache();
  const raw = await fs.readFile(path.join(dataDir(), "demo-db.json"), "utf8");
  return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Database>) };
}
