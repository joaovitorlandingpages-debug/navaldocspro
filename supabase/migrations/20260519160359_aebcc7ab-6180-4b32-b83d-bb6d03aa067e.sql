-- Fix search_path for security
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Refine companies insertion policy (already TO authenticated, but let's be explicit)
DROP POLICY IF EXISTS "Authenticated users can insert a company" ON public.companies;
CREATE POLICY "Authenticated users can insert a company" 
ON public.companies FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);
