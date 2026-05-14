-- Explicitly revoke from PUBLIC, anon, and authenticated before re-granting
REVOKE ALL ON FUNCTION public.is_admin_master() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Grant to necessary roles only
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO service_role;

-- handle_new_user is only for the trigger (system)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
