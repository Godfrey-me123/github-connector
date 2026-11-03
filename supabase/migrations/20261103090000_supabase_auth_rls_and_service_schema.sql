create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  action text not null,
  details text,
  created_at timestamptz default now()
);

create table if not exists public.nida_requests (
  id text primary key default gen_random_uuid()::text,
  requester_key text,
  requester_name text,
  nida_no text,
  whatsapp_number text,
  mother_name text,
  ward_of_residence text,
  district_of_birth text,
  street_village text,
  request_type text,
  status text not null default 'PENDING',
  admin_message text,
  response_file_path text,
  response_file_name text,
  response_file_path_2 text,
  response_file_name_2 text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_packages (
  id text primary key,
  name text not null,
  usages integer not null,
  price text not null,
  description text,
  visibility text default 'public',
  is_active boolean default true,
  sort_order integer default 0,
  bonus integer default 0,
  promotion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_feedback (
  id text primary key,
  user_id text,
  user_name text,
  user_contact text,
  feedback_type text,
  rating integer,
  comment text,
  message text,
  attachment_path text,
  attachment_name text,
  attachment_data text,
  attachment_url text,
  category text,
  subject text,
  status text not null default 'PENDING',
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id text primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  role text default 'user',
  passkey text,
  tokens integer default 0,
  status text default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.weekly_offers (
  id text primary key,
  title text not null,
  description text,
  tokens integer not null,
  price text not null,
  services text[] default '{}',
  start_date text not null,
  end_date text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.welcome_token_claims (
  normalized_phone text primary key,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  grant_id text not null unique,
  claimed_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.user_profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.manual_requests
  add column if not exists service_id text,
  add column if not exists admin_notes text,
  add column if not exists user_passkey text;

alter table public.download_records
  add column if not exists file_size bigint,
  add column if not exists file_type text;

create unique index if not exists profiles_auth_user_id_unique
  on public.profiles(auth_user_id) where auth_user_id is not null;

create unique index if not exists user_profiles_auth_user_id_unique
  on public.user_profiles(auth_user_id) where auth_user_id is not null;

create index if not exists nida_requests_requester_key_idx on public.nida_requests(requester_key);
create index if not exists manual_requests_user_id_idx on public.manual_requests(user_id);
create index if not exists manual_requests_user_passkey_idx on public.manual_requests(user_passkey);
create index if not exists user_feedback_user_id_idx on public.user_feedback(user_id);
create index if not exists user_payments_user_id_idx on public.user_payments(user_id);
create index if not exists download_records_user_id_idx on public.download_records(user_id);
create index if not exists user_generated_cards_user_id_idx on public.user_generated_cards(user_id);
create index if not exists token_transactions_user_id_idx on public.token_transactions(user_id);

create or replace function public.is_bigsta_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create or replace function public.bigsta_user_owns_key(p_key text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_key is not null and (
    exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and (
          lower(p.id) = lower(p_key)
          or lower(coalesce(p.passkey, '')) = lower(p_key)
          or p.auth_user_id::text = p_key
        )
    )
    or exists (
      select 1
      from public.user_profiles p
      where p.auth_user_id = auth.uid()
        and (
          lower(p.id) = lower(p_key)
          or lower(coalesce(p.passkey, '')) = lower(p_key)
          or p.auth_user_id::text = p_key
        )
    )
  )
$$;

create or replace function public.bigsta_guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.is_bigsta_admin() then
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

create or replace function public.bigsta_guard_passkey_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.is_bigsta_admin() then
    if new.id is distinct from old.id
      or new.key is distinct from old.key
      or new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.total_usages is distinct from old.total_usages
      or new.payment_status is distinct from old.payment_status
      or new.package_name is distinct from old.package_name
      or new.package_price is distinct from old.package_price
      or coalesce(new.remaining_usages, 0) < 0
      or coalesce(new.remaining_usages, 0) > coalesce(old.remaining_usages, 0)
      or coalesce(new.used_usages, 0) < coalesce(old.used_usages, 0) then
      raise exception 'Passkey access and token grants are admin-managed';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.bigsta_guard_manual_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.is_bigsta_admin() then
    if new.id is distinct from old.id
      or new.user_id is distinct from old.user_id
      or new.user_passkey is distinct from old.user_passkey
      or new.status is distinct from old.status
      or new.admin_notes is distinct from old.admin_notes then
      raise exception 'Request ownership and review fields are admin-managed';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.bigsta_guard_nida_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.is_bigsta_admin() then
    if new.id is distinct from old.id
      or new.requester_key is distinct from old.requester_key
      or new.requester_name is distinct from old.requester_name
      or new.admin_message is distinct from old.admin_message
      or new.response_file_path is distinct from old.response_file_path
      or new.response_file_name is distinct from old.response_file_name
      or new.response_file_path_2 is distinct from old.response_file_path_2
      or new.response_file_name_2 is distinct from old.response_file_name_2
      or new.responded_at is distinct from old.responded_at
      or (new.status is distinct from old.status and not (old.status = 'INFO_REQUESTED' and new.status = 'PENDING')) then
      raise exception 'Request ownership and response fields are admin-managed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.bigsta_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_name text;
  v_phone text;
  v_passkey text;
  v_tokens integer;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_user_id is null
    and new.email is not null
    and lower(trim(coalesce(p.email, ''))) = lower(trim(new.email))
  order by p.created_at asc nulls last, p.id
  limit 1;

  if v_profile_id is null then
    v_profile_id := new.id::text;
  end if;

  if v_phone is not null and exists (
    select 1 from public.profiles p
    where p.id <> v_profile_id and lower(trim(coalesce(p.phone, ''))) = lower(v_phone)
  ) then
    v_phone := null;
  end if;

  insert into public.profiles (id, auth_user_id, name, phone, email, role, passkey, tokens, status)
  values (v_profile_id, new.id, v_name, v_phone, new.email, 'user', new.id::text, 0, 'ACTIVE')
  on conflict (id) do update set
    auth_user_id = excluded.auth_user_id,
    name = coalesce(excluded.name, public.profiles.name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    email = coalesce(excluded.email, public.profiles.email),
    role = 'user',
    passkey = coalesce(public.profiles.passkey, excluded.passkey),
    updated_at = now();

  select p.passkey, coalesce(p.tokens, 0)
    into v_passkey, v_tokens
  from public.profiles p
  where p.id = v_profile_id;

  insert into public.user_profiles (id, auth_user_id, name, phone, email, role, passkey, tokens, status)
  select p.id, p.auth_user_id, p.name, p.phone, p.email, 'user', p.passkey, coalesce(p.tokens, 0), coalesce(p.status, 'ACTIVE')
  from public.profiles p
  where p.id = v_profile_id
  on conflict (id) do update set
    auth_user_id = excluded.auth_user_id,
    name = coalesce(excluded.name, public.user_profiles.name),
    phone = coalesce(public.user_profiles.phone, excluded.phone),
    email = coalesce(excluded.email, public.user_profiles.email),
    role = 'user',
    passkey = coalesce(public.user_profiles.passkey, excluded.passkey),
    tokens = excluded.tokens,
    status = coalesce(public.user_profiles.status, excluded.status),
    updated_at = now();

  if not exists (select 1 from public.passkeys pk where lower(pk.key) = lower(v_passkey)) then
    insert into public.passkeys (
      id, key, role, active, created_date, created_at_timestamp, created_by,
      description, total_usages, used_usages, remaining_usages, payment_status,
      package_name, package_price
    ) values (
      'auth_' || new.id::text,
      v_passkey,
      'user',
      true,
      to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
      floor(extract(epoch from now()) * 1000)::bigint,
      coalesce(v_name, 'Supabase Auth'),
      'Email account',
      v_tokens,
      0,
      v_tokens,
      case when v_tokens > 0 then 'ACTIVE' else 'EXHAUSTED' end,
      case when v_tokens > 0 then 'Account balance' else 'No tokens' end,
      'Free'
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists bigsta_auth_user_created on auth.users;
create trigger bigsta_auth_user_created
after insert on auth.users
for each row execute function public.bigsta_handle_new_auth_user();

create or replace function public.grant_bigsta_welcome_token(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_phone text;
  v_normalized_phone text;
  v_passkey text;
  v_email text;
  v_grant_id text := gen_random_uuid()::text;
  v_inserted integer;
begin
  select p.id, p.phone, p.passkey, p.email
    into v_profile_id, v_phone, v_passkey, v_email
  from public.profiles p
  where p.auth_user_id = p_user_id
  for update;

  if v_profile_id is null or v_phone is null or v_passkey is null then
    return 0;
  end if;

  v_normalized_phone := case
    when regexp_replace(trim(v_phone), '\s+', '', 'g') ~ '^0[67][0-9]{8}$'
      then '255' || substr(regexp_replace(trim(v_phone), '\s+', '', 'g'), 2)
    when regexp_replace(trim(v_phone), '\s+', '', 'g') ~ '^[+]255[67][0-9]{8}$'
      then substr(regexp_replace(trim(v_phone), '\s+', '', 'g'), 2)
    when regexp_replace(trim(v_phone), '\s+', '', 'g') ~ '^255[67][0-9]{8}$'
      then regexp_replace(trim(v_phone), '\s+', '', 'g')
    else null
  end;

  if v_normalized_phone is null then
    return 0;
  end if;

  insert into public.welcome_token_claims (normalized_phone, auth_user_id, grant_id)
  values (v_normalized_phone, p_user_id, v_grant_id)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 0;
  end if;

  update public.profiles
  set tokens = coalesce(tokens, 0) + 1, updated_at = now()
  where id = v_profile_id;

  update public.user_profiles
  set tokens = coalesce(tokens, 0) + 1, updated_at = now()
  where auth_user_id = p_user_id;

  update public.passkeys
  set total_usages = coalesce(total_usages, 0) + 1,
      remaining_usages = coalesce(remaining_usages, 0) + 1,
      payment_status = 'ACTIVE',
      package_name = '1 Welcome Token Free Starter',
      package_price = 'Free'
  where lower(key) = lower(v_passkey);

  insert into public.token_transactions (id, user_id, user_email, amount, reason)
  values (
    'welcome_' || replace(v_grant_id, '-', ''),
    v_profile_id,
    v_email,
    1,
    'Verified account welcome token'
  );

  return 1;
end;
$$;

revoke all on function public.is_bigsta_admin() from public, anon;
grant execute on function public.is_bigsta_admin() to authenticated, service_role;
revoke all on function public.bigsta_handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.bigsta_user_owns_key(text) from public, anon;
grant execute on function public.bigsta_user_owns_key(text) to authenticated, service_role;
revoke all on function public.grant_bigsta_welcome_token(uuid) from public, anon, authenticated;
grant execute on function public.grant_bigsta_welcome_token(uuid) to service_role;

 drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
before update on public.profiles
for each row execute function public.bigsta_guard_profile_update();

drop trigger if exists user_profiles_guard_update on public.user_profiles;
create trigger user_profiles_guard_update
before update on public.user_profiles
for each row execute function public.bigsta_guard_profile_update();

drop trigger if exists passkeys_guard_update on public.passkeys;
create trigger passkeys_guard_update
before update on public.passkeys
for each row execute function public.bigsta_guard_passkey_update();

drop trigger if exists manual_requests_guard_update on public.manual_requests;
create trigger manual_requests_guard_update
before update on public.manual_requests
for each row execute function public.bigsta_guard_manual_request_update();

drop trigger if exists nida_requests_guard_update on public.nida_requests;
create trigger nida_requests_guard_update
before update on public.nida_requests
for each row execute function public.bigsta_guard_nida_request_update();

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'audit_logs', 'background_assets', 'download_records', 'manual_requests',
        'nida_requests', 'passkeys', 'profiles', 'sms_logs', 'system_settings',
        'templates', 'token_packages', 'token_transactions', 'user_feedback',
        'user_generated_cards', 'user_payments', 'user_profiles', 'users', 'weekly_offers'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end;
$$;

alter table public.audit_logs enable row level security;
alter table public.background_assets enable row level security;
alter table public.download_records enable row level security;
alter table public.manual_requests enable row level security;
alter table public.nida_requests enable row level security;
alter table public.passkeys enable row level security;
alter table public.profiles enable row level security;
alter table public.sms_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.templates enable row level security;
alter table public.token_packages enable row level security;
alter table public.token_transactions enable row level security;
alter table public.user_feedback enable row level security;
alter table public.user_generated_cards enable row level security;
alter table public.user_payments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.users enable row level security;
alter table public.weekly_offers enable row level security;
alter table public.welcome_token_claims enable row level security;

revoke all on table public.audit_logs, public.download_records, public.manual_requests,
  public.nida_requests, public.passkeys, public.profiles, public.sms_logs,
  public.system_settings, public.token_transactions, public.user_feedback,
  public.user_generated_cards, public.user_payments, public.user_profiles,
  public.users, public.welcome_token_claims
from public, anon;

revoke all on table public.audit_logs, public.download_records, public.manual_requests,
  public.nida_requests, public.passkeys, public.profiles, public.sms_logs,
  public.system_settings, public.token_transactions, public.user_feedback,
  public.user_generated_cards, public.user_payments, public.user_profiles, public.users
from authenticated;

grant select, insert, update, delete on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.download_records to authenticated;
grant select, insert, update, delete on table public.manual_requests to authenticated;
grant select, insert, update, delete on table public.nida_requests to authenticated;
grant select, insert, update, delete on table public.passkeys to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.sms_logs to authenticated;
grant select, insert, update, delete on table public.system_settings to authenticated;
grant select, insert, update, delete on table public.token_transactions to authenticated;
grant select, insert, update, delete on table public.user_feedback to authenticated;
grant select, insert, update, delete on table public.user_generated_cards to authenticated;
grant select, insert, update, delete on table public.user_payments to authenticated;
grant select, update on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.users to authenticated;
revoke all on table public.welcome_token_claims from public, anon, authenticated;

grant select on table public.background_assets, public.system_settings, public.templates, public.token_packages, public.weekly_offers to anon;
revoke insert, update, delete on table public.background_assets, public.system_settings, public.templates, public.token_packages, public.weekly_offers from anon;
grant select, insert, update, delete on table public.background_assets, public.templates, public.token_packages, public.weekly_offers to authenticated;

create policy audit_logs_admin_all on public.audit_logs for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy background_assets_public_read on public.background_assets for select to anon, authenticated
  using (true);
create policy background_assets_admin_all on public.background_assets for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy download_records_owner_all on public.download_records for all to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id))
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));

create policy manual_requests_owner_select on public.manual_requests for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(coalesce(user_passkey, user_id)));
create policy manual_requests_owner_insert on public.manual_requests for insert to authenticated
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(coalesce(user_passkey, user_id)));
create policy manual_requests_owner_update on public.manual_requests for update to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(coalesce(user_passkey, user_id)))
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(coalesce(user_passkey, user_id)));
create policy manual_requests_admin_delete on public.manual_requests for delete to authenticated
  using (public.is_bigsta_admin());

create policy nida_requests_owner_select on public.nida_requests for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(requester_key));
create policy nida_requests_owner_insert on public.nida_requests for insert to authenticated
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(requester_key));
create policy nida_requests_owner_update on public.nida_requests for update to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(requester_key))
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(requester_key));
create policy nida_requests_admin_delete on public.nida_requests for delete to authenticated
  using (public.is_bigsta_admin());

create policy passkeys_owner_select on public.passkeys for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(key));
create policy passkeys_owner_update on public.passkeys for update to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(key))
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(key));
create policy passkeys_admin_insert on public.passkeys for insert to authenticated
  with check (public.is_bigsta_admin());
create policy passkeys_admin_delete on public.passkeys for delete to authenticated
  using (public.is_bigsta_admin());

create policy profiles_owner_select on public.profiles for select to authenticated
  using (auth_user_id = auth.uid() or public.is_bigsta_admin());
create policy profiles_owner_update on public.profiles for update to authenticated
  using (auth_user_id = auth.uid() or public.is_bigsta_admin())
  with check (auth_user_id = auth.uid() or public.is_bigsta_admin());

create policy sms_logs_admin_all on public.sms_logs for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy system_settings_payment_methods_read on public.system_settings for select to anon, authenticated
  using (config_key = 'payment_methods');
create policy system_settings_admin_all on public.system_settings for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy templates_public_read on public.templates for select to anon, authenticated
  using (is_active is distinct from false);
create policy templates_admin_all on public.templates for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy token_packages_public_read on public.token_packages for select to anon, authenticated
  using (is_active is distinct from false and coalesce(visibility, 'public') = 'public');
create policy token_packages_admin_all on public.token_packages for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy token_transactions_owner_read on public.token_transactions for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));
create policy token_transactions_owner_spend on public.token_transactions for insert to authenticated
  with check (public.is_bigsta_admin() or (amount <= 0 and public.bigsta_user_owns_key(user_id)));
create policy token_transactions_admin_update on public.token_transactions for update to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());
create policy token_transactions_admin_delete on public.token_transactions for delete to authenticated
  using (public.is_bigsta_admin());

create policy user_feedback_owner_read on public.user_feedback for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));
create policy user_feedback_owner_insert on public.user_feedback for insert to authenticated
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));
create policy user_feedback_admin_update on public.user_feedback for update to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());
create policy user_feedback_admin_delete on public.user_feedback for delete to authenticated
  using (public.is_bigsta_admin());

create policy user_generated_cards_owner_all on public.user_generated_cards for all to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id))
  with check (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));

create policy user_payments_owner_read on public.user_payments for select to authenticated
  using (public.is_bigsta_admin() or public.bigsta_user_owns_key(user_id));
create policy user_payments_admin_all on public.user_payments for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

create policy user_profiles_owner_select on public.user_profiles for select to authenticated
  using (auth_user_id = auth.uid() or public.is_bigsta_admin());
create policy user_profiles_owner_update on public.user_profiles for update to authenticated
  using (auth_user_id = auth.uid() or public.is_bigsta_admin())
  with check (auth_user_id = auth.uid() or public.is_bigsta_admin());

create policy users_owner_select on public.users for select to authenticated
  using (id::text = auth.uid()::text or public.is_bigsta_admin());
create policy users_owner_insert on public.users for insert to authenticated
  with check (id::text = auth.uid()::text or public.is_bigsta_admin());
create policy users_owner_update on public.users for update to authenticated
  using (id::text = auth.uid()::text or public.is_bigsta_admin())
  with check (id::text = auth.uid()::text or public.is_bigsta_admin());
create policy users_admin_delete on public.users for delete to authenticated
  using (public.is_bigsta_admin());

create policy weekly_offers_public_read on public.weekly_offers for select to anon, authenticated
  using (is_active is distinct from false);
create policy weekly_offers_admin_all on public.weekly_offers for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('backgrounds', 'backgrounds', true, 20971520, array['image/png', 'image/jpeg', 'image/webp']),
  ('feedback_attachments', 'feedback_attachments', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('nida_responses', 'nida_responses', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists backgrounds_public_read on storage.objects;
drop policy if exists backgrounds_admin_write on storage.objects;
drop policy if exists feedback_attachments_owner_read on storage.objects;
drop policy if exists feedback_attachments_owner_insert on storage.objects;
drop policy if exists feedback_attachments_owner_update on storage.objects;
drop policy if exists feedback_attachments_owner_delete on storage.objects;
drop policy if exists nida_responses_admin_all on storage.objects;
drop policy if exists nida_responses_owner_read on storage.objects;
drop policy if exists nida_responses_owner_delete on storage.objects;

create policy backgrounds_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'backgrounds');
create policy backgrounds_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'backgrounds' and public.is_bigsta_admin())
  with check (bucket_id = 'backgrounds' and public.is_bigsta_admin());

create policy feedback_attachments_owner_read on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_bigsta_admin())
  );
create policy feedback_attachments_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback_attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_bigsta_admin())
  );
create policy feedback_attachments_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_bigsta_admin())
  )
  with check (
    bucket_id = 'feedback_attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_bigsta_admin())
  );
create policy feedback_attachments_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_bigsta_admin())
  );

create policy nida_responses_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'nida_responses' and public.is_bigsta_admin())
  with check (bucket_id = 'nida_responses' and public.is_bigsta_admin());
create policy nida_responses_owner_read on storage.objects for select to authenticated
  using (
    bucket_id = 'nida_responses'
    and exists (
      select 1 from public.nida_requests r
      where r.id = (storage.foldername(name))[1]
        and public.bigsta_user_owns_key(r.requester_key)
    )
  );
create policy nida_responses_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'nida_responses'
    and exists (
      select 1 from public.nida_requests r
      where r.id = (storage.foldername(name))[1]
        and public.bigsta_user_owns_key(r.requester_key)
    )
  );
