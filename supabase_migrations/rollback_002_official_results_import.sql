-- ==============================================================================
-- Rollback Migration: rollback_002_official_results_import.sql
-- Description: Safely rolls back V2.1 results import additions without touching V2.0 core tables.
-- ==============================================================================

-- 1. Drop Storage policies
drop policy if exists "Admins can view race evidence objects" on storage.objects;
drop policy if exists "Admins can upload race evidence objects" on storage.objects;
drop policy if exists "Admins can delete race evidence objects" on storage.objects;

-- 2. Remove bucket registration
delete from storage.buckets where id = 'race-evidence';

-- 3. Remove columns from race_results
alter table public.race_results
  drop column if exists import_source_id,
  drop column if exists is_manually_corrected;

-- 4. Drop table and policies
drop table if exists public.official_result_sources cascade;
