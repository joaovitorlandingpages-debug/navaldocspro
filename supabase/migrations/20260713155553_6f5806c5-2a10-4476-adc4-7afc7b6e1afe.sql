-- Fix: partial unique index cannot be used by ON CONFLICT inference from supabase-js.
-- Postgres treats NULLs as distinct in a regular unique index, so removing the WHERE
-- clause keeps the same real-world semantics (rows without an idempotency_key don't collide).

DROP INDEX IF EXISTS public.generated_documents_idempotency_uniq;
CREATE UNIQUE INDEX generated_documents_idempotency_uniq
  ON public.generated_documents (company_id, idempotency_key);

DROP INDEX IF EXISTS public.signature_certificates_idempotency_uniq;
CREATE UNIQUE INDEX signature_certificates_idempotency_uniq
  ON public.signature_evidence_certificates (company_id, idempotency_key);
