ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique ON public.profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_auth_user_id_unique ON public.user_profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
GRANT SELECT, UPDATE ON public.profiles, public.user_profiles TO authenticated;
GRANT ALL ON public.profiles, public.user_profiles, public.user_roles TO service_role;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r record; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' LOOP EXECUTE format('DROP POLICY %I ON public.user_roles',r.policyname); END LOOP; END $$;
CREATE POLICY roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
INSERT INTO public.user_roles(user_id,role,updated_at) SELECT id,'admin',now() FROM auth.users WHERE id='5a83275e-124f-4984-a438-c03e8e67d7de'::uuid AND lower(email)='mbwilogodfrey123@gmail.com' ON CONFLICT(user_id) DO UPDATE SET role='admin',updated_at=now();
CREATE OR REPLACE FUNCTION public.is_bigsta_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') $$;
REVOKE ALL ON FUNCTION public.is_bigsta_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_bigsta_admin() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bigsta_sync_email_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE profile_id uuid; BEGIN
SELECT id INTO profile_id FROM public.profiles WHERE auth_user_id=NEW.id;
IF profile_id IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN SELECT id INTO profile_id FROM public.profiles WHERE auth_user_id IS NULL AND lower(trim(email))=lower(trim(NEW.email)) ORDER BY created_at LIMIT 1; END IF;
profile_id:=coalesce(profile_id,NEW.id);
INSERT INTO public.profiles(id,auth_user_id,name,phone,email,passkey,status,created_at)
VALUES(profile_id,NEW.id,coalesce(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name'),CASE WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.phone=NEW.raw_user_meta_data->>'phone' AND p.id<>profile_id) THEN NULL ELSE NEW.raw_user_meta_data->>'phone' END,NEW.email,NEW.id::text,'ACTIVE',NEW.created_at)
ON CONFLICT(id) DO UPDATE SET auth_user_id=excluded.auth_user_id,email=excluded.email,name=coalesce(public.profiles.name,excluded.name),phone=coalesce(public.profiles.phone,excluded.phone),updated_at=now();
INSERT INTO public.user_profiles(id,auth_user_id,name,phone,email,passkey,tokens,status,created_at)
SELECT id,auth_user_id,name,phone,email,passkey,tokens,status,created_at FROM public.profiles WHERE id=profile_id
ON CONFLICT(id) DO UPDATE SET auth_user_id=excluded.auth_user_id,email=excluded.email,name=excluded.name,phone=excluded.phone,updated_at=now();
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.bigsta_sync_email_profile() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS bigsta_email_profile_sync ON auth.users;
CREATE TRIGGER bigsta_email_profile_sync AFTER INSERT OR UPDATE OF email,email_confirmed_at,raw_user_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bigsta_sync_email_profile();
UPDATE public.profiles p SET auth_user_id=u.id,updated_at=now() FROM auth.users u WHERE p.auth_user_id IS NULL AND u.email_confirmed_at IS NOT NULL AND lower(trim(p.email))=lower(trim(u.email)) AND NOT EXISTS(SELECT 1 FROM public.profiles x WHERE x.auth_user_id=u.id) AND p.id=(SELECT x.id FROM public.profiles x WHERE x.auth_user_id IS NULL AND lower(trim(x.email))=lower(trim(u.email)) ORDER BY x.created_at LIMIT 1);
INSERT INTO public.profiles(id,auth_user_id,name,phone,email,passkey,status,created_at)
SELECT u.id,u.id,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name'),CASE WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.phone=u.raw_user_meta_data->>'phone') OR EXISTS(SELECT 1 FROM auth.users x WHERE x.id<>u.id AND x.raw_user_meta_data->>'phone'=u.raw_user_meta_data->>'phone') THEN NULL ELSE u.raw_user_meta_data->>'phone' END,u.email,u.id::text,'ACTIVE',u.created_at FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.auth_user_id=u.id) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.user_profiles(id,auth_user_id,name,phone,email,passkey,tokens,status,created_at)
SELECT id,auth_user_id,name,phone,email,passkey,tokens,status,created_at FROM public.profiles WHERE auth_user_id IS NOT NULL ON CONFLICT(id) DO UPDATE SET auth_user_id=excluded.auth_user_id,email=excluded.email,name=excluded.name,phone=excluded.phone,updated_at=now();
CREATE OR REPLACE FUNCTION public.bigsta_guard_account_fields() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
IF auth.uid() IS NOT NULL AND NOT public.is_bigsta_admin() AND (NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email OR NEW.passkey IS DISTINCT FROM OLD.passkey OR NEW.tokens IS DISTINCT FROM OLD.tokens OR NEW.status IS DISTINCT FROM OLD.status) THEN RAISE EXCEPTION 'Protected account fields cannot be changed'; END IF;
NEW.updated_at:=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.bigsta_guard_account_fields() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS bigsta_profile_guard ON public.profiles;
CREATE TRIGGER bigsta_profile_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.bigsta_guard_account_fields();
DROP TRIGGER IF EXISTS bigsta_profile_guard ON public.user_profiles;
CREATE TRIGGER bigsta_profile_guard BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.bigsta_guard_account_fields();
DO $$ DECLARE t text; r record; BEGIN FOREACH t IN ARRAY ARRAY['profiles','user_profiles'] LOOP
EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
EXECUTE format('REVOKE INSERT,DELETE ON public.%I FROM authenticated',t);
FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,t); END LOOP;
EXECUTE format('CREATE POLICY account_read ON public.%I FOR SELECT TO authenticated USING(auth_user_id=auth.uid() OR public.is_bigsta_admin())',t);
EXECUTE format('CREATE POLICY account_edit ON public.%I FOR UPDATE TO authenticated USING(auth_user_id=auth.uid() OR public.is_bigsta_admin()) WITH CHECK(auth_user_id=auth.uid() OR public.is_bigsta_admin())',t);
END LOOP; END $$;
GRANT SELECT ON public.templates,public.template_categories,public.background_assets TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.templates,public.template_categories,public.background_assets TO authenticated;
GRANT ALL ON public.templates,public.template_categories,public.background_assets TO service_role;
REVOKE INSERT,UPDATE,DELETE ON public.templates,public.template_categories,public.background_assets FROM anon;
DO $$ DECLARE t text; r record; BEGIN FOREACH t IN ARRAY ARRAY['templates','template_categories','background_assets'] LOOP
EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,t); END LOOP;
IF t='templates' THEN EXECUTE 'CREATE POLICY available_designs ON public.templates FOR SELECT TO anon,authenticated USING(is_active IS DISTINCT FROM false)'; ELSE EXECUTE format('CREATE POLICY available_designs ON public.%I FOR SELECT TO anon,authenticated USING(true)',t); END IF;
EXECUTE format('CREATE POLICY admin_designs ON public.%I FOR ALL TO authenticated USING(public.is_bigsta_admin()) WITH CHECK(public.is_bigsta_admin())',t);
END LOOP; END $$;