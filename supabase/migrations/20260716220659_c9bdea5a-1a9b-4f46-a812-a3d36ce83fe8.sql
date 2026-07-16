
CREATE OR REPLACE FUNCTION public.template_restore_version_as_draft(
  p_template_id uuid,
  p_source_version_id uuid,
  p_restore_reason text,
  p_optional_changelog text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tpl record;
  v_src record;
  v_next int;
  v_new_id uuid;
  v_changelog jsonb;
  v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_restore_reason IS NULL OR length(trim(p_restore_reason)) < 5 THEN
    RAISE EXCEPTION 'restore_reason_required' USING ERRCODE = 'P0001',
      HINT = 'Informe um motivo com pelo menos 5 caracteres.';
  END IF;

  PERFORM public._assert_template_admin(p_template_id);

  SELECT * INTO v_tpl FROM public.document_templates WHERE id = p_template_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found' USING ERRCODE='P0001'; END IF;
  IF v_tpl.lifecycle_status = 'archived' THEN
    RAISE EXCEPTION 'template_archived' USING ERRCODE='P0001',
      HINT = 'Restaure o modelo antes de fazer rollback de versões.';
  END IF;

  SELECT * INTO v_src FROM public.template_versions WHERE id = p_source_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_version_not_found' USING ERRCODE='P0001'; END IF;
  IF v_src.template_id <> p_template_id THEN
    RAISE EXCEPTION 'source_version_mismatch' USING ERRCODE='P0001';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
    FROM public.template_versions WHERE template_id = p_template_id;

  v_changelog := COALESCE(v_src.changelog, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'type','restore',
      'source_version_id', v_src.id,
      'source_version_number', v_src.version_number,
      'reason', trim(p_restore_reason),
      'at', now()
    )
  );

  INSERT INTO public.template_versions (
    template_id, version, version_number, status,
    document_structure, base_content, metadata,
    changelog, notes, created_by,
    restored_from_version_id, restore_reason, change_type
  ) VALUES (
    p_template_id, v_next::text, v_next, 'draft',
    COALESCE(v_src.document_structure, '{}'::jsonb),
    v_src.base_content,
    COALESCE(v_src.metadata, '{}'::jsonb),
    v_changelog,
    NULLIF(trim(p_optional_changelog), ''),
    auth.uid(),
    v_src.id, trim(p_restore_reason), 'restore'
  ) RETURNING id INTO v_new_id;

  UPDATE public.document_templates
     SET lifecycle_status = 'draft',
         is_active = false,
         version = v_next,
         version_number = v_next,
         base_content = v_src.base_content,
         document_structure = COALESCE(v_src.document_structure, '{}'::jsonb),
         metadata = COALESCE(v_src.metadata, '{}'::jsonb),
         updated_at = now()
   WHERE id = p_template_id;

  -- Auditoria (schema real: company_id NOT NULL, user_id, action, details jsonb).
  -- Sem EXCEPTION handler: falha de auditoria deve abortar o rollback.
  v_company := COALESCE(v_tpl.company_id, (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  IF v_company IS NULL THEN
    v_company := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO public.document_audit_logs (company_id, user_id, action, details)
  VALUES (
    v_company, auth.uid(), 'template_version_restored',
    jsonb_build_object(
      'template_id', p_template_id,
      'source_version_id', v_src.id,
      'source_version_number', v_src.version_number,
      'new_version_id', v_new_id,
      'new_version_number', v_next,
      'restore_reason', trim(p_restore_reason)
    )
  );

  RETURN v_new_id;
END;
$function$;
