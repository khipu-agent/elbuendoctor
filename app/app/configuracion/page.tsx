import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { obtenerCompetidores, obtenerGoogleAccount, obtenerUso } from "@/lib/db";
import { estadoConexion } from "@/lib/whatsapp";
import { PLANES } from "@/lib/plans";
import ConfiguracionClient from "./configuracion-client";

export const metadata = { title: "Configuración — ElBuenDoctor" };

export default async function Configuracion() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  const { tenant } = sesion;

  const [google, conexion, competidores, uso] = await Promise.all([
    obtenerGoogleAccount(tenant.id),
    estadoConexion(tenant.id),
    obtenerCompetidores(tenant.id),
    obtenerUso(tenant.id),
  ]);
  const plan = PLANES[tenant.plan];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Configuración</h1>

      {/* Tu plan */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Tu plan</h2>
        <p className="mt-2 text-tinta/75">
          Estás en <strong>{plan.nombre}</strong>
          {tenant.plan === "trial" && tenant.trial_ends_at && (
            <>
              {" "}— gratis hasta el{" "}
              {new Date(tenant.trial_ends_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
              })}
              . Después necesitarás elegir un plan para continuar.
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-tinta/60">
          Mensajes de avisos este mes: {uso.utility_usados} de {plan.limiteUtility} · Reactivación:{" "}
          {uso.marketing_usados} de {plan.limiteMarketing}
        </p>
        <p className="mt-2 text-sm text-tinta/50">
          La activación del cobro llega con Stripe en la Fase 4; por ahora tu prueba corre completa.
        </p>
      </section>

      {/* Conexiones */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Tus conexiones</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span>Google ({google?.negocio_nombre || "sin conectar"})</span>
            <span className="rounded-full bg-dorado/20 px-3 py-1 text-xs font-medium">
              {google?.modo === "api" ? "Conexión completa" : "Lectura pública"}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>WhatsApp ({conexion.numero ?? "sin conectar"})</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                conexion.estado === "activo"
                  ? "bg-esmeralda/15 text-esmeralda"
                  : "bg-dorado/20 text-tinta"
              }`}
            >
              {conexion.estado === "activo"
                ? "Conectado"
                : conexion.estado === "pendiente"
                  ? "En aprobación por Meta"
                  : conexion.estado === "pausado"
                    ? "En pausa"
                    : "Sin conectar"}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-tinta/50">
          Las reseñas pueden tardar hasta 24h en sincronizarse y los reportes muestran datos
          públicos de Google.
        </p>
      </section>

      {/* Competencia */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Tu competencia en Google</h2>
        {competidores.length === 0 ? (
          <p className="mt-2 text-sm text-tinta/60">
            Aún no eliges competidores. Puedes hacerlo repitiendo el paso 3 de la configuración
            inicial.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {competidores.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{c.nombre}</span>
                <span className="text-dorado">
                  ⭐ {c.rating} · {c.total_reviews} reseñas
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tu página pública y QR */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Tu página y tu QR</h2>
        <p className="mt-2 text-sm text-tinta/70">
          Tu página pública:{" "}
          <a
            href={`/p/${tenant.slug}`}
            target="_blank"
            rel="noopener"
            className="font-medium text-esmeralda underline"
          >
            {tenant.slug}.elbuendoctor.com.mx
          </a>
        </p>
        <p className="mt-1 text-sm text-tinta/70">
          Flujo de opinión con QR:{" "}
          <a
            href={`/opina/${tenant.slug}`}
            target="_blank"
            rel="noopener"
            className="font-medium text-esmeralda underline"
          >
            elbuendoctor.com.mx/opina/{tenant.slug}
          </a>
        </p>
        <a
          href={`/api/qr/${tenant.slug}`}
          target="_blank"
          rel="noopener"
          className="mt-4 inline-block rounded-full bg-esmeralda px-5 py-2.5 font-medium text-white hover:bg-esmeralda-oscuro"
        >
          Descargar QR para recepción (PDF)
        </a>
      </section>

      {/* Respuestas con IA: tono + auto-publicación */}
      <ConfiguracionClient
        tono={tenant.tono_respuestas}
        autopublicar={tenant.autopublicar_resenas}
        consentAt={tenant.autopublicar_consent_at}
      />
    </div>
  );
}
