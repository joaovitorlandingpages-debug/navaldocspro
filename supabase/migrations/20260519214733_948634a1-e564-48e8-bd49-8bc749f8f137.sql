-- Fix security issues for the readiness function
REVOKE EXECUTE ON FUNCTION public.get_system_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_readiness() TO authenticated, service_role;
