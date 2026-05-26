-- Create process_dossiers table
CREATE TABLE public.process_dossiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'not_generated', -- 'not_generated', 'generating', 'generated', 'updated', 'error'
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_dossiers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view dossiers from their company"
ON public.process_dossiers
FOR SELECT
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert dossiers for their company"
ON public.process_dossiers
FOR INSERT
WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update dossiers for their company"
ON public.process_dossiers
FOR UPDATE
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_process_dossiers_updated_at
BEFORE UPDATE ON public.process_dossiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_process_dossiers_process_id ON public.process_dossiers(process_id);
CREATE INDEX idx_process_dossiers_company_id ON public.process_dossiers(company_id);
