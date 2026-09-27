import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Plus, 
  Search, 
  Lightbulb, 
  Bug, 
  HelpCircle, 
  MoreHorizontal, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Paperclip, 
  X, 
  Loader2, 
  MessageSquare, 
  Sparkles, 
  Folder, 
  ChevronRight, 
  FileText, 
  Eye, 
  Download, 
  User, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/sugestoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    context: (search.context as string) || undefined,
    type: (search.type as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <SugestoesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Tipos de Sugestão
const SUGGESTION_TYPES = [
  { value: "ideia", label: "Ideia de melhoria", icon: Lightbulb, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "problema", label: "Problema encontrado", icon: Bug, color: "bg-red-50 text-red-700 border-red-200" },
  { value: "duvida", label: "Dúvida", icon: HelpCircle, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "outro", label: "Outro", icon: MessageSquare, color: "bg-slate-50 text-slate-700 border-slate-200" },
];

// Contextos / Áreas Relacionadas
const CONTEXT_AREAS = [
  { value: "geral", label: "Geral" },
  { value: "clientes", label: "Clientes" },
  { value: "embarcacoes", label: "Embarcações" },
  { value: "processos", label: "Processos" },
  { value: "documentos", label: "Documentos" },
  { value: "protocolos", label: "Protocolos" },
  { value: "configuracoes", label: "Configurações" },
  { value: "outro", label: "Outro" },
];

// Estados Oficiais Suportados
const SUGGESTION_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  recebida: { label: "Recebida", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  em_analise: { label: "Em análise", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  planejada: { label: "Planejada", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Sparkles },
  em_desenvolvimento: { label: "Em desenvolvimento", color: "bg-amber-50 text-amber-700 border-amber-200", icon: RefreshCw },
  implementada: { label: "Implementada", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  nao_prevista: { label: "Não prevista", color: "bg-slate-100 text-slate-500 border-slate-200", icon: AlertCircle },
  encerrada: { label: "Encerrada", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Check },
};

function SugestoesPage() {
  const searchParams = Route.useSearch();
  const { profile, user, currentCompany } = useAuth();
  const companyId = profile?.company_id;

  // Estados de Listagem e Filtros
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterContext, setFilterContext] = useState<string>("all");

  // Modal de Envio de Sugestão
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>(searchParams.type || "ideia");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"baixa" | "media" | "alta">("media");
  const [newContext, setNewContext] = useState<string>(searchParams.context || "geral");
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Detalhes da Sugestão
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Carregar Sugestões da Empresa / Usuário
  const loadSuggestions = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error("Erro ao carregar sugestões:", err);
      toast.error("Não foi possível carregar a lista de sugestões.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Enviar Nova Sugestão
  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !companyId) {
      toast.error("Por favor, preencha o título e a descrição da sugestão.");
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = null;
      let attachmentName = null;

      // 1. Upload do Anexo Opcional
      if (selectedAttachment) {
        const uploadRes = await uploadToBucket({
          bucket: "documents",
          file: selectedAttachment,
          companyId: companyId,
          prefix: "suggestions",
        });
        attachmentUrl = uploadRes.publicUrl || uploadRes.storagePath;
        attachmentName = selectedAttachment.name;
      }

      const now = new Date().toISOString();
      const userName = profile?.full_name || user?.email?.split("@")[0] || "Operador";

      // 2. Persistência na Tabela tickets
      const metadata = {
        suggestion_type: newType,
        context_area: newContext,
        priority: newPriority,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        submitted_by_name: userName,
        submitted_by_email: user?.email,
        status_history: [
          { status: "recebida", date: now, user: "Sistema", notes: "Sugestão recebida pela plataforma." }
        ],
      };

      const { data: newTicket, error } = await supabase
        .from("tickets")
        .insert({
          company_id: companyId,
          user_id: user?.id || profile?.id,
          title: newTitle.trim(),
          description: newDescription.trim(),
          type: "suggestion",
          category: newContext,
          status: "recebida",
          metadata: metadata,
        } as any)
        .select("*")
        .single();

      if (error) throw error;

      toast.success("Sugestão enviada com sucesso!", {
        description: "Nossa equipe irá analisar sua contribuição com atenção.",
      });

      // Resetar Formulário
      setNewTitle("");
      setNewDescription("");
      setSelectedAttachment(null);
      setIsNewModalOpen(false);
      loadSuggestions();
    } catch (err: any) {
      console.error("Erro ao enviar sugestão:", err);
      toast.error(err?.message || "Falha ao enviar sugestão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtros Aplicados
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const type = s.metadata?.suggestion_type || (s.type === "suggestion" ? "ideia" : s.type) || "ideia";
      const status = s.status || "recebida";
      const context = s.metadata?.context_area || s.category || "geral";

      if (filterType !== "all" && type !== filterType) return false;
      if (filterStatus !== "all" && status !== filterStatus) return false;
      if (filterContext !== "all" && context !== filterContext) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (s.title || "").toLowerCase().includes(term);
        const matchDesc = (s.description || "").toLowerCase().includes(term);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [suggestions, filterType, filterStatus, filterContext, searchTerm]);

  // Formatação de Data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Sugestões
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Envie uma ideia ou informe algo que pode melhorar o sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Enviar sugestão</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE PESQUISA E FILTROS */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filtro de Tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos os tipos</option>
            {SUGGESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Filtro de Situação */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todas as situações</option>
            {Object.entries(SUGGESTION_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Filtro de Contexto */}
          <select
            value={filterContext}
            onChange={(e) => setFilterContext(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todas as áreas</option>
            {CONTEXT_AREAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* ========================================================================= */}
        {/* LISTAGEM DAS SUGESTÕES */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
            <Loader2 className="h-7 w-7 text-[#075BFF] animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Carregando sugestões...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto">
              <Lightbulb className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B1739]">
              {suggestions.length === 0 ? "Nenhuma sugestão enviada ainda" : "Nenhuma sugestão encontrada"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {suggestions.length === 0 
                ? "Sua opinião é fundamental para a evolução contínua do NavalDocs Pro. Compartilhe sua ideia ou relate um problema."
                : "Tente ajustar os filtros ou termos da busca para encontrar o registro desejado."}
            </p>
            {suggestions.length === 0 && (
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Enviar primeira sugestão</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map((sug) => {
              const typeKey = sug.metadata?.suggestion_type || "ideia";
              const typeConfig = SUGGESTION_TYPES.find((t) => t.value === typeKey) || SUGGESTION_TYPES[0];
              const TypeIcon = typeConfig.icon;
              
              const statusKey = sug.status || "recebida";
              const statusConfig = SUGGESTION_STATUSES[statusKey] || SUGGESTION_STATUSES.recebida;
              const StatusIcon = statusConfig.icon;

              const contextLabel = CONTEXT_AREAS.find((c) => c.value === (sug.metadata?.context_area || sug.category))?.label || "Geral";
              const hasResponse = !!sug.metadata?.team_response;

              return (
                <div
                  key={sug.id}
                  onClick={() => {
                    setSelectedSuggestion(sug);
                    setIsDetailModalOpen(true);
                  }}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl p-5 shadow-xs transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeConfig.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        <span>{typeConfig.label}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                        {contextLabel}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        Enviada em {formatDate(sug.created_at)}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border self-start sm:self-auto ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                      {sug.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {sug.description}
                    </p>
                  </div>

                  {hasResponse && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[#075BFF] font-bold text-[11px]">
                        <span>Resposta da Equipe NavalDocs:</span>
                        <span className="text-slate-400 font-normal">
                          {formatDate(sug.metadata.team_response_date)}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px] line-clamp-1">
                        {sug.metadata.team_response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ENVIAR SUGESTÃO */}
      {/* ========================================================================= */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Enviar sugestão ou melhoria
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Compartilhe sua ideia ou relate uma dificuldade no sistema.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSuggestion} className="p-5 space-y-4">
            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Título da sugestão <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Adicionar exportação de relatório em Excel..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Tipo e Área */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Tipo de contribuição <span className="text-red-500">*</span>
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {SUGGESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Área relacionada
                </label>
                <select
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {CONTEXT_AREAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Descrição detalhada <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {newDescription.length}/1000 caracteres
                </span>
              </div>
              <textarea
                required
                maxLength={1000}
                rows={4}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descreva sua sugestão com detalhes, explicando o que facilitaria sua rotina ou o problema encontrado..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Anexo Opcional */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Anexo (opcional - PDF ou imagem máx. 10MB)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedAttachment(e.target.files[0]);
                  }
                }}
              />

              {!selectedAttachment ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#075BFF] bg-slate-50/50 hover:bg-blue-50/20 text-xs font-medium text-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[#075BFF]" />
                  <span>Anexar imagem de captura ou documento PDF</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800 truncate max-w-[280px]">
                    {selectedAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedAttachment(null)}
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Aviso de Privacidade */}
            <p className="text-[10px] text-slate-400">
              Não compartilhe dados sensíveis de clientes ou documentos com CPF/CNPJ nos anexos de sugestão.
            </p>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Enviar sugestão</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA SUGESTÃO E RESPOSTA */}
      {/* ========================================================================= */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-[#0B1739] truncate">
                  {selectedSuggestion?.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Enviada em {formatDate(selectedSuggestion?.created_at)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {/* Situação e Tipo */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-semibold">Situação:</span>
              <span className="font-bold text-[#075BFF]">
                {SUGGESTION_STATUSES[selectedSuggestion?.status || "recebida"]?.label || "Recebida"}
              </span>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Descrição</label>
              <p className="p-3 bg-white rounded-xl border border-slate-200/80 leading-relaxed text-slate-700 whitespace-pre-wrap">
                {selectedSuggestion?.description}
              </p>
            </div>

            {/* Resposta da Equipe se houver */}
            {selectedSuggestion?.metadata?.team_response && (
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[#075BFF] font-bold">
                  <span>Resposta da Equipe NavalDocs</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatDate(selectedSuggestion.metadata.team_response_date)}
                  </span>
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {selectedSuggestion.metadata.team_response}
                </p>
              </div>
            )}
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
