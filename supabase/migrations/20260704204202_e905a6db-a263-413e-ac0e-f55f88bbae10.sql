
-- Temporarily disable finalization trigger to perform admin dedupe
ALTER TABLE public.process_dossiers DISABLE TRIGGER USER;

UPDATE public.process_dossiers
   SET status = 'superseded',
       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'superseded_at', now(),
         'superseded_reason', 'duplicate_active_dossier_onda2d',
         'previous_status', status
       )
 WHERE process_id = 'e12d074f-34d6-456a-b984-759d6ac25571'
   AND id <> (
     SELECT id FROM public.process_dossiers
      WHERE process_id = 'e12d074f-34d6-456a-b984-759d6ac25571'
      ORDER BY created_at DESC LIMIT 1
   );

ALTER TABLE public.process_dossiers ENABLE TRIGGER USER;

INSERT INTO public.process_finalization_overrides
  (process_id, table_name, op, row_pk, actor_id, actor_role, old_data, new_data)
SELECT process_id, 'process_dossiers', 'DEDUP', id, NULL, 'system',
       jsonb_build_object('status','generated'),
       jsonb_build_object('status','superseded','reason','onda_2d_dedup')
  FROM public.process_dossiers
 WHERE process_id = 'e12d074f-34d6-456a-b984-759d6ac25571'
   AND status = 'superseded';

-- Partial unique index: only one ACTIVE dossier per process
CREATE UNIQUE INDEX IF NOT EXISTS process_dossiers_one_active_uniq
  ON public.process_dossiers(process_id)
  WHERE status IN ('generated','approved','signed','completed','delivered');

-- ============================================================
-- Storage immutability
-- ============================================================
CREATE OR REPLACE FUNCTION public.storage_object_company(p_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(split_part(p_name, '/', 1), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.storage_object_is_finalized(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_pid uuid;
BEGIN
  IF p_name IS NULL OR p_name = '' THEN RETURN false; END IF;

  SELECT gd.process_id INTO v_pid
    FROM public.generated_documents gd
    JOIN public.processes p ON p.id = gd.process_id
   WHERE gd.file_url LIKE '%' || p_name
     AND (p.finalized_at IS NOT NULL OR p.status IN ('completed','finalized','archived'))
   LIMIT 1;
  IF v_pid IS NOT NULL THEN RETURN true; END IF;

  SELECT pd.process_id INTO v_pid
    FROM public.process_dossiers pd
    JOIN public.processes p ON p.id = pd.process_id
   WHERE (pd.file_url LIKE '%' || p_name
       OR pd.final_pdf_url LIKE '%' || p_name
       OR pd.zip_url LIKE '%' || p_name)
     AND (p.finalized_at IS NOT NULL OR p.status IN ('completed','finalized','archived'))
   LIMIT 1;
  IF v_pid IS NOT NULL THEN RETURN true; END IF;

  SELECT pdu.process_id INTO v_pid
    FROM public.process_document_uploads pdu
    JOIN public.processes p ON p.id = pdu.process_id
   WHERE pdu.file_url LIKE '%' || p_name
     AND (p.finalized_at IS NOT NULL OR p.status IN ('completed','finalized','archived'))
   LIMIT 1;
  IF v_pid IS NOT NULL THEN RETURN true; END IF;

  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.storage_guard_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_buckets text[] := ARRAY[
    'generated-documents','signed-documents','process-dossiers',
    'process-document-uploads','ocr-documents','customer-documents'
  ];
  v_is_admin boolean;
  v_finalized boolean;
BEGIN
  IF NOT (COALESCE(NEW.bucket_id, OLD.bucket_id) = ANY(v_buckets)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_finalized := public.storage_object_is_finalized(
    COALESCE(NEW.bucket_id, OLD.bucket_id),
    COALESCE(NEW.name, OLD.name)
  );

  IF NOT v_finalized THEN RETURN COALESCE(NEW, OLD); END IF;

  v_is_admin := public.is_admin_master_caller();

  IF v_is_admin THEN
    INSERT INTO public.process_finalization_overrides
      (process_id, table_name, op, row_pk, actor_id, actor_role, old_data, new_data)
    VALUES (
      NULL, 'storage.objects', TG_OP, NULL, auth.uid(), 'admin_master',
      CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN jsonb_build_object('bucket', OLD.bucket_id, 'name', OLD.name) END,
      CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN jsonb_build_object('bucket', NEW.bucket_id, 'name', NEW.name) END
    );
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'storage_finalized_immutable: cannot % object %/% because it belongs to a finalized process',
    TG_OP, COALESCE(NEW.bucket_id, OLD.bucket_id), COALESCE(NEW.name, OLD.name)
    USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS trg_storage_guard_finalized_ins ON storage.objects;
DROP TRIGGER IF EXISTS trg_storage_guard_finalized_upd ON storage.objects;
DROP TRIGGER IF EXISTS trg_storage_guard_finalized_del ON storage.objects;

CREATE TRIGGER trg_storage_guard_finalized_ins
  BEFORE INSERT ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.storage_guard_finalized();

CREATE TRIGGER trg_storage_guard_finalized_upd
  BEFORE UPDATE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.storage_guard_finalized();

CREATE TRIGGER trg_storage_guard_finalized_del
  BEFORE DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.storage_guard_finalized();
