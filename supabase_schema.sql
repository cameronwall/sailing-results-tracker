-- Run this in the Supabase SQL Editor

create table boats (
  id uuid primary key default gen_random_uuid(),
  skipper text not null,
  boat_name text,
  sail_number text not null,
  results jsonb default '[]', -- Stores the array of race results [null, 1, 4, null...]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table boats enable row level security;

-- Policy: Allow anonymous read access (For Public View)
create policy "Allow public read access"
  on boats for select
  to anon
  using (true);

-- Policy: Allow anonymous insert (For Admin View)
create policy "Allow public insert access"
  on boats for insert
  to anon
  with check (true);

-- Policy: Allow anonymous update (For Admin View)
create policy "Allow public update access"
  on boats for update
  to anon
  using (true);
  
-- Policy: Allow anonymous delete (For Admin Reset)
create policy "Allow public delete access"
  on boats for delete
  to anon
  using (true);
