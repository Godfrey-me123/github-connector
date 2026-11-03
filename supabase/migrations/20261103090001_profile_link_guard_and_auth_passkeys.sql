create or replace function public.bigsta_guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_initial_auth_link boolean;
begin
  v_initial_auth_link :=
    old.auth_user_id is null
    and new.auth_user_id is not null
    and lower(trim(coalesce(old.email, ''))) = lower(trim(coalesce(new.email, '')));

  if auth.role() <> 'service_role' and not public.is_bigsta_admin() and not v_initial_auth_link then
    if new.id is distinct from old.id
      or new.auth_user_id is distinct from old.auth_user_id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.passkey is distinct from old.passkey
      or new.tokens is distinct from old.tokens
      or new.status is distinct from old.status then
      raise exception 'Protected account fields cannot be changed';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.bigsta_ensure_auth_user_passkey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_profile_name text;
  v_tokens integer;
begin
  select p.id, p.name, coalesce(p.tokens, 0)
    into v_profile_id, v_profile_name, v_tokens
  from public.profiles p
  where p.auth_user_id = new.id
  limit 1;

  if v_profile_id is null or exists (
    select 1 from public.passkeys pk where lower(pk.key) = lower(new.id::text)
  ) then
    return new;
  end if;

  insert into public.passkeys (
    id, key, role, active, created_date, created_at_timestamp, created_by,
    description, total_usages, used_usages, remaining_usages, payment_status,
    package_name, package_price
  ) values (
    'auth_' || new.id::text,
    new.id::text,
    'user',
    true,
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
    floor(extract(epoch from now()) * 1000)::bigint,
    coalesce(v_profile_name, 'Supabase Auth'),
    'Email account',
    v_tokens,
    0,
    v_tokens,
    case when v_tokens > 0 then 'ACTIVE' else 'EXHAUSTED' end,
    case when v_tokens > 0 then 'Account balance' else 'No tokens' end,
    'Free'
  ) on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.bigsta_ensure_auth_user_passkey() from public, anon, authenticated;

drop trigger if exists bigsta_auth_user_passkey_created on auth.users;
create trigger bigsta_auth_user_passkey_created
after insert on auth.users
for each row execute function public.bigsta_ensure_auth_user_passkey();

insert into public.passkeys (
  id, key, role, active, created_date, created_at_timestamp, created_by,
  description, total_usages, used_usages, remaining_usages, payment_status,
  package_name, package_price
)
select
  'auth_' || p.auth_user_id::text,
  p.auth_user_id::text,
  coalesce(p.role, 'user'),
  true,
  to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
  floor(extract(epoch from now()) * 1000)::bigint,
  coalesce(p.name, 'Supabase Auth'),
  'Email account',
  coalesce(p.tokens, 0),
  0,
  coalesce(p.tokens, 0),
  case when coalesce(p.tokens, 0) > 0 then 'ACTIVE' else 'EXHAUSTED' end,
  case when coalesce(p.tokens, 0) > 0 then 'Account balance' else 'No tokens' end,
  'Free'
from public.profiles p
where p.auth_user_id is not null
  and not exists (
    select 1 from public.passkeys pk where lower(pk.key) = lower(p.auth_user_id::text)
  )
on conflict do nothing;
