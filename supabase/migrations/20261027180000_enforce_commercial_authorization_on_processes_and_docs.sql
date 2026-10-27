-- ====================================================================
-- MIGRATION: 20261027180000_enforce_commercial_authorization_on_processes_and_docs.sql
-- OBJETIVO: Autorização comercial no backend para criação de processos,
--           persistência de documentos e Storage, eliminando bypasses PERMISSIVE
--           e garantindo isolamento estrito de tenant (inclusive para administradores).
--
-- REGRAS E GARANTIAS RIGOROSAS:
--   1. Transação Atômica: Envolvida em BEGIN ... COMMIT para impedir aplicação parcial.
--   2. Schema validado: NÃO referencia trial_ends_at (coluna inexistente no schema remoto).
--      Utiliza status = 'trialing' AND current_period_end > now() da tabela subscriptions.
--   3. Remoção de políticas PERMISSIVE amplas identificadas no catálogo pg_policies:
--      - public.processes: "Isolation: Processes", "Global Admin Bypass processes",
--                          "Global Admin acessa todos processos".
--      - public.generated_documents: "Users can manage documents from their company",
--                                    "Users can insert company documents",
--                                    "Global Admin Bypass generated_documents".
--      - storage.objects: "Users can manage their company documents",
--                         "Users can upload generated documents" (no bucket generated-documents).
--   4. Isolamento estrito de tenant:
--      - Em processes e generated_documents: UPDATE e DELETE exigem ESTRITAMENTE
--        company_id = public.current_user_company_id(), sem 'OR is_admin_master()'.
--      - No DELETE do Storage generated-documents: exige ESTRITAMENTE a pasta da própria empresa,
--        sem 'OR is_admin_master()'.
--      - No INSERT: Exige empresa própria do usuário E (autorização comercial OU is_admin_master()).
--        A isenção comercial administrativa é restrita dentro da própria empresa do admin.
--      - SELECT: Preserva a leitura administrativa global já existente para auditoria/suporte.
--   5. Detecção de substituição de generated_file_url via TRIGGER BEFORE UPDATE comparando
--      OLD e NEW (sem consultas SELECT ineficientes na própria tabela).
--   6. PREPARADO PARA REVISÃO - NÃO APLICADO EM PRODUÇÃO AINDA.
-- ====================================================================

BEGIN;

-- 1. FUNÇÃO DE AUTORIZAÇÃO COMERCIAL POR EMPRESA
CREATE OR REPLACE FUNCTION public.has_active_subscription_or_trial(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Consulta registro de faturamento oficial da empresa
  SELECT 
    status,
    current_period_end
  INTO v_sub
  FROM public.subscriptions
  WHERE company_id = p_company_id;

  IF FOUND THEN
    -- Status 'active' autoriza operação comercial
    IF v_sub.status = 'active' THEN
      RETURN TRUE;
    END IF;

    -- Status 'trialing' autoriza se current_period_end estiver no futuro
    IF v_sub.status = 'trialing' THEN
      IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > now() THEN
        RETURN TRUE;
      END IF;
      RETURN FALSE;
    END IF;

    -- Status 'pending', 'past_due', 'canceled' não concedem acesso
    RETURN FALSE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription_or_trial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription_or_trial(UUID) TO authenticated, service_role;

-- 2. HARDENING NA TABELA PROCESSES
-- Remove políticas amplas sobrepostas identificadas no banco remoto
DROP POLICY IF EXISTS "processes_tenant_select" ON public.processes;
DROP POLICY IF EXISTS "processes_tenant_insert" ON public.processes;
DROP POLICY IF EXISTS "processes_tenant_update" ON public.processes;
DROP POLICY IF EXISTS "processes_tenant_delete" ON public.processes;
DROP POLICY IF EXISTS "Isolation: Processes" ON public.processes;
DROP POLICY IF EXISTS "Global Admin Bypass processes" ON public.processes;
DROP POLICY IF EXISTS "Global Admin acessa todos processos" ON public.processes;

-- SELECT: Permite consulta da própria empresa ou visualização por admin global (auditoria/suporte)
CREATE POLICY "processes_tenant_select" ON public.processes
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

-- INSERT: Restrito à empresa do próprio usuário E (autorização comercial ativa OU isenção admin dentro da empresa)
CREATE POLICY "processes_tenant_insert" ON public.processes
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_user_company_id() 
    AND (
      public.has_active_subscription_or_trial(company_id)
      OR public.is_admin_master()
    )
  );

-- UPDATE: Isolamento estrito de tenant (SEM 'OR is_admin_master()')
CREATE POLICY "processes_tenant_update" ON public.processes
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- DELETE: Isolamento estrito de tenant (SEM 'OR is_admin_master()')
CREATE POLICY "processes_tenant_delete" ON public.processes
  FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id());

-- 3. HARDENING NA TABELA GENERATED_DOCUMENTS
-- Remove políticas amplas sobrepostas identificadas no banco remoto
DROP POLICY IF EXISTS "Users can view company documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can view documents from their company" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can insert company documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can manage documents from their company" ON public.generated_documents;
DROP POLICY IF EXISTS "Global Admin Bypass generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can update delete company documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can update company documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can delete company documents" ON public.generated_documents;

-- SELECT: Consulta de documentos históricos da própria empresa ou admin global
CREATE POLICY "Users can view company documents" 
  ON public.generated_documents FOR SELECT TO authenticated
  USING (
    company_id = public.current_user_company_id() 
    OR public.is_admin_master()
  );

-- INSERT: Criação de novo documento exige tenant do próprio usuário + (autorização comercial OU isenção admin dentro da empresa)
CREATE POLICY "Users can insert company documents" 
  ON public.generated_documents FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_user_company_id() 
    AND (
      public.has_active_subscription_or_trial(company_id)
      OR public.is_admin_master()
    )
  );

-- UPDATE: Isolamento estrito de tenant (SEM 'OR is_admin_master()')
CREATE POLICY "Users can update company documents" 
  ON public.generated_documents FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- DELETE: Isolamento estrito de tenant (SEM 'OR is_admin_master()')
CREATE POLICY "Users can delete company documents" 
  ON public.generated_documents FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id());

-- TRIGGER BEFORE UPDATE: Bloqueia substituição de PDF gerado (generated_file_url) sob status irregular
CREATE OR REPLACE FUNCTION public.check_generated_document_file_replacement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se houver tentativa de alterar generated_file_url (substituição de emissão)
  IF OLD.generated_file_url IS DISTINCT FROM NEW.generated_file_url THEN
    IF NOT (public.has_active_subscription_or_trial(NEW.company_id) OR public.is_admin_master()) THEN
      RAISE EXCEPTION 'Acesso negado: Substituição de documentos gerados requer assinatura ativa ou trial válido.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_generated_document_file_replacement ON public.generated_documents;
CREATE TRIGGER trg_check_generated_document_file_replacement
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_generated_document_file_replacement();

-- 4. HARDENING NO STORAGE BUCKET 'generated-documents'
-- Remove políticas amplas sobrepostas identificadas no banco remoto
DROP POLICY IF EXISTS "Users can manage their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Generated documents are accessible by company members" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload company generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company generated documents" ON storage.objects;

-- SELECT: Consulta e download de arquivos históricos do bucket restritos ao tenant ou admin global (leitura)
CREATE POLICY "Users can view company generated documents" 
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-documents' 
    AND (
      (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
      OR public.is_admin_master()
    )
  );

-- INSERT: Upload de novos arquivos restrito ao tenant da própria empresa + (autorização comercial OU isenção admin dentro da empresa)
CREATE POLICY "Users can upload company generated documents" 
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents' 
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_active_subscription_or_trial(
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
      OR public.is_admin_master()
    )
  );

-- UPDATE: Substituição / upsert no storage restrito ao tenant da própria empresa + (autorização comercial OU isenção admin)
CREATE POLICY "Users can update company generated documents" 
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'generated-documents' 
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'generated-documents' 
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_active_subscription_or_trial(
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
      OR public.is_admin_master()
    )
  );

-- DELETE: Limpeza de uploads abortados ou temporários restrita ESTRITAMENTE ao tenant da própria empresa (SEM 'OR is_admin_master()')
CREATE POLICY "Users can delete company generated documents" 
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-documents' 
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
  );

COMMIT;
