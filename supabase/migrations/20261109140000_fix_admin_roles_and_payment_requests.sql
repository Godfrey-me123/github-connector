-- Migration: Broaden admin authorization to all admin emails, profiles, and app_metadata, and ensure payment_requests cross-device visibility

-- 1. Upgrade is_bigsta_admin() to check admin emails, user_roles, profiles, and JWT app_metadata
CREATE OR REPLACE FUNCTION public.is_bigsta_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    -- Recognized administrative emails
    lower(coalesce((auth.jwt()->>'email'), '')) IN (
      'mbwilogodfrey123@gmail.com',
      'godfreychris2002@gmail.com',
      'bigsta20021998@gmail.com'
    )
    -- User explicitly has admin role in public.user_roles
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    -- User explicitly has admin role in public.profiles
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (id = auth.uid() OR auth_user_id = auth.uid()) AND role = 'admin'
    )
    -- User explicitly has admin role in JWT app_metadata
    OR coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bigsta_admin() TO authenticated, service_role, anon;

-- 2. Populate user_roles for all administrative emails from auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE lower(trim(u.email)) IN (
  'mbwilogodfrey123@gmail.com',
  'godfreychris2002@gmail.com',
  'bigsta20021998@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Synchronize profiles role
UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(email)) IN (
  'mbwilogodfrey123@gmail.com',
  'godfreychris2002@gmail.com',
  'bigsta20021998@gmail.com'
);

-- 4. Update RLS policies on public.payment_requests
DROP POLICY IF EXISTS "payment_requests_read" ON public.payment_requests;
CREATE POLICY "payment_requests_read" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_passkey = auth.uid()::text
    OR (user_email <> '' AND lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.is_bigsta_admin()
  );

DROP POLICY IF EXISTS "payment_requests_insert" ON public.payment_requests;
CREATE POLICY "payment_requests_insert" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (user_email <> '' AND lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.is_bigsta_admin()
  );

DROP POLICY IF EXISTS "payment_requests_update" ON public.payment_requests;
CREATE POLICY "payment_requests_update" ON public.payment_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_email <> '' AND lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.is_bigsta_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_email <> '' AND lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR public.is_bigsta_admin()
  );

-- Ensure publication has payment_requests for Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payment_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
  END IF;
END $$;
