-- Fix search_path for security
ALTER FUNCTION public.generate_protocol_number() SET search_path = public;
