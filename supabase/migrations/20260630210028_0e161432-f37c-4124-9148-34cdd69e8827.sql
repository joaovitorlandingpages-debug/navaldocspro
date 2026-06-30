
-- ============ 1. resource_types ============
CREATE TABLE public.resource_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'request',
  is_storage boolean NOT NULL DEFAULT false,
  default_daily int,
  default_monthly int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_types TO authenticated, anon;
GRANT ALL ON public.resource_types TO service_role;
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resource_types readable by all" ON public.resource_types FOR SELECT USING (true);

INSERT INTO public.resource_types (key, label, unit, is_storage, default_daily, default_monthly) VALUES
  ('ocr',                'OCR (Gemini)',          'request', false, 50,   500),
  ('ai_chat',            'IA / Chat',             'request', false, 100,  1000),
  ('pdf_generation',     'Geração de PDFs',       'request', false, 200,  3000),
  ('dossier_export',     'Exportação de Dossiês', 'request', false, 20,   200),
  ('signature_request',  'Solicitações de Assinatura', 'request', false, 50, 500),
  ('upload_file',        'Uploads (MB)',          'mb',      false, 500,  5000),
  ('storage_gb',         'Storage (GB)',          'gb',      true,  NULL, 5),
  ('premium_template',   'Templates Premium',     'count',   false, NULL, 10),
  ('portal_share',       'Compartilhamentos no Portal','request', false, 50, 500);

-- ============ 2. plan_resource_limits ============
CREATE TABLE public.plan_resource_limits (
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  resource_key text NOT NULL REFERENCES public.resource_types(key) ON DELETE CASCADE,
  daily_limit int,
  monthly_limit int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, resource_key)
);
GRANT SELECT ON public.plan_resource_limits TO authenticated, anon;
GRANT ALL ON public.plan_resource_limits TO service_role;
ALTER TABLE public.plan_resource_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_resource_limits readable" ON public.plan_resource_limits FOR SELECT USING (true);
CREATE POLICY "plan_resource_limits admin write" ON public.plan_resource_limits FOR ALL
  USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

-- Seed: aplicar defaults do resource_types em todos os planos existentes.
INSERT INTO public.plan_resource_limits (plan_id, resource_key, daily_limit, monthly_limit)
SELECT p.id, r.key, r.default_daily, r.default_monthly
  FROM public.plans p CROSS JOIN public.resource_types r
ON CONFLICT DO NOTHING;

-- ============ 3. company_resource_addons ============
CREATE TABLE public.company_resource_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resource_key text NOT NULL REFERENCES public.resource_types(key) ON DELETE CASCADE,
  extra_daily int NOT NULL DEFAULT 0,
  extra_monthly int NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  source text NOT NULL DEFAULT 'grant',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addons_company_resource ON public.company_resource_addons(company_id, resource_key);
GRANT SELECT ON public.company_resource_addons TO authenticated;
GRANT ALL ON public.company_resource_addons TO service_role;
ALTER TABLE public.company_resource_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addons company read" ON public.company_resource_addons FOR SELECT
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "addons admin write" ON public.company_resource_addons FOR ALL
  USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

-- ============ 4. resource_consumption (ledger) ============
CREATE TABLE public.resource_consumption (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  resource_key text NOT NULL REFERENCES public.resource_types(key) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 1,
  period_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  period_month date NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC')::date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consumption_company_resource_day  ON public.resource_consumption(company_id, resource_key, period_day);
CREATE INDEX idx_consumption_company_resource_mon  ON public.resource_consumption(company_id, resource_key, period_month);
CREATE UNIQUE INDEX uniq_consumption_request ON public.resource_consumption(company_id, resource_key, request_id)
  WHERE request_id IS NOT NULL;
GRANT SELECT ON public.resource_consumption TO authenticated;
GRANT ALL ON public.resource_consumption TO service_role;
ALTER TABLE public.resource_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumption company read" ON public.resource_consumption FOR SELECT
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());
-- INSERT só via RPC (SECURITY DEFINER) — sem policy de INSERT/UPDATE/DELETE para roles normais.

-- ============ 5. Functions ============

CREATE OR REPLACE FUNCTION public.limits_check(p_company uuid, p_resource text, p_amount int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company record;
  v_plan_daily int;
  v_plan_monthly int;
  v_extra_daily int;
  v_extra_monthly int;
  v_total_daily int;
  v_total_monthly int;
  v_used_day int;
  v_used_month int;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_month date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_renews timestamptz := date_trunc('month', now()) + interval '1 month';
BEGIN
  SELECT * INTO v_company FROM public.companies WHERE id = p_company;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_not_found');
  END IF;
  IF v_company.is_active = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_inactive');
  END IF;
  IF v_company.billing_status IN ('suspended','cancelled') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_suspended');
  END IF;
  IF v_company.billing_status = 'overdue' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'billing_overdue');
  END IF;

  SELECT daily_limit, monthly_limit INTO v_plan_daily, v_plan_monthly
    FROM public.plan_resource_limits
    WHERE plan_id = v_company.plan_id AND resource_key = p_resource;

  SELECT COALESCE(SUM(extra_daily),0), COALESCE(SUM(extra_monthly),0)
    INTO v_extra_daily, v_extra_monthly
    FROM public.company_resource_addons
    WHERE company_id = p_company AND resource_key = p_resource
      AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now());

  v_total_daily   := CASE WHEN v_plan_daily   IS NULL THEN NULL ELSE v_plan_daily   + v_extra_daily   END;
  v_total_monthly := CASE WHEN v_plan_monthly IS NULL THEN NULL ELSE v_plan_monthly + v_extra_monthly END;

  SELECT COALESCE(SUM(amount),0) INTO v_used_day
    FROM public.resource_consumption
    WHERE company_id = p_company AND resource_key = p_resource AND period_day = v_today;
  SELECT COALESCE(SUM(amount),0) INTO v_used_month
    FROM public.resource_consumption
    WHERE company_id = p_company AND resource_key = p_resource AND period_month = v_month;

  IF v_total_daily IS NOT NULL AND v_used_day + p_amount > v_total_daily THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit_exceeded',
      'daily_used', v_used_day, 'daily_limit', v_total_daily,
      'monthly_used', v_used_month, 'monthly_limit', v_total_monthly, 'renews_at', v_renews);
  END IF;
  IF v_total_monthly IS NOT NULL AND v_used_month + p_amount > v_total_monthly THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_exceeded',
      'daily_used', v_used_day, 'daily_limit', v_total_daily,
      'monthly_used', v_used_month, 'monthly_limit', v_total_monthly, 'renews_at', v_renews);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_used', v_used_day, 'daily_limit', v_total_daily,
    'monthly_used', v_used_month, 'monthly_limit', v_total_monthly,
    'percent_day',   CASE WHEN v_total_daily   IS NULL OR v_total_daily=0   THEN 0 ELSE round(100.0*(v_used_day   + p_amount)/v_total_daily,1)   END,
    'percent_month', CASE WHEN v_total_monthly IS NULL OR v_total_monthly=0 THEN 0 ELSE round(100.0*(v_used_month + p_amount)/v_total_monthly,1) END,
    'renews_at', v_renews
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.limits_consume(p_company uuid, p_resource text, p_amount int DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb, p_request_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  v_check := public.limits_check(p_company, p_resource, p_amount);
  IF (v_check->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'limit_blocked:%', v_check::text USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.resource_consumption (company_id, user_id, resource_key, amount, metadata, request_id)
  VALUES (p_company, auth.uid(), p_resource, p_amount, COALESCE(p_metadata,'{}'::jsonb), p_request_id)
  ON CONFLICT (company_id, resource_key, request_id) DO NOTHING;

  RETURN public.limits_check(p_company, p_resource, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.limits_status(p_company uuid)
RETURNS TABLE(
  resource_key text, label text, unit text,
  daily_used int, daily_limit int,
  monthly_used int, monthly_limit int,
  percent_day numeric, percent_month numeric,
  renews_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company record;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_month date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_renews timestamptz := date_trunc('month', now()) + interval '1 month';
BEGIN
  SELECT * INTO v_company FROM public.companies WHERE id = p_company;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  WITH limits AS (
    SELECT rt.key, rt.label, rt.unit,
           prl.daily_limit, prl.monthly_limit
      FROM public.resource_types rt
      LEFT JOIN public.plan_resource_limits prl
        ON prl.resource_key = rt.key AND prl.plan_id = v_company.plan_id
  ),
  addons AS (
    SELECT resource_key,
           COALESCE(SUM(extra_daily),0)   AS extra_d,
           COALESCE(SUM(extra_monthly),0) AS extra_m
      FROM public.company_resource_addons
     WHERE company_id = p_company
       AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now())
     GROUP BY resource_key
  ),
  used AS (
    SELECT resource_key,
           COALESCE(SUM(amount) FILTER (WHERE period_day = v_today),0)   AS used_d,
           COALESCE(SUM(amount) FILTER (WHERE period_month = v_month),0) AS used_m
      FROM public.resource_consumption
     WHERE company_id = p_company
     GROUP BY resource_key
  )
  SELECT
    l.key, l.label, l.unit,
    COALESCE(u.used_d,0)::int,
    CASE WHEN l.daily_limit   IS NULL THEN NULL ELSE (l.daily_limit   + COALESCE(a.extra_d,0))::int END,
    COALESCE(u.used_m,0)::int,
    CASE WHEN l.monthly_limit IS NULL THEN NULL ELSE (l.monthly_limit + COALESCE(a.extra_m,0))::int END,
    CASE WHEN l.daily_limit   IS NULL OR (l.daily_limit + COALESCE(a.extra_d,0))=0   THEN 0
         ELSE round(100.0 * COALESCE(u.used_d,0) / (l.daily_limit + COALESCE(a.extra_d,0)), 1) END,
    CASE WHEN l.monthly_limit IS NULL OR (l.monthly_limit + COALESCE(a.extra_m,0))=0 THEN 0
         ELSE round(100.0 * COALESCE(u.used_m,0) / (l.monthly_limit + COALESCE(a.extra_m,0)), 1) END,
    v_renews
  FROM limits l
  LEFT JOIN addons a ON a.resource_key = l.key
  LEFT JOIN used   u ON u.resource_key = l.key
  ORDER BY l.key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.limits_check(uuid, text, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.limits_consume(uuid, text, int, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.limits_status(uuid) TO authenticated, service_role;
