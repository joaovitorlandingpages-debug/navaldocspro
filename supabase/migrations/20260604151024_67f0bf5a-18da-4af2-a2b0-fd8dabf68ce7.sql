-- Revogar execução pública (anon) de funções utilitárias que eram acessíveis
REVOKE EXECUTE ON FUNCTION public.track_usage(text, text, integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.duplicate_document(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ocr_usage(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_system_readiness() FROM anon;

-- Garantir que sla_configs não seja legível publicamente (anon)
DROP POLICY IF EXISTS "Users can view their company sla_configs" ON public.sla_configs;
CREATE POLICY "Users can view their company sla_configs" ON public.sla_configs
FOR SELECT TO authenticated USING (true);

-- Nota: Funções is_admin_master(), current_company_id() e current_user_company_id() 
-- permanecem executáveis por 'anon' pois são usadas em RLS e não expõem dados sensíveis diretamente.
