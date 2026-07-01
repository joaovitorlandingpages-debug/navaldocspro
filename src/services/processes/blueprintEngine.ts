/**
 * Blueprint Engine — materializa o pacote documental de um processo
 * a partir do modelo (process_types + document_process_packages).
 *
 * Não substitui `documentAutomationEngine`; ele cria/reconcilia as linhas
 * de `document_checklists`, que continuam sendo a fonte para o painel de
 * automação atual. A avaliação de `conditional_rule` é feita client-side
 * (contexto rico com cliente/embarcação/processo).
 */

import { supabase } from "@/integrations/supabase/client";
import { evaluateRule, type ProcessRuleContext } from "./conditionalEngine";

export interface MaterializeResult {
  processId: string;
  packageId: string | null;
  added: number;
  updated: number;
  removed: number;
  kept: number;
  skippedByRule: number;
}

export interface MaterializeOptions {
  /** template_ids opcionais que o usuário desmarcou — não devem ser inseridos. */
  excludeTemplateIds?: string[];
  /** template_ids extras (da biblioteca) que o usuário adicionou manualmente. */
  extraTemplateIds?: string[];
}

export interface BlueprintPreviewItem {
  templateId: string | null;
  name: string;
  role: string | null;
  kind: "mandatory" | "optional" | "conditional";
  included: boolean;      // avaliação da regra condicional (default true)
  requiresSignature: boolean;
  requiresOcr: boolean;
  ruleSummary: string | null;
}

/**
 * Pré-visualiza os itens do pacote sem gravar nada. Usada pelo Quick Dialog
 * para exibir a etapa "Documentos do Processo" antes de criar o processo.
 * Se `processId` for informado, avalia regras condicionais no contexto real;
 * caso contrário, todas as regras são consideradas atendidas.
 */
export async function previewProcessBlueprint(
  processType: string,
  processId?: string,
): Promise<BlueprintPreviewItem[]> {
  const { items } = await loadPackage(processType);
  const ctx = processId ? await loadContext(processId) : null;
  return items.map((item: any) => {
    const rule = item.conditional_rule ?? null;
    const included = ctx ? evaluateRule(rule, ctx) : true;
    const kind: BlueprintPreviewItem["kind"] = rule
      ? "conditional"
      : item.is_required ? "mandatory" : "optional";
    return {
      templateId: item.document_template_id ?? null,
      name: item.template?.name || item.document_role || "Documento",
      role: item.document_role ?? null,
      kind,
      included,
      requiresSignature: !!item.requires_signature,
      requiresOcr: !!item.requires_ocr,
      ruleSummary: rule ? (typeof rule === "string" ? rule : JSON.stringify(rule)) : null,
    };
  });
}

async function loadContext(processId: string): Promise<ProcessRuleContext | null> {
  const { data, error } = await supabase
    .from("processes")
    .select("*, customer:customers(*), vessel:vessels(*)")
    .eq("id", processId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    process: data,
    customer: (data as any).customer ?? null,
    vessel: (data as any).vessel ?? null,
  };
}

async function loadPackage(processType: string) {
  const { data: pkg } = await supabase
    .from("document_process_packages")
    .select("id")
    .eq("process_type", processType)
    .eq("is_active", true)
    .maybeSingle();
  if (!pkg) return { packageId: null as string | null, items: [] as any[] };

  const { data: items } = await supabase
    .from("document_process_package_items")
    .select("*, template:document_templates(id,name)")
    .eq("package_id", pkg.id)
    .order("sort_order", { ascending: true });

  return { packageId: pkg.id, items: items ?? [] };
}

/**
 * Materializa ou reconcilia o checklist do processo:
 * - Adiciona itens novos que ainda não existem.
 * - Marca itens obsoletos (que não estão mais no pacote OU foram excluídos pela regra) como
 *   removidos apenas se ainda estiverem `pending` e sem documento anexado.
 * - Nunca apaga itens já preenchidos.
 */
export async function materializeProcessBlueprint(
  processId: string,
  options: MaterializeOptions = {},
): Promise<MaterializeResult> {
  const exclude = new Set((options.excludeTemplateIds ?? []).filter(Boolean));
  const extras = (options.extraTemplateIds ?? []).filter(Boolean);
  const ctx = await loadContext(processId);
  if (!ctx || !ctx.process) {
    return { processId, packageId: null, added: 0, updated: 0, removed: 0, kept: 0, skippedByRule: 0 };
  }

  const processType: string = (ctx.process as any).process_type;
  const { packageId, items } = await loadPackage(processType);

  const { data: existing } = await supabase
    .from("document_checklists")
    .select("id, template_id, item_name, status, document_id, is_mandatory")
    .eq("process_id", processId);

  const existingByTemplate = new Map<string, any>();
  const existingByName = new Map<string, any>();
  (existing ?? []).forEach((row: any) => {
    if (row.template_id) existingByTemplate.set(row.template_id, row);
    if (row.item_name) existingByName.set(row.item_name.toLowerCase(), row);
  });

  const validKeys = new Set<string>();
  let added = 0;
  let updated = 0;
  let skippedByRule = 0;
  let kept = 0;

  for (const item of items) {
    const rule = (item as any).conditional_rule;
    const shouldInclude = evaluateRule(rule, ctx);
    if (!shouldInclude) {
      skippedByRule += 1;
      continue;
    }
    const tplId: string | null = (item as any).document_template_id ?? null;
    // Usuário desmarcou este opcional/condicional na etapa "Documentos".
    if (tplId && exclude.has(tplId)) {
      skippedByRule += 1;
      continue;
    }

    const templateName: string | undefined = (item as any).template?.name;
    const displayName = templateName || (item as any).document_role || "Documento";
    const key = (item as any).document_template_id || displayName.toLowerCase();
    validKeys.add(String(key));

    const found =
      ((item as any).document_template_id && existingByTemplate.get((item as any).document_template_id)) ||
      existingByName.get(displayName.toLowerCase());

    if (found) {
      kept += 1;
      // Sincroniza flags de metadata (não sobrescreve status/document)
      const patch: any = {
        template_id: (item as any).document_template_id ?? found.template_id ?? null,
        document_role: (item as any).document_role ?? null,
        requires_signature: !!(item as any).requires_signature,
        requires_ocr: !!(item as any).requires_ocr,
        has_expiration: !!(item as any).has_expiration,
        sort_order: (item as any).sort_order ?? 0,
        conditional_rule: rule ?? null,
        is_conditional: rule != null,
        is_mandatory: !!(item as any).is_required,
      };
      const { error } = await supabase.from("document_checklists").update(patch).eq("id", found.id);
      if (!error) updated += 1;
      continue;
    }

    const { error: insErr } = await supabase.from("document_checklists").insert({
      process_id: processId,
      item_name: displayName,
      is_mandatory: !!(item as any).is_required,
      status: "pending",
      template_id: (item as any).document_template_id ?? null,
      document_role: (item as any).document_role ?? null,
      requires_signature: !!(item as any).requires_signature,
      requires_ocr: !!(item as any).requires_ocr,
      has_expiration: !!(item as any).has_expiration,
      sort_order: (item as any).sort_order ?? 0,
      conditional_rule: rule ?? null,
      is_conditional: rule != null,
    });
    if (!insErr) added += 1;
  }

  // Extras da biblioteca (opcionais adicionados manualmente pelo engenheiro).
  if (extras.length > 0) {
    const { data: extraTpls } = await supabase
      .from("document_templates")
      .select("id,name")
      .in("id", extras);
    for (const tpl of extraTpls ?? []) {
      const already = existingByTemplate.get((tpl as any).id);
      if (already) { kept += 1; validKeys.add(String((tpl as any).id)); continue; }
      const { error: insErr } = await supabase.from("document_checklists").insert({
        process_id: processId,
        item_name: (tpl as any).name,
        is_mandatory: false,
        status: "pending",
        template_id: (tpl as any).id,
        is_conditional: false,
      });
      if (!insErr) { added += 1; validKeys.add(String((tpl as any).id)); }
    }
  }

  // Reconcile: remove somente itens ainda pendentes/sem documento que não pertencem mais
  let removed = 0;
  for (const row of existing ?? []) {
    const key = String(row.template_id || (row.item_name || "").toLowerCase());
    if (validKeys.has(key)) continue;
    if (row.status !== "pending" || row.document_id) continue;
    const { error } = await supabase.from("document_checklists").delete().eq("id", row.id);
    if (!error) removed += 1;
  }

  return { processId, packageId, added, updated, removed, kept, skippedByRule };
}
