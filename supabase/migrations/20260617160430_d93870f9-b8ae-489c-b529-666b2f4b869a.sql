CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin_master_global','admin_master')
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;
  -- Allow self-bootstrap: user can assign initial company_id when none exists
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    IF NOT (OLD.company_id IS NULL AND NEW.id = auth.uid()) THEN
      RAISE EXCEPTION 'Not allowed to change company_id';
    END IF;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'Not allowed to change partner_id';
  END IF;
  RETURN NEW;
END;
$function$;