ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text, user_name text, user_contact text, category text, subject text, message text,
  attachment_url text, attachment_name text, status text NOT NULL DEFAULT 'NEW', admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feedback TO anon, authenticated;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback open access" ON public.user_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "feedback files read" ON storage.objects FOR SELECT USING (bucket_id = 'feedback_attachments');
CREATE POLICY "feedback files upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'feedback_attachments');