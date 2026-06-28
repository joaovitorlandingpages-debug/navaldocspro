
-- 1) signature_requests
CREATE TABLE public.signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  document_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  signing_order TEXT NOT NULL DEFAULT 'free', -- 'free' | 'sequential'
  expires_at TIMESTAMPTZ,
  final_signed_pdf_url TEXT,
  evidence_certificate_url TEXT,
  document_hash TEXT,
  created_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_requests TO authenticated;
GRANT SELECT, UPDATE ON public.signature_requests TO anon;
GRANT ALL ON public.signature_requests TO service_role;
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members manage signature_requests"
ON public.signature_requests FOR ALL
TO authenticated
USING (company_id = public.current_user_company_id() OR public.is_admin_master())
WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE TRIGGER trg_signature_requests_updated
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) signature_participants
CREATE TABLE public.signature_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'outro',
  signing_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_image_url TEXT,
  signature_type TEXT,
  signature_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  location_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_participants TO authenticated;
GRANT SELECT, UPDATE ON public.signature_participants TO anon;
GRANT ALL ON public.signature_participants TO service_role;
ALTER TABLE public.signature_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members manage signature_participants"
ON public.signature_participants FOR ALL
TO authenticated
USING (company_id = public.current_user_company_id() OR public.is_admin_master())
WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

-- Public access via token (anon can read+update only their own row)
CREATE POLICY "anon read by token"
ON public.signature_participants FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon update by token"
ON public.signature_participants FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE INDEX idx_signature_participants_token ON public.signature_participants(access_token);
CREATE INDEX idx_signature_participants_req ON public.signature_participants(signature_request_id);

-- Public read of parent request (anon also needs to view document title)
CREATE POLICY "anon read signature_requests"
ON public.signature_requests FOR SELECT
TO anon
USING (true);

-- 3) signature_events
CREATE TABLE public.signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.signature_participants(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.signature_events TO authenticated;
GRANT INSERT ON public.signature_events TO anon;
GRANT ALL ON public.signature_events TO service_role;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read signature_events"
ON public.signature_events FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "company members insert signature_events"
ON public.signature_events FOR INSERT
TO authenticated
WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "anon insert signature_events"
ON public.signature_events FOR INSERT
TO anon
WITH CHECK (true);

-- 4) signature_evidence_certificates
CREATE TABLE public.signature_evidence_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  verification_code TEXT NOT NULL UNIQUE,
  document_hash TEXT,
  certificate_url TEXT,
  participants_snapshot JSONB,
  events_snapshot JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.signature_evidence_certificates TO authenticated;
GRANT SELECT ON public.signature_evidence_certificates TO anon;
GRANT ALL ON public.signature_evidence_certificates TO service_role;
ALTER TABLE public.signature_evidence_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read certificates"
ON public.signature_evidence_certificates FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "company members insert certificates"
ON public.signature_evidence_certificates FOR INSERT
TO authenticated
WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "anon read certificates by code"
ON public.signature_evidence_certificates FOR SELECT
TO anon
USING (true);
