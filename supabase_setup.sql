-- 1. Create 'cards' table
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  name text,
  data jsonb,
  updated_at timestamptz default now()
);

-- 2. Enable RLS (Row Level Security)
alter table public.cards enable row level security;

-- 3. Create Policy: Allow Anonymous Read/Write (Since we have no Auth)
-- WARNING: This makes the DB public. For a demo/tool, this is fine.
create policy "Public Cards Access"
on public.cards
for all
using (true)
with check (true);

-- 4. Create Storage Bucket for Images
insert into storage.buckets (id, name, public)
values ('card-assets', 'card-assets', true)
on conflict (id) do nothing;

-- 5. Storage Policies (Public Uploads)
create policy "Public Asset Access"
on storage.objects
for all
using ( bucket_id = 'card-assets' )
with check ( bucket_id = 'card-assets' );
