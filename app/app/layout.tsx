import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { accionLogout } from "@/app/(cuenta)/acciones";
import Logo from "@/components/Logo";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-tinta/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" aria-label="Mi panel">
            <Logo tamaño={28} />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/app" className="text-tinta/80 hover:text-esmeralda">
              Reseñas
            </Link>
            <Link href="/app/mensajes" className="text-tinta/80 hover:text-esmeralda">
              Mensajes
            </Link>
            <Link href="/app/configuracion" className="text-tinta/80 hover:text-esmeralda">
              Configuración
            </Link>
            <form action={accionLogout}>
              <button type="submit" className="text-tinta/50 hover:text-tinta">
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      {!sesion.tenant.onboarding_completado && (
        <div className="bg-dorado/20 px-4 py-3 text-center text-sm">
          Aún falta terminar tu configuración.{" "}
          <Link href="/onboarding" className="font-medium text-esmeralda underline">
            Continuar donde lo dejaste
          </Link>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
