// Planes y límites (SPEC §3). Los límites separados utility/marketing son INTENCIONALES:
// protegen el margen. No unificarlos jamás.

import type { PlanId } from "@/lib/types";

export interface PlanDef {
  id: PlanId;
  nombre: string;
  precioMensualMXN: number;
  precioAnualMXN: number; // 10 meses: 2 meses gratis
  limiteUtility: number;
  limiteMarketing: number;
  recordatorios: boolean;
  reactivacion: boolean;
  carrusel: boolean;
  multiSucursal: boolean;
}

export const PLANES: Record<PlanId, PlanDef> = {
  // La prueba de 14 días corre con funcionalidad del plan Pro (SPEC §3).
  trial: {
    id: "trial",
    nombre: "Prueba gratis",
    precioMensualMXN: 0,
    precioAnualMXN: 0,
    limiteUtility: 1000,
    limiteMarketing: 300,
    recordatorios: true,
    reactivacion: true,
    carrusel: false,
    multiSucursal: false,
  },
  solo: {
    id: "solo",
    nombre: "Solo",
    precioMensualMXN: 799,
    precioAnualMXN: 7990,
    limiteUtility: 300,
    limiteMarketing: 0,
    recordatorios: false,
    reactivacion: false,
    carrusel: false,
    multiSucursal: false,
  },
  pro: {
    id: "pro",
    nombre: "Pro",
    precioMensualMXN: 1699,
    precioAnualMXN: 16990,
    limiteUtility: 1000,
    limiteMarketing: 300,
    recordatorios: true,
    reactivacion: true,
    carrusel: false,
    multiSucursal: false,
  },
  clinica: {
    id: "clinica",
    nombre: "Clínica",
    precioMensualMXN: 2899,
    precioAnualMXN: 28990,
    limiteUtility: 2000,
    limiteMarketing: 800,
    recordatorios: true,
    reactivacion: true,
    carrusel: true,
    multiSucursal: true,
  },
};

export function mesActual(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
