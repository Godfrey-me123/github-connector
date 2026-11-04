create table if not exists public.services (
  id text primary key,
  service_name text not null,
  authority text not null default '',
  description text,
  category text not null default 'identity',
  icon_name text not null default 'UserCheck',
  is_active boolean not null default true,
  token_cost integer not null default 1 check (token_cost between 1 and 1000),
  features text[] not null default '{}'::text[],
  processing_mode text not null default 'auto' check (processing_mode in ('auto', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.services
  add column if not exists authority text not null default '',
  add column if not exists category text not null default 'identity',
  add column if not exists icon_name text not null default 'UserCheck',
  add column if not exists is_active boolean not null default true,
  add column if not exists token_cost integer not null default 1,
  add column if not exists features text[] not null default '{}'::text[],
  add column if not exists processing_mode text not null default 'auto';

insert into public.services (
  id, service_name, authority, description, category, icon_name,
  is_active, token_cost, features, processing_mode
)
values
  ('nida', 'NIDA Services', 'National Identification Authority',
   'Instant auto-fill, verification & CR80 card generation for Front & Back National IDs.',
   'identity', 'UserCheck', true, 1,
   array['20-Digit ID Verification', 'Biometric Photo Cropping', 'Digital Signature Pad', 'Barcode Sync'], 'auto'),
  ('driving_license', 'Driving License Services', 'Traffic & Vehicle Inspection',
   'Driver permit issuance, class endorsements & digital driver identification cards.',
   'civil', 'Car', true, 1,
   array['Class Endorsements (A, B, C, D, E)', 'Penalty Point Tracking', 'Digital QR Validation'], 'auto'),
  ('birth_certificate', 'Birth Certificate Services', 'RITA Civil Registration',
   'Unofficial birth certificate issuance, verification & digital civil registry documentation.',
   'civil', 'ScrollText', false, 1,
   array['Birth Certificate Archiving', 'Legal Certification', 'Unofficial Watermark Validation'], 'auto'),
  ('passport', 'Passport Services', 'Immigration Services Department',
   'East African e-Passport booklet formatting, bio-data pages & travel credentials.',
   'identity', 'Globe', false, 1,
   array['ICAO 9303 Compliant MRZ', 'Biometric Chip Layout', 'Diplomatic & Ordinary Profiles'], 'auto'),
  ('tin', 'TIN Services', 'Tanzania Revenue Authority',
   'Taxpayer Identification Number cards, tax compliance credentials & PIN certificates.',
   'finance', 'Receipt', false, 1,
   array['Taxpayer PIN Sync', 'QR Compliance Stamp', 'Corporate & Individual Formats'], 'auto'),
  ('business_license', 'Business License Services', 'BRELA & Municipal Authorities',
   'Commercial enterprise registration certificates, municipal trade permits & corporate IDs.',
   'finance', 'Building2', false, 1,
   array['BRELA Certificate Layout', 'Annual Renewal Badges', 'Sector Trade Validation'], 'auto'),
  ('heslb', 'HESLB Student Loans Services', 'Higher Education Students’ Loans Board',
   'Student beneficiary loan allocation cards, academic verification & repayment IDs.',
   'education', 'GraduationCap', false, 1,
   array['Index Number Verification', 'Institution Allocation Status', 'Beneficiary Smart Badges'], 'auto'),
  ('nhif', 'NHIF Membership Card', 'National Health Insurance Fund',
   'Healthcare membership smart cards, dependent coverage validation & biometric health passes.',
   'health', 'HeartPulse', true, 1,
   array['Principal & Dependent Mapping', 'Hospital Tier Endorsements', 'Smart Card Chip Specs'], 'auto'),
  ('nrc_zambia', 'NRC card-zambia', 'National Registration Department',
   'Official Zambia National Registration Card (NRC) issuance, verification and CR80 card generation.',
   'identity', 'CreditCard', true, 1,
   array['NRC Number Verification', 'Biometric Photo Cropping', 'Digital Signature Specimen', 'Barcode & QR Validation'], 'auto'),
  ('ajira', 'Ajira Portal Services', 'Public Service Recruitment Secretariat',
   'Government job application portfolios, civil service recruitment IDs & applicant profiles.',
   'education', 'Briefcase', false, 1,
   array['Civil Service Application Sync', 'Cadre Certificate Validation', 'Interview Pass Generation'], 'auto')
on conflict (id) do nothing;

alter table public.services enable row level security;
revoke all on table public.services from public, anon, authenticated;
grant select on table public.services to anon, authenticated;
grant insert, update, delete on table public.services to authenticated;
grant all on table public.services to service_role;

 drop policy if exists services_public_read_active on public.services;
drop policy if exists services_admin_all on public.services;
create policy services_public_read_active on public.services
  for select to anon, authenticated
  using (is_active);
create policy services_admin_all on public.services for all to authenticated
  using (public.is_bigsta_admin()) with check (public.is_bigsta_admin());

alter table public.user_payments
  add column if not exists package_id text,
  add column if not exists requested_tokens integer,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

create index if not exists user_payments_normalized_reference_idx
  on public.user_payments (upper(regexp_replace(coalesce(reference, ''), '[^A-Z0-9]', '', 'g')));

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
        and upper(coalesce(p.status, 'ACTIVE')) = 'ACTIVE'
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
        and upper(coalesce(p.status, 'ACTIVE')) = 'ACTIVE'
        and (
          lower(p.id) = lower(p_key)
          or lower(coalesce(p.passkey, '')) = lower(p_key)
          or p.auth_user_id::text = p_key
        )
    )
  )
$$;

revoke all on function public.bigsta_user_owns_key(text) from public, anon;
grant execute on function public.bigsta_user_owns_key(text) to authenticated, service_role;

create or replace function public.bigsta_package_terms(p_package_id text)
returns table(price_amount numeric, token_amount integer)
language sql
stable
security definer
set search_path = ''
as $$
  select candidate.price_amount, candidate.token_amount
  from (
    select
      nullif(regexp_replace(o.price, '[^0-9]', '', 'g'), '')::numeric as price_amount,
      o.tokens as token_amount,
      1 as priority
    from public.weekly_offers o
    where o.id = p_package_id
      and o.is_active is true
      and o.start_date <= to_char(current_date, 'YYYY-MM-DD')
      and o.end_date >= to_char(current_date, 'YYYY-MM-DD')

    union all

    select
      nullif(regexp_replace(p.price, '[^0-9]', '', 'g'), '')::numeric as price_amount,
      p.usages + coalesce(p.bonus, 0) as token_amount,
      2 as priority
    from public.token_packages p
    where p.id = p_package_id
      and p.is_active is distinct from false
      and coalesce(p.visibility, 'public') = 'public'
  ) candidate
  where candidate.price_amount > 0
    and candidate.token_amount > 0
  order by candidate.priority
  limit 1
$$;

revoke all on function public.bigsta_package_terms(text) from public, anon, authenticated;
grant execute on function public.bigsta_package_terms(text) to service_role;

create or replace function public.bigsta_apply_wallet_delta(
  p_target_profile_id text,
  p_delta integer,
  p_reason text,
  p_operation_id text,
  p_mode text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_match_count integer;
  v_profile public.profiles%rowtype;
  v_wallet public.passkeys%rowtype;
  v_wallet_found boolean := false;
  v_wallet_active boolean := true;
  v_wallet_key text;
  v_legacy_wallet_id text;
  v_ledger_id text;
  v_inserted_id text;
  v_current_balance integer;
  v_current_used integer;
  v_current_total integer;
  v_new_balance integer;
  v_new_used integer;
  v_new_total integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_target_profile_id is null or btrim(p_target_profile_id) = '' then
    raise exception 'target_account_required' using errcode = '22023';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then
    raise exception 'invalid_token_delta' using errcode = '22023';
  end if;
  if p_mode not in ('adjustment', 'spend') then
    raise exception 'invalid_wallet_operation' using errcode = '22023';
  end if;
  if p_mode = 'spend' and p_delta >= 0 then
    raise exception 'spend_must_debit_tokens' using errcode = '22023';
  end if;
  if p_operation_id is null or p_operation_id !~ '^[A-Za-z0-9:_-]{1,120}$' then
    raise exception 'invalid_operation_id' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'transaction_reason_required' using errcode = '22023';
  end if;

  select count(distinct p.id), min(p.id)
    into v_match_count, v_profile_id
  from public.profiles p
  left join public.passkeys pk
    on pk.id = p_target_profile_id
   and (lower(pk.key) = lower(coalesce(p.passkey, '')) or pk.key = p.auth_user_id::text)
  where p.id = p_target_profile_id
     or p.auth_user_id::text = p_target_profile_id
     or lower(coalesce(p.passkey, '')) = lower(p_target_profile_id)
     or pk.id = p_target_profile_id;

  if v_match_count <> 1 then
    raise exception 'target_account_not_found_or_ambiguous' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bigsta-wallet:' || v_profile_id, 0));
  select * into v_profile
  from public.profiles p
  where p.id = v_profile_id
  for update;

  v_wallet_key := coalesce(
    nullif(v_profile.auth_user_id::text, ''),
    nullif(v_profile.passkey, ''),
    v_profile.id
  );

  if v_profile.auth_user_id is not null then
    select * into v_wallet
    from public.passkeys pk
    where lower(pk.key) = lower(v_profile.auth_user_id::text)
    order by pk.active desc nulls last, pk.created_at desc nulls last
    limit 1
    for update;
    v_wallet_found := found;
  end if;

  if not v_wallet_found and nullif(v_profile.passkey, '') is not null then
    select * into v_wallet
    from public.passkeys pk
    where lower(pk.key) = lower(v_profile.passkey)
    order by pk.active desc nulls last, pk.created_at desc nulls last
    limit 1
    for update;
    v_wallet_found := found;
  end if;

  if v_wallet_found then
    v_wallet_active := coalesce(v_wallet.active, true)
      and upper(coalesce(v_wallet.payment_status, 'ACTIVE')) <> 'DISABLED';
  end if;

  if not v_wallet_found then
    v_current_balance := greatest(coalesce(v_profile.tokens, 0), 0);
    v_current_used := 0;
    v_current_total := v_current_balance;
    insert into public.passkeys (
      id, key, role, active, created_date, created_at_timestamp, created_by,
      description, total_usages, used_usages, remaining_usages, payment_status,
      package_name, package_price
    ) values (
      'wallet_' || md5(v_profile.id || ':' || v_wallet_key),
      v_wallet_key,
      coalesce(v_profile.role, 'user'),
      upper(coalesce(v_profile.status, 'ACTIVE')) = 'ACTIVE',
      to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
      floor(extract(epoch from now()) * 1000)::bigint,
      coalesce(v_profile.name, 'BIGsta Wallet'),
      'Wallet account',
      v_current_total,
      v_current_used,
      v_current_balance,
      case
        when upper(coalesce(v_profile.status, 'ACTIVE')) <> 'ACTIVE' then 'DISABLED'
        when v_current_balance > 0 then 'ACTIVE'
        else 'EXHAUSTED'
      end,
      'Account balance',
      'Free'
    ) returning * into v_wallet;
    v_wallet_found := true;
  elsif v_profile.auth_user_id is not null and lower(v_wallet.key) <> lower(v_profile.auth_user_id::text) then
    v_legacy_wallet_id := v_wallet.id;
    v_current_balance := greatest(coalesce(v_wallet.remaining_usages, 0), 0);
    v_current_used := greatest(coalesce(v_wallet.used_usages, 0), 0);
    v_current_total := v_current_balance + v_current_used;

    update public.passkeys set active = false where id = v_legacy_wallet_id;
    insert into public.passkeys (
      id, key, role, active, created_date, created_at_timestamp, created_by,
      description, total_usages, used_usages, remaining_usages, payment_status,
      package_name, package_price
    ) values (
      'auth_' || v_profile.auth_user_id::text,
      v_profile.auth_user_id::text,
      coalesce(v_profile.role, 'user'),
      v_wallet_active and upper(coalesce(v_profile.status, 'ACTIVE')) = 'ACTIVE',
      to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
      floor(extract(epoch from now()) * 1000)::bigint,
      coalesce(v_profile.name, 'Supabase Auth'),
      'Email account wallet',
      v_current_total,
      v_current_used,
      v_current_balance,
      case
        when upper(coalesce(v_profile.status, 'ACTIVE')) <> 'ACTIVE' or not v_wallet_active then 'DISABLED'
        when v_current_balance > 0 then 'ACTIVE'
        else 'EXHAUSTED'
      end,
      'Account balance',
      'Free'
    ) on conflict (id) do update set
      key = excluded.key,
      total_usages = excluded.total_usages,
      used_usages = excluded.used_usages,
      remaining_usages = excluded.remaining_usages,
      active = excluded.active,
      payment_status = excluded.payment_status;

    select * into v_wallet
    from public.passkeys pk
    where lower(pk.key) = lower(v_profile.auth_user_id::text)
    order by pk.created_at desc nulls last
    limit 1
    for update;
  end if;

  v_current_balance := greatest(coalesce(v_wallet.remaining_usages, 0), 0);
  v_current_used := greatest(coalesce(v_wallet.used_usages, 0), 0);
  v_current_total := greatest(coalesce(v_wallet.total_usages, 0), v_current_balance + v_current_used);
  v_ledger_id := 'wallet:' || p_operation_id;

  if exists (select 1 from public.token_transactions t where t.id = v_ledger_id) then
    return jsonb_build_object(
      'applied', false,
      'alreadyApplied', true,
      'balance', v_current_balance,
      'profileId', v_profile.id,
      'ledgerId', v_ledger_id
    );
  end if;

  v_new_balance := v_current_balance + p_delta;
  if v_new_balance < 0 then
    raise exception 'insufficient_tokens' using errcode = '22023';
  end if;

  if p_mode = 'spend' then
    v_new_used := v_current_used - p_delta;
    v_new_total := greatest(v_current_total, v_new_balance + v_new_used);
  else
    v_new_used := v_current_used;
    v_new_total := v_new_balance + v_new_used;
  end if;

  insert into public.token_transactions (id, user_id, user_email, amount, reason, created_at)
  values (
    v_ledger_id,
    coalesce(v_profile.auth_user_id::text, v_profile.passkey, v_profile.id),
    coalesce(v_profile.auth_user_id::text, v_profile.passkey, v_profile.id),
    p_delta,
    left(btrim(p_reason), 500),
    now()
  )
  on conflict (id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object(
      'applied', false,
      'alreadyApplied', true,
      'balance', v_current_balance,
      'profileId', v_profile.id,
      'ledgerId', v_ledger_id
    );
  end if;

  update public.passkeys
  set total_usages = v_new_total,
      used_usages = v_new_used,
      remaining_usages = v_new_balance,
      payment_status = case
        when upper(coalesce(v_profile.status, 'ACTIVE')) <> 'ACTIVE' then 'DISABLED'
        when v_new_balance > 0 then 'ACTIVE'
        else 'EXHAUSTED'
      end
  where id = v_wallet.id;

  update public.profiles
  set tokens = v_new_balance,
      updated_at = now()
  where id = v_profile.id;

  update public.user_profiles
  set tokens = v_new_balance,
      updated_at = now()
  where id = v_profile.id
     or (v_profile.auth_user_id is not null and auth_user_id = v_profile.auth_user_id);

  insert into public.audit_logs (user_id, action, details, created_at)
  values (
    coalesce(p_actor_id::text, v_profile.auth_user_id::text, 'system'),
    'wallet_' || p_mode,
    jsonb_build_object(
      'profile_id', v_profile.id,
      'delta', p_delta,
      'operation_id', p_operation_id,
      'reason', left(btrim(p_reason), 300)
    )::text,
    now()
  );

  return jsonb_build_object(
    'applied', true,
    'alreadyApplied', false,
    'balance', v_new_balance,
    'profileId', v_profile.id,
    'ledgerId', v_ledger_id
  );
end;
$$;

create or replace function public.bigsta_admin_adjust_tokens(
  p_target_profile_id text,
  p_delta integer,
  p_reason text,
  p_operation_id text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor_id is null then
    raise exception 'admin_actor_required' using errcode = '22023';
  end if;

  return public.bigsta_apply_wallet_delta(
    p_target_profile_id,
    p_delta,
    'Admin adjustment: ' || left(btrim(coalesce(p_reason, 'Manual adjustment')), 350),
    'admin:' || p_operation_id,
    'adjustment',
    p_actor_id
  );
end;
$$;

create or replace function public.bigsta_user_spend_tokens(
  p_user_id uuid,
  p_service_id text,
  p_service_name text,
  p_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_status text;
  v_cost integer := 1;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or p_operation_id is null or p_operation_id !~ '^[A-Za-z0-9:_-]{1,100}$' then
    raise exception 'invalid_spend_request' using errcode = '22023';
  end if;

  select p.id, p.status into v_profile_id, v_status
  from public.profiles p
  where p.auth_user_id = p_user_id
  limit 1;

  if v_profile_id is null then
    raise exception 'account_profile_not_found' using errcode = 'P0002';
  end if;
  if upper(coalesce(v_status, 'ACTIVE')) <> 'ACTIVE' then
    raise exception 'account_disabled' using errcode = '42501';
  end if;

  select greatest(1, least(coalesce(s.token_cost, 1), 1000))
    into v_cost
  from public.services s
  where s.id = p_service_id
    and s.is_active is not false;

  if v_cost is null then
    v_cost := 1;
  end if;

  return public.bigsta_apply_wallet_delta(
    v_profile_id,
    -v_cost,
    'Service use: ' || left(coalesce(nullif(btrim(p_service_name), ''), p_service_id, 'BIGsta service'), 350),
    'spend:' || p_operation_id,
    'spend',
    p_user_id
  );
end;
$$;

create or replace function public.bigsta_link_profile_for_verified_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name text;
  v_phone text;
  v_confirmed_at timestamptz;
  v_profile_id text;
  v_legacy_key text;
  v_profile public.profiles%rowtype;
  v_legacy_profile_count integer;
  v_other_account_count integer;
  v_wallet public.passkeys%rowtype;
  v_wallet_found boolean := false;
  v_wallet_active boolean := true;
  v_balance integer := 0;
  v_used integer := 0;
  v_total integer := 0;
  v_status text := 'ACTIVE';
  v_linked_legacy boolean := false;
  v_auth_wallet_id text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user_required' using errcode = '22023';
  end if;

  select lower(btrim(u.email)), u.email_confirmed_at,
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'phone', '')), '')
    into v_email, v_confirmed_at, v_name, v_phone
  from auth.users u
  where u.id = p_user_id;

  if not found or v_email is null or v_confirmed_at is null then
    return jsonb_build_object('linked', false, 'reason', 'email_not_confirmed');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bigsta-account-link:' || v_email, 0));

  select count(*) into v_other_account_count
  from public.profiles p
  where lower(btrim(coalesce(p.email, ''))) = v_email
    and p.auth_user_id is not null
    and p.auth_user_id <> p_user_id;

  if v_other_account_count > 0 then
    return jsonb_build_object('linked', false, 'reason', 'email_already_linked');
  end if;

  select * into v_profile
  from public.profiles p
  where p.auth_user_id = p_user_id
  limit 1
  for update;

  if found then
    v_profile_id := v_profile.id;
    v_legacy_key := v_profile.passkey;
  else
    select count(*) into v_legacy_profile_count
    from public.profiles p
    where p.auth_user_id is null
      and lower(btrim(coalesce(p.email, ''))) = v_email;

    if v_legacy_profile_count > 1 then
      return jsonb_build_object('linked', false, 'reason', 'multiple_legacy_matches');
    end if;

    if v_legacy_profile_count = 1 then
      select * into v_profile
      from public.profiles p
      where p.auth_user_id is null
        and lower(btrim(coalesce(p.email, ''))) = v_email
      limit 1
      for update;
      v_profile_id := v_profile.id;
      v_legacy_key := v_profile.passkey;
      v_linked_legacy := true;
    else
      v_profile_id := p_user_id::text;
      if exists (select 1 from public.profiles p where p.id = v_profile_id) then
        v_profile_id := 'auth_' || p_user_id::text;
      end if;
      v_legacy_key := p_user_id::text;
      v_profile.id := v_profile_id;
      v_profile.auth_user_id := p_user_id;
      v_profile.passkey := v_legacy_key;
      v_profile.role := 'user';
      v_profile.status := 'ACTIVE';
      v_profile.tokens := 0;
      v_profile.name := v_name;
      v_profile.phone := v_phone;
      v_profile.email := v_email;
      insert into public.profiles (id, auth_user_id, name, phone, email, role, passkey, tokens, status)
      values (v_profile_id, p_user_id, v_name, v_phone, v_email, 'user', v_legacy_key, 0, 'ACTIVE');
    end if;
  end if;

  v_auth_wallet_id := 'auth_' || p_user_id::text;

  if v_linked_legacy then
    if nullif(v_legacy_key, '') is not null then
      select * into v_wallet
      from public.passkeys pk
      where lower(pk.key) = lower(v_legacy_key)
      order by pk.active desc nulls last, pk.created_at desc nulls last
      limit 1
      for update;
      v_wallet_found := found;
    end if;
  else
    select * into v_wallet
    from public.passkeys pk
    where lower(pk.key) = lower(p_user_id::text)
    order by pk.active desc nulls last, pk.created_at desc nulls last
    limit 1
    for update;
    v_wallet_found := found;

    if not v_wallet_found and nullif(v_legacy_key, '') is not null then
      select * into v_wallet
      from public.passkeys pk
      where lower(pk.key) = lower(v_legacy_key)
      order by pk.active desc nulls last, pk.created_at desc nulls last
      limit 1
      for update;
      v_wallet_found := found;
    end if;
  end if;

  if v_wallet_found then
    v_balance := greatest(coalesce(v_wallet.remaining_usages, 0), 0);
    v_used := greatest(coalesce(v_wallet.used_usages, 0), 0);
    v_wallet_active := coalesce(v_wallet.active, true)
      and upper(coalesce(v_wallet.payment_status, 'ACTIVE')) <> 'DISABLED';
  else
    v_balance := greatest(coalesce(v_profile.tokens, 0), 0);
    v_used := 0;
  end if;
  v_total := v_balance + v_used;
  v_status := coalesce(v_profile.status, 'ACTIVE');

  update public.profiles
  set auth_user_id = p_user_id,
      email = v_email,
      name = coalesce(public.profiles.name, v_name),
      phone = coalesce(public.profiles.phone, v_phone),
      role = 'user',
      passkey = coalesce(public.profiles.passkey, p_user_id::text),
      tokens = v_balance,
      status = coalesce(public.profiles.status, 'ACTIVE'),
      updated_at = now()
  where id = v_profile_id;

  if v_wallet_found and lower(v_wallet.key) <> lower(p_user_id::text) then
    update public.passkeys set active = false where id = v_wallet.id;
  end if;

  insert into public.passkeys (
    id, key, role, active, created_date, created_at_timestamp, created_by,
    description, total_usages, used_usages, remaining_usages, payment_status,
    package_name, package_price
  ) values (
    v_auth_wallet_id,
    p_user_id::text,
    'user',
    v_wallet_active and upper(v_status) = 'ACTIVE',
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
    floor(extract(epoch from now()) * 1000)::bigint,
    coalesce(v_name, 'Supabase Auth'),
    'Email account wallet',
    v_total,
    v_used,
    v_balance,
    case
      when upper(v_status) <> 'ACTIVE' or not v_wallet_active then 'DISABLED'
      when v_balance > 0 then 'ACTIVE'
      else 'EXHAUSTED'
    end,
    case when v_balance > 0 then 'Account balance' else 'No tokens' end,
    'Free'
  ) on conflict (id) do update set
    key = excluded.key,
    role = 'user',
    active = excluded.active,
    total_usages = excluded.total_usages,
    used_usages = excluded.used_usages,
    remaining_usages = excluded.remaining_usages,
    payment_status = excluded.payment_status;

  insert into public.user_profiles (id, auth_user_id, name, phone, email, role, passkey, tokens, status)
  select p.id, p.auth_user_id, p.name, p.phone, p.email, p.role, p.passkey, p.tokens, p.status
  from public.profiles p
  where p.id = v_profile_id
  on conflict (id) do update set
    auth_user_id = excluded.auth_user_id,
    name = coalesce(public.user_profiles.name, excluded.name),
    phone = coalesce(public.user_profiles.phone, excluded.phone),
    email = excluded.email,
    role = excluded.role,
    passkey = coalesce(public.user_profiles.passkey, excluded.passkey),
    tokens = excluded.tokens,
    status = coalesce(public.user_profiles.status, excluded.status),
    updated_at = now();

  return jsonb_build_object(
    'linked', true,
    'linkedLegacy', v_linked_legacy,
    'profileId', v_profile_id,
    'balance', v_balance
  );
end;
$$;

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
  v_email text;
  v_grant_id text := gen_random_uuid()::text;
  v_inserted integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select p.id, p.phone, p.email
    into v_profile_id, v_phone, v_email
  from public.profiles p
  where p.auth_user_id = p_user_id
  for update;

  if v_profile_id is null or v_phone is null then
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

  perform public.bigsta_apply_wallet_delta(
    v_profile_id,
    1,
    'Verified welcome token',
    'welcome:' || v_grant_id,
    'adjustment',
    p_user_id
  );

  return 1;
end;
$$;

create or replace function public.bigsta_submit_package_request(
  p_user_id uuid,
  p_package_id text,
  p_operation_id text,
  p_sender text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_price numeric;
  v_tokens integer;
  v_payment_id text;
  v_existing public.user_payments%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or p_operation_id is null or p_operation_id !~ '^[A-Za-z0-9:_-]{1,100}$' then
    raise exception 'invalid_payment_request' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles p
  where p.auth_user_id = p_user_id
  for update;
  if not found or upper(coalesce(v_profile.status, 'ACTIVE')) <> 'ACTIVE' then
    raise exception 'active_account_required' using errcode = '42501';
  end if;

  select t.price_amount, t.token_amount into v_price, v_tokens
  from public.bigsta_package_terms(p_package_id) t;
  if v_price is null or v_tokens is null then
    raise exception 'package_unavailable' using errcode = '22023';
  end if;

  v_payment_id := 'package:' || p_operation_id;
  perform pg_advisory_xact_lock(hashtextextended('bigsta-package-request:' || p_user_id::text || ':' || p_operation_id, 0));
  select * into v_existing from public.user_payments p where p.id = v_payment_id;
  if found then
    return jsonb_build_object(
      'outcome', 'PENDING',
      'alreadySubmitted', true,
      'paymentId', v_existing.id,
      'amount', v_existing.amount,
      'tokensRequested', v_existing.requested_tokens
    );
  end if;

  insert into public.user_payments (
    id, user_id, user_name, user_phone, amount, sender, receiver, reference,
    status, payment_date, tokens_granted, package_id, requested_tokens
  ) values (
    v_payment_id,
    p_user_id::text,
    v_profile.name,
    v_profile.phone,
    v_price,
    coalesce(nullif(left(btrim(p_sender), 100), ''), 'Package request'),
    'BIGsta Services',
    null,
    'PENDING',
    now()::text,
    0,
    p_package_id,
    v_tokens
  );

  return jsonb_build_object(
    'outcome', 'PENDING',
    'alreadySubmitted', false,
    'paymentId', v_payment_id,
    'amount', v_price,
    'tokensRequested', v_tokens
  );
end;
$$;

create or replace function public.bigsta_submit_recharge_claim(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_package_id text,
  p_sender text,
  p_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_ref text;
  v_price numeric;
  v_tokens integer;
  v_token_price numeric := 2000;
  v_sms public.sms_logs%rowtype;
  v_sms_found boolean := false;
  v_sms_count integer;
  v_sms_reviewed_count integer;
  v_payment public.user_payments%rowtype;
  v_payment_found boolean := false;
  v_payment_count integer;
  v_payment_id text;
  v_status text := 'PENDING';
  v_receiver text := 'BIGsta Services';
  v_sender text;
  v_balance_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or p_operation_id is null or p_operation_id !~ '^[A-Za-z0-9:_-]{1,100}$' then
    raise exception 'invalid_recharge_claim' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 or p_amount <> trunc(p_amount) then
    raise exception 'invalid_payment_amount' using errcode = '22023';
  end if;

  v_ref := upper(regexp_replace(coalesce(p_reference, ''), '[^A-Z0-9]', '', 'g'));
  if length(v_ref) < 4 or length(v_ref) > 40 then
    raise exception 'invalid_transaction_reference' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles p
  where p.auth_user_id = p_user_id
  for update;
  if not found or upper(coalesce(v_profile.status, 'ACTIVE')) <> 'ACTIVE' then
    raise exception 'active_account_required' using errcode = '42501';
  end if;

  v_payment_id := 'claim:' || p_operation_id;
  select * into v_payment
  from public.user_payments p
  where p.id = v_payment_id
  for update;
  if found then
    if v_payment.user_id is not null
       and v_payment.user_id <> p_user_id::text
       and not exists (
         select 1 from public.profiles p
         where p.auth_user_id = p_user_id
           and (p.id = v_payment.user_id or p.passkey = v_payment.user_id)
       ) then
      return jsonb_build_object('outcome', 'ALREADY_CLAIMED');
    end if;
    if upper(coalesce(v_payment.status, '')) = 'VERIFIED' then
      return jsonb_build_object(
        'outcome', 'VERIFIED',
        'alreadySubmitted', true,
        'paymentId', v_payment.id,
        'tokensGranted', v_payment.tokens_granted
      );
    end if;
    if upper(coalesce(v_payment.status, '')) = 'REJECTED' then
      return jsonb_build_object('outcome', 'ALREADY_USED', 'paymentId', v_payment.id);
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bigsta-payment-reference:' || v_ref, 0));

  if nullif(p_package_id, '') is not null then
    select t.price_amount, t.token_amount into v_price, v_tokens
    from public.bigsta_package_terms(p_package_id) t;
    if v_price is null or v_tokens is null then
      raise exception 'package_unavailable' using errcode = '22023';
    end if;
    if p_amount <> v_price then
      return jsonb_build_object('outcome', 'AMOUNT_MISMATCH', 'expectedAmount', v_price);
    end if;
  else
    select case
      when coalesce(s.config_value ->> 'tokenPriceTsh', '') ~ '^[0-9]+([.][0-9]+)?$'
        then (s.config_value ->> 'tokenPriceTsh')::numeric
      else 2000::numeric
    end
    into v_token_price
    from public.system_settings s
    where s.config_key = 'admin_settings';
    v_token_price := greatest(coalesce(nullif(v_token_price, 0), 2000), 1);
    v_tokens := greatest(1, floor(p_amount / v_token_price)::integer);
  end if;

  select count(*) into v_payment_count
  from public.user_payments p
  where upper(regexp_replace(coalesce(p.reference, ''), '[^A-Z0-9]', '', 'g')) = v_ref;

  if v_payment_count > 1 then
    return jsonb_build_object('outcome', 'REFERENCE_REVIEW_REQUIRED');
  elsif v_payment_count = 1 then
    select * into v_payment
    from public.user_payments p
    where upper(regexp_replace(coalesce(p.reference, ''), '[^A-Z0-9]', '', 'g')) = v_ref
    limit 1
    for update;
    v_payment_found := found;

    if upper(coalesce(v_payment.status, '')) in ('VERIFIED', 'USED', 'REJECTED') then
      return jsonb_build_object('outcome', 'ALREADY_USED');
    end if;
    if v_payment.user_id is not null
       and v_payment.user_id <> p_user_id::text
       and not exists (
         select 1 from public.profiles p
         where p.auth_user_id = p_user_id
           and (p.id = v_payment.user_id or p.passkey = v_payment.user_id)
       ) then
      return jsonb_build_object('outcome', 'ALREADY_CLAIMED');
    end if;
    if v_payment.amount > 0 and v_payment.amount <> p_amount then
      return jsonb_build_object('outcome', 'AMOUNT_MISMATCH', 'expectedAmount', v_payment.amount);
    end if;
    v_payment_id := v_payment.id;
  end if;

  select count(*) into v_sms_count
  from public.sms_logs s
  where upper(regexp_replace(coalesce(s.reference, ''), '[^A-Z0-9]', '', 'g')) = v_ref
     or upper(regexp_replace(coalesce(s.transaction_id, ''), '[^A-Z0-9]', '', 'g')) = v_ref;

  select count(*) into v_sms_reviewed_count
  from public.sms_logs s
  where (upper(regexp_replace(coalesce(s.reference, ''), '[^A-Z0-9]', '', 'g')) = v_ref
      or upper(regexp_replace(coalesce(s.transaction_id, ''), '[^A-Z0-9]', '', 'g')) = v_ref)
    and s.status <> 'UNREVIEWED';

  if v_sms_reviewed_count > 0 then
    return jsonb_build_object('outcome', 'ALREADY_USED');
  end if;

  if v_sms_count > 0 then
    select * into v_sms
    from public.sms_logs s
    where upper(regexp_replace(coalesce(s.reference, ''), '[^A-Z0-9]', '', 'g')) = v_ref
       or upper(regexp_replace(coalesce(s.transaction_id, ''), '[^A-Z0-9]', '', 'g')) = v_ref
    order by (s.status = 'UNREVIEWED') desc, s.received_at desc
    limit 1
    for update;
    v_sms_found := found;

    if v_sms_found and v_sms.status <> 'UNREVIEWED' then
      return jsonb_build_object('outcome', 'ALREADY_USED');
    end if;
    if v_sms_found and v_sms.processing_state = 'PARSED' and v_sms.amount is not null then
      if v_sms.amount <> p_amount then
        return jsonb_build_object('outcome', 'AMOUNT_MISMATCH', 'expectedAmount', v_sms.amount);
      end if;
      v_status := 'VERIFIED';
      v_sender := coalesce(v_sms.payer_name, p_sender, 'Mobile Money User');
      v_receiver := coalesce(v_sms.receiver, 'BIGsta Gateway');
    else
      v_sender := coalesce(nullif(left(btrim(p_sender), 100), ''), 'User claim');
    end if;
  else
    v_sender := coalesce(nullif(left(btrim(p_sender), 100), ''), 'User claim');
  end if;

  if v_payment_found then
    update public.user_payments
    set user_id = p_user_id::text,
        user_name = coalesce(user_name, v_profile.name),
        user_phone = coalesce(user_phone, v_profile.phone),
        amount = p_amount,
        sender = v_sender,
        receiver = v_receiver,
        status = v_status,
        payment_date = now()::text,
        tokens_granted = case when v_status = 'VERIFIED' then v_tokens else 0 end,
        package_id = nullif(p_package_id, ''),
        requested_tokens = v_tokens
    where id = v_payment_id;
  else
    insert into public.user_payments (
      id, user_id, user_name, user_phone, amount, sender, receiver, reference,
      status, payment_date, tokens_granted, package_id, requested_tokens
    ) values (
      v_payment_id,
      p_user_id::text,
      v_profile.name,
      v_profile.phone,
      p_amount,
      v_sender,
      v_receiver,
      v_ref,
      v_status,
      now()::text,
      case when v_status = 'VERIFIED' then v_tokens else 0 end,
      nullif(p_package_id, ''),
      v_tokens
    );
  end if;

  if v_status = 'VERIFIED' then
    update public.sms_logs set status = 'REVIEWED' where id = v_sms.id;
    v_balance_result := public.bigsta_apply_wallet_delta(
      v_profile.id,
      v_tokens,
      'Verified recharge: ' || v_ref,
      'recharge:' || v_payment_id,
      'adjustment',
      p_user_id
    );
  end if;

  return jsonb_build_object(
    'outcome', v_status,
    'paymentId', v_payment_id,
    'tokensGranted', case when v_status = 'VERIFIED' then v_tokens else 0 end,
    'tokensRequested', v_tokens,
    'balance', v_balance_result -> 'balance'
  );
end;
$$;

create or replace function public.bigsta_admin_review_payment(
  p_payment_id text,
  p_target_profile_id text,
  p_approve boolean,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.user_payments%rowtype;
  v_profile_id text;
  v_match_count integer;
  v_profile public.profiles%rowtype;
  v_tokens integer;
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor_id is null or nullif(btrim(p_payment_id), '') is null then
    raise exception 'invalid_payment_review' using errcode = '22023';
  end if;

  select * into v_payment
  from public.user_payments p
  where p.id = p_payment_id
  for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if upper(coalesce(v_payment.status, '')) = 'VERIFIED' then
    return jsonb_build_object('outcome', 'ALREADY_VERIFIED', 'paymentId', v_payment.id, 'tokensGranted', v_payment.tokens_granted);
  end if;
  if upper(coalesce(v_payment.status, '')) = 'REJECTED' then
    return jsonb_build_object('outcome', 'ALREADY_REJECTED', 'paymentId', v_payment.id);
  end if;
  if upper(coalesce(v_payment.status, '')) <> 'PENDING' then
    raise exception 'payment_not_pending' using errcode = '22023';
  end if;

  if p_approve then
    v_profile_id := coalesce(nullif(p_target_profile_id, ''), v_payment.user_id);
    select count(distinct p.id), min(p.id)
      into v_match_count, v_profile_id
    from public.profiles p
    left join public.passkeys pk
      on pk.id = coalesce(nullif(p_target_profile_id, ''), v_payment.user_id)
     and (lower(pk.key) = lower(coalesce(p.passkey, '')) or pk.key = p.auth_user_id::text)
    where p.id = coalesce(nullif(p_target_profile_id, ''), v_payment.user_id)
       or p.auth_user_id::text = coalesce(nullif(p_target_profile_id, ''), v_payment.user_id)
       or lower(coalesce(p.passkey, '')) = lower(coalesce(nullif(p_target_profile_id, ''), v_payment.user_id))
       or pk.id = coalesce(nullif(p_target_profile_id, ''), v_payment.user_id);

    if v_match_count <> 1 then
      raise exception 'payment_target_account_required' using errcode = 'P0002';
    end if;

    select * into v_profile
    from public.profiles p
    where p.id = v_profile_id
    for update;

    v_tokens := coalesce(nullif(p_tokens, 0), nullif(v_payment.requested_tokens, 0), nullif(v_payment.tokens_granted, 0));
    if v_tokens is null or v_tokens < 1 or v_tokens > 1000000 then
      raise exception 'invalid_token_grant' using errcode = '22023';
    end if;

    v_result := public.bigsta_apply_wallet_delta(
      v_profile_id,
      v_tokens,
      'Recharge approved: ' || coalesce(nullif(v_payment.reference, ''), v_payment.id) || coalesce(': ' || nullif(left(btrim(p_reason), 250), ''), ''),
      'payment-review:' || v_payment.id,
      'adjustment',
      p_actor_id
    );

    update public.sms_logs
    set status = 'REVIEWED'
    where v_payment.reference is not null
      and (upper(regexp_replace(coalesce(reference, ''), '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(v_payment.reference, '[^A-Z0-9]', '', 'g'))
       or upper(regexp_replace(coalesce(transaction_id, ''), '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(v_payment.reference, '[^A-Z0-9]', '', 'g')));

    update public.user_payments
    set user_id = coalesce(v_profile.auth_user_id::text, v_profile.id),
        status = 'VERIFIED',
        tokens_granted = v_tokens,
        reviewed_by = p_actor_id,
        reviewed_at = now(),
        payment_date = now()::text
    where id = v_payment.id;

    return jsonb_build_object('outcome', 'VERIFIED', 'paymentId', v_payment.id, 'tokensGranted', v_tokens, 'balance', v_result -> 'balance');
  end if;

  update public.sms_logs
  set status = 'REVIEWED'
  where v_payment.reference is not null
    and (upper(regexp_replace(coalesce(reference, ''), '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(v_payment.reference, '[^A-Z0-9]', '', 'g'))
      or upper(regexp_replace(coalesce(transaction_id, ''), '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(v_payment.reference, '[^A-Z0-9]', '', 'g')));

  update public.user_payments
  set status = 'REJECTED',
      tokens_granted = 0,
      reviewed_by = p_actor_id,
      reviewed_at = now()
  where id = v_payment.id;

  insert into public.audit_logs (user_id, action, details, created_at)
  values (
    p_actor_id::text,
    'payment_rejected',
    jsonb_build_object('payment_id', v_payment.id, 'reason', left(btrim(coalesce(p_reason, '')), 300))::text,
    now()
  );

  return jsonb_build_object('outcome', 'REJECTED', 'paymentId', v_payment.id);
end;
$$;

create or replace function public.bigsta_admin_set_user_status(
  p_target_profile_id text,
  p_status text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text;
  v_match_count integer;
  v_profile public.profiles%rowtype;
  v_status text := upper(coalesce(p_status, ''));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor_id is null or v_status not in ('ACTIVE', 'DISABLED') then
    raise exception 'invalid_account_status' using errcode = '22023';
  end if;

  select count(distinct p.id), min(p.id)
    into v_match_count, v_profile_id
  from public.profiles p
  left join public.passkeys pk
    on pk.id = p_target_profile_id
   and (lower(pk.key) = lower(coalesce(p.passkey, '')) or pk.key = p.auth_user_id::text)
  where p.id = p_target_profile_id
     or p.auth_user_id::text = p_target_profile_id
     or lower(coalesce(p.passkey, '')) = lower(p_target_profile_id)
     or pk.id = p_target_profile_id;

  if v_match_count <> 1 then
    raise exception 'target_account_not_found_or_ambiguous' using errcode = 'P0002';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_profile_id
  for update;
  if v_profile.role = 'admin' then
    raise exception 'cannot_change_admin_status' using errcode = '42501';
  end if;

  update public.profiles set status = v_status, updated_at = now() where id = v_profile_id;
  update public.user_profiles
  set status = v_status, updated_at = now()
  where id = v_profile_id
     or (v_profile.auth_user_id is not null and auth_user_id = v_profile.auth_user_id);

  insert into public.audit_logs (user_id, action, details, created_at)
  values (
    p_actor_id::text,
    'account_status_changed',
    jsonb_build_object('profile_id', v_profile_id, 'status', v_status)::text,
    now()
  );

  return jsonb_build_object('profileId', v_profile_id, 'status', v_status);
end;
$$;

revoke all on function public.bigsta_apply_wallet_delta(text, integer, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.bigsta_admin_adjust_tokens(text, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.bigsta_user_spend_tokens(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.bigsta_link_profile_for_verified_user(uuid) from public, anon, authenticated;
revoke all on function public.grant_bigsta_welcome_token(uuid) from public, anon, authenticated;
revoke all on function public.bigsta_submit_package_request(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.bigsta_submit_recharge_claim(uuid, numeric, text, text, text, text) from public, anon, authenticated;
revoke all on function public.bigsta_admin_review_payment(text, text, boolean, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.bigsta_admin_set_user_status(text, text, uuid) from public, anon, authenticated;

grant execute on function public.bigsta_apply_wallet_delta(text, integer, text, text, text, uuid) to service_role;
grant execute on function public.bigsta_admin_adjust_tokens(text, integer, text, text, uuid) to service_role;
grant execute on function public.bigsta_user_spend_tokens(uuid, text, text, text) to service_role;
grant execute on function public.bigsta_link_profile_for_verified_user(uuid) to service_role;
grant execute on function public.grant_bigsta_welcome_token(uuid) to service_role;
grant execute on function public.bigsta_submit_package_request(uuid, text, text, text) to service_role;
grant execute on function public.bigsta_submit_recharge_claim(uuid, numeric, text, text, text, text) to service_role;
grant execute on function public.bigsta_admin_review_payment(text, text, boolean, integer, text, uuid) to service_role;
grant execute on function public.bigsta_admin_set_user_status(text, text, uuid) to service_role;

notify pgrst, 'reload schema';
