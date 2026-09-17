-- ==============================================================================
-- ROLLBACK SCRIPT: rollback_001_keg_cup_2026_27.sql
-- PROJECT: Manly Yacht Club Keg Cup 2026/27
-- PURPOSE:
-- Safely roll back the 001_keg_cup_2026_27 migration if required.
-- Restores boats table RLS to public read and drops new tables/triggers.
-- IMPORTANT: Preserves hardened security on 'boats' table.
-- Does NOT restore anonymous insert/update/delete permissions!
-- ==============================================================================

-- 1. Drop Qualifier Immutability Trigger
drop trigger if exists trg_check_qualifiers_locked_update on public.season_qualifiers;
drop function if exists public.check_qualifiers_locked();

-- 2. Drop New Tables
drop table if exists public.qualifier_audit_log cascade;
drop table if exists public.season_qualifiers cascade;
drop table if exists public.race_results cascade;
drop table if exists public.races cascade;
drop table if exists public.seasons cascade;
drop table if exists public.app_admins cascade;

-- 3. Drop Helper Function
drop function if exists public.is_app_admin();

-- 4. Preserve Secure RLS on 'boats'
-- Remove admin policies, but DO NOT restore the old insecure anonymous write/delete policies!
drop policy if exists "Allow admins insert access" on public.boats;
drop policy if exists "Allow admins update access" on public.boats;
drop policy if exists "Allow admins delete access" on public.boats;

-- Public users retain read-only access
drop policy if exists "Allow public read access" on public.boats;
create policy "Allow public read access"
  on public.boats for select
  to anon, authenticated
  using (true);

-- Note: Historical data inside public.boats remains 100% intact throughout.
