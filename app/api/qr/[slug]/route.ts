// QR imprimible en PDF con marco de la marca del tenant (SPEC §6.7 paso 5).
// El código apunta a /opina/{slug} — el mismo flujo compliant de satisfacción.

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { obtenerTenantPorSlug } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const tenant = await obtenerTenantPorSlug(params.slug);
  if (!tenant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const urlOpina = `${base}/opina/${tenant.slug}`;

  const qrPng = await QRCode.toBuffer(urlOpina, { width: 600, margin: 1 });

  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([595, 842]); // Carta vertical
  const fuente = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fuenteNormal = await pdf.embedFont(StandardFonts.Helvetica);
  const imagen = await pdf.embedPng(qrPng);

  const primario = hexARgb(tenant.colores.primario);
  const tinta = hexARgb("#1A1F1D");

  // Marco de la marca
  pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.97, 0.94) });
  pagina.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: primario });
  pagina.drawText(tenant.nombre, {
    x: 50,
    y: 795,
    size: 22,
    font: fuente,
    color: rgb(1, 1, 1),
  });

  pagina.drawText("¿Cómo fue tu visita hoy?", {
    x: 50,
    y: 700,
    size: 26,
    font: fuente,
    color: tinta,
  });
  pagina.drawText("Escanea con tu celular y cuéntanos en 20 segundos.", {
    x: 50,
    y: 672,
    size: 13,
    font: fuenteNormal,
    color: tinta,
  });

  pagina.drawImage(imagen, { x: 147.5, y: 300, width: 300, height: 300 });

  pagina.drawText("Tu opinión se publica en Google, tal cual, sin filtros.", {
    x: 50,
    y: 260,
    size: 11,
    font: fuenteNormal,
    color: tinta,
  });
  pagina.drawText(`${tenant.slug}.elbuendoctor.com.mx`, {
    x: 50,
    y: 240,
    size: 11,
    font: fuenteNormal,
    color: primario,
  });
  pagina.drawText("Creado con ElBuenDoctor", {
    x: 50,
    y: 30,
    size: 9,
    font: fuenteNormal,
    color: rgb(0.6, 0.6, 0.6),
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="qr-${tenant.slug}.pdf"`,
    },
  });
}

function hexARgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}
