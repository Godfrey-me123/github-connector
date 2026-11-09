-- 1. Realtime replication & publication for all 5 channels
ALTER TABLE public.user_feedback REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_feedback'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feedback;
  END IF;
END $$;

-- 2. Standardize user email and user id on user_feedback
ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON public.user_feedback(user_id, user_email);

-- 3. Row Level Security for user_feedback
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own feedback" ON public.user_feedback;
CREATE POLICY "Users can read own feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (
    user_id::text = (auth.uid())::text
    OR user_email = (auth.jwt() ->> 'email')
    OR public.is_bigsta_admin()
  );

DROP POLICY IF EXISTS "Users can insert feedback" ON public.user_feedback;
CREATE POLICY "Users can insert feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = (auth.uid())::text
    OR public.is_bigsta_admin()
  );

DROP POLICY IF EXISTS "Admins can update feedback" ON public.user_feedback;
CREATE POLICY "Admins can update feedback"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (public.is_bigsta_admin())
  WITH CHECK (public.is_bigsta_admin());

-- 4. Atomic Admin Token Grant RPC (for Admin Manual Top-Ups)
CREATE OR REPLACE FUNCTION public.admin_grant_tokens(
  p_target_user_id uuid,
  p_tokens integer,
  p_reason text DEFAULT 'Admin manual grant'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_tokens integer;
BEGIN
  IF NOT public.is_bigsta_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin role required');
  END IF;

  UPDATE public.profiles
  SET tokens = coalesce(tokens, 0) + p_tokens,
      updated_at = now()
  WHERE auth_user_id::text = p_target_user_id::text
  RETURNING tokens INTO v_new_tokens;

  UPDATE public.user_profiles
  SET tokens = coalesce(tokens, 0) + p_tokens,
      updated_at = now()
  WHERE auth_user_id::text = p_target_user_id::text;

  INSERT INTO public.token_transactions (
    user_id,
    tokens,
    transaction_type,
    description
  ) VALUES (
    p_target_user_id,
    p_tokens,
    'ADMIN_GRANT',
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_tokens', v_new_tokens,
    'granted', p_tokens
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) TO authenticated, service_role;

-- 5. Atomic Token Consumption RPC (consume_user_tokens)
CREATE OR REPLACE FUNCTION public.consume_user_tokens(
  p_cost integer DEFAULT 1,
  p_service_name text DEFAULT 'Card Generation',
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_tokens integer;
  v_new_tokens integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: login required');
  END IF;

  IF public.is_bigsta_admin() THEN
    RETURN jsonb_build_object('success', true, 'remaining_tokens', 99999, 'cost', 0, 'is_admin', true);
  END IF;

  SELECT coalesce(tokens, 0) INTO v_current_tokens
  FROM public.profiles
  WHERE auth_user_id::text = v_user_id::text
  FOR UPDATE;

  IF v_current_tokens IS NULL THEN
    SELECT coalesce(tokens, 0) INTO v_current_tokens
    FROM public.user_profiles
    WHERE auth_user_id::text = v_user_id::text
    FOR UPDATE;
  END IF;

  IF v_current_tokens IS NULL OR v_current_tokens < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient tokens. Requires ' || p_cost || ', available ' || coalesce(v_current_tokens, 0),
      'remaining_tokens', coalesce(v_current_tokens, 0)
    );
  END IF;

  UPDATE public.profiles
  SET tokens = tokens - p_cost,
      updated_at = now()
  WHERE auth_user_id::text = v_user_id::text
  RETURNING tokens INTO v_new_tokens;

  UPDATE public.user_profiles
  SET tokens = coalesce(tokens, 0) - p_cost,
      updated_at = now()
  WHERE auth_user_id::text = v_user_id::text;

  INSERT INTO public.token_transactions (
    user_id,
    tokens,
    transaction_type,
    description
  ) VALUES (
    v_user_id,
    -p_cost,
    'USAGE_DEDUCTION',
    coalesce(p_details, p_service_name, 'Card Generation')
  );

  RETURN jsonb_build_object(
    'success', true,
    'remaining_tokens', v_new_tokens,
    'cost', p_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_user_tokens(integer, text, text) TO authenticated;
