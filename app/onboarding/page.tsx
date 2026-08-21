import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import Wizard from "./wizard";

export const metadata = { title: "Configura tu clínica — ElBuenDoctor" };

export default async function OnboardingPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return <Wizard tenant={sesion.tenant} yaCompleto={sesion.tenant.onboarding_completado} />;
}
