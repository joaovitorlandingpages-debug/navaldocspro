-- Create ai_action_audits table
CREATE TABLE public.ai_action_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    action_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    process_id UUID REFERENCES public.processes(id),
    document_id UUID REFERENCES public.generated_documents(id),
    conversation_id TEXT,
    provider TEXT,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    warnings JSONB,
    errors JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance and constraints
CREATE UNIQUE INDEX idx_ai_action_audits_execution_id ON public.ai_action_audits(execution_id);
CREATE INDEX idx_ai_action_audits_company_id ON public.ai_action_audits(company_id);
CREATE INDEX idx_ai_action_audits_user_id ON public.ai_action_audits(user_id);
CREATE INDEX idx_ai_action_audits_action_id ON public.ai_action_audits(action_id);
CREATE INDEX idx_ai_action_audits_created_at ON public.ai_action_audits(created_at);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.ai_action_audits TO authenticated;
GRANT ALL ON public.ai_action_audits TO service_role;

-- RLS
ALTER TABLE public.ai_action_audits ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/manage audits from their own company
CREATE POLICY "Users can view their company audits"
ON public.ai_action_audits
FOR SELECT
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their company audits"
ON public.ai_action_audits
FOR INSERT
TO authenticated
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company audits"
ON public.ai_action_audits
FOR UPDATE
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
