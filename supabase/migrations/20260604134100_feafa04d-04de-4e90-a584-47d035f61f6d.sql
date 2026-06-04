CREATE TABLE IF NOT EXISTS public.frontend_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES public.profiles(id),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_stack TEXT,
    route TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frontend_errors TO authenticated;
GRANT ALL ON public.frontend_errors TO service_role;

ALTER TABLE public.frontend_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own company frontend errors" 
    ON public.frontend_errors 
    FOR ALL 
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = frontend_errors.company_id))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = frontend_errors.company_id));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_frontend_errors_company ON public.frontend_errors(company_id);
CREATE INDEX IF NOT EXISTS idx_frontend_errors_created_at ON public.frontend_errors(created_at DESC);
