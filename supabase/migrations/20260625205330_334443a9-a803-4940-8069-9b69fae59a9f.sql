
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_primary_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_secondary_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_website TEXT,
  ADD COLUMN IF NOT EXISTS contact_address TEXT,
  ADD COLUMN IF NOT EXISTS technical_responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS technical_responsible_registry TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS stamp_url TEXT,
  ADD COLUMN IF NOT EXISTS watermark_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT;

DROP POLICY IF EXISTS "company branding read own" ON storage.objects;
CREATE POLICY "company branding read own" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-branding'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);

DROP POLICY IF EXISTS "company branding write own" ON storage.objects;
CREATE POLICY "company branding write own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-branding'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);

DROP POLICY IF EXISTS "company branding update own" ON storage.objects;
CREATE POLICY "company branding update own" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-branding'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);

DROP POLICY IF EXISTS "company branding delete own" ON storage.objects;
CREATE POLICY "company branding delete own" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-branding'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);
