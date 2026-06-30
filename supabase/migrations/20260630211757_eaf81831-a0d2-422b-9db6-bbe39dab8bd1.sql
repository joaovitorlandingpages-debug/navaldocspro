
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
  v_title text;
  v_msg text;
  v_type text;
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

  v_threshold := CASE
    WHEN v_pct_m >= 100 THEN 100
    WHEN v_pct_m >=  90 THEN 90
    WHEN v_pct_m >=  80 THEN 80
    ELSE 0 END;

  IF v_threshold > 0 THEN
    -- idempotency: skip if any notification already exists this month for this threshold
    IF NOT EXISTS (
      SELECT 1 FROM public.app_notifications
       WHERE company_id = p_company
         AND type = 'limit_threshold'
         AND metadata->>'resource' = p_resource
         AND metadata->>'threshold' = v_threshold::text
         AND metadata->>'month' = v_month
       LIMIT 1
    ) THEN
      v_title := 'Consumo de ' || p_resource || ' em ' || v_threshold || '%';
      v_msg := CASE v_threshold
        WHEN 100 THEN 'Você atingiu 100% do limite mensal de ' || p_resource || '. Novas operações serão bloqueadas até a renovação ou compra de adicional.'
        WHEN 90  THEN 'Você atingiu 90% do limite mensal de ' || p_resource || '. Avalie um upgrade ou pacote adicional.'
        ELSE          'Você atingiu 80% do limite mensal de ' || p_resource || '.'
      END;
      v_type := 'limit_threshold';

      -- One notification per active user of the company
      INSERT INTO public.app_notifications (user_id, company_id, type, title, message, metadata)
      SELECT p.id, p_company, v_type, v_title, v_msg,
             jsonb_build_object('resource', p_resource, 'threshold', v_threshold,
                                'month', v_month, 'status', v_status)
        FROM public.profiles p
       WHERE p.company_id = p_company;

      -- Also persist a single audit log entry
      INSERT INTO public.system_logs (event_type, module, message, metadata, company_id)
      VALUES ('limit_threshold', 'limits_engine', v_title,
              jsonb_build_object('resource', p_resource, 'threshold', v_threshold,
                                 'month', v_month, 'status', v_status),
              p_company);
    END IF;
  END IF;

  RETURN v_status;
END;
$$;
