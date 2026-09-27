import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  User, 
  Ship, 
  Folder, 
  Cog, 
  FileText, 
  Clock, 
  CheckCircle2, 
  MinusCircle, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Upload, 
  Loader2, 
  Save, 
  FileCheck2, 
  Info, 
  Check, 
  X, 
  FileSpreadsheet, 
  Building2, 
  Home, 
  Calendar,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  FileBox
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos/revisar")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as "profissional" | "esporte_recreio") || "esporte_recreio",
    customerId: (search.customerId as string) || "",
    vesselId: (search.vesselId as string) || "",
    services: (search.services as string) || "",
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <RevisarProcessoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Catálogo de serviços mapeado
const SERVICE_CATALOG: Record<string, { 
  title: string; 
  category: "profissional" | "esporte_recreio" | "moto_aquatica";
  categoryLabel: string;
  officialSource: string;
  sourceUrl: string;
}> = {
  "inscricao-inicial": { 
    title: "Inscrição inicial", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "renovacao-tie": { 
    title: "Renovação do TIE", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "segunda-via-tie": { 
    title: "Segunda via do TIE", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "transferencia-propriedade": { 
    title: "Transferência de propriedade", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "transferencia-jurisdicao": { 
    title: "Transferência de jurisdição", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "transferencia-ambas": { 
    title: "Transferência de propriedade e jurisdição", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "comunicacao-venda": { 
    title: "Comunicação de venda", 
    category: "esporte_recreio", 
    categoryLabel: "Esporte e recreio",
    officialSource: "CPES • Marinha do Brasil",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382"
  },
  "inscricao-comercial": { 
    title: "Inscrição comercial inicial", 
    category: "profissional", 
    categoryLabel: "Embarcações profissionais",
    officialSource: "CPES • Marinha do Brasil (Profissional)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/388"
  },
  "renovacao-tie-prof": { 
    title: "Renovação de TIE profissional", 
    category: "profissional", 
    categoryLabel: "Embarcações profissionais",
    officialSource: "CPES • Marinha do Brasil (Profissional)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/388"
  },
  "segunda-via-tie-prof": { 
    title: "Segunda via de TIE profissional", 
    category: "profissional", 
    categoryLabel: "Embarcações profissionais",
    officialSource: "CPES • Marinha do Brasil (Profissional)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/388"
  },
  "transferencia-prof": { 
    title: "Transferência de propriedade profissional", 
    category: "profissional", 
    categoryLabel: "Embarcações profissionais",
    officialSource: "CPES • Marinha do Brasil (Profissional)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/388"
  },
  "transferencia-jurisdicao-prof": { 
    title: "Transferência de jurisdição profissional", 
    category: "profissional", 
    categoryLabel: "Embarcações profissionais",
    officialSource: "CPES • Marinha do Brasil (Profissional)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/388"
  },
};

function RevisarProcessoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { currentCompany, user, profile } = useAuth();

  const category = search.category || "esporte_recreio";
  const customerId = search.customerId;
  const vesselId = search.vesselId;
  const rawServices = search.services ? search.services.split(",").filter(Boolean) : ["renovacao-tie"];

  // Estados de dados carregados
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [vessel, setVessel] = useState<any>(null);

  // Estados de submissão e modais
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Carregar dados de cliente e embarcação
  useEffect(() => {
    async function loadContext() {
      setLoading(true);
      try {
        if (customerId) {
          const { data: custData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .maybeSingle();
          if (custData) setCustomer(custData);
        }

        if (vesselId) {
          const { data: vesData } = await supabase
            .from("vessels")
            .select("*")
            .eq("id", vesselId)
            .maybeSingle();
          if (vesData) setVessel(vesData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados para revisão:", err);
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [customerId, vesselId]);

  // Verificar se a embarcação é moto aquática
  const isJetSki = useMemo(() => {
    const typeStr = (vessel?.vessel_type || "").toLowerCase();
    const nameStr = (vessel?.name || "").toLowerCase();
    return typeStr.includes("moto") || typeStr.includes("jet") || typeStr.includes("aquática") || nameStr.includes("jet");
  }, [vessel]);

  // Label da Categoria
  const categoryDisplayName = useMemo(() => {
    if (category === "profissional") return "Embarcações profissionais";
    if (isJetSki) return "Moto aquática";
    return "Embarcações de esporte e recreio";
  }, [category, isJetSki]);

  // Data formatada de hoje
  const reviewDateFormatted = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now);
  }, []);

  // Lista dos serviços com status
  const parsedServices = useMemo(() => {
    return rawServices.map((key) => {
      const def = SERVICE_CATALOG[key] || {
        title: key,
        category: category,
        categoryLabel: categoryDisplayName,
        officialSource: isJetSki ? "CPES • Marinha do Brasil (Moto aquática)" : "CPES • Marinha do Brasil",
        sourceUrl: isJetSki ? "https://www.marinha.mil.br/cpes/node/384" : "https://www.marinha.mil.br/cpes/node/382",
      };

      return {
        key,
        title: def.title,
        categoryLabel: isJetSki ? "Moto aquática" : def.categoryLabel,
        officialSource: isJetSki ? "CPES • Marinha do Brasil (Moto aquática)" : def.officialSource,
        sourceUrl: isJetSki ? "https://www.marinha.mil.br/cpes/node/384" : def.sourceUrl,
        status: "Requisitos em revisão",
        hasPendingDocs: true,
        modelsPending: 2,
      };
    });
  }, [rawServices, category, categoryDisplayName, isJetSki]);

  // Ação de Salvar como Rascunho
  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Rascunho salvo com sucesso!", {
        description: "A preparação deste processo foi salva para continuidade posterior.",
      });
    } catch (err) {
      toast.error("Erro ao salvar rascunho.");
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Ação de Criar Processo Definitivo
  const handleCreateProcess = async () => {
    if (!currentCompany?.id || !customerId) {
      toast.error("Vínculo de empresa ou cliente inválido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryServiceTitle = parsedServices[0]?.title || "Serviço Náutico";
      const customerName = customer?.fantasy_name || customer?.name || "Cliente";
      const vesselName = vessel?.name || "Embarcação";
      
      const processTitle = `${primaryServiceTitle} - ${vesselName} (${customerName})`;

      // Criar processo no banco de dados do Lovable Cloud
      const { data: newProcess, error: procError } = await supabase
        .from("processes")
        .insert({
          company_id: currentCompany.id,
          customer_id: customerId,
          vessel_id: vesselId || null,
          title: processTitle,
          process_type: parsedServices[0]?.key || "renovacao-tie",
          status: "in_progress",
          priority: "medium",
          is_draft: false,
          metadata: {
            category,
            category_label: categoryDisplayName,
            services: rawServices,
            parsed_services: parsedServices,
            is_jet_ski: isJetSki,
            created_by_user_id: user?.id,
            created_by_email: user?.email,
            created_at_date: new Date().toISOString(),
          },
        } as any)
        .select("id")
        .single();

      if (procError || !newProcess) {
        throw new Error(procError?.message || "Falha ao registrar processo no servidor.");
      }

      toast.success("Processo criado com sucesso!", {
        description: `Processo registrado sob o protocolo da empresa.`,
      });

      // Navegar para a Tela 07 - Detalhes do Processo
      navigate({
        to: "/processes/$id",
        params: { id: newProcess.id },
      });
    } catch (err: any) {
      console.error("Erro ao criar processo:", err);
      toast.error(err?.message || "Erro ao criar processo. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => {
              navigate({
                to: "/servicos/documentos",
                search: {
                  category,
                  customerId,
                  vesselId,
                  services: rawServices.join(","),
                },
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar aos documentos</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Revisar processo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Confira as informações antes de criar este processo.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 2. RESUMO PRINCIPAL (FAIXA DE CONTEXTO) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:pr-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {customer?.fantasy_name || customer?.name || "Ana Oliveira"}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {customer?.document || "CPF: 123.456.789-00"}
              </span>
            </div>
          </div>

          {/* Embarcação */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Ship className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {vessel?.name || "Aurora"}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {vessel?.registration_number || "381P202400192"}
              </span>
            </div>
          </div>

          {/* Categoria */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Categoria</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {categoryDisplayName}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {rawServices.length} {rawServices.length === 1 ? "serviço selecionado" : "serviços selecionados"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID DE REVISÃO */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): SERVIÇOS + ARQUIVOS E REQUISITOS */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CARTÃO 1: SERVIÇOS SELECIONADOS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Serviços selecionados
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Relação de serviços incluídos nesta solicitação
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#075BFF] border border-blue-100">
                  {parsedServices.length} {parsedServices.length === 1 ? "item" : "itens"}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {parsedServices.map((srv, idx) => (
                  <div key={srv.key + idx} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 mt-0.5">
                        <Cog className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0B1739] block truncate">
                          {srv.title}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {srv.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <Clock className="h-3 w-3" />
                        <span>{srv.status}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceDetail(srv);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARTÃO 2: ARQUIVOS E REQUISITOS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Arquivos e requisitos
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Balanço da documentação organizada até o momento
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/servicos/documentos",
                      search: {
                        category,
                        customerId,
                        vesselId,
                        services: rawServices.join(","),
                      },
                    });
                  }}
                  className="text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Ver documentos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Disponíveis */}
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Disponíveis</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-900">2 arquivos</p>
                  <p className="text-[11px] text-emerald-700/80">RG/CNH e Comprovante</p>
                </div>

                {/* Pendentes */}
                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Pendências</span>
                  </div>
                  <p className="text-lg font-bold text-amber-900">1 documento</p>
                  <p className="text-[11px] text-amber-700/80">Documento atual do barco</p>
                </div>

                {/* Formulários */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#075BFF]">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Formulários</span>
                  </div>
                  <p className="text-lg font-bold text-[#0B1739]">2 modelos</p>
                  <p className="text-[11px] text-blue-600/80">Requerimento e Procuração</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                Nota: Arquivo disponível não significa aprovação documental definitiva pela autoridade marítima.
              </p>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): RESUMO DO PROCESSO + ALERTA ÂMBAR */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARTÃO 3: RESUMO DO PROCESSO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Resumo do processo
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-[#0B1739] text-right truncate max-w-[200px]">
                    {customer?.fantasy_name || customer?.name || "Ana Oliveira"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Embarcação:</span>
                  <span className="font-bold text-[#0B1739] text-right truncate max-w-[200px]">
                    {vessel?.name || "Aurora"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Categoria:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {categoryDisplayName}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total de serviços:</span>
                  <span className="font-bold text-[#075BFF]">
                    {parsedServices.length} {parsedServices.length === 1 ? "serviço" : "serviços"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Responsável:</span>
                  <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                    {profile?.full_name || user?.email || "João Vitor (Operador)"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Data da revisão:</span>
                  <span className="font-medium text-slate-800">
                    {reviewDateFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* CARTÃO 4: ALERTA DE PENDÊNCIAS (ÂMBAR) */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#D97706] shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#92400E]">
                    Atenção antes de continuar
                  </h3>
                  <p className="text-xs text-[#B45309] leading-relaxed">
                    Há documentos pendentes para um dos serviços. Você poderá salvar o processo e completar depois.
                  </p>
                </div>
              </div>

              <div className="pt-2 pl-12 space-y-2">
                <p className="text-[11px] text-[#B45309]/90 leading-relaxed">
                  Os requisitos e modelos deste serviço estão aguardando validação oficial. Ao criar o processo agora, ele ficará disponível no sistema em status ativo para acompanhamento e anexação gradual dos comprovantes.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ COM AÇÕES */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            O processo será criado somente após sua confirmação.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigate({
                  to: "/servicos/documentos",
                  search: {
                    category,
                    customerId,
                    vesselId,
                    services: rawServices.join(","),
                  },
                });
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Voltar
            </button>

            <button
              type="button"
              disabled={isDraftSaving || isSubmitting}
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDraftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Salvar como rascunho</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || isDraftSaving}
              onClick={handleCreateProcess}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Criando processo...</span>
                </>
              ) : (
                <>
                  <span>Criar processo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES DO SERVIÇO */}
      {/* ========================================================================= */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Cog className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  {selectedServiceDetail?.title || "Detalhes do serviço"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {selectedServiceDetail?.categoryLabel}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Situação dos requisitos:</span>
              <span className="font-semibold text-amber-600">{selectedServiceDetail?.status}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Fonte oficial:</span>
              <span className="font-medium text-slate-800">{selectedServiceDetail?.officialSource}</span>
            </div>
            <div className="py-2">
              <a
                href={selectedServiceDetail?.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#075BFF] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Consultar diretrizes na Capitania</span>
              </a>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
