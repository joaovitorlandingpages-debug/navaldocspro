-- System settings for versioning and global state
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Feature flags for controlled rollouts
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rules JSONB DEFAULT '{}', -- For rollout rules (e.g., specific company IDs)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Health metrics for continuous monitoring
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maintenance and incidents log
CREATE TABLE IF NOT EXISTS public.system_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'scheduled')),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ends_at TIMESTAMP WITH TIME ZONE,
    is_maintenance BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

-- Policies (Admin only for write, all authenticated for read on some)
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Everyone can read system settings" ON public.system_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Everyone can read feature flags" ON public.feature_flags FOR SELECT USING (true);

CREATE POLICY "Admins can manage health metrics" ON public.system_health_metrics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Everyone can read health metrics" ON public.system_health_metrics FOR SELECT USING (true);

CREATE POLICY "Admins can manage incidents" ON public.system_incidents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Everyone can read incidents" ON public.system_incidents FOR SELECT USING (true);

-- Insert initial version data
INSERT INTO public.system_settings (key, value, description) 
VALUES ('system_version', '{"major": 1, "minor": 5, "patch": 0, "label": "Enterprise Certified"}', 'Current platform version')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description) 
VALUES ('maintenance_config', '{"is_active": false, "message": "O sistema está passando por uma atualização programada."}', 'Global maintenance mode configuration')
ON CONFLICT (key) DO NOTHING;
