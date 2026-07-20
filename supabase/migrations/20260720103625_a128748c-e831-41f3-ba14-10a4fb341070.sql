-- P0: CORREÇÃO DE GRANTs (PERMISSÕES DE API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vessels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_evolution_logs TO authenticated;
GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.telemetry_logs TO authenticated;
GRANT SELECT ON public.system_roadmap TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_document_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_dossiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- P1: PERSISTÊNCIA REAL DO ACTION ENGINE
CREATE TABLE IF NOT EXISTS public.ai_action_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id TEXT NOT NULL UNIQUE,
    action_id TEXT NOT NULL,
    action_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    process_id UUID REFERENCES public.processes(id),
    conversation_id TEXT,
    provider TEXT,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    errors JSONB,
    warnings TEXT[],
    document_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key_hash TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    result JSONB,
    error_code TEXT,
    process_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, idempotency_key_hash)
);

ALTER TABLE public.ai_action_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_idempotency_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ai_action_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_idempotency_records TO authenticated;
GRANT ALL ON public.ai_action_audits TO service_role;
GRANT ALL ON public.ai_idempotency_records TO service_role;

CREATE POLICY "Isolation: ai_action_audits" ON public.ai_action_audits
    FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Isolation: ai_idempotency_records" ON public.ai_idempotency_records
    FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.claim_ai_idempotency_record(
    _idempotency_key_hash TEXT,
    _payload_hash TEXT,
    _execution_id TEXT,
    _action_id TEXT,
    _company_id UUID,
    _user_id UUID
) RETURNS public.ai_idempotency_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _record public.ai_idempotency_records;
BEGIN
    SELECT * INTO _record
    FROM ai_idempotency_records
    WHERE company_id = _company_id AND idempotency_key_hash = _idempotency_key_hash
    FOR UPDATE;

    IF FOUND THEN
        IF _record.payload_hash != _payload_hash THEN
            RAISE EXCEPTION 'payload hash mismatch for idempotency key';
        END IF;

        IF _record.status = 'recoverable_failed' OR _record.status = 'failed' THEN
            UPDATE ai_idempotency_records
            SET status = 'processing',
                execution_id = _execution_id,
                updated_at = now()
            WHERE id = _record.id
            RETURNING * INTO _record;
        END IF;

        RETURN _record;
    ELSE
        INSERT INTO ai_idempotency_records (
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
        ) RETURNING * INTO _record;

        RETURN _record;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ai_idempotency_record TO authenticated;
