CREATE OR REPLACE FUNCTION public.active_processes_count(p_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)::int
  FROM public.processes
  WHERE company_id = p_company_id
    AND archived_at IS NULL
    AND trashed_at IS NULL
    AND deleted_at IS NULL
    AND COALESCE(is_draft, false) = false;
$function$;

GRANT EXECUTE ON FUNCTION public.active_processes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_processes_count(uuid) TO service_role;