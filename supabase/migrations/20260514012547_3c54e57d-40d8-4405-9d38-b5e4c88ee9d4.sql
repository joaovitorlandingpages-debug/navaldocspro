-- Switch to SECURITY INVOKER where possible
ALTER FUNCTION public.is_admin_master() SECURITY INVOKER;

-- handle_new_user MUST be security definer because it writes to public.profiles from auth trigger
-- but we already revoked all public access. The linter warning 0029 is a warning that authenticated users
-- CAN execute it. Even if we revoke, sometimes default grants persist.
-- We will try one more time to be extremely explicit.

ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
