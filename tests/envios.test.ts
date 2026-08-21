// Tests de los invariantes de envío (SPEC §10.1 y §15.3):
// - límites de mensajes por plan (utility/marketing separados)
// - exclusion_list: NUNCA se envía a un número excluido
// - freno de calidad: rating amarillo/rojo detiene los envíos
// - contador se reserva antes de encolar y se reembolsa si falla

import { describe, it, expect, beforeEach } from "vitest";
import { dbBase, escribirDb, leerDb } from "./helpers";
import {
  agregarExclusion,
  estaExcluido,
  obtenerUso,
  verificarAntesDeEnviar,
} from "@/lib/db";
import { enviarMensaje } from "@/lib/whatsapp";
import { esSolicitudDeBaja } from "@/lib/whatsapp/templates";
import { mesActual } from "@/lib/plans";
import { guardarWaAccount } from "@/lib/db";

beforeEach(async () => {
  await escribirDb(dbBase());
});

describe("límites de mensajes por plan", () => {
  it("permite enviar utility dentro del límite del plan Pro (1000)", async () => {
    const r = await verificarAntesDeEnviar("t1", "+525511111111", "utility");
    expect(r.permitido).toBe(true);
  });

  it("bloquea al llegar al límite utility del plan", async () => {
    const db = dbBase();
    db.usage_counters.push({ tenant_id: "t1", mes: mesActual(), utility_usados: 1000, marketing_usados: 0 });
    await escribirDb(db);
    const r = await verificarAntesDeEnviar("t1", "+525511111111", "utility");
    expect(r).toEqual({ permitido: false, motivo: "limite_plan" });
  });

  it("los límites utility y marketing son SEPARADOS", async () => {
    const db = dbBase();
    db.usage_counters.push({ tenant_id: "t1", mes: mesActual(), utility_usados: 1000, marketing_usados: 0 });
    await escribirDb(db);
    // Utility lleno, pero marketing (300 en Pro) sigue disponible.
    const r = await verificarAntesDeEnviar("t1", "+525511111111", "marketing");
    expect(r.permitido).toBe(true);
  });

  it("el envío incrementa el contador en el servidor", async () => {
    await enviarMensaje({
      tenantId: "t1",
      contactId: null,
      numeroDestino: "+525511111111",
      categoria: "utility",
      cuerpoLibre: "Hola de prueba",
    });
    const uso = await obtenerUso("t1");
    expect(uso.utility_usados).toBe(1);
  });

  it("un envío bloqueado por límite NO consume contador", async () => {
    const db = dbBase();
    db.usage_counters.push({ tenant_id: "t1", mes: mesActual(), utility_usados: 1000, marketing_usados: 0 });
    await escribirDb(db);
    const r = await enviarMensaje({
      tenantId: "t1",
      contactId: null,
      numeroDestino: "+525511111111",
      categoria: "utility",
      cuerpoLibre: "Hola",
    });
    expect(r.enviado).toBe(false);
    const uso = await obtenerUso("t1");
    expect(uso.utility_usados).toBe(1000);
  });
});

describe("exclusion_list (opt-out)", () => {
  it("detecta palabras de baja en cualquier forma", () => {
    expect(esSolicitudDeBaja("BAJA")).toBe(true);
    expect(esSolicitudDeBaja("baja")).toBe(true);
    expect(esSolicitudDeBaja("stop")).toBe(true);
    expect(esSolicitudDeBaja("No, gracias")).toBe(true);
    expect(esSolicitudDeBaja("sí, me interesa")).toBe(false);
    expect(esSolicitudDeBaja("hola")).toBe(false);
  });

  it("un número excluido NUNCA recibe mensajes", async () => {
    await agregarExclusion("t1", "+525599887766", "opt_out");
    expect(await estaExcluido("t1", "+525599887766")).toBe(true);
    const r = await verificarAntesDeEnviar("t1", "+525599887766", "utility");
    expect(r).toEqual({ permitido: false, motivo: "excluido" });
  });

  it("la exclusión es permanente: agregarla dos veces no duplica", async () => {
    await agregarExclusion("t1", "+525599887766", "opt_out");
    await agregarExclusion("t1", "+525599887766", "rebote");
    const db = await leerDb();
    expect(db.exclusion_list.filter((e) => e.telefono === "+525599887766")).toHaveLength(1);
  });

  it("enviarMensaje bloquea a un excluido y lo registra como fallido", async () => {
    await agregarExclusion("t1", "+525599887766", "opt_out");
    const r = await enviarMensaje({
      tenantId: "t1",
      contactId: null,
      numeroDestino: "+525599887766",
      categoria: "marketing",
      cuerpoLibre: "Oferta",
    });
    expect(r.enviado).toBe(false);
    const db = await leerDb();
    const msg = db.messages.at(-1);
    expect(msg?.estado).toBe("fallido");
    expect(msg?.error_code).toBe("excluido");
  });
});

describe("freno automático de calidad (no desactivable)", () => {
  it("rating amarillo bloquea los envíos", async () => {
    const db = dbBase();
    db.wa_accounts[0]!.quality_rating = "yellow";
    await escribirDb(db);
    const r = await verificarAntesDeEnviar("t1", "+525511111111", "utility");
    expect(r).toEqual({ permitido: false, motivo: "calidad_pausada" });
  });

  it("volver a verde reanuda los envíos", async () => {
    const db = dbBase();
    db.wa_accounts[0]!.quality_rating = "red";
    await escribirDb(db);
    expect((await verificarAntesDeEnviar("t1", "+525511111111", "utility")).permitido).toBe(false);
    await guardarWaAccount({ ...db.wa_accounts[0]!, quality_rating: "green" });
    expect((await verificarAntesDeEnviar("t1", "+525511111111", "utility")).permitido).toBe(true);
  });
});
