
-- 1) Criar nova versão em rascunho a partir da publicada
CREATE OR REPLACE FUNCTION public.template_start_new_draft(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tpl record;
  v_pub record;
  v_next int;
  v_ver_id uuid;
BEGIN
  PERFORM public._assert_template_admin(p_template_id);

  SELECT * INTO v_tpl FROM public.document_templates WHERE id = p_template_id;
  IF v_tpl.lifecycle_status <> 'published' THEN
    RAISE EXCEPTION 'only_published_can_branch' USING ERRCODE='P0001';
  END IF;

  SELECT * INTO v_pub
    FROM public.template_versions
   WHERE template_id = p_template_id AND status = 'published'
   ORDER BY version_number DESC NULLS LAST, released_at DESC
   LIMIT 1;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
    FROM public.template_versions WHERE template_id = p_template_id;

  INSERT INTO public.template_versions (
    template_id, version, version_number, status,
    document_structure, base_content, metadata, changelog, notes, created_by
  ) VALUES (
    p_template_id, v_next::text, v_next, 'draft',
    COALESCE(v_pub.document_structure, v_tpl.document_structure, '{}'::jsonb),
    COALESCE(v_pub.base_content,       v_tpl.base_content),
    COALESCE(v_pub.metadata,           v_tpl.metadata, '{}'::jsonb),
    '[]'::jsonb, NULL, auth.uid()
  ) RETURNING id INTO v_ver_id;

  -- Move o "cabeçalho" do template para rascunho preservando a versão anterior intacta em template_versions
  UPDATE public.document_templates
     SET lifecycle_status = 'draft',
         is_active = false,
         version_number = v_next,
         version = v_next,
         base_content = COALESCE(v_pub.base_content, base_content),
         document_structure = COALESCE(v_pub.document_structure, document_structure),
         metadata = COALESCE(v_pub.metadata, metadata),
         updated_at = now()
   WHERE id = p_template_id;

  RETURN v_ver_id;
END $$;

REVOKE ALL ON FUNCTION public.template_start_new_draft(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.template_start_new_draft(uuid) TO authenticated;

-- 2) Índice único de geração ativa: por (processo, template, versão), permitindo nova versão publicada gerar novo doc
DROP INDEX IF EXISTS public.generated_documents_active_uniq;
CREATE UNIQUE INDEX generated_documents_active_uniq
  ON public.generated_documents (process_id, template_id, template_version_id)
  WHERE process_id IS NOT NULL
    AND template_id IS NOT NULL
    AND template_version_id IS NOT NULL
    AND status IN ('draft','generated','approved','signed','completed');

-- 3) Geração de documento com snapshot imutável e idempotência
CREATE OR REPLACE FUNCTION public.template_generate_document(
  p_template_id       uuid,
  p_process_id        uuid,
  p_idempotency_key   text,
  p_rendered_content  text,
  p_rendered_hash     text,
  p_placeholders_used jsonb DEFAULT '[]'::jsonb,
  p_variables_used    jsonb DEFAULT '{}'::jsonb,
  p_customer_id       uuid  DEFAULT NULL,
  p_vessel_id         uuid  DEFAULT NULL,
  p_name              text  DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company uuid;
  v_tpl record;
  v_ver record;
  v_snapshot jsonb;
  v_doc_id uuid;
  v_reused boolean := false;
BEGIN
  v_company := public._assert_process_access(p_process_id);

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'idempotency_key_required' USING ERRCODE='P0001';
  END IF;

  SELECT * INTO v_tpl FROM public.document_templates WHERE id = p_template_id;
  IF v_tpl.id IS NULL THEN RAISE EXCEPTION 'template_not_found' USING ERRCODE='P0001'; END IF;
  IF v_tpl.lifecycle_status <> 'published' THEN
    RAISE EXCEPTION 'template_not_published' USING ERRCODE='P0001',
      HINT = 'Publique uma versão do modelo antes de gerar documentos.';
  END IF;
  -- tenant: global ou mesma empresa
  IF NOT v_tpl.is_global AND v_tpl.company_id IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'template_cross_tenant' USING ERRCODE='P0001';
  END IF;

  SELECT * INTO v_ver
    FROM public.template_versions
   WHERE template_id = p_template_id AND status = 'published'
   ORDER BY version_number DESC NULLS LAST, released_at DESC
   LIMIT 1;
  IF v_ver.id IS NULL THEN
    RAISE EXCEPTION 'no_published_version' USING ERRCODE='P0001',
      HINT = 'Nenhuma versão publicada disponível para este modelo.';
  END IF;

  IF p_rendered_hash IS NULL OR length(p_rendered_hash) < 6 THEN
    RAISE EXCEPTION 'snapshot_hash_required' USING ERRCODE='P0001';
  END IF;
  IF p_rendered_content IS NULL OR length(p_rendered_content) = 0 THEN
    RAISE EXCEPTION 'rendered_content_required' USING ERRCODE='P0001';
  END IF;

  v_snapshot := jsonb_build_object(
    'template_id',        v_tpl.id,
    'template_code',      v_tpl.code,
    'template_name',      v_tpl.name,
    'category',           v_tpl.category,
    'process_type',       v_tpl.process_type,
    'region_tag',         v_tpl.region_tag,
    'is_global',          v_tpl.is_global,
    'version_id',         v_ver.id,
    'version_number',     v_ver.version_number,
    'base_content',       v_ver.base_content,
    'metadata',           v_ver.metadata,
    'placeholders_used',  p_placeholders_used,
    'variables_used',     p_variables_used,
    'rendered_content',   p_rendered_content,
    'rendered_hash',      p_rendered_hash,
    'generated_by',       auth.uid(),
    'generated_at',       now()
  );

  -- idempotência por (company_id, idempotency_key): retorna o documento existente sem alterá-lo
  SELECT id INTO v_doc_id
    FROM public.generated_documents
   WHERE company_id = v_company AND idempotency_key = p_idempotency_key
   LIMIT 1;
  IF v_doc_id IS NOT NULL THEN
    RETURN jsonb_build_object('document_id', v_doc_id, 'template_version_id', v_ver.id, 'reused', true);
  END IF;

  BEGIN
    INSERT INTO public.generated_documents (
      company_id, process_id, customer_id, vessel_id,
      template_id, template_version_id, version,
      name, status, generated_by, idempotency_key,
      template_snapshot, document_structure_snapshot, template_snapshot_hash,
      metadata
    ) VALUES (
      v_company, p_process_id, p_customer_id, p_vessel_id,
      v_tpl.id, v_ver.id, COALESCE(v_ver.version_number, 1),
      COALESCE(p_name, v_tpl.name), 'generated', auth.uid(), p_idempotency_key,
      v_snapshot, COALESCE(v_ver.document_structure, '{}'::jsonb), p_rendered_hash,
      jsonb_build_object('generator', 'template_generate_document', 'source_version', v_ver.version_number)
    ) RETURNING id INTO v_doc_id;
  EXCEPTION WHEN unique_violation THEN
    -- Corrida: outra chamada gravou primeiro; reusa o existente (por idempotency ou índice ativo por versão)
    SELECT id INTO v_doc_id
      FROM public.generated_documents
     WHERE company_id = v_company
       AND (idempotency_key = p_idempotency_key
            OR (process_id = p_process_id AND template_id = v_tpl.id AND template_version_id = v_ver.id))
     ORDER BY created_at ASC
     LIMIT 1;
    v_reused := true;
  END;

  RETURN jsonb_build_object('document_id', v_doc_id, 'template_version_id', v_ver.id, 'reused', v_reused);
END $$;

REVOKE ALL ON FUNCTION public.template_generate_document(uuid, uuid, text, text, text, jsonb, jsonb, uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.template_generate_document(uuid, uuid, text, text, text, jsonb, jsonb, uuid, uuid, text) TO authenticated;
