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
