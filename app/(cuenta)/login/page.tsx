"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { accionLogin, type EstadoForma } from "../acciones";
import Logo from "@/components/Logo";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar a mi panel"}
    </button>
  );
}

export default function Login() {
  const [estado, accion] = useFormState<EstadoForma, FormData>(accionLogin, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" aria-label="Inicio">
        <Logo tamaño={34} />
      </Link>
      <h1 className="mt-6 font-display text-3xl font-semibold">Qué gusto verte</h1>
      <p className="mt-1 text-tinta/60">Entra a tu panel para ver tus reseñas y mensajes.</p>

      <form action={accion} className="mt-8 space-y-4">
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
            Tu contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3"
          />
        </div>
        {estado.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {estado.error}
          </p>
        )}
        <Boton />
      </form>

      <p className="mt-6 text-center text-sm text-tinta/60">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-esmeralda hover:underline">
          Prueba 14 días gratis
        </Link>
      </p>
    </main>
  );
}
