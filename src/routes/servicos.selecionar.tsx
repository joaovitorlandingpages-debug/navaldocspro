import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Check, 
  Info, 
  Loader2, 
  AlertCircle, 
  User, 
  Ship, 
  Plus, 
  ChevronDown,
  X,
  FileCheck2,
  ShieldCheck
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos/selecionar")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as "profissional" | "esporte_recreio") || "esporte_recreio",
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    from: (search.from as string) || undefined,
    preview: (search.preview as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <SelecionarServicosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone náutico para a categoria esporte e recreio
function SpeedboatBadgeIcon({ className = "w-4 h-4 text-[#075BFF]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18.5L9 24C14 26 34 26 39 24L42 18.5H6Z" />
      <path d="M12 18.5L14 13H34L36 18.5" />
      <path d="M24 13V6" />
      <path d="M24 7L31 10H24" />
    </svg>
  );
}

// Ícone náutico para a categoria profissional
function ProfessionalBadgeIcon({ className = "w-4 h-4 text-[#075BFF]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 36" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 27L8 31C16 33 32 33 40 31L44 27H4Z" />
      <path d="M12 27L15 20H33L36 27" />
      <path d="M18 20V14H30V20" />
      <path d="M24 14V9" />
    </svg>
  );
}

// Catálogo oficial dos serviços náuticos do NavalDocs Pro
const OFFICIAL_SERVICES = [
  {
    id: "alteracao_cadastral",
    name: "Alteração de dados cadastrais",
    category: "all",
    description: "Atualizar dados do proprietário ou da embarcação junto à capitania.",
  },
  {
    id: "renovacao_inscricao",
    name: "Renovação de inscrição",
    category: "all",
    description: "Renovar o TIE/TIEM ou documento de registro de embarcação.",
  },
  {
    id: "transferencia_propriedade",
    name: "Transferência de propriedade",
    category: "all",
    description: "Registrar a mudança de titularidade e proprietário da embarcação.",
  },
  {
    id: "inscricao_embarcacao",
    name: "Inscrição de embarcação",
    category: "all",
    description: "Primeiro registro e atribuição do número de inscrição na Capitania.",
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento (TIE / TIEM)",
    category: "all",
    description: "Solicitar nova via de documento por perda, roubo ou extravio.",
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor / Dados técnicos",
    category: "all",
    description: "Registrar troca ou alteração de potência de motor da embarcação.",
  },
  {
    id: "vistoria_tecnica",
    name: "Vistoria e perícia técnica",
    category: "all",
    description: "Agendamento e confecção de documentação para vistoria oficial.",
  },
  {
    id: "cancelamento_inscricao",
    name: "Cancelamento de inscrição",
    category: "all",
    description: "Baixa ou cancelamento definitivo do registro da embarcação.",
  },
  {
    id: "laudo_engenharia",
    name: "Laudo de estabilidade e engenharia naval",
    category: "profissional",
    description: "Emissão de ART e laudo técnico naval para embarcações comerciais.",
  },
  {
    id: "despacho_maritimo",
    name: "Despacho e registro de tripulação / CTS",
    category: "profissional",
    description: "Documentação de despacho e cartões de tripulação de segurança.",
  },
];

function SelecionarServicosPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const currentCategory = searchParams.category || "esporte_recreio";
  const categoryLabel = currentCategory === "profissional" 
    ? "Embarcações profissionais" 
    : "Esporte e recreio";

  // Estados principais
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isError, setIsError] = useState(false);

  // Seleções do formulário
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(searchParams.customerId || "");
  const [selectedVesselId, setSelectedVesselId] = useState<string>(searchParams.vesselId || "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(["transferencia_propriedade"]);
  const [serviceSearch, setServiceSearch] = useState("");

  // Modal de Revisão e Criação
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);

  // 1. Carregar Clientes e Embarcações da empresa
  const loadInitialData = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingData(true);
    setIsError(false);

    try {
      // Clientes
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("id, name, cpf_cnpj, email, phone")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (custError) throw custError;

      // Embarcações
      const { data: vesData, error: vesError } = await supabase
        .from("vessels")
        .select("id, name, registration_number, category, vessel_type, customer_id")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (vesError) throw vesError;

      setCustomers(custData || []);
      setVessels(vesData || []);

      // Se passou customerId ou vesselId na URL, inicializa
      if (searchParams.customerId) {
        setSelectedCustomerId(searchParams.customerId);
      }
      if (searchParams.vesselId) {
        setSelectedVesselId(searchParams.vesselId);
        // Se a embarcação tiver customer_id, seleciona automaticamente o cliente
        const foundVessel = (vesData || []).find((v) => v.id === searchParams.vesselId);
        if (foundVessel?.customer_id && !searchParams.customerId) {
          setSelectedCustomerId(foundVessel.customer_id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados para seleção de serviços:", err);
      setIsError(true);
    } finally {
      setIsLoadingData(false);
    }
  }, [companyId, searchParams.customerId, searchParams.vesselId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Embarcações disponíveis para o cliente selecionado e compatíveis
  const availableVessels = useMemo(() => {
    if (!selectedCustomerId) return [];
    return vessels.filter((v) => v.customer_id === selectedCustomerId);
  }, [vessels, selectedCustomerId]);

  // Lista de Serviços filtrados por Categoria e Busca
  const filteredServices = useMemo(() => {
    // 1. Filtrar por Categoria
    let list = OFFICIAL_SERVICES.filter((svc) => {
      if (svc.category === "all") return true;
      if (currentCategory === "profissional") {
        return svc.category === "profissional" || svc.category === "all";
      }
      return svc.category === "esporte_recreio" || svc.category === "all";
    });

    // 2. Filtrar por Termo de Busca
    if (serviceSearch.trim()) {
      const term = serviceSearch.toLowerCase().trim();
      list = list.filter((svc) => svc.name.toLowerCase().includes(term));
    }

    // 3. Ordenação alfabética
    list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return list;
  }, [currentCategory, serviceSearch]);

  // Troca de Cliente: limpa a embarcação selecionada
  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    setSelectedVesselId("");
  };

  // Toggle de Serviço
  const toggleService = (svcId: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(svcId)) {
        return prev.filter((id) => id !== svcId);
      } else {
        return [...prev, svcId];
      }
    });
  };

  // Objetos Selecionados
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const selectedVessel = useMemo(() => {
    return vessels.find((v) => v.id === selectedVesselId);
  }, [vessels, selectedVesselId]);

  const selectedServicesList = useMemo(() => {
    return OFFICIAL_SERVICES.filter((svc) => selectedServiceIds.includes(svc.id));
  }, [selectedServiceIds]);

  // Validação para avançar para Revisão
  const canReview = useMemo(() => {
    return selectedCustomerId !== "" && selectedVesselId !== "" && selectedServiceIds.length > 0;
  }, [selectedCustomerId, selectedVesselId, selectedServiceIds]);

  // Avançar para a Tela 18 (Documentos do serviço)
  const handleContinueToDocuments = () => {
    if (!canReview) return;
    navigate({
      to: "/servicos/documentos",
      search: {
        category: currentCategory,
        customerId: selectedCustomerId,
        vesselId: selectedVesselId,
        services: selectedServiceIds.join(","),
        activeServiceId: selectedServiceIds[0] || "",
        ...(searchParams.preview ? { preview: searchParams.preview } : {}),
      },
    });
  };

  // Ação de Criar Processo diretamente do modal de revisão
  const handleConfirmCreateProcess = async () => {
    if (!companyId || !selectedCustomerId || !selectedVesselId || selectedServiceIds.length === 0) {
      toast.error("Selecione o cliente, a embarcação e ao menos um serviço.");
      return;
    }

    setIsCreatingProcess(true);
    try {
      const primaryService = selectedServicesList[0];
      const title = `${primaryService?.name || "Processo Náutico"} - ${selectedVessel?.name || "Embarcação"}`;

      const { data: newProc, error } = await supabase
        .from("processes")
        .insert({
          company_id: companyId,
          customer_id: selectedCustomerId,
          vessel_id: selectedVesselId,
          title: title,
          status: "in_progress",
          metadata: {
            selected_services: selectedServiceIds,
            category: currentCategory,
            created_via: "servicos_selecionar",
          }
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Processo criado com sucesso!", {
        description: "Você será direcionado para os detalhes do processo."
      });
      setIsReviewModalOpen(false);

      navigate({
        to: "/processes/$id",
        params: { id: newProc.id },
      });
    } catch (err: any) {
      console.error("Erro ao criar processo:", err);
      toast.error(err?.message || "Não foi possível criar o processo.");
    } finally {
      setIsCreatingProcess(false);
    }
  };

  // Estados de Carregamento e Erro Inicial
  if (isLoadingData) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-32 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Erro ao carregar dados</h2>
        <p className="text-sm text-slate-500">
          Não foi possível consultar os clientes e embarcações da empresa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={loadInitialData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR */}
      <div>
        <Link
          to="/servicos"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar às categorias</span>
        </Link>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA + BADGE DE CATEGORIA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Selecionar serviços
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Escolha o cliente, a embarcação e os serviços que deseja realizar.
          </p>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#EEF4FF] text-[#075BFF] text-xs font-semibold border border-blue-100 shadow-2xs">
            {currentCategory === "profissional" ? (
              <ProfessionalBadgeIcon className="h-4 w-4 text-[#075BFF]" />
            ) : (
              <SpeedboatBadgeIcon className="h-4 w-4 text-[#075BFF]" />
            )}
            <span>{categoryLabel}</span>
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO 1: CLIENTE E EMBARCAÇÃO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#0B1739]">
          Cliente e embarcação
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Seletor de Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all cursor-pointer"
              >
                <option value="">Selecione o cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fantasy_name || c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Seletor de Embarcação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Embarcação <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                disabled={!selectedCustomerId}
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCustomerId 
                    ? "Selecione primeiro o cliente" 
                    : availableVessels.length === 0 
                    ? "Nenhuma embarcação cadastrada para este cliente"
                    : "Selecione a embarcação"}
                </option>
                {availableVessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.registration_number ? `(${v.registration_number})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Somente embarcações vinculadas ao cliente selecionado.
            </p>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO 2: SERVIÇOS DISPONÍVEIS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0B1739]">
            Serviços disponíveis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Você pode selecionar mais de um serviço.
          </p>
        </div>

        {/* Campo de Pesquisa de Serviços */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Pesquisar serviço..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
          />
          {serviceSearch && (
            <button
              type="button"
              onClick={() => setServiceSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista de Serviços com Checkbox */}
        <div className="space-y-2 pt-1">
          {filteredServices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Nenhum serviço encontrado com os termos pesquisados.
            </div>
          ) : (
            filteredServices.map((svc) => {
              const isSelected = selectedServiceIds.includes(svc.id);

              return (
                <div
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleService(svc.id);
                    }
                  }}
                  className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-[#075BFF]/40 bg-[#EEF4FF]/70 shadow-2xs"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  {/* Caixa do Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? "bg-[#075BFF] border-[#075BFF] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  {/* Nome do Serviço */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${
                      isSelected ? "text-[#0B1739]" : "text-slate-700"
                    }`}>
                      {svc.name}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. RODAPÉ FIXO / BARRA INFERIOR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-[#0B1739]">
            {selectedServiceIds.length === 1 
              ? "1 serviço selecionado" 
              : `${selectedServiceIds.length} serviços selecionados`}
          </p>
          <p className="text-xs text-slate-400">
            O processo será criado somente após a confirmação na próxima etapa.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <Link
            to="/servicos"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Voltar
          </Link>

          <button
            type="button"
            disabled={!canReview}
            onClick={handleContinueToDocuments}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span>Continuar para documentos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE REVISÃO E CONFIRMAÇÃO DO PROCESSO */}
      {/* ========================================================================= */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Revisar seleção do serviço
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Confira os dados antes de iniciar o processo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Resumo do Cliente e Embarcação */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Cliente:</span>
                <span className="font-bold text-[#0B1739]">{selectedCustomer?.fantasy_name || selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Embarcação:</span>
                <span className="font-bold text-[#0B1739]">{selectedVessel?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Categoria:</span>
                <span className="font-medium text-slate-700">{categoryLabel}</span>
              </div>
            </div>

            {/* Lista dos Serviços Selecionados */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Serviços a iniciar ({selectedServicesList.length})
              </p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                {selectedServicesList.map((svc) => (
                  <div key={svc.id} className="p-3 flex items-center gap-2.5 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-[#075BFF] shrink-0" />
                    <span className="font-medium truncate">{svc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isCreatingProcess}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Voltar e editar
            </button>
            <button
              type="button"
              onClick={handleConfirmCreateProcess}
              disabled={isCreatingProcess}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isCreatingProcess ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando processo...</span>
                </>
              ) : (
                <span>Confirmar e iniciar</span>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
