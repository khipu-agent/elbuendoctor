"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { accionRegistro, type EstadoForma } from "../acciones";
import Logo from "@/components/Logo";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60"
    >
      {pending ? "Creando tu cuenta…" : "Crear mi cuenta gratis"}
    </button>
  );
}

export default function Registro() {
  const [estado, accion] = useFormState<EstadoForma, FormData>(accionRegistro, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" aria-label="Inicio">
        <Logo tamaño={34} />
      </Link>
      <h1 className="mt-6 font-display text-3xl font-semibold">Prueba 14 días gratis</h1>
      <p className="mt-1 text-tinta/60">
        Sin tarjeta. En 15 minutos tu clínica empieza a pedir reseñas.
      </p>

      <form action={accion} className="mt-8 space-y-4">
        <div>
          <label htmlFor="nombre" className="text-sm font-medium">
            Tu nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
            placeholder="Dra. Mariana Solís"
          />
        </div>
        <div>
          <label htmlFor="clinica" className="text-sm font-medium">
            Nombre de tu clínica
          </label>
          <input
            id="clinica"
            name="clinica"
            required
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
            placeholder="Consultorio Dental Sonrisa MX"
          />
        </div>
        <div>
          <label htmlFor="vertical" className="text-sm font-medium">
            Tipo de clínica
          </label>
          <select
            id="vertical"
            name="vertical"
            required
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
          >
            <option value="dental">Clínica dental / odontología estética</option>
            <option value="especialista">Médico especialista</option>
            <option value="estetica">Clínica estética / medspa</option>
            <option value="peso">Control de peso</option>
          </select>
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Tu correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
            placeholder="doctora@miclinica.mx"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Elige una contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
          />
          <p className="mt-1 text-xs text-tinta/50">Mínimo 8 caracteres.</p>
        </div>
        {estado.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {estado.error}
          </p>
        )}
        <Boton />
        <p className="text-center text-xs text-tinta/50">
          Al crear tu cuenta aceptas los{" "}
          <Link href="/terminos" className="underline">
            términos
          </Link>{" "}
          y el{" "}
          <Link href="/aviso-de-privacidad" className="underline">
            aviso de privacidad
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
