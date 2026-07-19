-- 1. Create wizard_sessions table
CREATE TABLE IF NOT EXISTS public.wizard_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status TEXT CHECK (status IN ('draft', 'uploading', 'processing', 'review_required', 'ready_to_create', 'creating', 'completed', 'failed', 'cancelled')) DEFAULT 'draft',
    current_step TEXT DEFAULT 'documents',
    selected_service_id TEXT,
    selected_blueprint_id TEXT,
    customer_id UUID,
    vessel_id UUID,
    process_id UUID,
    uploaded_document_ids UUID[] DEFAULT '{}',
    ocr_job_ids UUID[] DEFAULT '{}',
    extracted_data JSONB DEFAULT '{}',
    review_status JSONB DEFAULT '{}',
    pending_requirements JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grants for wizard_sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wizard_sessions TO authenticated;
GRANT ALL ON public.wizard_sessions TO service_role;

-- RLS for wizard_sessions
ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company wizard sessions"
    ON public.wizard_sessions FOR SELECT
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY "Users can insert own company wizard sessions"
    ON public.wizard_sessions FOR INSERT
    TO authenticated
    WITH CHECK (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY "Users can update own company wizard sessions"
    ON public.wizard_sessions FOR UPDATE
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- 2. Create process_analyses table
CREATE TABLE IF NOT EXISTS public.process_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
    wizard_session_id UUID REFERENCES public.wizard_sessions(id) ON DELETE SET NULL,
    
    score NUMERIC(5,2) DEFAULT 0,
    approval_probability NUMERIC(5,2) DEFAULT 0,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    
    summary TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    detected_issues JSONB DEFAULT '[]'::jsonb,
    consistency_check JSONB DEFAULT '{}'::jsonb,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grants for process_analyses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_analyses TO authenticated;
GRANT ALL ON public.process_analyses TO service_role;

-- RLS for process_analyses
ALTER TABLE public.process_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company analyses"
    ON public.process_analyses FOR SELECT
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY "Users can insert own company analyses"
    ON public.process_analyses FOR INSERT
    TO authenticated
    WITH CHECK (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY "Users can update own company analyses"
    ON public.process_analyses FOR UPDATE
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_process_analyses_process_id ON public.process_analyses (process_id);
