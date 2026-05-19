-- Add created_by column
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Update existing companies with a reasonable default if possible (e.g. from profiles)
UPDATE public.companies c
SET created_by = (SELECT id FROM public.profiles p WHERE p.company_id = c.id LIMIT 1)
WHERE created_by IS NULL;

-- Update SELECT policy
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" 
ON public.companies FOR SELECT 
USING (
    id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin_master')
);

-- Update INSERT policy to ensure created_by is set
DROP POLICY IF EXISTS "Authenticated users can insert a company" ON public.companies;
CREATE POLICY "Authenticated users can insert a company" 
ON public.companies FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
