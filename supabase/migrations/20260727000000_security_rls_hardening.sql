-- ====================================================================
-- MIGRATION: 20260727000000_security_rls_hardening.sql
-- CAMADA DE SEGURANÇA AVANÇADA, ISOLAMENTO MULTI-TENANT E ANTI-ESCALONAMENTO
-- ====================================================================

-- 1. Funções Auxiliares Seguras com SECURITY DEFINER e search_path restrito
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin_master', 'admin_master_global', 'superadmin')
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO authenticated, service_role;

-- ====================================================================
-- 2. BLOQUEIO DE ESCALONAMENTO DE PRIVILÉGIOS (PROFILES & SUBSCRIPTIONS)
-- ====================================================================

-- 2.1. Blindagem da tabela PROFILES (Anti-escalonamento de role e company_id)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permite operações executadas pelo service_role (backend/Edge Functions)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Administradores globais podem gerenciar perfis
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin_master_global', 'admin_master', 'superadmin')
  ) THEN
    RETURN NEW;
  END IF;

  -- Bloqueia alteração da coluna role por usuários não autorizados
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Acesso negado: Alteração de cargo/role é restrita a administradores globais.';
  END IF;

  -- Bloqueia alteração da coluna company_id (exceto no primeiro vínculo de onboarding)
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    IF NOT (OLD.company_id IS NULL AND NEW.id = auth.uid()) THEN
      RAISE EXCEPTION 'Acesso negado: Não é permitido alterar a organização/oficina vinculada.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2.2. Blindagem da tabela SUBSCRIPTIONS (Anti-tampering de status e datas de plano)
-- Apenas service_role ou administradores globais podem alterar o status ou datas de vigência
CREATE OR REPLACE FUNCTION public.prevent_subscription_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas service_role ou superadmins autenticados podem inserir ou atualizar assinaturas
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_master() THEN
    RAISE EXCEPTION 'Acesso negado: O status da assinatura só pode ser alterado via backend seguro / Mercado Pago.';
  END IF;

  RETURN NEW;
END;
$$;

-- ====================================================================
-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS) MULTI-TENANT ESTREITAS
-- ====================================================================

-- 3.1. TABELA: CUSTOMERS (Clientes da Oficina)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_tenant_select" ON public.customers;
CREATE POLICY "customers_tenant_select" ON public.customers
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "customers_tenant_insert" ON public.customers;
CREATE POLICY "customers_tenant_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "customers_tenant_update" ON public.customers;
CREATE POLICY "customers_tenant_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "customers_tenant_delete" ON public.customers;
CREATE POLICY "customers_tenant_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

-- 3.2. TABELA: VESSELS (Embarcações / Veículos)
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vessels_tenant_select" ON public.vessels;
CREATE POLICY "vessels_tenant_select" ON public.vessels
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "vessels_tenant_insert" ON public.vessels;
CREATE POLICY "vessels_tenant_insert" ON public.vessels
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "vessels_tenant_update" ON public.vessels;
CREATE POLICY "vessels_tenant_update" ON public.vessels
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "vessels_tenant_delete" ON public.vessels;
CREATE POLICY "vessels_tenant_delete" ON public.vessels
  FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

-- 3.3. TABELA: PROCESSES (Ordens de Serviço / Processos)
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processes_tenant_select" ON public.processes;
CREATE POLICY "processes_tenant_select" ON public.processes
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "processes_tenant_insert" ON public.processes;
CREATE POLICY "processes_tenant_insert" ON public.processes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "processes_tenant_update" ON public.processes;
CREATE POLICY "processes_tenant_update" ON public.processes
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "processes_tenant_delete" ON public.processes;
CREATE POLICY "processes_tenant_delete" ON public.processes
  FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

-- 3.4. TABELA: SUBSCRIPTIONS (Assinaturas das Oficinas)
-- Usuários comuns SÓ PODEM LER sua própria assinatura.
-- Inserções e atualizações são restritas a service_role e administradores globais.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_tenant_select" ON public.subscriptions;
CREATE POLICY "subscriptions_tenant_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

DROP POLICY IF EXISTS "subscriptions_admin_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_master());

DROP POLICY IF EXISTS "subscriptions_admin_update" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

DROP POLICY IF EXISTS "subscriptions_admin_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (public.is_admin_master());

-- Gatilho de segurança adicional contra tampering de assinaturas
DROP TRIGGER IF EXISTS trg_prevent_subscription_tampering ON public.subscriptions;
CREATE TRIGGER trg_prevent_subscription_tampering
  BEFORE INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_subscription_tampering();

-- ====================================================================
-- 4. APLICAÇÃO DINÂMICA EM TABELAS COMPLEMENTARES CASO EXISTAM
-- (financial_entries, inventory, purchase_notes, clients, vehicles, service_orders)
-- ====================================================================
DO $$
DECLARE
  tbl text;
  extra_tables text[] := ARRAY[
    'clients', 
    'vehicles', 
    'service_orders', 
    'financial_entries', 
    'financial_transactions', 
    'inventory', 
    'inventory_items', 
    'purchase_notes'
  ];
BEGIN
  FOREACH tbl IN ARRAY extra_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Habilita RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Se possui a coluna company_id, aplica as políticas multi-tenant
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'company_id'
      ) THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_select', tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.current_user_company_id() OR public.is_admin_master());', tbl || '_tenant_select', tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_insert', tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());', tbl || '_tenant_insert', tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_update', tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.current_user_company_id() OR public.is_admin_master()) WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());', tbl || '_tenant_update', tbl);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_delete', tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id = public.current_user_company_id() OR public.is_admin_master());', tbl || '_tenant_delete', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;
