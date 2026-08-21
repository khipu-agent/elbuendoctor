// Tests del motor de reseñas (SPEC §6.1 y §15.7):
// - una reseña nueva genera respuesta IA aprobable + alerta al dueño
// - la auto-publicación exige toggle expreso CON registro + rating 4-5
// - el humano conserva la última palabra en 3⭐ o menos, siempre

import { describe, it, expect, beforeEach } from "vitest";
import { dbBase, escribirDb, leerDb } from "./helpers";
import { insertarResena } from "@/lib/db";
import { procesarResenaNueva } from "@/lib/resenas";

beforeEach(async () => {
  await escribirDb(dbBase());
});

async function nuevaResena(rating: number) {
  const db = await leerDb();
  const tenant = db.tenants[0]!;
  const review = await insertarResena({
    tenant_id: tenant.id,
    review_id_google: `test-${Date.now()}-${Math.random()}`,
    rating,
    texto: "Muy buena atención, gracias.",
    autor_nombre: "Paciente Prueba",
    fecha_review: new Date().toISOString(),
  });
  return { tenant, review };
}

describe("procesamiento de reseña nueva", () => {
  it("genera respuesta IA y la deja pendiente de aprobación por defecto", async () => {
    const { tenant, review } = await nuevaResena(5);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    const r = db.reviews.find((x) => x.id === review.id)!;
    expect(r.estado).toBe("pendiente_aprobacion");
    expect(r.respuesta_ia).toBeTruthy();
    expect(r.respondida).toBe(false);
  });

  it("manda alerta al dueño por WhatsApp", async () => {
    const { tenant, review } = await nuevaResena(2);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    const alerta = db.messages.find((m) => m.tenant_id === "t1" && m.direccion === "out");
    expect(alerta).toBeTruthy();
    expect(alerta!.cuerpo).toContain("URGENTE"); // rating ≤3 → urgente
    expect(alerta!.cuerpo).toContain("2⭐");
  });

  it("la respuesta IA nunca confirma condición de paciente ni tratamientos", async () => {
    const { tenant, review } = await nuevaResena(5);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    const r = db.reviews.find((x) => x.id === review.id)!;
    expect(r.respuesta_ia).not.toMatch(/paciente|tratamiento|diagnóstico/i);
  });

  it("sin consentimiento registrado, NO auto-publica ni con 5⭐", async () => {
    const db0 = dbBase();
    db0.tenants[0]!.autopublicar_resenas = true;
    db0.tenants[0]!.autopublicar_consent_at = null; // toggle sin registro: inválido
    await escribirDb(db0);
    const { tenant, review } = await nuevaResena(5);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    expect(db.reviews.find((x) => x.id === review.id)!.estado).toBe("pendiente_aprobacion");
  });

  it("con consentimiento registrado y 5⭐, auto-publica", async () => {
    const db0 = dbBase();
    db0.tenants[0]!.autopublicar_resenas = true;
    db0.tenants[0]!.autopublicar_consent_at = new Date().toISOString();
    await escribirDb(db0);
    const { tenant, review } = await nuevaResena(5);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    const r = db.reviews.find((x) => x.id === review.id)!;
    expect(r.estado).toBe("publicada");
    expect(r.respondida).toBe(true);
  });

  it("con consentimiento, 3⭐ o menos NUNCA auto-publica", async () => {
    const db0 = dbBase();
    db0.tenants[0]!.autopublicar_resenas = true;
    db0.tenants[0]!.autopublicar_consent_at = new Date().toISOString();
    await escribirDb(db0);
    const { tenant, review } = await nuevaResena(3);
    await procesarResenaNueva(review, tenant, "+525511223344");
    const db = await leerDb();
    expect(db.reviews.find((x) => x.id === review.id)!.estado).toBe("pendiente_aprobacion");
  });

  it("la sincronización es idempotente por review_id_google", async () => {
    const a = await nuevaResena(5);
    const b = await insertarResena({
      tenant_id: "t1",
      review_id_google: a.review.review_id_google,
      rating: 1,
      texto: "duplicada",
      autor_nombre: "Otro",
      fecha_review: new Date().toISOString(),
    });
    expect(b.id).toBe(a.review.id);
  });
});
