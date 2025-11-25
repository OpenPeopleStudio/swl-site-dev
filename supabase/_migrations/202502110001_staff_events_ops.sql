-- Adds operational requirements column and event notes table for staff events workflow

alter table if exists public.private_events
add column if not exists operational_requirements jsonb default '{}'::jsonb;

create table if not exists public.event_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.private_events (id) on delete cascade,
  note_type text,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists event_notes_event_idx
  on public.event_notes (event_id);

alter table public.event_notes enable row level security;

drop policy if exists "Service role can manage event_notes" on public.event_notes;
create policy "Service role can manage event_notes"
on public.event_notes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');


