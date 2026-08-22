import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const urlBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://elbuendoctor.com.mx";

export const metadata: Metadata = {
  metadataBase: new URL(urlBase),
  title: {
    default: "ElBuenDoctor — Reseñas de Google y WhatsApp para consultorios y clínicas en México",
    template: "%s | ElBuenDoctor",
  },
  description:
    "Reseñas en Google, citas confirmadas y pacientes que regresan — todo por WhatsApp. Mensual, sin permanencia.",
  keywords: [
    "reseñas Google clínicas",
    "WhatsApp consultorios",
    "reputación online médicos México",
    "confirmación de citas WhatsApp",
    "reactivación de pacientes",
  ],
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "ElBuenDoctor",
    title: "ElBuenDoctor — Que te elijan en Google",
    description:
      "Reseñas en Google, citas confirmadas y pacientes que regresan — todo por WhatsApp. Mensual, sin permanencia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElBuenDoctor — Que te elijan en Google",
    description:
      "Reseñas en Google, citas confirmadas y pacientes que regresan — todo por WhatsApp.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0D6E5F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
