-- Fix mutable search path and restrict execution
ALTER FUNCTION public.log_system_event(TEXT, TEXT, TEXT, JSONB, UUID) 
SET search_path = public;

-- Revoke default execution permissions
REVOKE EXECUTE ON FUNCTION public.log_system_event(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_system_event(TEXT, TEXT, TEXT, JSONB, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_system_event(TEXT, TEXT, TEXT, JSONB, UUID) FROM anon;

-- Only service role or designated roles should execute if needed via Edge Functions
-- For client-side logging, we would need to GRANT EXECUTE TO authenticated, 
-- but we must be careful with what data they can pass.
