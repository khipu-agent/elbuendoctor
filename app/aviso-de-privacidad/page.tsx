import Link from "next/link";
import Logo from "@/components/Logo";

// REVISAR POR ABOGADO (SPEC §10.3): borrador razonable, no sustituye revisión legal.
export default function AvisoPrivacidad() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Inicio">
        <Logo tamaño={30} />
      </Link>
      <h1 className="mt-8 font-display text-3xl font-semibold">Aviso de privacidad</h1>
      <p className="mt-2 rounded-lg bg-dorado/20 px-3 py-2 text-sm font-medium">
        BORRADOR — REVISAR POR ABOGADO antes de operación real.
      </p>
      <div className="prose mt-6 space-y-4 text-tinta/80">
        <p>
          ElBuenDoctor (en adelante, &quot;la plataforma&quot;) es responsable del tratamiento de los
          datos personales que proporcionas al crear tu cuenta: nombre, correo electrónico y número
          de WhatsApp.
        </p>
        <p>
          <strong>Datos de pacientes.</strong> Cada clínica es responsable del contenido que publica
          y de la licitud de su propia base de datos de pacientes; la plataforma provee herramientas
          y filtros de cumplimiento. Los archivos de pacientes que subes se procesan para cargar los
          datos a tu cuenta y el archivo original se elimina una vez procesado (SPEC §15.10).
        </p>
        <p>
          <strong>Finalidades.</strong> Operar el servicio contratado: envío de mensajes por
          WhatsApp a nombre de tu clínica, sincronización de reseñas públicas de Google y generación
          de reportes.
        </p>
        <p>
          <strong>Derechos ARCO.</strong> Puedes ejercer tus derechos de acceso, rectificación,
          cancelación y oposición escribiendo a privacidad@elbuendoctor.com.mx.
        </p>
        <p>
          <strong>Medios para revocar el consentimiento.</strong> Cualquier paciente puede dejar de
          recibir mensajes respondiendo &quot;BAJA&quot; en cualquier momento; la baja es inmediata y
          permanente.
        </p>
      </div>
    </main>
  );
}
