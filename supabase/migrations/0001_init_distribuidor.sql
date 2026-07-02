-- ============================================================================
-- Distribuidor de Leads · Windmar Home — esquema inicial
-- Proyecto Supabase dedicado: "Distribuidor de leads" (ref pyjhmfdfulgylquftmmz)
-- Patrón de motor de agentes + cola de aprobación copiado del "Cerebro" (schema marketing).
-- Todo en schema `public` (proyecto dedicado) → la app lo alcanza con service_role server-side.
-- RLS ON sin políticas = solo service_role accede (seguro por defecto; nada expuesto a anon).
-- ============================================================================

-- ── 1) Gerentes / consultores que reciben leads ───────────────────────────
create table if not exists public.gerentes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,      -- inactivo → no entra a la rotación
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2) Opt-in / Tier 2 / Ajuste POR ZONA (refleja el Dashboard-Leads del Excel) ──
-- zona: SJ1, SJ2, HAT, PON, MAYA, COR  |  PP Hatillo por producto: PPH_SOLAR_ROOFING, PPH_WATER_ANKER
create table if not exists public.gerente_zona (
  id          uuid primary key default gen_random_uuid(),
  gerente_id  uuid not null references public.gerentes(id) on delete cascade,
  zona        text not null,
  opt_in      boolean not null default true,      -- participa en esa zona
  tier2       boolean not null default false,     -- Tier 2 = mitad de leads
  ajuste      integer not null default 0,         -- nivela a los que entraron tarde
  unique (gerente_id, zona)
);

-- ── 3) Black List (con vigencia: 1ª=30d, 2ª=3m, 3ª=permanente) ─────────────
create table if not exists public.blacklist (
  id          uuid primary key default gen_random_uuid(),
  gerente_id  uuid not null references public.gerentes(id) on delete cascade,
  motivo      text,
  desde       date not null default current_date,
  hasta       date,                               -- null = permanente
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 4) Asignaciones = historial de cada lead repartido (el corazón del registro) ──
create table if not exists public.asignaciones (
  id             uuid primary key default gen_random_uuid(),
  lead_id        text,                            -- id del lead en Zoho
  lead_nombre    text,
  lead_numero    text,
  zona           text,
  ruta           text,                            -- digitales | hoy | pp_hatillo | consultor | espera
  producto       text,                            -- para PP Hatillo (Solar-Roofing / Water-Anker)
  gerente_id     uuid references public.gerentes(id) on delete set null,
  gerente_nombre text,
  decidido_por   text,                            -- bot | analista | <nombre>
  estado         text not null default 'sugerida',-- sugerida | aprobada | escrita | rechazada | reasignada
  zoho_escrito   boolean not null default false,  -- ya se escribió en Zoho?
  quality_stage  text,                            -- estado al que avanzó (ej. Cita Confirmada)
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_asig_created on public.asignaciones (created_at desc);
create index if not exists idx_asig_lead    on public.asignaciones (lead_id);
create index if not exists idx_asig_gerente on public.asignaciones (gerente_id);

-- ── 5) Motor de agentes (patrón Cerebro) → alimenta el feed de Pixel Agents ──
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_slug  text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running',    -- running | ok | error
  input       jsonb,
  output      jsonb,
  tokens      integer,
  cost_usd    numeric,
  error       text
);
create index if not exists idx_runs_started on public.agent_runs (started_at desc);

create table if not exists public.agent_outputs (
  id          uuid primary key default gen_random_uuid(),
  agent_slug  text not null,
  kind        text,                               -- asignacion | nota | aviso ...
  title       text,
  content     text,
  tags        text[] default array['agent']::text[],
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_outputs_created on public.agent_outputs (created_at desc);

-- ── 6) Cola de aprobación humana (Miguel aprueba) — adaptada a leads ────────
create table if not exists public.approvals (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  requested_by      text default 'distribuidor',
  action            text not null default 'asignar_lead',
  lead_id           text,
  lead_nombre       text,
  gerente_sugerido  text,
  zona              text,
  ruta              text,
  reason            text,
  payload           jsonb,
  status            text not null default 'pending',  -- pending | approved | rejected
  decided_by        text,
  decided_at        timestamptz,
  note              text
);
create index if not exists idx_approvals_status on public.approvals (status, created_at desc);

-- ── RLS: ON sin políticas → solo service_role (server) accede ───────────────
alter table public.gerentes      enable row level security;
alter table public.gerente_zona  enable row level security;
alter table public.blacklist     enable row level security;
alter table public.asignaciones  enable row level security;
alter table public.agent_runs    enable row level security;
alter table public.agent_outputs enable row level security;
alter table public.approvals     enable row level security;
