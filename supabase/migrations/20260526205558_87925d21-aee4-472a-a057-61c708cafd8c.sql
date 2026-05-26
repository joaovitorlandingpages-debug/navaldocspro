-- Revoke public execute from verified SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.update_automation_stats() FROM public;
REVOKE EXECUTE ON FUNCTION public.create_document_version() FROM public;
REVOKE EXECUTE ON FUNCTION public.increment_ocr_usage(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.initialize_company_usage() FROM public;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.process_enterprise_audit_log() FROM public;

-- Grant to appropriate roles
GRANT EXECUTE ON FUNCTION public.update_automation_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_document_version() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_ocr_usage(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_company_usage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_enterprise_audit_log() TO authenticated, service_role;

-- Ensure search_path is set
ALTER FUNCTION public.current_company_id() SET search_path = public;
