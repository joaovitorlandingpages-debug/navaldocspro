import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, Calendar, User, Ship, FileText, 
  Clock, CheckCircle2, AlertCircle, MoreHorizontal, 
  Download, Share2, PlayCircle, MessageSquare, Plus,
  FileCheck, History, Info, Zap, Bot, Eye, Trash2,
  Image as ImageIcon, Send, Loader2, Target, Ban,
  FilePlus, RefreshCw, ChevronLeft, AlertTriangle,
  Signature, FileSearch, Rocket, HelpCircle, Link2, Pencil,
  X, Check, ExternalLink, ChevronRight, ShieldCheck
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, isPast, parseISO, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useFiles } from "@/hooks/useFiles";
import { useProcessAutomation } from "@/hooks/useProcessAutomation";
import { useOCR } from "@/hooks/useOCR";
import { useDossier } from "@/hooks/useDossier";
import { DashboardLayout } from "@/routes/dashboard";
import { FileUploader } from "@/components/FileUploader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Lazy-loaded heavy components for specialized tabs/actions
const ProcessChecklist = lazy(() => import("@/components/ProcessChecklist").then(m => ({ default: m.ProcessChecklist })));
const ProcessTimeline = lazy(() => import("@/components/ProcessTimeline").then(m => ({ default: m.ProcessTimeline })));
const DocumentPreviewEditor = lazy(() => import("@/components/documents/DocumentPreviewEditor").then(m => ({ default: m.DocumentPreviewEditor })));
const ProcessDocumentsPanel = lazy(() => import("@/components/process/ProcessDocumentsPanel").then(m => ({ default: m.ProcessDocumentsPanel })));
const ProcessSignaturesPanel = lazy(() => import("@/components/process/ProcessSignaturesPanel").then(m => ({ default: m.ProcessSignaturesPanel })));
const ProcessEditSheet = lazy(() => import("@/components/processes/ProcessEditSheet").then(m => ({ default: m.ProcessEditSheet })));
const ProcessItemFocusDialog = lazy(() => import("@/components/processes/ProcessItemFocusDialog").then(m => ({ default: m.ProcessItemFocusDialog })));
const SignatureRequestDialog = lazy(() => import("@/components/signatures/SignatureRequestDialog").then(m => ({ default: m.SignatureRequestDialog })));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[#1868db]" />
    </div>
  );
}

type MainTab = "geral" | "documentos" | "historico" | "avancado";

type ProcessSearch = { 
  tab?: string; 
  sub?: string; 
  focus?: string; 
  action?: "gerar" | "editar" | "anexar" | "assinar" | "historico";
  preview?: boolean;
};

export const Route = createFileRoute("/processes/$id")({
  validateSearch: (s: Record<string, unknown>): ProcessSearch => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    sub: typeof s.sub === "string" ? s.sub : undefined,
    focus: typeof s.focus === "string" ? s.focus : undefined,
    action: typeof s.action === "string" ? (s.action as any) : undefined,
    preview: s.preview === true || s.preview === "true",
  }),
  component: ProcessTrackingPage,
});

// Mock baseline aligned with reference image for preview / demo order #0123
const DEFAULT_PREVIEW_DATA = {
  processNumber: "0247",
  orderNumber: "0123",
  serviceName: "Transferência de propriedade",
  customerName: "Marina Costa",
  vesselName: "Mar Azul",
  responsibleName: "Rafael Silva",
  status: "Aguardando assinatura",
  deadline: null as string | null,
  protocol: null as { number: string; agency: string; date: string } | null,
  otherProcesses: [
    {
      id: "0258",
      serviceName: "Renovação de documento (TIE)",
      status: "Arquivos gerados",
      nextAction: "Solicitar assinaturas",
      isCurrent: false,
    },
    {
      id: "0259",
      serviceName: "Alteração de motor",
      status: "Aguardando conferência",
      nextAction: "Conferir documentos do motor",
      isCurrent: false,
    },
  ],
  documents: [
    {
      id: "doc-1",
      name: "Requerimento.pdf",
      version: 1,
      generatedAt: "12/03/2025 às 14:32",
      status: "Gerado",
      size: "248 KB",
      content: `REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE\n\nILMO. SR. CAPITÃO DOS PORTOS DE SÃO PAULO\n\nEmbarcação: MAR AZUL (Inscrição: 381-000123)\nVendedora: Marina Costa (CPF: 042.819.330-12)\nComprador: Carlos Eduardo Ramos (CPF: 192.834.721-09)\n\nRequer a V. Sa. a homologação da transferência de propriedade do bem náutico supramencionado, conforme previsto nas normas da NORMAM-211/DPC.\n\nNestes termos, pede deferimento.\nSantos/SP, 12 de março de 2025.`,
    },
    {
      id: "doc-2",
      name: "Declaracao-transferencia.pdf",
      version: 1,
      generatedAt: "12/03/2025 às 14:32",
      status: "Gerado",
      size: "185 KB",
      content: `TERMO DE ENTREGA E DECLARAÇÃO DE RESPONSABILIDADE\n\nDeclaro para os devidos fins de direito que recebi a embarcação de esporte e recreio MAR AZUL em perfeitas condições de navegabilidade, assumindo a partir desta data plena responsabilidade civil, administrativa e marítima.\n\nVendedora: Marina Costa\nComprador: Carlos Eduardo Ramos\n\nSantos/SP, 12 de março de 2025.`,
    },
  ],
  timeline: [
    {
      id: "ev-1",
      title: "2 arquivos gerados",
      description: "Os documentos do processo foram gerados com sucesso.",
      time: "Hoje, 10:42",
      author: "Sistema NavalDocs",
    },
    {
      id: "ev-2",
      title: "Dados do pedido conferidos",
      description: "Informações do pedido foram validadas.",
      time: "Hoje, 10:35",
      author: "Rafael Silva",
    },
    {
      id: "ev-3",
      title: "Processo criado",
      description: "Processo iniciado a partir do pedido #0123.",
      time: "Hoje, 10:20",
      author: "Rafael Silva",
    },
  ],
};

function ProcessTrackingPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState<MainTab>("geral");
  const [loading, setLoading] = useState(true);
  const [process, setProcess] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedTemplateForGen, setSelectedTemplateForGen] = useState<any | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  // Modals
  const [otherProcessesModalOpen, setOtherProcessesModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [previewDocModal, setPreviewDocModal] = useState<any | null>(null);

  // Form states for modals
  const [internalDeadline, setInternalDeadline] = useState<string>("");
  const [internalResponsible, setInternalResponsible] = useState<string>("Rafael Silva");
  const [protocolNumber, setProtocolNumber] = useState<string>("");
  const [protocolAgency, setProtocolAgency] = useState<string>("Capitania dos Portos de São Paulo (CPSP)");
  const [protocolDate, setProtocolDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Dynamic status & timeline tracking
  const [currentProcessStatus, setCurrentProcessStatus] = useState<string>("Aguardando assinatura");
  const [localTimeline, setLocalTimeline] = useState<any[]>(DEFAULT_PREVIEW_DATA.timeline);

  const { files, deleteFile } = useFiles({ processId: id });
  const { automationState } = useProcessAutomation(id);

  // Map search param if provided
  useEffect(() => {
    if (search.tab === "documentos" || search.tab === "library_docs" || search.tab === "uploads") {
      setActiveTab("documentos");
    } else if (search.tab === "historico" || search.tab === "history" || search.tab === "timeline") {
      setActiveTab("historico");
    } else if (search.tab === "avancado" || search.tab === "dossier" || search.tab === "checklist") {
      setActiveTab("avancado");
    } else {
      setActiveTab("geral");
    }
  }, [search.tab]);

  // Load process from Supabase (with fallback to preview/reference values)
  const fetchProcessData = useCallback(async () => {
    setLoading(true);
    try {
      // Check if id is preview or matches reference
      const isDemoId = id === "0247" || id === "demo" || search.preview;

      if (!isDemoId) {
        const { data, error } = await supabase
          .from("processes")
          .select(`
            *,
            customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email),
            vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, vessel_type, current_owner_name, current_owner_cpf_cnpj)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProcess(data);
          // Set real status if available
          const st = data.status === "in_progress" 
            ? "Assinaturas a solicitar" 
            : data.status === "waiting_signature" 
            ? "Aguardando assinatura"
            : data.status === "signed" 
            ? "Assinado"
            : data.status === "completed" 
            ? "Concluído" 
            : data.status;
          setCurrentProcessStatus(st || "Assinaturas a solicitar");
          if (data.metadata?.internal_deadline) {
            setInternalDeadline(data.metadata.internal_deadline);
          }
          if (data.metadata?.protocol_number) {
            setProtocolNumber(data.metadata.protocol_number);
          }
        } else {
          // If not found in DB, fallback to demo/preview values
          console.warn("Process not found, loading reference data for ID:", id);
        }
      }

      // Fetch comments for history
      const { data: commentsData } = await supabase
        .from("process_comments")
        .select("*, profiles(name)")
        .eq("process_id", id)
        .order("created_at", { ascending: true });

      if (commentsData && commentsData.length > 0) {
        setComments(commentsData);
      }
    } catch (err: any) {
      console.warn("Fetch process notice:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [id, search.preview]);

  useEffect(() => {
    fetchProcessData();
  }, [fetchProcessData]);

  // Determine displayed fields
  const isDemo = id === "0247" || !process;
  const processNumber = isDemo ? "0247" : (process?.id?.slice(0, 4) || id.slice(0, 4));
  const orderNumber = isDemo ? "0123" : (process?.metadata?.order_id?.slice(0, 4) || process?.metadata?.order_number || (isDemo ? "0123" : null));
  const serviceName = isDemo ? "Transferência de propriedade" : (process?.process_type || process?.title || "Transferência de propriedade");
  const customerName = isDemo ? "Marina Costa" : (process?.customer?.name || "Marina Costa");
  const vesselName = isDemo ? "Mar Azul" : (process?.vessel?.name || null);
  const responsibleName = isDemo ? "Rafael Silva" : (process?.metadata?.responsible_name || profile?.name || "Rafael Silva");

  // Determine Stepper steps
  // 1. Preparação (concluída) -> 2. Assinaturas (atual) -> 3. Protocolo -> 4. Acompanhamento -> 5. Conclusão
  const getStepStatus = (stepIdx: number) => {
    // 0 = Preparação, 1 = Assinaturas, 2 = Protocolo, 3 = Acompanhamento, 4 = Conclusão
    if (currentProcessStatus === "Concluído") {
      return "completed";
    }
    if (currentProcessStatus === "Protocolado" || protocolNumber) {
      if (stepIdx < 2) return "completed";
      if (stepIdx === 2) return "active";
      return "upcoming";
    }
    if (currentProcessStatus === "Aguardando assinatura" || currentProcessStatus === "Assinaturas a solicitar") {
      if (stepIdx === 0) return "completed";
      if (stepIdx === 1) return "active";
      return "upcoming";
    }
    // Default: step 1 active
    if (stepIdx === 0) return "completed";
    if (stepIdx === 1) return "active";
    return "upcoming";
  };

  // Actions
  const handleSaveDeadline = async () => {
    if (!internalDeadline) {
      toast.error("Por favor, selecione uma data limite.");
      return;
    }
    const newEvent = {
      id: `ev-dl-${Date.now()}`,
      title: "Prazo interno definido",
      description: `Prazo definido para ${format(parseISO(internalDeadline), "dd/MM/yyyy")}. Responsável: ${internalResponsible}.`,
      time: "Agora",
      author: profile?.name || "Rafael Silva",
    };
    setLocalTimeline((prev) => [newEvent, ...prev]);
    toast.success("Prazo e responsável interno atualizados com sucesso!");
    setDeadlineModalOpen(false);
  };

  const handleSaveProtocol = async () => {
    if (!protocolNumber.trim()) {
      toast.error("Informe o número do protocolo.");
      return;
    }
    const newEvent = {
      id: `ev-pr-${Date.now()}`,
      title: "Protocolo registrado",
      description: `Protocolo nº ${protocolNumber} registrado na ${protocolAgency}.`,
      time: "Agora",
      author: profile?.name || "Rafael Silva",
    };
    setLocalTimeline((prev) => [newEvent, ...prev]);
    setCurrentProcessStatus("Protocolado");
    toast.success(`Protocolo nº ${protocolNumber} registrado com sucesso!`);
    setProtocolModalOpen(false);
  };

  const handleConfirmSignatureRequest = () => {
    setCurrentProcessStatus("Aguardando assinatura");
    const newEvent = {
      id: `ev-sig-${Date.now()}`,
      title: "Solicitação de assinatura enviada",
      description: "Notificação enviada por WhatsApp e e-mail para Marina Costa e Carlos Eduardo Ramos.",
      time: "Agora",
      author: profile?.name || "Rafael Silva",
    };
    setLocalTimeline((prev) => [newEvent, ...prev]);
    toast.success("Solicitação de assinatura enviada com sucesso!");
    setSignatureModalOpen(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      if (profile && !isDemo) {
        await supabase.from("process_comments").insert({
          process_id: id,
          user_id: profile.id,
          company_id: profile.company_id,
          content: newComment,
        });
      }
      const newEv = {
        id: `com-${Date.now()}`,
        title: "Nota interna adicionada",
        description: newComment,
        time: "Agora",
        author: profile?.name || "Rafael Silva",
      };
      setLocalTimeline((prev) => [newEv, ...prev]);
      setNewComment("");
      toast.success("Nota interna salva.");
    } catch (err: any) {
      toast.error("Erro ao salvar nota: " + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDownloadDoc = (doc: any) => {
    const blob = new Blob([doc.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Download de ${doc.name} iniciado.`);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

          {/* 1. CABEÇALHO DA PÁGINA */}
          <div className="mb-6">
            <Link
              to="/processes"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1868db] hover:text-[#1351aa] transition-colors mb-3 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar aos processos</span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#0d2342] tracking-tight">
                  {serviceName}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500 font-medium">
                  <span>Processo #{processNumber}</span>
                  {orderNumber && (
                    <>
                      <span>·</span>
                      <span>Pedido #{orderNumber}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-sm font-semibold text-slate-700">
                  {vesselName ? (
                    <>
                      <Ship className="w-4 h-4 text-slate-500" />
                      <span>{vesselName} · {customerName}</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{customerName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge & Link to Other Processes */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[#b45309] text-xs md:text-sm font-bold shadow-xs">
                  <AlertCircle className="w-4 h-4 text-[#d97706] shrink-0" />
                  <span>{currentProcessStatus}</span>
                </div>

                {DEFAULT_PREVIEW_DATA.otherProcesses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOtherProcessesModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-[#1868db] hover:underline transition-colors mt-0.5"
                  >
                    <span>Ver outros {DEFAULT_PREVIEW_DATA.otherProcesses.length} processos do pedido</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. ETAPAS DO PROCESSO (STEPPER) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-xs mb-6 overflow-hidden">
            {/* Desktop Stepper */}
            <div className="hidden sm:flex items-center justify-between relative max-w-4xl mx-auto px-4">
              {/* Connecting Horizontal Line */}
              <div className="absolute left-12 right-12 top-5 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
              
              {[
                { label: "Preparação", num: 1 },
                { label: "Assinaturas", num: 2 },
                { label: "Protocolo", num: 3 },
                { label: "Acompanhamento", num: 4 },
                { label: "Conclusão", num: 5 },
              ].map((step, idx) => {
                const stepState = getStepStatus(idx);
                return (
                  <div key={step.label} className="relative z-10 flex flex-col items-center">
                    {stepState === "completed" ? (
                      <div className="w-10 h-10 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold shadow-xs mb-2">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    ) : stepState === "active" ? (
                      <div className="w-10 h-10 rounded-full bg-[#1868db] text-white flex items-center justify-center font-bold shadow-sm ring-4 ring-[#1868db]/15 mb-2">
                        <span>{step.num}</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 text-slate-400 flex items-center justify-center font-bold mb-2">
                        <span>{step.num}</span>
                      </div>
                    )}
                    
                    <span className={`text-xs md:text-sm font-semibold transition-colors ${
                      stepState === "active" 
                        ? "text-[#1868db] font-bold" 
                        : stepState === "completed"
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}>
                      {step.label}
                    </span>

                    {/* Active Underline indicator */}
                    {stepState === "active" && (
                      <div className="w-12 h-1 bg-[#1868db] rounded-full mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Stepper */}
            <div className="sm:hidden flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="text-xs text-slate-500 font-medium">Preparação</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1868db] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#1868db]/20">
                  2
                </div>
                <span className="text-xs font-bold text-[#1868db]">Assinaturas</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center font-semibold text-xs">
                  3
                </div>
                <span className="text-xs font-medium">Protocolo</span>
                <span className="text-xs">···</span>
              </div>
            </div>
          </div>

          {/* 3. CARTÃO PRÓXIMA AÇÃO */}
          <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-2xl p-5 md:p-6 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#dbeafe] flex items-center justify-center text-[#1868db] shrink-0">
                <Signature className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-[#0d2342]">
                  Próxima ação: solicitar assinaturas
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  Os arquivos foram gerados. Confira os signatários para continuar.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setSignatureModalOpen(true)}
              className="bg-[#1868db] hover:bg-[#1456b6] text-white font-bold px-6 py-2.5 rounded-xl shadow-xs shrink-0 w-full md:w-auto text-sm"
            >
              Preparar solicitação
            </Button>
          </div>

          {/* 4. NAVEGAÇÃO DE ABAS */}
          <div className="flex items-center border-b border-slate-200 mb-6 gap-6 md:gap-8 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("geral")}
              className={`pb-3 text-sm md:text-base font-bold transition-all relative whitespace-nowrap ${
                activeTab === "geral"
                  ? "text-[#1868db] border-b-2 border-[#1868db]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Visão geral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documentos")}
              className={`pb-3 text-sm md:text-base font-bold transition-all relative whitespace-nowrap ${
                activeTab === "documentos"
                  ? "text-[#1868db] border-b-2 border-[#1868db]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Documentos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("historico")}
              className={`pb-3 text-sm md:text-base font-bold transition-all relative whitespace-nowrap ${
                activeTab === "historico"
                  ? "text-[#1868db] border-b-2 border-[#1868db]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Histórico
            </button>
          </div>

          {/* 5. CONTEÚDO DAS ABAS */}

          {/* ABA 1: VISÃO GERAL */}
          {activeTab === "geral" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* NO CELULAR: RESUMO DO PROCESSO FICA NO TOPO! */}
              <div className="lg:hidden">
                <ResumoProcessoCard 
                  customerName={customerName}
                  vesselName={vesselName}
                  responsibleName={responsibleName}
                  internalDeadline={internalDeadline}
                  protocolNumber={protocolNumber}
                  protocolAgency={protocolAgency}
                  onOpenDeadlineModal={() => setDeadlineModalOpen(true)}
                  onOpenProtocolModal={() => setProtocolModalOpen(true)}
                />
              </div>

              {/* COLUNA ESQUERDA (DESKTOP: 2 COLUNAS) */}
              <div className="lg:col-span-2 space-y-6">

                {/* Cartão Documentos do processo */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 mb-5">
                    <FileText className="w-5 h-5 text-[#1868db]" />
                    <h3 className="text-base md:text-lg font-bold text-[#0d2342]">
                      Documentos do processo
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {DEFAULT_PREVIEW_DATA.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-3 bg-[#fdfefe]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-11 rounded-md bg-[#fee2e2] text-[#ef4444] font-bold text-[10px] flex flex-col items-center justify-center shrink-0 border border-[#fca5a5]/40 shadow-2xs">
                            <span>PDF</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Versão {doc.version} · Gerado em {doc.generatedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center">
                          <span className="px-2.5 py-1 rounded-md bg-[#dcfce7] text-[#15803d] text-xs font-semibold">
                            {doc.status}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDocModal(doc)}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-[#1868db] border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab("documentos")}
                      className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#1868db] hover:underline"
                    >
                      <span>Ver todos os documentos</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                </div>

                {/* Cartão Atividade recente */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 mb-6">
                    <Clock className="w-5 h-5 text-[#1868db]" />
                    <h3 className="text-base md:text-lg font-bold text-[#0d2342]">
                      Atividade recente
                    </h3>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {localTimeline.map((item) => (
                      <div key={item.id} className="relative">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-4 border-[#1868db] shadow-xs" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                          <span className="text-xs text-slate-400 font-medium shrink-0">{item.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        {item.author && (
                          <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">
                            Registrado por: {item.author}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Banner Informativo no Rodapé */}
                <div className="rounded-xl bg-[#f0f7ff] border border-[#e0edff] px-4 py-3 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#1868db] shrink-0" />
                    <span>A geração dos arquivos não conclui o processo.</span>
                  </div>
                  <span className="text-slate-400 font-medium hidden sm:inline">Dados do processo</span>
                </div>
              </div>

              {/* COLUNA DIREITA (DESKTOP: 1 COLUNA) */}
              <div className="hidden lg:block space-y-6">
                <ResumoProcessoCard 
                  customerName={customerName}
                  vesselName={vesselName}
                  responsibleName={responsibleName}
                  internalDeadline={internalDeadline}
                  protocolNumber={protocolNumber}
                  protocolAgency={protocolAgency}
                  onOpenDeadlineModal={() => setDeadlineModalOpen(true)}
                  onOpenProtocolModal={() => setProtocolModalOpen(true)}
                />
              </div>

            </div>
          )}

          {/* ABA 2: DOCUMENTOS */}
          {activeTab === "documentos" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#1868db]" />
                      Documentos e Arquivos do Processo
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Arquivos gerados, modelos aplicados e documentos enviados pelo cliente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {DEFAULT_PREVIEW_DATA.documents.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-md bg-red-50 text-red-500 font-bold text-xs flex items-center justify-center border border-red-200">
                            PDF
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{doc.name}</h4>
                            <p className="text-xs text-slate-500">Tamanho: {doc.size} · Versão {doc.version}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Gerado em: {doc.generatedAt}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[10px]">
                          {doc.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDocModal(doc)}
                          className="h-8 text-xs font-bold text-[#1868db] border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Visualizar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDoc(doc)}
                          className="h-8 text-xs font-bold text-slate-700 border-slate-200"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload adicional de documentos fonte */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Adicionar arquivos fonte ao processo</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Envie procurações, comprovantes de residência ou vistorias adicionais.
                  </p>
                  <FileUploader 
                    processId={id} 
                    onUploadSuccess={() => toast.success("Arquivo anexado com sucesso!")} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: HISTÓRICO */}
          {activeTab === "historico" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <h3 className="text-lg font-bold text-[#0d2342] flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-[#1868db]" />
                  Histórico e Rastreabilidade do Processo
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {localTimeline.map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-4 border-[#1868db] shadow-xs" />
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-sm font-bold text-slate-800">{ev.title}</h4>
                        <span className="text-xs text-slate-400">{ev.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{ev.description}</p>
                      {ev.author && (
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Origem: {ev.author}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas Internas */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col h-[520px]">
                <h3 className="text-sm font-bold text-[#0d2342] flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-[#1868db]" />
                  Notas Internas
                </h3>
                
                <ScrollArea className="flex-1 pr-3">
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <p className="text-slate-800 font-medium">{c.content}</p>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">
                          {c.profiles?.name || "Usuário"} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-10">Nenhuma nota interna registrada ainda.</p>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendComment} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                  <Input
                    placeholder="Adicionar nota interna..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isSubmittingComment}
                    className="h-10 w-10 shrink-0 bg-[#1868db] hover:bg-[#1558bd] rounded-xl text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: OUTROS PROCESSOS DO PEDIDO */}
      <Dialog open={otherProcessesModalOpen} onOpenChange={setOtherProcessesModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
              <Ship className="w-5 h-5 text-[#1868db]" />
              Processos do Pedido #{orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Todos os processos vinculados a este pedido mantêm sua identificação, situação e histórico próprios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {/* Processo Atual */}
            <div className="p-4 rounded-xl border-2 border-[#1868db]/30 bg-[#f0f7ff] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0d2342]">{serviceName}</span>
                  <Badge className="bg-[#1868db] text-white text-[10px] font-bold">Processo Atual</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Identificador: #{processNumber} · Situação: {currentProcessStatus}</p>
                <p className="text-xs text-[#1868db] font-semibold mt-1">Próxima ação: Solicitar assinaturas</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#1868db] shrink-0" />
            </div>

            {/* Outros processos */}
            {DEFAULT_PREVIEW_DATA.otherProcesses.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#1868db] transition-colors flex items-center justify-between group bg-white"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{p.serviceName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Identificador: #{p.id} · Situação: {p.status}</p>
                  <p className="text-xs text-slate-600 font-semibold mt-1">Próxima ação: {p.nextAction}</p>
                </div>
                <Link
                  to={`/processes/${p.id}?preview=true`}
                  onClick={() => setOtherProcessesModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1868db] group-hover:bg-[#1868db] group-hover:text-white transition-colors border border-[#1868db]/30"
                >
                  Abrir processo
                </Link>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOtherProcessesModalOpen(false)}
              className="rounded-xl text-xs font-bold text-slate-600"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PREPARAR SOLICITAÇÃO DE ASSINATURA */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
              <Signature className="w-5 h-5 text-[#1868db]" />
              Preparar Solicitação de Assinaturas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confira os documentos e signatários antes de disparar as notificações por WhatsApp e e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-2">Documentos a serem assinados:</span>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Requerimento.pdf (Versão 1 · Transferência de propriedade)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Declaracao-transferencia.pdf (Versão 1 · Termo de responsabilidade)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="font-bold text-slate-700 block">Signatários identificados:</span>
              
              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Marina Costa (Vendedora / Proprietária)</p>
                  <p className="text-slate-500">CPF: 042.819.330-12 · WhatsApp: (11) 98765-4321</p>
                </div>
                <Badge className="bg-blue-50 text-[#1868db] border-none font-bold">Assinatura ICP/Gov</Badge>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Carlos Eduardo Ramos (Comprador)</p>
                  <p className="text-slate-500">CPF: 192.834.721-09 · WhatsApp: (11) 97654-3210</p>
                </div>
                <Badge className="bg-blue-50 text-[#1868db] border-none font-bold">Assinatura ICP/Gov</Badge>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ao confirmar, o status será atualizado para <strong>Aguardando assinatura</strong> e um link seguro será disponibilizado aos signatários.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSignatureModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSignatureRequest}
              className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white"
            >
              Confirmar e Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DEFINIR PRAZO E RESPONSÁVEL */}
      <Dialog open={deadlineModalOpen} onOpenChange={setDeadlineModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1868db]" />
              Definir Prazo e Responsável Interno
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Prazo de acompanhamento interno para controle da equipe náutica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Responsável interno:</label>
              <Input
                value={internalResponsible}
                onChange={(e) => setInternalResponsible(e.target.value)}
                className="h-10 text-xs rounded-xl"
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Prazo interno limite:</label>
              <Input
                type="date"
                value={internalDeadline}
                onChange={(e) => setInternalDeadline(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeadlineModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveDeadline}
              className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white"
            >
              Salvar Prazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTRAR PROTOCOLO */}
      <Dialog open={protocolModalOpen} onOpenChange={setProtocolModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#1868db]" />
              Registrar Protocolo Oficial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Insira o número e órgão de protocolo fornecidos pela Capitania ou órgão náutico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Número do protocolo:</label>
              <Input
                placeholder="Ex: 381.2025/004921-8"
                value={protocolNumber}
                onChange={(e) => setProtocolNumber(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Órgão / Capitania:</label>
              <Input
                value={protocolAgency}
                onChange={(e) => setProtocolAgency(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Data do protocolo:</label>
              <Input
                type="date"
                value={protocolDate}
                onChange={(e) => setProtocolDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProtocolModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveProtocol}
              className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white"
            >
              Registrar Protocolo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VISUALIZAR DOCUMENTO */}
      <Dialog open={previewDocModal !== null} onOpenChange={(open) => { if (!open) setPreviewDocModal(null); }}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 bg-white shadow-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base md:text-lg font-bold text-[#0d2342] flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                {previewDocModal?.name}
              </DialogTitle>
              <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                {previewDocModal?.status}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Versão {previewDocModal?.version} · {previewDocModal?.generatedAt} · {previewDocModal?.size}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed my-2 select-text">
            {previewDocModal?.content}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewDocModal(null)}
              className="rounded-xl text-xs font-bold"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => handleDownloadDoc(previewDocModal)}
              className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Baixar Arquivo PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

// Componente isolado para o Cartão de Resumo do Processo (reutilizado no desktop e no celular com mesma fidelidade)
function ResumoProcessoCard({
  customerName,
  vesselName,
  responsibleName,
  internalDeadline,
  protocolNumber,
  protocolAgency,
  onOpenDeadlineModal,
  onOpenProtocolModal,
}: {
  customerName: string;
  vesselName: string | null;
  responsibleName: string;
  internalDeadline: string | null;
  protocolNumber: string | null;
  protocolAgency: string;
  onOpenDeadlineModal: () => void;
  onOpenProtocolModal: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs">
      <div className="flex items-center gap-2.5 mb-5">
        <FileText className="w-5 h-5 text-[#1868db]" />
        <h3 className="text-base md:text-lg font-bold text-[#0d2342]">
          Resumo do processo
        </h3>
      </div>

      <div className="space-y-4 text-xs md:text-sm">
        {/* Cliente */}
        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">Cliente</span>
          </div>
          <span className="font-bold text-slate-800 text-right">{customerName}</span>
        </div>

        {/* Embarcação (omitir se for serviço pessoal) */}
        {vesselName && (
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <div className="flex items-center gap-2 text-slate-500">
              <Ship className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium">Embarcação</span>
            </div>
            <span className="font-bold text-slate-800 text-right">{vesselName}</span>
          </div>
        )}

        {/* Responsável interno */}
        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">Responsável interno</span>
          </div>
          <span className="font-bold text-slate-800 text-right">{responsibleName}</span>
        </div>

        {/* Prazo interno */}
        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">Prazo interno</span>
          </div>
          <div className="flex items-center gap-2 text-right">
            <span className="font-semibold text-slate-700">
              {internalDeadline ? format(parseISO(internalDeadline), "dd/MM/yyyy") : "Não definido"}
            </span>
            <button
              type="button"
              onClick={onOpenDeadlineModal}
              className="text-xs font-bold text-[#1868db] hover:underline"
            >
              Definir
            </button>
          </div>
        </div>

        {/* Protocolo */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-slate-500">
            <FileCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">Protocolo</span>
          </div>
          <div className="flex items-center gap-2 text-right">
            {protocolNumber ? (
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800">{protocolNumber}</span>
                <span className="text-[10px] text-slate-400">{protocolAgency}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-400">Ainda não registrado</span>
                <button
                  type="button"
                  onClick={onOpenProtocolModal}
                  className="text-xs font-bold text-[#1868db] hover:underline"
                >
                  Registrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
