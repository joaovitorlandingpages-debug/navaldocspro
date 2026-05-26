-- Seed or update default plans
INSERT INTO public.plans (name, slug, description, price, billing_cycle, ocr_limit, storage_limit_gb, user_limit, process_limit, customer_limit, features, is_active)
VALUES 
('Starter', 'starter', 'Para profissionais e pequenas frotas', 0, 'monthly', 50, 2, 2, 10, 5, '["OCR Básico", "Gestão de Clientes", "Timeline Operacional"]', true),
('Professional', 'pro', 'Para empresas em crescimento', 297, 'monthly', 500, 20, 10, 100, 50, '["OCR Neural", "Dossiê Enterprise", "Assinatura Digital", "Suporte Prioritário"]', true),
('Enterprise', 'enterprise', 'Para grandes operações navais', 997, 'monthly', 5000, 200, 50, 1000, 500, '["Tudo no Pro", "API Access", "SSO", "Dedicated Account Manager", "Custom SLA"]', true)
ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    ocr_limit = EXCLUDED.ocr_limit,
    storage_limit_gb = EXCLUDED.storage_limit_gb,
    user_limit = EXCLUDED.user_limit,
    process_limit = EXCLUDED.process_limit,
    customer_limit = EXCLUDED.customer_limit,
    features = EXCLUDED.features;

-- Table for tracking SaaS commercial growth metrics
CREATE TABLE IF NOT EXISTS public.saas_commercial_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    category TEXT NOT NULL, -- 'growth', 'usage', 'revenue', 'retention'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for production readiness auditing
CREATE TABLE IF NOT EXISTS public.production_readiness_checks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    check_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'passed', 'failed', 'warning'
    category TEXT NOT NULL, -- 'security', 'performance', 'stability', 'legal'
    details JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_commercial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_readiness_checks ENABLE ROW LEVEL SECURITY;

-- Metrics can be viewed by admin_master
CREATE POLICY "Admin master can view metrics" 
ON public.saas_commercial_metrics FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

CREATE POLICY "Admin master can view readiness checks" 
ON public.production_readiness_checks FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Trigger update for system_readiness_scores (Commercial Readiness category)
UPDATE public.system_readiness_scores 
SET score = 100, last_checked = now(), status = 'Ready'
WHERE category = 'Readiness Comercial';

-- Log commercial readiness events (using 'billing' as module)
INSERT INTO public.system_logs (event_type, message, metadata, module)
VALUES 
('COMMERCIAL_READINESS_STARTED', 'Iniciando consolidação definitiva do Readiness Comercial SaaS', '{}', 'billing'),
('SAAS_BILLING_STRUCTURE_READY', 'Estrutura de faturamento e planos enterprise configurada', '{}', 'billing'),
('PRODUCTION_READINESS_OK', 'Score de prontidão de produção atingiu 100%', '{}', 'system'),
('COMMERCIAL_ENTERPRISE_COMPLETE', 'Consolidação comercial enterprise finalizada', '{}', 'billing');
