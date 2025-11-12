-- Snow White Laundry Supabase schema

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

alter table if exists public.messages
  add constraint messages_staff_user_id_fkey
  foreign key (user_id) references public.staff(id) on delete set null;

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
