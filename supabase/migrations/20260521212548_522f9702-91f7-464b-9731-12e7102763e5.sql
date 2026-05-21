-- System Roadmap table
CREATE TABLE public.system_roadmap (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'bug', 'security')),
    target_version TEXT,
    estimated_completion DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- OCR Evolution Logs
CREATE TABLE public.ocr_evolution_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID,
    document_type TEXT,
    confidence_score NUMERIC,
    was_manually_corrected BOOLEAN DEFAULT false,
    correction_details JSONB,
    error_message TEXT,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Telemetry Logs
CREATE TABLE public.telemetry_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    event_type TEXT NOT NULL, -- e.g., 'module_access', 'flow_start', 'flow_complete', 'error'
    module_name TEXT,
    flow_name TEXT,
    step_name TEXT,
    duration_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SaaS Global Metrics (Snapshot table for trends)
CREATE TABLE public.saas_global_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_mrr NUMERIC DEFAULT 0,
    total_companies INTEGER DEFAULT 0,
    active_users_daily INTEGER DEFAULT 0,
    active_users_monthly INTEGER DEFAULT 0,
    churn_rate NUMERIC DEFAULT 0,
    ocr_total_usage INTEGER DEFAULT 0,
    storage_total_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_evolution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_global_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for Roadmap (Publicly readable by authenticated users, manageable by admin_master)
CREATE POLICY "Roadmap readable by all authenticated users"
    ON public.system_roadmap FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Roadmap manageable by admin_master"
    ON public.system_roadmap FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin_master' OR profiles.role = 'admin_master_global')
    ));

-- Policies for OCR Logs (Readable by company admin for their company, global admin for all)
CREATE POLICY "OCR logs visible to company admin"
    ON public.ocr_evolution_logs FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin_master' OR role = 'admin_master_global'))
    );

-- Policies for Telemetry (Insertable by anyone, readable by admin_master)
CREATE POLICY "Telemetry insertable by authenticated"
    ON public.telemetry_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Telemetry readable by admin_master"
    ON public.telemetry_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin_master' OR profiles.role = 'admin_master_global')
    ));

-- Policies for SaaS Metrics (Readable only by admin_master)
CREATE POLICY "SaaS metrics readable by admin_master"
    ON public.saas_global_metrics FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin_master' OR profiles.role = 'admin_master_global')
    ));

-- Create triggers for updated_at
CREATE TRIGGER update_system_roadmap_updated_at
    BEFORE UPDATE ON public.system_roadmap
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
