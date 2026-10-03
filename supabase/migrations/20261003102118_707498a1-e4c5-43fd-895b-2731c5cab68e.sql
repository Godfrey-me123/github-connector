ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS secret_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS payment_type text;