
-- Lifecycle columns
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_processes_archived_at ON public.processes(company_id, archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_processes_trashed_at ON public.processes(company_id, trashed_at) WHERE trashed_at IS NOT NULL;

-- Helper: ensure user owns process (same company), bypassing RLS via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public._assert_process_access(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_user_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.processes WHERE id = p_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'process_not_found';
  END IF;
  v_user_company := public.current_user_company_id();
  IF v_company <> v_user_company AND NOT public.is_admin_master() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN v_company;
END;
$$;

-- Archive / Unarchive
CREATE OR REPLACE FUNCTION public.process_archive(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_process_access(p_id);
  UPDATE public.processes SET archived_at = now(), trashed_at = NULL WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION public.process_unarchive(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_process_access(p_id);
  UPDATE public.processes SET archived_at = NULL WHERE id = p_id;
END; $$;

-- Trash / Restore
CREATE OR REPLACE FUNCTION public.process_trash(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_process_access(p_id);
  UPDATE public.processes SET trashed_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION public.process_restore(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_process_access(p_id);
  UPDATE public.processes SET trashed_at = NULL, archived_at = NULL WHERE id = p_id;
END; $$;

-- Hard delete with confirmation string (must match protocol_number or short id prefix)
CREATE OR REPLACE FUNCTION public.process_hard_delete(p_id uuid, p_confirmation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_protocol text;
  v_expected text;
BEGIN
  PERFORM public._assert_process_access(p_id);
  SELECT protocol_number INTO v_protocol FROM public.processes WHERE id = p_id;
  v_expected := COALESCE(v_protocol, substring(p_id::text, 1, 8));
  IF p_confirmation IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'confirmation_mismatch';
  END IF;
  DELETE FROM public.processes WHERE id = p_id;
END; $$;

-- Toggle favorite
CREATE OR REPLACE FUNCTION public.process_toggle_favorite(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new boolean;
BEGIN
  PERFORM public._assert_process_access(p_id);
  UPDATE public.processes SET is_favorite = NOT COALESCE(is_favorite, false)
   WHERE id = p_id RETURNING is_favorite INTO v_new;
  RETURN v_new;
END; $$;

-- Duplicate (metadata only)
CREATE OR REPLACE FUNCTION public.process_duplicate(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_id uuid;
BEGIN
  PERFORM public._assert_process_access(p_id);
  INSERT INTO public.processes (
    company_id, customer_id, vessel_id, process_type, process_type_id, priority,
    due_date, notes, title, tags, branding_mode, branding_logo_url,
    responsible_id, technical_manager_id, status, is_draft, draft_data
  )
  SELECT company_id, customer_id, vessel_id, process_type, process_type_id, priority,
         due_date, notes, COALESCE(title, process_type) || ' (cópia)', tags,
         branding_mode, branding_logo_url,
         responsible_id, technical_manager_id, 'pending', true, draft_data
    FROM public.processes WHERE id = p_id
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END; $$;

-- Generate/get share token
CREATE OR REPLACE FUNCTION public.process_get_share_token(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text;
BEGIN
  PERFORM public._assert_process_access(p_id);
  SELECT share_token INTO v_token FROM public.processes WHERE id = p_id;
  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(18), 'hex');
    UPDATE public.processes SET share_token = v_token WHERE id = p_id;
  END IF;
  RETURN v_token;
END; $$;

-- Active processes count (used by plan Free)
CREATE OR REPLACE FUNCTION public.active_processes_count(p_company_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.processes
   WHERE company_id = p_company_id
     AND archived_at IS NULL
     AND trashed_at IS NULL
     AND deleted_at IS NULL;
$$;

-- Update company_can_perform to count only active processes
CREATE OR REPLACE FUNCTION public.company_can_perform(p_company_id uuid, p_action text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_company record;
  v_plan record;
  v_usage record;
  v_count integer;
BEGIN
  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'company_not_found'); END IF;
  IF v_company.is_active = false THEN RETURN jsonb_build_object('allowed', false, 'reason', 'company_inactive'); END IF;
  IF v_company.billing_status IN ('suspended','cancelled') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'company_suspended');
  END IF;
  IF v_company.billing_status = 'overdue' AND p_action <> 'view' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'billing_overdue');
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_company.plan_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', true, 'reason', 'no_plan_limits'); END IF;

  SELECT * INTO v_usage FROM public.usage_metrics WHERE company_id = p_company_id;

  IF p_action = 'create_process' AND v_plan.process_limit IS NOT NULL THEN
    v_count := public.active_processes_count(p_company_id);
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
$function$;

GRANT EXECUTE ON FUNCTION public.process_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_unarchive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_trash(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_restore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_hard_delete(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_toggle_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_duplicate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_get_share_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_processes_count(uuid) TO authenticated;
