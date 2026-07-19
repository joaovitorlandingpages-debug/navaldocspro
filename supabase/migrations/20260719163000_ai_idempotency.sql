-- Create Idempotency Records table
CREATE TABLE public.ai_idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key_hash TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'recoverable_failed')),
    result JSONB,
    error_code TEXT,
    process_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraint: same key hash within same company and user must be unique
    UNIQUE (idempotency_key_hash, company_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_ai_idempotency_key_lookup ON public.ai_idempotency_records (idempotency_key_hash, company_id, user_id);
CREATE INDEX idx_ai_idempotency_company_id ON public.ai_idempotency_records (company_id);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.ai_idempotency_records TO authenticated;
GRANT ALL ON public.ai_idempotency_records TO service_role;

-- RLS
ALTER TABLE public.ai_idempotency_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own company idempotency records"
ON public.ai_idempotency_records
FOR ALL
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RPC for atomic claim
CREATE OR REPLACE FUNCTION public.claim_ai_idempotency_record(
    _idempotency_key_hash TEXT,
    _payload_hash TEXT,
    _execution_id TEXT,
    _action_id TEXT,
    _company_id UUID,
    _user_id UUID
)
RETURNS public.ai_idempotency_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _record public.ai_idempotency_records;
BEGIN
    -- 1. Try to find existing record
    SELECT * INTO _record
    FROM public.ai_idempotency_records
    WHERE idempotency_key_hash = _idempotency_key_hash
      AND company_id = _company_id
      AND user_id = _user_id;

    IF FOUND THEN
        -- 2. Verify payload hash mismatch
        IF _record.payload_hash != _payload_hash THEN
            RAISE EXCEPTION 'payload hash mismatch';
        END IF;

        -- 3. If it's already completed, just return it
        IF _record.status = 'completed' THEN
            RETURN _record;
        END IF;

        -- 4. If it's processing by another execution, caller will decide (lock behavior)
        -- In this case we just return the existing record and caller checks execution_id
        
        -- 5. If it's failed or recoverable_failed, we "re-claim" it for this new execution
        IF _record.status IN ('failed', 'recoverable_failed') THEN
            UPDATE public.ai_idempotency_records
            SET status = 'processing',
                execution_id = _execution_id,
                updated_at = now()
            WHERE id = _record.id
            RETURNING * INTO _record;
            RETURN _record;
        END IF;

        RETURN _record;
    ELSE
        -- 6. Not found, create new record
        INSERT INTO public.ai_idempotency_records (
            idempotency_key_hash,
            payload_hash,
            execution_id,
            action_id,
            company_id,
            user_id,
            status
        )
        VALUES (
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
