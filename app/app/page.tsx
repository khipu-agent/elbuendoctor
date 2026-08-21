import { obtenerSesion } from "@/lib/auth";
import { obtenerOpiniones, obtenerResenas, obtenerUso } from "@/lib/db";
import { redirect } from "next/navigation";
import { PLANES } from "@/lib/plans";
import PanelResenas from "./panel-resenas";

export const metadata = { title: "Mis reseñas — ElBuenDoctor" };

export default async function Dashboard() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  const { tenant, user } = sesion;

  const [resenas, opiniones, uso] = await Promise.all([
    obtenerResenas(tenant.id),
    obtenerOpiniones(tenant.id),
    obtenerUso(tenant.id),
  ]);
  const plan = PLANES[tenant.plan];

  const pendientes = resenas.filter((r) => r.estado === "pendiente_aprobacion").length;
  const total = resenas.length;
  const promedio =
    total > 0 ? Math.round((resenas.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Hola, {user.nombre.split(" ")[0]}</h1>
        <p className="mt-1 text-tinta/60">Así va la reputación de {tenant.nombre}.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tinta/60">Calificación</p>
          <p className="mt-1 font-display text-3xl font-semibold text-esmeralda">
            {promedio || "—"} <span className="text-dorado">⭐</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tinta/60">Reseñas totales</p>
          <p className="mt-1 font-display text-3xl font-semibold">{total}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tinta/60">Por aprobar</p>
          <p className="mt-1 font-display text-3xl font-semibold text-dorado">{pendientes}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tinta/60">Mensajes del mes</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            {uso.utility_usados}
            <span className="text-base font-normal text-tinta/50"> / {plan.limiteUtility}</span>
          </p>
        </div>
      </div>

      <PanelResenas
        resenas={resenas.map((r) => ({
          id: r.id,
          rating: r.rating,
          texto: r.texto,
          autor_nombre: r.autor_nombre,
          fecha_review: r.fecha_review,
          estado: r.estado,
          respuesta_ia: r.respuesta_ia,
          respuesta_publicada: r.respuesta_publicada,
        }))}
        slug={tenant.slug}
        opinionesRecientes={opiniones.slice(0, 5).map((o) => ({
          id: o.id,
          satisfaccion: o.satisfaccion,
          comentario_privado: o.comentario_privado,
          created_at: o.created_at,
        }))}
      />
    </div>
  );
}
