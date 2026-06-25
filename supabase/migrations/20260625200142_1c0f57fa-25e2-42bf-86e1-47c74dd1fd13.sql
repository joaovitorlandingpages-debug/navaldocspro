
-- Bloco 9: Master SaaS Panel
-- Extend companies for manual billing
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS billing_due_date date,
  ADD COLUMN IF NOT EXISTS billing_monthly_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_payment_method text,
  ADD COLUMN IF NOT EXISTS billing_notes text,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS last_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsible_name text;

-- Master audit table
CREATE TABLE IF NOT EXISTS public.master_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  target_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.master_audit_logs TO authenticated;
GRANT ALL ON public.master_audit_logs TO service_role;
ALTER TABLE public.master_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master can read audit"
  ON public.master_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_master());
CREATE POLICY "authenticated can insert master audit"
  ON public.master_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Manual billing history
CREATE TABLE IF NOT EXISTS public.company_billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_method text,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_billing_history TO authenticated;
GRANT ALL ON public.company_billing_history TO service_role;
ALTER TABLE public.company_billing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master full billing history"
  ON public.company_billing_history FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());
CREATE POLICY "company can read own billing history"
  ON public.company_billing_history FOR SELECT
  TO authenticated
  USING (company_id = public.current_user_company_id());

-- Function: check if company can perform action (returns json)
CREATE OR REPLACE FUNCTION public.company_can_perform(p_company_id uuid, p_action text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company record;
  v_plan record;
  v_usage record;
  v_count integer;
  v_now date := current_date;
BEGIN
  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_not_found');
  END IF;

  IF v_company.is_active = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_inactive');
  END IF;

  IF v_company.billing_status IN ('suspended','cancelled') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_suspended');
  END IF;

  IF v_company.billing_status = 'overdue' AND p_action <> 'view' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'billing_overdue');
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_company.plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_plan_limits');
  END IF;

  SELECT * INTO v_usage FROM public.usage_metrics WHERE company_id = p_company_id;

  IF p_action = 'create_process' AND v_plan.process_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.processes
      WHERE company_id = p_company_id
        AND created_at >= date_trunc('month', now());
    IF v_count >= v_plan.process_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'process_limit_exceeded', 'limit', v_plan.process_limit, 'used', v_count);
    END IF;
  END IF;

  IF p_action = 'run_ocr' AND v_plan.ocr_limit IS NOT NULL THEN
    IF COALESCE(v_usage.ocr_usage, 0) >= v_plan.ocr_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'ocr_limit_exceeded', 'limit', v_plan.ocr_limit, 'used', COALESCE(v_usage.ocr_usage, 0));
    END IF;
  END IF;

  IF p_action = 'create_user' AND v_plan.user_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.profiles WHERE company_id = p_company_id;
    IF v_count >= v_plan.user_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'user_limit_exceeded', 'limit', v_plan.user_limit, 'used', v_count);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.company_can_perform(uuid, text) TO authenticated;

-- Seed standard plans if missing
INSERT INTO public.plans (slug, name, description, price, billing_cycle, user_limit, process_limit, ocr_limit, storage_limit_gb, customer_limit, document_limit, features, is_active)
SELECT * FROM (VALUES
  ('teste','Teste','Avaliação gratuita por 14 dias', 0::numeric, 'monthly', 2, 5, 20, 1, 5, 50, '{"client_portal":false,"final_dossier":false,"support":"comunidade"}'::jsonb, true),
  ('basico','Básico','Para escritórios iniciantes', 197::numeric, 'monthly', 3, 30, 200, 5, 30, 300, '{"client_portal":true,"final_dossier":false,"support":"email"}'::jsonb, true),
  ('premium','Premium','Para operações estabelecidas', 597::numeric, 'monthly', 20, 300, 2000, 50, 500, 5000, '{"client_portal":true,"final_dossier":true,"support":"priority"}'::jsonb, true)
) AS v(slug,name,description,price,billing_cycle,user_limit,process_limit,ocr_limit,storage_limit_gb,customer_limit,document_limit,features,is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.slug = v.slug);
