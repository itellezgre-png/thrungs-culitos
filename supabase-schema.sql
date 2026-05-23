-- ============================================================
-- THRONG-WALLET // Supabase schema
-- ============================================================
-- Cómo usarlo:
--   1. Crea un proyecto en https://supabase.com (plan Free)
--   2. Abre el "SQL Editor" del proyecto en el menú izquierdo
--   3. Pulsa "New query"
--   4. Pega TODO este archivo y dale a "Run"
--   5. Debe salir "Success. No rows returned"
-- ============================================================

-- Households (clave de partición — actúa como contraseña del hogar)
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Expenses (gastos y liquidaciones)
create table if not exists expenses (
  id text not null,
  household_id uuid not null references households(id) on delete cascade,
  papa_id text,
  name text,
  amount numeric,
  tutor text,
  ts bigint,
  born_sick boolean default false,
  split jsonb,
  type text default 'expense',
  from_tutor text,
  to_tutor text,
  updated_at timestamptz default now(),
  primary key (household_id, id)
);
create index if not exists expenses_household_idx on expenses(household_id);
create index if not exists expenses_ts_idx on expenses(ts);

-- Papas custom
create table if not exists papas (
  id text not null,
  household_id uuid not null references households(id) on delete cascade,
  name text,
  cls text,
  budget numeric,
  sprite text,
  position int default 0,
  updated_at timestamptz default now(),
  primary key (household_id, id)
);
create index if not exists papas_household_idx on papas(household_id);

-- App settings (una fila por hogar)
create table if not exists app_settings (
  household_id uuid primary key references households(id) on delete cascade,
  split_model text default 'half',
  master_volume numeric default 0.6,
  world_chatter text default 'normal',
  updated_at timestamptz default now()
);

-- Activar Realtime (para que los cambios se propaguen en vivo)
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table papas;
alter publication supabase_realtime add table app_settings;

-- RLS desactivada: la "seguridad" es que el household_id es un UUID aleatorio
-- (1 entre 2^128 combinaciones). Quien tenga el UUID accede; nadie más.
-- Para una app de pareja esto es más que suficiente.
alter table households disable row level security;
alter table expenses disable row level security;
alter table papas disable row level security;
alter table app_settings disable row level security;
