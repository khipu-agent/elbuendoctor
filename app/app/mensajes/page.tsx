import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { obtenerMensajes } from "@/lib/db";
import { estadoConexion } from "@/lib/whatsapp";

export const metadata = { title: "Mensajes — ElBuenDoctor" };

// Bandeja de mensajes: en modo demo aquí se ve EXACTAMENTE lo que llegaría al
// WhatsApp de tus pacientes y tus alertas (§6.7 paso 4). Aviso honesto (§15.9).
export default async function Mensajes() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const [mensajes, conexion] = await Promise.all([
    obtenerMensajes(sesion.tenant.id),
    estadoConexion(sesion.tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mensajes</h1>
        <p className="mt-1 text-tinta/60">
          {conexion.estado === "activo"
            ? `Tu número ${conexion.numero} está conectado.`
            : "Tu número está en aprobación; mientras tanto, aquí ves los mensajes tal como llegarían a WhatsApp."}
        </p>
      </div>

      {conexion.estado !== "activo" && (
        <p className="rounded-xl bg-crema px-4 py-3 text-sm text-tinta/70">
          La aprobación de tu número de WhatsApp depende de Meta. Mientras se aprueba, todo funciona
          en modo de demostración: los mensajes se muestran aquí, no salen a números reales.
        </p>
      )}

      {mensajes.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-tinta/60 shadow-sm">
          Aún no hay mensajes. Envía tu primera invitación a opinar desde la sección Reseñas.
        </p>
      ) : (
        <ul className="space-y-3">
          {mensajes.slice(0, 50).map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl p-5 shadow-sm ${
                m.direccion === "out" ? "bg-white" : "bg-crema"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    m.direccion === "out"
                      ? "bg-esmeralda/10 text-esmeralda"
                      : "bg-tinta/10 text-tinta/70"
                  }`}
                >
                  {m.direccion === "out" ? "Enviado por ti" : "Recibido"}
                </span>
                <span className="rounded-full bg-tinta/5 px-2.5 py-1 text-tinta/60">
                  {m.categoria === "utility"
                    ? "Aviso"
                    : m.categoria === "marketing"
                      ? "Reactivación"
                      : "Servicio"}
                </span>
                <span className="text-tinta/50">
                  {new Date(m.created_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {m.estado === "fallido" && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                    No enviado
                  </span>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-tinta/85">{m.cuerpo}</p>
              {m.estado === "fallido" && (
                <p className="mt-2 text-xs text-red-600">
                  No pudimos enviar este mensaje.{" "}
                  {m.error_code === "excluido"
                    ? "Este número pidió no recibir mensajes."
                    : m.error_code === "limite_plan"
                      ? "Llegaste al límite de tu plan este mes."
                      : "Lo reintentaremos en unos minutos."}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
