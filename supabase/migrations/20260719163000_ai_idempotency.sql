-- Migration: AI Idempotency persistence for Enterprise AI Actions
-- Sprint 5.2.1

CREATE TYPE public.ai_execution_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'recoverable_failed'
);

CREATE TABLE public.ai_idempotency_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key_hash text NOT NULL,
    payload_hash text NOT NULL,
    execution_id text NOT NULL,
    action_id text NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public.ai_execution_status NOT NULL DEFAULT 'pending',
    result jsonb,
    error_code text,
    process_id uuid, -- Specific for process creation but useful as a first-class link
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure same key cannot be used by different tenant/user
    UNIQUE (idempotency_key_hash, company_id, user_id)
);

-- Indices for performance and unique enforcement
CREATE INDEX idx_ai_idempotency_lookup ON public.ai_idempotency_records (idempotency_key_hash, company_id, user_id);
CREATE INDEX idx_ai_idempotency_execution ON public.ai_idempotency_records (execution_id);

-- RLS
ALTER TABLE public.ai_idempotency_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ai_idempotency_records TO authenticated;
GRANT ALL ON public.ai_idempotency_records TO service_role;

-- Tenant Isolation Policies
CREATE POLICY "Users can only see their company's idempotency records"
    ON public.ai_idempotency_records
    FOR SELECT
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert idempotency records for their company"
    ON public.ai_idempotency_records
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's idempotency records"
    ON public.ai_idempotency_records
    FOR UPDATE
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_ai_idempotency_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ai_idempotency_updated_at
    BEFORE UPDATE ON public.ai_idempotency_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_ai_idempotency_updated_at();

-- RPC for atomic claim or recovery
-- This helps prevent race conditions during execution claim
CREATE OR REPLACE FUNCTION public.claim_ai_idempotency_record(
    _idempotency_key_hash text,
    _payload_hash text,
    _execution_id text,
    _action_id text,
    _company_id uuid,
    _user_id uuid
)
RETURNS public.ai_idempotency_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _record public.ai_idempotency_records;
BEGIN
    -- Try to find existing record
    SELECT * INTO _record
    FROM public.ai_idempotency_records
    WHERE idempotency_key_hash = _idempotency_key_hash
      AND company_id = _company_id
      AND user_id = _user_id;

    IF _record.id IS NOT NULL THEN
        -- Verify payload hasn't changed
        IF _record.payload_hash != _payload_hash THEN
            RAISE EXCEPTION 'Idempotency key collision: payload hash mismatch'
                USING ERRCODE = 'P0001'; -- Custom error code for collision
        END IF;
        
        -- If already processing or completed, return as is
        -- Caller will handle logic based on status
        RETURN _record;
    ELSE
        -- Create new record as processing
        INSERT INTO public.ai_idempotency_records (
            idempotency_key_hash,
            payload_hash,
            execution_id,
            action_id,
            company_id,
            user_id,
            status
        ) VALUES (
            _idempotency_key_hash,
            _payload_hash,
            _execution_id,
            _action_id,
            _company_id,
            _user_id,
            'processing'
        )
        RETURNING * INTO _record;
        
        RETURN _record;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ai_idempotency_record TO authenticated;
