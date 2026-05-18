-- Update is_admin_master to be more efficient
CREATE OR REPLACE FUNCTION public.is_admin_master()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT role = 'admin_master'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Update handle_new_user to handle metadata more robustly
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Try to get company_id from metadata if it exists (for invite flows or specific signups)
  v_company_id := (new.raw_user_meta_data->>'company_id')::UUID;

  INSERT INTO public.profiles (id, email, name, role, company_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'Novo Usuário'), 
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    v_company_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure RLS on system_logs allows admin_master
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Master can see all logs" ON public.system_logs;
CREATE POLICY "Admin Master can see all logs" 
ON public.system_logs 
FOR ALL 
USING (is_admin_master());

DROP POLICY IF EXISTS "Companies can see their own logs" ON public.system_logs;
CREATE POLICY "Companies can see their own logs" 
ON public.system_logs 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Ensure plans are viewable by all authenticated users
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plans;
CREATE POLICY "Everyone can view active plans" 
ON public.plans 
FOR SELECT 
USING (is_active = true OR is_admin_master());
