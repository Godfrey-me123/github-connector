grant select on table public.system_settings to anon;
revoke insert, update, delete on table public.background_assets, public.system_settings, public.templates, public.token_packages, public.weekly_offers from anon;

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

revoke all on function public.bigsta_user_owns_key(text) from public, anon;
grant execute on function public.bigsta_user_owns_key(text) to authenticated, service_role;
revoke all on function public.bigsta_handle_new_auth_user() from public, anon, authenticated;
