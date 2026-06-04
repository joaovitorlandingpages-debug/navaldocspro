ALTER TABLE public.frontend_errors 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'corriged', 'ignored')),
ADD COLUMN IF NOT EXISTS fixed_in_version TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.frontend_errors.status IS 'Status do erro: novo, investigando, corrigido ou ignorado';
