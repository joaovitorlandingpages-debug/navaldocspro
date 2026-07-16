
-- Schema: novos campos para rastrear rollback
ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS restored_from_version_id uuid REFERENCES public.template_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restore_reason text,
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_template_versions_restored_from
  ON public.template_versions(restored_from_version_id)
  WHERE restored_from_version_id IS NOT NULL;

-- RPC: restaurar versão como novo rascunho
CREATE OR REPLACE FUNCTION public.template_restore_version_as_draft(
  p_template_id uuid,
  p_source_version_id uuid,
  p_restore_reason text,
  p_optional_changelog text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl record;
  v_src record;
  v_next int;
  v_new_id uuid;
  v_changelog jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_restore_reason IS NULL OR length(trim(p_restore_reason)) < 5 THEN
    RAISE EXCEPTION 'restore_reason_required' USING ERRCODE = 'P0001',
      HINT = 'Informe um motivo com pelo menos 5 caracteres.';
  END IF;

  -- Autorização (mesma checagem de admin usada em publish/archive)
  PERFORM public._assert_template_admin(p_template_id);

  -- Lock do template
  SELECT * INTO v_tpl
    FROM public.document_templates
   WHERE id = p_template_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_tpl.lifecycle_status = 'archived' THEN
    RAISE EXCEPTION 'template_archived' USING ERRCODE = 'P0001',
      HINT = 'Restaure o modelo antes de fazer rollback de versões.';
  END IF;

  -- Valida versão-fonte
  SELECT * INTO v_src
    FROM public.template_versions
   WHERE id = p_source_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_version_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_src.template_id <> p_template_id THEN
    RAISE EXCEPTION 'source_version_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Próximo version_number (unique index já garante não-colisão sob concorrência)
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
    FROM public.template_versions
   WHERE template_id = p_template_id;

  v_changelog := jsonb_build_array(
    jsonb_build_object(
      'note', COALESCE(NULLIF(trim(p_optional_changelog), ''),
                       'Restaurado a partir da v' || COALESCE(v_src.version_number::text, v_src.version)),
      'at', now(),
      'by', auth.uid(),
      'restored_from_version_id', v_src.id,
      'restored_from_version_number', v_src.version_number,
      'reason', trim(p_restore_reason)
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

  -- Header do template passa a apontar para o rascunho (a publicada anterior permanece
  -- intacta em template_versions e ainda é a última published)
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

  -- Auditoria
  BEGIN
    INSERT INTO public.document_audit_logs (entity_type, entity_id, action, user_id, metadata)
    VALUES ('template_version', v_new_id, 'restore_version', auth.uid(),
            jsonb_build_object(
              'template_id', p_template_id,
              'source_version_id', v_src.id,
              'source_version_number', v_src.version_number,
              'new_version_id', v_new_id,
              'new_version_number', v_next,
              'reason', trim(p_restore_reason)
            ));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.template_restore_version_as_draft(uuid, uuid, text, text) TO authenticated;
