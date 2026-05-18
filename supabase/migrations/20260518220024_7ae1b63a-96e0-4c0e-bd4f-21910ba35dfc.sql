-- Fix security linter warnings
ALTER FUNCTION public.log_activity_event() SET search_path = public;

-- Revoke execute from public to prevent direct calls
REVOKE EXECUTE ON FUNCTION public.log_activity_event() FROM public;
REVOKE EXECUTE ON FUNCTION public.log_activity_event() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity_event() FROM anon;
