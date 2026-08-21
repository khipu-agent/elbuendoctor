import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { obtenerGoogleAccount, obtenerTenantPorSlug } from "@/lib/db";
import FlujoOpina from "./flujo";

// Página de paciente vía QR: título personalizado; noindex (son páginas de
// acción, no de contenido — evita páginas "delgadas" duplicadas en Google).
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const tenant = await obtenerTenantPorSlug(params.slug);
  if (!tenant) return { title: "¿Cómo fue tu experiencia?" };
  return {
    title: `¿Cómo fue tu experiencia en ${tenant.nombre}?`,
    robots: { index: false, follow: false },
  };
}

// Flujo público de opinión (SPEC §6.1, disparador QR). INVARIANTE §10.2:
// TODOS los caminos terminan mostrando el botón "Dejar mi opinión en Google" —
// prohibido ocultarlo a los insatisfechos (cero review gating) y prohibido
// ofrecer incentivos por reseñar.
export default async function OpinaPage({ params }: { params: { slug: string } }) {
  const tenant = await obtenerTenantPorSlug(params.slug);
  if (!tenant) notFound();
  const google = await obtenerGoogleAccount(tenant.id);

  const urlGoogle = google?.place_id
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(google.place_id)}`
    : `https://www.google.com/search?q=${encodeURIComponent(tenant.nombre + " opiniones")}`;

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: tenant.colores.fondo, color: "#1A1F1D" }}
    >
      <FlujoOpina
        slug={tenant.slug}
        nombreClinica={tenant.nombre}
        colorPrimario={tenant.colores.primario}
        urlGoogle={urlGoogle}
      />
      <footer className="mt-auto px-4 py-6 text-center text-xs" style={{ color: "#1A1F1D99" }}>
        <a href="/aviso-de-privacidad" className="underline">
          Aviso de privacidad
        </a>
        {" · "}
        Tu opinión se publica directamente en Google; nosotros no la editamos.
      </footer>
    </main>
  );
}
