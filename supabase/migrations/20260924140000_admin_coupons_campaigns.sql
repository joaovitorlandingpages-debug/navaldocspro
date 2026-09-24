-- ====================================================================
-- Migration: Gestão Segura, Concorrente e Autorizada de Cupons e Campanhas
-- ====================================================================
-- 1. Criação das tabelas public.coupons, public.coupon_redemptions e public.coupon_reservations
-- 2. RLS Restrito a Administradores Master
-- 3. Função de permissão public.can_manage_company_billing
-- 4. RPC public.validate_coupon_code com autorização obrigatória e sem acesso anônimo
-- 5. RPC public.redeem_trial_extension_coupon com validação de estados (bloqueia paid/past_due/suspended),
--    bloqueio atômico de concorrência (companies, coupons, subscriptions FOR UPDATE) e cálculo de benefício real
-- 6. Mecanismo de reserva/liberação/confirmação para cupons de desconto concorrentes
-- 7. Revogação explícita de EXECUTE de PUBLIC e anon
-- 8. SEM seeds de teste ou sobrescrita de dados
-- ====================================================================

BEGIN;

-- 1. Tabela Principal de Cupons e Campanhas
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

CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (is_active);

-- 2. Tabela de Resgates Concluídos (Auditoria e Unicidade por Empresa)
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

-- 3. Tabela de Reservas Temporárias de Cupons de Desconto (Anti-Overbooking em Checkouts Concorrentes)
CREATE TABLE IF NOT EXISTS public.coupon_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'cancelled', 'expired')),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '30 minutes'),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS coupon_reservations_lookup_idx ON public.coupon_reservations (coupon_id, status, expires_at);
CREATE INDEX IF NOT EXISTS coupon_reservations_company_idx ON public.coupon_reservations (company_id, coupon_id, status);
CREATE INDEX IF NOT EXISTS coupon_reservations_session_idx ON public.coupon_reservations (session_id);

-- Habilita RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_reservations ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Companies can view their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Companies can view their own reservations" ON public.coupon_reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.coupon_reservations;

-- Políticas de RLS
CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

CREATE POLICY "Companies can view their own redemptions"
ON public.coupon_redemptions FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE POLICY "Admins can manage all redemptions"
ON public.coupon_redemptions FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

CREATE POLICY "Companies can view their own reservations"
ON public.coupon_reservations FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE POLICY "Admins can manage all reservations"
ON public.coupon_reservations FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- ====================================================================
-- Função Auxiliar: Verificação de Permissão Financeira/Administrativa no Escritório
-- ====================================================================
CREATE OR REPLACE FUNCTION public.can_manage_company_billing(
  p_company_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Administradores Master Globais sempre possuem acesso
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin_master', 'admin_master_global', 'superadmin')
  ) THEN
    RETURN true;
  END IF;

  -- Usuário deve pertencer ao escritório e ter perfil com autorização de faturamento
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND company_id = p_company_id
      AND (
        role IN ('admin', 'owner', 'financial', 'gestor', 'manager', 'diretor')
        OR role IS NULL
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO authenticated, service_role;

-- ====================================================================
-- RPC 1: Validação Segura de Cupom com Autenticação e Autorização Obrigatórias
-- ====================================================================
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
  v_uid UUID := auth.uid();
  v_coupon RECORD;
  v_already_redeemed BOOLEAN;
  v_has_active_reservation BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_active_redemptions_count INTEGER;
BEGIN
  -- 1. AUTORIZAÇÃO: Bloqueia acesso não-autenticado ou usuário sem vínculo com a empresa
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Não autorizado: usuário não autenticado.');
  END IF;

  IF p_company_id IS NOT NULL THEN
    IF NOT public.can_manage_company_billing(p_company_id, v_uid) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Não autorizado: usuário não possui permissão de faturamento neste escritório.');
    END IF;
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Código do cupom não informado.');
  END IF;

  -- 2. Busca o cupom
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

  -- 3. Cálculo preciso de resgates concluídos + reservas ativas
  IF v_coupon.max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_redemptions_count
    FROM public.coupon_reservations
    WHERE coupon_id = v_coupon.id
      AND (status = 'completed' OR (status = 'reserved' AND expires_at > v_now));

    IF v_active_redemptions_count >= v_coupon.max_redemptions THEN
      RETURN jsonb_build_object('valid', false, 'message', 'O limite máximo de resgates deste cupom foi atingido.');
    END IF;
  END IF;

  -- 4. Validação de uso prévio por este escritório
  IF p_company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.coupon_redemptions
      WHERE coupon_id = v_coupon.id AND company_id = p_company_id
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom já foi utilizado pelo seu escritório.');
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.coupon_reservations
      WHERE coupon_id = v_coupon.id 
        AND company_id = p_company_id
        AND status = 'completed'
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom já foi utilizado pelo seu escritório.');
    END IF;
  END IF;

  -- 5. Validação de plano e ciclo
  IF p_plan_slug IS NOT NULL AND array_length(v_coupon.applicable_plans, 1) > 0 THEN
    IF NOT (p_plan_slug = ANY(v_coupon.applicable_plans)) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom não é aplicável ao plano selecionado.');
    END IF;
  END IF;

  IF p_billing_cycle IS NOT NULL AND array_length(v_coupon.applicable_billing_cycles, 1) > 0 THEN
    IF NOT (p_billing_cycle = ANY(v_coupon.applicable_billing_cycles)) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Este cupom não é aplicável ao ciclo de faturamento selecionado.');
    END IF;
  END IF;

  -- 6. Retorno sanitizado
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
    'message', 'Cupom validado com sucesso!'
  );
END;
$$;

-- ====================================================================
-- RPC 2: Resgate de Extensão de Teste Gratuito (Sem Cartão) com Validação Estrita de Estado
-- ====================================================================
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
  v_uid UUID := auth.uid();
  v_coupon RECORD;
  v_company RECORD;
  v_subscription RECORD;
  v_already_redeemed BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_company_created TIMESTAMP WITH TIME ZONE;
  v_target_trial_end TIMESTAMP WITH TIME ZONE;
  v_current_trial_end TIMESTAMP WITH TIME ZONE;
  v_final_trial_end TIMESTAMP WITH TIME ZONE;
  v_trial_days INTEGER;
BEGIN
  -- 1. AUTORIZAÇÃO: Usuário autenticado e com permissão financeira no escritório
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado: usuário não autenticado.');
  END IF;

  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Identificação do escritório não fornecida.');
  END IF;

  IF NOT public.can_manage_company_billing(p_company_id, v_uid) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado: você não possui permissão para gerenciar assinaturas deste escritório.');
  END IF;

  -- 2. BLOQUEIO ATÔMICO DE CONCORRÊNCIA NA ORDEM DETERMINÍSTICA:
  -- 2.1. Bloqueia a linha da Empresa
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Escritório não encontrado no sistema.');
  END IF;

  -- 2.2. Bloqueia a linha do Cupom
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código de campanha inválido ou inexistente.');
  END IF;

  -- 2.3. Bloqueia a linha da Assinatura (se existir)
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE company_id = p_company_id
  FOR UPDATE;

  -- 3. VALIDAÇÃO DE ESTADO FINANCEIRO: PRESERVAÇÃO DE ASSINATURAS PAGAS E BLOQUEIOS
  IF v_company.billing_status = 'suspended' OR (v_company.is_active = false AND v_company.billing_status != 'trial' AND v_company.billing_status IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este escritório está suspenso ou bloqueado por razões administrativas/financeiras. Entre em contato com o suporte.');
  END IF;

  IF v_subscription.id IS NOT NULL THEN
    -- Não pode sobrescrever assinatura paga ativa
    IF v_subscription.status = 'active' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Este escritório já possui uma assinatura ativa e paga. Extensões de teste são exclusivas para fases de avaliação.');
    END IF;

    -- Não pode aplicar sobre inadimplência/carência de pagamento
    IF v_subscription.status = 'past_due' THEN
      RETURN jsonb_build_object('success', false, 'message', 'O escritório possui faturas em atraso. Regularize o pagamento antes de efetuar alterações.');
    END IF;

    -- Não pode aplicar sobre assinatura cancelada
    IF v_subscription.status = 'canceled' THEN
      RETURN jsonb_build_object('success', false, 'message', 'A assinatura deste escritório foi cancelada. Contrate um novo plano para reativar o acesso.');
    END IF;
  END IF;

  -- 4. VALIDAÇÃO DO CUPOM
  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha promocional está inativa.');
  END IF;

  IF v_coupon.type != 'trial_extension' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este código é um cupom de desconto financeiro e deve ser inserido na tela de contratação.');
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha promocional ainda não foi iniciada.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha promocional está expirada.');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'message', 'O limite de resgates desta campanha foi atingido.');
  END IF;

  -- 5. VALIDAÇÃO DE DUPLICIDADE POR ESCRITÓRIO
  SELECT EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND company_id = p_company_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Seu escritório já utilizou este cupom de extensão anteriormente.');
  END IF;

  -- 6. CÁLCULO E VALIDAÇÃO DE BENEFÍCIO REAL
  v_company_created := COALESCE(v_company.created_at, v_now);
  v_trial_days := COALESCE(v_coupon.trial_days, 60);

  -- Data alvo = created_at + total trial days
  v_target_trial_end := v_company_created + (v_trial_days || ' days')::interval;

  -- Rejeita se o prazo total concedido já tiver terminado no passado
  IF v_target_trial_end <= v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta campanha concede teste até ' || to_char(v_target_trial_end, 'DD/MM/YYYY') || ', data que já expirou para seu escritório.');
  END IF;

  -- Data de término atual do escritório
  v_current_trial_end := COALESCE(v_subscription.current_period_end, v_company.trial_ends_at);

  -- Rejeita se o escritório já possui um prazo igual ou superior
  IF v_current_trial_end IS NOT NULL AND v_current_trial_end >= v_target_trial_end AND v_current_trial_end > v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Seu escritório já possui um período de teste ativo até ' || to_char(v_current_trial_end, 'DD/MM/YYYY') || ' (igual ou superior ao benefício desta campanha).');
  END IF;

  -- Preserva o maior término
  IF v_current_trial_end IS NOT NULL AND v_current_trial_end > v_target_trial_end THEN
    v_final_trial_end := v_current_trial_end;
  ELSE
    v_final_trial_end := v_target_trial_end;
  END IF;

  -- 7. APLICAÇÃO SEGURA: Não reseta franquias e não altera contadores de uso
  UPDATE public.companies
  SET 
    trial_ends_at = v_final_trial_end,
    billing_status = 'trial',
    is_active = true,
    updated_at = v_now
  WHERE id = p_company_id;

  IF v_subscription.id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET
      status = 'trialing',
      current_period_end = v_final_trial_end,
      updated_at = v_now
    WHERE id = v_subscription.id;
  ELSE
    INSERT INTO public.subscriptions (
      company_id,
      status,
      current_period_start,
      current_period_end,
      metadata,
      updated_at
    ) VALUES (
      p_company_id,
      'trialing',
      v_company_created,
      v_final_trial_end,
      jsonb_build_object('source', 'coupon_trial_extension', 'code', v_coupon.code),
      v_now
    );
  END IF;

  -- 8. REGISTRO DE RESGATE
  INSERT INTO public.coupon_redemptions (
    coupon_id,
    company_id,
    user_id,
    redeemed_at,
    metadata
  ) VALUES (
    v_coupon.id,
    p_company_id,
    v_uid,
    v_now,
    jsonb_build_object(
      'action', 'trial_extension',
      'campaign_code', v_coupon.code,
      'trial_days', v_trial_days,
      'previous_trial_end', v_current_trial_end,
      'new_trial_end', v_final_trial_end
    )
  );

  -- 9. INCREMENTA CONTADOR DE RESGATES
  UPDATE public.coupons
  SET 
    redemption_count = redemption_count + 1,
    updated_at = v_now
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Campanha %s ativada com sucesso! Seu período de teste foi estendido até %s.', v_coupon.code, to_char(v_final_trial_end, 'DD/MM/YYYY')),
    'trial_ends_at', v_final_trial_end,
    'total_days', v_trial_days
  );
END;
$$;

-- ====================================================================
-- RPC 3: Reserva Temporária de Cupom de Desconto (Anti-Overbooking Concorrente)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.reserve_discount_coupon(
  p_code TEXT,
  p_company_id UUID,
  p_session_id TEXT,
  p_plan_slug TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_coupon RECORD;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_active_reservations_count INTEGER;
  v_existing_reservation RECORD;
BEGIN
  -- 1. Autorização
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado: usuário não autenticado.');
  END IF;

  IF p_company_id IS NULL OR NOT public.can_manage_company_billing(p_company_id, v_uid) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado para o escritório informado.');
  END IF;

  IF p_session_id IS NULL OR trim(p_session_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Identificador de sessão de checkout obrigatório.');
  END IF;

  -- 2. Bloqueio atômico do cupom
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cupom não encontrado.');
  END IF;

  IF NOT v_coupon.is_active OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < v_now) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cupom inativo ou expirado.');
  END IF;

  -- 3. Limpeza de reservas expiradas
  UPDATE public.coupon_reservations
  SET status = 'expired'
  WHERE coupon_id = v_coupon.id
    AND status = 'reserved'
    AND expires_at < v_now;

  -- 4. Validação de limite global com reservas ativas
  IF v_coupon.max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_reservations_count
    FROM public.coupon_reservations
    WHERE coupon_id = v_coupon.id
      AND (status = 'completed' OR (status = 'reserved' AND expires_at >= v_now));

    IF v_active_reservations_count >= v_coupon.max_redemptions THEN
      RETURN jsonb_build_object('success', false, 'message', 'Limite máximo de resgates deste cupom atingido.');
    END IF;
  END IF;

  -- 5. Validação de duplicidade por escritório
  IF EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND company_id = p_company_id
  ) OR EXISTS (
    SELECT 1 FROM public.coupon_reservations
    WHERE coupon_id = v_coupon.id AND company_id = p_company_id AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este escritório já utilizou este cupom.');
  END IF;

  -- 6. Criação ou atualização da reserva temporária para esta sessão
  SELECT * INTO v_existing_reservation
  FROM public.coupon_reservations
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.coupon_reservations
    SET 
      coupon_id = v_coupon.id,
      company_id = p_company_id,
      status = 'reserved',
      reserved_at = v_now,
      expires_at = v_now + interval '30 minutes'
    WHERE session_id = p_session_id;
  ELSE
    INSERT INTO public.coupon_reservations (
      coupon_id,
      company_id,
      session_id,
      status,
      reserved_at,
      expires_at,
      metadata
    ) VALUES (
      v_coupon.id,
      p_company_id,
      p_session_id,
      'reserved',
      v_now,
      v_now + interval '30 minutes',
      jsonb_build_object('plan_slug', p_plan_slug, 'billing_cycle', p_billing_cycle)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'stripe_coupon_id', v_coupon.stripe_coupon_id,
    'type', v_coupon.type,
    'discount_percent', v_coupon.discount_percent,
    'discount_fixed', v_coupon.discount_fixed,
    'discount_duration', v_coupon.discount_duration,
    'expires_at', (v_now + interval '30 minutes')
  );
END;
$$;

-- ====================================================================
-- RPC 4: Confirmação Definitiva de Resgate de Cupom (Chamada pelo Webhook)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.confirm_discount_coupon_redemption(
  p_session_id TEXT,
  p_coupon_id UUID,
  p_company_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
  IF p_coupon_id IS NULL OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Parâmetros incompletos.');
  END IF;

  -- 1. Atualiza reserva se existir
  IF p_session_id IS NOT NULL THEN
    UPDATE public.coupon_reservations
    SET 
      status = 'completed',
      expires_at = NULL,
      metadata = metadata || p_metadata
    WHERE session_id = p_session_id;
  END IF;

  -- 2. Insere resgate definitivo idempotente
  INSERT INTO public.coupon_redemptions (
    coupon_id,
    company_id,
    redeemed_at,
    metadata
  ) VALUES (
    p_coupon_id,
    p_company_id,
    v_now,
    p_metadata
  )
  ON CONFLICT (coupon_id, company_id) DO NOTHING;

  -- 3. Atualiza contador atômico no cupom
  UPDATE public.coupons
  SET 
    redemption_count = (
      SELECT COUNT(*) FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id
    ),
    updated_at = v_now
  WHERE id = p_coupon_id;

  RETURN jsonb_build_object('success', true, 'message', 'Resgate confirmado com sucesso.');
END;
$$;

-- ====================================================================
-- RPC 5: Liberação de Reserva (Abandono ou Cancelamento de Checkout)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.release_discount_coupon_reservation(
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  UPDATE public.coupon_reservations
  SET status = 'cancelled'
  WHERE session_id = p_session_id AND status = 'reserved';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ====================================================================
-- REVOGAÇÃO EXPLÍCITA DE ACESSO ANÔNIMO E PÚBLICO
-- ====================================================================
REVOKE ALL ON FUNCTION public.validate_coupon_code(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_trial_extension_coupon(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_discount_coupon_redemption(TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_discount_coupon_reservation(TEXT) FROM PUBLIC, anon;

-- Concessão apenas aos papéis autenticados e backend service_role
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_trial_extension_coupon(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_discount_coupon_redemption(TEXT, UUID, UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_discount_coupon_reservation(TEXT) TO authenticated, service_role;

COMMIT;
