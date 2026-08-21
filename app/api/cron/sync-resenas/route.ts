// Cron diario 07:00 (SPEC §5): sync de reseñas nuevas de Google por tenant + alertas.
// En Vercel se agenda en vercel.json; en Supabase/pg_cron haría ping a esta ruta.
// Protegido con CRON_SECRET: Vercel envía Authorization: Bearer <secret>.

import { NextResponse } from "next/server";
import { loadDb } from "@/lib/db/json-store";
import { procesarResenaNueva } from "@/lib/resenas";

// Nunca prerenderizar en build: esta ruta ejecuta trabajo real.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  // Sin CRON_SECRET configurado, el cron solo corre en desarrollo local.
  if (!secreto && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron no configurado" }, { status: 503 });
  }
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = await loadDb();
  let procesadas = 0;

  for (const tenant of db.tenants) {
    const nuevas = db.reviews.filter((r) => r.tenant_id === tenant.id && r.estado === "nueva");
    if (nuevas.length === 0) continue;
    const dueno = db.users.find((u) => u.tenant_id === tenant.id && u.rol === "dueno");
    const numeroDueno = dueno?.whatsapp_personal || "+520000000000";
    for (const review of nuevas) {
      // procesarResenaNueva genera la respuesta IA y alerta al dueño (§6.1).
      // Nota: usa obtenerSesion solo en las acciones de panel; esta función es pura.
      await procesarResenaNueva(review, tenant, numeroDueno);
      procesadas += 1;
    }
  }

  return NextResponse.json({ ok: true, procesadas });
}
