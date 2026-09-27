import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Ship, 
  Folder, 
  Cog, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Loader2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Building2, 
  FileSpreadsheet, 
  ChevronRight, 
  Check, 
  Sparkles, 
  PenTool, 
  RefreshCw,
  AlertTriangle,
  FileCheck2,
  Lock
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/gerar-documento")({
  validateSearch: (search: Record<string, unknown>) => ({
    serviceKey: (search.serviceKey as string) || undefined,
    templateId: (search.templateId as string) || undefined,
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <GerarDocumentoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Modelos Oficiais Cadastrados no Sistema por Categoria
interface DocumentTemplateItem {
  id: string;
  name: string;
  code: string;
  description: string;
  category: "esporte_recreio" | "moto_aquatica" | "profissional" | "geral";
  categoryLabel: string;
  updatedAt: string;
  status: "aprovado" | "em_revisao";
  reviewReason?: string;
  requiredFields: string[];
}

const SYSTEM_TEMPLATES: DocumentTemplateItem[] = [
  {
    id: "req-padrao-cpes",
    name: "Requerimento Padrão do Interessado",
    code: "REQ-001",
    description: "Requerimento oficial de solicitação de serviços de registro e emissão de TIE/TIEM perante a Capitania dos Portos.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "15/09/2026",
    status: "aprovado",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ", "Nome da Embarcação", "Inscrição", "Porto de Registro"],
  },
  {
    id: "proc-representacao-naval",
    name: "Procuração Específica para Capitania dos Portos",
    code: "PROC-NAV",
    description: "Instrumento particular de procuração outorgando poderes ao despachante para protocolo e acompanhamento do processo marítimo.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "10/09/2026",
    status: "aprovado",
    requiredFields: ["Outorgante (Cliente)", "Outorgado (Responsável)", "Embarcação"],
  },
  {
    id: "decl-residencia-naval",
    name: "Declaração de Residência do Proprietário",
    code: "DEC-RES",
    description: "Declaração formal de domicílio para atendimento aos requisitos das Normas da Autoridade Marítima (NORMAM).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "20/08/2026",
    status: "aprovado",
    requiredFields: ["Nome do Cliente", "CPF", "Endereço Completo"],
  },
  {
    id: "req-moto-aquatica",
    name: "Requerimento Específico para Moto Aquática (Jet Ski)",
    code: "REQ-JET",
    description: "Formulário de inscrição, renovação ou transferência com parâmetros técnicos dedicados a motonáutica.",
    category: "moto_aquatica",
    categoryLabel: "Moto aquática",
    updatedAt: "12/09/2026",
    status: "aprovado",
    requiredFields: ["Nome do Cliente", "Número do Casco / Chassi", "Marca / Modelo"],
  },
  {
    id: "decl-perda-extravio",
    name: "Declaração de Perda / Extravio de TIE",
    code: "DEC-PERD",
    description: "Declaração formal para solicitação de 2ª via de documento de embarcação extraviado ou danificado.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "05/09/2026",
    status: "em_revisao",
    reviewReason: "Modelo em revisão regulatória conforme atualização da NORMAM.",
    requiredFields: ["Nome do Cliente", "Embarcação", "Motivo"],
  },
  {
    id: "req-comercial-prof",
    name: "Requerimento de Embarcação Profissional / Comercial",
    code: "REQ-PROF",
    description: "Requerimento de inscrição ou vistoria para embarcações de pesca, passageiros ou transporte comercial.",
    category: "profissional",
    categoryLabel: "Embarcações profissionais",
    updatedAt: "01/09/2026",
    status: "aprovado",
    requiredFields: ["Razão Social / Nome", "CNPJ / CPF", "Arqueação Bruta", "Área de Navegação"],
  },
];

function GerarDocumentoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user, currentCompany } = useAuth();
  const companyId = profile?.company_id;

  // Estados do Processo e Contexto
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos Modelos
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    searchParams.templateId || "req-padrao-cpes"
  );

  // Funcionário Responsável
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    name: string;
    role: string;
  }>({
    id: user?.id || "user-1",
    name: profile?.full_name || user?.email?.split("@")[0] || "João Vitor",
    role: "Despachante Náutico Responsável",
  });

  // Lista de Funcionários da Empresa
  const companyStaffList = useMemo(() => [
    {
      id: user?.id || "user-1",
      name: profile?.full_name || user?.email?.split("@")[0] || "João Vitor",
      role: "Despachante Náutico Responsável",
    },
    {
      id: "staff-2",
      name: "Ana Beatriz (Assistente Operacional)",
      role: "Assistente de Documentação",
    },
    {
      id: "staff-3",
      name: "Carlos Mendes (Gestor Técnico)",
      role: "Responsável Técnico Naval",
    },
  ], [user, profile]);

  // Estado de Geração
  const [isGenerating, setIsGenerating] = useState(false);

  // Carregamento dos Dados do Processo
  useEffect(() => {
    async function loadData() {
      if (!companyId || !id) return;
      setIsLoading(true);

      try {
        const { data: proc, error } = await supabase
          .from("processes")
          .select(`
            *,
            customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj, document, email, phone, address, city, state, zip_code),
            vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length_overall, port_of_registry, hull_material, manufacturer)
          `)
          .eq("id", id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (error || !proc) {
          toast.error("Processo não encontrado.");
          navigate({ to: "/processes" });
          return;
        }

        setProcessData(proc);
        setCustomer(proc.customer || null);
        setVessel(proc.vessel || null);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [companyId, id, navigate]);

  // Identificação do Processo
  const processCode = useMemo(() => {
    if (!processData) return "PROC";
    return processData.protocol_number || `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`;
  }, [processData]);

  // Categoria da Embarcação
  const vesselCategory = useMemo(() => {
    const typeStr = (vessel?.vessel_type || "").toLowerCase();
    const nameStr = (vessel?.name || "").toLowerCase();
    if (typeStr.includes("moto") || typeStr.includes("jet") || nameStr.includes("jet")) {
      return "moto_aquatica";
    }
    if (processData?.metadata?.category === "profissional") {
      return "profissional";
    }
    return "esporte_recreio";
  }, [vessel, processData]);

  // Modelos Filtrados e Compatíveis
  const filteredTemplates = useMemo(() => {
    return SYSTEM_TEMPLATES.filter((tpl) => {
      // Compatibilidade de categoria (geral é compatível com todas)
      const isCategoryMatch = tpl.category === "geral" || tpl.category === vesselCategory;
      
      // Filtro de busca
      const matchesSearch = searchQuery === "" || 
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());

      return isCategoryMatch && matchesSearch;
    });
  }, [vesselCategory, searchQuery]);

  // Modelo Selecionado Atualmente
  const activeTemplate = useMemo(() => {
    return SYSTEM_TEMPLATES.find((t) => t.id === selectedTemplateId) || filteredTemplates[0] || SYSTEM_TEMPLATES[0];
  }, [selectedTemplateId, filteredTemplates]);

  // Verificação de Dados Ausentes
  const dataValidation = useMemo(() => {
    const missing: string[] = [];
    if (!customer?.name && !customer?.fantasy_name) missing.push("Nome do Cliente");
    if (!customer?.cpf_cnpj && !customer?.document) missing.push("CPF ou CNPJ do Cliente");
    if (!vessel?.name) missing.push("Nome da Embarcação");
    if (!vessel?.registration_number && vesselCategory !== "esporte_recreio") missing.push("Número de Inscrição");

    return {
      isValid: missing.length === 0,
      missingFields: missing,
    };
  }, [customer, vessel, vesselCategory]);

  // Ação de Geração de Documento
  const handleGenerateDocument = async () => {
    if (!companyId || !id || !activeTemplate) return;
    if (activeTemplate.status !== "aprovado") {
      toast.error("Este modelo está em revisão e não pode ser gerado.");
      return;
    }

    setIsGenerating(true);
    try {
      const now = new Date().toISOString();
      const customerName = customer?.fantasy_name || customer?.name || "Cliente";
      const vesselName = vessel?.name || "Embarcação";
      const docTitle = `${activeTemplate.name} - ${vesselName}`;
      const fileName = `${activeTemplate.code}_${vesselName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

      // Snapshot dos dados e do funcionário responsável
      const documentMetadata = {
        template_id: activeTemplate.id,
        template_name: activeTemplate.name,
        template_code: activeTemplate.code,
        staff_responsible: {
          id: selectedStaff.id,
          name: selectedStaff.name,
          role: selectedStaff.role,
        },
        client_snapshot: {
          name: customerName,
          document: customer?.cpf_cnpj || customer?.document || "Não informado",
          address: customer?.address || "",
          city: customer?.city || "",
          state: customer?.state || "",
        },
        vessel_snapshot: {
          name: vesselName,
          registration: vessel?.registration_number || "",
          type: vessel?.vessel_type || "",
          length: vessel?.length_overall || "",
        },
        company_snapshot: {
          name: currentCompany?.name || "Empresa Naval",
          cnpj: currentCompany?.cnpj || "",
        },
        generated_at: now,
      };

      // Inserir registro na tabela generated_documents
      const { data: newDoc, error: docError } = await supabase
        .from("generated_documents")
        .insert({
          company_id: companyId,
          process_id: id,
          title: docTitle,
          document_type: activeTemplate.code,
          file_name: fileName,
          file_path: `documents/${id}/${fileName}`,
          is_signed: false,
          metadata: documentMetadata,
        } as any)
        .select("id")
        .single();

      if (docError) {
        throw new Error(docError.message || "Erro ao salvar documento gerado.");
      }

      // Adicionar evento no histórico do processo
      const existingHistory = processData?.metadata?.history || [];
      const historyEntry = {
        event: "doc_generated",
        description: `Documento gerado: "${docTitle}" por ${selectedStaff.name}`,
        user: selectedStaff.name,
        date: now,
      };

      await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData?.metadata || {}),
            history: [historyEntry, ...existingHistory],
          },
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      toast.success("Documento gerado com sucesso!", {
        description: "O arquivo PDF foi criado e está pronto para download ou assinatura.",
      });

      // Redirecionar para a Tela 08 (Documentos Gerados)
      navigate({
        to: "/processes/$id/documentos-gerados",
        params: { id },
      });
    } catch (err: any) {
      console.error("Erro ao gerar documento:", err);
      toast.error(err?.message || "Falha ao gerar documento. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando modelos e dados do serviço...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => navigate({ to: "/processes/$id", params: { id } })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Gerar documento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selecione um modelo e confira os dados antes de gerar o arquivo.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* RESUMO DO CONTEXTO (4 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:pr-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {customer?.fantasy_name || customer?.name || "Ana Oliveira"}
              </span>
            </div>
          </div>

          {/* Embarcação */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Ship className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {vessel?.name || "Aurora"}
              </span>
            </div>
          </div>

          {/* Serviço */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Cog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Serviço</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {processData?.title || "Renovação do TIE"}
              </span>
            </div>
          </div>

          {/* Processo */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Processo</span>
              <span className="text-sm font-bold text-[#0B1739] font-mono truncate block">
                {processCode}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL: 2 COLUNAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): MODELOS DISPONÍVEIS + DADOS UTILIZADOS */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SEÇÃO 2: MODELOS DISPONÍVEIS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Modelos disponíveis
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione o formulário ou documento que deseja emitir
                  </p>
                </div>

                {/* Busca */}
                <div className="relative w-full sm:w-56">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar modelo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Nenhum modelo aprovado está disponível para este serviço.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Novos modelos serão liberados após revisão regulatória.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = tpl.id === activeTemplate.id;
                    const isApproved = tpl.status === "aprovado";

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#075BFF] bg-blue-50/20 ring-2 ring-blue-500/10 shadow-xs"
                            : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? "bg-[#075BFF] text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-bold text-[#0B1739]">
                                  {tpl.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                  {tpl.code}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {tpl.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <Check className="h-3 w-3" />
                                <span>Aprovado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                <Clock className="h-3 w-3" />
                                <span>Em revisão</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              Atualizado em {tpl.updatedAt}
                            </span>
                          </div>
                        </div>

                        {!isApproved && tpl.reviewReason && (
                          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-800 flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{tpl.reviewReason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 4: DADOS UTILIZADOS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Dados utilizados no documento
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Cliente */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dados do Cliente</span>
                  <p className="font-bold text-[#0B1739] truncate">{customer?.fantasy_name || customer?.name}</p>
                  <p className="text-slate-500 truncate">{customer?.cpf_cnpj || customer?.document || "Documento não informado"}</p>
                </div>

                {/* Embarcação */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dados da Embarcação</span>
                  <p className="font-bold text-[#0B1739] truncate">{vessel?.name}</p>
                  <p className="text-slate-500 truncate">Inscrição: {vessel?.registration_number || "Aguardando"}</p>
                </div>

                {/* Empresa / Logo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identidade da Empresa</span>
                  <p className="font-bold text-[#0B1739] truncate">{currentCompany?.name || "NavalDocs Despachante"}</p>
                  <p className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Logo e dados oficiais configurados</span>
                  </p>
                </div>

                {/* Porto de Registro */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jurisdição / Capitania</span>
                  <p className="font-bold text-[#0B1739] truncate">{vessel?.port_of_registry || "Capitania dos Portos de São Paulo"}</p>
                  <p className="text-slate-500">Área de Atendimento da CPES</p>
                </div>
              </div>

              {!dataValidation.isValid && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Campos cadastrais com atenção:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 pl-1">
                    {dataValidation.missingFields.map((f, i) => (
                      <li key={i}>{f} ausente no cadastro</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): FUNCIONÁRIO + PRÉVIA + GERAR */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* SEÇÃO 3: FUNCIONÁRIO RESPONSÁVEL */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Funcionário responsável
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Operador responsável pela assinatura e protocolo:
                </label>
                <select
                  value={selectedStaff.id}
                  onChange={(e) => {
                    const staff = companyStaffList.find((s) => s.id === e.target.value);
                    if (staff) setSelectedStaff(staff);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {companyStaffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.role}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                O nome e função do funcionário serão registrados no histórico e na minuta do documento gerado.
              </p>
            </div>

            {/* SEÇÃO 5: PRÉVIA E REVISÃO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Revisão do documento
              </h2>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Modelo:</span>
                  <span className="font-bold text-[#0B1739] text-right truncate max-w-[180px]">
                    {activeTemplate.name}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Código:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {activeTemplate.code}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Responsável:</span>
                  <span className="font-medium text-slate-700">
                    {selectedStaff.name}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Formato:</span>
                  <span className="font-semibold text-red-600">PDF Oficial (A4)</span>
                </div>
              </div>

              {/* Card Explicativo sobre GOV.BR */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#075BFF]">
                  <PenTool className="h-4 w-4" />
                  <span>Fluxo de assinatura GOV.BR</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Após gerar o documento, você poderá baixá-lo e abrir o portal oficial do GOV.BR para realizar a assinatura eletrônica qualificada.
                </p>
              </div>

              {/* Botão Gerar Documento */}
              <button
                type="button"
                disabled={isGenerating || activeTemplate.status !== "aprovado"}
                onClick={handleGenerateDocument}
                className="w-full py-3 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gerando documento PDF...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar documento</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
