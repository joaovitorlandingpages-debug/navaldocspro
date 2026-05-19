-- Fix security issues for the OCR timeline function
ALTER FUNCTION public.log_ocr_timeline_event() SET search_path = public;

-- Also check other security definer functions if they exist
-- (Adding this to be proactive based on the linter report)
REVOKE EXECUTE ON FUNCTION public.log_ocr_timeline_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ocr_timeline_event() TO authenticated, service_role;
