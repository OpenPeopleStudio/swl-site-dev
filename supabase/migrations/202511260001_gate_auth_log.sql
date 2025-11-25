-- Gate Authentication Logging
-- Tracks all authentication attempts at /gate for security and audit purposes

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

-- RLS: Only authenticated users can read logs (staff/owner roles)
alter table public.gate_auth_log enable row level security;

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

-- Service role can insert (for API logging)
create policy "service role can insert gate auth logs"
on public.gate_auth_log
for insert
with check (true);
