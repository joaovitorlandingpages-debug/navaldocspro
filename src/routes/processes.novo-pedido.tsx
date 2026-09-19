import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, Search, Check, Ship, ArrowLeftRight, FileText,
  Wrench, FileCheck, CheckCircle2, ChevronRight, X, Info,
  AlertCircle, Upload, Sparkles, User, Award, FileSpreadsheet,
  UserCheck, Anchor, Loader2, ArrowRight
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/routes/dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/novo-pedido")({
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    preview: (search.preview as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NovoPedidoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Catálogo de serviços oficial do NavalDocs Pro
interface ServiceItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: any;
  requiresVessel: boolean;
  category: "maritimo" | "pessoal" | "tecnico";
}

const SERVICES_CATALOG: ServiceItem[] = [
  {
    id: "inscricao",
    name: "Inscrição de embarcação",
    shortName: "Inscrição",
    description: "Cadastrar uma embarcação no sistema.",
    icon: Ship,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "transferencia",
    name: "Transferência de propriedade",
    shortName: "Transferência",
    description: "Registrar a mudança de proprietário.",
    icon: ArrowLeftRight,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "renovacao",
    name: "Renovação de documento",
    shortName: "Renovação",
    description: "Renovar um documento existente.",
    icon: FileText,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor",
    shortName: "Alteração de motor",
    description: "Atualizar dados do motor da embarcação.",
    icon: Wrench,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "vistoria",
    name: "Vistoria",
    shortName: "Vistoria",
    description: "Organizar a solicitação de vistoria.",
    icon: Search,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento",
    shortName: "Segunda via",
    description: "Emitir uma segunda via.",
    icon: FileCheck,
    requiresVessel: true,
    category: "maritimo",
  },
  // Serviços adicionais do catálogo
  {
    id: "habilitacao_cha",
    name: "Emissão / Renovação de CHA",
    shortName: "Habilitação náutica",
    description: "Carteira de Habilitação de Amador (Arrais, Mestre ou Capitão).",
    icon: Award,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "laudo_engenharia",
    name: "Laudo Técnico Pericial",
    shortName: "Laudo técnico",
    description: "Perícia de estabilidade, arqueação e engenharia naval.",
    icon: FileSpreadsheet,
    requiresVessel: true,
    category: "tecnico",
  },
  {
    id: "alteracao_cadastral",
    name: "Alteração Cadastral",
    shortName: "Alteração cadastral",
    description: "Atualização de endereço ou dados do proprietário.",
    icon: UserCheck,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "despacho_porto",
    name: "Despacho de Saída / Entrada",
    shortName: "Despacho",
    description: "Comunicação de tráfego e autorização na Capitania.",
    icon: Anchor,
    requiresVessel: true,
    category: "maritimo",
  },
];

function NovoPedidoPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/processes/novo-pedido" });
  const { profile } = useAuth();

  // Etapa atual: 1 = Serviços, 2 = Dados, 3 = Documentos, 4 = Revisão e geração
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Seleção múltipla de serviços (armazena os IDs selecionados)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if ((search && search.preview === "true") || (typeof window !== "undefined" && window.location.search.includes("preview=true"))) {
      return ["transferencia", "renovacao", "alteracao_motor"];
    }
    // Tenta recuperar do localStorage se existir rascunho anterior
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_services");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Busca de serviços
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  // Controle para exibir mais serviços do catálogo
  const [showAllServices, setShowAllServices] = useState(false);

  // Dados do pedido (Etapa 2)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(search.customerId || "");
  const [selectedVesselId, setSelectedVesselId] = useState<string>(search.vesselId || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  // Lista de clientes e embarcações do workspace
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Salva rascunho das seleções no localStorage para evitar perda em navegação acidental
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_pedido_draft_services", JSON.stringify(selectedServiceIds));
    }
  }, [selectedServiceIds]);

  // Carrega clientes e embarcações da empresa
  useEffect(() => {
    if (!profile?.company_id) return;

    const loadWorkspaceEntities = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          supabase.from("customers").select("id, name, document_number").eq("company_id", profile.company_id).order("name"),
          supabase.from("vessels").select("id, name, customer_id, registration_number, tie_number").eq("company_id", profile.company_id).order("name"),
        ]);
        if (cRes.data) setCustomers(cRes.data);
        if (vRes.data) setVessels(vRes.data);
      } catch (err) {
        console.error("Erro ao carregar clientes/embarcações:", err);
      }
    };

    loadWorkspaceEntities();
  }, [profile?.company_id]);

  // Filtra embarcações pelo cliente selecionado se aplicável
  const filteredVessels = useMemo(() => {
    if (!selectedCustomerId) return vessels;
    const clientVessels = vessels.filter(v => v.customer_id === selectedCustomerId);
    return clientVessels.length > 0 ? clientVessels : vessels;
  }, [vessels, selectedCustomerId]);

  // Serviços selecionados completos
  const selectedServices = useMemo(() => {
    return SERVICES_CATALOG.filter(s => selectedServiceIds.includes(s.id));
  }, [selectedServiceIds]);

  // Verifica se algum serviço selecionado exige embarcação
  const requiresVessel = useMemo(() => {
    return selectedServices.some(s => s.requiresVessel);
  }, [selectedServices]);

  // Alterna a seleção de um serviço
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  // Remove um serviço pela etiqueta
  const removeService = (serviceId: string) => {
    setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
  };

  // Lista de serviços visíveis considerando a busca e o botão "Ver todos os serviços"
  const visibleServices = useMemo(() => {
    const term = serviceSearchTerm.trim().toLowerCase();
    let list = SERVICES_CATALOG;

    if (!showAllServices && !term) {
      // Exibe os 6 principais da referência por padrão
      list = SERVICES_CATALOG.slice(0, 6);
    }

    if (term) {
      list = SERVICES_CATALOG.filter(
        s => s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
      );
    }

    return list;
  }, [serviceSearchTerm, showAllServices]);

  // Finalizar e criar os processos do pedido
  const handleCreateOrderProcesses = async () => {
    if (!profile?.company_id) {
      toast.error("Você precisa estar em um espaço de trabalho ativo.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Cria um processo individual para cada serviço selecionado, compartilhando cliente e embarcação
      const inserts = selectedServices.map(service => ({
        company_id: profile.company_id,
        customer_id: selectedCustomerId || null,
        vessel_id: service.requiresVessel ? (selectedVesselId || null) : null,
        title: `${service.name}${selectedVesselId ? ` - ${vessels.find(v => v.id === selectedVesselId)?.name || ""}` : ""}`,
        process_type: service.id,
        status: "waiting_docs",
        priority: "normal",
        notes: orderNotes || `Pedido com ${selectedServices.length} serviço(s) unificado(s).`,
      }));

      const { data, error } = await supabase.from("processes").insert(inserts).select();

      if (error) {
        console.error("Erro ao criar processos do pedido:", error);
        toast.error("Não foi possível criar os processos. Tente novamente.");
        return;
      }

      // Limpa rascunho
      if (typeof window !== "undefined") {
        localStorage.removeItem("navaldocs_pedido_draft_services");
      }

      // Notifica os ouvintes da aplicação
      window.dispatchEvent(new CustomEvent("processes:changed"));

      toast.success(`Pedido com ${selectedServices.length} processo(s) criado com sucesso!`);
      navigate({ to: "/processes" });
    } catch (err) {
      console.error("Exceção na criação do pedido:", err);
      toast.error("Erro inesperado ao registrar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6 pb-20">
      {/* 1. CABEÇALHO DA TELA & VOLTAR */}
      <div>
        <Link
          to="/processes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1868db] hover:underline mb-2 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar aos processos</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d36] tracking-tight">
          Novo pedido
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1 font-normal">
          Prepare um ou vários serviços de uma só vez.
        </p>
      </div>

      {/* 2. STEPPER DE ETAPAS */}
      {/* Desktop Stepper */}
      <div className="hidden sm:flex items-center gap-3 py-2 select-none">
        {[
          { num: 1, label: "Serviços" },
          { num: 2, label: "Dados" },
          { num: 3, label: "Documentos" },
          { num: 4, label: "Revisão e geração" },
        ].map((step, idx) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;

          return (
            <div key={step.num} className="flex items-center gap-3 flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => {
                  // Só permite avançar se houver serviços selecionados
                  if (step.num > 1 && selectedServiceIds.length === 0) {
                    toast.info("Selecione pelo menos um serviço para avançar.");
                    return;
                  }
                  setCurrentStep(step.num as any);
                }}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "text-[#1868db]"
                    : isDone
                    ? "text-slate-700"
                    : "text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors",
                    isActive
                      ? "bg-[#1868db] text-white"
                      : isDone
                      ? "bg-blue-100 text-[#1868db]"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.num}
                </div>
                <span className={cn(isActive && "border-b-2 border-[#1868db] pb-0.5")}>
                  {step.label}
                </span>
              </button>

              {idx < 3 && (
                <div className="flex-1 h-px bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (indicador compacto + barra em 4 segmentos) */}
      <div className="sm:hidden space-y-2 select-none">
        <div className="flex items-center justify-between text-xs font-bold text-[#0f1d36]">
          <span>Etapa {currentStep} de 4 · {
            currentStep === 1 ? "Serviços" :
            currentStep === 2 ? "Dados" :
            currentStep === 3 ? "Documentos" : "Revisão e geração"
          }</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          <div className={cn("rounded-full", currentStep >= 1 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 2 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 3 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 4 ? "bg-[#1868db]" : "bg-slate-200")} />
        </div>
      </div>

      {/* 3. CONTEÚDO DA ETAPA 1: SERVIÇOS */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          {/* Título & Descrição da Seleção */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              O que você precisa preparar?
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Selecione os serviços para o mesmo cliente e embarcação.
            </p>
          </div>

          {/* Campo de Busca de Serviços */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1868db] transition-colors" />
            <input
              type="text"
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all"
            />
            {serviceSearchTerm && (
              <button
                type="button"
                onClick={() => setServiceSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grid de Cartões de Serviço com Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const IconComp = service.icon;

              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggleService(service.id);
                    }
                  }}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#1868db]/30",
                    isSelected
                      ? "border-[#1868db] bg-blue-50/20 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "text-[#1868db] bg-blue-50" : "text-[#0f1d36] bg-slate-50"
                    )}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36] leading-snug">
                        {service.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox customizado acessível */}
                  <div className="shrink-0 pl-1">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-[#1868db] border-2 border-[#1868db] text-white"
                          : "border-2 border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link "Ver todos os serviços" */}
          {!serviceSearchTerm && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllServices(!showAllServices)}
                className="text-xs font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllServices ? "Ver menos serviços" : "Ver todos os serviços"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* RESUMO: Contador Dinâmico + Etiquetas Removíveis */}
          <div className="pt-2 space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
              {selectedServiceIds.length === 1
                ? "1 serviço selecionado"
                : `${selectedServiceIds.length} serviços selecionados`}
            </h4>

            {/* Etiquetas / Badges com 'x' para desmarcar */}
            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service) => (
                  <span
                    key={service.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1868db] border border-blue-100/80 animate-in fade-in-50 duration-150"
                  >
                    <span>{service.shortName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(service.id);
                      }}
                      aria-label={`Remover serviço ${service.name}`}
                      className="h-4 w-4 rounded-full hover:bg-blue-200/60 text-[#1868db] inline-flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium italic">
                Nenhum serviço selecionado ainda. Marque um ou mais cartões acima.
              </p>
            )}
          </div>

          {/* Bloco Informativo */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/70 flex items-start gap-3 text-xs text-slate-700">
            <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Preencha os dados uma vez. Os documentos comuns serão reaproveitados.
              </p>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                Ao final, confira e baixe os arquivos por serviço ou em um único ZIP.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/processes" })}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setCurrentStep(2)}
              className={cn(
                "w-full sm:w-auto h-11 px-7 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all",
                selectedServiceIds.length > 0
                  ? "bg-[#1868db] hover:bg-[#1456b8] text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <span>
                {selectedServiceIds.length === 0
                  ? "Selecione pelo menos um serviço"
                  : selectedServiceIds.length === 1
                  ? "Continuar com 1 serviço →"
                  : `Continuar com ${selectedServiceIds.length} serviços →`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA ETAPA 2: DADOS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Dados comuns do pedido
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Associe o cliente e a embarcação para estes {selectedServices.length} serviço(s).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seleção do Cliente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cliente / Requerente *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="">Selecione um cliente...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.document_number ? `(${c.document_number})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Embarcação (se aplicável) */}
            {requiresVessel && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Embarcação associada *
                </label>
                <select
                  value={selectedVesselId}
                  onChange={(e) => setSelectedVesselId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                >
                  <option value="">Selecione a embarcação...</option>
                  {filteredVessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.registration_number ? `(${v.registration_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Observações do Pedido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações Gerais do Pedido (opcional)
            </label>
            <textarea
              rows={3}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Instruções ou referências de protocolo na Capitania..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm"
            >
              ← Voltar aos serviços
            </Button>

            <Button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm"
            >
              Continuar para Documentos →
            </Button>
          </div>
        </div>
      )}

      {/* 5. CONTEÚDO DA ETAPA 3: DOCUMENTOS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Documentos compartilhados do pedido
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Envie cada documento comum uma única vez para atender a todos os serviços selecionados.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { name: "Documento de Identificação com Foto (RG/CNH)", desc: "Reaproveitado em todos os requerimentos", status: "Pronto para vincular" },
              { name: "Comprovante de Residência", desc: "Atualizado nos últimos 90 dias", status: "Compartilhado" },
              { name: "Procuração Específica da Capitania", desc: "Outorga poderes para o despachante", status: "Opcional" },
            ].map((doc, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">{doc.name}</h4>
                    <p className="text-[11px] text-slate-500">{doc.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white text-slate-600 shrink-0">
                  {doc.status}
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm"
            >
              ← Voltar aos dados
            </Button>

            <Button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm"
            >
              Revisar e gerar →
            </Button>
          </div>
        </div>
      )}

      {/* 6. CONTEÚDO DA ETAPA 4: REVISÃO E GERAÇÃO */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Revisão e confirmação do pedido
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Confira os serviços a serem criados. Cada processo terá controle, prazo e histórico independentes.
            </p>
          </div>

          {/* Resumo dos Serviços do Pedido */}
          <div className="space-y-3">
            {selectedServices.map((serv) => (
              <div key={serv.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
                    <serv.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">{serv.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {serv.requiresVessel ? "Vinculado à embarcação" : "Serviço pessoal"}
                    </span>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                  Pronto para gerar
                </Badge>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0f1d36]">
              Cliente: {customers.find(c => c.id === selectedCustomerId)?.name || "Não informado"}
            </p>
            {requiresVessel && (
              <p>
                Embarcação: {vessels.find(v => v.id === selectedVesselId)?.name || "Não informada"}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm"
            >
              ← Voltar aos documentos
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateOrderProcesses}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando processos...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar e criar {selectedServices.length} processos</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
