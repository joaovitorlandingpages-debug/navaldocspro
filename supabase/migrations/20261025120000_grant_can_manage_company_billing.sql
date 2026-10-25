-- ====================================================================
-- MIGRATION: 20261025120000_grant_can_manage_company_billing.sql
-- AUTORIZAÇÃO FINANCEIRA RIGOROSA: can_manage_company_billing
-- ====================================================================
-- 1. Identificação estrita via auth.role():
--    - 'authenticated': exige auth.uid() IS NOT NULL E auth.uid() = p_user_id.
--      Impede tentativa de impersonation ou consulta de terceiros.
--    - 'service_role': permite p_user_id validado previamente pela Edge Function.
--    - NULL ou qualquer outro papel (ex.: 'anon'): bloqueio imediato (RETURN FALSE).
-- 2. Não utiliza current_user (que em SECURITY DEFINER é o owner da função,
--    e não reflete o chamador da requisição).
-- 3. Não inclui postgres / supabase_admin como fallback de identidade da requisição.
-- 4. Mantém exatamente a assinatura existente (p_user_id UUID, p_company_id UUID)
--    utilizando CREATE OR REPLACE FUNCTION sem DROP prévio, preservando dependências.
-- 5. Revoga explicitamente permissões de PUBLIC e anon, concedendo EXECUTE
--    estritamente a authenticated e service_role.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.can_manage_company_billing(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
    v_effective_user_id UUID;
    v_role TEXT;
BEGIN
    -- Validação de nulidade básica de argumentos
    IF p_user_id IS NULL OR p_company_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Papel estrito da requisição extraído do contexto de autenticação Supabase
    v_role := auth.role();

    IF v_role = 'authenticated' THEN
        -- Chamada de cliente autenticado: a identidade deve corresponder à sessão real
        IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
            RETURN FALSE;
        END IF;
        v_effective_user_id := auth.uid();
    ELSIF v_role = 'service_role' THEN
        -- Chamada interna protegida da Edge Function (onde o JWT do usuário já foi validado)
        v_effective_user_id := p_user_id;
    ELSE
        -- Bloqueio categórico para 'anon', NULL ou qualquer outro contexto
        RETURN FALSE;
    END IF;

    -- Verificação de autorização no banco
    RETURN (
        -- Gestor financeiro pertencente à própria empresa
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.company_id = p_company_id
              AND p.role IN ('company_admin', 'admin', 'owner', 'finance')
        )
        OR
        -- Administrador Master da plataforma (controle / homologação comercial)
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
        )
    );
END;
$$;

-- Revogação explícita de acessos públicos ou anônimos
REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM anon;

-- Concessão estrita aos papéis autorizados
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
