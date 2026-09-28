import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Ship, 
  Folder, 
  Building2, 
  History, 
  FileCheck2, 
  Loader2, 
  PenTool, 
  Plus, 
  Sparkles,
  Info,
  Check,
  Eye,
  AlertCircle,
  Briefcase,
  Award,
  ShieldCheck,
  Edit2,
  Save,
  HelpCircle,
  FileCheck,
  FileQuestion
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { downloadStoredFile, openStoredFile } from "@/utils/file-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/revisar-documento")({
  validateSearch: (search: Record<string, unknown>) => ({
    docId: (search.docId as string) || undefined,
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <RevisarDocumentoGeradoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

export interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  document_name?: string;
  document_role?: string;
  professional_registry?: string;
}

export interface OriginDataField {
  label: string;
  value: string | null | undefined;
  source: "cliente" | "embarcacao" | "processo";
  sourceLabel: string;
  isRequired: boolean;
  isMissing: boolean;
}

function RevisarDocumentoGeradoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user, currentCompany } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais de dados
  const [document, setDocument] = useState<any | null>(null);
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Funcionários da Empresa
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Visualizador do PDF
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Aba ativa na conferência lateral: "dados" ou "preview" ou "historico"
  const [activeTab, setActiveTab] = useState<"dados" | "resumo">("dados");

  // Modais de Ação
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionReason, setNewVersionReason] = useState("");
  const [isRegisteringFinal, setIsRegisteringFinal] = useState(false);

  // Estado do formulário de correção inline
  const [correctionForm, setCorrectionForm] = useState({
    customerCpfCnpj: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    vesselRegistration: "",
    vesselPort: "",
    vesselLength: "",
  });

  // 1. Carregar Dados do Atendimento, Documento, Empresa e Funcionários
  const loadAllContext = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // 1.1 Carregar Processo, Cliente e Embarcação Vinculada
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj, document, email, phone, address, city, state, postal_code),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length, length_overall, port_of_registry)
        `)
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (pError || !proc) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      setProcessData(proc);
      setCustomer(proc.customer || null);
      setVessel(proc.vessel || null);

      setCorrectionForm({
        customerCpfCnpj: proc.customer?.cpf_cnpj || proc.customer?.document || "",
        customerAddress: proc.customer?.address || "",
        customerCity: proc.customer?.city || "",
        customerState: proc.customer?.state || "",
        vesselRegistration: proc.vessel?.registration_number || "",
        vesselPort: proc.vessel?.port_of_registry || "",
        vesselLength: proc.vessel?.length_overall || proc.vessel?.length || "",
      });

      // 1.2 Carregar Dados da Empresa (Logo, CNPJ, Endereço, Funcionários no metadata)
      const { data: comp } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      if (comp) {
        setCompanyDetails(comp);

        // Extrair funcionários cadastrados em Configurações
        const savedEmployees: any[] = (comp.metadata?.employees as any[]) || [];
        const empList: EmployeeInfo[] = [];

        savedEmployees.forEach((emp: any) => {
          if (emp.status !== "inactive") {
            empList.push({
              id: emp.id,
              name: emp.name,
              role: emp.role || "Colaborador",
              email: emp.email,
              phone: emp.phone,
              document_name: emp.document_name,
              document_role: emp.document_role,
              professional_registry: emp.professional_registry,
            });
          }
        });

        // Complementar com perfis de usuários se houver
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, full_name, email")
          .eq("company_id", companyId);

        if (profilesData) {
          profilesData.forEach((p) => {
            const exists = empList.some(
              (e) => e.id === p.id || (p.email && e.email?.toLowerCase() === p.email.toLowerCase())
            );
            if (!exists) {
              empList.push({
                id: p.id,
                name: p.full_name || p.name || p.email?.split("@")[0] || "Usuário",
                role: "Despachante Náutico",
                email: p.email,
                document_name: p.full_name || p.name,
                document_role: "Despachante Náutico Responsável",
              });
            }
          });
        }

        setEmployees(empList);

        // Selecionar responsável inicial
        if (empList.length > 0) {
          const matchLogged = empList.find(
            (e) => e.id === profile?.id || (user?.email && e.email?.toLowerCase() === user.email.toLowerCase())
          );
          setSelectedEmployeeId(matchLogged ? matchLogged.id : empList[0].id);
        }
      }

      // 1.3 Carregar Documento Gerado Específico
      let query = supabase
        .from("generated_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id);

      if (searchParams.docId) {
        query = query.eq("id", searchParams.docId);
      } else {
        query = query.order("created_at", { ascending: false }).limit(1);
      }

      const { data: docData } = await query.maybeSingle();

      if (docData) {
        setDocument(docData);
        if (docData.metadata?.staff_responsible?.id) {
          setSelectedEmployeeId(docData.metadata.staff_responsible.id);
        }
      } else {
        // Objeto padrão para revisão pré-geração
        setDocument({
          id: searchParams.docId || "doc-draft",
          title: proc?.title ? `Requerimento Padrão — ${proc.vessel?.name || "Embarcação"}` : "Requerimento Padrão do Interessado",
          name: proc?.title ? `Requerimento Padrão — ${proc.vessel?.name || "Embarcação"}` : "Requerimento Padrão do Interessado",
          document_type: "REQ-001",
          status: "rascunho",
          version: 1,
          created_at: new Date().toISOString(),
          metadata: {
            template_name: "Requerimento Padrão do Interessado",
            template_code: "REQ-001",
          },
        });
      }
    } catch (err) {
      console.error("Erro ao carregar contexto de revisão:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id, searchParams.docId, profile, user]);

  useEffect(() => {
    loadAllContext();
  }, [loadAllContext]);

  // Funcionário selecionado atualmente
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || employees[0] || {
      id: profile?.id || "default",
      name: profile?.name || "Despachante Náutico",
      role: "Responsável Técnico",
      document_name: profile?.name || "Despachante Náutico",
      document_role: "Despachante Náutico Responsável",
      professional_registry: "CRDD-SP / Capitania dos Portos",
    };
  }, [employees, selectedEmployeeId, profile]);

  // Normalização do Título e Código do Processo
  const serviceTitle = useMemo(() => {
    return processData?.title || processData?.process_type || "Serviço Marítimo";
  }, [processData]);

  const protocolCode = useMemo(() => {
    return processData?.protocol_number || `PROC-${String(processData?.id || id).slice(0, 4).toUpperCase()}`;
  }, [processData, id]);

  const customerName = useMemo(() => {
    return customer?.fantasy_name || customer?.name || "Cliente não informado";
  }, [customer]);

  const vesselName = useMemo(() => {
    return vessel?.name || "Embarcação não informada";
  }, [vessel]);

  const documentTitle = useMemo(() => {
    return document?.title || document?.name || "Requerimento Padrão do Interessado";
  }, [document]);

  const versionNumber = useMemo(() => {
    return document?.version ? `v${document.version}.0` : "v1.0";
  }, [document]);

  // =========================================================================
  // CONFERÊNCIA DE DADOS E RASTREIO DE ORIGEM (ITEM 1)
  // =========================================================================
  const originFields = useMemo<OriginDataField[]>(() => {
    return [
      // 1. Cadastro do Cliente
      {
        label: "Nome / Razão Social",
        value: customer?.fantasy_name || customer?.name,
        source: "cliente",
        sourceLabel: "Cadastro do Cliente",
        isRequired: true,
        isMissing: !customer?.name && !customer?.fantasy_name,
      },
      {
        label: "CPF / CNPJ",
        value: customer?.cpf_cnpj || customer?.document,
        source: "cliente",
        sourceLabel: "Cadastro do Cliente",
        isRequired: true,
        isMissing: !customer?.cpf_cnpj && !customer?.document,
      },
      {
        label: "Endereço Completo",
        value: customer?.address,
        source: "cliente",
        sourceLabel: "Cadastro do Cliente",
        isRequired: true,
        isMissing: !customer?.address,
      },
      {
        label: "Cidade / UF",
        value: customer?.city && customer?.state ? `${customer.city} / ${customer.state}` : customer?.city || customer?.state,
        source: "cliente",
        sourceLabel: "Cadastro do Cliente",
        isRequired: true,
        isMissing: !customer?.city,
      },
      {
        label: "Telefone / E-mail",
        value: customer?.phone || customer?.email ? `${customer?.phone || ""} • ${customer?.email || ""}` : null,
        source: "cliente",
        sourceLabel: "Cadastro do Cliente",
        isRequired: false,
        isMissing: false,
      },

      // 2. Cadastro da Embarcação
      {
        label: "Nome da Embarcação",
        value: vessel?.name,
        source: "embarcacao",
        sourceLabel: "Cadastro da Embarcação",
        isRequired: true,
        isMissing: !vessel?.name,
      },
      {
        label: "Número de Inscrição",
        value: vessel?.registration_number,
        source: "embarcacao",
        sourceLabel: "Cadastro da Embarcação",
        isRequired: true,
        isMissing: !vessel?.registration_number,
      },
      {
        label: "Tipo / Categoria",
        value: vessel?.vessel_type || vessel?.category ? `${vessel?.vessel_type || "Embarcação"} (${vessel?.category || "Geral"})` : null,
        source: "embarcacao",
        sourceLabel: "Cadastro da Embarcação",
        isRequired: true,
        isMissing: !vessel?.vessel_type && !vessel?.category,
      },
      {
        label: "Porto de Registro / Capitania",
        value: vessel?.port_of_registry,
        source: "embarcacao",
        sourceLabel: "Cadastro da Embarcação",
        isRequired: true,
        isMissing: !vessel?.port_of_registry,
      },
      {
        label: "Comprimento Total",
        value: vessel?.length_overall || vessel?.length ? `${vessel?.length_overall || vessel?.length} m` : null,
        source: "embarcacao",
        sourceLabel: "Cadastro da Embarcação",
        isRequired: false,
        isMissing: false,
      },

      // 3. Preenchimento do Processo
      {
        label: "Serviço Solicitado",
        value: serviceTitle,
        source: "processo",
        sourceLabel: "Preenchimento deste Processo",
        isRequired: true,
        isMissing: !serviceTitle,
      },
      {
        label: "Número de Protocolo",
        value: protocolCode,
        source: "processo",
        sourceLabel: "Preenchimento deste Processo",
        isRequired: true,
        isMissing: !protocolCode,
      },
    ];
  }, [customer, vessel, serviceTitle, protocolCode]);

  // Campos obrigatórios ausentes
  const missingRequiredFields = useMemo(() => {
    return originFields.filter((f) => f.isRequired && f.isMissing);
  }, [originFields]);

  // Controles de Zoom
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoomLevel(100);

  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!isFullscreen) {
      if (viewerContainerRef.current.requestFullscreen) {
        viewerContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // =========================================================================
  // AÇÃO 3: BAIXAR PDF
  // =========================================================================
  const handleDownloadPdf = () => {
    if (document && (document.file_url || document.generated_file_url)) {
      downloadStoredFile(document, `${documentTitle.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`);
    } else {
      // Fallback seguro: abre janela de impressão nativa / exportação
      window.print();
    }
    toast.success("Download do PDF gerado iniciado!");
    setIsFinalizeModalOpen(true);
  };

  // =========================================================================
  // AÇÃO 5: REGISTRAR VERSÃO FINAL (ITEM 5)
  // =========================================================================
  const handleRegisterFinalVersion = async () => {
    if (!companyId || !id) return;
    setIsRegisteringFinal(true);

    try {
      const now = new Date().toISOString();
      const nextVersion = (document?.version || 1);

      const staffPayload = {
        id: selectedEmployee.id,
        name: selectedEmployee.document_name || selectedEmployee.name,
        role: selectedEmployee.document_role || selectedEmployee.role,
        professional_registry: selectedEmployee.professional_registry || null,
        email: selectedEmployee.email || null,
      };

      const existingHistory = document?.metadata?.version_history || [];
      const historyItem = {
        version: nextVersion,
        saved_at: now,
        saved_by_name: selectedEmployee.name,
        status: "gerado",
        notes: "Versão final oficial conferida e registrada no NavalDocs",
      };

      const metadataPayload = {
        ...(document?.metadata || {}),
        staff_responsible: staffPayload,
        template_name: documentTitle,
        company_snapshot: {
          name: currentCompany?.name || companyDetails?.name,
          cnpj: companyDetails?.cnpj,
          address: companyDetails?.address,
          city: companyDetails?.city,
          state: companyDetails?.state,
          phone: companyDetails?.phone,
        },
        version_history: [historyItem, ...existingHistory],
        last_modified_at: now,
      };

      if (document?.id && document.id !== "doc-draft") {
        // Atualiza documento existente
        const { error: updErr } = await supabase
          .from("generated_documents")
          .update({
            status: "gerado",
            generated_by: profile?.id || null,
            metadata: metadataPayload,
            updated_at: now,
          } as any)
          .eq("id", document.id)
          .eq("company_id", companyId);

        if (updErr) throw updErr;
      } else {
        // Cria novo registro se ainda estava em rascunho
        const { data: insertedDoc, error: insErr } = await supabase
          .from("generated_documents")
          .insert({
            company_id: companyId,
            process_id: id,
            customer_id: customer?.id || null,
            vessel_id: vessel?.id || null,
            name: documentTitle,
            status: "gerado",
            version: 1,
            generated_by: profile?.id || null,
            metadata: metadataPayload,
          } as any)
          .select()
          .single();

        if (insErr) throw insErr;
        if (insertedDoc) setDocument(insertedDoc);
      }

      toast.success("Versão final do documento registrada com sucesso!");
      setIsFinalizeModalOpen(true);
    } catch (err: any) {
      console.error("Erro ao registrar versão final:", err);
      toast.error(err?.message || "Não foi possível registrar a versão final.");
    } finally {
      setIsRegisteringFinal(false);
    }
  };

  // Salvar Correções Inline de Dados Ausentes
  const handleSaveCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      // 1. Atualizar cliente se houver alterações
      if (customer?.id) {
        await supabase
          .from("customers")
          .update({
            cpf_cnpj: correctionForm.customerCpfCnpj || customer.cpf_cnpj,
            address: correctionForm.customerAddress || customer.address,
            city: correctionForm.customerCity || customer.city,
            state: correctionForm.customerState || customer.state,
          })
          .eq("id", customer.id)
          .eq("company_id", companyId);
      }

      // 2. Atualizar embarcação se houver alterações
      if (vessel?.id) {
        await supabase
          .from("vessels")
          .update({
            registration_number: correctionForm.vesselRegistration || vessel.registration_number,
            port_of_registry: correctionForm.vesselPort || vessel.port_of_registry,
            length: correctionForm.vesselLength ? parseFloat(correctionForm.vesselLength) : vessel.length,
          })
          .eq("id", vessel.id)
          .eq("company_id", companyId);
      }

      toast.success("Dados cadastrais corrigidos com sucesso!");
      setIsCorrectionModalOpen(false);
      loadAllContext();
    } catch (err: any) {
      console.error("Erro ao salvar correções:", err);
      toast.error("Não foi possível salvar os dados corrigidos.");
    }
  };

  // Gerar Nova Versão Formal
  const handleCreateNewVersion = async () => {
    if (!document || !companyId || !id) return;
    try {
      const nextVer = (document.version || 1) + 1;
      const now = new Date().toISOString();

      const existingHistory = document.metadata?.version_history || [];
      const historyItem = {
        version: document.version || 1,
        saved_at: now,
        saved_by_name: selectedEmployee.name,
        status: document.status || "gerado",
        notes: newVersionReason.trim() || "Nova revisão solicitada",
      };

      const updatedMeta = {
        ...(document.metadata || {}),
        version_history: [historyItem, ...existingHistory],
        last_modified_at: now,
      };

      const { error } = await supabase
        .from("generated_documents")
        .update({
          version: nextVer,
          status: "gerado",
          metadata: updatedMeta,
          updated_at: now,
        } as any)
        .eq("id", document.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success(`Nova versão v${nextVer}.0 criada com sucesso!`);
      setIsNewVersionModalOpen(false);
      setNewVersionReason("");
      loadAllContext();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar nova versão.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando conferência e prévia do documento...</p>
      </div>
    );
  }

  if (isError || !processData) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Serviço não encontrado</h2>
        <p className="text-sm text-slate-500">
          A ocorrência deste serviço não existe ou você não possui permissão para visualizá-la nesta empresa.
        </p>
        <div className="pt-2">
          <Link
            to="/processes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para processos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. NAVEGAÇÃO E TRILHA ESTRUTURADA (Cliente → Embarcação → Serviço → Documento) */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div>
            <Link
              to="/processes/$id/documentos-gerados"
              params={{ id }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar aos documentos gerados</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
            {customer ? (
              <Link to="/customers/$id" params={{ id: customer.id }} className="hover:text-slate-600 hover:underline truncate max-w-[150px]">
                {customerName}
              </Link>
            ) : (
              <span>{customerName}</span>
            )}
            <span>/</span>
            {vessel ? (
              <Link to="/vessels/$id" params={{ id: vessel.id }} className="hover:text-slate-600 hover:underline truncate max-w-[150px] font-bold text-slate-700">
                {vesselName}
              </Link>
            ) : (
              <span className="font-bold text-slate-700">{vesselName}</span>
            )}
            <span>/</span>
            <Link to="/processes/$id" params={{ id }} className="hover:text-slate-600 hover:underline">
              {serviceTitle}
            </Link>
            <span>/</span>
            <Link to="/processes/$id/documentos-gerados" params={{ id }} className="hover:text-slate-600 hover:underline">
              Documentos gerados
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold">Revisão e finalização</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CABEÇALHO DA PÁGINA + BOTÕES PRINCIPAIS DE AÇÃO (ITEM 3) */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1739]">
                {documentTitle}
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#075BFF] border border-blue-100 text-xs font-bold font-mono">
                {versionNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
                NavalDocs Pro
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Confira os dados com rastreio de origem, selecione o funcionário responsável e emita o PDF oficial.
            </p>
          </div>

          {/* 3 BOTÕES DE AÇÃO EXIGIDOS: VOLTAR E CORRIGIR, BAIXAR PDF, REGISTRAR VERSÃO FINAL */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Voltar e corrigir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-[#075BFF] hover:bg-blue-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleRegisterFinalVersion}
              disabled={isRegisteringFinal}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRegisteringFinal ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Registrar versão final</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ALERTA DE CAMPOS OBRIGATÓRIOS AUSENTES (ITEM 1) */}
        {/* ========================================================================= */}
        {missingRequiredFields.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-900">
                  Atenção: existem campos obrigatórios ausentes antes de gerar o PDF
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {missingRequiredFields.map((f, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200 text-[11px] font-medium"
                    >
                      {f.label} ({f.sourceLabel})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Preencher dados agora
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL (2 COLUNAS): PRÉVIA DO PDF À ESQUERDA + CONFERÊNCIA À DIREITA */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): PRÉVIA DO PDF COM DADOS DA EMPRESA E LOGO */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Barra de Ferramentas da Prévia */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Prévia do Documento Oficial (Página 1 de 1)
                </span>
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Resetar Zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 ml-1"
                  title="Tela cheia"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Container da Folha do PDF Formatada com Logo e Empresa */}
            <div 
              ref={viewerContainerRef}
              className="bg-slate-200/80 border border-slate-300 rounded-2xl p-3 sm:p-6 flex justify-center items-start min-h-[620px] overflow-auto shadow-inner"
            >
              <div 
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                className="bg-white text-slate-900 w-full max-w-[620px] min-h-[860px] p-6 sm:p-10 rounded-sm shadow-xl border border-slate-200/90 font-serif text-[12.5px] leading-relaxed transition-transform duration-150 space-y-6 select-text"
              >
                {/* Cabeçalho da Empresa com Logo */}
                <div className="pb-4 border-b border-slate-300 flex items-center justify-between gap-4 font-sans">
                  <div className="flex items-center gap-3">
                    {companyDetails?.logo_url ? (
                      <img
                        src={companyDetails.logo_url}
                        alt="Logo da Empresa"
                        className="h-12 w-auto max-w-[120px] object-contain rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 font-bold text-sm">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wide text-[#0B1739]">
                        {companyDetails?.name || currentCompany?.name || "NavalDocs Despachante Marítimo"}
                      </p>
                      {companyDetails?.cnpj && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          CNPJ: {companyDetails.cnpj}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {companyDetails?.city ? `${companyDetails.city}/${companyDetails.state || "SP"}` : "Atendimento Náutico Especializado"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-slate-400">
                    <p className="font-bold text-slate-700">{protocolCode}</p>
                    <p>Via Oficial NavalDocs</p>
                  </div>
                </div>

                {/* Título Oficial do Documento */}
                <div className="text-center pt-2 pb-2 space-y-1">
                  <p className="text-[11px] font-sans uppercase font-bold tracking-widest text-slate-600">
                    MARINHA DO BRASIL • AUTORIDADE MARÍTIMA
                  </p>
                  <p className="text-[13px] font-sans font-bold text-slate-900 uppercase">
                    CAPITANIA DOS PORTOS DE SÃO PAULO
                  </p>
                  <p className="text-[14px] font-bold text-slate-950 uppercase pt-2">
                    {documentTitle}
                  </p>
                </div>

                {/* Corpo do Documento com Seções e Origens */}
                <div className="space-y-4 font-sans text-xs text-slate-800">
                  <p className="leading-relaxed">
                    <strong>Ao Senhor Capitão dos Portos:</strong>
                  </p>
                  <p className="leading-relaxed text-justify">
                    O(A) interessado(a) qualificado(a) no Quadro 1, por intermédio de seu despachante e responsável operacional indicado no Quadro 4, vem mui respeitosamente requerer a V. Sa. a realização do serviço de <strong>{serviceTitle}</strong> referente à embarcação especificada no Quadro 2:
                  </p>

                  {/* Quadro 1: Identificação do Requerente */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1 mb-1">
                      <span className="font-bold text-[11px] text-slate-900 uppercase">1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#075BFF]">Origem: Cadastro do Cliente</span>
                    </div>
                    <p><strong>Nome / Razão Social:</strong> {customer?.fantasy_name || customer?.name || <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                    <p><strong>CPF / CNPJ:</strong> {customer?.cpf_cnpj || customer?.document || <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                    <p><strong>Endereço:</strong> {customer?.address || <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                    <p><strong>Cidade / UF:</strong> {customer?.city ? `${customer.city} / ${customer.state || ""}` : <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                  </div>

                  {/* Quadro 2: Dados da Embarcação */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1 mb-1">
                      <span className="font-bold text-[11px] text-slate-900 uppercase">2. DADOS DA EMBARCAÇÃO</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Origem: Cadastro da Embarcação</span>
                    </div>
                    <p><strong>Nome da Embarcação:</strong> {vessel?.name || <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                    <p><strong>Número de Inscrição:</strong> {vessel?.registration_number || <span className="text-red-500 font-bold">[Não informado]</span>}</p>
                    <p><strong>Tipo / Categoria:</strong> {vessel?.vessel_type || "Embarcação"} — {vessel?.category || "Esporte e Recreio"}</p>
                    <p><strong>Porto de Registro:</strong> {vessel?.port_of_registry || "Capitania dos Portos de São Paulo"}</p>
                    {vessel?.length_overall && <p><strong>Comprimento Total:</strong> {vessel.length_overall} m</p>}
                  </div>

                  {/* Quadro 3: Preenchimento do Processo */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1 mb-1">
                      <span className="font-bold text-[11px] text-slate-900 uppercase">3. DADOS DO ATENDIMENTO</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">Origem: Preenchimento do Processo</span>
                    </div>
                    <p><strong>Serviço Solicitado:</strong> {serviceTitle}</p>
                    <p><strong>Protocolo do Processo:</strong> {protocolCode}</p>
                  </div>

                  {/* Quadro 4: Funcionário Responsável Selecionado (ITEM 2) */}
                  <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between border-b border-blue-200/60 pb-1 mb-1">
                      <span className="font-bold text-[11px] text-blue-900 uppercase">4. RESPONSÁVEL TÉCNICO / PREPARADOR DO DOCUMENTO</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Funcionário Selecionado</span>
                    </div>
                    <p><strong>Nome do Responsável:</strong> {selectedEmployee.document_name || selectedEmployee.name}</p>
                    <p><strong>Cargo / Função:</strong> {selectedEmployee.document_role || selectedEmployee.role}</p>
                    <p><strong>Registro Profissional:</strong> {selectedEmployee.professional_registry || "Registro profissional não cadastrado"}</p>
                    {selectedEmployee.email && <p><strong>Contato:</strong> {selectedEmployee.email} {selectedEmployee.phone ? `• ${selectedEmployee.phone}` : ""}</p>}
                  </div>

                  {/* Fechamento e Assinaturas */}
                  <p className="pt-4 text-center">
                    Termos em que pede deferimento.
                  </p>

                  <div className="pt-8 grid grid-cols-2 gap-6 text-center text-[11px]">
                    <div className="space-y-1">
                      <div className="w-48 border-t border-slate-400 mx-auto" />
                      <p className="font-bold">{customer?.fantasy_name || customer?.name || "Requerente"}</p>
                      <p className="text-[10px] text-slate-500">Requerente / Proprietário</p>
                    </div>

                    <div className="space-y-1">
                      <div className="w-48 border-t border-slate-400 mx-auto" />
                      <p className="font-bold">{selectedEmployee.document_name || selectedEmployee.name}</p>
                      <p className="text-[10px] text-slate-500">{selectedEmployee.document_role || selectedEmployee.role}</p>
                    </div>
                  </div>
                </div>

                {/* Rodapé da Prévia */}
                <div className="pt-6 border-t border-slate-200 text-center text-[10px] font-sans text-slate-400">
                  Emitido via NavalDocs Pro • Versão {versionNumber} • Documento Gerado para Instrução Processual
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): CONFERÊNCIA DE DADOS + SELEÇÃO DE FUNCIONÁRIO */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* SELEÇÃO DO FUNCIONÁRIO RESPONSÁVEL (ITEM 2) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#075BFF]" />
                  <h2 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                    Funcionário Responsável
                  </h2>
                </div>
                <Link
                  to="/settings"
                  className="text-[11px] font-semibold text-[#075BFF] hover:underline"
                >
                  Gerenciar equipe
                </Link>
              </div>

              <p className="text-xs text-slate-500">
                Selecione qual colaborador cadastrado em Configurações está preparando este documento:
              </p>

              <div>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.document_name || emp.name} — {emp.document_role || emp.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card de Detalhes do Funcionário Selecionado */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B1739]">
                    {selectedEmployee.document_name || selectedEmployee.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#075BFF]">
                    {selectedEmployee.document_role || selectedEmployee.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>
                    <span className="text-slate-400">Registro Profissional: </span>
                    <strong className="text-slate-700">
                      {selectedEmployee.professional_registry || "Não cadastrado (configure em Configurações)"}
                    </strong>
                  </p>
                  {selectedEmployee.email && (
                    <p className="truncate text-slate-400">
                      E-mail: {selectedEmployee.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CONFERÊNCIA DOS DADOS USADOS E ORIGENS (ITEM 1) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                    Conferência de Origem dos Dados
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="text-[11px] font-semibold text-[#075BFF] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Editar</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Confira a procedência de cada informação antes de emitir a versão final:
              </p>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {originFields.map((field, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs transition-colors ${
                      field.isMissing
                        ? "bg-red-50/60 border-red-200 text-red-900"
                        : "bg-slate-50/70 border-slate-200/70 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">
                        {field.label}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        field.source === "cliente"
                          ? "bg-blue-50 text-[#075BFF]"
                          : field.source === "embarcacao"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-purple-50 text-purple-700"
                      }`}>
                        {field.sourceLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[220px]">
                        {field.value || (
                          <span className="text-red-500 italic font-semibold">
                            Não preenchido
                          </span>
                        )}
                      </span>
                      {field.isMissing && (
                        <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                          <AlertCircle className="h-3 w-3" />
                          Obrigatório
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD DE AÇÕES RÁPIDAS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ações do Documento
              </h3>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#075BFF]" />
                <span>Baixar PDF Oficial</span>
              </button>

              <button
                type="button"
                onClick={handleRegisterFinalVersion}
                disabled={isRegisteringFinal}
                className="w-full py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>Registrar Versão Final</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#075BFF]" />
                <span>Criar Nova Revisão (v{(document?.version || 1) + 1}.0)</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 4: CONCLUSÃO PÓS-DOWNLOAD (ASSINAR GOV.BR OU GUARDAR SEM ASSINATURA) */}
      {/* ========================================================================= */}
      <Dialog open={isFinalizeModalOpen} onOpenChange={setIsFinalizeModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Documento pronto. Como deseja prosseguir?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Escolha se o documento passará por assinatura no GOV.BR ou se será arquivado sem assinatura.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {/* OPÇÃO 1: ASSINAR PELO GOV.BR */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-start gap-2.5">
                <PenTool className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 text-sm">
                    Opção 1: Assinar pelo GOV.BR
                  </p>
                  <p className="text-emerald-900/80 leading-relaxed text-xs">
                    Instruções para realizar a assinatura no serviço oficial da Autoridade Certificadora:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-emerald-900/90 text-[11px] pt-1 leading-relaxed">
                    <li>Acesse o Assinador oficial em <strong>assinador.iti.br</strong>;</li>
                    <li>Faça login na conta GOV.BR do interessado (nível Prata ou Ouro);</li>
                    <li>Envie o arquivo PDF que acabou de baixar e posicione a assinatura;</li>
                    <li>Conclua a assinatura e baixe o documento com o carimbo oficial;</li>
                    <li>Retorne ao NavalDocs e anexe o arquivo assinado.</li>
                  </ol>
                  <p className="text-[10px] text-emerald-800 font-semibold pt-1">
                    * O NavalDocs não simula nem assina automaticamente pelo gov.br. O documento só é marcado como assinado após o upload do arquivo assinado.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <a
                  href="https://assinador.iti.br"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:flex-1 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir Assinador GOV.BR</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsFinalizeModalOpen(false);
                    navigate({
                      to: "/processes/$id/anexar-versao-assinada",
                      params: { id },
                      search: { docId: document?.id },
                    });
                  }}
                  className="w-full sm:flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>Anexar versão assinada</span>
                </button>
              </div>
            </div>

            {/* OPÇÃO 2: GUARDAR PDF SEM ASSINATURA */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-start gap-2.5">
                <FileQuestion className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">
                    Opção 2: Guardar PDF sem assinatura
                  </p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Utilize esta opção quando a assinatura não for necessária neste momento (documento meramente informativo, procuração com assinatura presencial ou protocolo físico).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFinalizeModalOpen(false);
                  toast.success("Documento arquivado como PDF sem assinatura.");
                  navigate({
                    to: "/processes/$id/documentos-gerados",
                    params: { id },
                  });
                }}
                className="w-full py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
              >
                Salvar e manter como PDF sem assinatura
              </button>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CORREÇÃO INLINE DE DADOS AUSENTES (ITEM 1 & 3) */}
      {/* ========================================================================= */}
      <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Voltar e corrigir dados do documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Atualize os cadastros para refletir imediatamente na folha do documento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveCorrections} className="p-5 space-y-4 text-xs">
            <div className="space-y-3">
              <p className="font-bold text-slate-800 uppercase text-[11px]">Dados do Cliente</p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  value={correctionForm.customerCpfCnpj}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, customerCpfCnpj: e.target.value })}
                  placeholder="Ex: 123.456.789-00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={correctionForm.customerAddress}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, customerAddress: e.target.value })}
                  placeholder="Ex: Av. dos Portos, 100 - Bairro Náutico"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={correctionForm.customerCity}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, customerCity: e.target.value })}
                    placeholder="Ex: Santos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">UF / Estado</label>
                  <input
                    type="text"
                    value={correctionForm.customerState}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, customerState: e.target.value })}
                    placeholder="Ex: SP"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="font-bold text-slate-800 uppercase text-[11px]">Dados da Embarcação</p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Número de Inscrição</label>
                <input
                  type="text"
                  value={correctionForm.vesselRegistration}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, vesselRegistration: e.target.value })}
                  placeholder="Ex: 381P202400192"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Porto de Registro / Capitania</label>
                <input
                  type="text"
                  value={correctionForm.vesselPort}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, vesselPort: e.target.value })}
                  placeholder="Ex: Capitania dos Portos de São Paulo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#075BFF] text-white font-bold hover:bg-blue-600 transition-colors shadow-xs"
              >
                Salvar correções
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CRIAR NOVA VERSÃO FORMAL */}
      {/* ========================================================================= */}
      <Dialog open={isNewVersionModalOpen} onOpenChange={setIsNewVersionModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Criar nova versão do documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preserva o documento anterior e gera uma nova revisão (v{(document?.version || 1) + 1}.0).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <label className="font-semibold text-slate-700">Motivo da revisão / alteração:</label>
            <textarea
              value={newVersionReason}
              onChange={(e) => setNewVersionReason(e.target.value)}
              placeholder="Ex: Atualização dos dados da embarcação conforme vistoria..."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateNewVersion}
              className="px-5 py-2 rounded-xl bg-[#075BFF] text-white font-bold hover:bg-blue-600 transition-colors shadow-xs"
            >
              Confirmar nova revisão
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
