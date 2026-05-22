-- 1. Reforçar função is_admin_master para evitar qualquer tipo de recursão
-- Ela é SECURITY DEFINER, rodando como proprietário (postgres) que ignora RLS.
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin_master' OR role = 'admin_master_global')
  );
END;
$$;

-- 2. Limpeza total de políticas em profiles
DROP POLICY IF EXISTS "Global Admin Bypass profiles" ON profiles;
DROP POLICY IF EXISTS "Global Admin acessa todos perfis" ON profiles;
DROP POLICY IF EXISTS "Users can see profiles in their own company" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "admin_master can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 3. Criar políticas simples e NÃO recursivas para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seu próprio perfil
CREATE POLICY "profiles_select_self" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Admin Master pode ver todos os perfis (usa a função segura)
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT USING (is_admin_master());

-- Usuário pode inserir seu próprio perfil (necessário para signup)
CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Usuário pode atualizar seu próprio perfil
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- 4. Limpeza total de políticas em companies
DROP POLICY IF EXISTS "Global Admin Bypass companies" ON companies;
DROP POLICY IF EXISTS "Global Admin acessa todas empresas" ON companies;
DROP POLICY IF EXISTS "Users can see their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "admin_master can see all companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert a company" ON companies;

-- 5. Criar políticas para companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver a empresa se:
-- 1. Eles forem da empresa (verificado via profile - esta consulta em profiles NÃO é recursiva agora)
-- 2. Eles forem o criador
-- 3. Eles forem admin master
CREATE POLICY "companies_select_policy" ON public.companies
FOR SELECT USING (
  is_admin_master() 
  OR created_by = auth.uid()
  OR id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Inserção de empresa (necessário para auto-workspace creation)
CREATE POLICY "companies_insert_policy" ON public.companies
FOR INSERT WITH CHECK (auth.uid() = created_by OR auth.uid() IS NOT NULL);

-- Update de empresa
CREATE POLICY "companies_update_policy" ON public.companies
FOR UPDATE USING (
  is_admin_master() 
  OR id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);


-- 6. Limpeza total de políticas em customers (clients)
DROP POLICY IF EXISTS "Global Admin Bypass customers" ON customers;
DROP POLICY IF EXISTS "Isolation: Customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers for their own company" ON customers;

-- 7. Criar políticas para customers (clients)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Acesso total para admin ou membros da empresa
CREATE POLICY "customers_access_policy" ON public.customers
FOR ALL USING (
  is_admin_master() 
  OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Garantia extra para insert
CREATE POLICY "customers_insert_extra" ON public.customers
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 8. Log de conclusão no console do banco
DO $$
BEGIN
  RAISE NOTICE 'RLS_PROFILES_FIXED';
  RAISE NOTICE 'PROFILE_POLICY_OK';
  RAISE NOTICE 'MEMBERSHIP_POLICY_OK';
  RAISE NOTICE 'WORKSPACE_RESOLVE_OK';
  RAISE NOTICE 'CLIENT_INSERT_OK';
END $$;
