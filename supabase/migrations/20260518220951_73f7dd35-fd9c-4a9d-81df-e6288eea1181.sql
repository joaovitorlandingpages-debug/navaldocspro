-- Add draft support to processes
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb;

-- Create process comments table for internal communication
CREATE TABLE IF NOT EXISTS public.process_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    company_id UUID REFERENCES public.companies(id),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for comments
ALTER TABLE public.process_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments of their company" 
ON public.process_comments FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert comments for their company" 
ON public.process_comments FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Add requirements to document fields if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_fields' AND column_name = 'is_mandatory') THEN
        ALTER TABLE public.document_fields ADD COLUMN is_mandatory BOOLEAN DEFAULT false;
    END IF;
END $$;
