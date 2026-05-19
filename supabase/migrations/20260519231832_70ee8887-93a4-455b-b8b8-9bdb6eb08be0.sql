-- Operational Insights (The "Brain")
CREATE TABLE IF NOT EXISTS public.operational_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES auth.users(id),
    type TEXT CHECK (type IN ('automation', 'critical', 'bottleneck', 'suggestion', 'error_prevention')),
    message TEXT NOT NULL,
    action_label TEXT,
    action_url TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    is_resolved BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Automation Statistics
CREATE TABLE IF NOT EXISTS public.automation_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    module_name TEXT NOT NULL,
    total_executions INT DEFAULT 0,
    successful_executions INT DEFAULT 0,
    failed_executions INT DEFAULT 0,
    time_saved_seconds BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Anti-Error Engine Logs
CREATE TABLE IF NOT EXISTS public.anti_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id),
    company_id UUID REFERENCES public.companies(id),
    error_type TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_prevented BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance Processes
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS efficiency_score INT DEFAULT 100;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS automation_level INT DEFAULT 0; -- 0 to 100
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS automation_metadata JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE public.operational_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_error_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company insights') THEN
        CREATE POLICY "Users can view their company insights" ON public.operational_insights 
        FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = operational_insights.company_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company stats') THEN
        CREATE POLICY "Users can view their company stats" ON public.automation_statistics 
        FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = automation_statistics.company_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their company error logs') THEN
        CREATE POLICY "Users can view their company error logs" ON public.anti_error_logs 
        FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = anti_error_logs.company_id));
    END IF;
END $$;

-- Triggers for automation stats (example)
CREATE OR REPLACE FUNCTION public.update_automation_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.automation_statistics (company_id, module_name, total_executions, successful_executions)
    VALUES (NEW.company_id, NEW.module_name, 1, CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END)
    ON CONFLICT (company_id, module_name) DO UPDATE SET
        total_executions = automation_statistics.total_executions + 1,
        successful_executions = automation_statistics.successful_executions + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
