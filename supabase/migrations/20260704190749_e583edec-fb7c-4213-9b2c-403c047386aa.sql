
CREATE OR REPLACE FUNCTION public.normalize_tax_id(p_tax_id text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_tax_id,''), '\D', '', 'g'), '');
$$;

-- Merge de customers duplicados (desabilitando triggers legadas quebradas)
ALTER TABLE public.documents DISABLE TRIGGER trigger_create_document_version;
ALTER TABLE public.documents DISABLE TRIGGER audit_documents_enterprise_trigger;

DO $$
DECLARE
  v_group RECORD; v_keep uuid; v_dup uuid;
BEGIN
  FOR v_group IN
    SELECT company_id, public.normalize_tax_id(cpf_cnpj) AS norm,
           array_agg(id ORDER BY
             (CASE WHEN email IS NOT NULL AND email<>'' THEN 0 ELSE 1 END),
             (CASE WHEN phone IS NOT NULL AND phone<>'' THEN 0 ELSE 1 END),
             created_at ASC
           ) AS ids
      FROM public.customers
     WHERE public.normalize_tax_id(cpf_cnpj) IS NOT NULL
       AND cpf_cnpj NOT LIKE '%__merged_%'
     GROUP BY 1,2 HAVING count(*) > 1
  LOOP
    v_keep := v_group.ids[1];
    FOREACH v_dup IN ARRAY v_group.ids[2:] LOOP
      RAISE NOTICE 'MERGE keep=% dup=% norm=%', v_keep, v_dup, v_group.norm;
      UPDATE public.vessels                SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.processes              SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.processes              SET secondary_customer_id = v_keep WHERE secondary_customer_id = v_dup;
      UPDATE public.documents              SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.generated_documents    SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.uploaded_files         SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.signature_requests     SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.signature_participants SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.customer_signatures    SET customer_id = v_keep WHERE customer_id = v_dup;
      UPDATE public.client_portal_access   SET customer_id = v_keep WHERE customer_id = v_dup;
      BEGIN
        UPDATE public.process_participants SET customer_id = v_keep WHERE customer_id = v_dup;
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM public.process_participants WHERE customer_id = v_dup;
      END;
      UPDATE public.customers
         SET cpf_cnpj = cpf_cnpj || '__merged_' || substring(v_dup::text,1,8),
             name    = name || ' (mesclado)',
             updated_at = now()
       WHERE id = v_dup;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.documents ENABLE TRIGGER trigger_create_document_version;
ALTER TABLE public.documents ENABLE TRIGGER audit_documents_enterprise_trigger;

-- Unique constraint (protege futuras inserções)
CREATE UNIQUE INDEX IF NOT EXISTS customers_company_taxid_uniq
  ON public.customers (company_id, public.normalize_tax_id(cpf_cnpj))
  WHERE public.normalize_tax_id(cpf_cnpj) IS NOT NULL
    AND cpf_cnpj NOT LIKE '%__merged_%';

-- Trigger de imutabilidade pós-finalização
CREATE OR REPLACE FUNCTION public.assert_process_not_finalized()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pid uuid; v_status text; v_finalized timestamptz; v_role text;
BEGIN
  v_pid := COALESCE(NEW.process_id, OLD.process_id);
  IF v_pid IS NULL THEN RETURN NEW; END IF;
  SELECT status, finalized_at INTO v_status, v_finalized FROM public.processes WHERE id = v_pid;
  IF v_finalized IS NULL AND v_status NOT IN ('completed','finalized','archived') THEN
    RETURN NEW;
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('admin_master','admin_master_global') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'process_finalized_immutable: cannot % on % for finalized process %',
    TG_OP, TG_TABLE_NAME, v_pid USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS trg_immutable_generated_documents ON public.generated_documents;
CREATE TRIGGER trg_immutable_generated_documents
  BEFORE INSERT ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.assert_process_not_finalized();

DROP TRIGGER IF EXISTS trg_immutable_process_dossiers ON public.process_dossiers;
CREATE TRIGGER trg_immutable_process_dossiers
  BEFORE INSERT ON public.process_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.assert_process_not_finalized();

DROP TRIGGER IF EXISTS trg_immutable_signature_requests ON public.signature_requests;
CREATE TRIGGER trg_immutable_signature_requests
  BEFORE INSERT ON public.signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.assert_process_not_finalized();
