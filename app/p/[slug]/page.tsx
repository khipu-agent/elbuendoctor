import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Estrellas from "@/components/Estrellas";
import { nombreConInicial } from "@/lib/ai/compliance";
import { etiquetaVertical } from "@/lib/ai";
import {
  obtenerGoogleAccount,
  obtenerResenas,
  obtenerTenantPorSlug,
  obtenerWaAccount,
} from "@/lib/db";

export const revalidate = 3600; // SSR con caché: micro-página v1 (SPEC §6.4)

// SEO por clínica: el título y la descripción salen de los datos del onboarding.
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const tenant = await obtenerTenantPorSlug(params.slug);
  if (!tenant) return { title: "Clínica no encontrada" };
  const titular = tenant.pagina_titular?.trim();
  const titulo = titular && titular !== tenant.nombre ? `${titular} — ${tenant.nombre}` : tenant.nombre;
  const descripcion =
    tenant.pagina_descripcion ||
    `${tenant.nombre} — agenda por WhatsApp y lee las reseñas de sus pacientes.`;
  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      type: "website",
      locale: "es_MX",
    },
  };
}

// Micro-página pública del tenant. En producción se sirve desde
// {slug}.elbuendoctor.com.mx vía middleware; /p/{slug} es la ruta equivalente
// para desarrollo y preview (ver DECISIONES.md #6).
export default async function MicroPagina({ params }: { params: { slug: string } }) {
  const tenant = await obtenerTenantPorSlug(params.slug);
  if (!tenant) notFound();

  const [google, wa, resenas] = await Promise.all([
    obtenerGoogleAccount(tenant.id),
    obtenerWaAccount(tenant.id),
    obtenerResenas(tenant.id),
  ]);

  // Reseñas de Google "en vivo" (caché 24h; aquí: últimas 5 de la base).
  const recientes = resenas.slice(0, 5);
  const promedio =
    resenas.length > 0
      ? Math.round((resenas.reduce((s, r) => s + r.rating, 0) / resenas.length) * 10) / 10
      : 0;

  const numero = wa?.numero_display?.replace(/\D/g, "") || "520000000000";
  const urlAgendar = `https://wa.me/${numero}?text=${encodeURIComponent(
    "Hola, quiero agendar una cita 🙂 — vengo de su página",
  )}`;
  const color = tenant.colores.primario;

  return (
    <main style={{ backgroundColor: tenant.colores.fondo, color: "#1A1F1D" }} className="min-h-screen">
      <div className="mx-auto max-w-xl px-4 pb-28 pt-10">
        {/* Encabezado */}
        <div className="text-center">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {(tenant.doctor_nombre || tenant.nombre).slice(0, 1)}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">
            {tenant.pagina_titular || tenant.doctor_nombre || tenant.nombre}
          </h1>
          <p className="mt-1" style={{ color: "#1A1F1DB3" }}>
            Atención {etiquetaVertical(tenant.vertical)} · {tenant.nombre}
          </p>
          {tenant.pagina_descripcion && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#1A1F1DB3" }}>
              {tenant.pagina_descripcion}
            </p>
          )}
          {/* Cédula profesional visible: obligatoria (SPEC §6.4 / §10.3) */}
          <p className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-medium shadow-sm">
            Céd. Prof. {tenant.cedula_profesional}
          </p>
        </div>

        {/* Calificación Google */}
        <div className="mt-6 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="font-display text-4xl font-semibold" style={{ color }}>
            {promedio || "—"}
          </p>
          <div className="mt-1 flex justify-center">
            <Estrellas rating={promedio} tamaño={20} />
          </div>
          <p className="mt-1 text-xs" style={{ color: "#1A1F1D99" }}>
            {resenas.length} reseñas en Google · pueden tardar hasta 24h en sincronizarse
          </p>
        </div>

        {/* Servicios */}
        {tenant.servicios.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold">Servicios</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {tenant.servicios.map((s) => (
                <li key={s} className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Mapa */}
        {tenant.direccion && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold">Dónde estamos</h2>
            <p className="mt-1 text-sm" style={{ color: "#1A1F1DB3" }}>
              {tenant.direccion}
            </p>
            <iframe
              title="Mapa de la clínica"
              src={`https://www.google.com/maps?q=${encodeURIComponent(tenant.direccion)}&output=embed`}
              className="mt-3 h-52 w-full rounded-2xl border-0 shadow-sm"
              loading="lazy"
            />
          </section>
        )}

        {/* Reseñas recientes */}
        {recientes.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold">Lo que dicen los pacientes</h2>
            <ul className="mt-3 space-y-3">
              {recientes.map((r) => (
                <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Estrellas rating={r.rating} tamaño={14} />
                    <span className="text-xs" style={{ color: "#1A1F1D99" }}>
                      {nombreConInicial(r.autor_nombre)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">&quot;{r.texto}&quot;</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-center text-xs" style={{ color: "#1A1F1D80" }}>
          <Link href="/aviso-de-privacidad" className="underline">
            Aviso de privacidad
          </Link>
          {" · "}
          Creado con{" "}
          <Link href="/" className="underline">
            ElBuenDoctor
          </Link>
        </p>
      </div>

      {/* Botón principal fijo: agendar por WhatsApp */}
      <div className="fixed inset-x-0 bottom-0 z-10 p-4" style={{ backgroundColor: "transparent" }}>
        <a
          href={urlAgendar}
          target="_blank"
          rel="noopener"
          className="mx-auto block max-w-xl rounded-full py-4 text-center text-lg font-semibold text-white shadow-lg"
          style={{ backgroundColor: color }}
        >
          Agendar por WhatsApp
        </a>
      </div>
    </main>
  );
}
