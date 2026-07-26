-- Feedback: tenant, prioridade e novas categorias
ALTER TABLE public.operational_feedback
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'p2';

ALTER TABLE public.operational_feedback DROP CONSTRAINT IF EXISTS operational_feedback_priority_check;
ALTER TABLE public.operational_feedback ADD CONSTRAINT operational_feedback_priority_check
  CHECK (priority IN ('p0','p1','p2','p3'));

ALTER TABLE public.operational_feedback DROP CONSTRAINT IF EXISTS operational_feedback_type_check;
ALTER TABLE public.operational_feedback ADD CONSTRAINT operational_feedback_type_check
  CHECK (type IN ('bug','suggestion','ux','question','praise','ocr_poor','other'));

-- Incidentes: severidade P0-P3, módulo, responsável e encerramento
ALTER TABLE public.system_incidents
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'p2',
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.system_incidents DROP CONSTRAINT IF EXISTS system_incidents_priority_check;
ALTER TABLE public.system_incidents ADD CONSTRAINT system_incidents_priority_check
  CHECK (priority IN ('p0','p1','p2','p3'));

-- Leitura administrativa de telemetria e erros
DROP POLICY IF EXISTS "Admins can read frontend errors" ON public.frontend_errors;
CREATE POLICY "Admins can read frontend errors" ON public.frontend_errors
  FOR SELECT TO authenticated USING (public.is_admin_master());

DROP POLICY IF EXISTS "Telemetry readable by admin_master" ON public.telemetry_logs;
CREATE POLICY "Telemetry readable by admin_master" ON public.telemetry_logs
  FOR SELECT TO authenticated USING (public.is_admin_master() OR user_id = auth.uid());

-- Acesso à Data API (RLS continua governando as linhas)
GRANT SELECT, INSERT ON public.telemetry_logs TO authenticated;
GRANT ALL ON public.telemetry_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.frontend_errors TO authenticated;
GRANT ALL ON public.frontend_errors TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.operational_feedback TO authenticated;
GRANT ALL ON public.operational_feedback TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_incidents TO authenticated;
GRANT ALL ON public.system_incidents TO service_role;