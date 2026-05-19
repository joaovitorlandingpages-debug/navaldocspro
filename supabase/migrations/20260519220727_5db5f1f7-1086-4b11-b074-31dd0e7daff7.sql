-- 1. Intelligent Insights Table
CREATE TABLE IF NOT EXISTS public.process_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'bottleneck', 'suggestion', 'critical', 'automation'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Operational Anti-Error Alerts
CREATE TABLE IF NOT EXISTS public.operational_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL, -- 'divergence', 'missing_data', 'expired', 'validation'
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
    description TEXT NOT NULL,
    field_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 3. Enhance Processes for Kanban & SLA
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS kanban_stage TEXT DEFAULT 'draft';
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS sla_limit_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- 4. Automated Validation Trigger (Example: Motor Number Incompatibility)
CREATE OR REPLACE FUNCTION public.check_process_consistency() 
RETURNS TRIGGER AS $$
BEGIN
    -- This is a placeholder for complex business logic triggers
    -- Example: Check if motor numbers in extracted_data match between documents
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. RLS Policies
ALTER TABLE public.process_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for their company" ON public.process_insights
FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = public.process_insights.company_id));

CREATE POLICY "Users can view alerts for their company" ON public.operational_alerts
FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = public.operational_alerts.company_id));

-- 6. Indexes for Intelligence Queries
CREATE INDEX IF NOT EXISTS idx_insights_process_id ON public.process_insights(process_id);
CREATE INDEX IF NOT EXISTS idx_alerts_process_id ON public.operational_alerts(process_id);
CREATE INDEX IF NOT EXISTS idx_processes_kanban_stage ON public.processes(kanban_stage);
