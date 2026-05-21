-- AI Jobs Queue for asynchronous processing
CREATE TABLE IF NOT EXISTS public.ai_jobs_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL, -- 'ocr', 'document_analysis', 'memorial_gen', 'checklist_predict', 'analytics'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB DEFAULT '{}',
    error TEXT,
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Usage and Cost Monitoring
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL, -- 'ocr_advanced', 'copilot', 'memorial_ai', 'analytics_predict'
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    request_count INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10, 5) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Copilot Contextual History
CREATE TABLE IF NOT EXISTS public.ai_copilot_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    process_id UUID REFERENCES public.processes(id),
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    context_data JSONB DEFAULT '{}',
    rating INTEGER, -- User feedback 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Model Configurations (Decoupled Architecture)
CREATE TABLE IF NOT EXISTS public.ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT UNIQUE NOT NULL, -- 'ocr_engine', 'document_analyzer', 'memorial_generator'
    model_name TEXT NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet', 'custom-v1'
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'internal'
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_jobs_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's AI jobs" ON public.ai_jobs_queue FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their company's AI usage" ON public.ai_usage_stats FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own AI interactions" ON public.ai_copilot_interactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin Global can view all AI data" ON public.ai_jobs_queue FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master_global');
CREATE POLICY "Admin Global can view all AI usage" ON public.ai_usage_stats FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master_global');
CREATE POLICY "Admin Global can manage AI configs" ON public.ai_model_configs FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master_global');

-- Triggers for updated_at
CREATE TRIGGER update_ai_jobs_queue_updated_at BEFORE UPDATE ON public.ai_jobs_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_model_configs_updated_at BEFORE UPDATE ON public.ai_model_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
