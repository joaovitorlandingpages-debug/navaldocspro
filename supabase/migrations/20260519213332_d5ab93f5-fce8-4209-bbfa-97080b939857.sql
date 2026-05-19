-- Fix security issues for the automation function
REVOKE EXECUTE ON FUNCTION public.sync_process_automation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_process_automation() TO authenticated, service_role;
