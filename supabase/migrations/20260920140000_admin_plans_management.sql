-- ============================================================
-- Migration: Gestão de Planos & Preços (Admin NavalDocs Pro)
-- ============================================================
-- Seguro para execução direta no Supabase Cloud SQL Editor.
-- Idempotente: preserva planos legados, contratos de assinaturas
-- e garante permissões de administração sem duplicidades.

-- 1. Assegurar colunas essenciais e adicionais na tabela public.plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS ocr_limit INTEGER DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS process_limit INTEGER DEFAULT 5;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS highlight_badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_monthly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_yearly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Índice único em slug para garantir idempotência
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_idx ON public.plans (slug);

-- Normalizar status de planos existentes que estavam sem a nova coluna
UPDATE public.plans 
SET status = CASE WHEN is_active = true THEN 'published' ELSE 'draft' END 
WHERE status IS NULL;

-- 2. Permissões de tabela (GRANT) para API Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

-- 3. Políticas RLS (Row Level Security) para public.plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage everything" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage plans" ON public.plans;

-- Leitura de planos para qualquer usuário autenticado (checkout, listagem, etc.)
CREATE POLICY "Authenticated users can view plans"
ON public.plans FOR SELECT
TO authenticated
USING (true);

-- Gestão completa (CRUD) restrita aos administradores da plataforma
CREATE POLICY "Admin master can manage plans" 
ON public.plans FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.role IN ('admin_master', 'admin_master_global', 'superadmin')
      OR profiles.email = 'joaovitor.f0725@gmail.com'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.role IN ('admin_master', 'admin_master_global', 'superadmin')
      OR profiles.email = 'joaovitor.f0725@gmail.com'
    )
  )
);

-- 4. Inserção idempotente dos 3 planos previstos como rascunhos (caso ainda não existam)
INSERT INTO public.plans (
  name,
  slug,
  description,
  price,
  price_yearly,
  billing_cycle,
  user_limit,
  process_limit,
  ocr_limit,
  storage_limit_gb,
  status,
  is_popular,
  highlight_badge,
  is_active,
  features
)
VALUES 
(
  'Essencial',
  'essencial',
  'Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.',
  149.00,
  1490.00,
  'monthly',
  1,
  20,
  200,
  5,
  'draft',
  false,
  NULL,
  true,
  jsonb_build_object(
    'priceYearly', 1490,
    'status', 'draft',
    'isPopular', false,
    'highlightFeatures', jsonb_build_array('1 Usuário', '20 Processos/mês', '200 Páginas IA/mês', '5 GB Storage')
  )
),
(
  'Profissional',
  'profissional',
  'Para escritórios em crescimento que exigem mais capacidade analítica com IA e múltiplos usuários.',
  299.00,
  2990.00,
  'monthly',
  3,
  60,
  600,
  15,
  'draft',
  true,
  'Recomendado',
  true,
  jsonb_build_object(
    'priceYearly', 2990,
    'status', 'draft',
    'isPopular', true,
    'highlightBadge', 'Recomendado',
    'highlightFeatures', jsonb_build_array('3 Usuários', '60 Processos/mês', '600 Páginas IA/mês', '15 GB Storage')
  )
),
(
  'Equipe',
  'equipe',
  'Solução completa para grandes empresas marítimas, estaleiros e consultorias com alta demanda.',
  599.00,
  5990.00,
  'monthly',
  10,
  150,
  1500,
  40,
  'draft',
  false,
  NULL,
  true,
  jsonb_build_object(
    'priceYearly', 5990,
    'status', 'draft',
    'isPopular', false,
    'highlightFeatures', jsonb_build_array('10 Usuários', '150 Processos/mês', '1.500 Páginas IA/mês', '40 GB Storage')
  )
)
ON CONFLICT (slug) DO NOTHING;
