// Webhook de WhatsApp (SPEC §5): entrantes (respuestas de botones, textos,
// estados de entrega, cambios de quality rating). IDEMPOTENTE.
//
// INVARIANTES:
// - "BAJA"/"no"/"stop" en CUALQUIER entrante → opt-out inmediato y permanente (§8).
// - quality_rating amarillo/rojo → freno automático no desactivable (§6.3):
//   pausa TODAS las campañas del tenant y notifica al dueño en lenguaje simple.

import { NextResponse } from "next/server";
import {
  agregarExclusion,
  enmascararTelefono,
  estaExcluido,
  guardarWaAccount,
  obtenerContactoPorTelefono,
  actualizarContacto,
  obtenerWaAccount,
  registrarEvento,
  registrarMensaje,
} from "@/lib/db";
import { esSolicitudDeBaja } from "@/lib/whatsapp/templates";
import { mutateDb, loadDb } from "@/lib/db/json-store";

interface EntranteNormalizado {
  proveedorEventoId: string;
  tenantId?: string;
  telefono: string;
  texto?: string;
  tipo: "texto" | "boton" | "estado" | "quality";
  quality?: "green" | "yellow" | "red";
}

// Normaliza el payload de Gupshup a una forma interna. Ante formato
// desconocido, responde 200 sin hacer nada (los webhooks no deben rebotar).
function normalizar(body: Record<string, unknown>): EntranteNormalizado | null {
  const tipo = body.type as string | undefined;
  if (!tipo) return null;

  if (tipo === "message-event" || tipo === "message") {
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const id = (payload.id as string) ?? (body.id as string);
    if (!id) return null;
    return {
      proveedorEventoId: `gupshup-${id}`,
      telefono: String(payload.source ?? body.source ?? ""),
      texto: undefined,
      tipo: "estado",
    };
  }

  if (tipo === "message" || tipo === "text") {
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const id = (payload.id as string) ?? `gupshup-${Date.now()}`;
    return {
      proveedorEventoId: String(id),
      telefono: String((payload as { source?: string }).source ?? ""),
      texto: String(
        ((payload as { payload?: { text?: string } }).payload?.text ??
          (body.text as string)) ?? "",
      ),
      tipo: "texto",
    };
  }

  if (tipo === "account-event" || tipo === "quality") {
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const quality = String(payload.quality ?? body.quality ?? "").toLowerCase();
    if (!["green", "yellow", "red"].includes(quality)) return null;
    return {
      proveedorEventoId: `quality-${quality}-${Date.now()}`,
      telefono: "",
      tipo: "quality",
      quality: quality as "green" | "yellow" | "red",
    };
  }
  return null;
}

async function procesarEntrante(ev: EntranteNormalizado): Promise<void> {
  const db = await loadDb();

  // Resolver tenant por número destino si no viene explícito.
  let tenantId = ev.tenantId;
  if (!tenantId && ev.telefono) {
    // El teléfono del EMISOR no identifica tenant directamente; el payload real
    // de Gupshup trae el appId/destination que identifica la cuenta. En demo se
    // resuelve por el número del dueño o del contacto.
    const wa = db.wa_accounts.find((w) => w.numero_display.replace(/\D/g, "") === ev.telefono.replace(/\D/g, ""));
    if (wa) tenantId = wa.tenant_id;
  }
  if (!tenantId) {
    // Evento sin tenant identificable: se registra globalmente y se ignora.
    await registrarEvento(null, "webhook_sin_tenant", { tipo: ev.tipo });
    return;
  }

  if (ev.tipo === "quality" && ev.quality) {
    const wa = await obtenerWaAccount(tenantId);
    if (wa) {
      await guardarWaAccount({ ...wa, quality_rating: ev.quality });
      if (ev.quality === "yellow" || ev.quality === "red") {
        // FRENO AUTOMÁTICO (§6.3): no configurable ni desactivable por el cliente.
        await mutateDb((db2) => {
          for (const c of db2.campaigns) {
            if (c.tenant_id === tenantId && c.estado === "activa") c.estado = "pausada_calidad";
          }
        });
        await registrarEvento(tenantId, "freno_calidad", { quality: ev.quality });
      }
    }
    return;
  }

  if (ev.tipo === "texto" && ev.telefono && ev.texto !== undefined) {
    const telefono = ev.telefono.startsWith("+") ? ev.telefono : `+${ev.telefono}`;
    await registrarMensaje({
      tenant_id: tenantId,
      contact_id: null,
      direccion: "in",
      categoria: "service",
      template_name: null,
      cuerpo: ev.texto,
      estado: "leido",
      error_code: null,
      costo_usd: null,
    });

    // Opt-out inmediato (§8): procesar bajas escritas al instante. Permanente.
    if (esSolicitudDeBaja(ev.texto)) {
      await agregarExclusion(tenantId, telefono, "opt_out");
      const contacto = await obtenerContactoPorTelefono(tenantId, telefono);
      if (contacto) await actualizarContacto(contacto.id, { opt_in_status: "baja" });
      await registrarEvento(tenantId, "opt_out_procesado", {
        telefono_enmascarado: enmascararTelefono(telefono),
      });
      return;
    }

    // Respuesta "Sí, me interesa" → evidencia de re-opt-in (§6.3).
    if (/^s[íi]/i.test(ev.texto.trim())) {
      const contacto = await obtenerContactoPorTelefono(tenantId, telefono);
      if (contacto) {
        await actualizarContacto(contacto.id, {
          opt_in_status: "activo",
          opt_in_evidencia: {
            fecha: new Date().toISOString(),
            canal: "whatsapp",
            mensaje: "reactivacion_optin",
            respuesta: ev.texto.slice(0, 100),
          },
        });
      }
    }
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const ev = normalizar(body);
  if (!ev) return NextResponse.json({ ok: true });

  // Idempotencia: el mismo evento del proveedor no se procesa dos veces.
  const db = await loadDb();
  const yaProcesado = db.events_log.some(
    (e) => e.tipo === "webhook_procesado" && e.payload["evento"] === ev.proveedorEventoId,
  );
  if (yaProcesado) return NextResponse.json({ ok: true, duplicado: true });

  await procesarEntrante(ev);
  await registrarEvento(ev.tenantId ?? null, "webhook_procesado", { evento: ev.proveedorEventoId });

  return NextResponse.json({ ok: true });
}

// Verificación del webhook (handshake del BSP).
export async function GET() {
  return NextResponse.json({ ok: true, servicio: "ElBuenDoctor WhatsApp webhook" });
}
