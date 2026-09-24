-- Migration: Admin Coupons, Campaigns and Billing Hardening (Hardened Revision)
-- Creates/updates public.coupons and public.coupon_redemptions
-- Preserves existing schema compatibility, strict RBAC authorization, and state consistency.

-- 1. Schema compatibility & table updates for public.coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'percent',
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_percent NUMERIC(10, 2) DEFAULT 0,
    discount_fixed NUMERIC(10, 2) DEFAULT 0,
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_duration TEXT DEFAULT 'once',
    duration_in_months INTEGER DEFAULT NULL,
    trial_days INTEGER NOT NULL DEFAULT 0,
    stripe_coupon_id TEXT,
    stripe_promotion_code_id TEXT,
    applicable_plans TEXT[] DEFAULT '{}',
    applies_to_plans TEXT[] DEFAULT '{}',
    applicable_billing_cycles TEXT[] DEFAULT '{}',
    applies_to_billing_cycles TEXT[] DEFAULT '{}',
    max_redemptions INTEGER DEFAULT 100,
    redemption_count INTEGER NOT NULL DEFAULT 0,
    times_redeemed INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure all columns exist if table was previously created with older schema
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percentage';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_fixed NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_duration TEXT DEFAULT 'once';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS duration_in_months INTEGER DEFAULT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_plans TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to_plans TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_billing_cycles TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to_billing_cycles TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_redemptions INTEGER DEFAULT 100;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS redemption_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS times_redeemed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Schema compatibility & table updates for public.coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    stripe_session_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('reserved', 'applied', 'cancelled', 'expired')) DEFAULT 'applied',
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied';
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Ensure companies and subscriptions have stripe helper columns if not present
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_company ON public.coupon_redemptions(company_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_session ON public.coupon_redemptions(stripe_session_id);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Global admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can view redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Users can view own company redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Service can manage redemptions" ON public.coupon_redemptions;

-- RLS: Platform Global Administrators ONLY can manage coupons catalog
-- Office/Company admins (role 'company_admin', 'admin', 'owner', 'finance') do NOT manage the global coupon catalog
CREATE POLICY "Global admins can manage coupons"
    ON public.coupons
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
        )
    );

-- RLS: Users can view their own company redemptions
CREATE POLICY "Users can view own company redemptions"
    ON public.coupon_redemptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.company_id = coupon_redemptions.company_id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
        )
    );

-- -------------------------------------------------------------
-- Helper: Check if user has permission to manage billing for a company
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_company_billing(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT (
        p_user_id IS NOT NULL AND p_company_id IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = p_user_id
                AND p.company_id = p_company_id
                AND p.role IN ('company_admin', 'admin', 'owner', 'finance')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = p_user_id
                AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
            )
        )
    );
$$;

-- Drop all old overloads of RPCs to ensure clean signature and permission slate
DROP FUNCTION IF EXISTS public.validate_coupon_code(TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_coupon_code(TEXT, UUID);
DROP FUNCTION IF EXISTS public.validate_coupon_code(TEXT);
DROP FUNCTION IF EXISTS public.redeem_trial_extension_coupon(TEXT, UUID);
DROP FUNCTION IF EXISTS public.redeem_trial_extension_coupon(TEXT);
DROP FUNCTION IF EXISTS public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reserve_discount_coupon(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.confirm_discount_coupon_redemption(TEXT, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS public.confirm_discount_coupon_redemption(TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.confirm_discount_coupon_redemption(TEXT, UUID);
DROP FUNCTION IF EXISTS public.release_discount_coupon_reservation(TEXT);

-- -------------------------------------------------------------
-- 1. validate_coupon_code: Authenticated client endpoint
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon_code(
    p_code TEXT,
    p_company_id UUID,
    p_plan_slug TEXT DEFAULT NULL,
    p_billing_cycle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_coupon public.coupons%ROWTYPE;
    v_active_reservations INTEGER;
    v_effective_redemptions INTEGER;
    v_already_redeemed BOOLEAN;
    v_discount_type TEXT;
    v_discount_val NUMERIC;
    v_applicable_plans TEXT[];
    v_applicable_cycles TEXT[];
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'authentication_required', 'message', 'Autenticação necessária');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'company_id_required', 'message', 'Empresa não identificada');
    END IF;

    IF NOT public.can_manage_company_billing(v_caller_id, p_company_id) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'unauthorized', 'message', 'Você não tem permissão para gerenciar faturamento nesta empresa');
    END IF;

    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(TRIM(p_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Cupom não encontrado', 'message', 'Cupom não encontrado');
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom foi desativado', 'message', 'Este cupom foi desativado');
    END IF;

    IF v_coupon.valid_from > now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom ainda não é válido', 'message', 'Este cupom ainda não é válido');
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este cupom expirou', 'message', 'Este cupom expirou');
    END IF;

    -- Normalize plan & billing cycle filters
    v_applicable_plans := COALESCE(v_coupon.applicable_plans, v_coupon.applies_to_plans, '{}');
    IF p_plan_slug IS NOT NULL AND array_length(v_applicable_plans, 1) > 0 THEN
        IF NOT (p_plan_slug = ANY(v_applicable_plans)) THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para o plano selecionado', 'message', 'Este cupom não é válido para o plano selecionado');
        END IF;
    END IF;

    v_applicable_cycles := COALESCE(v_coupon.applicable_billing_cycles, v_coupon.applies_to_billing_cycles, '{}');
    IF p_billing_cycle IS NOT NULL AND array_length(v_applicable_cycles, 1) > 0 THEN
        IF NOT (p_billing_cycle = ANY(v_applicable_cycles)) THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Este cupom não é válido para este ciclo de pagamento', 'message', 'Este cupom não é válido para este ciclo de pagamento');
        END IF;
    END IF;

    SELECT COUNT(*) INTO v_active_reservations
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND status = 'reserved'
      AND expires_at > now();

    v_effective_redemptions := GREATEST(v_coupon.times_redeemed, v_coupon.redemption_count) + v_active_reservations;

    IF v_coupon.max_redemptions IS NOT NULL AND v_effective_redemptions >= v_coupon.max_redemptions THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Limite de utilizações deste cupom atingido', 'message', 'Limite de utilizações deste cupom atingido');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND company_id = p_company_id
          AND status IN ('applied', 'reserved')
          AND (status != 'reserved' OR expires_at > now())
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Sua empresa já utilizou este cupom', 'message', 'Sua empresa já utilizou este cupom');
    END IF;

    v_discount_type := COALESCE(v_coupon.type, v_coupon.discount_type, 'percent');
    v_discount_val := COALESCE(v_coupon.discount_percent, v_coupon.discount_fixed, v_coupon.discount_value, 0);

    RETURN jsonb_build_object(
        'valid', true,
        'id', v_coupon.id,
        'code', v_coupon.code,
        'name', v_coupon.name,
        'description', v_coupon.description,
        'type', v_discount_type,
        'trial_days', v_coupon.trial_days,
        'discount_percent', COALESCE(v_coupon.discount_percent, v_coupon.discount_value),
        'discount_fixed', v_coupon.discount_fixed,
        'discount_duration', v_coupon.discount_duration,
        'stripe_coupon_id', v_coupon.stripe_coupon_id,
        'stripe_promotion_code_id', v_coupon.stripe_promotion_code_id
    );
END;
$$;

-- -------------------------------------------------------------
-- 2. redeem_trial_extension_coupon: Authenticated client endpoint
--    Totalizes 60 days from original trial start (company.created_at)
--    Preserves legitimately granted greater dates, serializes per company
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_trial_extension_coupon(
    p_code TEXT,
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_company public.companies%ROWTYPE;
    v_coupon public.coupons%ROWTYPE;
    v_existing_active_subs INTEGER;
    v_already_used BOOLEAN;
    v_active_reservations INTEGER;
    v_target_total_days INTEGER;
    v_target_trial_end TIMESTAMPTZ;
    v_current_trial_end TIMESTAMPTZ;
    v_new_trial_end TIMESTAMPTZ;
    v_sub_period_end TIMESTAMPTZ;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'authentication_required', 'message', 'Autenticação necessária');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'company_id_required', 'message', 'Empresa não informada');
    END IF;

    IF NOT public.can_manage_company_billing(v_caller_id, p_company_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Você não tem permissão para gerenciar faturamento nesta empresa');
    END IF;

    -- Lock company first (consistent lock order: companies -> coupons -> redemptions)
    SELECT * INTO v_company
    FROM public.companies
    WHERE id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada', 'message', 'Empresa não encontrada');
    END IF;

    -- Check if company already has paid subscriptions, canceled or overdue subscriptions
    SELECT COUNT(*) INTO v_existing_active_subs
    FROM public.subscriptions
    WHERE company_id = p_company_id
      AND status IN ('active', 'canceled', 'past_due');

    IF v_existing_active_subs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Extensões de período de teste são válidas apenas durante o trial inicial e não podem ser aplicadas a contas com assinatura contratada ou em atraso.',
            'message', 'Extensões de teste são válidas apenas durante o trial inicial.'
        );
    END IF;

    -- Lock coupon second
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(TRIM(p_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom não encontrado', 'message', 'Cupom não encontrado');
    END IF;

    IF v_coupon.type != 'trial_extension' AND v_coupon.discount_type != 'trial_extension' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom é de desconto financeiro e deve ser aplicado no checkout.', 'message', 'Este cupom é de desconto e deve ser aplicado no checkout.');
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom foi desativado', 'message', 'Este cupom foi desativado');
    END IF;

    IF v_coupon.valid_from > now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom ainda não é válido', 'message', 'Este cupom ainda não é válido');
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom expirou', 'message', 'Este cupom expirou');
    END IF;

    SELECT COUNT(*) INTO v_active_reservations
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND status = 'reserved'
      AND expires_at > now();

    IF v_coupon.max_redemptions IS NOT NULL AND (GREATEST(v_coupon.times_redeemed, v_coupon.redemption_count) + v_active_reservations) >= v_coupon.max_redemptions THEN
        RETURN jsonb_build_object('success', false, 'error', 'Limite de utilizações deste cupom atingido', 'message', 'Limite de utilizações deste cupom atingido');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND company_id = p_company_id
          AND status = 'applied'
    ) INTO v_already_used;

    IF v_already_used THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sua empresa já resgatou este cupom de teste.', 'message', 'Sua empresa já resgatou este cupom de teste.');
    END IF;

    -- Current active trial end (GREATEST between company.trial_ends_at and subscription.current_period_end)
    SELECT MAX(current_period_end) INTO v_sub_period_end
    FROM public.subscriptions
    WHERE company_id = p_company_id
      AND status = 'trialing';

    IF v_company.trial_ends_at IS NOT NULL AND v_sub_period_end IS NOT NULL THEN
        v_current_trial_end := GREATEST(v_company.trial_ends_at, v_sub_period_end);
    ELSIF v_company.trial_ends_at IS NOT NULL THEN
        v_current_trial_end := v_company.trial_ends_at;
    ELSIF v_sub_period_end IS NOT NULL THEN
        v_current_trial_end := v_sub_period_end;
    ELSE
        v_current_trial_end := v_company.created_at + interval '30 days';
    END IF;

    -- Rule: Trial campaign targets 60 days TOTAL from original start (v_company.created_at)
    v_target_total_days := COALESCE(NULLIF(v_coupon.trial_days, 0), 60);
    v_target_trial_end := v_company.created_at + (v_target_total_days || ' days')::interval;

    -- Do not restart expired trial
    IF v_current_trial_end < now() AND v_target_trial_end < now() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'O período de teste da sua empresa já expirou. Campanhas promocionais são válidas apenas durante o teste inicial.',
            'message', 'Período de teste já encerrado.'
        );
    END IF;

    -- Preserve greater dates already legitimately granted
    v_new_trial_end := GREATEST(v_current_trial_end, v_target_trial_end);

    -- Update company trial date
    UPDATE public.companies
    SET trial_ends_at = v_new_trial_end,
        updated_at = now()
    WHERE id = p_company_id;

    -- Update trialing subscriptions
    UPDATE public.subscriptions
    SET current_period_end = v_new_trial_end,
        trial_ends_at = v_new_trial_end,
        updated_at = now()
    WHERE company_id = p_company_id
      AND status = 'trialing';

    -- Record redemption
    INSERT INTO public.coupon_redemptions (
        coupon_id,
        company_id,
        user_id,
        status,
        metadata
    ) VALUES (
        v_coupon.id,
        p_company_id,
        v_caller_id,
        'applied',
        jsonb_build_object(
            'previous_trial_ends_at', v_current_trial_end,
            'new_trial_ends_at', v_new_trial_end,
            'total_target_days', v_target_total_days,
            'code', v_coupon.code
        )
    );

    UPDATE public.coupons
    SET times_redeemed = times_redeemed + 1,
        redemption_count = redemption_count + 1,
        updated_at = now()
    WHERE id = v_coupon.id;

    RETURN jsonb_build_object(
        'success', true,
        'trial_ends_at', v_new_trial_end,
        'new_trial_ends_at', v_new_trial_end,
        'total_days', v_target_total_days,
        'message', format('Campanha ativada! Período de teste totalizado em %s dias.', v_target_total_days)
    );
END;
$$;

-- -------------------------------------------------------------
-- 3. reserve_discount_coupon: Service Role ONLY (called by stripe-checkout)
--    Locks: company -> coupon -> redemption
--    Strict session binding: never overwrites different company/coupon
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_discount_coupon(
    p_code TEXT,
    p_company_id UUID,
    p_session_id TEXT,
    p_plan_id TEXT DEFAULT NULL,
    p_billing_cycle TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_company public.companies%ROWTYPE;
    v_coupon public.coupons%ROWTYPE;
    v_existing_res public.coupon_redemptions%ROWTYPE;
    v_active_reservations INTEGER;
    v_redemption_id UUID;
    v_expires_at TIMESTAMPTZ := COALESCE(p_expires_at, now() + interval '30 minutes');
    v_applicable_plans TEXT[];
    v_applicable_cycles TEXT[];
BEGIN
    IF p_code IS NULL OR p_company_id IS NULL OR p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_parameters');
    END IF;

    -- 1. Lock company
    SELECT * INTO v_company
    FROM public.companies
    WHERE id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada');
    END IF;

    -- 2. Lock coupon
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(TRIM(p_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom não encontrado');
    END IF;

    IF v_coupon.type = 'trial_extension' OR v_coupon.discount_type = 'trial_extension' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom inválido para checkout de assinatura');
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom foi desativado');
    END IF;

    IF v_coupon.valid_from > now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom ainda não é válido');
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom expirou');
    END IF;

    -- Verify plans & billing cycles
    v_applicable_plans := COALESCE(v_coupon.applicable_plans, v_coupon.applies_to_plans, '{}');
    IF p_plan_id IS NOT NULL AND array_length(v_applicable_plans, 1) > 0 THEN
        IF NOT (p_plan_id = ANY(v_applicable_plans)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este cupom não é válido para o plano selecionado');
        END IF;
    END IF;

    v_applicable_cycles := COALESCE(v_coupon.applicable_billing_cycles, v_coupon.applies_to_billing_cycles, '{}');
    IF p_billing_cycle IS NOT NULL AND array_length(v_applicable_cycles, 1) > 0 THEN
        IF NOT (p_billing_cycle = ANY(v_applicable_cycles)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este cupom não é válido para este ciclo de pagamento');
        END IF;
    END IF;

    -- Check if company already redeemed this coupon permanently
    IF EXISTS (
        SELECT 1 FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND company_id = p_company_id
          AND status = 'applied'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sua empresa já utilizou este cupom de desconto.');
    END IF;

    -- 3. Check existing reservation by session_id
    SELECT * INTO v_existing_res
    FROM public.coupon_redemptions
    WHERE stripe_session_id = p_session_id
    FOR UPDATE;

    IF FOUND THEN
        -- Strictly disallow overwriting different company or coupon
        IF v_existing_res.company_id != p_company_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'session_id_already_bound_to_different_company');
        END IF;
        IF v_existing_res.coupon_id != v_coupon.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'session_id_already_bound_to_different_coupon');
        END IF;

        -- Update expiration and metadata for the existing session reservation
        UPDATE public.coupon_redemptions
        SET status = 'reserved',
            expires_at = v_expires_at,
            metadata = jsonb_build_object('plan_id', p_plan_id, 'billing_cycle', p_billing_cycle)
        WHERE id = v_existing_res.id;

        v_redemption_id := v_existing_res.id;
    ELSE
        -- Check quota / concurrency limit
        SELECT COUNT(*) INTO v_active_reservations
        FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND status = 'reserved'
          AND expires_at > now();

        IF v_coupon.max_redemptions IS NOT NULL AND (GREATEST(v_coupon.times_redeemed, v_coupon.redemption_count) + v_active_reservations) >= v_coupon.max_redemptions THEN
            RETURN jsonb_build_object('success', false, 'error', 'Limite de vagas para este cupom já foi atingido');
        END IF;

        INSERT INTO public.coupon_redemptions (
            coupon_id,
            company_id,
            stripe_session_id,
            status,
            expires_at,
            metadata
        ) VALUES (
            v_coupon.id,
            p_company_id,
            p_session_id,
            'reserved',
            v_expires_at,
            jsonb_build_object('plan_id', p_plan_id, 'billing_cycle', p_billing_cycle)
        )
        RETURNING id INTO v_redemption_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_redemption_id,
        'coupon_id', v_coupon.id,
        'stripe_coupon_id', v_coupon.stripe_coupon_id,
        'stripe_promotion_code_id', v_coupon.stripe_promotion_code_id,
        'expires_at', v_expires_at
    );
END;
$$;

-- -------------------------------------------------------------
-- 4. confirm_discount_coupon_redemption: Service Role ONLY (called by stripe-webhook)
--    Validates exact matching, idempotency, updates counts
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_discount_coupon_redemption(
    p_session_id TEXT,
    p_company_id UUID,
    p_coupon_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_redemption public.coupon_redemptions%ROWTYPE;
    v_coupon public.coupons%ROWTYPE;
BEGIN
    IF p_session_id IS NULL OR p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_parameters');
    END IF;

    SELECT * INTO v_redemption
    FROM public.coupon_redemptions
    WHERE stripe_session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- If redemption record not found by session_id but coupon_id is provided, look up by metadata pre_session_id
        IF p_metadata ? 'pre_session_id' THEN
            SELECT * INTO v_redemption
            FROM public.coupon_redemptions
            WHERE stripe_session_id = p_metadata->>'pre_session_id'
            FOR UPDATE;
        END IF;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'reservation_not_found');
    END IF;

    -- Strict entity matching
    IF v_redemption.company_id != p_company_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'company_mismatch');
    END IF;

    IF p_coupon_id IS NOT NULL AND v_redemption.coupon_id != p_coupon_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'coupon_mismatch');
    END IF;

    -- Idempotent return
    IF v_redemption.status = 'applied' THEN
        RETURN jsonb_build_object('success', true, 'already_confirmed', true, 'redemption_id', v_redemption.id);
    END IF;

    -- Lock coupon row
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE id = v_redemption.coupon_id
    FOR UPDATE;

    UPDATE public.coupon_redemptions
    SET status = 'applied',
        stripe_session_id = p_session_id,
        expires_at = NULL,
        redeemed_at = now(),
        metadata = v_redemption.metadata || p_metadata
    WHERE id = v_redemption.id;

    UPDATE public.coupons
    SET times_redeemed = times_redeemed + 1,
        redemption_count = redemption_count + 1,
        updated_at = now()
    WHERE id = v_coupon.id;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption.id,
        'coupon_id', v_coupon.id,
        'code', v_coupon.code
    );
END;
$$;

-- -------------------------------------------------------------
-- 5. release_discount_coupon_reservation: Service Role ONLY
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_discount_coupon_reservation(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_redemption public.coupon_redemptions%ROWTYPE;
BEGIN
    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_parameters');
    END IF;

    SELECT * INTO v_redemption
    FROM public.coupon_redemptions
    WHERE stripe_session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'no_reservation');
    END IF;

    IF v_redemption.status = 'applied' THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_applied');
    END IF;

    UPDATE public.coupon_redemptions
    SET status = 'cancelled',
        metadata = metadata || jsonb_build_object('cancelled_at', now())
    WHERE id = v_redemption.id;

    RETURN jsonb_build_object('success', true, 'message', 'reservation_released');
END;
$$;

-- -------------------------------------------------------------
-- PERMISSIONS (Strict Least-Privilege RBAC)
-- -------------------------------------------------------------

-- 1. Revoke all execution rights on internal operations from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_discount_coupon_redemption(TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_discount_coupon_reservation(TEXT) FROM PUBLIC, anon, authenticated;

-- 2. Grant internal operations exclusively to service_role (Edge Functions / Backend)
GRANT EXECUTE ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_discount_coupon_redemption(TEXT, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_discount_coupon_reservation(TEXT) TO service_role;

-- 3. Grant client-facing operations to authenticated users only (revoked from anon and PUBLIC)
REVOKE EXECUTE ON FUNCTION public.validate_coupon_code(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(TEXT, UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_trial_extension_coupon(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_trial_extension_coupon(TEXT, UUID) TO authenticated;
