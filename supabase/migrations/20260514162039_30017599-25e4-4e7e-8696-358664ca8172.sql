-- Plans table
CREATE TABLE public.plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
    customer_limit INTEGER,
    document_limit INTEGER,
    user_limit INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    mercado_pago_plan_id TEXT, -- For pre-defined MP plans
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'pending', -- active, trialing, past_due, canceled, pending
    mercado_pago_subscription_id TEXT,
    mercado_pago_customer_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    mercado_pago_payment_id TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL, -- approved, pending, rejected, refunded
    payment_method TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment Logs for Webhooks
CREATE TABLE public.payment_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT,
    payload JSONB,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

CREATE POLICY "Companies view own subscription" 
ON public.subscriptions FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Companies view own payments" 
ON public.payments FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Master Admins can see everything (handled by service role or explicit policy if needed)
-- Adding a placeholder for master admin access
CREATE POLICY "Admin master can manage everything" 
ON public.plans FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Initial Plans Seed
INSERT INTO public.plans (name, description, price, customer_limit, document_limit, user_limit, features)
VALUES 
('Start', 'Ideal para profissionais autônomos', 97.00, 10, 50, 1, '["Recursos básicos", "Geração de documentos", "Suporte via email"]'),
('Professional', 'Para empresas em crescimento', 297.00, 50, 250, 5, '["Automação avançada", "OCR inteligente", "Multiusuário", "Suporte prioritário"]'),
('Enterprise', 'Solução completa e ilimitada', 897.00, NULL, NULL, NULL, '["Ilimitado", "Equipe completa", "API privada", "Gerente de conta"]');

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
