CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_hash TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL,
  raw_sms TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  network TEXT,
  amount NUMERIC,
  reference TEXT,
  receiver TEXT,
  balance NUMERIC,
  transaction_id TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'UNREVIEWED',
  processing_state TEXT NOT NULL DEFAULT 'PARSE_FAILED',
  source TEXT NOT NULL DEFAULT 'bigsta_apk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_logs_received_at_idx ON public.sms_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS sms_logs_status_idx ON public.sms_logs (status);
CREATE INDEX IF NOT EXISTS sms_logs_reference_idx ON public.sms_logs (upper(reference));
GRANT SELECT, INSERT, UPDATE ON public.sms_logs TO anon, authenticated;
GRANT ALL ON public.sms_logs TO service_role;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access sms_logs" ON public.sms_logs;
CREATE POLICY "Allow public access sms_logs" ON public.sms_logs FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sms_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
  END IF;
END $$;