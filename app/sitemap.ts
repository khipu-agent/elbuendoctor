import type { MetadataRoute } from "next";
import { listarTenants } from "@/lib/db";

export const dynamic = "force-dynamic";

const urlBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://elbuendoctor.vercel.app";

// Sitemap dinámico: páginas comerciales + micro-página pública de cada clínica.
// /opina se excluye a propósito (noindex — página de acción, no de contenido).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: urlBase, changeFrequency: "weekly", priority: 1 },
    { url: `${urlBase}/registro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${urlBase}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${urlBase}/aviso-de-privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const tenants = await listarTenants();
  const micropaginas: MetadataRoute.Sitemap = tenants.map((t) => ({
    url: `${urlBase}/p/${t.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...estaticas, ...micropaginas];
}
