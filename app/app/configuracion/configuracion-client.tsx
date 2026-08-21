"use client";

// Tono de respuestas + toggle de auto-publicación (§6.1): SOLO para reseñas de
// 4-5 estrellas, y solo si el tenant lo activa expresamente; el consentimiento
// queda registrado con fecha/hora (§10.2).

import { useState, useTransition } from "react";
import { cambiarTono, toggleAutopublicar } from "../acciones";

export default function ConfiguracionClient({
  tono,
  autopublicar,
  consentAt,
}: {
  tono: "formal" | "cercano";
  autopublicar: boolean;
  consentAt: string | null;
}) {
  const [ocupado, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string>();

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-semibold">Respuestas a tus reseñas</h2>

      <div className="mt-4">
        <p className="text-sm font-medium">¿Cómo le hablas a tus pacientes?</p>
        <div className="mt-2 flex gap-2">
          {(["cercano", "formal"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={ocupado}
              onClick={() =>
                iniciar(async () => {
                  await cambiarTono(t);
                  setAviso("Listo, tus respuestas usarán ese tono.");
                })
              }
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                tono === t ? "bg-esmeralda text-white" : "border border-tinta/20 text-tinta/70"
              }`}
            >
              {t === "cercano" ? "Cercano (tú)" : "Formal (usted)"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-crema p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={autopublicar}
            disabled={ocupado}
            onChange={(e) => {
              const activar = e.target.checked;
              // Único uso de confirm(): activar auto-publicación es una decisión
              // con consecuencias públicas iniciada por el usuario (§15.8).
              if (
                activar &&
                !window.confirm(
                  "¿Activar la respuesta automática SOLO para reseñas de 4 y 5 estrellas? Las reseñas de 3 o menos siempre esperarán tu aprobación. Quedará registrado que tú lo activaste.",
                )
              ) {
                e.target.checked = false;
                return;
              }
              iniciar(async () => {
                await toggleAutopublicar(activar);
                setAviso(
                  activar
                    ? "Auto-respuesta activada para reseñas de 4 y 5 estrellas."
                    : "Auto-respuesta desactivada: aprobarás cada respuesta.",
                );
              });
            }}
            className="mt-1 h-4 w-4 accent-esmeralda"
          />
          <span className="text-sm">
            <strong>Responder automáticamente las reseñas de 4 y 5 estrellas.</strong>
            <br />
            <span className="text-tinta/60">
              Las de 3 estrellas o menos siempre esperarán tu visto bueno. Tú conservas la última
              palabra.
            </span>
            {autopublicar && consentAt && (
              <span className="mt-1 block text-xs text-tinta/50">
                Activado por ti el{" "}
                {new Date(consentAt).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </span>
            )}
          </span>
        </label>
      </div>

      {aviso && (
        <p className="mt-4 rounded-xl bg-esmeralda/10 px-4 py-3 text-sm text-esmeralda">{aviso}</p>
      )}
    </section>
  );
}
