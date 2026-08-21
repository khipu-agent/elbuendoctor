import type { MetadataRoute } from "next";

const urlBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://elbuendoctor.vercel.app";

// Se indexan la landing y las micro-páginas públicas; el panel, la API y el
// onboarding quedan fuera del rastreo.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api", "/onboarding"],
    },
    sitemap: `${urlBase}/sitemap.xml`,
  };
}
