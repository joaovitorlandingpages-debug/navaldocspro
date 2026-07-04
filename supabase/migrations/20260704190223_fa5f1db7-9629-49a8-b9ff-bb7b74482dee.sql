
-- ========================================
-- ONDA 2A: Idempotência no banco
-- ========================================

-- 1. DEDUP: generated_documents (13 duplicatas do mesmo processo+template)
--    Estratégia: manter o mais recente, marcar antigos como 'superseded'
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY process_id, template_id
    ORDER BY updated_at DESC, created_at DESC
  ) rn
  FROM public.generated_documents
  WHERE process_id IS NOT NULL AND template_id IS NOT NULL
)
UPDATE public.generated_documents gd
SET status = 'superseded', updated_at = now()
FROM ranked r
WHERE gd.id = r.id AND r.rn > 1;

-- 2. DEDUP: signature_requests (4 duplicatas do mesmo document_id)
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY document_id
    ORDER BY created_at DESC
  ) rn
  FROM public.signature_requests
  WHERE document_id IS NOT NULL
)
UPDATE public.signature_requests sr
SET status = 'cancelled_duplicate'
FROM ranked r
WHERE sr.id = r.id AND r.rn > 1;

-- 3. DEDUP: process_dossiers (1 processo com 5 versões — na verdade OK, mas garante unique)
--    Mantém intencional: multiple versions per process.

-- 4. Coluna idempotency_key para RPCs/edge functions poderem deduplicar retries
ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.process_dossiers
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.signature_evidence_certificates
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- ========================================
-- UNIQUE INDEXES (idempotência estrutural)
-- ========================================

-- OCR: um único job ativo por arquivo
CREATE UNIQUE INDEX IF NOT EXISTS ocr_jobs_active_per_file_uniq
  ON public.ocr_jobs (uploaded_file_id)
  WHERE uploaded_file_id IS NOT NULL
    AND status IN ('pending','processing','completed');

-- Documento gerado: um único ativo por (processo, template)
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_active_uniq
  ON public.generated_documents (process_id, template_id)
  WHERE process_id IS NOT NULL
    AND template_id IS NOT NULL
    AND status IN ('draft','generated','approved','signed','completed');

-- Verification code sempre único
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_verification_code_uniq
  ON public.generated_documents (verification_code)
  WHERE verification_code IS NOT NULL;

-- Idempotency key único (permite retry seguro)
CREATE UNIQUE INDEX IF NOT EXISTS generated_documents_idempotency_uniq
  ON public.generated_documents (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS process_dossiers_idempotency_uniq
  ON public.process_dossiers (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS signature_certificates_idempotency_uniq
  ON public.signature_evidence_certificates (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Signature request: uma única ativa por documento
CREATE UNIQUE INDEX IF NOT EXISTS signature_requests_active_per_doc_uniq
  ON public.signature_requests (document_id)
  WHERE document_id IS NOT NULL
    AND status NOT IN ('cancelled','cancelled_duplicate','expired','completed');

-- Dossier: mantém versionamento mas garante (process_id, version) único
CREATE UNIQUE INDEX IF NOT EXISTS process_dossiers_process_version_uniq
  ON public.process_dossiers (process_id, version);

-- Certificado de assinatura: um por signature_request
CREATE UNIQUE INDEX IF NOT EXISTS signature_certs_per_request_uniq
  ON public.signature_evidence_certificates (signature_request_id);

-- ========================================
-- RPC para geração idempotente de documento
-- ========================================
CREATE OR REPLACE FUNCTION public.generated_document_upsert(
  p_process_id uuid,
  p_template_id uuid,
  p_name text,
  p_idempotency_key text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_id uuid;
  v_key text;
BEGIN
  PERFORM public._assert_process_access(p_process_id);
  SELECT company_id INTO v_company FROM public.processes WHERE id = p_process_id;
  v_key := COALESCE(p_idempotency_key,
                    p_process_id::text || ':' || COALESCE(p_template_id::text, 'notmpl') || ':' || p_name);

  -- Tentar idempotência por key
  SELECT id INTO v_id FROM public.generated_documents
    WHERE company_id = v_company AND idempotency_key = v_key LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Tentar por (process_id, template_id) ativo
  IF p_template_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.generated_documents
      WHERE process_id = p_process_id AND template_id = p_template_id
        AND status IN ('draft','generated','approved','signed','completed')
      ORDER BY updated_at DESC LIMIT 1;
    IF v_id IS NOT NULL THEN
      UPDATE public.generated_documents SET idempotency_key = COALESCE(idempotency_key, v_key), updated_at = now()
        WHERE id = v_id;
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO public.generated_documents (
    company_id, process_id, template_id, name, status, idempotency_key, metadata, generated_by
  ) VALUES (
    v_company, p_process_id, p_template_id, p_name, 'draft', v_key, p_metadata, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generated_document_upsert(uuid,uuid,text,text,jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generated_document_upsert(uuid,uuid,text,text,jsonb) FROM anon, public;
