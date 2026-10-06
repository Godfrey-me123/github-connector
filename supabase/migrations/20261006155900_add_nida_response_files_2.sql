-- Migration to add response_file_path_2 and response_file_name_2 columns to nida_requests
-- and ensure the nida_responses storage bucket and policies exist.

ALTER TABLE public.nida_requests
  ADD COLUMN IF NOT EXISTS response_file_path_2 text,
  ADD COLUMN IF NOT EXISTS response_file_name_2 text;

-- Ensure storage bucket 'nida_responses' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('nida_responses', 'nida_responses', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure storage policies for nida_responses bucket
DROP POLICY IF EXISTS "nida responses read" ON storage.objects;
DROP POLICY IF EXISTS "nida responses upload" ON storage.objects;
DROP POLICY IF EXISTS "nida responses delete" ON storage.objects;
DROP POLICY IF EXISTS "nida responses update" ON storage.objects;

CREATE POLICY "nida responses read" ON storage.objects FOR SELECT USING (bucket_id = 'nida_responses');
CREATE POLICY "nida responses upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'nida_responses');
CREATE POLICY "nida responses delete" ON storage.objects FOR DELETE USING (bucket_id = 'nida_responses');
CREATE POLICY "nida responses update" ON storage.objects FOR UPDATE USING (bucket_id = 'nida_responses');
