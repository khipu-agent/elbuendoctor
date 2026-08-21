// Almacén de demostración respaldado por archivo JSON.
// Se usa cuando NO hay variables de Supabase configuradas (ver lib/db/index.ts).
// Con las llaves de Supabase en Vercel, el mismo repositorio corre sobre Postgres+RLS
// (supabase/migrations/0001_init.sql). Ninguna página toca este archivo directamente.

import { promises as fs } from "fs";
import path from "path";
import type {
  Appointment,
  Campaign,
  Competitor,
  Contact,
  EventLog,
  ExclusionEntry,
  GoogleAccount,
  Message,
  Opinion,
  Review,
  Tenant,
  UsageCounter,
  User,
  WaAccount,
} from "@/lib/types";

export interface Database {
  tenants: Tenant[];
  users: User[];
  wa_accounts: WaAccount[];
  google_accounts: GoogleAccount[];
  reviews: Review[];
  competitors: Competitor[];
  contacts: Contact[];
  appointments: Appointment[];
  campaigns: Campaign[];
  messages: Message[];
  usage_counters: UsageCounter[];
  exclusion_list: ExclusionEntry[];
  events_log: EventLog[];
  opinions: Opinion[];
}

export function emptyDb(): Database {
  return {
    tenants: [],
    users: [],
    wa_accounts: [],
    google_accounts: [],
    reviews: [],
    competitors: [],
    contacts: [],
    appointments: [],
    campaigns: [],
    messages: [],
    usage_counters: [],
    exclusion_list: [],
    events_log: [],
    opinions: [],
  };
}

// En tests, cada worker de vitest usa su propio directorio para no interferirse.
// En Vercel el disco del proyecto es de solo lectura: se trabaja sobre /tmp.
export function dataDir(): string {
  let base = process.env.EBD_DATA_DIR ?? path.join(process.cwd(), "data");
  if (!process.env.EBD_DATA_DIR && process.env.VERCEL) base = "/tmp/ebd-data";
  return process.env.VITEST_POOL_ID ? path.join(base, `pool-${process.env.VITEST_POOL_ID}`) : base;
}

// Semilla de demostración importada de forma ESTÁTICA: en Vercel las funciones
// serverless solo empaquetan archivos alcanzables por imports, así que un
// fs.readFile(process.cwd()/data/...) NO existe en tiempo de ejecución.
// Al importarla aquí, el bundler la incrusta y la cuenta de prueba siempre existe.
// (En local y en Docker el flujo normal sigue leyendo/escribiendo data/demo-db.json.)
import semillaJson from "../../data/demo-db.json";

function semillaDemo(): Database {
  return { ...emptyDb(), ...(semillaJson as Partial<Database>) };
}

function dbFile(): string {
  return path.join(dataDir(), "demo-db.json");
}

// Caché en memoria para no releer el disco en cada request dentro del mismo proceso.
let cache: Database | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function readFromDisk(): Promise<Database> {
  try {
    const raw = await fs.readFile(dbFile(), "utf8");
    return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Database>) };
  } catch {
    // En Vercel el archivo mutable vive en /tmp y arranca vacío en cada instancia:
    // se siembra desde el JSON incrustado para que la cuenta de prueba siempre exista.
    if (process.env.VERCEL && !process.env.EBD_DATA_DIR) {
      const semilla = semillaDemo();
      try {
        await fs.mkdir(dataDir(), { recursive: true });
        await fs.writeFile(dbFile(), JSON.stringify(semilla, null, 2), "utf8");
      } catch {
        // Si /tmp no está disponible, igual se devuelve la semilla en memoria.
      }
      return semilla;
    }
    return emptyDb();
  }
}

export async function loadDb(): Promise<Database> {
  if (!cache) cache = await readFromDisk();
  return cache;
}

export async function saveDb(db: Database): Promise<void> {
  cache = db;
  // Escrituras serializadas para evitar archivos corruptos por escrituras concurrentes.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDir(), { recursive: true });
    const tmp = dbFile() + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, dbFile());
  });
  return writeQueue;
}

/** Mutación atómica: lee, aplica la función y persiste. */
export async function mutateDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await loadDb();
  const result = fn(db);
  await saveDb(db);
  return result;
}

/** Solo para tests y seed: fuerza recarga desde disco. */
export function invalidateCache(): void {
  cache = null;
}
