-- Migration for Sprint 5.0.1: Persistent Human Confirmation

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.ai_action_confirmations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash text UNIQUE NOT NULL,
    execution_id uuid,
    action_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL,
    process_id uuid,
    resource_id uuid,
    operation text NOT NULL,
    payload_hash text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'consumed', 'cancelled')),
    expires_at timestamptz NOT NULL,
    confirmed_at timestamptz,
    rejected_at timestamptz,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'
);

-- 2. Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_action_confirmations TO authenticated;
GRANT ALL ON public.ai_action_confirmations TO service_role;

-- 3. Enable RLS
ALTER TABLE public.ai_action_confirmations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can only see/manage their own confirmations within their company
CREATE POLICY "Users can manage their own confirmations"
ON public.ai_action_confirmations
FOR ALL
TO authenticated
USING (
    auth.uid() = user_id
);

-- 5. Add Indices
CREATE INDEX idx_ai_confirmations_token_hash ON public.ai_action_confirmations(token_hash);
CREATE INDEX idx_ai_confirmations_company_id ON public.ai_action_confirmations(company_id);
CREATE INDEX idx_ai_confirmations_user_id ON public.ai_action_confirmations(user_id);
CREATE INDEX idx_ai_confirmations_action_id ON public.ai_action_confirmations(action_id);
CREATE INDEX idx_ai_confirmations_process_id ON public.ai_action_confirmations(process_id);
CREATE INDEX idx_ai_confirmations_status ON public.ai_action_confirmations(status);
CREATE INDEX idx_ai_confirmations_expires_at ON public.ai_action_confirmations(expires_at);
CREATE INDEX idx_ai_confirmations_created_at ON public.ai_action_confirmations(created_at);

-- 6. Helper Function for Atomic Consumption
CREATE OR REPLACE FUNCTION public.consume_ai_action_confirmation(
    p_token_hash text,
    p_payload_hash text,
    p_user_id uuid,
    p_company_id uuid
)
RETURNS TABLE (
    ok boolean,
    error_code text,
    confirmation_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_status text;
    v_expires_at timestamptz;
    v_user_id uuid;
    v_company_id uuid;
    v_payload_hash text;
BEGIN
    -- Select with lock
    SELECT id, status, expires_at, user_id, company_id, payload_hash
    INTO v_id, v_status, v_expires_at, v_user_id, v_company_id, v_payload_hash
    FROM public.ai_action_confirmations
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF v_id IS NULL THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_NOT_FOUND', NULL::uuid;
        RETURN;
    END IF;

    IF v_user_id <> p_user_id THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_USER_MISMATCH', v_id;
        RETURN;
    END IF;

    IF v_company_id <> p_company_id THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_TENANT_MISMATCH', v_id;
        RETURN;
    END IF;

    IF v_payload_hash <> p_payload_hash THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_PAYLOAD_MISMATCH', v_id;
        RETURN;
    END IF;

    IF v_status = 'consumed' THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_ALREADY_CONSUMED', v_id;
        RETURN;
    END IF;

    IF v_status = 'rejected' THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_REJECTED', v_id;
        RETURN;
    END IF;

    IF v_status = 'expired' OR v_expires_at < now() THEN
        UPDATE public.ai_action_confirmations SET status = 'expired' WHERE id = v_id;
        RETURN QUERY SELECT false, 'CONFIRMATION_EXPIRED', v_id;
        RETURN;
    END IF;

    IF v_status <> 'confirmed' THEN
        RETURN QUERY SELECT false, 'CONFIRMATION_NOT_READY', v_id;
        RETURN;
    END IF;

    -- Everything OK, consume
    UPDATE public.ai_action_confirmations
    SET 
        status = 'consumed',
        consumed_at = now()
    WHERE id = v_id;

    RETURN QUERY SELECT true, NULL::text, v_id;
END;
$$;
