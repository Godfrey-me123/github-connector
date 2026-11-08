-- Migration: Add user_email to payment_requests, expand admin check, and create atomic admin_approve_payment_request RPC

-- 1. Ensure user_email column exists on payment_requests
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS user_email text;

-- 2. Bulletproof is_bigsta_admin() supporting both admin emails and user_roles
CREATE OR REPLACE FUNCTION public.is_bigsta_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    coalesce((auth.jwt()->>'email'), '') IN ('mbwilogodfrey123@gmail.com', 'godfreychris2002@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bigsta_admin() TO authenticated, service_role;

-- 3. Ensure user_roles has admin entries for both emails
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE lower(trim(u.email)) IN ('mbwilogodfrey123@gmail.com', 'godfreychris2002@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Synchronize profiles role
UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(email)) IN ('mbwilogodfrey123@gmail.com', 'godfreychris2002@gmail.com');

-- 5. Atomic RPC function for Admin Approval: updates payment_requests AND credits tokens in one transaction
CREATE OR REPLACE FUNCTION public.admin_approve_payment_request(p_request_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req record;
  v_user_id uuid := NULL;
  v_tokens_to_add integer;
  v_new_tokens integer := 0;
BEGIN
  -- Security Check: caller must be an admin
  IF NOT public.is_bigsta_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  -- Find target payment request
  SELECT * INTO v_req
  FROM public.payment_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request % not found', p_request_id;
  END IF;

  -- Update payment_requests to APPROVED
  UPDATE public.payment_requests
  SET status = 'APPROVED',
      reviewed_date = to_char(now(), 'YYYY-MM-DD HH24:MI'),
      updated_at = now()
  WHERE id = p_request_id;

  -- Credit tokens to the user
  v_tokens_to_add := coalesce(v_req.requested_usages, 0);

  IF v_req.user_id IS NOT NULL THEN
    v_user_id := v_req.user_id;
  ELSIF v_req.user_passkey ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_user_id := v_req.user_passkey::uuid;
  ELSE
    -- Lookup by email if user_passkey or user_email is an email address
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(coalesce(v_req.user_email, v_req.user_passkey)))
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL AND v_tokens_to_add > 0 THEN
    UPDATE public.profiles
    SET tokens = coalesce(tokens, 0) + v_tokens_to_add,
        status = 'ACTIVE',
        updated_at = now()
    WHERE id = v_user_id OR auth_user_id = v_user_id
    RETURNING tokens INTO v_new_tokens;

    -- Also update user_profiles if present
    UPDATE public.user_profiles
    SET tokens = coalesce(tokens, 0) + v_tokens_to_add,
        status = 'ACTIVE',
        updated_at = now()
    WHERE id = v_user_id OR auth_user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'APPROVED',
    'tokens_added', v_tokens_to_add,
    'new_tokens', v_new_tokens
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_payment_request(text) TO authenticated, service_role;
