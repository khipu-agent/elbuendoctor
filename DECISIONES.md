# DECISIONES — ElBuenDoctor

Registro de decisiones técnicas (SPEC §0). Cada decisión anota el porqué.

## #1 — Capa de datos: almacén demo JSON + migraciones Supabase listas
**Fecha:** Fase 1 · **Contexto:** El stack obligatorio es Supabase (Postgres + RLS + Auth + pg_cron), pero el proyecto de Supabase se crea con la cuenta del dueño y sus llaves se colocan en Vercel (SPEC §13 y §15.2): no se pueden pedir ni pegar claves en el chat, y afirmar que algo funciona sin haberlo verificado viola §15.4.
**Decisión:** Toda la app accede a datos SOLO a través de `lib/db/index.ts` (repositorio). Sin variables de Supabase corre sobre un almacén JSON con el seed (mismo esquema, mismas reglas); el esquema SQL completo con RLS vive en `supabase/migrations/0001_init.sql`. Conectar Supabase = crear el proyecto, aplicar la migración y enchufar el adaptador en ese único archivo.
**Consecuencia:** el producto se prueba de punta a punta hoy; la migración a producción no toca páginas ni rutas.

## #2 — Auth: sesión HMAC httpOnly en modo demo, Supabase Auth en producción
**Fecha:** Fase 1 · **Contexto:** SPEC pide Supabase Auth (email + contraseña con verificación por correo). Sin proyecto de Supabase no hay correos de verificación que enviar.
**Decisión:** `lib/auth.ts` implementa sesión firmada HMAC (cookie httpOnly, SameSite=Lax, scrypt para contraseñas). El cambio a Supabase Auth ocurre en ese archivo y en las acciones de login/registro. La verificación por correo se activa con Resend/Supabase al conectar producción.

## #3 — WhatsApp en "modo demo de mensajes" mientras el BSP aprueba
**Fecha:** Fase 1 · **Contexto:** §6.7 paso 4 lo contempla: mientras Meta/BSP aprueba el número, el sistema funciona en modo demo. La verificación de Meta Business y alta en Gupshup son tareas del dueño (§13).
**Decisión:** `lib/whatsapp/index.ts` define la interfaz `ProveedorWhatsApp`; Gupshup está implementado y se activa solo con sus llaves; sin llaves, los mensajes se registran en la base y se muestran en el panel ("Mensajes") tal como llegarían al WhatsApp. Los invariantes (exclusión, límites, freno de calidad, contadores servidor-side) se aplican en ambos modos, en `enviarMensaje`, la única puerta de salida.

## #4 — Google arranca SIEMPRE en modo degradado
**Fecha:** Fase 1 · **Contexto:** La aprobación de Business Profile API tarda 2–6 semanas (§13) y el producto debe ser 100% vendible mientras (§6.1).
**Decisión:** `google_accounts.modo = 'degradado'` por defecto; lectura de reseñas vía Places con caché en DB; respuestas IA con botón "copiar" + deep-link a la consola de Google. La estructura OAuth (`oauth_tokens_cifrados`, flujo `/api/google/oauth`) queda lista para cuando llegue la aprobación.

## #5 — IA con respaldo determinístico
**Fecha:** Fase 1 · **Contexto:** Sin `GEMINI_API_KEY` no hay Gemini, pero las respuestas a reseñas deben probarse end-to-end.
**Decisión:** `lib/ai/index.ts` llama a Gemini si hay clave; si no, usa un redactor determinístico que cumple las mismas reglas del prompt (§6.1). Toda salida pasa por `lib/ai/compliance.ts`; si no pasa el filtro, se cae al texto seguro. Nada de IA se publica sin aprobación humana (§15.7), salvo el toggle expreso de auto-publicación con registro de consentimiento.

## #6 — Monorepo único Next.js, sin microservicios
**Fecha:** Fase 1 · **Contexto:** §4 exige monorepo único (app, micro-páginas y landing) en Next.js App Router + TypeScript estricto + Tailwind.
**Decisión:** Un solo proyecto en la raíz: landing `/`, app autenticada `/app/*`, micro-páginas por middleware (`{slug}.elbuendoctor.com.mx`) con fallback de ruta `/p/{slug}` para preview/desarrollo donde el wildcard no existe.

## #7 — Estrellas SIEMPRE en dorado `#F2B01E`, modo claro único
**Fecha:** Fase 1 · **Contexto:** §2 fija la paleta y prohíbe modo oscuro en el MVP (§14).
**Decisión:** tokens de color en `tailwind.config.ts`; el componente de estrellas no acepta otro color.

## #8 — Next.js en modo `standalone` + Dockerfile para el despliegue
**Fecha:** Fase 1 · **Contexto:** el preview y Vercel necesitan un artefacto servible con rutas de servidor (webhooks, acciones).
**Decisión:** `output: 'standalone'` y un `Dockerfile` mínimo que corre `node server.js`.

## #9 — Los crons nunca se ejecutan en build ni sin secreto en producción
**Fecha:** Fase 1 · **Contexto:** Next.js sondea los route handlers GET durante `next build`; la primera versión del cron llegó a procesar reseñas del seed en build time. Además, sin `CRON_SECRET` cualquiera podría disparar el cron en producción.
**Decisión:** `export const dynamic = "force-dynamic"` en toda ruta de cron + rechazo 503 en producción si falta `CRON_SECRET` (en desarrollo local corre libre para pruebas). Detectado verificando eventos en la base (§15.4).

## #10 — Regex del filtro de cumplimiento sin `\b` en patrones acentuados
**Fecha:** Fase 1 · **Contexto:** `\b` en JavaScript es ASCII-only; "me curó" se colaba por la ó.
**Decisión:** patrones con acentos no usan `\b`. Detectado por el test `cumplimiento.test.ts`.
