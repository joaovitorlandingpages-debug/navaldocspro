-- Add columns to system_incidents for better tracking
ALTER TABLE public.system_incidents 
ADD COLUMN IF NOT EXISTS root_cause TEXT,
ADD COLUMN IF NOT EXISTS recovery_steps TEXT,
ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;

-- Create system_deploys table
CREATE TABLE IF NOT EXISTS public.system_deploys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    environment TEXT NOT NULL, -- staging, production
    status TEXT NOT NULL, -- in_progress, completed, failed, rolled_back
    release_notes TEXT,
    is_hotfix BOOLEAN DEFAULT false,
    deployed_by UUID REFERENCES auth.users(id),
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_backlog table for improvements and feedback
CREATE TABLE IF NOT EXISTS public.system_backlog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL, -- low, medium, high, critical
    status TEXT NOT NULL, -- backlog, prioritizing, planned, in_progress, completed
    category TEXT, -- feature, bug, improvement, security
    source TEXT, -- customer_feedback, internal, security_audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_deploys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backlog ENABLE ROW LEVEL SECURITY;

-- Policies (Admin only)
CREATE POLICY "Admins can manage deploys" ON public.system_deploys FOR ALL USING (true);
CREATE POLICY "Admins can manage backlog" ON public.system_backlog FOR ALL USING (true);

-- Trigger for updated_at in system_backlog
CREATE TRIGGER update_system_backlog_updated_at
BEFORE UPDATE ON public.system_backlog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
