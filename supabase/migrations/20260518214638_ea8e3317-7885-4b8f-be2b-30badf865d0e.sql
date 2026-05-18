-- Revoke public execution of security definer functions
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Grant execution to postgres role (internal use)
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
