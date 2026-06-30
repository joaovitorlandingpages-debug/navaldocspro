-- Official Supabase pattern: pgcrypto lives in the `extensions` schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.process_get_share_token(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_token text;
BEGIN
  PERFORM public._assert_process_access(p_id);
  SELECT share_token INTO v_token FROM public.processes WHERE id = p_id;
  IF v_token IS NULL THEN
    v_token := encode(extensions.gen_random_bytes(18), 'hex');
    UPDATE public.processes SET share_token = v_token WHERE id = p_id;
  END IF;
  RETURN v_token;
END;
$function$;