-- 1. Corrigir a função is_admin_master
CREATE OR REPLACE FUNCTION public.is_admin_master()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  -- Usamos uma consulta direta à tabela de perfis ignorando RLS devido ao SECURITY DEFINER
  SELECT role INTO v_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN v_role IN ('admin_master', 'admin_master_global');
END;
$function$;

-- 2. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO service_role;

-- 3. Corrigir e Simplificar Policies da tabela customers
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
DROP POLICY IF EXISTS "Users can view their company customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their company customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their company customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;

-- Política de Visualização
CREATE POLICY "customers_select_policy" ON public.customers
FOR SELECT USING (
  is_admin_master() OR 
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política de Inserção
CREATE POLICY "customers_insert_policy" ON public.customers
FOR INSERT WITH CHECK (
  is_admin_master() OR 
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política de Atualização
CREATE POLICY "customers_update_policy" ON public.customers
FOR UPDATE USING (
  is_admin_master() OR 
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política de Exclusão
CREATE POLICY "customers_delete_policy" ON public.customers
FOR DELETE USING (
  is_admin_master()
);

-- 4. Adicionar logs de auditoria
INSERT INTO public.system_logs (event_type, module, message, metadata)
VALUES ('IS_ADMIN_MASTER_PERMISSION_FIXED', 'RLS_SECURITY', 'Função is_admin_master corrigida com SECURITY DEFINER e permissões adequadas.', '{"status": "success"}'::jsonb);

INSERT INTO public.system_logs (event_type, module, message, metadata)
VALUES ('CLIENTS_RLS_OK', 'RLS_SECURITY', 'Políticas RLS da tabela customers simplificadas e corrigidas.', '{"status": "success"}'::jsonb);
