-- Snow White Laundry Supabase schema

create extension if not exists pgcrypto;

create table if not exists staff_access (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  must_reset boolean default false,
  role text default 'staff',
  created_at timestamptz default now()
);

create table if not exists public.staff (
  id uuid primary key,
  full_name text,
  role text,
  avatar_url text,
  email text unique,
  last_synced timestamptz default now()
);

create or replace function public.sync_staff_from_auth()
returns trigger as $$
begin
  insert into public.staff (id, full_name, role, avatar_url, email, last_synced)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    now()
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      avatar_url = excluded.avatar_url,
      email = excluded.email,
      last_synced = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_change on auth.users;
create trigger on_auth_user_change
after insert or update on auth.users
for each row execute procedure public.sync_staff_from_auth();

alter table if exists public.messages
  drop constraint if exists messages_user_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'messages_staff_user_id_fkey'
      and n.nspname = 'public'
      and t.relname = 'messages'
  ) then
    alter table if exists public.messages
      add constraint messages_staff_user_id_fkey
      foreign key (user_id) references public.staff(id) on delete set null;
  end if;
end;
$$;

alter table if exists public.messages
  add column if not exists parent_id uuid references public.messages(id);

alter table if exists public.messages
  add column if not exists updated_at timestamptz default now(),
  add column if not exists edited_at timestamptz,
  add column if not exists deleted boolean default false,
  add column if not exists deleted_at timestamptz;

create or replace function public.set_message_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_message_updated_at on public.messages;
create trigger set_message_updated_at
before update on public.messages
for each row
execute procedure public.set_message_updated_at();

create index if not exists messages_parent_id_idx
  on public.messages(parent_id);

alter table if exists public.private_events
  add column if not exists proposal_text text,
  add column if not exists proposal_pdf_url text,
  add column if not exists contract_signed boolean default false,
  add column if not exists photos jsonb default '[]',
  add column if not exists reflection_prompt_sent boolean default false;

alter table public.messages enable row level security;

drop policy if exists "read all messages" on public.messages;
create policy "read all messages"
on public.messages
for select
using (true);

drop policy if exists "insert own message" on public.messages;
create policy "insert own message"
on public.messages
for insert
with check (auth.uid() = user_id);

insert into staff_access (email, password_hash, role, must_reset)
values
  ('tom@openpeople.ai', crypt('opendeck', gen_salt('bf')), 'staff', false),
  ('ken@snowwhitelaundry.co', crypt('temppass', gen_salt('bf')), 'staff', false),
  ('emma@snowwhitelaundry.co', crypt('temppass', gen_salt('bf')), 'staff', false),
  ('toml_ne@icloud.com', crypt('test', gen_salt('bf')), 'customer', false)
on conflict (email) do nothing;

create table if not exists public.staff_reflections (
  id uuid primary key default gen_random_uuid(),
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

-- POS schema ---------------------------------------------------------------

create table if not exists public.pos_zones (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.pos_tables (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.pos_zones(id) on delete set null,
  slug text unique not null,
  label text not null,
  seat_count integer not null default 2,
  can_combine boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_pos_tables_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pos_tables_updated on public.pos_tables;
create trigger trg_pos_tables_updated
before update on public.pos_tables
for each row execute procedure public.set_pos_tables_updated_at();

create table if not exists public.pos_menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  accent_color text default '#ffffff',
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.pos_menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.pos_menu_categories(id) on delete cascade,
  slug text unique not null,
  name text not null,
  price numeric(10,2) not null,
  tags text[] default '{}',
  modifier_key text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.pos_modifier_options (
  id uuid primary key default gen_random_uuid(),
  modifier_key text not null,
  option_code text not null,
  label text not null,
  default_applied boolean default false,
  sort_order integer default 0,
  unique (modifier_key, option_code)
);

create table if not exists public.pos_tickets (
  id uuid primary key default gen_random_uuid(),
  table_ids uuid[] not null default '{}',
  table_slugs text[] not null default '{}',
  seat_map jsonb default '[]',
  guest_names text[] default '{}',
  status text not null default 'ordering',
  current_course text,
  receipt_note text,
  last_fire_at timestamptz,
  seated_at timestamptz default now(),
  revision integer not null default 0,
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.bump_pos_ticket_revision()
returns trigger as $$
begin
  new.updated_at = now();
  new.revision = old.revision + 1;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pos_ticket_revision on public.pos_tickets;
create trigger trg_pos_ticket_revision
before update on public.pos_tickets
for each row execute procedure public.bump_pos_ticket_revision();

create table if not exists public.pos_ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.pos_tickets(id) on delete cascade,
  menu_item_id uuid references public.pos_menu_items(id) on delete set null,
  display_name text not null,
  seat_label text not null,
  price numeric(10,2) not null,
  qty integer not null default 1,
  modifier_key text,
  modifiers text[] default '{}',
  comp boolean default false,
  split_mode text default 'none',
  transfer_to text,
  custom_split_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.touch_pos_ticket_lines()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pos_ticket_lines_updated on public.pos_ticket_lines;
create trigger trg_pos_ticket_lines_updated
before update on public.pos_ticket_lines
for each row execute procedure public.touch_pos_ticket_lines();

create table if not exists public.pos_payments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.pos_tickets(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null,
  status text not null default 'pending',
  reference_id text,
  recorded_by text,
  created_at timestamptz default now()
);

create index if not exists pos_payments_ticket_idx
  on public.pos_payments(ticket_id);

create table if not exists public.pos_audit_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.pos_tickets(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists pos_audit_log_ticket_idx
  on public.pos_audit_log(ticket_id);

alter table public.pos_tables enable row level security;
alter table public.pos_menu_categories enable row level security;
alter table public.pos_menu_items enable row level security;
alter table public.pos_modifier_options enable row level security;
alter table public.pos_tickets enable row level security;
alter table public.pos_ticket_lines enable row level security;

drop policy if exists "read pos tables" on public.pos_tables;
create policy "read pos tables"
on public.pos_tables
for select
using (true);

drop policy if exists "read menu categories" on public.pos_menu_categories;
create policy "read menu categories"
on public.pos_menu_categories
for select
using (true);

drop policy if exists "read menu items" on public.pos_menu_items;
create policy "read menu items"
on public.pos_menu_items
for select
using (true);

drop policy if exists "read modifier options" on public.pos_modifier_options;
create policy "read modifier options"
on public.pos_modifier_options
for select
using (true);

drop policy if exists "service manage tickets" on public.pos_tickets;
create policy "service manage tickets"
on public.pos_tickets
using (true)
with check (true);

drop policy if exists "service manage ticket lines" on public.pos_ticket_lines;
create policy "service manage ticket lines"
on public.pos_ticket_lines
using (true)
with check (true);

insert into public.pos_zones (id, slug, label, sort_order)
values
  ('00000000-0000-0000-0000-000000000101', 'dining', 'Dining Room', 10),
  ('00000000-0000-0000-0000-000000000102', 'chef', 'Chef Counter', 20),
  ('00000000-0000-0000-0000-000000000103', 'bar', 'Bar', 30)
on conflict (id) do update
set slug = excluded.slug,
    label = excluded.label,
    sort_order = excluded.sort_order;

insert into public.pos_tables (id, zone_id, slug, label, seat_count, can_combine, sort_order)
values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 'd-01', 'Dining 01', 2, true, 10),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'd-02', 'Dining 02', 2, true, 20),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000101', 'd-03', 'Dining 03', 2, true, 30),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000101', 'd-04', 'Dining 04', 4, true, 40),
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000102', 'chef-1', 'Chef 1', 1, false, 10),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000102', 'chef-2', 'Chef 2', 1, false, 20),
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000103', 'bar-1', 'Bar 1', 1, false, 10),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000103', 'bar-2', 'Bar 2', 1, false, 20)
on conflict (id) do update
set zone_id = excluded.zone_id,
    slug = excluded.slug,
    label = excluded.label,
    seat_count = excluded.seat_count,
    can_combine = excluded.can_combine,
    sort_order = excluded.sort_order;

insert into public.pos_menu_categories (id, slug, label, accent_color, sort_order)
values
  ('00000000-0000-0000-0000-000000010001', 'snacks', 'Snacks', '#00FF9C', 10),
  ('00000000-0000-0000-0000-000000010002', 'plates', 'Plates', '#8A7CFF', 20),
  ('00000000-0000-0000-0000-000000010003', 'desserts', 'Desserts', '#FF82E0', 30),
  ('00000000-0000-0000-0000-000000010004', 'pairings', 'Pairings', '#42D9FF', 40)
on conflict (id) do update
set slug = excluded.slug,
    label = excluded.label,
    accent_color = excluded.accent_color,
    sort_order = excluded.sort_order;

insert into public.pos_menu_items (id, category_id, slug, name, price, tags, modifier_key, sort_order)
values
  ('00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000010001', 'shiso-spritz', 'Shiso Spritz', 18, array['bev'], 'shiso', 10),
  ('00000000-0000-0000-0000-000000020002', '00000000-0000-0000-0000-000000010001', 'sea-lettuce-chip', 'Sea Lettuce Chip', 12, null, 'chip', 20),
  ('00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000010001', 'coal-pearls', 'Coal Pearls', 15, null, null, 30),
  ('00000000-0000-0000-0000-000000020101', '00000000-0000-0000-0000-000000010002', 'charred-oyster', 'Charred Oyster', 28, null, 'oyster', 10),
  ('00000000-0000-0000-0000-000000020102', '00000000-0000-0000-0000-000000010002', 'ember-beet', 'Ember Beet', 24, null, null, 20),
  ('00000000-0000-0000-0000-000000020103', '00000000-0000-0000-0000-000000010002', 'river-trout', 'River Trout', 34, null, null, 30),
  ('00000000-0000-0000-0000-000000020104', '00000000-0000-0000-0000-000000010002', 'aged-duck', 'Aged Duck', 42, null, 'duck', 40),
  ('00000000-0000-0000-0000-000000020201', '00000000-0000-0000-0000-000000010003', 'black-sesame-cloud', 'Black Sesame Cloud', 16, null, null, 10),
  ('00000000-0000-0000-0000-000000020202', '00000000-0000-0000-0000-000000010003', 'frozen-yuzu-leaf', 'Frozen Yuzu Leaf', 14, null, null, 20),
  ('00000000-0000-0000-0000-000000020301', '00000000-0000-0000-0000-000000010004', 'wine-pairing', 'Wine Pairing', 68, null, null, 10),
  ('00000000-0000-0000-0000-000000020302', '00000000-0000-0000-0000-000000010004', 'na-pairing', 'NA Pairing', 48, null, null, 20)
on conflict (id) do update
set category_id = excluded.category_id,
    slug = excluded.slug,
    name = excluded.name,
    price = excluded.price,
    tags = excluded.tags,
    modifier_key = excluded.modifier_key,
    sort_order = excluded.sort_order;

insert into public.pos_modifier_options (modifier_key, option_code, label, default_applied, sort_order)
values
  ('shiso', 'zero-proof', 'Zero-proof version', false, 10),
  ('shiso', 'less-sweet', 'Less sweet', false, 20),
  ('chip', 'no-sesame', 'No sesame', false, 10),
  ('chip', 'extra-crisp', 'Extra crisp', false, 20),
  ('oyster', 'allium-free', 'Remove allium', false, 10),
  ('oyster', 'extra-caviar', 'Extra caviar', false, 20),
  ('duck', 'medium-rare', 'Cook medium rare', true, 10),
  ('duck', 'sauce-side', 'Sauce on the side', false, 20)
on conflict (modifier_key, option_code) do update
set label = excluded.label,
    default_applied = excluded.default_applied,
    sort_order = excluded.sort_order;

insert into public.pos_tickets (id, table_ids, table_slugs, seat_map, guest_names, status, current_course, receipt_note, last_fire_at, seated_at, revision, created_by, updated_by)
values (
  '00000000-0000-0000-0000-000000030001',
  array['00000000-0000-0000-0000-000000001001']::uuid[],
  array['d-01'],
  jsonb_build_array('d-01-seat-1', 'd-01-seat-2'),
  array['Aya', 'Ken'],
  'ordering',
  'Course II',
  'Celebrating product launch.',
  now() - interval '6 minutes',
  now() - interval '40 minutes',
  1,
  'tom@openpeople.ai',
  'tom@openpeople.ai'
)
on conflict (id) do nothing;

insert into public.pos_ticket_lines (ticket_id, menu_item_id, display_name, seat_label, price, qty, modifier_key, modifiers, comp, split_mode)
values
  (
    '00000000-0000-0000-0000-000000030001',
    '00000000-0000-0000-0000-000000020001',
    'Shiso Spritz',
    'd-01-seat-1',
    18,
    1,
    'shiso',
    array['zero-proof'],
    false,
    'none'
  ),
  (
    '00000000-0000-0000-0000-000000030001',
    '00000000-0000-0000-0000-000000020101',
    'Charred Oyster',
    'd-01-seat-2',
    28,
    2,
    'oyster',
    array['allium-free'],
    false,
    'even'
  )
on conflict (id) do nothing;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  photo_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('boh', 'foh', 'manager', 'owner')),
  assigned_at timestamptz default now()
);

create index if not exists user_roles_role_idx on public.user_roles(role);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists user_preferences_updated_idx
  on public.user_preferences(updated_at desc);

create table if not exists public.user_notifications (
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  updated_at timestamptz default now(),
  primary key (user_id, notification_type)
);

create table if not exists public.device_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_type text not null,
  device_name text not null,
  status text not null default 'active',
  trust_level text default 'pending',
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists device_connections_user_idx
  on public.device_connections(user_id);

create table if not exists public.scale_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  connection_type text not null check (connection_type in ('usb', 'ble', 'wifi')),
  station text,
  auto_sync boolean default false,
  last_calibrated timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mfa_enabled boolean default false,
  last_reset_at timestamptz,
  active_sessions jsonb default '[]'::jsonb,
  trusted_devices jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists user_security_updated_idx
  on public.user_security(updated_at desc);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  performed_by uuid references auth.users(id) on delete set null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists system_logs_action_idx
  on public.system_logs(action, created_at desc);

create table if not exists public.gate_auth_log (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  intent text not null check (intent in ('login', 'register', 'password_reset')),
  success boolean not null,
  role text,
  user_id uuid references auth.users(id) on delete set null,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists gate_auth_log_email_idx
  on public.gate_auth_log(email, created_at desc);

create index if not exists gate_auth_log_success_idx
  on public.gate_auth_log(success, created_at desc);

create index if not exists gate_auth_log_user_id_idx
  on public.gate_auth_log(user_id, created_at desc);

create index if not exists gate_auth_log_created_at_idx
  on public.gate_auth_log(created_at desc);

alter table public.gate_auth_log enable row level security;

drop policy if exists "staff and owners can read gate auth logs" on public.gate_auth_log;
create policy "staff and owners can read gate auth logs"
on public.gate_auth_log
for select
using (
  exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
    and (u.raw_user_meta_data->>'role' in ('staff', 'owner'))
  )
);

drop policy if exists "service role can insert gate auth logs" on public.gate_auth_log;
create policy "service role can insert gate auth logs"
on public.gate_auth_log
for insert
with check (true);

-- POS schema ---------------------------------------------------------------

create table if not exists public.pos_menu_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  color text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pos_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pos_modifiers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.pos_modifier_groups(id) on delete cascade,
  label text not null,
  default_applied boolean default false,
  extra_cost numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pos_menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.pos_menu_categories(id) on delete set null,
  group_id uuid references public.pos_modifier_groups(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  tags text[] default '{}',
  available boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pos_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  zone text not null,
  seats integer not null default 2,
  can_combine boolean default false,
  status text not null default 'open',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pos_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.pos_tables(id) on delete set null,
  reservation_id integer references public.reservations(id) on delete set null,
  started_by uuid references public.staff(id) on delete set null,
  status text not null default 'open',
  party_size integer,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  notes text
);

create table if not exists public.pos_checks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.pos_sessions(id) on delete cascade,
  status text not null default 'open',
  subtotal numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  service numeric(10,2) default 0,
  total numeric(10,2) default 0,
  comp_total numeric(10,2) default 0,
  receipt_note text,
  created_at timestamptz default now(),
  closed_at timestamptz,
  closed_by uuid references public.staff(id) on delete set null
);

create table if not exists public.pos_check_lines (
  id uuid primary key default gen_random_uuid(),
  check_id uuid references public.pos_checks(id) on delete cascade,
  menu_item_id uuid references public.pos_menu_items(id) on delete set null,
  seat_label text,
  qty integer not null default 1,
  price numeric(10,2) not null,
  display_name text not null,
  modifier_ids uuid[] default '{}',
  modifier_notes text,
  comp boolean default false,
  split_mode text default 'none',
  transfer_to text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.pos_payments (
  id uuid primary key default gen_random_uuid(),
  check_id uuid references public.pos_checks(id) on delete cascade,
  amount numeric(10,2) not null,
  tip_amount numeric(10,2) default 0,
  method text not null,
  status text not null default 'pending',
  processor text,
  processor_charge_id text,
  device_id uuid references public.device_connections(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create table if not exists public.pos_device_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.device_connections(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  trust_level text default 'pending',
  notes text
);

create index if not exists pos_tables_zone_idx on public.pos_tables(zone);
create index if not exists pos_menu_items_category_idx on public.pos_menu_items(category_id);
create index if not exists pos_sessions_table_idx on public.pos_sessions(table_id) where status <> 'closed';
create index if not exists pos_checks_session_idx on public.pos_checks(session_id);
create index if not exists pos_check_lines_check_idx on public.pos_check_lines(check_id);
create index if not exists pos_payments_check_idx on public.pos_payments(check_id);

insert into public.pos_menu_categories (id, label, color, display_order)
values
  ('11111111-aaaa-aaaa-aaaa-111111111111', 'Snacks', '#00FF9C', 1),
  ('22222222-bbbb-bbbb-bbbb-222222222222', 'Plates', '#8A7CFF', 2),
  ('33333333-cccc-cccc-cccc-333333333333', 'Desserts', '#FF82E0', 3),
  ('44444444-dddd-dddd-dddd-444444444444', 'Pairings', '#42D9FF', 4)
on conflict (id) do update set label = excluded.label;

insert into public.pos_modifier_groups (id, label)
values
  ('aaaa1111-0000-0000-0000-000000000000', 'Shiso Adjustments'),
  ('bbbb2222-0000-0000-0000-000000000000', 'Oyster Notes'),
  ('cccc3333-0000-0000-0000-000000000000', 'Duck Fire'),
  ('dddd4444-0000-0000-0000-000000000000', 'Chip Tweaks')
on conflict (id) do update set label = excluded.label;

insert into public.pos_modifiers (id, group_id, label, default_applied)
values
  ('aaaa1111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000000', 'Zero-proof version', false),
  ('aaaa1111-2222-2222-2222-222222222222', 'aaaa1111-0000-0000-0000-000000000000', 'Less sweet', false),
  ('bbbb2222-1111-1111-1111-111111111111', 'bbbb2222-0000-0000-0000-000000000000', 'Remove allium', false),
  ('bbbb2222-2222-2222-2222-222222222222', 'bbbb2222-0000-0000-0000-000000000000', 'Extra caviar', false),
  ('cccc3333-1111-1111-1111-111111111111', 'cccc3333-0000-0000-0000-000000000000', 'Cook medium rare', true),
  ('cccc3333-2222-2222-2222-222222222222', 'cccc3333-0000-0000-0000-000000000000', 'Sauce on side', false),
  ('dddd4444-1111-1111-1111-111111111111', 'dddd4444-0000-0000-0000-000000000000', 'No sesame', false),
  ('dddd4444-2222-2222-2222-222222222222', 'dddd4444-0000-0000-0000-000000000000', 'Extra crisp', false)
on conflict (id) do update set label = excluded.label;

insert into public.pos_menu_items (id, category_id, group_id, name, price, tags, display_order)
values
  ('99999999-aaaa-aaaa-aaaa-111111111111', '11111111-aaaa-aaaa-aaaa-111111111111', 'aaaa1111-0000-0000-0000-000000000000', 'Shiso Spritz', 18, array['bev'], 1),
  ('99999999-bbbb-bbbb-bbbb-222222222222', '11111111-aaaa-aaaa-aaaa-111111111111', 'dddd4444-0000-0000-0000-000000000000', 'Sea Lettuce Chip', 12, array['veg'], 2),
  ('99999999-cccc-cccc-cccc-333333333333', '11111111-aaaa-aaaa-aaaa-111111111111', null, 'Coal Pearls', 15, '{}', 3),
  ('88888888-aaaa-aaaa-aaaa-111111111111', '22222222-bbbb-bbbb-bbbb-222222222222', 'bbbb2222-0000-0000-0000-000000000000', 'Charred Oyster', 28, '{}', 1),
  ('88888888-bbbb-bbbb-bbbb-222222222222', '22222222-bbbb-bbbb-bbbb-222222222222', null, 'Ember Beet', 24, '{}', 2),
  ('88888888-cccc-cccc-cccc-333333333333', '22222222-bbbb-bbbb-bbbb-222222222222', null, 'River Trout', 34, '{}', 3),
  ('88888888-dddd-dddd-dddd-444444444444', '22222222-bbbb-bbbb-bbbb-222222222222', 'cccc3333-0000-0000-0000-000000000000', 'Aged Duck', 42, '{}', 4),
  ('77777777-aaaa-aaaa-aaaa-111111111111', '33333333-cccc-cccc-cccc-333333333333', null, 'Black Sesame Cloud', 16, '{}', 1),
  ('77777777-bbbb-bbbb-bbbb-222222222222', '33333333-cccc-cccc-cccc-333333333333', null, 'Frozen Yuzu Leaf', 14, '{}', 2),
  ('66666666-aaaa-aaaa-aaaa-111111111111', '44444444-dddd-dddd-dddd-444444444444', null, 'Wine Pairing', 68, '{}', 1),
  ('66666666-bbbb-bbbb-bbbb-222222222222', '44444444-dddd-dddd-dddd-444444444444', null, 'NA Pairing', 48, '{}', 2)
on conflict (id) do update set name = excluded.name, price = excluded.price;

insert into public.pos_tables (id, label, zone, seats, can_combine, display_order)
select gen_random_uuid(), concat('Dining ', lpad((idx)::text, 2, '0')), 'dining', 2, true, idx
from generate_series(1, 12) as idx
on conflict do nothing;

insert into public.pos_tables (id, label, zone, seats, can_combine, display_order)
select gen_random_uuid(), concat('Chef ', idx::text), 'chef', 1, false, 200 + idx
from generate_series(1, 4) as idx
on conflict do nothing;

insert into public.pos_tables (id, label, zone, seats, can_combine, display_order)
select gen_random_uuid(), concat('Bar ', idx::text), 'bar', 1, false, 300 + idx
from generate_series(1, 6) as idx
on conflict do nothing;

-- Guest-facing schema -------------------------------------------------------

create table if not exists customers (
  id integer generated by default as identity primary key,
  name text,
  contact text,
  notes text,
  created_at timestamp without time zone default now()
);

alter table customers
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists updated_at timestamp without time zone default now();

create index if not exists customers_email_idx on customers (email);
create index if not exists customers_phone_idx on customers (phone);
create unique index if not exists customers_email_lower_uidx
  on customers ((lower(email)))
  where email is not null;

alter table if exists public.private_events
  add column if not exists customer_id integer references customers(id) on delete set null;

create index if not exists private_events_customer_idx
  on public.private_events(customer_id);

alter table if exists public.opening_reservations
  add column if not exists customer_id integer references customers(id) on delete set null;

create index if not exists opening_reservations_customer_idx
  on public.opening_reservations(customer_id);

create table if not exists reservations (
  id integer generated by default as identity primary key,
  guest_name text,
  guest_contact text,
  party_size integer,
  reservation_time timestamp without time zone,
  expected_table_ids integer[],
  preassigned_seat_map jsonb,
  status text default 'pending'
);

alter table reservations
  add column if not exists customer_id integer references customers(id) on delete set null,
  add column if not exists occasion text,
  add column if not exists allergies text[],
  add column if not exists notes text,
  add column if not exists created_at timestamp without time zone default now(),
  add column if not exists updated_at timestamp without time zone default now();

create index if not exists reservations_customer_idx on reservations (customer_id);
create index if not exists reservations_status_idx on reservations (status);
create index if not exists reservations_lookup_idx on reservations (reservation_time);

create table if not exists private_dining_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id integer references customers(id) on delete set null,
  requested_date date,
  requested_time time,
  party_size int,
  budget_range text,
  event_type text,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists private_dining_status_idx
  on private_dining_requests (status);
create index if not exists private_dining_lookup_idx
  on private_dining_requests (requested_date, requested_time);

create table if not exists concierge_messages (
  id bigint generated always as identity primary key,
  customer_id integer references customers(id) on delete set null,
  message text not null,
  response text,
  created_at timestamptz default now()
);

create index if not exists concierge_customer_idx
  on concierge_messages (customer_id);

create table if not exists email_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'website',
  customer_id integer references customers(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists email_list_email_uidx
  on email_list (email);

alter table if exists email_list
  add column if not exists customer_id integer references customers(id) on delete set null;

create index if not exists email_list_customer_idx
  on email_list (customer_id);

alter table if exists public.early_interest
  add column if not exists customer_id integer references customers(id) on delete set null;

create index if not exists early_interest_customer_idx
  on public.early_interest(customer_id);

create table if not exists accessibility_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id integer references customers(id) on delete set null,
  reservation_id integer references reservations(id) on delete cascade,
  notes text not null,
  created_at timestamptz default now()
);

create table if not exists dietary_preferences (
  id uuid primary key default gen_random_uuid(),
  customer_id integer references customers(id) on delete cascade,
  preference text not null,
  created_at timestamptz default now()
);

create table if not exists allergies (
  id uuid primary key default gen_random_uuid(),
  customer_id integer references customers(id) on delete cascade,
  allergy text not null,
  severity text,
  created_at timestamptz default now()
);

create table if not exists guest_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id integer references customers(id) on delete set null,
  visited_at timestamptz not null,
  party_size int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists reservation_status_log (
  id bigint generated always as identity primary key,
  reservation_id integer references reservations(id) on delete cascade,
  previous_status text,
  new_status text,
  changed_by text,
  created_at timestamptz default now()
);

-- Minimal RLS scaffolding (expand per auth model)
alter table customers enable row level security;
alter table reservations enable row level security;
alter table private_dining_requests enable row level security;
alter table concierge_messages enable row level security;
alter table email_list enable row level security;

drop policy if exists "Guests can create reservations" on reservations;
create policy "Guests can create reservations"
on reservations
for insert
to anon, authenticated
with check (true);

-- Customer interaction logging ----------------------------------------------

create table if not exists customer_interactions (
  id bigint generated always as identity primary key,
  customer_id integer references customers(id) on delete set null,
  email text,
  interaction_type text not null,
  channel text default 'site',
  related_table text,
  related_id text,
  summary text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists customer_interactions_customer_idx
  on customer_interactions (customer_id);

create index if not exists customer_interactions_type_idx
  on customer_interactions (interaction_type, created_at desc);

create index if not exists customer_interactions_email_idx
  on customer_interactions ((lower(email)))
  where email is not null;

create or replace function public.get_or_create_customer_id(
  p_email text,
  p_full_name text default null,
  p_phone text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id integer;
  clean_email text := nullif(trim(p_email), '');
  clean_phone text := nullif(trim(p_phone), '');
  match_email text := case when clean_email is not null then lower(clean_email) end;
  trimmed_name text := nullif(trim(p_full_name), '');
  first_value text := null;
  last_value text := null;
begin
  if trimmed_name is not null then
    first_value := split_part(trimmed_name, ' ', 1);
    last_value := nullif(regexp_replace(trimmed_name, '^\S+\s*', ''), '');
  end if;

  if clean_email is null and clean_phone is null then
    if trimmed_name is null then
      return null;
    end if;
  end if;

  if match_email is not null then
    select id into existing_id
    from customers
    where lower(email) = match_email
    limit 1;
  elsif clean_phone is not null then
    select id into existing_id
    from customers
    where phone = clean_phone
    limit 1;
  end if;

  if existing_id is not null then
    update customers
    set
      email = coalesce(email, clean_email),
      phone = coalesce(phone, clean_phone),
      contact = coalesce(contact, clean_phone, clean_email),
      name = coalesce(name, trimmed_name, name),
      first_name = coalesce(first_name, first_value, first_name),
      last_name = coalesce(last_name, last_value, last_name),
      updated_at = now()
    where id = existing_id;
    return existing_id;
  end if;

  insert into customers (email, phone, contact, name, first_name, last_name)
  values (
    clean_email,
    clean_phone,
    coalesce(clean_phone, clean_email),
    coalesce(trimmed_name, clean_email, clean_phone, 'Guest'),
    first_value,
    last_value
  )
  returning id into existing_id;
  return existing_id;
end;
$$;

create or replace function public.log_customer_interaction(
  p_customer_id integer,
  p_email text,
  p_interaction_type text,
  p_channel text,
  p_related_table text,
  p_related_id text,
  p_summary text,
  p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_email text := nullif(trim(p_email), '');
  trimmed_type text := nullif(trim(p_interaction_type), '');
begin
  if trimmed_type is null then
    raise exception 'interaction_type is required';
  end if;

  insert into customer_interactions (
    customer_id,
    email,
    interaction_type,
    channel,
    related_table,
    related_id,
    summary,
    payload
  )
  values (
    p_customer_id,
    trimmed_email,
    trimmed_type,
    coalesce(nullif(trim(p_channel), ''), 'site'),
    p_related_table,
    p_related_id,
    p_summary,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.handle_reservation_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contact_value text := nullif(trim(new.guest_contact), '');
  inferred_email text;
  inferred_phone text;
begin
  if contact_value is not null and position('@' in contact_value) > 0 then
    inferred_email := contact_value;
  else
    inferred_phone := contact_value;
  end if;

  new.customer_id := coalesce(
    new.customer_id,
    public.get_or_create_customer_id(inferred_email, new.guest_name, inferred_phone)
  );

  perform public.log_customer_interaction(
    new.customer_id,
    inferred_email,
    'reservation_request',
    'staff_console',
    TG_TABLE_NAME,
    new.id::text,
    new.guest_name,
    jsonb_strip_nulls(
      jsonb_build_object(
        'party_size', new.party_size,
        'reservation_time', new.reservation_time,
        'status', new.status
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_reservations_interaction on public.reservations;
create trigger trg_reservations_interaction
before insert on public.reservations
for each row execute procedure public.handle_reservation_interaction();

create or replace function public.handle_private_event_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_id := coalesce(
    new.customer_id,
    public.get_or_create_customer_id(new.guest_email, new.guest_name, null)
  );

  perform public.log_customer_interaction(
    new.customer_id,
    new.guest_email,
    'private_event_inquiry',
    'customer_portal',
    TG_TABLE_NAME,
    new.id::text,
    coalesce(new.event_type, 'Private Event'),
    jsonb_strip_nulls(
      jsonb_build_object(
        'party_size', new.party_size,
        'preferred_date', new.preferred_date,
        'status', new.status
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_private_events_interaction on public.private_events;
create trigger trg_private_events_interaction
before insert on public.private_events
for each row execute procedure public.handle_private_event_interaction();

create or replace function public.handle_opening_reservation_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_id := coalesce(
    new.customer_id,
    public.get_or_create_customer_id(new.email, null, null)
  );

  perform public.log_customer_interaction(
    new.customer_id,
    new.email,
    'opening_waitlist',
    'customer_portal',
    TG_TABLE_NAME,
    new.id::text,
    'Opening reservation',
    jsonb_strip_nulls(
      jsonb_build_object(
        'preferred_date', new.preferred_date,
        'party_size', new.party_size,
        'status', new.status
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_opening_reservations_interaction on public.opening_reservations;
create trigger trg_opening_reservations_interaction
before insert on public.opening_reservations
for each row execute procedure public.handle_opening_reservation_interaction();

create or replace function public.handle_email_list_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_id := coalesce(
    new.customer_id,
    public.get_or_create_customer_id(new.email, null, null)
  );

  perform public.log_customer_interaction(
    new.customer_id,
    new.email,
    'email_opt_in',
    coalesce(new.source, 'website'),
    TG_TABLE_NAME,
    new.id::text,
    'Email signup',
    jsonb_build_object('source', new.source)
  );
  return new;
end;
$$;

drop trigger if exists trg_email_list_interaction on public.email_list;
create trigger trg_email_list_interaction
before insert on public.email_list
for each row execute procedure public.handle_email_list_interaction();

create or replace function public.handle_early_interest_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_id := coalesce(
    new.customer_id,
    public.get_or_create_customer_id(new.email, new.name, null)
  );

  perform public.log_customer_interaction(
    new.customer_id,
    new.email,
    'early_interest_signup',
    'guest_site',
    TG_TABLE_NAME,
    new.id::text,
    coalesce(new.name, 'Early interest'),
    jsonb_build_object('name', new.name)
  );
  return new;
end;
$$;

drop trigger if exists trg_early_interest_interaction on public.early_interest;
create trigger trg_early_interest_interaction
before insert on public.early_interest
for each row execute procedure public.handle_early_interest_interaction();

create or replace function public.handle_concierge_message_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_email text;
begin
  if new.customer_id is not null then
    select email into customer_email from customers where id = new.customer_id;
  end if;

  perform public.log_customer_interaction(
    new.customer_id,
    customer_email,
    'concierge_message',
    'concierge',
    TG_TABLE_NAME,
    new.id::text,
    left(coalesce(new.message, ''), 120),
    jsonb_strip_nulls(
      jsonb_build_object(
        'message', new.message,
        'response', new.response
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_concierge_messages_interaction on public.concierge_messages;
create trigger trg_concierge_messages_interaction
after insert on public.concierge_messages
for each row execute procedure public.handle_concierge_message_interaction();

create or replace function public.handle_reservation_status_log_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  res_record record;
begin
  select customer_id, guest_contact
  into res_record
  from reservations
  where id = new.reservation_id;

  if not found then
    return new;
  end if;

  perform public.log_customer_interaction(
    res_record.customer_id,
    res_record.guest_contact,
    'reservation_status_change',
    'staff_console',
    TG_TABLE_NAME,
    new.id::text,
    new.new_status,
    jsonb_build_object(
      'previous_status', new.previous_status,
      'new_status', new.new_status,
      'changed_by', new.changed_by
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_reservation_status_log_interaction on public.reservation_status_log;
create trigger trg_reservation_status_log_interaction
after insert on public.reservation_status_log
for each row execute procedure public.handle_reservation_status_log_interaction();
