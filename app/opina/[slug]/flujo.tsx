"use client";

// Pregunta de satisfacción → comentario privado (si regular/mala) → botón a Google
// SIEMPRE, en todos los caminos. Cero gating (§10.2). Mobile-first (§11).

import { useState, useTransition } from "react";
import { registrarOpinionAction } from "./acciones";

type Paso = "pregunta" | "comentario" | "final";

export default function FlujoOpina({
  slug,
  nombreClinica,
  colorPrimario,
  urlGoogle,
}: {
  slug: string;
  nombreClinica: string;
  colorPrimario: string;
  urlGoogle: string;
}) {
  const [paso, setPaso] = useState<Paso>("pregunta");
  const [satisfaccion, setSatisfaccion] = useState<"excelente" | "regular" | "mala">("excelente");
  const [comentario, setComentario] = useState("");
  const [ocupado, iniciar] = useTransition();

  const elegir = (s: "excelente" | "regular" | "mala") => {
    setSatisfaccion(s);
    if (s === "excelente") {
      iniciar(async () => {
        await registrarOpinionAction(slug, s, null);
        setPaso("final");
      });
    } else {
      setPaso("comentario");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      {paso === "pregunta" && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold">
            ¿Cómo fue tu experiencia en {nombreClinica}?
          </h1>
          <p className="mt-3" style={{ color: "#1A1F1DB3" }}>
            Toca una opción. Toma 20 segundos.
          </p>
          <div className="mt-8 space-y-3">
            {(
              [
                { valor: "excelente", emoji: "😊", texto: "Excelente" },
                { valor: "regular", emoji: "😐", texto: "Regular" },
                { valor: "mala", emoji: "😞", texto: "Mala" },
              ] as const
            ).map((o) => (
              <button
                key={o.valor}
                type="button"
                disabled={ocupado}
                onClick={() => elegir(o.valor)}
                className="w-full rounded-2xl bg-white px-6 py-4 text-left text-lg font-medium shadow-sm transition active:scale-[0.98]"
              >
                <span className="mr-3 text-2xl">{o.emoji}</span>
                {o.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === "comentario" && (
        <div>
          <h1 className="text-center font-display text-3xl font-semibold">
            Cuéntanos qué podemos mejorar
          </h1>
          <p className="mt-3 text-center" style={{ color: "#1A1F1DB3" }}>
            Este mensaje va directo a la clínica, en privado.
          </p>
          <textarea
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Escribe aquí…"
            className="mt-6 w-full rounded-2xl border-0 bg-white px-4 py-3 shadow-sm"
          />
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              iniciar(async () => {
                await registrarOpinionAction(slug, satisfaccion, comentario || null);
                setPaso("final");
              })
            }
            className="mt-4 w-full rounded-full py-3.5 font-medium text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            {ocupado ? "Enviando…" : "Enviar y continuar"}
          </button>
        </div>
      )}

      {paso === "final" && (
        <div className="text-center">
          <p className="text-5xl">🙏</p>
          <h1 className="mt-4 font-display text-3xl font-semibold">Gracias por tu tiempo</h1>
          <p className="mt-3" style={{ color: "#1A1F1DB3" }}>
            Tu opinión en Google ayuda a que más personas encuentren a {nombreClinica}. Es la
            ficha de Google de la clínica: tu opinión se publica tal cual, sin filtros.
          </p>
          {/* INVARIANTE: este botón se muestra en TODOS los caminos, sin excepción. */}
          <a
            href={urlGoogle}
            target="_blank"
            rel="noopener"
            className="mt-8 block w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            Dejar mi opinión en Google
          </a>
        </div>
      )}
    </div>
  );
}
