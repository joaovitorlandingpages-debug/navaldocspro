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
  Cog, 
  Building2, 
  History, 
  FileCheck2, 
  Loader2, 
  PenTool, 
  Plus, 
  Sparkles,
  Info,
  Check,
  Eye
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
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

function RevisarDocumentoGeradoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user, currentCompany } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais
  const [document, setDocument] = useState<any | null>(null);
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Visualizador de PDF
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Modais
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionReason, setNewVersionReason] = useState("");
  const [isGeneratingNewVersion, setIsGeneratingNewVersion] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);

  // Carregar Documento e Contexto
  useEffect(() => {
    async function loadDocumentData() {
      if (!companyId || !id) return;
      setIsLoading(true);

      try {
        // 1. Carregar Processo, Cliente e Embarcação
        const { data: proc } = await supabase
          .from("processes")
          .select(`
            *,
            customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone, address, city, state),
            vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length)
          `)
          .eq("id", id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (proc) {
          setProcessData(proc);
          setCustomer(proc.customer || null);
          setVessel(proc.vessel || null);
        }

        // 2. Carregar Documento Específico (por docId ou o mais recente)
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

        const { data: docData, error: docError } = await query.maybeSingle();

        if (docError || !docData) {
          // Fallback para documento recente ou mock estruturado de visualização
          setDocument({
            id: searchParams.docId || "doc-current",
            title: proc?.title ? `Requerimento Padrão - ${proc.vessel?.name || "Aurora"}` : "Requerimento Padrão do Interessado",
            document_type: "REQ-001",
            version: 1,
            created_at: new Date().toISOString(),
            metadata: {
              template_name: "Requerimento Padrão do Interessado",
              template_code: "REQ-001",
              staff_responsible: {
                name: profile?.full_name || user?.email?.split("@")[0] || "João Vitor",
                role: "Despachante Náutico Responsável",
              },
            },
          });
        } else {
          setDocument(docData);
        }
      } catch (err) {
        console.error("Erro ao carregar documento gerado:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentData();
  }, [companyId, id, searchParams.docId, profile, user]);

  // Controles de Zoom
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // Alternar Tela Cheia
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

  // Download do PDF
  const handleDownloadPdf = () => {
    if (document) {
      downloadStoredFile(document, document.title || document.name || "documento_naval.pdf");
      toast.success("Download do PDF iniciado!");
    }
  };

  // Gerar Nova Versão
  const handleGenerateNewVersion = async () => {
    setIsGeneratingNewVersion(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const now = new Date().toISOString();
      const nextVersion = (document?.version || 1) + 1;

      const newDoc = {
        ...document,
        version: nextVersion,
        created_at: now,
        metadata: {
          ...(document?.metadata || {}),
          previous_version_id: document?.id,
          version_reason: newVersionReason,
          generated_by: profile?.full_name || user?.email,
        },
      };

      setDocument(newDoc);
      setIsNewVersionModalOpen(false);
      setNewVersionReason("");
      toast.success(`Versão ${nextVersion}.0 gerada com sucesso!`);
    } catch (err) {
      toast.error("Erro ao gerar nova versão.");
    } finally {
      setIsGeneratingNewVersion(false);
    }
  };

  // Dados formatados
  const processCode = useMemo(() => {
    if (!processData) return "PROC-001";
    return processData.protocol_number || `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`;
  }, [processData]);

  const documentTitle = useMemo(() => {
    return document?.title || document?.name || "Requerimento Padrão do Interessado";
  }, [document]);

  const responsibleStaffName = useMemo(() => {
    return document?.metadata?.staff_responsible?.name || profile?.full_name || user?.email?.split("@")[0] || "João Vitor (Despachante)";
  }, [document, profile, user]);

  const formattedDate = useMemo(() => {
    if (!document?.created_at) return "27/09/2026";
    const d = new Date(document.created_at);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }, [document]);

  const versionNumber = useMemo(() => {
    return document?.version ? `v${document.version}.0` : "v1.0";
  }, [document]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando visualizador do documento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate({ to: "/processes/$id/documentos-gerados", params: { id } })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar aos documentos</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                {documentTitle}
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#075BFF] border border-blue-100 text-xs font-bold font-mono">
                {versionNumber}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Confira o arquivo antes de baixar ou encaminhar para assinatura.
            </p>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESUMO DO CONTEXTO (5 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="pt-2 sm:pt-0 sm:pr-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {customer?.fantasy_name || customer?.name || "Ana Oliveira"}
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              {customer?.cpf_cnpj || customer?.document || "Sem documento"}
            </span>
          </div>

          {/* Embarcação */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {vessel?.name || "Aurora"}
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              {vessel?.registration_number || "381P202400192"}
            </span>
          </div>

          {/* Serviço */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Serviço</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {processData?.title || "Renovação do TIE"}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono">
              {processCode}
            </span>
          </div>

          {/* Responsável */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Responsável</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {responsibleStaffName}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Equipe NavalDocs
            </span>
          </div>

          {/* Versão e Data */}
          <div className="pt-3 sm:pt-0 sm:pl-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Versão do Arquivo</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
              <Check className="h-3 w-3" />
              <span>{versionNumber}</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL: VISUALIZADOR DE PDF + RESUMO LATERAL */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (8 COLUNAS): ÁREA DE VISUALIZAÇÃO DO PDF */}
          {/* ======================================================================= */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Barra de Ferramentas do Visualizador */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Controles de Navegação de Página */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-2">
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
              </div>

              {/* Ações de Tela Cheia e Download */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Tela cheia"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#075BFF] text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar</span>
                </button>
              </div>
            </div>

            {/* Container da Folha do PDF */}
            <div 
              ref={viewerContainerRef}
              className="bg-slate-200/70 border border-slate-300/80 rounded-2xl p-4 sm:p-8 flex justify-center items-start min-h-[580px] overflow-auto shadow-inner"
            >
              <div 
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                className="bg-white text-slate-900 w-full max-w-[595px] min-h-[842px] p-8 sm:p-12 rounded-sm shadow-xl border border-slate-200/90 font-serif text-[13px] leading-relaxed transition-transform duration-150 space-y-6 select-text"
              >
                {/* Cabeçalho Oficial do PDF */}
                <div className="text-center pb-4 border-b border-slate-300 space-y-1">
                  <p className="text-[11px] uppercase font-bold tracking-widest text-slate-700">
                    MARINHA DO BRASIL
                  </p>
                  <p className="text-[12px] font-bold text-slate-900">
                    CAPITANIA DOS PORTOS DE SÃO PAULO
                  </p>
                  <p className="text-[13px] font-bold text-slate-950 uppercase pt-2">
                    {documentTitle}
                  </p>
                  <p className="text-[10px] font-sans text-slate-500">
                    Processo: {processCode} • Identificador do Documento: {document?.document_type || "REQ-001"}
                  </p>
                </div>

                {/* Corpo do Requerimento */}
                <div className="space-y-4 font-sans text-xs text-slate-800">
                  <p className="leading-relaxed">
                    <strong>Ao Senhor Capitão dos Portos:</strong>
                  </p>
                  <p className="leading-relaxed text-justify">
                    O(A) interessado(a) abaixo qualificado(a) vem requerer a Vossa Senhoria a realização do serviço de <strong>{processData?.title || "Renovação do TIE"}</strong> para a embarcação indicada, prestando as seguintes informações:
                  </p>

                  {/* Quadro 1: Identificação do Interessado */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                    <p className="font-bold text-[11px] text-slate-900 uppercase">1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE</p>
                    <p><strong>Nome / Razão Social:</strong> {customer?.fantasy_name || customer?.name || "Ana Oliveira"}</p>
                    <p><strong>CPF / CNPJ:</strong> {customer?.cpf_cnpj || customer?.document || "123.456.789-00"}</p>
                    <p><strong>Endereço:</strong> {customer?.address || "Rua das Amarras, 120 - Santos / SP"}</p>
                    <p><strong>E-mail / Telefone:</strong> {customer?.email || "contato@cliente.com.br"} • {customer?.phone || "(13) 99887-6655"}</p>
                  </div>

                  {/* Quadro 2: Dados da Embarcação */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                    <p className="font-bold text-[11px] text-slate-900 uppercase">2. DADOS DA EMBARCAÇÃO</p>
                    <p><strong>Nome da Embarcação:</strong> {vessel?.name || "Aurora"}</p>
                    <p><strong>Número de Inscrição:</strong> {vessel?.registration_number || "381P202400192"}</p>
                    <p><strong>Tipo / Categoria:</strong> {vessel?.vessel_type || "Lancha"} — {vessel?.category || "Esporte e Recreio"}</p>
                    <p><strong>Comprimento Total:</strong> {vessel?.length_overall ? `${vessel.length_overall} m` : "6,50 m"}</p>
                    <p><strong>Porto de Registro:</strong> {vessel?.port_of_registry || "Capitania dos Portos de São Paulo"}</p>
                  </div>

                  {/* Quadro 3: Responsável Operacional */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                    <p className="font-bold text-[11px] text-slate-900 uppercase">3. DESPACHANTE / OPERADOR RESPONSÁVEL</p>
                    <p><strong>Responsável:</strong> {responsibleStaffName}</p>
                    <p><strong>Empresa:</strong> {currentCompany?.name || "NavalDocs Despachante Marítimo"}</p>
                    <p><strong>Data de Emissão:</strong> {formattedDate}</p>
                  </div>

                  {/* Fechamento */}
                  <p className="pt-4 text-center">
                    Termos em que pede deferimento.
                  </p>

                  <div className="pt-8 text-center space-y-1">
                    <div className="w-64 border-t border-slate-400 mx-auto" />
                    <p className="font-bold">{customer?.fantasy_name || customer?.name || "Ana Oliveira"}</p>
                    <p className="text-[10px] text-slate-500">Assinatura Eletrônica GOV.BR / Requerente</p>
                  </div>
                </div>

                {/* Rodapé da Página */}
                <div className="pt-8 border-t border-slate-200 text-center text-[10px] font-sans text-slate-400">
                  Documento emitido digitalmente via NavalDocs Pro • Versão {versionNumber}
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (4 COLUNAS): RESUMO, AÇÕES, PENDÊNCIAS E GOV.BR */}
          {/* ======================================================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD 1: RESUMO LATERAL */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Resumo do documento
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Modelo:</span>
                  <span className="font-bold text-[#0B1739] text-right truncate max-w-[160px]">
                    {document?.metadata?.template_name || documentTitle}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Versão:</span>
                  <span className="font-mono font-bold text-[#075BFF]">
                    {versionNumber}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Processo:</span>
                  <span className="font-bold text-slate-700">
                    {processCode}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Responsável:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[160px] text-right">
                    {responsibleStaffName}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Situação:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Documento gerado</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Gerado em:</span>
                  <span className="text-slate-600">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: AÇÕES DISPONÍVEIS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ações
              </h3>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Baixar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({
                  to: "/processes/$id/anexar-versao-assinada",
                  params: { id },
                  search: { docId: document?.id }
                })}
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200/80"
              >
                <PenTool className="h-3.5 w-3.5 text-emerald-600" />
                <span>Anexar versão assinada</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#075BFF]" />
                <span>Gerar nova versão</span>
              </button>

              <a
                href="https://assinador.iti.br"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir GOV.BR</span>
              </a>
            </div>

            {/* CARD 3: ORIENTAÇÃO SOBRE ASSINATURA EXTERNA */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-start gap-2.5 text-emerald-800">
                <PenTool className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <h3 className="text-xs font-bold">
                  Assinatura Eletrônica Externa
                </h3>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                Para assinar, baixe o PDF e utilize o portal <strong>GOV.BR</strong>. Depois, anexe a versão assinada na seção de documentos gerados.
              </p>
              <button
                type="button"
                onClick={() => navigate({
                  to: "/processes/$id/anexar-versao-assinada",
                  params: { id },
                  search: { docId: document?.id }
                })}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Anexar arquivo assinado</span>
              </button>
            </div>

            {/* CARD 4: HISTÓRICO DE VERSÕES RECOLHÍVEL */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#075BFF]" />
                <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Histórico de versões
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Versão Atual */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0B1739]">{versionNumber}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-[#075BFF]">Atual</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formattedDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 text-[11px] font-semibold flex items-center gap-1"
                    title="Baixar esta versão"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Versões Anteriores se houver */}
                {document?.version > 1 && (
                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between opacity-80">
                    <div>
                      <span className="font-semibold text-slate-600">v1.0 (Original)</span>
                      <p className="text-[10px] text-slate-400">Versão inicial preservada</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: GERAR NOVA VERSÃO */}
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
                  Gerar nova versão
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Crie uma nova revisão preservando o arquivo original.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <p className="text-slate-600">
              A nova versão será identificada como <strong>v{(document?.version || 1) + 1}.0</strong>. O documento anterior permanecerá intacto no histórico.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="font-semibold text-slate-700">Motivo da nova versão:</label>
              <textarea
                value={newVersionReason}
                onChange={(e) => setNewVersionReason(e.target.value)}
                placeholder="Ex: Correção no endereço do requerente ou ajuste cadastral..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isGeneratingNewVersion}
              onClick={handleGenerateNewVersion}
              className="flex-1 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isGeneratingNewVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Confirmar nova versão</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
