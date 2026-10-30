CREATE TABLE IF NOT EXISTS public.token_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  usages INTEGER NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'public',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  promotion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weekly_offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tokens INTEGER NOT NULL,
  price TEXT NOT NULL,
  services TEXT[],
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_transactions (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_wallets (
  id TEXT PRIMARY KEY,
  user_id UUID,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_payments (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ,
  receiver TEXT,
  reference TEXT,
  sender TEXT,
  status TEXT,
  tokens_granted INTEGER DEFAULT 0,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_packages_public_read" ON public.token_packages;
CREATE POLICY "token_packages_public_read" ON public.token_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "weekly_offers_public_read" ON public.weekly_offers;
CREATE POLICY "weekly_offers_public_read" ON public.weekly_offers FOR SELECT USING (true);
DROP POLICY IF EXISTS "token_transactions_public_access" ON public.token_transactions;
CREATE POLICY "token_transactions_public_access" ON public.token_transactions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "token_wallets_public_access" ON public.token_wallets;
CREATE POLICY "token_wallets_public_access" ON public.token_wallets FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "user_payments_public_access" ON public.user_payments;
CREATE POLICY "user_payments_public_access" ON public.user_payments FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.token_packages, public.weekly_offers TO anon, authenticated;
GRANT ALL ON public.token_packages, public.weekly_offers, public.token_transactions, public.token_wallets, public.user_payments TO authenticated;
GRANT ALL ON public.token_packages, public.weekly_offers, public.token_transactions, public.token_wallets, public.user_payments TO service_role;

CREATE INDEX IF NOT EXISTS token_transactions_user_id_idx ON public.token_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_payments_reference_idx ON public.user_payments (upper(reference));
CREATE INDEX IF NOT EXISTS weekly_offers_active_dates_idx ON public.weekly_offers (is_active, start_date, end_date);
