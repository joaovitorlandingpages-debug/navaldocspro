/**
 * NavalDocs Pro — Identificação oficial da Release Candidate.
 * Fonte única de verdade para versão exibida em UI, telemetria e auditoria.
 */

export const RELEASE = {
  product: 'NavalDocs Pro',
  version: '1.0.0-RC1',
  channel: 'release-candidate' as const,
  date: '2026-07-26',
  codename: 'Piloto Controlado',
} as const;

export interface ReleaseNotesSection {
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNotesSection[] = [
  {
    title: 'Principais melhorias',
    items: [
      'Wizard de criação de processos 2.0 (onboarding orientado por documentos).',
      'Pipeline real de OCR com sessões persistentes e detecção de duplicidade.',
      'Smart Process Analyzer: score de qualidade, risco e probabilidade de aprovação.',
      'Action Engine com registro dinâmico, idempotência e auditoria persistente.',
      'Process Workspace 3.0 com Copilot lateral e layout de três colunas.',
      'Telemetria operacional ponta a ponta com correlation_id por operação.',
    ],
  },
  {
    title: 'Correções',
    items: [
      'Permissões de Data API (GRANTs) ausentes em tabelas do core.',
      'Persistência real do Action Engine (remoção de mocks).',
      'Sobreposição de FABs e botão de feedback na navegação mobile.',
      'Propagação de erros no ActionExecutor (falhas não mais silenciosas).',
    ],
  },
  {
    title: 'Mudanças de arquitetura',
    items: [
      'Enterprise AI Core: planner dinâmico, sessões de execução e intent interpreter.',
      'Serviços de criação de processo centralizados em ProcessCreationService.',
      'Idempotência atômica via RPC claim_ai_idempotency_record.',
      'Camada de observabilidade unificada (telemetry + error monitor + modo piloto).',
    ],
  },
  {
    title: 'Problemas conhecidos',
    items: [
      'Avisos informativos do linter de banco sobre funções SECURITY DEFINER intencionais.',
      'Métricas do dashboard operacional consideram janela máxima de 30 dias.',
      'Incidentes são registrados manualmente (sem detecção automática ainda).',
    ],
  },
  {
    title: 'Limitações da RC1',
    items: [
      'Uso destinado a um grupo controlado de empresas piloto.',
      'Sem grandes refatorações ou novas funcionalidades durante a RC1.',
      'Modo piloto aumenta volume de logs e telemetria (custo de armazenamento).',
    ],
  },
];
