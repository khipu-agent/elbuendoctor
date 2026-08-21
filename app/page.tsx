import Link from "next/link";
import Logo from "@/components/Logo";
import Estrellas from "@/components/Estrellas";
import { PLANES } from "@/lib/plans";

// Landing Fase 1 (base). La versión completa de §7 con variantes por vertical
// (/dentistas, /estetica, /control-de-peso) llega en la Fase 4.
export default function Landing() {
  return (
    <main>
      {/* Encabezado */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-esmeralda hover:underline">
            Entrar
          </Link>
          <Link
            href="/registro"
            className="rounded-full bg-esmeralda px-4 py-2 font-medium text-white hover:bg-esmeralda-oscuro"
          >
            Prueba 14 días gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-tinta md:text-5xl">
            Que te elijan en Google. Que lleguen a su cita. Que regresen.
          </h1>
          <p className="mt-5 text-lg text-tinta/75">
            ElBuenDoctor convierte a tus pacientes contentos en tu mejor publicidad — todo por
            WhatsApp, sin que muevas un dedo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/registro"
              className="rounded-full bg-esmeralda px-6 py-3 font-medium text-white hover:bg-esmeralda-oscuro"
            >
              Prueba 14 días gratis
            </Link>
            <a
              href="#precios"
              className="rounded-full border border-esmeralda px-6 py-3 font-medium text-esmeralda"
            >
              Ver precios
            </a>
          </div>
          <p className="mt-3 text-sm text-tinta/60">Mensual, sin permanencia. Cancelas en un clic.</p>
        </div>

        {/* Mockup de celular con alerta de reseña 5⭐ */}
        <div className="mx-auto w-72 rounded-[2rem] border-8 border-tinta bg-white p-4 shadow-xl">
          <p className="mb-2 text-xs text-tinta/50">WhatsApp · ahora</p>
          <div className="rounded-2xl rounded-tl-sm bg-[#DCF8C6] p-3 text-sm shadow-sm">
            <p className="font-medium text-esmeralda">ElBuenDoctor</p>
            <p className="mt-1">
              ⭐ Nueva reseña en Google (5⭐) de María G.: &quot;Excelente atención, muy puntuales&quot;.
            </p>
            <p className="mt-2 text-tinta/70">Respuesta sugerida lista. Responde OK para publicarla.</p>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-crema p-3">
            <Estrellas rating={5} />
          </div>
        </div>
      </section>

      {/* Barra de datos */}
      <section className="bg-esmeralda py-8 text-white">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 text-center md:grid-cols-3">
          <p>
            <span className="font-display text-3xl font-semibold text-dorado">84%</span>
            <br />
            de los pacientes lee reseñas antes de elegir doctor
          </p>
          <p>
            <span className="font-display text-3xl font-semibold text-dorado">~38%</span>
            <br />
            menos inasistencias con confirmación por WhatsApp
          </p>
          <p>
            <span className="font-display text-3xl font-semibold text-dorado">2 años</span>
            <br />
            del sistema los paga un solo paciente recuperado
          </p>
        </div>
      </section>

      {/* Los 3 módulos */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-semibold">
          Tres dolores, tres soluciones
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              titulo: "Que te elijan en Google",
              texto:
                "Tus pacientes contentos reciben la invitación a opinar en el momento justo y sus reseñas quedan en tu ficha de Google — tuyas para siempre.",
            },
            {
              titulo: "Que no te fallen las citas",
              texto:
                "Recordatorios por WhatsApp con botón de confirmar. Tu recepcionista ve en una sola pantalla quién confirmó y quién necesita reagendar.",
            },
            {
              titulo: "Que tus pacientes regresen",
              texto:
                "Subes tu lista de pacientes en Excel y ElBuenDoctor los invita a volver, con su permiso, mensaje a mensaje.",
            },
          ].map((m) => (
            <div key={m.titulo} className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="font-display text-xl font-semibold text-esmeralda">{m.titulo}</h3>
              <p className="mt-3 text-tinta/75">{m.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-tinta/60">
          Somos complemento de los portales médicos, no competidor: ellos te rentan visibilidad con
          contrato anual; nosotros construimos tu reputación en Google, que es tuya para siempre.
        </p>
      </section>

      {/* Precios */}
      <section id="precios" className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-semibold">Precios claros, en pesos</h2>
          <p className="mt-2 text-center text-tinta/60">
            IVA incluido. Sin permanencia. Anual = 2 meses gratis.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {([PLANES.solo, PLANES.pro, PLANES.clinica] as const).map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 ${
                  plan.id === "pro" ? "border-dorado shadow-lg" : "border-tinta/10"
                }`}
              >
                {plan.id === "pro" && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-dorado px-3 py-1 text-xs font-semibold text-tinta">
                    Más popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.nombre}</h3>
                <p className="mt-2">
                  <span className="font-display text-4xl font-semibold text-esmeralda">
                    ${plan.precioMensualMXN.toLocaleString("es-MX")}
                  </span>
                  <span className="text-tinta/60"> /mes</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-tinta/75">
                  <li>✔ Reseñas de Google por WhatsApp y QR</li>
                  <li>✔ Respuestas con IA que tú apruebas</li>
                  <li>✔ Tu micro-página con agendamiento</li>
                  {plan.recordatorios && <li>✔ Confirmación de citas</li>}
                  {plan.reactivacion && <li>✔ Reactivación de pacientes</li>}
                  {plan.carrusel && <li>✔ Creativos semanales con tus reseñas</li>}
                  <li>
                    ✔ {plan.limiteUtility.toLocaleString("es-MX")} mensajes de avisos
                    {plan.limiteMarketing > 0 &&
                      ` · ${plan.limiteMarketing.toLocaleString("es-MX")} de reactivación`}
                  </li>
                </ul>
                <Link
                  href="/registro"
                  className={`mt-6 block rounded-full py-2.5 text-center font-medium ${
                    plan.id === "pro"
                      ? "bg-esmeralda text-white hover:bg-esmeralda-oscuro"
                      : "border border-esmeralda text-esmeralda"
                  }`}
                >
                  Empezar prueba gratis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ breve */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-semibold">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-4">
          {[
            {
              p: "¿Necesito saber de tecnología?",
              r: "No. Si sabes usar WhatsApp, sabes usar ElBuenDoctor. La configuración inicial toma 15 minutos y te guiamos paso a paso.",
            },
            {
              p: "¿Esto cumple las reglas de WhatsApp y Google?",
              r: "Sí. Cada paciente da su permiso antes de recibir mensajes, puede pedir la baja en cualquier momento, y el enlace para opinar en Google se muestra a todos por igual, sin filtrar opiniones.",
            },
            {
              p: "¿Puedo cancelar cuando quiera?",
              r: "Sí, en un clic desde tu panel. Sin contratos ni permanencia.",
            },
            {
              p: "¿Funciona si ya uso un portal médico u otro software?",
              r: "Sí, somos complemento: ellos te dan visibilidad dentro de su plataforma; nosotros construimos tu reputación en Google y hacemos que tus propios pacientes regresen.",
            },
            {
              p: "¿Y COFEPRIS?",
              r: "Todo texto que generamos pasa por filtros de cumplimiento: sin nombres de medicamentos, sin promesas de resultados y sin superlativos.",
            },
          ].map((f) => (
            <details key={f.p} className="rounded-xl bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-medium">{f.p}</summary>
              <p className="mt-3 text-tinta/75">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-esmeralda py-14 text-center text-white">
        <h2 className="font-display text-3xl font-semibold">
          Tus pacientes contentos ya existen. Que Google lo sepa.
        </h2>
        <Link
          href="/registro"
          className="mt-6 inline-block rounded-full bg-dorado px-8 py-3 font-semibold text-tinta hover:brightness-95"
        >
          Prueba 14 días gratis
        </Link>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-sm text-tinta/60">
        <Logo tamaño={28} />
        <p>Reseñas en Google, citas confirmadas y pacientes que regresan — todo por WhatsApp.</p>
        <div className="flex gap-4">
          <Link href="/aviso-de-privacidad" className="hover:underline">
            Aviso de privacidad
          </Link>
          <Link href="/terminos" className="hover:underline">
            Términos de servicio
          </Link>
        </div>
      </footer>
    </main>
  );
}
