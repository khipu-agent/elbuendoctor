// Tests del FILTRO DE CUMPLIMIENTO (SPEC §10.3) — riesgo legal, camino crítico.

import { describe, it, expect } from "vitest";
import { filtrarCumplimiento, nombreConInicial } from "@/lib/ai/compliance";

describe("filtro de cumplimiento", () => {
  it("aprueba una reseña limpia de trato y profesionalismo", () => {
    const r = filtrarCumplimiento("Excelente atención, muy profesionales y puntuales.");
    expect(r.aprobado).toBe(true);
  });

  it("excluye medicamentos por nombre (ozempic)", () => {
    const r = filtrarCumplimiento("Bajé con ozempic, lo recomiendo mucho");
    expect(r.aprobado).toBe(false);
  });

  it("excluye cifras de peso y resultados clínicos", () => {
    expect(filtrarCumplimiento("Perdí 10 kg en dos meses").aprobado).toBe(false);
    expect(filtrarCumplimiento("Bajé 5 kilos").aprobado).toBe(false);
  });

  it("excluye 'me curó' y 'garantizado'", () => {
    expect(filtrarCumplimiento("El doctor me curó por completo").aprobado).toBe(false);
    expect(filtrarCumplimiento("Resultados garantizados").aprobado).toBe(false);
  });

  it("excluye condiciones médicas específicas", () => {
    expect(filtrarCumplimiento("Me trató la diabetes muy bien").aprobado).toBe(false);
  });

  it("excluye superlativos", () => {
    expect(filtrarCumplimiento("Es el mejor dentista de México").aprobado).toBe(false);
    expect(filtrarCumplimiento("La mejor clínica").aprobado).toBe(false);
  });

  it("acumula varios motivos", () => {
    const r = filtrarCumplimiento("El mejor doctor, me curó y bajé 8 kg con ozempic");
    expect(r.aprobado).toBe(false);
    if (!r.aprobado) expect(r.motivos.length).toBeGreaterThanOrEqual(3);
  });
});

describe("nombre con inicial", () => {
  it("oculta el apellido completo", () => {
    expect(nombreConInicial("María González")).toBe("María G.");
    expect(nombreConInicial("José Luis Hernández Pérez")).toBe("José P.");
  });
  it("maneja nombre sin apellido y vacío", () => {
    expect(nombreConInicial("María")).toBe("María");
    expect(nombreConInicial("  ")).toBe("Paciente");
  });
});
