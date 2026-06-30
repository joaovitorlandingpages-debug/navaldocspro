
-- 1) Soft-delete marker on uploaded_files
ALTER TABLE public.uploaded_files
  ADD COLUMN IF NOT EXISTS discarded_at timestamptz;

-- 2) Purge function: removes storage objects + rows for files discarded > 24h ago,
--    and rows that point to storage objects that no longer exist (orphans).
CREATE OR REPLACE FUNCTION public.purge_orphan_uploads(p_older_than interval DEFAULT interval '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_removed_objects int := 0;
  v_removed_rows int := 0;
  r record;
BEGIN
  -- Remove storage objects for files explicitly discarded
  FOR r IN
    SELECT uf.id, uf.file_url, uf.company_id
      FROM public.uploaded_files uf
     WHERE uf.discarded_at IS NOT NULL
       AND uf.discarded_at < now() - p_older_than
  LOOP
    BEGIN
      DELETE FROM storage.objects
       WHERE bucket_id IN ('customer-documents','vessel-documents','process-attachments',
                           'ocr-documents','generated-documents','process-document-uploads',
                           'process-dossiers','signed-documents','company-branding','document-templates')
         AND name = regexp_replace(r.file_url, '^.*/storage/v1/object/(public|sign)/[^/]+/', '');
      GET DIAGNOSTICS v_removed_objects = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DELETE FROM public.uploaded_files WHERE id = r.id;
    v_removed_rows := v_removed_rows + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'removed_rows', v_removed_rows,
    'removed_objects', v_removed_objects,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_orphan_uploads(interval) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_orphan_uploads(interval) TO service_role;

-- 3) Schedule daily purge (3 AM UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-orphan-uploads-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-orphan-uploads-daily');
    PERFORM cron.schedule(
      'purge-orphan-uploads-daily',
      '0 3 * * *',
      $cron$ SELECT public.purge_orphan_uploads(interval '24 hours'); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
