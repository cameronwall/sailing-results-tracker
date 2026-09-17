-- ==============================================================================
-- MIGRATION: 001_keg_cup_2026_27.sql
-- PROJECT: Manly Yacht Club Keg Cup 2026/27
-- PURPOSE:
-- 1. Harden existing 'boats' table RLS (revoke anonymous write/delete).
-- 2. Establish 'app_admins' authorization table and security-definer helper.
-- 3. Create 'seasons', 'races', 'race_results', 'season_qualifiers' tables.
-- 4. Implement database-level qualifier lock protection and audit logging.
-- 5. Guarantee complete backward compatibility: historical data is NOT touched.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. App Admins Table & Authorization Helper
-- ------------------------------------------------------------------------------

create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null unique,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.app_admins enable row level security;

-- Function: Checks whether the currently authenticated user is an authorized app admin.
-- Uses SECURITY DEFINER to safely read public.app_admins inside RLS evaluation.
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = auth.uid()
  );
$$;

-- RLS: Admins can view the admin roster; other users cannot
create policy "Admins can view admin list"
  on public.app_admins for select
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 2. Harden Existing 'boats' Table RLS
-- ------------------------------------------------------------------------------

-- Drop the old insecure anonymous write and delete policies
drop policy if exists "Allow public insert access" on public.boats;
drop policy if exists "Allow public update access" on public.boats;
drop policy if exists "Allow public delete access" on public.boats;

-- Ensure public read remains enabled for public leaderboard viewers
drop policy if exists "Allow public read access" on public.boats;
create policy "Allow public read access"
  on public.boats for select
  to anon, authenticated
  using (true);

-- Allow only verified app admins to insert, update, or delete boats
create policy "Allow admins insert access"
  on public.boats for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Allow admins update access"
  on public.boats for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Allow admins delete access"
  on public.boats for delete
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 3. Seasons Table
-- ------------------------------------------------------------------------------

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  qualification_cutoff_date date,
  keg_cup_start_date date,
  participation_threshold numeric default 0.40 not null,
  series_fleet_size integer default 21 not null,
  discard_rules jsonb default '[{"completedRaces": 5, "discards": 1}, {"completedRaces": 10, "discards": 2}, {"completedRaces": 15, "discards": 3}]'::jsonb not null,
  qualifiers_locked boolean default false not null,
  qualifiers_locked_at timestamptz,
  qualifiers_locked_by text,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.seasons enable row level security;

create policy "Allow public read seasons"
  on public.seasons for select
  to anon, authenticated
  using (true);

create policy "Allow admins write seasons"
  on public.seasons for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Allow admins update seasons"
  on public.seasons for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Allow admins delete seasons"
  on public.seasons for delete
  to authenticated
  using (public.is_app_admin());

-- Insert default seasons (Historical 2025/26 and new 2026/27 Keg Cup)
insert into public.seasons (slug, name, is_active, qualifiers_locked)
values 
  ('keg-cup-2025-26', '2025/26 Keg Cup', false, true),
  ('keg-cup-2026-27', '2026/27 Keg Cup', true, false)
on conflict (slug) do nothing;

-- ------------------------------------------------------------------------------
-- 4. Races Table
-- ------------------------------------------------------------------------------

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  race_number integer not null,
  race_date date,
  boats_entered_series integer default 21 not null,
  boats_at_start integer default 12 not null,
  is_completed boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique(season_id, race_number)
);

alter table public.races enable row level security;

create policy "Allow public read races"
  on public.races for select
  to anon, authenticated
  using (true);

create policy "Allow admins write races"
  on public.races for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Allow admins update races"
  on public.races for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Allow admins delete races"
  on public.races for delete
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 5. Race Results Table (Source Data Stored, Scores Derived)
-- ------------------------------------------------------------------------------

create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid references public.races(id) on delete cascade not null,
  boat_id uuid references public.boats(id) on delete cascade not null,
  scratch_place integer,
  handicap_place integer,
  status_code text check (status_code in ('NONE', 'DNC', 'DNS', 'DNF', 'DSQ')) default 'NONE' not null,
  calculated_score numeric,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(race_id, boat_id)
);

alter table public.race_results enable row level security;

create policy "Allow public read race_results"
  on public.race_results for select
  to anon, authenticated
  using (true);

create policy "Allow admins write race_results"
  on public.race_results for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Allow admins update race_results"
  on public.race_results for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Allow admins delete race_results"
  on public.race_results for delete
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 6. Season Qualifiers Table & Database-Level Lock Enforcement
-- ------------------------------------------------------------------------------

create table if not exists public.season_qualifiers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  boat_id uuid references public.boats(id) on delete cascade not null,
  spring_rank integer not null,
  club_champ_rank integer not null,
  races_sailed integer not null,
  races_available integer not null,
  participation_rate numeric not null,
  qualification_score numeric not null,
  is_eligible boolean default false not null,
  is_qualified boolean default false not null,
  qualification_reason text not null,
  locked_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique(season_id, boat_id)
);

alter table public.season_qualifiers enable row level security;

create policy "Allow public read season_qualifiers"
  on public.season_qualifiers for select
  to anon, authenticated
  using (true);

create policy "Allow admins write season_qualifiers"
  on public.season_qualifiers for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Allow admins update season_qualifiers"
  on public.season_qualifiers for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Allow admins delete season_qualifiers"
  on public.season_qualifiers for delete
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 7. Qualifier Audit Log Table & Immutability Trigger
-- ------------------------------------------------------------------------------

create table if not exists public.qualifier_audit_log (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  action text check (action in ('LOCK', 'UNLOCK', 'AMEND')) not null,
  changed_by uuid references auth.users(id),
  changed_by_email text not null,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.qualifier_audit_log enable row level security;

create policy "Allow admins read qualifier_audit_log"
  on public.qualifier_audit_log for select
  to authenticated
  using (public.is_app_admin());

create policy "Allow admins insert qualifier_audit_log"
  on public.qualifier_audit_log for insert
  to authenticated
  with check (public.is_app_admin());

-- Trigger: Prevent mutating season_qualifiers when seasons.qualifiers_locked = true
create or replace function public.check_qualifiers_locked()
returns trigger
language plpgsql
as $$
declare
  v_locked boolean;
begin
  select qualifiers_locked into v_locked
  from public.seasons
  where id = coalesce(NEW.season_id, OLD.season_id);

  if v_locked = true and current_setting('app.allow_qualifier_mutation', true) is distinct from 'true' then
    raise exception 'Cannot modify season qualifiers: Qualifiers are LOCKED for this season. Unlock explicitly through administrative audit workflow first.';
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_check_qualifiers_locked_update on public.season_qualifiers;
create trigger trg_check_qualifiers_locked_update
  before update or delete on public.season_qualifiers
  for each row
  execute function public.check_qualifiers_locked();
