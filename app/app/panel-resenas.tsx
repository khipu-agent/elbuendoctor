"use client";

// Panel de reseñas: alertas, aprobación de respuestas IA, envío manual.
// Modo degradado de Google: la respuesta se copia con un botón y se pega en la
// consola de Google del negocio (deep-link). Aviso honesto en pantalla (§15.9).

import { useState, useTransition } from "react";
import Estrellas from "@/components/Estrellas";
import {
  aprobarYPublicar,
  enviarSolicitudManual,
  ignorarResena,
  simularResenaDePrueba,
  sincronizarResenas,
} from "./acciones";

interface ResenaItem {
  id: string;
  rating: number;
  texto: string;
  autor_nombre: string;
  fecha_review: string;
  estado: string;
  respuesta_ia: string | null;
  respuesta_publicada: string | null;
}

interface OpinionItem {
  id: string;
  satisfaccion: string;
  comentario_privado: string | null;
  created_at: string;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  nueva: { texto: "Nueva", clase: "bg-tinta/10 text-tinta" },
  pendiente_aprobacion: { texto: "Por aprobar", clase: "bg-dorado/25 text-tinta" },
  aprobada: { texto: "Aprobada", clase: "bg-esmeralda/10 text-esmeralda" },
  publicada: { texto: "Respondida", clase: "bg-esmeralda/15 text-esmeralda" },
  ignorada: { texto: "Sin respuesta", clase: "bg-tinta/5 text-tinta/50" },
};

export default function PanelResenas({
  resenas,
  slug,
  opinionesRecientes,
}: {
  resenas: ResenaItem[];
  slug: string;
  opinionesRecientes: OpinionItem[];
}) {
  const [ocupado, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string>();
  const [errorSolicitud, setErrorSolicitud] = useState<string>();
  const [solicitudOk, setSolicitudOk] = useState(false);
  const [editando, setEditando] = useState<Record<string, string>>({});

  const pendientes = resenas.filter((r) => r.estado === "pendiente_aprobacion");

  return (
    <div className="space-y-10">
      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              const r = await sincronizarResenas();
              setAviso(
                r.nuevas > 0
                  ? `Llegaron ${r.nuevas} reseña(s) nueva(s). Ya tienes la respuesta sugerida.`
                  : "Todo al día: no hay reseñas nuevas. Recuerda que pueden tardar hasta 24h en sincronizarse.",
              );
            })
          }
          className="rounded-full bg-esmeralda px-5 py-2.5 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60"
        >
          {ocupado ? "Revisando…" : "Revisar reseñas nuevas"}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              await simularResenaDePrueba();
              setAviso("Llegó una reseña de prueba: mira la alerta en Mensajes y aprueba la respuesta aquí abajo.");
            })
          }
          className="rounded-full border border-esmeralda px-5 py-2.5 font-medium text-esmeralda disabled:opacity-60"
        >
          Probar con una reseña de ejemplo
        </button>
        <a
          href={`/api/qr/${slug}`}
          target="_blank"
          rel="noopener"
          className="rounded-full border border-tinta/20 px-5 py-2.5 font-medium text-tinta/70"
        >
          Descargar mi QR (PDF)
        </a>
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noopener"
          className="rounded-full border border-tinta/20 px-5 py-2.5 font-medium text-tinta/70"
        >
          Ver mi página pública
        </a>
      </div>
      {aviso && (
        <p className="rounded-xl bg-esmeralda/10 px-4 py-3 text-sm text-esmeralda">{aviso}</p>
      )}

      {/* Bandeja de aprobación */}
      <section>
        <h2 className="font-display text-2xl font-semibold">Respuestas por aprobar</h2>
        {pendientes.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-white p-6 text-tinta/60 shadow-sm">
            No hay respuestas esperando tu visto bueno. Cuando llegue una reseña nueva, te avisamos
            por WhatsApp y la respuesta sugerida aparece aquí.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendientes.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Estrellas rating={r.rating} />
                    <span className="font-medium">{r.autor_nombre}</span>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${ETIQUETA_ESTADO[r.estado]?.clase}`}
                  >
                    {ETIQUETA_ESTADO[r.estado]?.texto}
                  </span>
                </div>
                <p className="mt-3 text-tinta/80">&quot;{r.texto}&quot;</p>

                <div className="mt-4 rounded-xl bg-crema p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-tinta/50">
                    Respuesta sugerida (puedes editarla)
                  </p>
                  <textarea
                    rows={3}
                    value={editando[r.id] ?? r.respuesta_ia ?? ""}
                    onChange={(e) => setEditando((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-tinta/10 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() =>
                        iniciar(async () => {
                          await aprobarYPublicar(r.id, editando[r.id] ?? r.respuesta_ia ?? "");
                          setAviso("Respuesta publicada. En esta etapa, también puedes copiarla y pegarla en tu consola de Google.");
                        })
                      }
                      className="rounded-full bg-esmeralda px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Aprobar y publicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(editando[r.id] ?? r.respuesta_ia ?? "");
                        window.open("https://business.google.com/", "_blank", "noopener");
                      }}
                      className="rounded-full border border-tinta/20 px-4 py-2 text-sm font-medium text-tinta/70"
                    >
                      Copiar y abrir Google
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => iniciar(async () => ignorarResena(r.id))}
                      className="rounded-full px-4 py-2 text-sm text-tinta/50 hover:text-tinta"
                    >
                      No responder
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Envío manual */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Pedir una reseña ahora</h2>
        <p className="mt-1 text-sm text-tinta/60">
          Le llega un WhatsApp a tu paciente preguntando cómo fue su experiencia, con el enlace a
          tu Google al final — como manda la regla, el enlace se muestra a todos por igual.
        </p>
        <form
          action={async (formData) => {
            setSolicitudOk(false);
            setErrorSolicitud(undefined);
            const r = await enviarSolicitudManual({ ok: false }, formData);
            if (r.ok) setSolicitudOk(true);
            else setErrorSolicitud(r.error);
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            name="nombre"
            placeholder="Nombre del paciente"
            required
            className="w-full rounded-xl border border-tinta/15 px-4 py-3"
          />
          <input
            name="telefono"
            placeholder="Su WhatsApp (10 dígitos)"
            inputMode="tel"
            required
            className="w-full rounded-xl border border-tinta/15 px-4 py-3"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-full bg-esmeralda px-6 py-3 font-medium text-white hover:bg-esmeralda-oscuro"
          >
            Enviar invitación
          </button>
        </form>
        {solicitudOk && (
          <p className="mt-3 rounded-xl bg-esmeralda/10 px-4 py-3 text-sm text-esmeralda">
            Invitación enviada. Mira cómo se ve en la sección Mensajes.
          </p>
        )}
        {errorSolicitud && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorSolicitud}
          </p>
        )}
      </section>

      {/* Historial */}
      <section>
        <h2 className="font-display text-2xl font-semibold">Historial de reseñas</h2>
        {resenas.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-white p-6 text-tinta/60 shadow-sm">
            Aún no tienes reseñas sincronizadas — imprime tu QR y colócalo en recepción hoy.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {resenas
              .filter((r) => r.estado !== "pendiente_aprobacion")
              .map((r) => (
                <li key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Estrellas rating={r.rating} />
                      <span className="font-medium">{r.autor_nombre}</span>
                      <span className="text-xs text-tinta/50">
                        {new Date(r.fecha_review).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ETIQUETA_ESTADO[r.estado]?.clase}`}
                    >
                      {ETIQUETA_ESTADO[r.estado]?.texto}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-tinta/80">&quot;{r.texto}&quot;</p>
                  {r.respuesta_publicada && (
                    <p className="mt-2 rounded-lg bg-crema px-3 py-2 text-sm text-tinta/70">
                      <strong>Tu respuesta:</strong> {r.respuesta_publicada}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Comentarios privados del flujo /opina */}
      {opinionesRecientes.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-semibold">Lo que te dicen en privado</h2>
          <p className="mt-1 text-sm text-tinta/60">
            Comentarios que tus pacientes te mandan desde el QR antes de ir a Google.
          </p>
          <ul className="mt-4 space-y-3">
            {opinionesRecientes.map((o) => (
              <li key={o.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <span className="text-lg">
                  {o.satisfaccion === "excelente" ? "😊" : o.satisfaccion === "regular" ? "😐" : "😞"}
                </span>
                <span className="ml-2 text-sm text-tinta/50">
                  {new Date(o.created_at).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                {o.comentario_privado && (
                  <p className="mt-2 text-sm text-tinta/80">&quot;{o.comentario_privado}&quot;</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
