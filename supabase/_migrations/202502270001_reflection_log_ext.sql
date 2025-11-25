-- Extend staff reflections table with richer metadata and add prompt/tag catalogs

alter table if exists public.staff_reflections
  add column if not exists staff_id uuid references public.staff(id) on delete set null,
  add column if not exists role text,
  add column if not exists shift_label text,
  add column if not exists context text,
  add column if not exists sentiment text default 'calm',
  add column if not exists schedule_entry_id uuid,
  add column if not exists event_id uuid references public.private_events(id) on delete set null,
  add column if not exists reference_url text,
  add column if not exists updated_at timestamptz default now();

create or replace function public.touch_staff_reflections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_staff_reflections_updated on public.staff_reflections;
create trigger trg_staff_reflections_updated
before update on public.staff_reflections
for each row
execute procedure public.touch_staff_reflections_updated_at();

create table if not exists public.reflection_tag_catalog (
  slug text primary key,
  label text not null,
  tone text default 'calm',
  accent_color text default '#8bcdf9',
  description text,
  created_at timestamptz default now()
);

insert into public.reflection_tag_catalog (slug, label, tone, accent_color, description)
values
  ('service', 'Service', 'alert', '#7dd3fc', 'Signals from the floor during service blocks'),
  ('prep', 'Prep', 'calm', '#a7f3d0', 'Prep cadence, mise, and staging reflections'),
  ('team', 'Team', 'warm', '#f9a8d4', 'People, coaching, and collaboration notes'),
  ('incident', 'Incident', 'critical', '#f87171', 'Escalations and blockers that need attention'),
  ('win', 'Win', 'celebration', '#fde68a', 'Moments of delight worth repeating')
on conflict (slug) do update set
  label = excluded.label,
  tone = excluded.tone,
  accent_color = excluded.accent_color,
  description = excluded.description;

create table if not exists public.reflection_prompts (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  cadence text,
  tags text[] default '{}',
  audience text default 'staff',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.touch_reflection_prompts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reflection_prompts_updated on public.reflection_prompts;
create trigger trg_reflection_prompts_updated
before update on public.reflection_prompts
for each row
execute procedure public.touch_reflection_prompts_updated_at();

insert into public.reflection_prompts (id, text, cadence, tags, sort_order)
values
  (
    '44444444-4444-4444-4444-444444444444',
    'What slowed the floor down this block?',
    'Shift start',
    array['service','incident'],
    1
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Who needs backup before 22:00?',
    'Pre-service',
    array['team','service'],
    2
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Which menu items should be paused tonight?',
    'Menu huddle',
    array['prep','service'],
    3
  )
on conflict (id) do update set
  text = excluded.text,
  cadence = excluded.cadence,
  tags = excluded.tags,
  sort_order = excluded.sort_order,
  is_active = true;


