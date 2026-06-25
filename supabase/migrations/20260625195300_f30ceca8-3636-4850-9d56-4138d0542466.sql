
-- client_portal_access
CREATE TABLE public.client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','expirado','revogado')),
  allowed_actions JSONB NOT NULL DEFAULT '{"upload":true,"message":true,"download":true,"update_basic":false}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpa_token ON public.client_portal_access(access_token);
CREATE INDEX idx_cpa_process ON public.client_portal_access(process_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_access TO authenticated;
GRANT SELECT, UPDATE ON public.client_portal_access TO anon;
GRANT ALL ON public.client_portal_access TO service_role;
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage portal access" ON public.client_portal_access
  FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());
-- anon can read only by exact token via server fn using service_role; deny anon SELECT broadly
CREATE POLICY "anon no select portal access" ON public.client_portal_access
  FOR SELECT TO anon USING (false);

CREATE TRIGGER update_cpa_updated_at BEFORE UPDATE ON public.client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- client_portal_messages
CREATE TABLE public.client_portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  access_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL,
  sender TEXT NOT NULL CHECK (sender IN ('company','client')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpm_process ON public.client_portal_messages(process_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_messages TO authenticated;
GRANT ALL ON public.client_portal_messages TO service_role;
ALTER TABLE public.client_portal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage portal messages" ON public.client_portal_messages
  FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

-- client_portal_activity_logs
CREATE TABLE public.client_portal_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  access_id UUID REFERENCES public.client_portal_access(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpal_process ON public.client_portal_activity_logs(process_id);
GRANT SELECT, INSERT ON public.client_portal_activity_logs TO authenticated;
GRANT ALL ON public.client_portal_activity_logs TO service_role;
ALTER TABLE public.client_portal_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members read portal logs" ON public.client_portal_activity_logs
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "company members insert portal logs" ON public.client_portal_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

-- storage bucket for portal uploads (reuse process-document-uploads). Also storage policies for client portal via service role only.
