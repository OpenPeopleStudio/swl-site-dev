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
