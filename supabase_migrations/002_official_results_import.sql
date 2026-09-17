-- ==============================================================================
-- Migration: 002_official_results_import.sql
-- Description: Official MYC Results Import & Evidence Storage (V2.1)
-- Safety: Non-destructive addition of evidence table and storage policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Official Result Sources Table
-- ------------------------------------------------------------------------------

create table if not exists public.official_result_sources (
  id uuid primary key default gen_random_uuid(),
  race_id uuid references public.races(id) on delete cascade not null,
  source_type text check (source_type in ('SCRATCH_SHEET', 'HANDICAP_SHEET', 'COMBINED_SHEET', 'OTHER')) default 'COMBINED_SHEET' not null,
  original_filename text not null,
  storage_path text not null,
  file_size_bytes integer,
  mime_type text,
  provider_name text not null,
  raw_extraction jsonb not null,
  matched_extraction jsonb not null,
  admin_corrections jsonb default '[]'::jsonb not null,
  confirmed_by uuid references auth.users(id) not null,
  confirmed_at timestamptz default timezone('utc'::text, now()) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.official_result_sources enable row level security;

-- Only verified app administrators can view, insert, or delete source evidence records
create policy "Admins can view result sources"
  on public.official_result_sources for select
  to authenticated
  using (public.is_app_admin());

create policy "Admins can insert result sources"
  on public.official_result_sources for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Admins can update result sources"
  on public.official_result_sources for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Admins can delete result sources"
  on public.official_result_sources for delete
  to authenticated
  using (public.is_app_admin());

-- ------------------------------------------------------------------------------
-- 2. Link Race Results to Evidence Source
-- ------------------------------------------------------------------------------

alter table public.race_results
  add column if not exists import_source_id uuid references public.official_result_sources(id) on delete set null,
  add column if not exists is_manually_corrected boolean default false not null;

-- ------------------------------------------------------------------------------
-- 3. Supabase Storage Bucket Configuration & RLS
-- ------------------------------------------------------------------------------

-- Insert private bucket 'race-evidence' into storage.buckets if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'race-evidence',
  'race-evidence',
  false,
  10485760, -- 10MB limit
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'application/pdf'];

-- Storage RLS: Restrict bucket access strictly to verified app administrators
create policy "Admins can view race evidence objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'race-evidence' 
    and public.is_app_admin()
  );

create policy "Admins can upload race evidence objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'race-evidence' 
    and public.is_app_admin()
  );

create policy "Admins can delete race evidence objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'race-evidence' 
    and public.is_app_admin()
  );
