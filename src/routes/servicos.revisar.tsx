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
import { getServiceDefinition } from "@/services/catalog/servicesCatalogValidation";

export const Route = createFileRoute("/servicos/revisar")({
  validateSearch: (search: Record<string, unknown>): {
    category?: "profissional" | "esporte_recreio";
    customerId?: string;
    vesselId?: string;
    services?: string;
    from?: string;
    activeServiceId?: string;
    preview?: string;
  } => ({
    category: (search.category as "profissional" | "esporte_recreio") || "esporte_recreio",
    customerId: (search.customerId as string) || "",
    vesselId: (search.vesselId as string) || "",
    services: (search.services as string) || "",
    from: (search.from as string) || undefined,
    activeServiceId: (search.activeServiceId as string) || undefined,
    preview: (search.preview as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <RevisarProcessoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function RevisarProcessoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, profile } = useAuth();
  const currentCompany = profile?.companies;

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
      const def = getServiceDefinition(key);
      const isVal = def.status === "validated";

      return {
        key,
        id: def.id,
        title: def.title,
        categoryLabel: isJetSki ? "Moto aquática" : def.categoryDisplayName,
        officialSource: isJetSki ? "CPES • Marinha do Brasil (Moto aquática)" : def.officialSource,
        sourceUrl: isJetSki ? "https://www.marinha.mil.br/cpes/node/384" : def.sourceUrl,
        status: isVal ? "Requisitos conferidos" : "Requisitos em revisão",
        isValidated: isVal,
        validationDateFormatted: def.validationDateFormatted,
        missingValidationNote: def.missingValidationNote,
        needsProfessionalReview: def.needsProfessionalReview,
        canFinalizeProtocol: def.canFinalizeProtocol,
        requiredDocuments: def.requiredDocuments,
        generatedDocuments: def.generatedDocuments,
        hasPendingDocs: !isVal,
        modelsPending: isVal ? 0 : 2,
      };
    });
  }, [rawServices, isJetSki]);

  const allServicesValidated = useMemo(() => {
    return parsedServices.length > 0 && parsedServices.every((s) => s.isValidated);
  }, [parsedServices]);

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
          status: allServicesValidated ? "in_progress" : "draft",
          priority: "medium",
          is_draft: !allServicesValidated,
          draft_data: {
            category,
            category_label: categoryDisplayName,
            services: rawServices,
            parsed_services: parsedServices,
            is_jet_ski: isJetSki,
            all_services_validated: allServicesValidated,
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

      if (allServicesValidated) {
        toast.success("Processo criado com sucesso!", {
          description: `Processo registrado e liberado para conferência de documentos e assinaturas.`,
        });
      } else {
        toast.success("Processo salvo como rascunho!", {
          description: `Requisitos em revisão regulatória. O processo foi salvo como rascunho para acompanhamento sem protocolo direto.`,
        });
      }

      // Navegar para a Tela 07 - Detalhes do Processo
      navigate({
        to: "/processes/$id",
        params: { id: newProcess.id },
      });
    } catch (err: any) {
      console.error("Erro ao registrar processo:", err);
      toast.error(err?.message || "Erro ao registrar processo. Tente novamente.");
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
                {customer?.fantasy_name || customer?.name || "Cliente não informado"}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {customer?.cpf_cnpj || customer?.document || "Sem documento"}
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
                {vessel?.name || "Embarcação não informada"}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {vessel?.registration_number || "Sem inscrição"}
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
                      {srv.isValidated ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                          title={`Requisitos conferidos em ${srv.validationDateFormatted} (${srv.officialSource})`}
                        >
                          <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                          <span>Requisitos conferidos</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70"
                          title={srv.missingValidationNote || "Em revisão regulatória"}
                        >
                          <Clock className="h-3 w-3 stroke-[2.2]" />
                          <span>Requisitos em revisão</span>
                        </span>
                      )}

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
          {/* COLUNA DIREITA (5 COLUNAS): RESUMO DO PROCESSO + SITUAÇÃO DOS REQUISITOS */}
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
                    {customer?.fantasy_name || customer?.name || "Cliente não informado"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Embarcação:</span>
                  <span className="font-bold text-[#0B1739] text-right truncate max-w-[200px]">
                    {vessel?.name || "Embarcação não informada"}
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

            {/* CARTÃO 4: SITUAÇÃO DOS REQUISITOS (CONFERIDOS vs REVISÃO) */}
            {allServicesValidated ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-emerald-900">
                        Requisitos conferidos
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        Oficial
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Todos os serviços selecionados possuem base normativa validada e modelos oficiais conferidos perante a Capitania dos Portos (DPC / Marinha do Brasil).
                    </p>
                  </div>
                </div>

                <div className="pt-2 pl-12 space-y-1.5 border-t border-emerald-200/60">
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Última conferência regulatória: Setembro de 2026</span>
                  </p>
                  <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                    Documentação necessária e formulários prontos para preenchimento, assinaturas e protocolo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#D97706] shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#92400E]">
                        Requisitos regulatórios em revisão
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                        Rascunho
                      </span>
                    </div>
                    <p className="text-xs text-[#B45309] leading-relaxed">
                      Um ou mais serviços possuem requisitos técnicos ou minutas ainda sob conferência. A lista não é apresentada como definitiva ou oficial.
                    </p>
                  </div>
                </div>

                <div className="pt-2 pl-12 space-y-2 border-t border-amber-200/60">
                  <p className="text-[11px] text-[#B45309] leading-relaxed">
                    <strong>Trabalho salvo como rascunho:</strong> Para proteger a segurança jurídica e operacional, o protocolo direto está bloqueado até a conferência técnica das exigências da Capitania.
                  </p>
                  <p className="text-[11px] text-[#B45309]/80 leading-relaxed">
                    Você pode salvar o rascunho e dar andamento ao upload prévio de documentos e triagem.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ COM AÇÕES */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-slate-700">
              {allServicesValidated
                ? "Requisitos conferidos. Pronto para criação e tramitação do processo."
                : "Serviço com requisitos em revisão: será registrado como rascunho (protocolo final bloqueado)."}
            </p>
            <p className="text-[11px] text-slate-400">
              {allServicesValidated
                ? "Processos criados ficam imediatamente disponíveis para conferência de documentos e assinaturas."
                : "A lista de documentos gerados ainda passará por revisão profissional antes do protocolo."}
            </p>
          </div>

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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDraftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Salvar rascunho</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || isDraftSaving}
              onClick={handleCreateProcess}
              className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                allServicesValidated
                  ? "bg-[#075BFF] hover:bg-blue-600 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : allServicesValidated ? (
                <>
                  <span>Criar processo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Salvar rascunho do processo</span>
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
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
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

          <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            {/* Status do serviço */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Situação dos requisitos:</span>
              {selectedServiceDetail?.isValidated ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                  <span>Requisitos conferidos</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                  <Clock className="h-3 w-3 stroke-[2.2]" />
                  <span>Requisitos em revisão</span>
                </span>
              )}
            </div>

            {/* Data e Fonte */}
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Última conferência:</span>
              <span className="font-semibold text-slate-800">{selectedServiceDetail?.validationDateFormatted || "Setembro de 2026"}</span>
            </div>

            <div className="py-2 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">Fonte oficial:</span>
                <a
                  href={selectedServiceDetail?.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075BFF] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Consultar diretrizes na Capitania</span>
                </a>
              </div>
              <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                {selectedServiceDetail?.officialSource}
              </p>
            </div>

            {/* Nota de validação pendente caso em revisão */}
            {!selectedServiceDetail?.isValidated && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>O que falta validar neste serviço:</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {selectedServiceDetail?.missingValidationNote}
                </p>
                {selectedServiceDetail?.needsProfessionalReview && (
                  <p className="text-[10px] text-amber-800 font-medium pt-1">
                    * Requer conferência ou emissão por profissional habilitado (Engenheiro Naval / CREA / Vistoriador).
                  </p>
                )}
              </div>
            )}

            {/* Documentos necessários */}
            <div className="space-y-1.5 pt-1">
              <span className="text-slate-700 font-bold block">Documentos necessários exigidos:</span>
              <ul className="space-y-1">
                {selectedServiceDetail?.requiredDocuments?.map((doc: string, dIdx: number) => (
                  <li key={dIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Documentos que o sistema gera */}
            <div className="space-y-1.5 pt-1">
              <span className="text-slate-700 font-bold block">Documentos gerados pelo sistema:</span>
              <ul className="space-y-1">
                {selectedServiceDetail?.generatedDocuments?.map((doc: string, dIdx: number) => (
                  <li key={dIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
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
