ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS branding_mode text
    CHECK (branding_mode IN ('none','company','customer','custom')) DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS branding_logo_url text;