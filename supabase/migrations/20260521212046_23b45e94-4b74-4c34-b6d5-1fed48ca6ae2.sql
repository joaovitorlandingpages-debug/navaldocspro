-- Add missing columns to plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS process_limit INTEGER DEFAULT 5;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create usage metrics table if not exists
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    ocr_usage INTEGER DEFAULT 0,
    storage_usage_bytes BIGINT DEFAULT 0,
    processes_created INTEGER DEFAULT 0,
    docs_generated INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for Usage Metrics
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own company usage') THEN
        CREATE POLICY "Users can view their own company usage" 
        ON public.usage_metrics FOR SELECT 
        USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- Upsert real SaaS plans with full limit details
INSERT INTO public.plans (name, slug, description, price, user_limit, ocr_limit, storage_limit_gb, process_limit, features)
VALUES 
('Starter', 'starter', 'Para engenheiros autônomos iniciando na automação.', 197.00, 1, 50, 2, 20, '["OCR Básico", "Geração de PDFs", "Checklist Automático"]'),
('Professional', 'professional', 'A escala ideal para escritórios de engenharia em crescimento.', 497.00, 5, 250, 10, 100, '["OCR Avançado", "Assinatura Digital", "IA Operacional", "Dossiê ZIP"]'),
('Enterprise', 'enterprise', 'Operação massiva com controle total e suporte prioritário.', 1497.00, 999, 2000, 100, 9999, '["Tudo Ilimitado", "Admin Global", "Analytics Avançado", "SLA 99.9%"]')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    user_limit = EXCLUDED.user_limit,
    ocr_limit = EXCLUDED.ocr_limit,
    storage_limit_gb = EXCLUDED.storage_limit_gb,
    process_limit = EXCLUDED.process_limit,
    features = EXCLUDED.features,
    updated_at = now();
