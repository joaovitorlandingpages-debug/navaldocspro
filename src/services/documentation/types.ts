/**
 * Sprint 4D.5 — Fatia 3
 * Tipos canônicos do Motor de Cobertura Documental.
 *
 * Este módulo NÃO acessa Supabase: recebe snapshots crus e devolve o
 * resultado normalizado. A camada de dados (loader) fica separada para
 * facilitar testes unitários e evitar N+1 em componentes React.
 */

export type TemplateStatus = "published" | "draft" | "archived" | "unknown";

export interface TemplateSnapshot {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  status: TemplateStatus;
  /** Versão publicada corrente (>=1) ou null se nenhuma. */
  published_version: number | null;
  /** Conteúdo base da versão publicada (para análise de placeholders). */
  base_content: string | null;
  /** true quando existe estrutura mínima (heading/sections/etc). */
  has_structure: boolean;
  updated_at?: string | null;
}

export interface TemplateFieldSnapshot {
  id: string;
  template_id: string;
  field_key: string;
  is_required: boolean;
  mapping_path: string | null;
}

export interface ProcessTypeRequirement {
  process_type_id: string;
  process_type_name: string;
  /** Template obrigatório para o tipo de processo. */
  template_id: string;
  is_mandatory: boolean;
}

export interface CoverageSnapshotInput {
  templates: TemplateSnapshot[];
  fields: TemplateFieldSnapshot[];
  requirements: ProcessTypeRequirement[];
}

export type IssueSeverity = "error" | "warning" | "info";
export type IssueCode =
  | "template_missing"
  | "template_draft"
  | "template_archived"
  | "template_inactive"
  | "template_no_published_version"
  | "template_no_structure"
  | "template_unused"
  | "template_duplicated"
  | "mapping_broken"
  | "placeholder_unknown"
  | "placeholder_deprecated"
  | "required_field_no_mapping"
  | "version_outdated";

export interface CoverageIssue {
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
  template_id?: string;
  process_type_id?: string;
  placeholder?: string;
}

export interface ProcessTypeCoverage {
  process_type_id: string;
  process_type_name: string;
  required: string[];       // template_ids exigidos
  configured: string[];     // template_ids que existem no tenant (qualquer status)
  covered: string[];        // template_ids realmente cobertos
  missing: string[];        // required - covered
  coverage: number;         // 0..100
  status: "ok" | "partial" | "missing" | "empty";
  issues: CoverageIssue[];
  warnings: CoverageIssue[];
}

export interface CoverageResult {
  coverage: number;         // 0..100 (média ponderada de processos)
  healthScore: number;      // 0..100

  requiredDocuments: string[];
  configuredDocuments: string[];
  publishedDocuments: string[];
  draftDocuments: string[];
  archivedDocuments: string[];
  missingDocuments: string[];

  duplicatedTemplates: string[];
  brokenMappings: Array<{ template_id: string; field_key: string; mapping_path: string | null }>;
  invalidPlaceholders: Array<{ template_id: string; placeholder: string }>;
  missingFields: Array<{ template_id: string; field_key: string }>;
  unusedTemplates: string[];
  outdatedVersions: string[];

  warnings: CoverageIssue[];
  issues: CoverageIssue[];

  processes: ProcessTypeCoverage[];
}
