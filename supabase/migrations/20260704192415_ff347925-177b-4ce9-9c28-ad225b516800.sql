
-- =========================================================
-- ONDA 2B.1 — OPTIMISTIC LOCKING ENTERPRISE
-- =========================================================

-- 1) Colunas version
ALTER TABLE public.processes            ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.document_checklists  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.generated_documents  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
-- process_dossiers.version já existe

-- 2) Trigger de bump
CREATE OR REPLACE FUNCTION public.bump_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version IS NULL OR NEW.version = OLD.version THEN
      NEW.version := COALESCE(OLD.version,1) + 1;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_version_processes           ON public.processes;
DROP TRIGGER IF EXISTS trg_bump_version_checklists          ON public.document_checklists;
DROP TRIGGER IF EXISTS trg_bump_version_generated_documents ON public.generated_documents;
DROP TRIGGER IF EXISTS trg_bump_version_dossiers            ON public.process_dossiers;

CREATE TRIGGER trg_bump_version_processes           BEFORE UPDATE ON public.processes           FOR EACH ROW EXECUTE FUNCTION public.bump_version();
CREATE TRIGGER trg_bump_version_checklists          BEFORE UPDATE ON public.document_checklists FOR EACH ROW EXECUTE FUNCTION public.bump_version();
CREATE TRIGGER trg_bump_version_generated_documents BEFORE UPDATE ON public.generated_documents FOR EACH ROW EXECUTE FUNCTION public.bump_version();
CREATE TRIGGER trg_bump_version_dossiers            BEFORE UPDATE ON public.process_dossiers    FOR EACH ROW EXECUTE FUNCTION public.bump_version();

-- 3) Helper de erro de conflito
CREATE OR REPLACE FUNCTION public._raise_lock_conflict(p_entity text, p_id uuid, p_expected int, p_current int)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'optimistic_lock_conflict:%:%:%:%',
    p_entity, p_id, p_expected, p_current
    USING ERRCODE = 'P0001',
          HINT = 'Registro alterado por outro usuário. Recarregue os dados.';
END $$;

-- =========================================================
-- 4) CAS: processes
-- =========================================================
CREATE OR REPLACE FUNCTION public.cas_update_process(
  p_id uuid, p_expected_version integer, p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current integer;
  v_new_row public.processes;
  v_allowed text[] := ARRAY[
    'title','notes','priority','due_date','status','tags','process_type',
    'process_type_id','customer_id','secondary_customer_id','vessel_id',
    'responsible_id','technical_manager_id','draft_data','is_favorite',
    'branding_mode','branding_logo_url'
  ];
  k text;
BEGIN
  PERFORM public._assert_process_access(p_id);
  SELECT version INTO v_current FROM public.processes WHERE id = p_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_current <> p_expected_version THEN
    PERFORM public._raise_lock_conflict('processes', p_id, p_expected_version, v_current);
  END IF;

  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT (k = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'field_not_allowed:%', k USING ERRCODE='P0001';
    END IF;
  END LOOP;

  UPDATE public.processes SET
    title                  = COALESCE((p_patch->>'title')::text,                  title),
    notes                  = COALESCE((p_patch->>'notes')::text,                  notes),
    priority               = COALESCE((p_patch->>'priority')::text,               priority),
    due_date               = COALESCE(NULLIF(p_patch->>'due_date','')::timestamptz, due_date),
    status                 = COALESCE((p_patch->>'status')::text,                 status),
    process_type           = COALESCE((p_patch->>'process_type')::text,           process_type),
    process_type_id        = COALESCE(NULLIF(p_patch->>'process_type_id','')::uuid, process_type_id),
    customer_id            = COALESCE(NULLIF(p_patch->>'customer_id','')::uuid,   customer_id),
    secondary_customer_id  = COALESCE(NULLIF(p_patch->>'secondary_customer_id','')::uuid, secondary_customer_id),
    vessel_id              = COALESCE(NULLIF(p_patch->>'vessel_id','')::uuid,     vessel_id),
    responsible_id         = COALESCE(NULLIF(p_patch->>'responsible_id','')::uuid, responsible_id),
    technical_manager_id   = COALESCE(NULLIF(p_patch->>'technical_manager_id','')::uuid, technical_manager_id),
    draft_data             = COALESCE(p_patch->'draft_data',                       draft_data),
    tags                   = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_patch->'tags')), tags),
    is_favorite            = COALESCE((p_patch->>'is_favorite')::boolean,          is_favorite),
    branding_mode          = COALESCE((p_patch->>'branding_mode')::text,           branding_mode),
    branding_logo_url      = COALESCE((p_patch->>'branding_logo_url')::text,       branding_logo_url),
    updated_at             = now()
  WHERE id = p_id
  RETURNING * INTO v_new_row;

  RETURN jsonb_build_object('ok', true, 'version', v_new_row.version, 'updated_at', v_new_row.updated_at);
END $$;

-- =========================================================
-- 5) CAS: document_checklists
-- =========================================================
CREATE OR REPLACE FUNCTION public.cas_update_checklist_item(
  p_id uuid, p_expected_version integer, p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current integer;
  v_process_id uuid;
  v_new_row public.document_checklists;
  v_allowed text[] := ARRAY['status','notes','item_name','is_mandatory','document_id','completed_at'];
  k text;
BEGIN
  SELECT process_id, version INTO v_process_id, v_current
    FROM public.document_checklists WHERE id = p_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  PERFORM public._assert_process_access(v_process_id);
  IF v_current <> p_expected_version THEN
    PERFORM public._raise_lock_conflict('document_checklists', p_id, p_expected_version, v_current);
  END IF;

  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT (k = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'field_not_allowed:%', k USING ERRCODE='P0001';
    END IF;
  END LOOP;

  UPDATE public.document_checklists SET
    status        = COALESCE((p_patch->>'status')::text,        status),
    notes         = COALESCE((p_patch->>'notes')::text,         notes),
    item_name     = COALESCE((p_patch->>'item_name')::text,     item_name),
    is_mandatory  = COALESCE((p_patch->>'is_mandatory')::boolean, is_mandatory),
    document_id   = COALESCE(NULLIF(p_patch->>'document_id','')::uuid, document_id),
    completed_at  = COALESCE(NULLIF(p_patch->>'completed_at','')::timestamptz, completed_at),
    updated_at    = now()
  WHERE id = p_id
  RETURNING * INTO v_new_row;

  RETURN jsonb_build_object('ok', true, 'version', v_new_row.version, 'updated_at', v_new_row.updated_at);
END $$;

-- =========================================================
-- 6) CAS: generated_documents
-- =========================================================
CREATE OR REPLACE FUNCTION public.cas_update_generated_document(
  p_id uuid, p_expected_version integer, p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current integer;
  v_process_id uuid;
  v_new_row public.generated_documents;
  v_allowed text[] := ARRAY['name','status','metadata','content_data','file_url'];
  k text;
BEGIN
  SELECT process_id, version INTO v_process_id, v_current
    FROM public.generated_documents WHERE id = p_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_process_id IS NOT NULL THEN
    PERFORM public._assert_process_access(v_process_id);
  END IF;
  IF v_current <> p_expected_version THEN
    PERFORM public._raise_lock_conflict('generated_documents', p_id, p_expected_version, v_current);
  END IF;

  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT (k = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'field_not_allowed:%', k USING ERRCODE='P0001';
    END IF;
  END LOOP;

  UPDATE public.generated_documents SET
    name         = COALESCE((p_patch->>'name')::text,   name),
    status       = COALESCE((p_patch->>'status')::text, status),
    file_url     = COALESCE((p_patch->>'file_url')::text, file_url),
    metadata     = COALESCE(p_patch->'metadata',     metadata),
    content_data = COALESCE(p_patch->'content_data', content_data),
    updated_at   = now()
  WHERE id = p_id
  RETURNING * INTO v_new_row;

  RETURN jsonb_build_object('ok', true, 'version', v_new_row.version, 'updated_at', v_new_row.updated_at);
END $$;

-- =========================================================
-- 7) CAS: process_dossiers
-- =========================================================
CREATE OR REPLACE FUNCTION public.cas_update_dossier(
  p_id uuid, p_expected_version integer, p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current integer;
  v_process_id uuid;
  v_new_row public.process_dossiers;
  v_allowed text[] := ARRAY['status','metadata','pdf_url','file_url','manifest'];
  k text;
BEGIN
  SELECT process_id, version INTO v_process_id, v_current
    FROM public.process_dossiers WHERE id = p_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  PERFORM public._assert_process_access(v_process_id);
  IF v_current <> p_expected_version THEN
    PERFORM public._raise_lock_conflict('process_dossiers', p_id, p_expected_version, v_current);
  END IF;

  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT (k = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'field_not_allowed:%', k USING ERRCODE='P0001';
    END IF;
  END LOOP;

  UPDATE public.process_dossiers SET
    status     = COALESCE((p_patch->>'status')::text,   status),
    pdf_url    = COALESCE((p_patch->>'pdf_url')::text,  pdf_url),
    file_url   = COALESCE((p_patch->>'file_url')::text, file_url),
    metadata   = COALESCE(p_patch->'metadata',          metadata),
    manifest   = COALESCE(p_patch->'manifest',          manifest),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_new_row;

  RETURN jsonb_build_object('ok', true, 'version', v_new_row.version, 'updated_at', v_new_row.updated_at);
END $$;

-- =========================================================
-- 8) Grants
-- =========================================================
GRANT EXECUTE ON FUNCTION public.cas_update_process(uuid,integer,jsonb)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.cas_update_checklist_item(uuid,integer,jsonb)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.cas_update_generated_document(uuid,integer,jsonb)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cas_update_dossier(uuid,integer,jsonb)             TO authenticated;
