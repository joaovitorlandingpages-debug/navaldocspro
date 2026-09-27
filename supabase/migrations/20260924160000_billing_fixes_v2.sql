-- ============================================================
-- Migration: Billing Corrections v2 (NavalDocs Pro)
-- ============================================================
-- Correcoes pontuais sobre a migration anterior, sem reescrever
-- o catalogo de planos nem os segredos existentes.
--
-- 1. Corrige array_length(...,1)=0 -> cardinality(...)=0 nas atualizacoes
--    de dados legados (array_length retorna NULL para arrays vazios).
-- 2. Reforca reserve_discount_coupon: reutiliza sessao existente valida
--    em vez de cancela-la imediatamente ao receber nova solicitacao.
-- 3. Adiciona indice unico parcial em payment_logs para garantir
--    idempotencia no banco (protecao contra race conditions sem o
--    "select + insert" sem lock).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Correcao da migracao de arrays vazios legados
--    Substitui array_length(...,1)=0 por cardinality(...)=0
--    (array_length retorna NULL para '{}', cardinality retorna 0)
-- ------------------------------------------------------------

UPDATE public.coupons
SET applicable_plans = applies_to_plans
WHERE (applicable_plans IS NULL OR cardinality(applicable_plans) = 0)
  AND applies_to_plans IS NOT NULL
  AND cardinality(applies_to_plans) > 0;

UPDATE public.coupons
SET applicable_billing_cycles = applies_to_billing_cycles
WHERE (applicable_billing_cycles IS NULL OR cardinality(applicable_billing_cycles) = 0)
  AND applies_to_billing_cycles IS NOT NULL
  AND cardinality(applies_to_billing_cycles) > 0;

-- ------------------------------------------------------------
-- 2. Idempotencia no banco: indice unico em payment_logs
--    Garante que o mesmo stripe event_id nao seja inserido duas
--    vezes, mesmo sob concorrencia (race condition no SELECT+INSERT).
-- ------------------------------------------------------------

ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS worker_id TEXT;
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Popula stripe_event_id a partir do payload para registros legados que nao possuem
UPDATE public.payment_logs
SET stripe_event_id = payload->>'eventId'
WHERE stripe_event_id IS NULL
  AND payload ? 'eventId'
  AND payload->>'eventId' IS NOT NULL;

-- DEDUPLICACAO PRESERVANDO O HISTORICO:
-- Antes de criar o indice unico, verifica se existem duplicidades historicas
-- de (stripe_event_id, event_type). Para preservar integralmente o historico
-- sem deletar nenhuma linha, mantemos o registro principal mais relevante
-- (priorizando status 'success' > 'error' > 'processing', mais recente) e
-- renomeamos o stripe_event_id dos registros secundarios com sufixo identificador.
WITH ranked_logs AS (
  SELECT id,
         stripe_event_id,
         ROW_NUMBER() OVER (
           PARTITION BY stripe_event_id, event_type
           ORDER BY
             CASE WHEN status = 'success' THEN 1
                  WHEN status = 'error' THEN 2
                  WHEN status = 'processing' THEN 3
                  ELSE 4 END,
             created_at DESC,
             id DESC
         ) as rn
  FROM public.payment_logs
  WHERE stripe_event_id IS NOT NULL
)
UPDATE public.payment_logs p
SET stripe_event_id = p.stripe_event_id || '_history_' || p.id::text,
    metadata = jsonb_set(COALESCE(p.metadata, '{}'::jsonb), '{deduplicated_historical}', 'true'::jsonb)
FROM ranked_logs r
WHERE p.id = r.id AND r.rn > 1;

-- Indice unico abrangendo TODOS os status (incluindo 'processing').
-- O WHERE garante que apenas linhas com stripe_event_id preenchido participam.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_logs_stripe_event_unique
  ON public.payment_logs (stripe_event_id, event_type)
  WHERE stripe_event_id IS NOT NULL;

-- GERENCIAMENTO SEGURO DE CONSTRAINTS DE STATUS:
-- Um novo CHECK nao remove automaticamente CHECKs antigos incompatíveis.
-- Consultamos o catalogo do Postgres para remover constraints CHECK existentes
-- sobre a coluna 'status' de public.payment_logs antes de aplicar a lista completa.
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.payment_logs'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status'
  ) LOOP
    EXECUTE format('ALTER TABLE public.payment_logs DROP CONSTRAINT IF EXISTS %I', v_rec.conname);
  END LOOP;

  -- Adiciona a constraint unificada com todos os status necessarios
  ALTER TABLE public.payment_logs
    ADD CONSTRAINT chk_payment_logs_status
    CHECK (status IN ('success', 'error', 'processing', 'skipped_external', 'pending', 'rejected', 'approved', 'paid', 'refunded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;


-- ------------------------------------------------------------
-- 3. Reescrita de reserve_discount_coupon:
--    Comportamento corrigido:
--    a) Se ja ha reserva ATIVA (expires_at > now()) do mesmo cupom
--       para esta empresa, retorna a reserva existente (reutilizacao).
--    b) Se ha reserva ativa de cupom DIFERENTE, retorna erro 409
--       (empresa ja tem outra reserva ativa -- nao cancela silenciosamente).
--    c) So cria nova reserva quando nao ha reserva ativa.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ);

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
    v_existing_same_session public.coupon_redemptions%ROWTYPE;
    v_existing_active_res public.coupon_redemptions%ROWTYPE;
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
        RETURN jsonb_build_object('success', false, 'error', 'Empresa nao encontrada');
    END IF;

    -- 2. Lock coupon
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(TRIM(p_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom nao encontrado');
    END IF;

    IF v_coupon.type = 'trial_extension' OR v_coupon.discount_type = 'trial_extension' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cupom invalido para checkout de assinatura');
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom foi desativado');
    END IF;

    IF v_coupon.valid_from > now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom ainda nao e valido');
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este cupom expirou');
    END IF;

    v_applicable_plans := COALESCE(v_coupon.applicable_plans, v_coupon.applies_to_plans, '{}');
    IF p_plan_id IS NOT NULL AND cardinality(v_applicable_plans) > 0 THEN
        IF NOT (p_plan_id = ANY(v_applicable_plans)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este cupom nao e valido para o plano selecionado');
        END IF;
    END IF;

    v_applicable_cycles := COALESCE(v_coupon.applicable_billing_cycles, v_coupon.applies_to_billing_cycles, '{}');
    IF p_billing_cycle IS NOT NULL AND cardinality(v_applicable_cycles) > 0 THEN
        IF NOT (p_billing_cycle = ANY(v_applicable_cycles)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este cupom nao e valido para este ciclo de pagamento');
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND company_id = p_company_id
          AND status = 'applied'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sua empresa ja utilizou este cupom de desconto.');
    END IF;

    -- 3. Verifica se ja existe reserva para este session_id
    SELECT * INTO v_existing_same_session
    FROM public.coupon_redemptions
    WHERE stripe_session_id = p_session_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing_same_session.company_id != p_company_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'session_id_already_bound_to_different_company');
        END IF;
        IF v_existing_same_session.coupon_id != v_coupon.id THEN
            RETURN jsonb_build_object('success', false, 'error', 'session_id_already_bound_to_different_coupon');
        END IF;
        -- Mesma sessao, mesmo cupom: atualiza expiracao e retorna
        UPDATE public.coupon_redemptions
        SET status = 'reserved',
            expires_at = v_expires_at,
            metadata = jsonb_build_object('plan_id', p_plan_id, 'billing_cycle', p_billing_cycle)
        WHERE id = v_existing_same_session.id;

        RETURN jsonb_build_object(
            'success', true,
            'reservation_id', v_existing_same_session.id,
            'coupon_id', v_coupon.id,
            'stripe_coupon_id', v_coupon.stripe_coupon_id,
            'stripe_promotion_code_id', v_coupon.stripe_promotion_code_id,
            'expires_at', v_expires_at,
            'reused', true
        );
    END IF;

    -- 4. Verifica reservas ativas existentes para esta empresa (session diferente)
    SELECT * INTO v_existing_active_res
    FROM public.coupon_redemptions
    WHERE company_id = p_company_id
      AND status = 'reserved'
      AND expires_at > now()
    FOR UPDATE;

    IF FOUND THEN
        -- Reserva ativa de QUALQUER cupom: bloqueia nova tentativa
        IF v_existing_active_res.coupon_id = v_coupon.id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Ja existe uma reserva ativa deste cupom para sua empresa. Conclua o checkout em andamento ou aguarde expirar (30 min) antes de iniciar outro.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Sua empresa possui uma reserva de cupom ativa em outro checkout. Conclua ou cancele o checkout em andamento antes de aplicar um novo cupom.'
            );
        END IF;
    END IF;

    -- 5. Sem reserva ativa: verifica limite global e cria nova reserva
    SELECT COUNT(*) INTO v_active_reservations
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND status = 'reserved'
      AND expires_at > now();

    IF v_coupon.max_redemptions IS NOT NULL AND
       (GREATEST(v_coupon.times_redeemed, v_coupon.redemption_count) + v_active_reservations) >= v_coupon.max_redemptions THEN
        RETURN jsonb_build_object('success', false, 'error', 'Limite de vagas para este cupom ja foi atingido');
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

-- Restaura permissoes
REVOKE EXECUTE ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_discount_coupon(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
