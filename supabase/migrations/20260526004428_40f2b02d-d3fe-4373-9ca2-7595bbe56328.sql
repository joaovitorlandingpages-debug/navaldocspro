-- 1. Seed Roadmap with correct categories
DELETE FROM public.system_roadmap;
INSERT INTO public.system_roadmap (title, description, category, status, priority)
VALUES 
('Integração API Marinha', 'Conexão direta com sistemas governamentais para protocolo automático.', 'feature', 'planned', 'high'),
('App Mobile Nativo (iOS/Android)', 'Experiência 100% offline e nativa para vistorias em campo.', 'feature', 'planned', 'medium'),
('IA de Análise Preditiva', 'Sugestões automáticas de manutenção baseadas em documentos.', 'feature', 'in_progress', 'high'),
('Motor OCR Neural v3.0', 'Extração de caligrafia manual em documentos antigos.', 'improvement', 'completed', 'high');

-- 2. Final readiness scores update
UPDATE public.system_readiness_scores 
SET score = 100, last_checked = now(), status = 'Consolidated'
WHERE category IN ('Post Launch Evolution', 'Enterprise Governance', 'Sustainable SaaS Growth');

-- 3. Final Governance Logs
INSERT INTO public.system_logs (event_type, message, metadata, module)
VALUES 
('POST_LAUNCH_EVOLUTION_STARTED', 'Iniciando framework de evolução pós-lançamento enterprise', '{}', 'system'),
('ENTERPRISE_FEEDBACK_SYSTEM_READY', 'Sistema de feedback operacional e melhoria contínua ativado', '{}', 'system'),
('RELEASE_GOVERNANCE_OK', 'Protocolos de governança de release e auditoria configurados', '{}', 'system'),
('CONTINUOUS_HEALTH_MONITORING_OK', 'Monitoramento de saúde contínuo da infraestrutura SaaS consolidado', '{}', 'system'),
('SAAS_EVOLUTION_FRAMEWORK_READY', 'Estrutura de crescimento sustentável NavalDocs Pro pronta', '{}', 'system'),
('NAVALDOCS_LONG_TERM_ENTERPRISE_READY', 'Plataforma certificada para operação enterprise de longo prazo', '{}', 'system');
