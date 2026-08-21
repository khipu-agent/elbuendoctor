import { ImageResponse } from "next/og";

export const alt = "ElBuenDoctor — Que te elijan en Google";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen de vista previa al compartir el link (WhatsApp, X, Facebook).
// Colores de marca §2: esmeralda #0D6E5F, dorado #F2B01E, crema #FAF7F0.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#0D6E5F",
          color: "#FAF7F0",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#F2B01E",
            }}
          />
          <span style={{ letterSpacing: 2 }}>ElBuenDoctor</span>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.15, marginTop: 30 }}>
          Que te elijan en Google.
        </div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 24, fontFamily: "sans-serif" }}>
          Reseñas, citas confirmadas y pacientes que regresan — todo por WhatsApp.
        </div>
      </div>
    ),
    size,
  );
}
