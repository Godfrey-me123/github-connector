-- 1. Create payment_requests table for cross-device token requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  user_phone text NOT NULL DEFAULT '',
  passkey_id text DEFAULT '',
  user_passkey text DEFAULT '',
  package_id text NOT NULL,
  package_name text NOT NULL,
  amount text NOT NULL,
  requested_usages integer NOT NULL DEFAULT 1,
  lipa_number text DEFAULT '1234678',
  date text NOT NULL,
  timestamp bigint NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_timestamp ON public.payment_requests(timestamp DESC);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- 2. Bulletproof is_bigsta_admin() function
CREATE OR REPLACE FUNCTION public.is_bigsta_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    coalesce((auth.jwt()->>'email'), '') = 'mbwilogodfrey123@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bigsta_admin() TO authenticated, service_role;

-- 3. RLS Policies for payment_requests
DROP POLICY IF EXISTS "payment_requests_read" ON public.payment_requests;
CREATE POLICY "payment_requests_read" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_passkey = auth.uid()::text OR public.is_bigsta_admin());

DROP POLICY IF EXISTS "payment_requests_insert" ON public.payment_requests;
CREATE POLICY "payment_requests_insert" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_bigsta_admin());

DROP POLICY IF EXISTS "payment_requests_update" ON public.payment_requests;
CREATE POLICY "payment_requests_update" ON public.payment_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_bigsta_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_bigsta_admin());

DROP POLICY IF EXISTS "payment_requests_delete" ON public.payment_requests;
CREATE POLICY "payment_requests_delete" ON public.payment_requests
  FOR DELETE TO authenticated
  USING (public.is_bigsta_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;

-- 4. Ensure admin role mapping for mbwilogodfrey123@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE lower(email) = 'mbwilogodfrey123@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('4779091c-8cf5-4f1a-9ef4-a50310df9938', 'admin'),
  ('5a83275e-124f-4984-a438-c03e8e67d7de', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Trigger on auth.users to auto-create and sync profiles on registration
CREATE OR REPLACE FUNCTION public.bigsta_sync_email_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  v_name := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_phone := coalesce(NEW.raw_user_meta_data->>'phone', '');

  -- Insert or update public.profiles
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    name,
    phone,
    email,
    passkey,
    role,
    tokens,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    v_name,
    v_phone,
    NEW.email,
    NEW.id::text,
    'user',
    0,
    'ACTIVE',
    coalesce(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = excluded.auth_user_id,
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    phone = CASE WHEN excluded.phone <> '' THEN excluded.phone ELSE public.profiles.phone END,
    updated_at = now();

  -- Mirror to public.user_profiles if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.user_profiles (
      id,
      auth_user_id,
      name,
      phone,
      email,
      passkey,
      tokens,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.id,
      v_name,
      v_phone,
      NEW.email,
      NEW.id::text,
      0,
      'ACTIVE',
      coalesce(NEW.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id = excluded.auth_user_id,
      email = excluded.email,
      name = coalesce(public.user_profiles.name, excluded.name),
      phone = CASE WHEN excluded.phone <> '' THEN excluded.phone ELSE public.user_profiles.phone END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bigsta_email_profile_sync ON auth.users;
CREATE TRIGGER bigsta_email_profile_sync
  AFTER INSERT OR UPDATE OF email, email_confirmed_at, raw_user_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.bigsta_sync_email_profile();

-- 6. Backfill all existing auth.users into profiles immediately
INSERT INTO public.profiles (id, auth_user_id, name, phone, email, passkey, role, tokens, status, created_at)
SELECT
  u.id,
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  u.email,
  u.id::text,
  'user',
  0,
  'ACTIVE',
  coalesce(u.created_at, now())
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = excluded.auth_user_id,
  email = excluded.email;
