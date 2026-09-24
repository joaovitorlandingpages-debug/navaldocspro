-- ============================================================
-- Migration: Gestão Segura de Cupons e Campanhas Promocionais
-- ============================================================
-- 1. Cria a tabela public.coupons com RLS restrito EXCLUSIVAMENTE a Administradores Master
-- 2. Tabela public.coupon_redemptions para controle seguro de resgates únicos por empresa
-- 3. Função RPC public.validate_coupon_code (SECURITY DEFINER) para validação segura sem expor o catálogo
-- 4. Função RPC public.redeem_trial_extension_coupon com bloqueio atômico de concorrência (FOR UPDATE)
-- 5. SEM SEEDS COMERCIAIS AUTOMÁTICOS (não cria códigos de 20%, 500 ou 200 resgates)
-- 6. NÃO sobrescreve nem reativa campanhas existentes
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('trial_extension', 'percent', 'fixed')),
  trial_days INTEGER DEFAULT 60 CHECK (trial_days IS NULL OR trial_days > 0),
  discount_percent NUMERIC(5,2) CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  discount_fixed NUMERIC(10,2) CHECK (discount_fixed IS NULL OR discount_fixed > 0),
  discount_duration TEXT DEFAULT 'once' CHECK (discount_duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER DEFAULT NULL CHECK (duration_in_months IS NULL OR duration_in_months > 0),
  applicable_plans TEXT[] DEFAULT '{}',
  applicable_billing_cycles TEXT[] DEFAULT '{}',
  max_redemptions INTEGER DEFAULT 100 CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER DEFAULT 0 CHECK (redemption_count >= 0),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (is_active);

-- Tabela de resgates para auditoria e controle de uso único por empresa
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_coupon_per_company UNIQUE (coupon_id, company_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_company_idx ON public.coupon_redemptions (company_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);

-- Habilita RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas anteriores
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Companies can view their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.coupon_redemptions;

-- PRIVACIDADE ESTRITA: Somente Administradores Master podem consultar ou gerenciar a tabela coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- Histórico de resgates: Empresas consultam apenas seus próprios resgates
CREATE POLICY "Companies can view their own redemptions"
ON public.coupon_redemptions FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE POLICY "Admins can manage all redemptions"
ON public.coupon_redemptions FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- ============================================================
-- RPC: Validação Segura de Código de Cupom
-- ============================================================
-- Retorna apenas os dados estritamente necessários para o cliente,
-- sem expor o catálogo completo nem segredos internos.
CREATE OR REPLACE FUNCTION public.validate_coupon_code(
  p_code TEXT,
  p_company_id UUID,
  p_plan_slug TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_already_redeemed BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Código do cupom não informado.');
  END IF;

  -- Busca o cupom pelo código em maiúsculas
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom inválido ou não encontrado.');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Este cupom está inativo no momento.');
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > v_now THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Esta campanha promocional ainda não foi iniciada.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < v_now THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Este cupom está expirado.');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'message', 'O limite máximo de resgates deste cupom foi atingido.');
  END IF;

  -- Verifica se a empresa já utilizou este cupom
  IF p_company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.coupon_redemptions
      WHERE coupon_id = v_coupon.id AND company_id = p_company_id
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom já foi utilizado pelo seu escritório.');
    END IF;
  END IF;

  -- Valida elegibilidade por plano (se aplicável)
  IF p_plan_slug IS NOT NULL AND array_length(v_coupon.applicable_plans, 1) > 0 THEN
    IF NOT (p_plan_slug = ANY(v_coupon.applicable_plans)) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom não é aplicável ao plano selecionado.');
    END IF;
  END IF;

  -- Valida elegibilidade por ciclo de faturamento (se aplicável)
  IF p_billing_cycle IS NOT NULL AND array_length(v_coupon.applicable_billing_cycles, 1) > 0 THEN
    IF NOT (p_billing_cycle = ANY(v_coupon.applicable_billing_cycles)) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom não é aplicável ao ciclo de faturamento selecionado.');
    END IF;
  END IF;

  -- Retorna apenas os dados necessários
  RETURN jsonb_build_object(
    'valid', true,
    'id', v_coupon.id,
    'code', v_coupon.code,
    'name', v_coupon.name,
    'description', v_coupon.description,
    'type', v_coupon.type,
    'trial_days', v_coupon.trial_days,
    'discount_percent', v_coupon.discount_percent,
    'discount_fixed', v_coupon.discount_fixed,
    'discount_duration', v_coupon.discount_duration,
    'message', 'Cupom aplicado com sucesso!'
  );
END;
$$;

-- ============================================================
-- RPC: Resgate Seguro de Campanha de Extensão de Teste Gratuito
-- ============================================================
-- Funciona SEM necessidade de cartão de crédito.
-- Totaliza até os dias estipulados (ex: 60 dias) preservando termos mais longos existentes.
-- Bloqueio FOR UPDATE para garantir concorrência e evitar extensões duplicadas.
CREATE OR REPLACE FUNCTION public.redeem_trial_extension_coupon(
  p_code TEXT,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_company RECORD;
  v_already_redeemed BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_company_created TIMESTAMP WITH TIME ZONE;
  v_target_trial_end TIMESTAMP WITH TIME ZONE;
  v_current_trial_end TIMESTAMP WITH TIME ZONE;
  v_final_trial_end TIMESTAMP WITH TIME ZONE;
  v_trial_days INTEGER;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Escritório não identificado.');
  END IF;

  -- 1. Bloqueio atômico do cupom sob concorrência
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código de campanha inválido ou não encontrado.');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha está inativa no momento.');
  END IF;

  IF v_coupon.type != 'trial_extension' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este código é um cupom de desconto para contratação, aplique-o na tela de assinatura.');
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha promocional ainda não foi iniciada.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha está expirada.');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'message', 'O limite de resgates desta campanha foi atingido.');
  END IF;

  -- 2. Verifica se a empresa já resgatou este cupom
  SELECT EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND company_id = p_company_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Seu escritório já resgatou esta campanha anteriormente.');
  END IF;

  -- 3. Busca a empresa
  SELECT id, created_at, trial_ends_at INTO v_company
  FROM public.companies
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Escritório não encontrado no sistema.');
  END IF;

  v_company_created := COALESCE(v_company.created_at, v_now);
  v_trial_days := COALESCE(v_coupon.trial_days, 60);

  -- Calcula o término baseado no cadastro original: created_at + trial_days
  v_target_trial_end := v_company_created + (v_trial_days || ' days')::interval;
  v_current_trial_end := v_company.trial_ends_at;

  -- PRESERVA TÉRMINO EXISTENTE MAIS LONGO: nunca encurta o prazo concedido
  IF v_current_trial_end IS NOT NULL AND v_current_trial_end > v_target_trial_end THEN
    v_final_trial_end := v_current_trial_end;
  ELSE
    v_final_trial_end := v_target_trial_end;
  END IF;

  -- 4. Atualiza a empresa com a nova data de teste e status ativo
  UPDATE public.companies
  SET 
    trial_ends_at = v_final_trial_end,
    billing_status = 'trial',
    is_active = true,
    updated_at = v_now
  WHERE id = p_company_id;

  -- 5. Atualiza a assinatura vinculada se em status trialing/pending
  UPDATE public.subscriptions
  SET
    status = 'trialing',
    current_period_end = v_final_trial_end,
    updated_at = v_now
  WHERE company_id = p_company_id AND status IN ('trialing', 'pending', 'past_due');

  -- 6. Registra o resgate na tabela coupon_redemptions
  INSERT INTO public.coupon_redemptions (
    coupon_id,
    company_id,
    user_id,
    redeemed_at,
    metadata
  ) VALUES (
    v_coupon.id,
    p_company_id,
    auth.uid(),
    v_now,
    jsonb_build_object(
      'action', 'trial_extension',
      'campaign_code', v_coupon.code,
      'trial_days', v_trial_days,
      'previous_trial_end', v_current_trial_end,
      'new_trial_end', v_final_trial_end
    )
  );

  -- 7. Incrementa o contador de resgates de forma segura
  UPDATE public.coupons
  SET 
    redemption_count = redemption_count + 1,
    updated_at = v_now
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Campanha %s ativada com sucesso! Seu período de teste gratuito foi estendido até %s.', v_coupon.code, to_char(v_final_trial_end, 'DD/MM/YYYY')),
    'trial_ends_at', v_final_trial_end,
    'total_days', v_trial_days
  );
END;
$$;

-- Permissões de execução dos RPCs
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(TEXT, UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.redeem_trial_extension_coupon(TEXT, UUID) TO authenticated;

COMMIT;
