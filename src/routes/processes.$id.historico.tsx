import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  History, 
  FileText, 
  Award, 
  FileCheck2, 
  PenTool, 
  Plus, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Download, 
  Eye, 
  X, 
  Filter, 
  Loader2, 
  AlertCircle, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Lock
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/historico")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: (search.filter as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <HistoricoProcessoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

export type EventFilterType = "all" | "documentos" | "protocolos" | "alteracoes";

export interface TimelineEvent {
  id: string;
  category: "documento" | "protocolo" | "alteracao";
  categoryLabel: string;
  title: string;
  description: string;
  date: string; // ISO date string
  authorName: string;
  authorRole?: string;
  relatedItem?: {
    type: "documento_gerado" | "protocolo" | "documento_emitido" | "arquivo_assinado";
    label: string;
    url?: string;
    docId?: string;
    fileObj?: any;
  };
}

function HistoricoProcessoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais de dados do contexto
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Dados das tabelas para montar a linha do tempo completa
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Filtro e Busca
  const [selectedFilter, setSelectedFilter] = useState<EventFilterType>(
    (searchParams.filter as EventFilterType) || "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Modal: Adicionar Observação Interna
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Modal: Correção Formal / Aditamento de Observação (Append-only audit)
  const [correctionTarget, setCorrectionTarget] = useState<TimelineEvent | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  // 1. Carregar Dados do Atendimento
  const loadContext = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // 1.1 Processo com Cliente e Embarcação Vinculada
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
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

      // 1.2 Documentos Gerados deste processo
      const { data: genDocs } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id);

      setGeneratedDocs(genDocs || []);

      // 1.3 Arquivos Anexados deste processo (Protocolos e Emitidos)
      const { data: files } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id);

      setUploadedFiles(files || []);
    } catch (err) {
      console.error("Erro ao carregar histórico do processo:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Contexto formatado
  const customerName = useMemo(() => {
    return customer?.fantasy_name || customer?.name || "Cliente";
  }, [customer]);

  const vesselName = useMemo(() => {
    return vessel?.name || "Embarcação";
  }, [vessel]);

  const serviceTitle = useMemo(() => {
    return processData?.title || processData?.process_type || "Serviço Marítimo";
  }, [processData]);

  const protocolCode = useMemo(() => {
    return processData?.protocol_number || `PROC-${String(processData?.id || id).slice(0, 4).toUpperCase()}`;
  }, [processData, id]);

  // =========================================================================
  // MONTAGEM CRONOLÓGICA DA LINHA DO TEMPO COMPLETA
  // =========================================================================
  const allEvents = useMemo<TimelineEvent[]>(() => {
    if (!processData) return [];
    const events: TimelineEvent[] = [];

    // 1. Criação do Processo
    if (processData.created_at) {
      events.push({
        id: `created_${processData.id}`,
        category: "alteracao",
        categoryLabel: "Criação do Processo",
        title: "Processo Criado no NavalDocs",
        description: `Início do atendimento para o serviço "${serviceTitle}". Protocolo inicial gerado: ${protocolCode}.`,
        date: processData.created_at,
        authorName: processData.metadata?.created_by_name || profile?.name || "Sistema NavalDocs",
        authorRole: "Responsável pelo Atendimento",
      });
    }

    // 2. Histórico de Alterações, Status e Observações gravados em metadata.history
    const historyList: any[] = processData.metadata?.history || [];
    historyList.forEach((h: any, idx: number) => {
      const isInternalNote = h.event === "internal_note";
      const isCorrection = h.event === "note_correction";
      const isStatusChange = h.event === "status_change";

      let cat: "documento" | "protocolo" | "alteracao" = "alteracao";
      let catLabel = "Alteração de Dados";

      if (isInternalNote) {
        catLabel = "Observação Interna";
      } else if (isCorrection) {
        catLabel = "Correção de Registro";
      } else if (isStatusChange) {
        catLabel = "Mudança de Status";
      } else if (h.event?.includes("protocol")) {
        cat = "protocolo";
        catLabel = "Protocolo";
      } else if (h.event?.includes("document") || h.event?.includes("signed")) {
        cat = "documento";
        catLabel = "Documento";
      }

      events.push({
        id: `hist_${idx}_${h.date || Date.now()}`,
        category: cat,
        categoryLabel: catLabel,
        title: isInternalNote 
          ? "Observação Interna Registrada" 
          : isCorrection 
          ? "Aditamento / Correção Formal" 
          : isStatusChange 
          ? "Status do Processo Alterado" 
          : h.description || "Evento registrado",
        description: h.description || h.notes || "Ação operacional concluída.",
        date: h.date || processData.created_at,
        authorName: h.user || h.author_name || "Colaborador",
        authorRole: h.role || "Equipe NavalDocs",
      });
    });

    // 3. Documentos Gerados e Suas Versões
    generatedDocs.forEach((doc) => {
      // 3.1 Versão Atual do Documento
      events.push({
        id: `gendoc_${doc.id}`,
        category: "documento",
        categoryLabel: "Documento Gerado",
        title: `Documento Gerado: ${doc.name} (v${doc.version || 1}.0)`,
        description: `Minuta oficial preparada com dados da embarcação "${vesselName}" e cliente "${customerName}". Situação: ${doc.status === "assinado" ? "Assinado" : "PDF Gerado"}.`,
        date: doc.created_at,
        authorName: doc.metadata?.staff_responsible?.name || doc.metadata?.generated_by || profile?.name || "Despachante",
        authorRole: doc.metadata?.staff_responsible?.role || "Preparador do Documento",
        relatedItem: {
          type: "documento_gerado",
          label: "Abrir documento gerado",
          docId: doc.id,
        },
      });

      // 3.2 Histórico de Versões Anteriores do Documento
      const docHistory: any[] = doc.metadata?.version_history || [];
      docHistory.forEach((vHist: any, vIdx: number) => {
        events.push({
          id: `gendoc_ver_${doc.id}_${vIdx}`,
          category: "documento",
          categoryLabel: "Versão Anterior Preservada",
          title: `Revisão do Documento: ${doc.name} (v${vHist.version}.0)`,
          description: vHist.notes || `Revisão arquivada mantendo integridade histórica. Registrado por ${vHist.saved_by_name || "Despachante"}.`,
          date: vHist.saved_at || doc.created_at,
          authorName: vHist.saved_by_name || "Despachante",
          authorRole: "Equipe NavalDocs",
          relatedItem: {
            type: "documento_gerado",
            label: "Ver versão gerada",
            docId: doc.id,
          },
        });
      });

      // 3.3 Arquivo Assinado Anexado (se houver)
      if (doc.signed_file_url || doc.signature_status === "Anexada" || doc.is_signed) {
        events.push({
          id: `signed_${doc.id}`,
          category: "documento",
          categoryLabel: "Assinatura Eletrônica",
          title: `Arquivo Assinado Anexado: ${doc.metadata?.signed_file_name || doc.name}`,
          description: `Documento com assinatura eletrônica oficial anexado ao processo. Fonte de assinatura: ${doc.metadata?.signature_source || "GOV.BR (Externo)"}.`,
          date: doc.metadata?.signed_uploaded_at || doc.updated_at,
          authorName: doc.metadata?.signed_uploaded_by || profile?.name || "Usuário",
          authorRole: "Operador de Assinaturas",
          relatedItem: {
            type: "arquivo_assinado",
            label: "Visualizar arquivo assinado",
            url: doc.signed_file_url,
            docId: doc.id,
          },
        });
      }
    });

    // 4. Protocolos Registrados (uploaded_files com category === 'protocol')
    const protocolFiles = uploadedFiles.filter((f) => f.category === "protocol");
    protocolFiles.forEach((prot) => {
      const meta = prot.metadata || {};
      const protNum = meta.protocol_number || prot.file_name;
      const agency = meta.agency || meta.issuing_agency || "Capitania dos Portos";

      events.push({
        id: `prot_${prot.id}`,
        category: "protocolo",
        categoryLabel: "Protocolo em Órgão",
        title: `Protocolo Registrado: ${protNum}`,
        description: `Comprovante de entrega e entrada protocolado perante ${agency}. Código oficial: ${protNum}.`,
        date: prot.created_at,
        authorName: meta.registered_by_name || "Colaborador",
        authorRole: "Despachante Náutico",
        relatedItem: {
          type: "protocolo",
          label: "Visualizar comprovante",
          fileObj: prot,
        },
      });
    });

    // 5. Documentos Emitidos Anexados (uploaded_files com category === 'issued')
    const issuedFiles = uploadedFiles.filter((f) => f.category === "issued");
    issuedFiles.forEach((iss) => {
      const meta = iss.metadata || {};
      const docName = meta.document_name || iss.file_name;
      const agency = meta.issuing_agency || "Órgão Marítimo";
      const validityDisplay = meta.expiration_date 
        ? `Vencimento em ${meta.expiration_date}` 
        : meta.validity_type === "sem_vencimento" 
        ? "Sem vencimento" 
        : "Vencimento não informado";

      events.push({
        id: `issued_${iss.id}`,
        category: "documento",
        categoryLabel: "Documento Emitido",
        title: `Documento Emitido Anexado: ${docName}`,
        description: `Documento final expedido por ${agency}. Número: ${meta.document_number || "S/N"}. Situação de validade: ${validityDisplay}.`,
        date: iss.created_at,
        authorName: meta.registered_by_name || "Colaborador",
        authorRole: "Equipe NavalDocs",
        relatedItem: {
          type: "documento_emitido",
          label: "Visualizar documento emitido",
          fileObj: iss,
        },
      });
    });

    // Ordenação Cronológica (Mais recente primeiro por padrão)
    events.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return events;
  }, [processData, generatedDocs, uploadedFiles, serviceTitle, protocolCode, customerName, vesselName, profile, sortOrder]);

  // Contadores para as Tabs
  const counts = useMemo(() => {
    let docs = 0;
    let prots = 0;
    let alts = 0;

    allEvents.forEach((e) => {
      if (e.category === "documento") docs++;
      else if (e.category === "protocolo") prots++;
      else alts++;
    });

    return {
      all: allEvents.length,
      documentos: docs,
      protocolos: prots,
      alteracoes: alts,
    };
  }, [allEvents]);

  // Filtragem e Busca em Tempo Real
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      // Filtro por Categoria
      if (selectedFilter !== "all" && evt.category !== selectedFilter) {
        return false;
      }

      // Busca Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesTitle = evt.title.toLowerCase().includes(term);
        const matchesDesc = evt.description.toLowerCase().includes(term);
        const matchesAuthor = evt.authorName.toLowerCase().includes(term);
        const matchesCat = evt.categoryLabel.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, selectedFilter, searchTerm]);

  // Formatação de Data e Hora amigável
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // =========================================================================
  // ADICIONAR OBSERVAÇÃO INTERNA AO PROCESSO (APPEND-ONLY)
  // =========================================================================
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !companyId || !id || !processData) return;

    setIsSavingNote(true);
    try {
      const now = new Date().toISOString();
      const authorName = profile?.name || user?.email?.split("@")[0] || "Colaborador";

      const newEntry = {
        event: "internal_note",
        description: noteText.trim(),
        user: authorName,
        user_id: profile?.id,
        role: "Equipe NavalDocs",
        date: now,
      };

      const existingHistory = processData.metadata?.history || [];
      const updatedHistory = [newEntry, ...existingHistory];

      const { error } = await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData.metadata || {}),
            history: updatedHistory,
          },
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success("Observação interna adicionada ao histórico com sucesso!");
      setIsNoteModalOpen(false);
      setNoteText("");
      loadContext();
    } catch (err: any) {
      console.error("Erro ao salvar observação interna:", err);
      toast.error(err?.message || "Não foi possível registrar a observação.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // =========================================================================
  // ADICIONAR CORREÇÃO FORMAL (NÃO ALTERA SILENCIOSAMENTE REGISTRO ANTIGO)
  // =========================================================================
  const handleSaveFormalCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionText.trim() || !correctionTarget || !companyId || !id || !processData) return;

    setIsSavingCorrection(true);
    try {
      const now = new Date().toISOString();
      const authorName = profile?.name || user?.email?.split("@")[0] || "Colaborador";

      // Regra de Auditoria: cria NOVO registro com referência ao evento corrigido
      const correctionEntry = {
        event: "note_correction",
        description: `Aditamento referente ao evento "${correctionTarget.title}": ${correctionText.trim()}`,
        target_event_id: correctionTarget.id,
        user: authorName,
        user_id: profile?.id,
        date: now,
      };

      const existingHistory = processData.metadata?.history || [];
      const updatedHistory = [correctionEntry, ...existingHistory];

      const { error } = await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData.metadata || {}),
            history: updatedHistory,
          },
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success("Correção formal registrada como novo evento no histórico!");
      setCorrectionTarget(null);
      setCorrectionText("");
      loadContext();
    } catch (err: any) {
      console.error("Erro ao registrar correção:", err);
      toast.error(err?.message || "Não foi possível registrar a correção.");
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // Abrir item relacionado
  const handleOpenRelated = (item: TimelineEvent["relatedItem"]) => {
    if (!item) return;

    if (item.type === "documento_gerado" && item.docId) {
      navigate({
        to: "/processes/$id/revisar-documento",
        params: { id },
        search: { docId: item.docId },
      });
      return;
    }

    if (item.type === "arquivo_assinado" && item.url) {
      window.open(item.url, "_blank");
      return;
    }

    if (item.fileObj) {
      openStoredFile(item.fileObj);
    }
  };

  // Ícone por categoria
  const getEventIcon = (category: TimelineEvent["category"], title: string) => {
    if (title.includes("Assinado") || title.includes("Assinatura")) {
      return <PenTool className="h-4 w-4 text-emerald-600" />;
    }
    if (category === "documento") {
      return <FileText className="h-4 w-4 text-[#075BFF]" />;
    }
    if (category === "protocolo") {
      return <ShieldCheck className="h-4 w-4 text-indigo-600" />;
    }
    return <Clock className="h-4 w-4 text-slate-500" />;
  };

  // Cores por categoria
  const getBadgeStyle = (category: TimelineEvent["category"]) => {
    switch (category) {
      case "documento":
        return "bg-blue-50 text-[#075BFF] border-blue-200/80";
      case "protocolo":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "alteracao":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="h-6 w-44 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
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
          O processo solicitado não existe ou você não possui permissão para acessá-lo.
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
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-6 font-sans text-slate-800">
      
      {/* ========================================================================= */}
      {/* 1. NAVEGAÇÃO: Processos → Cliente → Embarcação → Serviço → Histórico */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div>
          <Link
            to="/processes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </Link>
        </div>

        {/* Trilha Estruturada de Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
          <Link to="/processes" className="hover:text-slate-600 hover:underline">
            Processos
          </Link>
          <span>/</span>
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
          <span className="text-slate-700 font-semibold">Histórico</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CABEÇALHO DA PÁGINA + AÇÃO DE ADICIONAR OBSERVAÇÃO INTERNA */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Histórico do processo
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#075BFF] border border-blue-200">
              Auditoria Completa
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registro cronológico unificado de todas as ações, documentos, protocolos e alterações deste atendimento.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsNoteModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar observação interna</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RESUMO DO CONTEXTO FIXO NO TOPO (4 COLUNAS) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Cliente */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cliente
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {customerName}
          </p>
          {customer?.cpf_cnpj && (
            <p className="text-[11px] text-slate-400">{customer.cpf_cnpj}</p>
          )}
        </div>

        {/* Embarcação */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Embarcação vinculada
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {vesselName}
          </p>
          {vessel?.registration_number && (
            <p className="text-[11px] text-slate-400">Inscrição: {vessel.registration_number}</p>
          )}
        </div>

        {/* Serviço */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Serviço de origem
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {serviceTitle}
          </p>
        </div>

        {/* Processo & Total de Eventos */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Processo / Eventos
          </p>
          <p className="text-sm font-bold text-[#0B1739]">
            {protocolCode}
          </p>
          <p className="text-[11px] text-slate-400">
            {allEvents.length} {allEvents.length === 1 ? "registro auditado" : "registros auditados"}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FILTROS E BUSCA EM TEMPO REAL */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Abas de Filtros Simples */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "all"
                ? "bg-white text-[#0B1739] shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("documentos")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "documentos"
                ? "bg-white text-[#075BFF] shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Documentos ({counts.documentos})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("protocolos")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "protocolos"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Protocolos ({counts.protocolos})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("alteracoes")}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "alteracoes"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Alterações ({counts.alteracoes})
          </button>
        </div>

        {/* Busca e Ordem */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no histórico..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            title={sortOrder === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <ArrowUpDown className="h-4 w-4 text-slate-500" />
            <span className="hidden md:inline">{sortOrder === "desc" ? "Recentes" : "Antigos"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LINHA DO TEMPO CRONOLÓGICA (TIMELINE) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
              <History className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              Nenhum evento encontrado para o filtro selecionado
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ajuste o termo de pesquisa ou selecione outra aba de categoria acima.
            </p>
          </div>
        ) : (
          <div className="relative before:absolute before:left-4 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200/70 space-y-6">
            {filteredEvents.map((evt) => {
              return (
                <div key={evt.id} className="relative flex items-start gap-4 sm:gap-5 pl-1 group">
                  {/* Ponto / Ícone na Linha do Tempo */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-slate-300 group-hover:border-[#075BFF] flex items-center justify-center shrink-0 z-10 shadow-2xs transition-colors">
                    {getEventIcon(evt.category, evt.title)}
                  </div>

                  {/* Conteúdo do Registro */}
                  <div className="flex-1 bg-slate-50/70 group-hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(evt.category)}`}>
                          {evt.categoryLabel}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0B1739]">
                          {evt.title}
                        </h3>
                      </div>

                      {/* Data e Hora */}
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(evt.date)}
                      </span>
                    </div>

                    {/* Descrição Detalhada */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {evt.description}
                    </p>

                    {/* Rodapé: Responsável + Botão do Item Relacionado */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Por <strong>{evt.authorName}</strong></span>
                        {evt.authorRole && (
                          <span className="text-slate-400">({evt.authorRole})</span>
                        )}
                      </div>

                      {/* Botões de Ação do Item Relacionado */}
                      <div className="flex items-center gap-2">
                        {evt.relatedItem && (
                          <button
                            type="button"
                            onClick={() => handleOpenRelated(evt.relatedItem)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:text-[#075BFF] text-slate-700 font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>{evt.relatedItem.label}</span>
                          </button>
                        )}

                        {/* Botão de Aditamento / Correção Formal (sem apagar o histórico) */}
                        {evt.categoryLabel.includes("Observação") && (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionTarget(evt);
                              setCorrectionText("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium transition-colors cursor-pointer text-[10px]"
                            title="Adicionar aditamento formal"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>Aditar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. AVISO DE AUDITORIA E IMUTABILIDADE */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-500">
        <Lock className="h-4 w-4 text-[#075BFF] shrink-0" />
        <span>
          <strong>Garantia de integridade e auditoria:</strong> Os registros desta linha do tempo são imutáveis. Nenhuma alteração silenciosa é permitida; qualquer aditamento ou correção é gravado como um novo evento com identificação do autor e timestamp.
        </span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADICIONAR OBSERVAÇÃO INTERNA */}
      {/* ========================================================================= */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Adicionar observação interna
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Esta anotação ficará registrada permanentemente no histórico com sua identificação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddInternalNote} className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Contexto do Autor */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <p className="text-slate-500">Autor do registro:</p>
              <p className="font-bold text-[#0B1739]">{profile?.name || user?.email || "Colaborador"}</p>
              <p className="text-[11px] text-slate-400">Serviço: {serviceTitle} ({protocolCode})</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Texto da observação <span className="text-red-500">*</span></label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ex: Cliente informou que a vistoria foi agendada para sexta-feira às 14h na marina..."
                rows={4}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                disabled={isSavingNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingNote || !noteText.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingNote ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Registrar observação</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ADITAMENTO FORMAL / CORREÇÃO DE REGISTRO ANTERIOR (AUDIT-LOG) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(correctionTarget)} onOpenChange={(open) => !open && setCorrectionTarget(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Registrar aditamento formal
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Correções geram um novo evento formal vinculado ao registro anterior.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveFormalCorrection} className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Evento Original */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Registro Original a ser aditado:</span>
              <p className="font-bold text-slate-800">{correctionTarget?.title}</p>
              <p className="text-slate-600 italic text-[11px]">"{correctionTarget?.description}"</p>
              <p className="text-[10px] text-slate-400">Registrado por {correctionTarget?.authorName} em {correctionTarget && formatDateTime(correctionTarget.date)}</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Novo texto do aditamento / correção <span className="text-red-500">*</span></label>
              <textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="Ex: Retificação: a vistoria foi reagendada para segunda-feira devido a condições climáticas..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCorrectionTarget(null)}
                disabled={isSavingCorrection}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingCorrection || !correctionText.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingCorrection ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Salvar aditamento formal</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
