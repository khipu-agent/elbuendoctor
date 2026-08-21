// Módulo de WhatsApp (SPEC §4): BSP con Embedded Signup, Gupshup como primera
// opción, abstraído detrás de esta interfaz para poder cambiar a 360dialog sin
// tocar el resto del sistema. CADA clínica conecta SU PROPIO número; jamás uno
// compartido.
//
// INVARIANTES (§10.1 y §15.3) — se aplican en enviarMensaje, la única puerta
// de salida de mensajes:
//   1. Se verifica exclusion_list SIEMPRE antes de encolar.
//   2. Se verifica el límite del plan leyendo usage_counters ANTES de encolar.
//   3. El contador se incrementa en el servidor antes de encolar; si el envío
//      falla, se reembolsa.
//   4. Con quality_rating amarillo/rojo no salen mensajes (freno no desactivable).

import {
  enmascararTelefono,
  obtenerWaAccount,
  registrarEvento,
  registrarMensaje,
  reembolsarEnvio,
  reservarEnvio,
  verificarAntesDeEnviar,
} from "@/lib/db";
import type { Message, MessageCategoria } from "@/lib/types";

export interface ProveedorWhatsApp {
  nombre: string;
  configurado(): boolean;
  enviar(datos: {
    numeroDestino: string;
    plantilla?: string;
    variables?: string[];
    cuerpoLibre?: string;
  }): Promise<{ ok: boolean; error?: string }>;
}

// ---------- Gupshup (producción) ----------

const gupshup: ProveedorWhatsApp = {
  nombre: "gupshup",
  configurado: () => Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_ID),
  async enviar({ numeroDestino, plantilla, variables, cuerpoLibre }) {
    try {
      // API de Gupshup: envío de plantilla o mensaje de sesión.
      // Referencia: https://docs.gupshup.io (el dueño coloca sus llaves en Vercel).
      const cuerpo = cuerpoLibre ?? plantillaConVariables(plantilla ?? "", variables ?? []);
      const res = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY ?? "",
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: process.env.GUPSHUP_APP_ID ?? "",
          destination: numeroDestino.replace("+", ""),
          message: JSON.stringify({ type: "text", text: cuerpo }),
          "src.name": process.env.GUPSHUP_APP_ID ?? "",
        }),
      });
      if (!res.ok) return { ok: false, error: `Gupshup respondió ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "error desconocido" };
    }
  },
};

// ---------- Modo demo de mensajes (SPEC §6.7 paso 4) ----------

const demo: ProveedorWhatsApp = {
  nombre: "demo",
  configurado: () => true,
  async enviar() {
    // En modo demo el mensaje se registra en la base y se muestra en el panel
    // ("Mensajes") tal como llegaría al WhatsApp. Nada sale a números reales.
    return { ok: true };
  },
};

export function proveedorActual(): ProveedorWhatsApp {
  return gupshup.configurado() ? gupshup : demo;
}

function plantillaConVariables(cuerpo: string, variables: string[]): string {
  return variables.reduce((acc, v, i) => acc.replace(`{{${i + 1}}}`, v), cuerpo);
}

export type ResultadoEnvio =
  | { enviado: true; mensaje: Message }
  | { enviado: false; motivo: string };

/**
 * ÚNICA puerta de salida de mensajes del sistema. Aplica los invariantes de
 * cumplimiento antes de encolar y registra todo en la base.
 */
export async function enviarMensaje(datos: {
  tenantId: string;
  contactId: string | null;
  numeroDestino: string;
  categoria: MessageCategoria;
  plantilla?: string;
  variables?: string[];
  cuerpoLibre?: string;
}): Promise<ResultadoEnvio> {
  const cuerpo =
    datos.cuerpoLibre ?? plantillaConVariables(datos.plantilla ?? "", datos.variables ?? []);

  // 1 y 2: exclusión + límites del plan + freno de calidad (antes de encolar).
  const verificacion = await verificarAntesDeEnviar(
    datos.tenantId,
    datos.numeroDestino,
    datos.categoria,
  );
  if (!verificacion.permitido) {
    const motivo =
      verificacion.motivo === "excluido"
        ? "Este número pidió no recibir mensajes."
        : verificacion.motivo === "calidad_pausada"
          ? "Los envíos están en pausa hasta que WhatsApp reactive la calidad del número."
          : "Llegaste al límite de mensajes de tu plan este mes.";
    await registrarMensaje({
      tenant_id: datos.tenantId,
      contact_id: datos.contactId,
      direccion: "out",
      categoria: datos.categoria,
      template_name: datos.plantilla ?? null,
      cuerpo,
      estado: "fallido",
      error_code: verificacion.motivo,
      costo_usd: null,
    });
    return { enviado: false, motivo };
  }

  // 3: reservar contador ANTES de encolar; reembolsar si falla.
  await reservarEnvio(datos.tenantId, datos.categoria);
  const proveedor = proveedorActual();
  const resultado = await proveedor.enviar({
    numeroDestino: datos.numeroDestino,
    plantilla: datos.plantilla,
    variables: datos.variables,
    cuerpoLibre: datos.cuerpoLibre,
  });

  if (!resultado.ok) {
    await reembolsarEnvio(datos.tenantId, datos.categoria);
    await registrarEvento(datos.tenantId, "envio_fallido", {
      destino: enmascararTelefono(datos.numeroDestino),
      error: resultado.error ?? "desconocido",
    });
  }

  const mensaje = await registrarMensaje({
    tenant_id: datos.tenantId,
    contact_id: datos.contactId,
    direccion: "out",
    categoria: datos.categoria,
    template_name: datos.plantilla ?? null,
    cuerpo,
    estado: resultado.ok ? (proveedor.nombre === "demo" ? "enviado" : "enviado") : "fallido",
    error_code: resultado.ok ? null : (resultado.error ?? "error"),
    costo_usd: null,
  });

  return resultado.ok
    ? { enviado: true, mensaje }
    : { enviado: false, motivo: "No pudimos enviar el mensaje, lo reintentamos en unos minutos." };
}

/** Estado de conexión del número del tenant, para mostrar en el panel. */
export async function estadoConexion(tenantId: string): Promise<{
  estado: "sin_conectar" | "pendiente" | "activo" | "pausado";
  numero: string | null;
  quality: "green" | "yellow" | "red" | null;
}> {
  const wa = await obtenerWaAccount(tenantId);
  if (!wa) return { estado: "sin_conectar", numero: null, quality: null };
  return { estado: wa.estado, numero: wa.numero_display, quality: wa.quality_rating };
}
