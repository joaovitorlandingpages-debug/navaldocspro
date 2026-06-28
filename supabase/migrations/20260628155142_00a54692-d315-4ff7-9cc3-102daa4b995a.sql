
-- Turno C: customer link + reusable signatures
ALTER TABLE public.signature_requests ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.signature_participants ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.signature_participants ADD COLUMN IF NOT EXISTS reuse_authorized boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sig_req_customer ON public.signature_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_sig_part_customer ON public.signature_participants(customer_id);

CREATE TABLE IF NOT EXISTS public.customer_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  signature_image_url text NOT NULL,
  signature_type text NOT NULL DEFAULT 'drawn',
  signature_hash text,
  source_participant_id uuid REFERENCES public.signature_participants(id) ON DELETE SET NULL,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_signatures TO authenticated;
GRANT ALL ON public.customer_signatures TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.customer_signatures TO anon; -- portal needs to write reuse_authorized via token; admin code handles inserts

ALTER TABLE public.customer_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read customer signatures"
  ON public.customer_signatures FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "company members write customer signatures"
  ON public.customer_signatures FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

-- anon insert allowed only via service_role / signing flow; restrict anon insert to false
CREATE POLICY "anon cannot read customer signatures"
  ON public.customer_signatures FOR SELECT TO anon USING (false);
