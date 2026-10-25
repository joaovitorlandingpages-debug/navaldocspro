-- Migration: Expor RPC can_manage_company_billing e conceder permissões de execução
-- Garante que can_manage_company_billing esteja acessível via PostgREST para authenticated e service_role

CREATE OR REPLACE FUNCTION public.can_manage_company_billing(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT (
        p_user_id IS NOT NULL AND p_company_id IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = p_user_id
                AND p.company_id = p_company_id
                AND p.role IN ('company_admin', 'admin', 'owner', 'finance')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = p_user_id
                AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
            )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
