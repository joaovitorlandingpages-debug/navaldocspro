/**
 * Sprint 4D.5 — Fatia 4 / Hardening
 * Loader tenant-scoped que agrega dados para o DocumentationCoverageEngine.
 *
 * Estratégia:
 *   - 5 queries paralelas, selects enxutos, sem N+1, sem blobs.
 *   - RLS filtra por company_id no cliente publishable.
 *
 * Regra de precedência empresa × global (documentada e testável):
 *   Chave de escopo = normalize(code) + process_type + category + region_tag.
 *   O template da empresa só sobrescreve o global quando é uma alternativa
 *   VÁLIDA para uso — is_active = true E lifecycle_status = 'published'.
 *   Rascunhos e arquivados privados NÃO escondem globais publicados válidos.
 *   Code vazio/nulo NUNCA gera sobreposição (fallback = manter ambos).
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  CoverageSnapshotInput,
  TemplateSnapshot,
  TemplateFieldSnapshot,
  ProcessTypeRequirement,
  TemplateStatus,
} from "./types";

function mapStatus(lifecycle: string | null | undefined): TemplateStatus {
  if (lifecycle === "published" || lifecycle === "draft" || lifecycle === "archived") return lifecycle;
  return "unknown";
}

function hasStructure(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  return Object.keys(doc as Record<string, unknown>).length > 0;
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Chave canônica de escopo documental — exportada para testes. */
export function scopeKey(t: {
  code?: string | null;
  process_type?: string | null;
  category?: string | null;
  region_tag?: string | null;
}): string | null {
  const code = norm(t.code);
  if (!code) return null; // code vazio/nulo não participa da precedência
  return [code, norm(t.process_type), norm(t.category), norm(t.region_tag)].join("|");
}

/**
 * Aplica a regra de precedência empresa × global.
 * Exportada para testes unitários.
 */
export function applyPrecedence<T extends {
  id: string;
  is_global: boolean;
  is_active: boolean;
  lifecycle_status: string | null;
  company_id: string | null;
  code: string | null;
  process_type: string | null;
  category: string | null;
  region_tag: string | null;
}>(rows: T[], companyId: string | null): T[] {
  // Identifica escopos onde a empresa possui uma alternativa VÁLIDA
  const overriddenScopes = new Set<string>();
  for (const r of rows) {
    if (r.is_global) continue;
    if (r.company_id !== companyId) continue;
    if (r.is_active !== true) continue;
    if (r.lifecycle_status !== "published") continue;
    const key = scopeKey(r);
    if (key) overriddenScopes.add(key);
  }
  return rows.filter((r) => {
    if (!r.is_global) return true;
    const key = scopeKey(r);
    if (!key) return true;
    return !overriddenScopes.has(key);
  });
}

export async function loadDocumentationCoverage(
  companyId: string | null,
): Promise<CoverageSnapshotInput> {
  let tplQuery = supabase
    .from("document_templates")
    .select(
      "id,name,code,category,process_type,region_tag,is_active,is_global,company_id,lifecycle_status,updated_at,document_structure",
    )
    .limit(5000);
  if (companyId) {
    tplQuery = tplQuery.or(`company_id.eq.${companyId},is_global.eq.true`);
  } else {
    tplQuery = tplQuery.eq("is_global", true);
  }

  const [tplRes, ptRes, reqRes] = await Promise.all([
    tplQuery,
    supabase.from("process_types").select("id,name").limit(1000),
    supabase
      .from("process_type_requirements")
      .select("process_type,template_id,is_mandatory")
      .limit(5000),
  ]);

  if (tplRes.error) throw tplRes.error;
  if (ptRes.error) throw ptRes.error;
  if (reqRes.error) throw reqRes.error;

  const templatesFiltered = applyPrecedence((tplRes.data ?? []) as any[], companyId);
  const templateIds = templatesFiltered.map((t) => t.id);

  const [verRes, fieldsRes] = templateIds.length
    ? await Promise.all([
        supabase
          .from("template_versions")
          .select("template_id,version_number,status")
          .in("template_id", templateIds)
          .eq("status", "published")
          .limit(10000),
        supabase
          .from("document_template_fields")
          .select("id,template_id,field_key,is_required,mapping_path")
          .in("template_id", templateIds)
          .limit(10000),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (verRes.error) throw verRes.error;
  if (fieldsRes.error) throw fieldsRes.error;

  const bestVersion = new Map<string, { version: number; base: string | null }>();
  for (const v of verRes.data ?? []) {
    const cur = bestVersion.get(v.template_id);
    const vn = v.version_number ?? 0;
    if (!cur || vn > cur.version) bestVersion.set(v.template_id, { version: vn, base: null });
  }
  if (bestVersion.size > 0) {
    const { data: baseRows, error: baseErr } = await supabase
      .from("template_versions")
      .select("template_id,version_number,base_content")
      .in("template_id", Array.from(bestVersion.keys()))
      .eq("status", "published");
    if (baseErr) throw baseErr;
    for (const b of baseRows ?? []) {
      const cur = bestVersion.get(b.template_id);
      if (cur && (b.version_number ?? 0) === cur.version) cur.base = b.base_content ?? null;
    }
  }

  const templates: TemplateSnapshot[] = templatesFiltered.map((t: any) => {
    const bv = bestVersion.get(t.id);
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      is_active: !!t.is_active,
      status: mapStatus(t.lifecycle_status as string),
      published_version: bv?.version ?? null,
      base_content: bv?.base ?? null,
      has_structure: hasStructure(t.document_structure) || !!bv?.base,
      updated_at: t.updated_at,
    };
  });

  const fields: TemplateFieldSnapshot[] = ((fieldsRes.data ?? []) as any[]).map((f: any) => ({
    id: f.id,
    template_id: f.template_id!,
    field_key: f.field_key,
    is_required: !!f.is_required,
    mapping_path: f.mapping_path ?? null,
  }));

  const ptByName = new Map<string, { id: string; name: string }>();
  for (const p of ptRes.data ?? []) ptByName.set(p.name, { id: p.id, name: p.name });

  const requirements: ProcessTypeRequirement[] = [];
  const visibleIds = new Set(templateIds);
  for (const r of reqRes.data ?? []) {
    if (!r.template_id) continue;
    if (!visibleIds.has(r.template_id)) continue; // não vazar exigências de templates fora do escopo
    const pt = ptByName.get(r.process_type);
    if (!pt) continue;
    requirements.push({
      process_type_id: pt.id,
      process_type_name: pt.name,
      template_id: r.template_id,
      is_mandatory: r.is_mandatory !== false,
    });
  }

  return { templates, fields, requirements };
}
