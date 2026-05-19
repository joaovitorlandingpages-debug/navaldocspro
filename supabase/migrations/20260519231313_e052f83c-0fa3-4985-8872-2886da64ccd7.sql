-- Pilot structure enhancements
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '[]'::jsonb;

-- Operational Feedback
CREATE TABLE IF NOT EXISTS public.operational_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT CHECK (type IN ('bug', 'suggestion', 'ux', 'other')),
    subject TEXT,
    description TEXT NOT NULL,
    context_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'ignored')),
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- System Changelog
CREATE TABLE IF NOT EXISTS public.system_changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage Analytics (Detailed)
CREATE TABLE IF NOT EXISTS public.usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    module_name TEXT NOT NULL,
    action TEXT NOT NULL,
    time_saved_minutes INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operational_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own feedback') THEN
        CREATE POLICY "Users can create their own feedback" ON public.operational_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own feedback') THEN
        CREATE POLICY "Users can view their own feedback" ON public.operational_feedback FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view changelog') THEN
        CREATE POLICY "Everyone can view changelog" ON public.system_changelog FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own analytics') THEN
        CREATE POLICY "Users can view their own analytics" ON public.usage_analytics FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert analytics') THEN
        CREATE POLICY "System can insert analytics" ON public.usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION public.track_usage(p_module TEXT, p_action TEXT, p_time_saved INT DEFAULT 0, p_meta JSONB DEFAULT '{}')
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.usage_analytics (user_id, module_name, action, time_saved_minutes, metadata)
    VALUES (auth.uid(), p_module, p_action, p_time_saved, p_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
