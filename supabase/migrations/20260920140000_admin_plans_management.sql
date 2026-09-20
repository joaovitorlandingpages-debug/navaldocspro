-- ============================================================
-- Migration: Gestão de Planos & Preços (Admin NavalDocs Pro)
-- ============================================================

-- 1. Colunas adicionais na tabela public.plans para suportar ciclo de vida e sincronização Stripe
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS highlight_badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_monthly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_yearly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- 2. Atualizar políticas RLS de administração para public.plans
DROP POLICY IF EXISTS "Admin master can manage everything" ON public.plans;
CREATE POLICY "Admin master can manage everything" 
ON public.plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      role IN ('admin_master', 'admin_master_global', 'superadmin')
      OR email = 'joaovitor.f0725@gmail.com'
    )
  )
);

-- 3. Inserção idempotente dos 3 planos previstos como rascunhos (caso não existam)
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
