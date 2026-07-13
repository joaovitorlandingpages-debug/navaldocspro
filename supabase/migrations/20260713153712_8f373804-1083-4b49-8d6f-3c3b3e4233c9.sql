CREATE OR REPLACE FUNCTION public.storage_object_is_finalized(p_bucket text, p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_pid uuid;
BEGIN
  IF p_name IS NULL OR p_name = '' THEN RETURN false; END IF;

  SELECT gd.process_id INTO v_pid
    FROM public.generated_documents gd
    JOIN public.processes p ON p.id = gd.process_id
   WHERE (gd.generated_file_url LIKE '%' || p_name OR gd.signed_file_url LIKE '%' || p_name)
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
END $function$;