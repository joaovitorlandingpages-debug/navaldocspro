-- SLA Configs by process type
CREATE TABLE IF NOT EXISTS public.sla_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_type_id UUID REFERENCES public.process_types(id),
    target_days INTEGER NOT NULL DEFAULT 5,
    warning_threshold_days INTEGER NOT NULL DEFAULT 3,
    critical_threshold_days INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Operational Insights / Suggestions
CREATE TABLE IF NOT EXISTS public.operational_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    process_id UUID REFERENCES public.processes(id),
    type TEXT NOT NULL, -- 'suggestion', 'warning', 'critical'
    title TEXT NOT NULL,
    description TEXT,
    action_label TEXT,
    action_url TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Operational Queues
CREATE TABLE IF NOT EXISTS public.queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    type TEXT NOT NULL, -- 'OCR', 'PDF_GEN', 'PROTOCOL', 'SIGNATURE', 'NOTIFICATION'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payload JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enterprise Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Advanced Audit Logs (extending activity_logs concept)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add SLA fields to processes
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS target_completion_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company sla_configs" ON public.sla_configs FOR SELECT USING (true);
CREATE POLICY "Users can view their company operational_insights" ON public.operational_insights FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = operational_insights.company_id));
CREATE POLICY "Users can view their company queue_items" ON public.queue_items FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = queue_items.company_id));
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view their company audit_logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = audit_logs.company_id));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sla_configs_updated_at BEFORE UPDATE ON public.sla_configs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_operational_insights_updated_at BEFORE UPDATE ON public.operational_insights FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_queue_items_updated_at BEFORE UPDATE ON public.queue_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
