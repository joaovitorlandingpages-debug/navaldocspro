-- Sprint 4D.1 P0 fix: handle_new_user default 'user' violates profiles_role_check.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'company_admin');
  IF v_role NOT IN ('admin_master_global','admin_master','company_admin','engineer','dispatcher','operational','finance','viewer') THEN
    v_role := 'company_admin';
  END IF;
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Novo Usuário'),
    v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$function$;