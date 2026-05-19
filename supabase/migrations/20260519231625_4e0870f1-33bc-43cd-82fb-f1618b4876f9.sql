ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS regional_scope TEXT DEFAULT 'Nacional';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pilot_feedback_score INT DEFAULT 0;
