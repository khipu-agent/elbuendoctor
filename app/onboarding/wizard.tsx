"use client";

// Wizard de onboarding (SPEC §6.7): 5 pasos, 15 minutos máximo, recepcionista-proof.
// Cero jerga: nada de "plantilla HSM", "webhook" o "API" en pantalla (§11).

import { useState, useTransition } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  buscarNegociosGoogle,
  paso1DatosClinica,
  paso2ConfirmarGoogle,
  paso3Competidores,
  paso4WhatsApp,
  paso5EnviarPrueba,
  terminarOnboarding,
  type NegocioEncontrado,
} from "./acciones";
import type { Tenant } from "@/lib/types";

const PASOS = ["Tu clínica", "Tu Google", "Tu competencia", "Tu WhatsApp", "¡Listo!"];

function slugSugerido(nombre: string): string {
  return (
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "mi-clinica"
  );
}

function Error({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {texto}
    </p>
  );
}

export default function Wizard({ tenant, yaCompleto }: { tenant: Tenant; yaCompleto: boolean }) {
  const [paso, setPaso] = useState(yaCompleto ? 4 : 0);
  const [ocupado, iniciar] = useTransition();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Inicio">
          <Logo tamaño={30} />
        </Link>
        <span className="text-sm text-tinta/60">
          Paso {paso + 1} de 5
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4 flex gap-1.5">
        {PASOS.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 flex-1 rounded-full ${i <= paso ? "bg-esmeralda" : "bg-tinta/10"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-esmeralda">{PASOS[paso]}</p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        {paso === 0 && <PasoClinica tenant={tenant} alAvanzar={() => setPaso(1)} ocupado={ocupado} iniciar={iniciar} />}
        {paso === 1 && <PasoGoogle tenant={tenant} alAvanzar={() => setPaso(2)} ocupado={ocupado} iniciar={iniciar} />}
        {paso === 2 && <PasoCompetidores tenant={tenant} alAvanzar={() => setPaso(3)} ocupado={ocupado} iniciar={iniciar} />}
        {paso === 3 && <PasoWhatsApp alAvanzar={() => setPaso(4)} ocupado={ocupado} iniciar={iniciar} />}
        {paso === 4 && <PasoListo tenant={tenant} ocupado={ocupado} iniciar={iniciar} />}
      </div>
    </main>
  );
}

// ---------- Paso 1 ----------
function PasoClinica({
  tenant,
  alAvanzar,
  ocupado,
  iniciar,
}: {
  tenant: Tenant;
  alAvanzar: () => void;
  ocupado: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const [error, setError] = useState<string>();
  const [slug, setSlug] = useState(tenant.slug.includes("-") && tenant.slug.split("-").pop()!.length === 4 ? slugSugerido(tenant.nombre) : tenant.slug);

  return (
    <form
      action={(formData) =>
        iniciar(async () => {
          const r = await paso1DatosClinica({ ok: false }, formData);
          if (r.ok) alAvanzar();
          else setError(r.error);
        })
      }
      className="space-y-4"
    >
      <h2 className="font-display text-2xl font-semibold">Cuéntanos de tu clínica</h2>

      <div>
        <label htmlFor="nombre" className="text-sm font-medium">Nombre de la clínica</label>
        <input id="nombre" name="nombre" defaultValue={tenant.nombre} required
          className="mt-1 w-full rounded-xl border border-tinta/15 px-4 py-3" />
      </div>

      <div>
        <label htmlFor="slug" className="text-sm font-medium">La dirección de tu página</label>
        <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-tinta/15">
          <input id="slug" name="slug" value={slug} required
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="w-full px-4 py-3" />
          <span className="whitespace-nowrap bg-crema px-3 py-3 text-sm text-tinta/60">
            .elbuendoctor.com.mx
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="cedula" className="text-sm font-medium">Cédula profesional</label>
        <input id="cedula" name="cedula" defaultValue={tenant.cedula_profesional} required
          placeholder="12345678"
          className="mt-1 w-full rounded-xl border border-tinta/15 px-4 py-3" />
        <p className="mt-1 text-xs text-tinta/50">
          Aparece visible en tu página pública, como pide la regulación. Da confianza a tus pacientes.
        </p>
      </div>

      <div>
        <label htmlFor="direccion" className="text-sm font-medium">Dirección del consultorio</label>
        <input id="direccion" name="direccion" defaultValue={tenant.direccion} required
          placeholder="Calle, número, colonia, ciudad"
          className="mt-1 w-full rounded-xl border border-tinta/15 px-4 py-3" />
      </div>

      <div>
        <label htmlFor="color" className="text-sm font-medium">Color de tu marca (opcional)</label>
        <input id="color" name="color" type="color" defaultValue={tenant.colores.primario}
          className="mt-1 h-12 w-20 cursor-pointer rounded-lg border border-tinta/15" />
      </div>

      <details className="rounded-xl bg-crema p-4">
        <summary className="cursor-pointer text-sm font-medium">
          4 preguntas para escribir tu página (1 minuto)
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="a_quien" className="text-sm font-medium">¿A quién atiendes principalmente?</label>
            <input id="a_quien" name="a_quien" placeholder="Familias de la zona, adultos mayores…"
              className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3" />
          </div>
          <div>
            <label htmlFor="que_encanta" className="text-sm font-medium">¿Qué es lo que más te gusta de tu trabajo?</label>
            <input id="que_encanta" name="que_encanta" placeholder="Ver sonreír a mis pacientes…"
              className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3" />
          </div>
          <div>
            <label htmlFor="anos" className="text-sm font-medium">¿Cuántos años de experiencia tienes?</label>
            <input id="anos" name="anos" placeholder="15 años"
              className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3" />
          </div>
          <div>
            <label htmlFor="servicios" className="text-sm font-medium">Tus servicios principales (separados por coma)</label>
            <textarea id="servicios" name="servicios" rows={2} placeholder="Limpieza dental, diseño de sonrisa…"
              defaultValue={tenant.servicios.join(", ")}
              className="mt-1 w-full rounded-xl border border-tinta/15 bg-white px-4 py-3" />
          </div>
        </div>
      </details>

      <Error texto={error} />
      <button type="submit" disabled={ocupado}
        className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60">
        {ocupado ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

// ---------- Paso 2 ----------
function PasoGoogle({
  tenant,
  alAvanzar,
  ocupado,
  iniciar,
}: {
  tenant: Tenant;
  alAvanzar: () => void;
  ocupado: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const [busqueda, setBusqueda] = useState(tenant.nombre);
  const [resultados, setResultados] = useState<NegocioEncontrado[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [buscando, setBuscando] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-semibold">Encuentra tu ficha de Google</h2>
      <p className="text-sm text-tinta/70">
        Buscamos tu negocio tal como aparece en Google Maps. Ahí caerán las reseñas que consigas.
      </p>

      <div className="flex gap-2">
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nombre de tu clínica"
          className="w-full rounded-xl border border-tinta/15 px-4 py-3" />
        <button type="button" disabled={buscando}
          onClick={async () => {
            setBuscando(true);
            setResultados(await buscarNegociosGoogle(busqueda));
            setBuscando(false);
          }}
          className="rounded-xl bg-esmeralda px-5 py-3 font-medium text-white disabled:opacity-60">
          {buscando ? "…" : "Buscar"}
        </button>
      </div>

      {resultados.length > 0 && (
        <ul className="space-y-2">
          {resultados.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => setSeleccion(r.place_id)}
                className={`w-full rounded-xl border p-4 text-left ${
                  seleccion === r.place_id ? "border-esmeralda bg-crema" : "border-tinta/10"
                }`}>
                <p className="font-medium">{r.nombre}</p>
                <p className="text-sm text-tinta/60">{r.direccion}</p>
                <p className="mt-1 text-sm text-dorado">
                  ⭐ {r.rating} · {r.total_reviews} reseñas
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl bg-crema px-4 py-3 text-sm text-tinta/70">
        Al inicio leeremos tus reseñas desde la información pública de Google; cuando Google
        autorice la conexión completa, las respuestas se publicarán sin que tengas que copiarlas.
        Te avisaremos cuando eso pase.
      </p>

      <Error texto={error} />
      <button type="button" disabled={ocupado || !seleccion}
        onClick={() =>
          iniciar(async () => {
            const negocio = resultados.find((r) => r.place_id === seleccion);
            const r = await paso2ConfirmarGoogle(seleccion ?? "", negocio?.nombre ?? busqueda);
            if (r.ok) alAvanzar();
            else setError(r.error);
          })
        }
        className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60">
        {ocupado ? "Guardando…" : "Esta es mi clínica"}
      </button>
    </div>
  );
}

// ---------- Paso 3 ----------
function PasoCompetidores({
  tenant,
  alAvanzar,
  ocupado,
  iniciar,
}: {
  tenant: Tenant;
  alAvanzar: () => void;
  ocupado: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<NegocioEncontrado[]>([]);
  const [elegidos, setElegidos] = useState<NegocioEncontrado[]>([]);
  const [error, setError] = useState<string>();
  const [buscando, setBuscando] = useState(false);

  const alternar = (n: NegocioEncontrado) =>
    setElegidos((prev) =>
      prev.some((p) => p.place_id === n.place_id)
        ? prev.filter((p) => p.place_id !== n.place_id)
        : prev.length < 3
          ? [...prev, n]
          : prev,
    );

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-semibold">¿Contra quién compites?</h2>
      <p className="text-sm text-tinta/70">
        Elige hasta 3 clínicas cercanas. Cada mes te diremos cómo vas contra ellas en Google.
      </p>

      <div className="flex gap-2">
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Busca clínicas cercanas por nombre"
          className="w-full rounded-xl border border-tinta/15 px-4 py-3" />
        <button type="button" disabled={buscando || busqueda.length < 3}
          onClick={async () => {
            setBuscando(true);
            setResultados(await buscarNegociosGoogle(busqueda));
            setBuscando(false);
          }}
          className="rounded-xl bg-esmeralda px-5 py-3 font-medium text-white disabled:opacity-60">
          {buscando ? "…" : "Buscar"}
        </button>
      </div>

      {elegidos.length > 0 && (
        <p className="text-sm font-medium text-esmeralda">
          {elegidos.length} de 3 elegidos: {elegidos.map((e) => e.nombre).join(" · ")}
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="space-y-2">
          {resultados.map((r) => {
            const activo = elegidos.some((e) => e.place_id === r.place_id);
            return (
              <li key={r.place_id}>
                <button type="button" onClick={() => alternar(r)}
                  className={`w-full rounded-xl border p-4 text-left ${
                    activo ? "border-esmeralda bg-crema" : "border-tinta/10"
                  }`}>
                  <p className="font-medium">
                    {activo ? "✓ " : ""}{r.nombre}
                  </p>
                  <p className="text-sm text-tinta/60">{r.direccion}</p>
                  <p className="mt-1 text-sm text-dorado">⭐ {r.rating} · {r.total_reviews} reseñas</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Error texto={error} />
      <button type="button" disabled={ocupado || elegidos.length === 0}
        onClick={() =>
          iniciar(async () => {
            const r = await paso3Competidores(elegidos);
            if (r.ok) alAvanzar();
            else setError(r.error);
          })
        }
        className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60">
        {ocupado ? "Guardando…" : "Guardar mi competencia"}
      </button>
    </div>
  );
}

// ---------- Paso 4 ----------
function PasoWhatsApp({
  alAvanzar,
  ocupado,
  iniciar,
}: {
  alAvanzar: () => void;
  ocupado: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const [error, setError] = useState<string>();
  return (
    <form
      action={(formData) =>
        iniciar(async () => {
          const r = await paso4WhatsApp({ ok: false }, formData);
          if (r.ok) alAvanzar();
          else setError(r.error);
        })
      }
      className="space-y-4"
    >
      <h2 className="font-display text-2xl font-semibold">Conecta tu WhatsApp</h2>
      <p className="text-sm text-tinta/70">
        Tu clínica usa <strong>su propio número</strong> de WhatsApp Business: los mensajes salen a
        tu nombre, nunca de un número compartido. La aprobación del número depende de Meta; mientras
        tanto, todo funciona en modo de demostración dentro de tu panel.
      </p>

      <div>
        <label htmlFor="numero_negocio" className="text-sm font-medium">
          WhatsApp Business de tu clínica (10 dígitos)
        </label>
        <input id="numero_negocio" name="numero_negocio" inputMode="tel" required
          placeholder="55 1234 5678"
          className="mt-1 w-full rounded-xl border border-tinta/15 px-4 py-3" />
      </div>
      <div>
        <label htmlFor="numero_dueno" className="text-sm font-medium">
          Tu WhatsApp personal (aquí te llegan las alertas)
        </label>
        <input id="numero_dueno" name="numero_dueno" inputMode="tel" required
          placeholder="55 8765 4321"
          className="mt-1 w-full rounded-xl border border-tinta/15 px-4 py-3" />
      </div>

      <Error texto={error} />
      <button type="submit" disabled={ocupado}
        className="w-full rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60">
        {ocupado ? "Conectando…" : "Conectar mi WhatsApp"}
      </button>
    </form>
  );
}

// ---------- Paso 5 ----------
function PasoListo({
  tenant,
  ocupado,
  iniciar,
}: {
  tenant: Tenant;
  ocupado: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const [pruebaEnviada, setPruebaEnviada] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div className="space-y-5 text-center">
      <p className="text-4xl">🎉</p>
      <h2 className="font-display text-2xl font-semibold">¡Tu clínica ya está lista!</h2>
      <p className="text-sm text-tinta/70">
        Imprime tu código QR y ponlo en recepción: tus pacientes lo escanean y opinan en Google.
      </p>

      <div className="flex flex-col gap-3">
        <a href={`/api/qr/${tenant.slug}`} target="_blank" rel="noopener"
          className="rounded-full border border-esmeralda py-3 font-medium text-esmeralda hover:bg-crema">
          Descargar mi QR para recepción (PDF)
        </a>

        <button type="button" disabled={ocupado || pruebaEnviada}
          onClick={() =>
            iniciar(async () => {
              const r = await paso5EnviarPrueba();
              if (r.ok) setPruebaEnviada(true);
              else setError(r.error);
            })
          }
          className="rounded-full bg-esmeralda py-3 font-medium text-white hover:bg-esmeralda-oscuro disabled:opacity-60">
          {pruebaEnviada
            ? "✔ Solicitud de prueba enviada — revisa tu panel"
            : ocupado
              ? "Enviando…"
              : "Enviar una solicitud de prueba a mi propio número"}
        </button>

        <Error texto={error} />

        <button type="button" onClick={() => iniciar(async () => terminarOnboarding())}
          className="text-sm text-tinta/60 underline">
          Ir a mi panel
        </button>
      </div>
    </div>
  );
}
