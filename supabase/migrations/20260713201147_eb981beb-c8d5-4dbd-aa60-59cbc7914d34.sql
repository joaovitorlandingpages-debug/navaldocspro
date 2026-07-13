
-- Helper: assert user is admin of the template's scope
CREATE OR REPLACE FUNCTION public._assert_template_admin(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tpl record; v_user_company uuid; v_role text;
BEGIN
  SELECT id, company_id, is_global INTO v_tpl FROM public.document_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found' USING ERRCODE='P0001'; END IF;
  SELECT company_id, role INTO v_user_company, v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('admin_master','admin_master_global') THEN RETURN; END IF;
  IF v_tpl.is_global THEN
    RAISE EXCEPTION 'forbidden_global_template' USING ERRCODE='P0001';
  END IF;
  IF v_tpl.company_id IS DISTINCT FROM v_user_company OR v_role NOT IN ('company_admin','admin','manager','owner') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='P0001';
  END IF;
END $$;

-- Create draft template
CREATE OR REPLACE FUNCTION public.template_create_draft(
  p_name text, p_code text DEFAULT NULL, p_category text DEFAULT NULL,
  p_process_type text DEFAULT NULL, p_region text DEFAULT NULL, p_is_global boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_role text; v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='P0001'; END IF;
  IF coalesce(trim(p_name),'') = '' THEN RAISE EXCEPTION 'name_required' USING ERRCODE='P0001'; END IF;
  SELECT role, company_id INTO v_role, v_company FROM public.profiles WHERE id = auth.uid();
  IF p_is_global AND v_role NOT IN ('admin_master','admin_master_global') THEN
    RAISE EXCEPTION 'only_master_can_create_global' USING ERRCODE='P0001';
  END IF;
  IF NOT p_is_global AND v_role NOT IN ('company_admin','admin','manager','owner','admin_master','admin_master_global') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.document_templates (
    name, code, category, process_type, region_tag, is_global, company_id,
    lifecycle_status, is_active, validation_status, version, version_number
  ) VALUES (
    p_name, NULLIF(p_code,''), NULLIF(p_category,''), NULLIF(p_process_type,''),
    NULLIF(p_region,''), coalesce(p_is_global,false),
    CASE WHEN coalesce(p_is_global,false) THEN NULL ELSE v_company END,
    'draft', false, 'rascunho', 1, 1
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Publish a new version (atomic)
CREATE OR REPLACE FUNCTION public.template_publish_version(
  p_template_id uuid, p_changelog text,
  p_document_structure jsonb DEFAULT NULL, p_base_content text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next int; v_ver_id uuid;
BEGIN
  PERFORM public._assert_template_admin(p_template_id);
  IF coalesce(trim(p_changelog),'') = '' OR length(trim(p_changelog)) < 5 THEN
    RAISE EXCEPTION 'changelog_required' USING ERRCODE='P0001';
  END IF;
  SELECT COALESCE(MAX(version_number),0)+1 INTO v_next
    FROM public.template_versions WHERE template_id = p_template_id;
  -- archive any previously published version of this template
  UPDATE public.template_versions
     SET status = 'archived'
   WHERE template_id = p_template_id AND status = 'published';
  INSERT INTO public.template_versions (
    template_id, version, version_number, status, changelog, notes,
    document_structure, base_content, metadata, created_by
  ) VALUES (
    p_template_id, v_next::text, v_next, 'published',
    jsonb_build_array(jsonb_build_object('note', p_changelog, 'at', now(), 'by', auth.uid())),
    p_notes,
    COALESCE(p_document_structure, '{}'::jsonb),
    p_base_content,
    COALESCE(p_metadata, '{}'::jsonb),
    auth.uid()
  ) RETURNING id INTO v_ver_id;
  UPDATE public.document_templates
     SET lifecycle_status = 'published',
         is_active = true,
         validation_status = 'ativo',
         version = v_next,
         version_number = v_next,
         updated_at = now()
   WHERE id = p_template_id;
  RETURN v_ver_id;
END $$;

-- Archive / restore
CREATE OR REPLACE FUNCTION public.template_archive(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_template_admin(p_template_id);
  UPDATE public.document_templates
     SET lifecycle_status = 'archived', is_active = false, is_default_for_scope = false, updated_at = now()
   WHERE id = p_template_id;
END $$;

CREATE OR REPLACE FUNCTION public.template_restore(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_template_admin(p_template_id);
  UPDATE public.document_templates
     SET lifecycle_status = 'draft', is_active = false, updated_at = now()
   WHERE id = p_template_id AND lifecycle_status = 'archived';
END $$;

-- Set default (atomic swap within scope)
CREATE OR REPLACE FUNCTION public.template_set_default(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tpl record;
BEGIN
  PERFORM public._assert_template_admin(p_template_id);
  SELECT * INTO v_tpl FROM public.document_templates WHERE id = p_template_id;
  IF v_tpl.lifecycle_status <> 'published' THEN
    RAISE EXCEPTION 'only_published_can_be_default' USING ERRCODE='P0001';
  END IF;
  -- unset current default in same scope
  UPDATE public.document_templates
     SET is_default_for_scope = false, updated_at = now()
   WHERE is_default_for_scope = true
     AND id <> p_template_id
     AND lifecycle_status = 'published'
     AND is_global = v_tpl.is_global
     AND COALESCE(company_id::text,'') = COALESCE(v_tpl.company_id::text,'')
     AND COALESCE(process_type,'') = COALESCE(v_tpl.process_type,'')
     AND COALESCE(category,'')     = COALESCE(v_tpl.category,'')
     AND COALESCE(region_tag,'')   = COALESCE(v_tpl.region_tag,'');
  UPDATE public.document_templates
     SET is_default_for_scope = true, updated_at = now()
   WHERE id = p_template_id;
END $$;

CREATE OR REPLACE FUNCTION public.template_unset_default(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_template_admin(p_template_id);
  UPDATE public.document_templates
     SET is_default_for_scope = false, updated_at = now()
   WHERE id = p_template_id;
END $$;

-- Usage count
CREATE OR REPLACE FUNCTION public.template_usage_count(p_template_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.generated_documents WHERE template_id = p_template_id;
$$;

-- Grants (SECURITY DEFINER + explicit revoke from anon)
REVOKE ALL ON FUNCTION public.template_create_draft(text,text,text,text,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_publish_version(uuid,text,jsonb,text,jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_archive(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_restore(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_set_default(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_unset_default(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.template_usage_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.template_create_draft(text,text,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_publish_version(uuid,text,jsonb,text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_restore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_set_default(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_unset_default(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_usage_count(uuid) TO authenticated;
