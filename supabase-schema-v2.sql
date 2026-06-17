-- ============================================================
-- THRONG-WALLET // schema migration v2 (Templo del Ahorro)
-- ============================================================
-- Aplica este SQL en Supabase > SQL Editor > New query > Run.
-- Es idempotente: puedes ejecutarlo varias veces sin problema.
-- Añade soporte cloud para las metas de ahorro del Templo.
-- ============================================================

-- Goals (metas de ahorro compartidas del Templo)
create table if not exists goals (
  id text not null,
  household_id uuid not null references households(id) on delete cascade,
  name text,
  target numeric,
  deadline date,
  emoji text,
  created_at bigint,
  contributions jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  primary key (household_id, id)
);
create index if not exists goals_household_idx on goals(household_id);

-- Persistir el "último mes visitado" en app_settings (para el ritual de fin de mes)
alter table app_settings add column if not exists last_visited_month text;

-- Activar Realtime
do $$
begin
  -- goals
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'goals'
  ) then
    alter publication supabase_realtime add table goals;
  end if;
end $$;

-- RLS desactivada (mismo modelo de "UUID = contraseña" que el resto del schema)
alter table goals disable row level security;
