ALTER TABLE public.user_feedback ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.user_feedback ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS feedback_type text, ADD COLUMN IF NOT EXISTS rating integer, ADD COLUMN IF NOT EXISTS comment text, ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_data text;
ALTER TABLE public.user_feedback ALTER COLUMN status SET DEFAULT 'PENDING';