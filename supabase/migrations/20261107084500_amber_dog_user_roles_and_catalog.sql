-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'user_roles_read_own_or_admin'
  ) THEN
    CREATE POLICY "user_roles_read_own_or_admin" ON public.user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_bigsta_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'user_roles_admin_manage'
  ) THEN
    CREATE POLICY "user_roles_admin_manage" ON public.user_roles
      FOR ALL TO authenticated
      USING (public.is_bigsta_admin())
      WITH CHECK (public.is_bigsta_admin());
  END IF;
END $$;

GRANT SELECT ON public.user_roles TO authenticated;

-- 3. Assign admin role to mbwilogodfrey123@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('4779091c-8cf5-4f1a-9ef4-a50310df9938', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Ensure columns exist and seed token_packages catalog if empty
ALTER TABLE public.token_packages ADD COLUMN IF NOT EXISTS tokens integer;
ALTER TABLE public.token_packages ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.token_packages ADD COLUMN IF NOT EXISTS display_order integer;

INSERT INTO public.token_packages (id, name, tokens, usages, price, tag, is_active, display_order, sort_order)
VALUES
  ('pkg_starter', 'Starter', 3, 3, '2000', 'Basic', true, 1, 1),
  ('pkg_standard', 'Standard', 7, 7, '5000', 'Popular', true, 2, 2),
  ('pkg_pro', 'Pro Creator', 18, 18, '10000', 'Best Value', true, 3, 3)
ON CONFLICT (id) DO NOTHING;

-- 5. Ensure columns exist and seed weekly_offers catalog if empty
ALTER TABLE public.weekly_offers ADD COLUMN IF NOT EXISTS discount_percent integer;
ALTER TABLE public.weekly_offers ADD COLUMN IF NOT EXISTS badge text;

INSERT INTO public.weekly_offers (id, title, tokens, price, discount_percent, is_active, badge, start_date, end_date)
VALUES
  ('offer_creator_pass', 'Special Creator Pass', 25, '12000', 25, true, 'LIMITED TIME', '2026-01-01', '2026-12-31')
ON CONFLICT (id) DO NOTHING;
