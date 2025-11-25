-- Adds mailing_list_signups table for public mailing list capture

create table if not exists public.mailing_list_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'landing',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists mailing_list_signups_email_idx
  on public.mailing_list_signups (email);

alter table public.mailing_list_signups enable row level security;

drop policy if exists "Service role manages mailing list" on public.mailing_list_signups;
create policy "Service role manages mailing list"
on public.mailing_list_signups
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

