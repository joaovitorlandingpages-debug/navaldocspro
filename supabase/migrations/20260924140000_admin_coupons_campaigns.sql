-- ============================================================
-- Migration: Gestão de Cupons e Campanhas Promocionais
-- ============================================================
-- 1. Cria a tabela public.coupons para persistência de cupons e campanhas
-- 2. Suporta tanto cupons de desconto (percent/fixed) quanto extensão de trial (60 dias totais)
-- 3. RLS e funções de validação de elegibilidade e limite de resgates
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('trial_extension', 'percent', 'fixed')),
  trial_days INTEGER DEFAULT 60,
  discount_percent NUMERIC(5,2),
  discount_fixed NUMERIC(10,2),
  max_redemptions INTEGER DEFAULT 100,
  redemption_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas por código
CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (LOWER(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (is_active);

-- Tabela de resgates para evitar resgate duplicado pela mesma empresa
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_coupon_per_company UNIQUE (coupon_id, company_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_company_idx ON public.coupon_redemptions (company_id);

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Companies can view their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.coupon_redemptions;

-- Leitura pública de cupons ativos (para validação no checkout)
CREATE POLICY "Public can view active coupons"
ON public.coupons FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Administradores gerenciam cupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- Histórico de resgates por empresa
CREATE POLICY "Companies can view their own redemptions"
ON public.coupon_redemptions FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE POLICY "Admins can view all redemptions"
ON public.coupon_redemptions FOR ALL
TO authenticated
USING (public.is_admin_master());

-- Seed de campanhas iniciais aprovadas
INSERT INTO public.coupons (
  code,
  name,
  description,
  type,
  trial_days,
  discount_percent,
  discount_fixed,
  max_redemptions,
  is_active
)
VALUES 
(
  'NAVAL60',
  'Campanha Parceiros Navais - 60 Dias de Teste',
  'Concede 60 dias totais de teste gratuito para novos escritórios credenciados.',
  'trial_extension',
  60,
  NULL,
  NULL,
  500,
  true
),
(
  'BEMVINDO2026',
  'Boas-vindas 2026 - Desconto de 20%',
  'Desconto de 20% na primeira anuidade ou mensalidade.',
  'percent',
  NULL,
  20.00,
  NULL,
  200,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  trial_days = EXCLUDED.trial_days,
  discount_percent = EXCLUDED.discount_percent,
  is_active = EXCLUDED.is_active;

COMMIT;
