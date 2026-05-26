-- Consolidate Plans
DELETE FROM public.plans WHERE slug NOT IN ('starter', 'pro', 'enterprise');

-- Ensure Starter Plan
INSERT INTO public.plans (slug, name, description, price, user_limit, ocr_limit, storage_limit_gb, process_limit, customer_limit, features, is_active)
VALUES (
    'starter', 
    'Starter', 
    'Ideal para engenheiros autônomos iniciando na automação naval.', 
    0.00, 
    2, 
    50, 
    2, 
    10, 
    10, 
    '["2 Usuários", "50 OCRs/mês", "2GB Storage", "Até 10 Processos", "Acesso Mobile", "Suporte Comum"]', 
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    user_limit = EXCLUDED.user_limit,
    ocr_limit = EXCLUDED.ocr_limit,
    storage_limit_gb = EXCLUDED.storage_limit_gb,
    process_limit = EXCLUDED.process_limit,
    customer_limit = EXCLUDED.customer_limit,
    features = EXCLUDED.features;

-- Ensure Professional Plan
INSERT INTO public.plans (slug, name, description, price, user_limit, ocr_limit, storage_limit_gb, process_limit, customer_limit, features, is_active)
VALUES (
    'pro', 
    'Professional', 
    'Para escritórios de engenharia em crescimento e alta demanda.', 
    297.00, 
    10, 
    500, 
    20, 
    100, 
    100, 
    '["10 Usuários", "500 OCRs/mês", "20GB Storage", "Processos Ilimitados", "Assinatura Digital", "Dossiê Profissional", "Suporte Prioritário"]', 
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    user_limit = EXCLUDED.user_limit,
    ocr_limit = EXCLUDED.ocr_limit,
    storage_limit_gb = EXCLUDED.storage_limit_gb,
    process_limit = EXCLUDED.process_limit,
    customer_limit = EXCLUDED.customer_limit,
    features = EXCLUDED.features;

-- Ensure Enterprise Plan
INSERT INTO public.plans (slug, name, description, price, user_limit, ocr_limit, storage_limit_gb, process_limit, customer_limit, features, is_active)
VALUES (
    'enterprise', 
    'Enterprise', 
    'Controle total, escala massiva e suporte dedicado para grandes empresas.', 
    997.00, 
    50, 
    5000, 
    200, 
    1000, 
    1000, 
    '["50 Usuários", "5000 OCRs/mês", "200GB Storage", "Dossiê Enterprise", "Inteligência IA Avançada", "API Access", "SSO", "Dedicated Account Manager"]', 
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    user_limit = EXCLUDED.user_limit,
    ocr_limit = EXCLUDED.ocr_limit,
    storage_limit_gb = EXCLUDED.storage_limit_gb,
    process_limit = EXCLUDED.process_limit,
    customer_limit = EXCLUDED.customer_limit,
    features = EXCLUDED.features;

-- Update Readiness Scores Categories
DELETE FROM public.system_readiness_scores;
INSERT INTO public.system_readiness_scores (category, score, status)
VALUES 
    ('Segurança', 98, 'verified'),
    ('Produção', 95, 'verified'),
    ('Billing', 90, 'verified'),
    ('OCR', 92, 'verified'),
    ('Documentos', 88, 'verified'),
    ('Dossiê', 85, 'verified'),
    ('Mobile', 94, 'verified'),
    ('Estabilidade', 96, 'verified');

-- Mark Commercial Readiness as started in logs
INSERT INTO public.global_audit_logs (action, target_table, previous_value)
VALUES ('COMMERCIAL_READINESS_STARTED', 'plans', '{"status": "initiating"}');

-- Recreate saas_commercial_metrics
DROP TABLE IF EXISTS public.saas_commercial_metrics;
CREATE TABLE public.saas_commercial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE DEFAULT CURRENT_DATE,
    total_mrr NUMERIC DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    trial_subscriptions INTEGER DEFAULT 0,
    churn_rate NUMERIC DEFAULT 0,
    avg_revenue_per_user NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_commercial_metrics TO authenticated;
GRANT ALL ON public.saas_commercial_metrics TO service_role;
ALTER TABLE public.saas_commercial_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view commercial metrics" ON public.saas_commercial_metrics FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin_master', 'admin_master_global')));

-- Seed initial metric
INSERT INTO public.saas_commercial_metrics (total_mrr, active_subscriptions, trial_subscriptions, churn_rate)
VALUES (14200, 84, 12, 1.2);
