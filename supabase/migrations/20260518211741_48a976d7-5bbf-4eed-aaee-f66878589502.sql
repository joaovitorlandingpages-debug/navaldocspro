-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'error', 'info', 'warning', 'audit'
    module TEXT NOT NULL, -- 'auth', 'payment', 'ocr', 'docs', 'onboarding'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see logs
CREATE POLICY "Admins can view all system logs" 
ON public.system_logs FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin_master'
));

-- Function to log system events (can be called from Edge Functions or via RPC)
CREATE OR REPLACE FUNCTION public.log_system_event(
    p_event_type TEXT,
    p_module TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_company_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.system_logs (event_type, module, message, metadata, company_id, user_id)
    VALUES (p_event_type, p_module, p_message, p_metadata, p_company_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
