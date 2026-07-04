-- Onda 3B.2 — Índices de performance (baixo risco)
-- Todos btree; nenhum UNIQUE; nenhum sobre coluna já indexada isolada.
-- Justificativa por índice inline. Rollback trivial: DROP INDEX IF EXISTS.

-- documents: leituras dominantes por (process_id, company_id) ordenadas por data
CREATE INDEX IF NOT EXISTS idx_documents_process_company_created
  ON public.documents (process_id, company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company_id
  ON public.documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id
  ON public.documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_vessel_id
  ON public.documents (vessel_id);

-- processes: FKs para joins em listagens de clientes/embarcações
CREATE INDEX IF NOT EXISTS idx_processes_customer_id
  ON public.processes (customer_id);
CREATE INDEX IF NOT EXISTS idx_processes_vessel_id
  ON public.processes (vessel_id);

-- vessels: filtros multi-tenant e por cliente
CREATE INDEX IF NOT EXISTS idx_vessels_company_id
  ON public.vessels (company_id);
CREATE INDEX IF NOT EXISTS idx_vessels_customer_id
  ON public.vessels (customer_id);

-- usage_metrics: consumo por empresa ordenado por data (polling /consumo)
CREATE INDEX IF NOT EXISTS idx_usage_metrics_company_created
  ON public.usage_metrics (company_id, created_at DESC);

-- activity_logs: feed de atividades por empresa
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created
  ON public.activity_logs (company_id, created_at DESC);

-- app_notifications: badge "não lidas" (coluna real é is_read)
-- Partial index: só linhas não lidas — pequeno e altamente seletivo
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_unread
  ON public.app_notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- profiles: has_role/current_user_company_id filtram por company_id
CREATE INDEX IF NOT EXISTS idx_profiles_company_id
  ON public.profiles (company_id);

-- document_process_package_items: materialização de checklist (seq scan pesado em 3A)
CREATE INDEX IF NOT EXISTS idx_dppi_package_id
  ON public.document_process_package_items (package_id);
