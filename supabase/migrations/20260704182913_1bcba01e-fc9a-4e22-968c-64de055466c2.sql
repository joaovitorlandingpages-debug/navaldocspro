
-- 1) Fechar anon direct-select
DROP POLICY IF EXISTS "anon read signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "anon read by token" ON public.signature_participants;
DROP POLICY IF EXISTS "anon read certificates by code" ON public.signature_evidence_certificates;

CREATE POLICY "anon no select signature_requests" ON public.signature_requests
  FOR SELECT TO anon USING (false);
CREATE POLICY "anon no select signature_participants" ON public.signature_participants
  FOR SELECT TO anon USING (false);
CREATE POLICY "anon no select signature_evidence_certificates" ON public.signature_evidence_certificates
  FOR SELECT TO anon USING (false);

-- 2a) get by token
CREATE OR REPLACE FUNCTION public.signature_get_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_participant record; v_request record;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RETURN NULL; END IF;
  SELECT id, signature_request_id, company_id, name, email, phone, role,
         signing_order, status, token_expires_at, signed_at, customer_id, reuse_authorized
    INTO v_participant FROM public.signature_participants
    WHERE access_token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT id, company_id, title, status, signing_order, expires_at, document_id, created_at
    INTO v_request FROM public.signature_requests
    WHERE id = v_participant.signature_request_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('participant', row_to_json(v_participant), 'request', row_to_json(v_request));
END; $$;
REVOKE ALL ON FUNCTION public.signature_get_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signature_get_by_token(text) TO anon, authenticated;

-- 2b) sequential prev
CREATE OR REPLACE FUNCTION public.signature_get_sequential_prev(p_token text)
RETURNS TABLE(id uuid, name text, status text, signing_order integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req_id uuid; v_order integer;
BEGIN
  SELECT signature_request_id, COALESCE(signing_order, 0) INTO v_req_id, v_order
    FROM public.signature_participants WHERE access_token = p_token LIMIT 1;
  IF v_req_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT sp.id, sp.name, sp.status, sp.signing_order
    FROM public.signature_participants sp
    WHERE sp.signature_request_id = v_req_id
      AND COALESCE(sp.signing_order, 0) < v_order;
END; $$;
REVOKE ALL ON FUNCTION public.signature_get_sequential_prev(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signature_get_sequential_prev(text) TO anon, authenticated;

-- 2c) verify certificate
CREATE OR REPLACE FUNCTION public.certificate_verify(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cert record; v_req record; v_company_name text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 6 THEN RETURN NULL; END IF;
  SELECT id, signature_request_id, company_id, verification_code,
         pdf_url, certificate_url, participants_snapshot, events_snapshot, generated_at
    INTO v_cert FROM public.signature_evidence_certificates
    WHERE verification_code = p_code LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT id, title, status, created_at, company_id
    INTO v_req FROM public.signature_requests WHERE id = v_cert.signature_request_id LIMIT 1;
  SELECT name INTO v_company_name FROM public.companies WHERE id = v_cert.company_id LIMIT 1;
  BEGIN
    INSERT INTO public.signature_events(signature_request_id, company_id, event_type, event_message)
    VALUES (v_cert.signature_request_id, v_cert.company_id, 'verification_page_opened',
            'Página pública aberta para ' || p_code);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN jsonb_build_object('cert', row_to_json(v_cert), 'request', row_to_json(v_req), 'company_name', v_company_name);
END; $$;
REVOKE ALL ON FUNCTION public.certificate_verify(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.certificate_verify(text) TO anon, authenticated;

-- 3) Storage — remover anon write/update em signed-documents
DROP POLICY IF EXISTS "anon write signed-documents" ON storage.objects;
DROP POLICY IF EXISTS "anon update signed-documents" ON storage.objects;

DROP POLICY IF EXISTS "signed_documents_write_company_prefix" ON storage.objects;
CREATE POLICY "signed_documents_write_company_prefix" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1] = (current_user_company_id())::text);

DROP POLICY IF EXISTS "signed_documents_update_company_prefix" ON storage.objects;
CREATE POLICY "signed_documents_update_company_prefix" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1] = (current_user_company_id())::text)
  WITH CHECK (bucket_id = 'signed-documents'
    AND (storage.foldername(name))[1] = (current_user_company_id())::text);

-- 4) Revoke anon EXECUTE em SD funcs internas
REVOKE ALL ON FUNCTION public.pp_set_company_id() FROM anon;
REVOKE ALL ON FUNCTION public.process_get_participants(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.sync_process_participants_from_processes() FROM anon;

-- 5) companies insert: exigir created_by = auth.uid()
DROP POLICY IF EXISTS companies_insert_policy ON public.companies;
CREATE POLICY companies_insert_policy ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
