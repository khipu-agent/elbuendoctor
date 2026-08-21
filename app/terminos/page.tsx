import Link from "next/link";
import Logo from "@/components/Logo";

// REVISAR POR ABOGADO (SPEC §10.3): borrador razonable, no sustituye revisión legal.
export default function Terminos() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Inicio">
        <Logo tamaño={30} />
      </Link>
      <h1 className="mt-8 font-display text-3xl font-semibold">Términos de servicio</h1>
      <p className="mt-2 rounded-lg bg-dorado/20 px-3 py-2 text-sm font-medium">
        BORRADOR — REVISAR POR ABOGADO antes de operación real.
      </p>
      <div className="mt-6 space-y-4 text-tinta/80">
        <p>
          <strong>El servicio.</strong> ElBuenDoctor es una plataforma de suscripción mensual que
          ayuda a clínicas a solicitar reseñas de Google, confirmar citas y reactivar pacientes por
          WhatsApp, sin permanencia.
        </p>
        <p>
          <strong>Responsabilidad del cliente.</strong> El cliente es responsable del contenido que
          publica, de la licitud de su base de datos de pacientes y de contar con su aviso de
          privacidad conforme a la LFPDPPP. La plataforma provee herramientas y filtros de
          cumplimiento, mas no garantiza la aprobación de terceros (Meta, Google).
        </p>
        <p>
          <strong>Límites honestos.</strong> Las reseñas pueden tardar hasta 24 horas en
          sincronizarse; la aprobación del número de WhatsApp depende de Meta; los reportes muestran
          datos públicos de Google.
        </p>
        <p>
          <strong>Cancelación.</strong> Puedes cancelar en cualquier momento desde tu panel; la
          cancelación es efectiva al final del periodo pagado.
        </p>
        <p>
          <strong>Uso aceptable.</strong> Queda prohibido usar la plataforma para enviar mensajes a
          personas que no dieron su consentimiento, ofrecer incentivos a cambio de reseñas u ocultar
          el enlace de opinión de Google a pacientes insatisfechos.
        </p>
      </div>
    </main>
  );
}
