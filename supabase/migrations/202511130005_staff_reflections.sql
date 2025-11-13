create table if not exists public.staff_reflections (
  id uuid primary key default uuid_generate_v4(),
  owner text not null,
  title text,
  summary text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists staff_reflections_created_idx
  on public.staff_reflections(created_at desc);

insert into public.staff_reflections (id, owner, title, summary, tags, created_at)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Tom',
    'Route 4B micro-delay',
    'Reload stop added 8 minutes; automation text fired correctly. Need faster manifest share.',
    array['logistics','automation'],
    now() - interval '15 minutes'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Ranya',
    'Foam injector recalibration',
    'Pressure sensor drifted 2%. Reset with manual override. Capture trending metrics nightly.',
    array['maintenance'],
    now() - interval '35 minutes'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Ken',
    'Menu allergen visibility',
    'Guests need immediate allergen callouts. Request surfaced to Menu Builder backlog.',
    array['menu','guest'],
    now() - interval '50 minutes'
  )
on conflict (id) do nothing;
