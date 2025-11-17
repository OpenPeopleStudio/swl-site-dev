create extension if not exists pgcrypto;

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

create index if not exists user_preferences_updated_idx on public.user_preferences(updated_at desc);

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

create index if not exists device_connections_user_idx on public.device_connections(user_id);

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

create index if not exists user_security_updated_idx on public.user_security(updated_at desc);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  performed_by uuid references auth.users(id) on delete set null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists system_logs_action_idx on public.system_logs(action, created_at desc);
