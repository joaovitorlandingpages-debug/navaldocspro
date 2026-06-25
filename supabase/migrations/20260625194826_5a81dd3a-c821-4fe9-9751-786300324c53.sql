
ALTER TABLE public.process_dossiers
  ADD COLUMN IF NOT EXISTS dossier_number TEXT,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS zip_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS checklist_snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS documents_snapshot JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments_snapshot JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_snapshot JSONB DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_dossiers_dossier_number ON public.process_dossiers(dossier_number) WHERE dossier_number IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_dossiers TO authenticated;
GRANT ALL ON public.process_dossiers TO service_role;
