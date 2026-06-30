
-- =====================================================
-- 1) RATE LIMIT STORE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,             -- e.g. company:<uuid>, user:<uuid>, ip:<addr>, token:<sha>
  bucket  text NOT NULL,             -- function name or logical bucket (e.g. 'generate-document')
  window_start timestamptz NOT NULL DEFAULT now(),
  hits int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS edge_rate_limits_subject_bucket_idx
  ON public.edge_rate_limits(subject, bucket);
CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx
  ON public.edge_rate_limits(window_start);

GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- No anon/auth policy — only service_role (edge functions) touches it.

-- =====================================================
-- 2) rl_hit(subject, bucket, max_hits, window_seconds)
--    Atomic sliding-window: returns {allowed, remaining, retry_after}
-- =====================================================
CREATE OR REPLACE FUNCTION public.rl_hit(
  p_subject text,
  p_bucket  text,
  p_max     int,
  p_window_seconds int DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.edge_rate_limits;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.edge_rate_limits(subject, bucket, window_start, hits, updated_at)
  VALUES (p_subject, p_bucket, v_now, 1, v_now)
  ON CONFLICT (subject, bucket) DO UPDATE
    SET hits = CASE
                 WHEN public.edge_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                   THEN 1
                 ELSE public.edge_rate_limits.hits + 1
               END,
        window_start = CASE
                 WHEN public.edge_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                   THEN v_now
                 ELSE public.edge_rate_limits.window_start
               END,
        updated_at = v_now
  RETURNING * INTO v_row;

  IF v_row.hits > p_max THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', GREATEST(1, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_row.window_start))::int)
    );
  END IF;
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, p_max - v_row.hits),
    'retry_after', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rl_hit(text,text,int,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rl_hit(text,text,int,int) TO service_role;

-- =====================================================
-- 3) Consumption alerts in limits_consume:
--    after recording usage, emit one app_notification per (resource, threshold, month)
-- =====================================================
CREATE OR REPLACE FUNCTION public.limits_consume(
  p_company uuid, p_resource text, p_amount int DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_request_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_check jsonb;
  v_status jsonb;
  v_pct_m numeric;
  v_threshold int;
  v_month text := to_char(now(), 'YYYY-MM');
BEGIN
  v_check := public.limits_check(p_company, p_resource, p_amount);
  IF (v_check->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'limit_blocked:%', v_check::text USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.resource_consumption (company_id, user_id, resource_key, amount, metadata, request_id)
  VALUES (p_company, auth.uid(), p_resource, p_amount, COALESCE(p_metadata,'{}'::jsonb), p_request_id)
  ON CONFLICT (company_id, resource_key, request_id) DO NOTHING;

  v_status := public.limits_check(p_company, p_resource, 0);
  v_pct_m := COALESCE((v_status->>'percent_month')::numeric, 0);

  -- pick highest threshold reached
  v_threshold := CASE
    WHEN v_pct_m >= 100 THEN 100
    WHEN v_pct_m >=  90 THEN 90
    WHEN v_pct_m >=  80 THEN 80
    ELSE 0 END;

  IF v_threshold > 0 THEN
    -- idempotent per (company, resource, threshold, month) via metadata match
    IF NOT EXISTS (
      SELECT 1 FROM public.app_notifications
       WHERE company_id = p_company
         AND type = 'limit_threshold'
         AND metadata->>'resource' = p_resource
         AND metadata->>'threshold' = v_threshold::text
         AND metadata->>'month' = v_month
    ) THEN
      INSERT INTO public.app_notifications (company_id, type, title, message, severity, metadata)
      VALUES (
        p_company,
        'limit_threshold',
        'Consumo de ' || p_resource || ' em ' || v_threshold || '%',
        CASE v_threshold
          WHEN 100 THEN 'Você atingiu 100% do limite mensal de ' || p_resource || '. Novas operações serão bloqueadas até a renovação ou compra de adicional.'
          WHEN 90  THEN 'Você atingiu 90% do limite mensal de ' || p_resource || '. Avalie um upgrade ou pacote adicional.'
          ELSE          'Você atingiu 80% do limite mensal de ' || p_resource || '.'
        END,
        CASE WHEN v_threshold = 100 THEN 'high' WHEN v_threshold = 90 THEN 'medium' ELSE 'low' END,
        jsonb_build_object('resource', p_resource, 'threshold', v_threshold, 'month', v_month, 'status', v_status)
      );
    END IF;
  END IF;

  RETURN v_status;
END;
$$;
