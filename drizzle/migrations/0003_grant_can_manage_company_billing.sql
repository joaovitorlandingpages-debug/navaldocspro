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
    IF p_user_id IS NULL OR p_company_id IS NULL THEN
        RETURN FALSE;
    END IF;
    v_role := auth.role();
    IF v_role = 'authenticated' THEN
        IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
            RETURN FALSE;
        END IF;
        v_effective_user_id := auth.uid();
    ELSIF v_role = 'service_role' THEN
        v_effective_user_id := p_user_id;
    ELSE
        RETURN FALSE;
    END IF;
    RETURN (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.company_id = p_company_id
              AND p.role IN ('company_admin', 'admin', 'owner', 'finance')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';