
DO $$ BEGIN
  CREATE TYPE public.template_lifecycle AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS lifecycle_status public.template_lifecycle;

UPDATE public.document_templates
   SET lifecycle_status = CASE
     WHEN is_active AND COALESCE(validation_status,'ativo') = 'ativo' THEN 'published'::public.template_lifecycle
     WHEN NOT is_active THEN 'archived'::public.template_lifecycle
     ELSE 'draft'::public.template_lifecycle
   END
 WHERE lifecycle_status IS NULL;

ALTER TABLE public.document_templates
  ALTER COLUMN lifecycle_status SET NOT NULL,
  ALTER COLUMN lifecycle_status SET DEFAULT 'draft';

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS is_default_for_scope boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_default_company_scope_uniq
  ON public.document_templates (
    company_id, COALESCE(process_type,''), COALESCE(category,''), COALESCE(region_tag,'')
  )
  WHERE is_default_for_scope = true AND lifecycle_status = 'published'
    AND is_global = false AND company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_default_global_scope_uniq
  ON public.document_templates (
    COALESCE(process_type,''), COALESCE(category,''), COALESCE(region_tag,'')
  )
  WHERE is_default_for_scope = true AND lifecycle_status = 'published' AND is_global = true;

ALTER TABLE public.template_versions DROP CONSTRAINT IF EXISTS template_versions_template_id_fkey;
ALTER TABLE public.template_versions
  ALTER COLUMN template_id TYPE uuid USING NULLIF(template_id,'')::uuid;
ALTER TABLE public.template_versions
  ADD CONSTRAINT template_versions_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.document_templates(id) ON DELETE CASCADE;

ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS version_number integer,
  ADD COLUMN IF NOT EXISTS status public.template_lifecycle NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS document_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS base_content text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS template_versions_tpl_verno_uniq
  ON public.template_versions(template_id, version_number)
  WHERE version_number IS NOT NULL;

ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS document_structure_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS template_snapshot_hash text,
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES public.template_versions(id);

-- Backfill com guard de finalização temporariamente desativado
ALTER TABLE public.generated_documents DISABLE TRIGGER USER;

UPDATE public.generated_documents gd
   SET template_snapshot = jsonb_build_object(
         'template_id', dt.id, 'name', dt.name, 'code', dt.code,
         'category', dt.category, 'process_type', dt.process_type,
         'version', dt.version, 'version_number', dt.version_number,
         'fields_config', dt.fields_config, 'metadata', dt.metadata,
         'region_tag', dt.region_tag, 'file_type', dt.file_type,
         'source_origin', dt.source_origin,
         'backfilled', true, 'backfilled_at', now(), 'legacy', true
       ),
       document_structure_snapshot = COALESCE(dt.document_structure,'{}'::jsonb),
       template_snapshot_hash = md5(coalesce(dt.base_content,'') || coalesce(dt.document_structure::text,'') || coalesce(dt.fields_config::text,''))
  FROM public.document_templates dt
 WHERE gd.template_id = dt.id AND gd.template_snapshot IS NULL;

UPDATE public.generated_documents
   SET template_snapshot = jsonb_build_object('legacy', true, 'reason', 'no_template_reference', 'backfilled_at', now())
 WHERE template_snapshot IS NULL;

ALTER TABLE public.generated_documents ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.protect_used_template_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.generated_documents WHERE template_id = OLD.id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'template_in_use: template % está referenciado por % documento(s) gerado(s). Arquive em vez de excluir.', OLD.id, v_count
      USING ERRCODE='P0001';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_protect_used_template_delete ON public.document_templates;
CREATE TRIGGER trg_protect_used_template_delete
  BEFORE DELETE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.protect_used_template_delete();

CREATE OR REPLACE FUNCTION public.protect_generated_document_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.template_snapshot IS NOT NULL AND NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot THEN
    RAISE EXCEPTION 'snapshot_immutable: template_snapshot não pode ser alterado após gravação' USING ERRCODE='P0001';
  END IF;
  IF OLD.document_structure_snapshot IS NOT NULL AND NEW.document_structure_snapshot IS DISTINCT FROM OLD.document_structure_snapshot THEN
    RAISE EXCEPTION 'snapshot_immutable: document_structure_snapshot é imutável' USING ERRCODE='P0001';
  END IF;
  IF OLD.template_snapshot_hash IS NOT NULL AND NEW.template_snapshot_hash IS DISTINCT FROM OLD.template_snapshot_hash THEN
    RAISE EXCEPTION 'snapshot_immutable: template_snapshot_hash é imutável' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_gd_snapshot ON public.generated_documents;
CREATE TRIGGER trg_protect_gd_snapshot
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_generated_document_snapshot();

GRANT SELECT ON public.template_versions TO authenticated;
GRANT ALL ON public.template_versions TO service_role;
