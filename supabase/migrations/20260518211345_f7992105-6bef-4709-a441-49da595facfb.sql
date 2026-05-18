-- Add onboarding fields to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create system_health table
CREATE TABLE IF NOT EXISTS public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'operational',
    last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
    latency_ms INTEGER DEFAULT 0,
    uptime_percentage DECIMAL DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed system_health
INSERT INTO public.system_health (module_name, status, uptime_percentage)
VALUES 
    ('Database', 'operational', 99.99),
    ('Storage', 'operational', 99.95),
    ('Mercado Pago', 'operational', 99.9),
    ('OCR Engine', 'operational', 98.5),
    ('Auth Service', 'operational', 100.0)
ON CONFLICT (module_name) DO NOTHING;

-- Create tickets table for support and feedback
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'support', -- support, bug, feedback
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies for system_health (Public read)
CREATE POLICY "Everyone can view system health" 
ON public.system_health FOR SELECT USING (true);

-- Policies for tickets (Users see their own, Admin sees all)
CREATE POLICY "Users can view their own tickets" 
ON public.tickets FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin_master'
));

CREATE POLICY "Users can create tickets" 
ON public.tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets" 
ON public.tickets FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin_master'
));
