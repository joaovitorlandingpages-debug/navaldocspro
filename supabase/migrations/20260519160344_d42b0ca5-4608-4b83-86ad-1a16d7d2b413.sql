-- Update handle_new_user function to be more robust and use correct metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Novo Usuário'), 
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure companies policies are complete
CREATE POLICY "Authenticated users can insert a company" 
ON public.companies FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update their own company" 
ON public.companies FOR UPDATE 
TO authenticated 
USING (id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Ensure profiles can be updated by the owner
-- (This is already there but let's make sure it's correct for company_id update)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add a policy to allow users to insert their own profile if the trigger fails for some reason
-- though the trigger is the preferred way.
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);
