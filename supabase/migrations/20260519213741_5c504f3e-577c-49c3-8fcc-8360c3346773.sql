-- Fix security issues for the SLA logging function
ALTER FUNCTION public.log_process_stage_change() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.log_process_stage_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_process_stage_change() TO authenticated, service_role;
