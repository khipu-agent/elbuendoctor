# PROMPT MAESTRO PARA KIMI — CONSTRUCCIÓN DEL SAAS "ELBUENDOCTOR" (A→Z)

Eres un ingeniero de software senior full-stack. Vas a construir desde cero un SaaS completo llamado **ElBuenDoctor**, siguiendo ESTE documento como fuente única de verdad. Guárdalo en la raíz del repositorio como `SPEC.md` y consúltalo antes de cada decisión. Trabaja fase por fase (sección 12), sin saltarte el orden, y no des por terminada una fase sin cumplir su criterio de aceptación. Mantén un archivo `DECISIONES.md` donde anotes cada decisión técnica que tomes y por qué. Las reglas de la sección 10 (CUMPLIMIENTO) son INVARIANTES: ningún código puede violarlas jamás, ni siquiera si un usuario lo pide.

---

## 1. QUÉ ES ELBUENDOCTOR (contexto de negocio)

SaaS mexicano multi-tenant de suscripción mensual para consultorios de salud privada: clínicas dentales y odontología estética, médicos especialistas (torres médicas), clínicas estéticas/medspas y clínicas de control de peso. Le resuelve al doctor tres dolores con dinero directo:

1. **Que lo elijan en Google:** convierte pacientes satisfechos en reseñas de Google (el 84% de los pacientes lee reseñas antes de elegir médico; solo el 5% las escribe — cerramos esa brecha).
2. **Que no le fallen a las citas:** confirmaciones por WhatsApp (los recordatorios reducen inasistencias ~38%).
3. **Que sus pacientes regresen:** reactivación por WhatsApp de pacientes inactivos desde un Excel.

**Posicionamiento (para todo el copy):** complemento de los portales médicos, nunca competidor. Mensaje central: "Los portales te rentan visibilidad dentro de su plataforma con contrato anual; ElBuenDoctor construye tu reputación en Google —que es tuya para siempre— y hace que tus propios pacientes regresen. Mensual, sin permanencia." PROHIBIDO nombrar a Doctoralia u otro competidor de forma denigrante en cualquier texto del producto o la landing; referirse siempre a la categoría ("portales con contrato anual").

**Principio de producto #1:** la experiencia del doctor vive en su WhatsApp, no en un panel. Todo lo importante le LLEGA (alertas, respuestas para aprobar, reportes, creativos). El panel web existe para la recepcionista y la configuración inicial.

---

## 2. MARCA (aplícala en toda la UI, landing y plantillas)

- **Nombre:** ElBuenDoctor (una palabra en logotipo: "ElBuenDoctor"; en texto corrido: "El Buen Doctor").
- **Dominio:** `elbuendoctor.com.mx` (YA comprado en Akky y delegado a nameservers de Vercel con Vercel DNS habilitado en el equipo "Negocio IA"). Micro-páginas de clientes: `{slug}.elbuendoctor.com.mx` vía dominio wildcard `*.elbuendoctor.com.mx`. Al crear el proyecto en Vercel, conecta AMBOS: el dominio raíz y el wildcard.
- **Tagline:** "Reseñas en Google, citas confirmadas y pacientes que regresan — todo por WhatsApp."
- **Paleta:** verde esmeralda `#0D6E5F` (principal, CTAs), dorado estrella `#F2B01E` (estrellas de calificación SIEMPRE en este dorado, acentos), crema `#FAF7F0` (fondos), tinta `#1A1F1D` (texto). Modo claro únicamente en el MVP.
- **Tipografía:** Fraunces (Google Fonts) para logotipo y H1/H2; Inter para UI y cuerpo.
- **Símbolo:** estrella de 5 puntas fusionada con una burbuja de chat. Genera un SVG simple para favicon, logo y stickers de QR.
- **Voz de todos los textos:** español mexicano, cálido y directo. Hablar de pacientes y pesos, nunca de tecnología. Ejemplo correcto: "Tus pacientes contentos te recomiendan en Google sin que muevas un dedo". Ejemplo prohibido: "Automatizamos solicitudes de reseñas vía API". Usar números concretos donde aplique (84% lee reseñas, ~38% menos inasistencias, "un implante recuperado paga 2 años del sistema").

---

## 3. PLANES Y PRECIOS (MXN por mes, precio mostrado con IVA incluido, SIN permanencia)

| | **Solo** $799 | **Pro** $1,699 | **Clínica** $2,899 |
|---|---|---|---|
| Solicitud de reseñas por WhatsApp + QR | ✔ | ✔ | ✔ |
| Respuestas a reseñas con IA + alertas | ✔ | ✔ | ✔ |
| Micro-página con agendamiento por WhatsApp | ✔ | ✔ | ✔ |
| Reporte mensual + benchmark de 3 competidores | ✔ | ✔ | ✔ |
| Recordatorio/confirmación de citas | — | ✔ | ✔ |
| Reactivación de pacientes (Excel + goteo) | — | ✔ | ✔ |
| Carrusel semanal de creativos desde reseñas | — | — | ✔ |
| Multi-sucursal / multi-usuario | — | — | ✔ |
| Límite mensual de mensajes UTILITY (recordatorios + solicitudes de reseña) | 300 | 1,000 | 2,000 |
| Límite mensual de mensajes MARKETING (reactivación) | 0 | 300 | 800 |

Reglas de negocio de los planes:
- Prueba gratis de 14 días con funcionalidad del plan Pro; al día 14 se requiere tarjeta (Stripe Checkout) para continuar. Sin freemium permanente.
- Descuento anual: 2 meses gratis (pagar 10 meses).
- Mensajes de MARKETING excedentes: add-on a $1.00 MXN por mensaje (nunca gratis: el costo Meta es ~$0.56 MXN).
- Los límites separados utility/marketing son INTENCIONALES (protegen el margen). No unificarlos jamás.
- Flag `founder_price` por tenant: 50% de descuento de por vida (se activa manualmente desde el panel de super-admin; solo para los primeros clientes presenciales).
- Upgrade/downgrade en un clic desde el panel, prorrateado por Stripe.

---

## 4. STACK TÉCNICO (obligatorio)

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 14+ App Router + TypeScript ESTRICTO + Tailwind | Monorepo único: app, micro-páginas y landing |
| DB + Auth + Storage + Cron | Supabase (Postgres) | Row Level Security con `tenant_id` en TODAS las tablas de datos. Auth: email + contraseña con verificación por correo (Supabase Auth). pg_cron para tareas programadas |
| Hosting | Vercel | Dominio `elbuendoctor.com.mx` + wildcard `*.elbuendoctor.com.mx`. Detección de tenant por hostname en middleware |
| WhatsApp | BSP con Embedded Signup: **Gupshup** (primera opción; abstrae el proveedor en un módulo `lib/whatsapp/` para poder cambiar a 360dialog sin tocar el resto) | CADA clínica conecta SU PROPIO número de WhatsApp Business. Nunca un número compartido |
| IA | Gemini API (Google AI Studio) | Respuestas a reseñas, filtro de cumplimiento, textos de micro-página, selección de reseñas para carruseles. Abstrae en `lib/ai/` |
| Google | Business Profile API (OAuth por clínica; reseñas y respuestas) + Places API (competidores y modo degradado) | Places SIEMPRE cacheado 30 días en DB (cuesta por request) |
| Imágenes de carrusel | Plantilla HTML → PNG con @vercel/og (satori) | Determinístico con colores del tenant. NO usar generación de imágenes con IA |
| Pagos | Stripe México | Checkout + Customer Portal + webhooks. Suscripciones en MXN |
| Excel | SheetJS (xlsx) parseado en el navegador | Validación antes de subir |
| Email transaccional | Resend (verificación, recibos, avisos cuando WhatsApp no esté disponible) | Secundario: WhatsApp es el canal principal |

Variables de entorno a definir en `.env.example` (con comentario de dónde se obtiene cada una): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_IDS (6: 3 planes × mensual/anual), GUPSHUP_API_KEY/APP_ID, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_PLACES_API_KEY, RESEND_API_KEY, NEXT_PUBLIC_APP_URL.

Desarrollo con datos semilla: crea un seed con 3 clínicas ficticias (una dental, una estética, una de control de peso), 200 contactos falsos, 40 reseñas falsas y 30 citas. Todo el desarrollo se hace contra el seed; las APIs reales se integran al final de cada fase y las pruebas de WhatsApp SOLO contra los números del dueño.

---

## 5. ARQUITECTURA MULTI-TENANT Y MODELO DE DATOS

**Regla de oro: una clínica = un tenant = su propio número de WhatsApp + su propia conexión de Google.** Nada compartido entre clínicas. RLS de Supabase con `tenant_id` en cada tabla. Tokens OAuth cifrados (cifrado a nivel de aplicación con clave en env). Nunca escribir teléfonos completos en logs.

```sql
tenants          -- id, nombre, vertical('dental'|'especialista'|'estetica'|'peso'), plan('trial'|'solo'|'pro'|'clinica'), slug único, colores jsonb, logo_url, cedula_profesional, founder_price bool, estado_suscripcion, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at
users            -- id (auth.users), tenant_id, rol('dueno'|'recepcion'), nombre, whatsapp_personal (E.164, para alertas al dueño)
wa_accounts      -- tenant_id, proveedor('gupshup'), waba_id, phone_number_id, numero_display, quality_rating('green'|'yellow'|'red'|null), messaging_tier, estado('pendiente'|'activo'|'pausado')
google_accounts  -- tenant_id, gbp_location_id null, place_id, oauth_tokens_cifrados null, modo('api'|'degradado'), ultima_sync
reviews          -- id, tenant_id, review_id_google único, rating int, texto, autor_nombre, fecha_review, respondida bool, respuesta_ia, respuesta_publicada, estado('nueva'|'pendiente_aprobacion'|'aprobada'|'publicada'|'ignorada')
competitors      -- tenant_id, place_id, nombre, rating, total_reviews, snapshot_fecha (máx 3 por tenant; refrescar si snapshot > 30 días)
contacts         -- id, tenant_id, telefono E.164, nombre, origen('excel'|'cita'|'micropagina'|'manual'), opt_in_status('pendiente'|'activo'|'baja'), opt_in_evidencia jsonb {fecha, canal, mensaje, respuesta}, ultima_visita date null
appointments     -- id, tenant_id, contact_id, fecha_hora, nota, estado('agendada'|'confirmada'|'reagendar'|'asistio'|'no_asistio'|'cancelada'), review_solicitada bool
campaigns        -- id, tenant_id, tipo('reactivacion'), nombre, estado('borrador'|'activa'|'pausada_calidad'|'pausada_manual'|'terminada'), limite_diario int default 25, enviados_hoy int, plantilla_oferta text, created_at
campaign_contacts-- campaign_id, contact_id, estado('pendiente'|'enviado'|'respondio_si'|'respondio_no'|'sin_respuesta'|'fallido'), enviado_at
messages         -- id, tenant_id, contact_id null, direccion('in'|'out'), categoria('utility'|'marketing'|'service'), template_name, cuerpo, estado('encolado'|'enviado'|'entregado'|'leido'|'fallido'), error_code, costo_usd numeric, created_at
usage_counters   -- tenant_id, mes 'YYYY-MM', utility_usados, marketing_usados (límites se leen del plan; contador se incrementa en cada envío EXITOSO)
exclusion_list   -- tenant_id, telefono E.164, motivo('opt_out'|'rebote'|'reporte'), fecha  -- NUNCA se borra; se consulta antes de CUALQUIER envío
events_log       -- id, tenant_id, tipo, payload jsonb, created_at  -- auditoría de acciones sensibles (cargas de excel, cambios de plan, pausas)
```

**Webhooks y crons:**
- `POST /api/whatsapp/webhook` — entrantes (respuestas de botones, textos, estados de entrega, cambios de quality rating). Idempotente.
- `POST /api/stripe/webhook` — checkout.session.completed, invoice.paid, customer.subscription.updated/deleted. Idempotente.
- Cron cada hora: procesar cola de recordatorios de citas (enviar los de citas que ocurren en 24h ±1h) y solicitudes de reseña post-cita (2h después de marcada 'asistio').
- Cron diario 10:00 CDMX: motor de goteo de campañas de reactivación (respeta limite_diario, límites del plan, exclusion_list y quality_rating).
- Cron diario 07:00: sync de reseñas nuevas de Google por tenant + alertas.
- Cron mensual día 1, 09:00: reporte mensual por WhatsApp + refresh de snapshots de competidores.
- Cron semanal lunes 08:00: carrusel de creativos (solo plan Clínica).

**Detección de tenant en micro-páginas:** middleware de Next.js lee el hostname; si es `{slug}.elbuendoctor.com.mx`, resuelve el tenant por slug y sirve la micro-página; el dominio raíz sirve landing y app (`/app/*` autenticado).

---

## 6. MÓDULOS DEL PRODUCTO (comportamiento exacto)

### 6.1 Motor de reseñas de Google
- Tres disparadores de solicitud: (a) automático 2h después de cita marcada 'asistio' (Pro+); (b) QR imprimible en recepción; (c) envío manual desde el panel a un contacto.
- **Flujo compliant (aplica a los tres):** el paciente llega a la pregunta de satisfacción "¿Cómo fue tu experiencia en {clínica}?" con opciones 😊 Excelente / 😐 Regular / 😞 Mala. TODOS los caminos terminan mostrando el botón/link "Dejar mi opinión en Google" (link directo al review de la ficha del tenant). Los que eligen 😐/😞 ven ANTES un cuadro de comentario privado ("Cuéntanos qué podemos mejorar") que se envía a la clínica — pero el link a Google se les muestra igual al final. PROHIBIDO ocultar el link de Google a los insatisfechos (review gating) y PROHIBIDO ofrecer incentivos por reseñar.
- Implementación del flujo: por WhatsApp con botones interactivos cuando el disparador es (a) o (c); para el QR (b), el código apunta a la página pública `/opina/{slug}` que renderiza el mismo flujo en web (pregunta → comentario privado si aplica → botón a Google). Registrar cada respuesta.
- **Sincronización:** con GBP API aprobada (OAuth por clínica): leer reseñas, publicar respuestas. **Modo degradado obligatorio** mientras no haya aprobación: leer las ~5 reseñas más recientes vía Places API (cache 24h), permitir generar la respuesta con IA y copiarla con un botón + deep-link a la consola de Google del negocio para pegarla. El producto debe ser 100% vendible en modo degradado.
- **Alertas:** reseña nueva → WhatsApp al dueño. Rating ≤3 → alerta URGENTE inmediata con la respuesta IA sugerida y botones [Aprobar y publicar] / [Editar en el panel].
- **Respuestas con IA (Gemini):** tono profesional y cálido configurable por tenant (formal/cercano). REGLAS DEL PROMPT: jamás confirmar que el autor fue paciente, jamás mencionar tratamientos, padecimientos ni datos clínicos (secreto médico); agradecer, reflejar el punto sin detalles médicos, invitar a canal privado si es negativa. Publicación: default = aprobar antes de publicar (un tap "OK" por WhatsApp o clic en panel); auto-publicación solo para reseñas de 4-5 estrellas y solo si el tenant la activó expresamente con un toggle que registra fecha/hora del consentimiento.

### 6.2 Citas y recordatorios (Pro+)
- Agenda mínima: crear cita (contacto + fecha/hora + nota), vista lista día/semana, importación CSV. NO construir un calendario complejo; la clínica puede seguir usando su agenda de siempre.
- Recordatorio Utility 24h antes: "Hola {nombre}, te recordamos tu cita en {clínica} mañana a las {hora}." Botones [Confirmo ✔] / [Necesito reagendar]. "Reagendar" abre conversación libre que ve la recepcionista en un inbox simple dentro del panel.
- Marcar 'asistio' (un tap en la lista del día) dispara la solicitud de reseña 2h después (si el contacto no tiene ya una solicitud en los últimos 60 días).

### 6.3 Reactivación de pacientes inactivos (Pro+)
- Carga de Excel/CSV en el navegador (SheetJS): columnas esperadas nombre, teléfono, última visita (opcional). Normalizar a E.164 (+52...), deduplicar, excluir los ya existentes con opt-out y los de exclusion_list. Mostrar resumen: N válidos, N inválidos, N excluidos.
- **Checkbox OBLIGATORIO** antes de procesar: "Confirmo que estos pacientes proporcionaron su número a mi clínica y consintieron recibir comunicaciones conforme a mi aviso de privacidad." Sin marcar → botón deshabilitado. Registrar el evento en events_log.
- **Goteo:** default 25 mensajes/día por clínica; sube +10/día cada semana automáticamente SOLO si tasa de bloqueo/reporte <1% y quality_rating verde; si no, se mantiene o pausa.
- **Primer mensaje SIEMPRE de re-opt-in** (plantilla Marketing con botones): "Hola {nombre} 👋 Soy el asistente de {clínica}, donde te atendiste anteriormente. Estamos actualizando nuestra agenda de pacientes. ¿Te gustaría recibir un beneficio especial para tu próxima visita?" [Sí, me interesa] / [No, gracias].
  - "Sí" → guardar opt_in_evidencia → enviar el beneficio configurado por la clínica + link de agendamiento por WhatsApp.
  - "No" (o cualquier texto tipo "no", "ya no", "baja") → opt_in_status='baja' + exclusion_list. Permanente.
  - Sin respuesta en 30 días → estado 'sin_respuesta'; NO reintentar en esta campaña.
- **Freno automático:** si quality_rating cambia a yellow/red (webhook del BSP) → pausar TODAS las campañas del tenant (estado 'pausada_calidad'), notificar al dueño por WhatsApp explicando en lenguaje simple, reanudar manualmente solo cuando vuelva a verde. El freno NO es configurable ni desactivable por el cliente. Error 131049 de Meta en un contacto → reintentar ese contacto en 24h+, no antes.

### 6.4 Micro-página pública ({slug}.elbuendoctor.com.mx)
- SSR, mobile-first (el tráfico llega de WhatsApp), carga <2s, Lighthouse móvil ≥90.
- Contenido: foto y nombre del doctor/clínica, especialidad, **cédula profesional visible** (campo obligatorio del onboarding), lista de servicios, 3-6 fotos, mapa embed, reseñas de Google en vivo (cache 24h, mostrar rating + últimas 5), botón principal fijo "Agendar por WhatsApp" (wa.me/{numero} con texto precargado "Hola, quiero agendar una cita 🙂 — vengo de su página"), aviso de privacidad autogenerado (plantilla LFPDPPP con datos del tenant), footer discreto "Creado con ElBuenDoctor" enlazando a la landing.
- Personalización del tenant: color primario, logo, orden de secciones. El verde/dorado de ElBuenDoctor es solo el default.
- Textos generados con IA en el onboarding a partir de 4 preguntas; REGLAS: sin superlativos ("el mejor"), sin promesas de resultados, sin nombres de medicamentos.

### 6.5 Reporte mensual + benchmark (todos los planes)
- Día 1 de cada mes, WhatsApp al dueño: "📊 Tu mes en Google: +{n} reseñas (total {t}), calificación {r} {flecha}, respondiste {p}%. {Competidor1}: {t1} reseñas ({r1}⭐). {Competidor2}... ¡{frase motivadora contextual}!" + link al reporte completo en el panel.
- La clínica elige sus 3 competidores en el onboarding buscando por nombre (Places API); pueden cambiarlos cuando quieran.
- Tono: motivador y competitivo. Este mensaje es la herramienta de retención #1: cuídalo como si fuera la feature principal.

### 6.6 Carrusel semanal de creativos (solo Clínica)
- Lunes 08:00: Gemini selecciona las 2-3 mejores reseñas de los últimos 7 días aplicando el FILTRO DE CUMPLIMIENTO (sección 10.3) → plantillas HTML 1080×1080 con colores/logo del tenant y el texto de la reseña + "⭐⭐⭐⭐⭐ Reseña real de Google" + autor con inicial ("María G.") → PNGs → mensaje al dueño con links de descarga.
- Si la semana no tiene reseñas que pasen el filtro, enviar mensaje honesto ("Esta semana no hubo reseñas nuevas para tu carrusel — ¡pide más con tu QR!") en vez de inventar.
- ElBuenDoctor NUNCA publica en las redes del cliente; solo entrega el material.

### 6.7 Onboarding wizard (crítico: 15 minutos máximo, operable por una recepcionista)
Pasos: (1) Datos de la clínica: nombre, vertical, cédula, dirección, colores/logo (opcional, defaults listos). (2) Conectar Google: buscar su negocio por nombre (Places), confirmar ficha; si hay GBP API: OAuth; si no: modo degradado transparente. (3) Elegir 3 competidores cercanos (sugeridos por Places por categoría+radio). (4) Conectar WhatsApp: embedded signup del BSP con guía visual; mientras se aprueba, el sistema funciona en "modo demo de mensajes". (5) Listo: descarga tu QR de recepción (PDF con marco de la marca del tenant) + botón "Enviar mi primera solicitud de prueba a mi propio número".
Métrica de activación a instrumentar: % de tenants que envían su primera solicitud real en las primeras 24h.

### 6.8 Panel de super-admin (para el dueño de ElBuenDoctor)
Ruta `/admin` protegida por rol super_admin (fuera del modelo de tenants): lista de tenants con plan, MRR, estado de suscripción, uso de mensajes, quality_rating y última actividad; activar/desactivar founder_price; pausar campañas de un tenant; ver events_log; métricas globales (MRR, churn, activación, mensajes enviados/costo estimado USD). Sencillo, tabla + filtros, sin florituras.

---

## 7. LANDING DE VENTA (elbuendoctor.com.mx)

Estructura y copy base (afinar redacción, mantener mensajes):
1. **Hero:** H1 "Que te elijan en Google. Que lleguen a su cita. Que regresen." Sub: "ElBuenDoctor convierte a tus pacientes contentos en tu mejor publicidad — todo por WhatsApp, sin que muevas un dedo." CTA verde "Prueba 14 días gratis". Mockup de celular con una alerta de reseña 5⭐.
2. **Barra de datos:** "84% de los pacientes lee reseñas antes de elegir doctor" · "~38% menos inasistencias con confirmación por WhatsApp" · "Cada paciente inactivo es dinero dormido en tu archivo".
3. **Cómo funciona (3 pasos):** Conecta tu Google y tu WhatsApp (15 min) → Tus pacientes reciben la invitación en el momento justo → Tú solo ves crecer tus estrellas.
4. **Los 3 módulos** con captura real y una línea de dinero cada uno ("Un implante recuperado paga 2 años del sistema").
5. **El reporte competitivo:** captura del WhatsApp mensual ("La clínica de enfrente tiene 210 reseñas. Tú, 85. Vamos por ella. 💪").
6. **Comparativa de categoría** (SIN nombrar competidores): tabla "Portales médicos con contrato anual" vs "ElBuenDoctor" → permanencia 12 meses vs sin permanencia · reseñas que viven en su plataforma vs reseñas en Google, tuyas para siempre · muestran a tu competencia junto a tu perfil vs tu página es 100% tuya · desde ~$21,000 por adelantado vs desde $799 al mes.
7. **Precios:** 3 tarjetas, Pro marcado "Más popular", toggle mensual/anual (2 meses gratis).
8. **Testimonios** (placeholder para clientes fundadores) + contador "reseñas generadas con ElBuenDoctor".
9. **FAQ:** ¿necesito saber de tecnología? (no) · ¿esto cumple las reglas de WhatsApp y Google? (sí: flujo con consentimiento y sin filtrado de opiniones, explicado en 2 líneas) · ¿puedo cancelar cuando quiera? (sí, en un clic) · ¿funciona si ya uso Doctoralia u otro software? (sí, somos complemento) · ¿y COFEPRIS? (filtros de cumplimiento integrados en todo lo que generamos).
10. **CTA final** + botón de WhatsApp de ElBuenDoctor para dudas.
Variantes por vertical con el mismo esqueleto: `/dentistas`, `/estetica`, `/control-de-peso` (dolor y ejemplos adaptados; en control de peso, JAMÁS nombrar medicamentos).
SEO título: "ElBuenDoctor — Reseñas de Google y WhatsApp para consultorios y clínicas en México".

---

## 8. PLANTILLAS DE WHATSAPP (crear y someter a aprobación del BSP en Fase 1)

Todas en español, con variables {{n}}. Categorías honestas:
- UTILITY `recordatorio_cita`: "Hola {{1}}, te recordamos tu cita en {{2}} mañana a las {{3}}. ¿Nos confirmas?" Botones: Confirmo ✔ / Necesito reagendar.
- UTILITY `solicitud_resena`: "Hola {{1}}, gracias por tu visita a {{2}} 🙏 ¿Cómo fue tu experiencia?" Botones: 😊 Excelente / 😐 Regular / 😞 Mala.
- MARKETING `reactivacion_optin`: "Hola {{1}} 👋 Soy el asistente de {{2}}, donde te atendiste anteriormente. Estamos actualizando nuestra agenda de pacientes. ¿Te gustaría recibir un beneficio especial para tu próxima visita?" Botones: Sí, me interesa / No, gracias. (Incluir en el cuerpo o footer la vía de baja según requisitos del BSP.)
- MARKETING `reactivacion_beneficio`: "¡Qué gusto, {{1}}! 🎉 {{2}} te ofrece: {{3}}. Agenda aquí: {{4}}. Si ya no deseas mensajes, responde BAJA."
- UTILITY `alerta_dueno_resena` (al dueño): "⭐ Nueva reseña en Google ({{1}}⭐) de {{2}}: '{{3}}'. Respuesta sugerida lista. Responde OK para publicarla o entra al panel."
- UTILITY `reporte_mensual` (al dueño): texto del 6.5.
Procesar "BAJA"/"no"/"stop" en CUALQUIER mensaje entrante como opt-out inmediato.

---

## 9. FLUJO DE PAGOS (Stripe)

- Productos/precios: 3 planes × (mensual, anual con 2 meses gratis), MXN, IVA incluido en el precio.
- Alta: al terminar el trial (o antes, botón "Activar mi plan"), Stripe Checkout. Webhook activa el plan.
- founder_price: aplicar cupón Stripe del 50% forever creado por seed.
- Portal de cliente de Stripe para: cambiar tarjeta, cambiar plan, cancelar (efectiva al fin del periodo; sin retención agresiva — un solo mensaje "¿nos cuentas por qué?" opcional).
- Si el pago falla: gracia de 7 días con avisos por WhatsApp/email; después, estado 'pausado' (micro-página sigue viva 30 días más con banner interno para el dueño; mensajes salientes pausados).
- Excedentes de marketing: registrar y cobrar como invoice item mensual a $1.00 MXN c/u.

---

## 10. INVARIANTES DE CUMPLIMIENTO (NINGÚN código puede violarlas)

### 10.1 WhatsApp / Meta
- Registrar evidencia de TODO opt-in (contacts.opt_in_evidencia). Ningún Marketing sin opt-in activo o flujo de re-opt-in. Ningún envío a exclusion_list — verificar SIEMPRE antes de encolar.
- Toda plantilla Marketing con vía de baja visible; procesar bajas escritas al instante.
- Categorías honestas (recordatorios=Utility, reactivación=Marketing). Goteo gradual + freno automático por quality rating, no desactivable.
- Respetar límites del plan leyendo usage_counters ANTES de encolar; al llegar al límite, avisar al dueño y detener.

### 10.2 Google
- Consentimiento expreso registrado del tenant para publicar respuestas en su nombre (checkbox propio en onboarding + toggle de auto-publicación con registro).
- Cero incentivos por reseñas. Cero review gating: el link a Google visible para TODOS los caminos del flujo de satisfacción.

### 10.3 COFEPRIS / secreto médico / LFPDPPP
- FILTRO DE CUMPLIMIENTO (función central en `lib/ai/compliance.ts`, usada por carruseles y por cualquier texto público generado): EXCLUIR/reescribir contenido que mencione medicamentos por nombre, cifras de peso o resultados clínicos, "me curó", "garantizado", condiciones médicas específicas, o superlativos ("el mejor de..."). PRIORIZAR trato, profesionalismo, puntualidad, instalaciones. Autores solo con inicial de apellido.
- Respuestas a reseñas: jamás confirmar condición de paciente ni tratamientos.
- Cédula profesional visible en micro-página; aviso de privacidad autogenerado en cada micro-página y en /opina/{slug}.
- Términos de servicio y aviso de privacidad de ElBuenDoctor (genera borradores razonables marcados "REVISAR POR ABOGADO"): el cliente es responsable del contenido que publica y de la licitud de su base de datos; la plataforma provee herramientas y filtros.

---

## 11. PRINCIPIOS DE UI (no negociables)

1. Recepcionista-proof: cada pantalla debe entenderse sin capacitación. Cero jerga ("plantilla HSM", "webhook", "API" prohibidas en la UI).
2. Español mexicano en TODO. Fechas locales, MXN.
3. Mobile-first en micro-páginas y flujo /opina; panel responsive.
4. Ante la duda entre agregar una opción o no: NO se agrega.
5. Estados vacíos con guía ("Aún no tienes reseñas sincronizadas — imprime tu QR y colócalo en recepción hoy").

---

## 12. FASES DE CONSTRUCCIÓN (con criterio de aceptación)

**FASE 1 — Núcleo de reseñas (vendible presencialmente):** setup del repo (Next+Supabase+Tailwind, RLS, seed, .env.example) · auth y wizard de onboarding completo (6.7) · conexión Google en modo degradado + estructura para GBP API · dashboard de reseñas + alertas al dueño · respuestas IA con aprobación (panel y "OK" por WhatsApp) · flujo /opina/{slug} + generador de QR en PDF · embedded signup de WhatsApp + registro de plantillas (sección 8) · micro-página v1 (6.4).
✔ *Aceptación:* con el seed, una clínica nueva completa el onboarding en <15 min, descarga su QR, el flujo /opina funciona end-to-end en el celular y una reseña de prueba genera alerta + respuesta IA aprobable.

**FASE 2 — Retención visible:** agenda simple + recordatorios con botones + inbox de reagendas · trigger asistió→reseña · selección de competidores + snapshots · reporte mensual por WhatsApp · pulido de micro-página (cache reseñas en vivo).
✔ *Aceptación:* una cita seed genera recordatorio, confirmación con botón, marca de asistencia y solicitud de reseña 2h después; el cron mensual produce el mensaje de reporte correcto contra datos seed.

**FASE 3 — Reactivación + carrusel:** carga de Excel con validaciones y checkbox · motor de goteo con re-opt-in, estados y evidencia · monitor de quality rating con pausa automática y panel de salud del número · carrusel semanal con filtro de cumplimiento y plantillas @vercel/og.
✔ *Aceptación:* una campaña seed de 50 contactos corre 3 días simulados respetando límites diarios y de plan; un "No, gracias" cae en exclusion_list y nunca vuelve a recibir; simular rating amarillo pausa todo y notifica; el carrusel excluye una reseña seed que menciona un medicamento.

**FASE 4 — Self-service y venta:** Stripe completo (sección 9) con límites y prompts de upgrade · landing (sección 7) + variantes por vertical · panel super-admin (6.8) · analytics de activación/churn · revisión final de textos con la voz de marca.
✔ *Aceptación:* un usuario desconocido puede registrarse, pagar con tarjeta de prueba, completar onboarding y enviar su primera solicitud sin intervención humana; el super-admin ve el tenant, su MRR y su uso.

Cada fase termina en algo demostrable en un celular. Escribe tests automatizados como mínimo para: límites de mensajes por plan, registro de opt-in/opt-out y exclusion_list, freno de calidad, filtro de cumplimiento y webhooks de Stripe (los caminos donde hay dinero o riesgo legal).

---

## 13. TAREAS FUERA DEL CÓDIGO (para el dueño, NO para Kimi — solo tenlas presentes)
Solicitud de acceso a Google Business Profile API (2–6 semanas; el producto arranca en modo degradado) · verificación de Meta Business y alta en el BSP · alta en Stripe México · búsqueda de marca en IMPI · conexión final del dominio raíz + wildcard al proyecto de Vercel cuando exista.

## 14. QUÉ NO CONSTRUIR (para no perder el foco)
NO expediente clínico, NO facturación CFDI, NO telemedicina, NO app móvil nativa, NO calendario complejo con sincronización externa, NO multi-idioma, NO modo oscuro, NO integraciones con software dental de terceros, NO publicación automática en redes sociales del cliente. Todo eso queda explícitamente fuera del MVP.

---

## 15. PRINCIPIOS DE OPERACIÓN (lecciones de producción — cúmplelos siempre)

1. **Los secretos viven solo en el servidor.** Ninguna API key (Gemini, Stripe, BSP, Google) puede aparecer en HTML/JS descargable por el navegador, en el repo, ni en logs. Todas las llamadas a APIs de pago se hacen desde el servidor. Antes de cada deploy, verifica con un grep que ninguna clave se filtró al bundle del cliente.
2. **Nunca pidas ni pegues claves en el chat.** El dueño coloca sus claves directamente en las variables de entorno de Vercel/Supabase desde su propio navegador. Si una clave llega a aparecer en la conversación, úsala para no bloquear el avance, pero avísale claramente que debe rotarla.
3. **Los límites y contadores se validan del lado del servidor, ANTES de la acción.** El contador de mensajes (usage_counters) se verifica y se incrementa en el servidor antes de encolar cada envío; si el envío falla, se reembolsa el contador. Cualquier contador mostrado en la UI es decorativo, jamás la fuente de verdad.
4. **La verdad antes que el reclamo: verifica antes de afirmar.** Nunca declares que algo funciona sin haberlo comprobado tú mismo end-to-end. Cada fase se prueba corriendo el funnel completo con datos seed (y las pruebas de WhatsApp contra los números del dueño) antes de reportarla como terminada.
5. **Entrega una cuenta de prueba al dueño.** Al terminar la Fase 1 y de nuevo en la Fase 4, deja creado un tenant demo con credenciales y la ruta de clics exacta (registro → onboarding → QR → primera solicitud → alerta) para que el dueño valide en su celular en 5 minutos.
6. **Ningún dato de tarjeta toca nuestro código.** El checkout ocurre siempre en la página hospedada de Stripe. Si alguien pide construir un formulario que capture números de tarjeta, se rechaza y se explica por qué.
7. **El humano conserva la última palabra sobre lo que decide la IA.** Toda salida de IA con consecuencias públicas (respuestas a reseñas, textos de micro-página, selección de carruseles) debe ser revisable, editable y aprobable por el cliente antes de publicarse — con la única excepción del auto-publicar que él activó expresamente.
8. **Los errores son frases humanas dentro de la página, nunca `alert()`.** Toasts/avisos en la UI con lenguaje de recepcionista ("No pudimos enviar el mensaje, lo reintentamos en unos minutos"), jamás errores crudos ni popups bloqueantes. `confirm()` solo para acciones destructivas iniciadas por el usuario.
9. **Sé honesto con los límites en la propia UI.** Donde aplique, decláralo en pantalla: "las reseñas pueden tardar hasta 24h en sincronizarse", "la aprobación de tu número de WhatsApp depende de Meta", "los reportes muestran datos públicos de Google". Nada de promesas que el sistema no controla.
10. **Los archivos subidos son del cliente.** El Excel de pacientes se procesa y sus datos van a la base; el archivo original no se almacena más tiempo del necesario y se elimina. Decláralo en el aviso de privacidad.
11. **Contenido primero, animación después; robustez sobre espectáculo.** La micro-página y la landing deben funcionar perfectas sin JavaScript sofisticado; los adornos se agregan solo cuando lo esencial es sólido y rápido.
12. **El dinero se vuelve real al final, el producto es real desde el minuto uno.** Las Fases 1–3 entregan valor completo y demostrable sin cobrar; Stripe llega en la Fase 4 sobre un producto ya probado. Nunca simules la funcionalidad principal (reseñas/WhatsApp): eso sí debe ser real desde el inicio en las pruebas con los números del dueño.
