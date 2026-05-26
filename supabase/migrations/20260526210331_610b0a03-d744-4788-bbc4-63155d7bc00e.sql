-- 1. Remover políticas problemáticas que dependem de is_admin_master()
DROP POLICY IF EXISTS "customers_access_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_extra" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;

-- 2. Criar políticas robustas baseadas no workspace do usuário
-- SELECT
CREATE POLICY "customers_select_policy" ON public.customers
FOR SELECT TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global')
);

-- INSERT
CREATE POLICY "customers_insert_policy" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global')
);

-- UPDATE
CREATE POLICY "customers_update_policy" ON public.customers
FOR UPDATE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global')
)
WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global')
);

-- DELETE
CREATE POLICY "customers_delete_policy" ON public.customers
FOR DELETE TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global')
);

-- 3. Habilitar RLS explicitamente (caso tenha sido desabilitado por engano)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
