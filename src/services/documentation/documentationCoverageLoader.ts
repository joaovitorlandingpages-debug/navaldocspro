/**
 * Sprint 4D.5 — Fatia 4
 * Loader tenant-scoped que agrega dados para o DocumentationCoverageEngine.
 *
 * Estratégia: 5 queries paralelas, selects enxutos, sem N+1, sem blobs.
 * RLS existente filtra por company_id no cliente publishable.
 *
 * Sobreposição: quando existe template da empresa com o mesmo `code` de um
 * template global, o global é descartado.
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
  const keys = Object.keys(doc as Record<string, unknown>);
  return keys.length > 0;
}

export async function loadDocumentationCoverage(
  companyId: string | null,
): Promise<CoverageSnapshotInput> {
  // Templates: da empresa + globais
  let tplQuery = supabase
    .from("document_templates")
    .select(
      "id,name,code,category,is_active,is_global,company_id,lifecycle_status,updated_at,document_structure",
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

  const rawTemplates = (tplRes.data ?? []) as any[];

  // Sobreposição por code: empresa vence global
  const byCode = new Map<string, string>();
  for (const t of rawTemplates) {
    if (t.code && !t.is_global && t.company_id === companyId) byCode.set(t.code, t.id);
  }
  const templatesFiltered = rawTemplates.filter((t: any) => {
    if (t.is_global && t.code && byCode.has(t.code)) return false;
    return true;
  });

  const templateIds = templatesFiltered.map((t) => t.id);

  // Versões publicadas + campos, apenas para templates visíveis
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

  // Melhor versão publicada por template
  const bestVersion = new Map<string, { version: number; base: string | null }>();
  for (const v of verRes.data ?? []) {
    const cur = bestVersion.get(v.template_id);
    const vn = v.version_number ?? 0;
    if (!cur || vn > cur.version) {
      bestVersion.set(v.template_id, { version: vn, base: null });
    }
  }
  // Buscar base_content da última versão publicada (só ids necessários, seleção enxuta)
  if (bestVersion.size > 0) {
    const { data: baseRows, error: baseErr } = await supabase
      .from("template_versions")
      .select("template_id,version_number,base_content")
      .in("template_id", Array.from(bestVersion.keys()))
      .eq("status", "published");
    if (baseErr) throw baseErr;
    for (const b of baseRows ?? []) {
      const cur = bestVersion.get(b.template_id);
      if (cur && (b.version_number ?? 0) === cur.version) {
        cur.base = b.base_content ?? null;
      }
    }
  }

  const templates: TemplateSnapshot[] = templatesFiltered.map((t) => {
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

  const fields: TemplateFieldSnapshot[] = (fieldsRes.data ?? []).map((f) => ({
    id: f.id,
    template_id: f.template_id!,
    field_key: f.field_key,
    is_required: !!f.is_required,
    mapping_path: f.mapping_path ?? null,
  }));

  // Requirements: match by process_type text -> process_types.name
  const ptByName = new Map<string, { id: string; name: string }>();
  for (const p of ptRes.data ?? []) ptByName.set(p.name, { id: p.id, name: p.name });

  const requirements: ProcessTypeRequirement[] = [];
  for (const r of reqRes.data ?? []) {
    if (!r.template_id) continue;
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
