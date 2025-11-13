create extension if not exists pgcrypto;

alter table if exists public.messages
  add column if not exists parent_id uuid references public.messages(id);

create index if not exists messages_parent_id_idx
  on public.messages(parent_id);

insert into staff_access (email, password_hash, role, must_reset)
values
  ('ken@snowwhitelaundry.co', crypt('temporary-ken', gen_salt('bf')), 'staff', true),
  ('emma@snowwhitelaundry.co', crypt('temporary-emma', gen_salt('bf')), 'staff', true)
on conflict (email) do update set must_reset = excluded.must_reset;
