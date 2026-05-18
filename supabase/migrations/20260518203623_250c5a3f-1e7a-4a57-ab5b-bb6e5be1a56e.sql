-- Add missing columns to plans table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'slug') THEN
        ALTER TABLE public.plans ADD COLUMN slug TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'ocr_limit') THEN
        ALTER TABLE public.plans ADD COLUMN ocr_limit INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'updated_at') THEN
        ALTER TABLE public.plans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Update existing plans with slugs if they exist
UPDATE public.plans SET slug = LOWER(name) WHERE slug IS NULL;

-- Insert or Update default plans
INSERT INTO public.plans (name, slug, description, price, customer_limit, document_limit, ocr_limit, user_limit, features)
VALUES 
('Start', 'start', 'Ideal para quem está começando', 149.90, 10, 50, 20, 1, '["1 Usuário", "Até 10 Clientes", "50 Documentos/mês", "20 OCRs/mês"]'),
('Professional', 'professional', 'Para empresas em crescimento', 299.90, 50, 250, 100, 5, '["5 Usuários", "Até 50 Clientes", "250 Documentos/mês", "100 OCRs/mês", "Suporte Prioritário"]'),
('Enterprise', 'enterprise', 'Escalabilidade máxima', 899.90, 500, 2000, 1000, 20, '["20 Usuários", "Até 500 Clientes", "2000 Documentos/mês", "1000 OCRs/mês", "Gerente de Conta"]')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    customer_limit = EXCLUDED.customer_limit,
    document_limit = EXCLUDED.document_limit,
    ocr_limit = EXCLUDED.ocr_limit,
    user_limit = EXCLUDED.user_limit,
    features = EXCLUDED.features;
