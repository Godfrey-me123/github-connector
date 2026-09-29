ALTER TABLE public.nida_requests
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS requester_key text,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS admin_message text,
  ADD COLUMN IF NOT EXISTS response_file_path text,
  ADD COLUMN IF NOT EXISTS response_file_name text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
GRANT UPDATE ON public.nida_requests TO anon, authenticated;
CREATE POLICY "Enable update access for all users" ON public.nida_requests FOR UPDATE USING (true) WITH CHECK (true);
INSERT INTO storage.objects (bucket_id, name) SELECT 'x','x' WHERE false;
CREATE POLICY "nida responses read" ON storage.objects FOR SELECT USING (bucket_id = 'nida_responses');
CREATE POLICY "nida responses upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'nida_responses');
CREATE POLICY "nida responses delete" ON storage.objects FOR DELETE USING (bucket_id = 'nida_responses');
CREATE POLICY "nida responses update" ON storage.objects FOR UPDATE USING (bucket_id = 'nida_responses');