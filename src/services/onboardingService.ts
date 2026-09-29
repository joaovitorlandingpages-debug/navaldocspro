import { supabase } from "@/integrations/supabase/client";

export interface OnboardingStep {
  id: "empresa" | "funcionario" | "cliente" | "embarcacao" | "processo" | "documento";
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  completed: boolean;
  actionText: string;
  actionPath: string;
  actionSearch?: Record<string, string>;
  detectedInfo?: string | null;
}

export interface OnboardingProgress {
  totalSteps: number;
  completedCount: number;
  percent: number;
  allCompleted: boolean;
  nextStep: OnboardingStep | null;
  steps: OnboardingStep[];
  companyName?: string;
}

/**
 * Consulta o progresso real salvo no banco de dados para a empresa.
 * Não marca nenhuma etapa como concluída sem validação dos dados reais salvos.
 */
export async function getCompanyOnboardingProgress(companyId: string): Promise<OnboardingProgress> {
  if (!companyId) {
    return createEmptyProgress();
  }

  try {
    // 1. Consultar dados da empresa (tabela companies)
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, cnpj, phone, email, logo_url")
      .eq("id", companyId)
      .maybeSingle();

    // 2. Consultar funcionários da empresa (profiles e metadata.employees)
    const [
      { data: profilesStaff },
      { data: customersList, count: customersCount },
      { data: vesselsList, count: vesselsCount },
      { data: processesList, count: processesCount },
      { data: documentsList, count: documentsCount }
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, role, email")
        .eq("company_id", companyId),
      supabase
        .from("customers")
        .select("id, name, cpf_cnpj, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("vessels")
        .select("id, name, registration_number, customer_id, customer:customers(id, name)")
        .eq("company_id", companyId)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("processes")
        .select("id, title, status, customer_id, vessel_id, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("documents")
        .select("id, document_type, file_url, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    // --- ETAPA 1: Dados da Empresa e Logo ---
    const metadataEmployees = Array.isArray(company?.metadata?.employees) ? company.metadata.employees : [];
    const rawName = company?.name?.trim() || "";
    const isDefaultName = !rawName || rawName === "Minha Empresa" || rawName === "Nova Empresa";
    const hasCompanyDetails = Boolean(
      !isDefaultName && (company?.cnpj || company?.phone || company?.email || company?.logo_url || company?.metadata?.logo_url)
    );
    const step1Completed = hasCompanyDetails;
    let step1Detected: string | null = null;
    if (step1Completed) {
      step1Detected = `${rawName}${company?.cnpj ? ` (CNPJ: ${company.cnpj})` : ""}${company?.logo_url || company?.metadata?.logo_url ? " • Logo anexada" : ""}`;
    }

    // --- ETAPA 2: Funcionário Cadastrado ---
    const activeProfiles = (profilesStaff || []).filter(
      p => p.role !== "client" && p.role !== "customer"
    );
    const totalStaff = metadataEmployees.length + activeProfiles.length;
    const step2Completed = totalStaff > 0;
    let step2Detected: string | null = null;
    if (step2Completed) {
      const firstStaff = metadataEmployees[0] || activeProfiles[0];
      const staffName = firstStaff?.name || firstStaff?.full_name || "Funcionário cadastrado";
      const staffRole = firstStaff?.role || firstStaff?.job_title ? ` (${firstStaff.role || firstStaff.job_title})` : "";
      step2Detected = `${staffName}${staffRole}`;
    }

    // --- ETAPA 3: Primeiro Cliente ---
    const step3Completed = (customersCount || 0) > 0 || (customersList && customersList.length > 0);
    const firstCustomer = customersList && customersList[0];
    let step3Detected: string | null = null;
    if (step3Completed && firstCustomer) {
      step3Detected = `${firstCustomer.name}${firstCustomer.cpf_cnpj ? ` • ${firstCustomer.cpf_cnpj}` : ""}`;
    }

    // --- ETAPA 4: Embarcação Vinculada ao Cliente ---
    const firstVessel = vesselsList && vesselsList[0];
    // Garantir que a embarcação está vinculada a um cliente
    const step4Completed = Boolean(firstVessel && firstVessel.customer_id);
    let step4Detected: string | null = null;
    if (step4Completed && firstVessel) {
      const ownerName = (firstVessel.customer as any)?.name || "Cliente proprietário";
      step4Detected = `${firstVessel.name} • Vinculada a ${ownerName}`;
    }

    // --- ETAPA 5: Escolher Serviço e Abrir Primeiro Processo ---
    const firstProcess = processesList && processesList[0];
    const step5Completed = (processesCount || 0) > 0 || Boolean(firstProcess);
    let step5Detected: string | null = null;
    if (step5Completed && firstProcess) {
      step5Detected = `${firstProcess.title || "Processo náutico aberto"}`;
    }

    // --- ETAPA 6: Revisar Dados e Gerar o PDF ---
    const firstDoc = documentsList && documentsList[0];
    const step6Completed = (documentsCount || 0) > 0 || Boolean(firstDoc) || firstProcess?.status === "concluido";
    let step6Detected: string | null = null;
    if (step6Completed) {
      step6Detected = firstDoc?.document_type || "Documento PDF gerado e pronto";
    }

    // Montagem das 6 etapas
    const steps: OnboardingStep[] = [
      {
        id: "empresa",
        order: 1,
        title: "1. Completar os dados da empresa",
        shortTitle: "Dados da empresa e logo",
        description: "Informe a razão social, CNPJ e inclua a logomarca da sua empresa para que os documentos saiam personalizados.",
        completed: step1Completed,
        actionText: step1Completed ? "Ver dados da empresa" : "Completar dados",
        actionPath: "/settings",
        detectedInfo: step1Detected,
      },
      {
        id: "funcionario",
        order: 2,
        title: "2. Cadastrar um funcionário",
        shortTitle: "Cadastrar funcionário",
        description: "Cadastre o profissional ou despachante responsável que será identificado e assinará as solicitações náuticas.",
        completed: step2Completed,
        actionText: step2Completed ? "Ver funcionários" : "Cadastrar funcionário",
        actionPath: "/configuracoes/funcionarios/novo",
        detectedInfo: step2Detected,
      },
      {
        id: "cliente",
        order: 3,
        title: "3. Cadastrar o primeiro cliente",
        shortTitle: "Cadastrar cliente",
        description: "Cadastre o proprietário ou despachante da embarcação, preenchendo os dados ou enviando CNH/documento para leitura automática.",
        completed: step3Completed,
        actionText: step3Completed ? "Ver clientes" : "Cadastrar cliente",
        actionPath: "/customers/novo",
        detectedInfo: step3Detected,
      },
      {
        id: "embarcacao",
        order: 4,
        title: "4. Vincular uma embarcação ao cliente",
        shortTitle: "Vincular embarcação",
        description: "Cadastre a embarcação (lancha, veleiro, jet ski, etc.) e vincule-a obrigatoriamente ao cliente cadastrado.",
        completed: step4Completed,
        actionText: step4Completed ? "Ver embarcações" : "Cadastrar embarcação",
        actionPath: "/vessels/novo",
        actionSearch: firstCustomer?.id ? { customerId: firstCustomer.id } : undefined,
        detectedInfo: step4Detected,
      },
      {
        id: "processo",
        order: 5,
        title: "5. Escolher um serviço e abrir o primeiro processo",
        shortTitle: "Abrir primeiro processo",
        description: "Escolha a categoria e o serviço náutico desejado (como Inscrição, Transferência ou Renovação de TIE) e inicie o processo.",
        completed: step5Completed,
        actionText: step5Completed ? "Ver processos" : "Iniciar serviço",
        actionPath: step5Completed ? "/processes" : "/servicos",
        detectedInfo: step5Detected,
      },
      {
        id: "documento",
        order: 6,
        title: "6. Revisar os dados e gerar o PDF",
        shortTitle: "Gerar primeiro PDF",
        description: "Confira a prévia do documento com os dados do cliente e da embarcação, selecione o funcionário e baixe o PDF final oficial.",
        completed: step6Completed,
        actionText: step6Completed 
          ? "Ver documentos gerados" 
          : firstProcess?.id 
            ? "Revisar e gerar PDF" 
            : "Abrir processos",
        actionPath: firstProcess?.id 
          ? `/processes/${firstProcess.id}/revisar-documento` 
          : "/processes",
        detectedInfo: step6Detected,
      }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const percent = Math.round((completedCount / steps.length) * 100);
    const allCompleted = completedCount === steps.length;
    const nextStep = steps.find(s => !s.completed) || null;

    return {
      totalSteps: steps.length,
      completedCount,
      percent,
      allCompleted,
      nextStep,
      steps,
      companyName: rawName || "Sua Empresa",
    };
  } catch (error) {
    console.error("Erro ao calcular progresso de Primeiros Passos:", error);
    return createEmptyProgress();
  }
}

function createEmptyProgress(): OnboardingProgress {
  const steps: OnboardingStep[] = [
    {
      id: "empresa",
      order: 1,
      title: "1. Completar os dados da empresa",
      shortTitle: "Dados da empresa e logo",
      description: "Informe a razão social, CNPJ e inclua a logomarca da sua empresa para que os documentos saiam personalizados.",
      completed: false,
      actionText: "Completar dados",
      actionPath: "/settings",
    },
    {
      id: "funcionario",
      order: 2,
      title: "2. Cadastrar um funcionário",
      shortTitle: "Cadastrar funcionário",
      description: "Cadastre o profissional ou despachante responsável que será identificado e assinará as solicitações náuticas.",
      completed: false,
      actionText: "Cadastrar funcionário",
      actionPath: "/configuracoes/funcionarios/novo",
    },
    {
      id: "cliente",
      order: 3,
      title: "3. Cadastrar o primeiro cliente",
      shortTitle: "Cadastrar cliente",
      description: "Cadastre o proprietário ou despachante da embarcação, preenchendo os dados ou enviando CNH/documento para leitura automática.",
      completed: false,
      actionText: "Cadastrar cliente",
      actionPath: "/customers/novo",
    },
    {
      id: "embarcacao",
      order: 4,
      title: "4. Vincular uma embarcação ao cliente",
      shortTitle: "Vincular embarcação",
      description: "Cadastre a embarcação (lancha, veleiro, jet ski, etc.) e vincule-a obrigatoriamente ao cliente cadastrado.",
      completed: false,
      actionText: "Cadastrar embarcação",
      actionPath: "/vessels/novo",
    },
    {
      id: "processo",
      order: 5,
      title: "5. Escolher um serviço e abrir o primeiro processo",
      shortTitle: "Abrir primeiro processo",
      description: "Escolha a categoria e o serviço náutico desejado (como Inscrição, Transferência ou Renovação de TIE) e inicie o processo.",
      completed: false,
      actionText: "Iniciar serviço",
      actionPath: "/servicos",
    },
    {
      id: "documento",
      order: 6,
      title: "6. Revisar os dados e gerar o PDF",
      shortTitle: "Gerar primeiro PDF",
      description: "Confira a prévia do documento com os dados do cliente e da embarcação, selecione o funcionário e baixe o PDF final oficial.",
      completed: false,
      actionText: "Revisar e gerar PDF",
      actionPath: "/processes",
    }
  ];

  return {
    totalSteps: 6,
    completedCount: 0,
    percent: 0,
    allCompleted: false,
    nextStep: steps[0],
    steps,
  };
}

/**
 * Funções auxiliares para gerenciar a visibilidade do Guia na Página Inicial
 */
const STORAGE_PREFIX = "navaldocs_primeiros_passos_dismissed_";

export function isGuideDismissed(companyId?: string | null): boolean {
  if (typeof localStorage === "undefined" || !companyId) return false;
  return localStorage.getItem(`${STORAGE_PREFIX}${companyId}`) === "true";
}

export function setGuideDismissed(companyId: string, dismissed: boolean): void {
  if (typeof localStorage === "undefined" || !companyId) return;
  if (dismissed) {
    localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, "true");
  } else {
    localStorage.removeItem(`${STORAGE_PREFIX}${companyId}`);
  }
}
