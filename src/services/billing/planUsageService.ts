import { supabase } from "@/integrations/supabase/client";

export interface QuotaCheckResult {
  canExecute: boolean;
  processesWillConsume: number;
  ocrWillConsume: number;
  currentAvailableProcesses: number;
  currentAvailableOcr: number;
  remainingProcessesAfterAction: number;
  remainingOcrAfterAction: number;
  isReusedDocumentExempt: boolean;
  isManualEntryExempt: boolean;
  message: string;
}

export interface PlanUsageSummary {
  companyId: string;
  hasActivePlan: boolean;
  planName: string;
  billingCycle: "monthly" | "yearly";
  subscriptionStatus: string;
  cycleStart: string;
  cycleEnd: string;
  renewalDateFormatted: string;
  isAnnualWithMonthlyQuota: boolean;

  // Indicador 1: Processos
  processes: {
    used: number;
    limit: number;
    available: number;
    percent: number;
    extraAddons: number;
  };

  // Indicador 2: Documentos Lidos Automaticamente (OCR)
  ocr: {
    used: number;
    limit: number;
    available: number;
    percent: number;
    extraAddons: number;
  };

  // Preços unitários reais para adicionais
  addonPricing: {
    pricePerExtraProcess: number;
    pricePerExtraOcr: number;
  };
}

export interface ConsumptionHistoryEntry {
  id: string;
  date: string;
  userName: string;
  operation: string;
  operationType: "process_creation" | "ocr_read" | "reused_document" | "manual_entry";
  consumedAmount: number;
  unitLabel: string;
  isExempt: boolean;
  processId?: string | null;
  processTitle?: string | null;
  details?: string | null;
}

/**
 * Calcula o ciclo mensal ativo para a franquia.
 * Em planos anuais, as franquias de processos e leituras se renovam mensalmente.
 */
export function calculateMonthlyQuotaCycle(
  periodStartIso?: string | null,
  periodEndIso?: string | null,
  isYearly = false
): { start: Date; end: Date; renewalFormatted: string } {
  const now = new Date();

  if (!periodStartIso || !periodEndIso) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const renewalFormatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(end);
    return { start, end, renewalFormatted };
  }

  const pStart = new Date(periodStartIso);
  const pEnd = new Date(periodEndIso);

  // Se plano mensal padrão: usa as datas da Stripe/assinatura
  if (!isYearly) {
    const renewalFormatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(pEnd);
    return { start: pStart, end: pEnd, renewalFormatted };
  }

  // Plano ANUAL com renovação MENSAL da franquia comercial
  const dayOfMonth = pStart.getDate();
  let cycleStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 0, 0, 0);

  if (now < cycleStart) {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth, 0, 0, 0);
  }

  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, dayOfMonth - 1, 23, 59, 59);
  const nextRenewal = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, dayOfMonth);

  const renewalFormatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(nextRenewal);

  return { start: cycleStart, end: cycleEnd, renewalFormatted };
}

/**
 * Consulta oficial de saldo e consumo a partir do backend (banco de dados)
 */
export async function getOfficialPlanUsage(companyId: string): Promise<PlanUsageSummary> {
  if (!companyId) {
    throw new Error("companyId é obrigatório para consulta de uso.");
  }

  // 1. Assinatura e Plano
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("company_id", companyId)
    .maybeSingle();

  // Fallback: empresa vinculada com plan_id
  let plan = sub?.plan;
  if (!plan) {
    const { data: comp } = await supabase
      .from("companies")
      .select("plan_id, plan")
      .eq("id", companyId)
      .maybeSingle();

    if (comp?.plan_id) {
      const { data: p } = await supabase
        .from("plans")
        .select("*")
        .eq("id", comp.plan_id)
        .maybeSingle();
      plan = p;
    }
  }

  const billingCycle = (sub?.plan?.billing_cycle || (plan as any)?.billing_cycle || "monthly") as "monthly" | "yearly";
  const isYearly = billingCycle === "yearly";

  const { start: cycleStart, end: cycleEnd, renewalFormatted } = calculateMonthlyQuotaCycle(
    sub?.current_period_start,
    sub?.current_period_end,
    isYearly
  );

  const cycleStartIso = cycleStart.toISOString();
  const cycleEndIso = cycleEnd.toISOString();

  // 2. Consulta de Processos criados no ciclo oficial
  const { data: procList, error: pErr } = await supabase
    .from("processes")
    .select("id, created_at")
    .eq("company_id", companyId)
    .gte("created_at", cycleStartIso)
    .lte("created_at", cycleEndIso);

  if (pErr) console.error("Erro ao consultar contagem oficial de processos:", pErr);
  const usedProcesses = procList?.length || 0;

  // 3. Consulta de Leituras OCR no Ledger Oficial
  const { data: ledgerOcr, error: lErr } = await supabase
    .from("resource_consumption")
    .select("id, amount, resource_key, created_at")
    .eq("company_id", companyId)
    .eq("resource_key", "ocr")
    .gte("created_at", cycleStartIso)
    .lte("created_at", cycleEndIso);

  let usedOcr = 0;
  if (!lErr && ledgerOcr && ledgerOcr.length > 0) {
    usedOcr = ledgerOcr.reduce((sum: number, item: any) => sum + (Number(item.amount) || 1), 0);
  } else {
    // Fallback para contagem real em ocr_jobs
    const { data: ocrJobs } = await supabase
      .from("ocr_jobs")
      .select("id")
      .eq("company_id", companyId)
      .gte("created_at", cycleStartIso)
      .lte("created_at", cycleEndIso);
    usedOcr = ocrJobs?.length || 0;
  }

  // 4. Franquias Adicionais Contratadas
  const { data: addons } = await supabase
    .from("company_resource_addons")
    .select("*")
    .eq("company_id", companyId);

  const extraProcesses = (addons || [])
    .filter((a: any) => a.resource_key === "processes" || a.resource_key === "process")
    .reduce((sum: number, a: any) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);

  const extraOcr = (addons || [])
    .filter((a: any) => a.resource_key === "ocr")
    .reduce((sum: number, a: any) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);

  // 5. Limites Totais Contratados
  const baseProcessLimit = plan?.process_limit ?? (plan ? 20 : 0);
  const baseOcrLimit = plan?.ocr_limit ?? (plan ? 200 : 0);

  const totalProcessLimit = baseProcessLimit + extraProcesses;
  const totalOcrLimit = baseOcrLimit + extraOcr;

  const availableProcesses = Math.max(0, totalProcessLimit - usedProcesses);
  const availableOcr = Math.max(0, totalOcrLimit - usedOcr);

  const percentProcesses = totalProcessLimit > 0 ? Math.min(100, Math.round((usedProcesses / totalProcessLimit) * 100)) : 0;
  const percentOcr = totalOcrLimit > 0 ? Math.min(100, Math.round((usedOcr / totalOcrLimit) * 100)) : 0;

  return {
    companyId,
    hasActivePlan: Boolean(plan),
    planName: plan?.name || "Sem plano ativo",
    billingCycle,
    subscriptionStatus: sub?.status || "inactive",
    cycleStart: cycleStartIso,
    cycleEnd: cycleEndIso,
    renewalDateFormatted: renewalFormatted,
    isAnnualWithMonthlyQuota: isYearly,
    processes: {
      used: usedProcesses,
      limit: totalProcessLimit,
      available: availableProcesses,
      percent: percentProcesses,
      extraAddons: extraProcesses,
    },
    ocr: {
      used: usedOcr,
      limit: totalOcrLimit,
      available: availableOcr,
      percent: percentOcr,
      extraAddons: extraOcr,
    },
    addonPricing: {
      pricePerExtraProcess: 5.0, // R$ 5,00 por processo extra (conforme catálogo oficial)
      pricePerExtraOcr: 0.5,      // R$ 0,50 por leitura extra
    },
  };
}

/**
 * Validação prévia de consumo de franquia antes de executar a ação.
 * Informa quanto consumirá e se o saldo é suficiente.
 */
export async function checkActionQuota(
  companyId: string,
  action: {
    processesToCreate?: number;
    ocrToRead?: number;
    isReusedDocument?: boolean;
    isManualEntry?: boolean;
  }
): Promise<QuotaCheckResult> {
  const usage = await getOfficialPlanUsage(companyId);

  const processesWillConsume = action.processesToCreate || 0;
  
  // Regra de Isenção: Reaproveitamento de documento ou digitação manual NÃO consome leitura!
  const isReused = Boolean(action.isReusedDocument);
  const isManual = Boolean(action.isManualEntry);
  const ocrWillConsume = (isReused || isManual) ? 0 : (action.ocrToRead || 0);

  const canProcesses = usage.processes.available >= processesWillConsume;
  const canOcr = usage.ocr.available >= ocrWillConsume;
  const canExecute = canProcesses && canOcr;

  let message = "Saldo suficiente para realizar a operação.";
  if (!canProcesses && !canOcr) {
    message = "Limite de processos e de leituras automáticas esgotado no ciclo atual.";
  } else if (!canProcesses) {
    message = `Limite de processos esgotado (${usage.processes.used}/${usage.processes.limit}). Contrate processos adicionais ou faça upgrade.`;
  } else if (!canOcr) {
    message = `Limite de leituras automáticas esgotado (${usage.ocr.used}/${usage.ocr.limit}). Contrate leituras adicionais ou utilize digitação manual.`;
  } else if (isReused) {
    message = "Documento previamente cadastrado: operação isenta de consumo de leitura.";
  } else if (isManual) {
    message = "Preenchimento manual de dados: operação isenta de consumo de leitura.";
  }

  return {
    canExecute,
    processesWillConsume,
    ocrWillConsume,
    currentAvailableProcesses: usage.processes.available,
    currentAvailableOcr: usage.ocr.available,
    remainingProcessesAfterAction: Math.max(0, usage.processes.available - processesWillConsume),
    remainingOcrAfterAction: Math.max(0, usage.ocr.available - ocrWillConsume),
    isReusedDocumentExempt: isReused,
    isManualEntryExempt: isManual,
    message,
  };
}

/**
 * Registra o consumo de recurso no ledger oficial de forma estritamente idempotente.
 * Se o requestId já existir, retorna o registro prévio sem descontar em dobro.
 */
export async function recordResourceConsumption(params: {
  companyId: string;
  resourceKey: "processes" | "ocr";
  amount: number;
  requestId: string;
  userId?: string | null;
  userName?: string | null;
  processId?: string | null;
  processTitle?: string | null;
  fileName?: string | null;
  isReused?: boolean;
  isManual?: boolean;
  supabaseClient?: any;
}): Promise<{ success: boolean; deduplicated: boolean; id?: number }> {
  const { companyId, resourceKey, amount, requestId, userId, userName, processId, processTitle, fileName, isReused, isManual, supabaseClient } = params;
  const sb = supabaseClient || supabase;

  if (!companyId || !requestId) {
    throw new Error("companyId e requestId são obrigatórios para registrar consumo.");
  }

  // 1. Checagem de Idempotência
  const { data: existing } = await sb
    .from("resource_consumption")
    .select("id")
    .eq("company_id", companyId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (existing) {
    // Já registrado anteriormente: idempotência garantida
    return { success: true, deduplicated: true, id: existing.id };
  }

  // 2. Inserção no ledger oficial
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodMonth = `${monthStr}-01`;
  const periodDay = `${monthStr}-${String(now.getDate()).padStart(2, "0")}`;

  const finalAmount = (isReused || isManual) ? 0 : amount;

  const { data: inserted, error } = await sb
    .from("resource_consumption")
    .insert({
      company_id: companyId,
      resource_key: resourceKey,
      amount: finalAmount,
      period_month: periodMonth,
      period_day: periodDay,
      request_id: requestId,
      user_id: userId || null,
      metadata: {
        user_name: userName || "Operador",
        process_id: processId || null,
        process_title: processTitle || null,
        file_name: fileName || null,
        is_reused: Boolean(isReused),
        is_manual: Boolean(isManual),
        recorded_at: now.toISOString(),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao registrar consumo no ledger:", error);
    throw error;
  }

  return { success: true, deduplicated: false, id: inserted.id };
}

/**
 * Consulta o histórico cronológico de consumo de franquia do período
 */
export async function getConsumptionHistory(
  companyId: string,
  cycleStartIso: string,
  cycleEndIso: string
): Promise<ConsumptionHistoryEntry[]> {
  const entries: ConsumptionHistoryEntry[] = [];

  // 1. Ledger de Consumo
  const { data: ledger } = await supabase
    .from("resource_consumption")
    .select("*")
    .eq("company_id", companyId)
    .gte("created_at", cycleStartIso)
    .lte("created_at", cycleEndIso)
    .order("created_at", { ascending: false });

  if (ledger && ledger.length > 0) {
    for (const item of ledger) {
      const meta = (item.metadata || {}) as any;
      const isReused = Boolean(meta.is_reused);
      const isManual = Boolean(meta.is_manual);

      let op = "Leitura automática de documento";
      let opType: ConsumptionHistoryEntry["operationType"] = "ocr_read";
      let unit = "leitura";

      if (item.resource_key === "processes" || item.resource_key === "process") {
        op = "Novo processo criado";
        opType = "process_creation";
        unit = "processo";
      } else if (isReused) {
        op = "Reaproveitamento de documento já lido";
        opType = "reused_document";
        unit = "isento";
      } else if (isManual) {
        op = "Preenchimento manual de dados";
        opType = "manual_entry";
        unit = "isento";
      }

      entries.push({
        id: `ledger-${item.id}`,
        date: item.created_at,
        userName: meta.user_name || "Equipe",
        operation: op,
        operationType: opType,
        consumedAmount: Number(item.amount) || 0,
        unitLabel: unit,
        isExempt: isReused || isManual || item.amount === 0,
        processId: meta.process_id || null,
        processTitle: meta.process_title || (meta.file_name ? `Arquivo: ${meta.file_name}` : null),
        details: meta.file_name ? `Documento: ${meta.file_name}` : null,
      });
    }
  }

  // 2. Processos criados no ciclo (para garantir integridade se o ledger não tiver todas as entradas históricas)
  const { data: procs } = await supabase
    .from("processes")
    .select("id, title, process_type, protocol_number, created_at, customer:customers!processes_customer_id_fkey(name)")
    .eq("company_id", companyId)
    .gte("created_at", cycleStartIso)
    .lte("created_at", cycleEndIso)
    .order("created_at", { ascending: false });

  if (procs && procs.length > 0) {
    const existingProcIds = new Set(
      entries.filter(e => e.operationType === "process_creation").map(e => e.processId)
    );

    for (const p of procs) {
      if (!existingProcIds.has(p.id)) {
        entries.push({
          id: `proc-${p.id}`,
          date: p.created_at,
          userName: "Operador",
          operation: "Novo processo criado",
          operationType: "process_creation",
          consumedAmount: 1,
          unitLabel: "processo",
          isExempt: false,
          processId: p.id,
          processTitle: p.title || p.process_type || "Processo Náutico",
          details: `Cliente: ${(p as any).customer?.name || "Cadastrado"}`,
        });
      }
    }
  }

  // Ordenar cronologicamente decrescente
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return entries;
}
