CREATE OR REPLACE FUNCTION public.limits_consume(p_company uuid, p_resource text, p_amount integer DEFAULT 1, p_metadata jsonb DEFAULT '{}'::jsonb, p_request_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_request_id IS NOT NULL THEN
    -- Match the partial unique index uniq_consumption_request(company_id, resource_key, request_id) WHERE request_id IS NOT NULL
    INSERT INTO public.resource_consumption (company_id, user_id, resource_key, amount, metadata, request_id)
    VALUES (p_company, auth.uid(), p_resource, p_amount, COALESCE(p_metadata,'{}'::jsonb), p_request_id)
    ON CONFLICT (company_id, resource_key, request_id) WHERE request_id IS NOT NULL DO NOTHING;
  ELSE
    INSERT INTO public.resource_consumption (company_id, user_id, resource_key, amount, metadata, request_id)
    VALUES (p_company, auth.uid(), p_resource, p_amount, COALESCE(p_metadata,'{}'::jsonb), NULL);
  END IF;

  v_status := public.limits_check(p_company, p_resource, 0);
  v_pct_m := COALESCE((v_status->>'percent_month')::numeric, 0);

  v_threshold := CASE
    WHEN v_pct_m >= 100 THEN 100
    WHEN v_pct_m >=  90 THEN 90
    WHEN v_pct_m >=  80 THEN 80
    ELSE 0 END;

  IF v_threshold > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.app_notifications
       WHERE company_id = p_company
         AND type = 'limit_threshold'
         AND metadata->>'resource' = p_resource
         AND metadata->>'threshold' = v_threshold::text
         AND metadata->>'month' = v_month
    ) THEN
      v_type := 'limit_threshold';
      v_title := 'Limite ' || v_threshold || '% atingido';
      v_msg := 'Consumo de ' || p_resource || ' está em ' || v_pct_m::text || '% do limite mensal.';
      INSERT INTO public.app_notifications (company_id, type, title, message, metadata)
      VALUES (p_company, v_type, v_title, v_msg,
              jsonb_build_object('resource', p_resource, 'threshold', v_threshold, 'month', v_month, 'percent_month', v_pct_m));
    END IF;
  END IF;

  RETURN v_status;
END;
$function$;