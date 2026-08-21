-- ElBuenDoctor — Esquema inicial (SPEC §5)
-- Regla de oro: una clínica = un tenant. RLS con tenant_id en TODAS las tablas de datos.
-- Aplicar en el proyecto de Supabase del dueño: supabase db push

create extension if not exists "pgcrypto";

-- ---------- Tablas ----------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  vertical text not null check (vertical in ('dental','especialista','estetica','peso')),
  plan text not null default 'trial' check (plan in ('trial','solo','pro','clinica')),
  slug text not null unique,
  colores jsonb not null default '{"primario":"#0D6E5F","acento":"#F2B01E","fondo":"#FAF7F0"}',
  logo_url text,
  cedula_profesional text not null default '', -- se exige en el onboarding (campo obligatorio)
  direccion text not null default '',
  doctor_nombre text not null default '',
  servicios text[] not null default '{}',
  fotos text[] not null default '{}',
  pagina_titular text,
  pagina_descripcion text,
  onboarding_completado boolean not null default false,
  tono_respuestas text not null default 'cercano' check (tono_respuestas in ('formal','cercano')),
  autopublicar_resenas boolean not null default false,
  autopublicar_consent_at timestamptz,
  founder_price boolean not null default false,
  estado_suscripcion text not null default 'trial' check (estado_suscripcion in ('trial','activa','pausada','cancelada')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  rol text not null check (rol in ('dueno','recepcion')),
  nombre text not null,
  whatsapp_personal text not null default '',
  created_at timestamptz not null default now()
);

create table wa_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  proveedor text not null default 'gupshup',
  waba_id text,
  phone_number_id text,
  numero_display text not null default '',
  quality_rating text check (quality_rating in ('green','yellow','red')),
  messaging_tier int,
  estado text not null default 'pendiente' check (estado in ('pendiente','activo','pausado')),
  created_at timestamptz not null default now()
);

create table google_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  gbp_location_id text,
  place_id text,
  oauth_tokens_cifrados text, -- cifrado a nivel de aplicación, clave en env (SPEC §5)
  modo text not null default 'degradado' check (modo in ('api','degradado')),
  negocio_nombre text not null default '',
  ultima_sync timestamptz,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  review_id_google text not null,
  rating int not null check (rating between 1 and 5),
  texto text not null default '',
  autor_nombre text not null default '',
  fecha_review timestamptz not null,
  respondida boolean not null default false,
  respuesta_ia text,
  respuesta_publicada text,
  estado text not null default 'nueva' check (estado in ('nueva','pendiente_aprobacion','aprobada','publicada','ignorada')),
  created_at timestamptz not null default now(),
  unique (tenant_id, review_id_google) -- idempotencia de sincronización
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  place_id text not null,
  nombre text not null,
  rating numeric not null default 0,
  total_reviews int not null default 0,
  snapshot_fecha timestamptz not null default now()
  -- máx 3 por tenant: se valida en la aplicación y con trigger abajo
);

create or replace function max_tres_competidores() returns trigger as $$
begin
  if (select count(*) from competitors where tenant_id = new.tenant_id) >= 3 then
    raise exception 'Máximo 3 competidores por clínica';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger competitors_max3
  before insert on competitors
  for each row execute function max_tres_competidores();

create table contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  telefono text not null, -- E.164
  nombre text not null,
  origen text not null check (origen in ('excel','cita','micropagina','manual')),
  opt_in_status text not null default 'pendiente' check (opt_in_status in ('pendiente','activo','baja')),
  opt_in_evidencia jsonb, -- {fecha, canal, mensaje, respuesta}
  ultima_visita date,
  created_at timestamptz not null default now(),
  unique (tenant_id, telefono)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  fecha_hora timestamptz not null,
  nota text not null default '',
  estado text not null default 'agendada' check (estado in ('agendada','confirmada','reagendar','asistio','no_asistio','cancelada')),
  review_solicitada boolean not null default false,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tipo text not null default 'reactivacion',
  nombre text not null,
  estado text not null default 'borrador' check (estado in ('borrador','activa','pausada_calidad','pausada_manual','terminada')),
  limite_diario int not null default 25,
  enviados_hoy int not null default 0,
  plantilla_oferta text not null default '',
  created_at timestamptz not null default now()
);

create table campaign_contacts (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviado','respondio_si','respondio_no','sin_respuesta','fallido')),
  enviado_at timestamptz,
  primary key (campaign_id, contact_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  direccion text not null check (direccion in ('in','out')),
  categoria text not null check (categoria in ('utility','marketing','service')),
  template_name text,
  cuerpo text not null,
  estado text not null default 'encolado' check (estado in ('encolado','enviado','entregado','leido','fallido')),
  error_code text,
  costo_usd numeric,
  created_at timestamptz not null default now()
);

create table usage_counters (
  tenant_id uuid not null references tenants(id) on delete cascade,
  mes text not null, -- 'YYYY-MM'
  utility_usados int not null default 0,
  marketing_usados int not null default 0,
  primary key (tenant_id, mes)
);

-- NUNCA se borra; se consulta antes de CUALQUIER envío (SPEC §10.1)
create table exclusion_list (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  telefono text not null,
  motivo text not null check (motivo in ('opt_out','rebote','reporte')),
  fecha timestamptz not null default now(),
  unique (tenant_id, telefono)
);

create table events_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  tipo text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table opinions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  satisfaccion text not null check (satisfaccion in ('excelente','regular','mala')),
  comentario_privado text,
  fue_a_google boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security: tenant_id en TODAS las tablas ----------

create or replace function mi_tenant() returns uuid as $$
  select tenant_id from users where id = auth.uid()
$$ language sql security definer stable;

do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants','wa_accounts','google_accounts','reviews','competitors',
    'contacts','appointments','campaigns','messages','usage_counters',
    'exclusion_list','events_log','opinions'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "aislamiento_tenant" on %I using (tenant_id = mi_tenant()) with check (tenant_id = mi_tenant());',
      t
    );
  end loop;
end $$;

-- users: cada usuario solo ve los usuarios de su propia clínica
alter table users enable row level security;
create policy "usuarios_mismo_tenant" on users
  using (tenant_id = mi_tenant())
  with check (tenant_id = mi_tenant());

-- campaign_contacts: hereda el aislamiento vía su campaña
alter table campaign_contacts enable row level security;
create policy "aislamiento_campaign_contacts" on campaign_contacts
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.tenant_id = mi_tenant()));

-- Índices de soporte
create index reviews_tenant_estado on reviews (tenant_id, estado);
create index messages_tenant_fecha on messages (tenant_id, created_at desc);
create index contacts_tenant_tel on contacts (tenant_id, telefono);
create index exclusion_tenant_tel on exclusion_list (tenant_id, telefono);
create index appointments_tenant_fecha on appointments (tenant_id, fecha_hora);
