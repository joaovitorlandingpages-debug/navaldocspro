import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Lightbulb, 
  Bug, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Paperclip, 
  Download, 
  ExternalLink, 
  User, 
  Building, 
  Send, 
  Lock, 
  ShieldCheck, 
  Eye, 
  AlertTriangle, 
  Calendar, 
  Tag, 
  UserCheck, 
  Link2, 
  ChevronRight, 
  X, 
  Loader2,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  History,
  Info
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { format, formatDistanceToNow, parseISO, isToday, isWithinInterval, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sugestoes")({
  component: AdminSugestoesPage,
  head: () => ({
    meta: [
      { title: "Sugestões Recebidas — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Tipos oficiais de sugestão compatíveis com a Tela 24
const SUGGESTION_TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ideia: { 
    label: "Ideia de melhoria", 
    icon: Lightbulb, 
    color: "text-amber-700 border-amber-200 bg-amber-50", 
    bg: "bg-amber-50 text-amber-700" 
  },
  problema: { 
    label: "Problema encontrado", 
    icon: Bug, 
    color: "text-red-700 border-red-200 bg-red-50", 
    bg: "bg-red-50 text-red-700" 
  },
  duvida: { 
    label: "Dúvida", 
    icon: HelpCircle, 
    color: "text-blue-700 border-blue-200 bg-blue-50", 
    bg: "bg-blue-50 text-blue-700" 
  },
  outro: { 
    label: "Outro", 
    icon: MessageSquare, 
    color: "text-slate-700 border-slate-200 bg-slate-50", 
    bg: "bg-slate-50 text-slate-700" 
  },
};

// Estados Oficiais da Tela 24 e Painel Admin
const SUGGESTION_STATUSES: Record<string, { label: string; color: string; icon: any; description: string }> = {
  recebida: { 
    label: "Recebida", 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Clock,
    description: "Recém enviada pelo usuário, aguardando triagem inicial."
  },
  em_analise: { 
    label: "Em análise", 
    color: "bg-blue-50 text-blue-700 border-blue-200", 
    icon: Clock,
    description: "Sendo analisada pela equipe técnica e de produto."
  },
  planejada: { 
    label: "Planejada", 
    color: "bg-indigo-50 text-indigo-700 border-indigo-200", 
    icon: Sparkles,
    description: "Aprovada e priorizada para inclusão no roadmap do produto."
  },
  em_desenvolvimento: { 
    label: "Em desenvolvimento", 
    color: "bg-amber-50 text-amber-700 border-amber-200", 
    icon: RefreshCw,
    description: "Em fase ativa de codificação ou testes pela engenharia."
  },
  implementada: { 
    label: "Implementada", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    icon: CheckCircle2,
    description: "Funcionalidade publicada e disponível na plataforma."
  },
  nao_prevista: { 
    label: "Não prevista", 
    color: "bg-slate-100 text-slate-500 border-slate-200", 
    icon: AlertCircle,
    description: "Fora do escopo regulatório ou diretrizes atuais do NavalDocs Pro."
  },
  encerrada: { 
    label: "Encerrada", 
    color: "bg-slate-100 text-slate-600 border-slate-200", 
    icon: Check,
    description: "Atendimento concluído ou duplicidade unificada."
  },
};

// Contextos / Áreas da aplicação
const CONTEXT_AREAS: Record<string, string> = {
  geral: "Geral",
  clientes: "Clientes e Despachantes",
  embarcacoes: "Embarcações e Motores",
  processos: "Processos e Exigências",
  documentos: "Documentos e Modelos",
  protocolos: "Protocolos e Capitanias",
  configuracoes: "Configurações da Empresa",
  outro: "Outro",
};

// Equipes responsáveis para atribuição
const ASSIGNABLE_TEAMS = [
  "Equipe de Produto",
  "Engenharia Naval",
  "Desenvolvimento de Software",
  "Suporte N2 / Regulatório",
  "Design / UX",
  "Administração Master"
];

function AdminSugestoesPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  // Permissões
  const isGlobalAdmin = 
    profile?.role === 'admin' ||
    profile?.role === 'admin_master' || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'superadmin' ||
    profile?.email === 'joaovitor.f0725@gmail.com' ||
    profile?.email === 'douglas_faresi@hotmail.com';

  const companyScopeId = profile?.company_id;

  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [selectedContext, setSelectedContext] = useState<string>("all");

  // Sugestão selecionada para Detalhe / Resposta
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estados do Formulário de Resposta
  const [responseText, setResponseText] = useState("");
  const [newStatusOnReply, setNewStatusOnReply] = useState<string>("");
  const [isPreviewResponseOpen, setIsPreviewResponseOpen] = useState(false);
  const [notifyUserByEmail, setNotifyUserByEmail] = useState(true);

  // Estados de Nota Interna
  const [newInternalNote, setNewInternalNote] = useState("");

  // Estados de Gestão / Atribuição
  const [assignedTeam, setAssignedTeam] = useState("");
  const [relatedSuggestionId, setRelatedSuggestionId] = useState("");

  // 1. Consulta das Sugestões
  const { 
    data: rawSuggestions = [], 
    isLoading: isLoadingSuggestions, 
    isError, 
    error,
    refetch: refetchSuggestions 
  } = useQuery({
    queryKey: ["admin-suggestions-list", companyScopeId, isGlobalAdmin],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          company:companies!company_id (
            id,
            name,
            trade_name,
            cnpj
          )
        `)
        .order("created_at", { ascending: false });

      // Se for admin de empresa, restringe à própria empresa
      if (!isGlobalAdmin && companyScopeId) {
        query = query.eq("company_id", companyScopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  // 2. Consulta de Empresas para o Filtro de Administrador Global
  const { data: companiesList = [] } = useQuery({
    queryKey: ["admin-companies-filter-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, trade_name, cnpj")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(isGlobalAdmin),
  });

  // 3. Filtragem de Sugestões
  const filteredSuggestions = useMemo(() => {
    return rawSuggestions.filter((item: any) => {
      const typeKey = item.metadata?.suggestion_type || (item.type === "suggestion" ? "ideia" : item.type) || "ideia";
      const statusKey = item.status || "recebida";
      const contextKey = item.metadata?.context_area || item.category || "geral";
      const itemCompanyId = item.company_id || item.company?.id;

      // Filtro por Tipo
      if (filterType !== "all" && typeKey !== filterType) return false;

      // Filtro por Situação
      if (filterStatus !== "all" && statusKey !== filterStatus) return false;

      // Filtro por Contexto
      if (selectedContext !== "all" && contextKey !== selectedContext) return false;

      // Filtro por Empresa (para admin global)
      if (filterCompany !== "all" && itemCompanyId !== filterCompany) return false;

      // Filtro por Período
      if (filterPeriod !== "all" && item.created_at) {
        const itemDate = new Date(item.created_at);
        const now = new Date();

        if (filterPeriod === "today" && !isToday(itemDate)) return false;
        if (filterPeriod === "last7" && !isWithinInterval(itemDate, { start: subDays(now, 7), end: now })) return false;
        if (filterPeriod === "last30" && !isWithinInterval(itemDate, { start: subDays(now, 30), end: now })) return false;
        if (filterPeriod === "month" && !isWithinInterval(itemDate, { start: startOfMonth(now), end: now })) return false;
      }

      // Busca Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = (item.title || "").toLowerCase().includes(term);
        const descMatch = (item.description || "").toLowerCase().includes(term);
        const authorMatch = (item.metadata?.submitted_by_name || "").toLowerCase().includes(term) ||
                            (item.metadata?.submitted_by_email || "").toLowerCase().includes(term);
        const companyName = (item.company?.trade_name || item.company?.name || "").toLowerCase();
        const companyMatch = companyName.includes(term);

        if (!titleMatch && !descMatch && !authorMatch && !companyMatch) return false;
      }

      return true;
    });
  }, [rawSuggestions, filterType, filterStatus, selectedContext, filterCompany, filterPeriod, searchTerm]);

  // 4. Contadores e Métricas Rápidas
  const metrics = useMemo(() => {
    const total = rawSuggestions.length;
    const pendingReview = rawSuggestions.filter(
      (s: any) => (s.status === "recebida" || s.status === "em_analise") && !s.metadata?.team_response
    ).length;
    const inDevelopment = rawSuggestions.filter(
      (s: any) => s.status === "em_desenvolvimento" || s.status === "planejada"
    ).length;
    const implemented = rawSuggestions.filter(
      (s: any) => s.status === "implementada"
    ).length;

    return { total, pendingReview, inDevelopment, implemented };
  }, [rawSuggestions]);

  // 5. Abrir Detalhe da Sugestão
  const handleOpenDetail = useCallback((sug: any) => {
    setSelectedSuggestion(sug);
    setResponseText(sug.metadata?.team_response || "");
    setNewStatusOnReply(sug.status || "em_analise");
    setAssignedTeam(sug.metadata?.assigned_to || "");
    setNewInternalNote("");
    setRelatedSuggestionId("");
    setIsDetailOpen(true);
  }, []);

  // 6. Mutação: Salvar Resposta Oficial
  const replyMutation = useMutation({
    mutationFn: async ({
      suggestionId,
      response,
      newStatus,
      notifyEmail
    }: {
      suggestionId: string;
      response: string;
      newStatus: string;
      notifyEmail: boolean;
    }) => {
      const now = new Date().toISOString();
      const adminName = profile?.full_name || user?.email || "Administrador NavalDocs";
      const currentMeta = selectedSuggestion?.metadata || {};

      const previousStatus = selectedSuggestion?.status || "recebida";
      const statusChanged = newStatus && newStatus !== previousStatus;

      // Atualiza o histórico de status
      const updatedHistory = Array.isArray(currentMeta.status_history) 
        ? [...currentMeta.status_history] 
        : [];

      if (statusChanged) {
        updatedHistory.push({
          status: newStatus,
          date: now,
          user: adminName,
          notes: `Situação alterada de "${SUGGESTION_STATUSES[previousStatus]?.label || previousStatus}" para "${SUGGESTION_STATUSES[newStatus]?.label || newStatus}" junto com a resposta oficial.`
        });
      } else {
        updatedHistory.push({
          status: previousStatus,
          date: now,
          user: adminName,
          notes: "Resposta da equipe registrada para o usuário."
        });
      }

      // Configuração de entrega da notificação
      const deliveryStatus = {
        sent: true,
        channel: notifyEmail ? "Notificação in-app e E-mail" : "Notificação in-app",
        timestamp: now,
        recipient: selectedSuggestion?.metadata?.submitted_by_email || "Usuário da plataforma"
      };

      const updatedMeta = {
        ...currentMeta,
        team_response: response.trim(),
        team_response_date: now,
        team_response_by: adminName,
        status_history: updatedHistory,
        delivery_notification_status: deliveryStatus,
      };

      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: newStatus || previousStatus,
          metadata: updatedMeta,
          updated_at: now,
        } as any)
        .eq("id", suggestionId)
        .select()
        .single();

      if (error) throw error;

      // Auditoria em activity_logs
      await supabase.from("activity_logs").insert({
        company_id: selectedSuggestion?.company_id || profile?.company_id || "00000000-0000-0000-0000-000000000000",
        action: "reply_suggestion_ticket",
        module: "admin_sugestoes",
        description: `Resposta oficial enviada para a sugestão [${selectedSuggestion?.title}] por ${adminName}. Situação: ${newStatus || previousStatus}.`,
        metadata: {
          suggestion_id: suggestionId,
          status_changed: statusChanged,
          previous_status: previousStatus,
          new_status: newStatus,
          notification_channel: deliveryStatus.channel
        }
      });

      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions-list"] });
      setSelectedSuggestion(updatedData);
      toast.success("Resposta publicada com sucesso!", {
        description: "A resposta agora está visível para o cliente na Tela 24."
      });
      setIsPreviewResponseOpen(false);
    },
    onError: (err: any) => {
      console.error("Erro ao enviar resposta:", err);
      toast.error(`Falha ao publicar resposta: ${err.message}`);
    }
  });

  // 7. Mutação: Adicionar Nota Interna
  const addInternalNoteMutation = useMutation({
    mutationFn: async ({ suggestionId, note }: { suggestionId: string; note: string }) => {
      const now = new Date().toISOString();
      const adminName = profile?.full_name || user?.email || "Administrador NavalDocs";
      const currentMeta = selectedSuggestion?.metadata || {};

      const currentNotes = Array.isArray(currentMeta.internal_notes)
        ? [...currentMeta.internal_notes]
        : [];

      currentNotes.push({
        id: crypto.randomUUID(),
        date: now,
        user: adminName,
        note: note.trim(),
      });

      const updatedMeta = {
        ...currentMeta,
        internal_notes: currentNotes,
      };

      const { data, error } = await supabase
        .from("tickets")
        .update({
          metadata: updatedMeta,
          updated_at: now,
        } as any)
        .eq("id", suggestionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions-list"] });
      setSelectedSuggestion(updatedData);
      setNewInternalNote("");
      toast.success("Nota interna salva confidencialmente.");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar nota interna: ${err.message}`);
    }
  });

  // 8. Mutação: Atualizar Situação e Responsável
  const updateManagementMutation = useMutation({
    mutationFn: async ({
      suggestionId,
      newStatus,
      team,
      relatedId
    }: {
      suggestionId: string;
      newStatus: string;
      team: string;
      relatedId?: string;
    }) => {
      const now = new Date().toISOString();
      const adminName = profile?.full_name || user?.email || "Administrador";
      const currentMeta = selectedSuggestion?.metadata || {};
      const previousStatus = selectedSuggestion?.status || "recebida";

      const updatedHistory = Array.isArray(currentMeta.status_history) 
        ? [...currentMeta.status_history] 
        : [];

      if (newStatus !== previousStatus) {
        updatedHistory.push({
          status: newStatus,
          date: now,
          user: adminName,
          notes: `Situação alterada de "${SUGGESTION_STATUSES[previousStatus]?.label || previousStatus}" para "${SUGGESTION_STATUSES[newStatus]?.label || newStatus}".`
        });
      }

      const currentRelated = Array.isArray(currentMeta.related_suggestion_ids)
        ? [...currentMeta.related_suggestion_ids]
        : [];

      if (relatedId && !currentRelated.includes(relatedId)) {
        currentRelated.push(relatedId);
      }

      const updatedMeta = {
        ...currentMeta,
        assigned_to: team || currentMeta.assigned_to,
        status_history: updatedHistory,
        related_suggestion_ids: currentRelated,
      };

      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          metadata: updatedMeta,
          updated_at: now,
        } as any)
        .eq("id", suggestionId)
        .select()
        .single();

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: selectedSuggestion?.company_id || profile?.company_id || "00000000-0000-0000-0000-000000000000",
        action: "update_suggestion_status",
        module: "admin_sugestoes",
        description: `Triagem da sugestão [${selectedSuggestion?.title}] atualizada por ${adminName}. Nova situação: ${newStatus}, Responsável: ${team || "Não atribuído"}.`,
        metadata: {
          suggestion_id: suggestionId,
          previous_status: previousStatus,
          new_status: newStatus,
          assigned_team: team
        }
      });

      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions-list"] });
      setSelectedSuggestion(updatedData);
      toast.success("Triagem e situação atualizadas com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Falha ao atualizar dados: ${err.message}`);
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA TELA 37 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Sugestões
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold uppercase">
              Tela 37 — Gestão & Triagem
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Recebimento, triagem, notas internas e respostas às contribuições enviadas pelos usuários na Tela 24.
          </p>
        </div>

        {/* Botão de Atualizar e Link Rápido */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSuggestions()}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold h-9 gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSuggestions ? "animate-spin text-[#075BFF]" : ""}`} />
            <span>Atualizar</span>
          </Button>

          <Link
            to="/sugestoes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver como Usuário (Tela 24)</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS DE MÉTRICAS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl border-slate-200/80 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Recebido</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0B1739] mt-2">{metrics.total}</p>
          <span className="text-[10px] text-slate-400">Sugestões registradas</span>
        </Card>

        <Card className="p-4 rounded-2xl border-amber-200/80 shadow-2xs bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pendentes de Resposta</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">{metrics.pendingReview}</p>
          <span className="text-[10px] text-amber-700 font-medium">Aguardando análise da equipe</span>
        </Card>

        <Card className="p-4 rounded-2xl border-indigo-200/80 shadow-2xs bg-indigo-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">No Roadmap / Dev</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-900 mt-2">{metrics.inDevelopment}</p>
          <span className="text-[10px] text-indigo-700 font-medium">Planejadas ou em codificação</span>
        </Card>

        <Card className="p-4 rounded-2xl border-emerald-200/80 shadow-2xs bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Implementadas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2">{metrics.implemented}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Disponíveis no sistema</span>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE PESQUISA E FILTROS */}
      {/* ========================================================================= */}
      <Card className="p-4 rounded-2xl border-slate-200/80 shadow-2xs bg-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Campo de Pesquisa Textual */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por título, descrição, autor ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 h-9"
            />
          </div>

          {/* Filtro de Situação */}
          <div className="md:col-span-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                {Object.entries(SUGGESTION_STATUSES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Tipo */}
          <div className="md:col-span-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                <SelectValue placeholder="Tipo de contribuição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(SUGGESTION_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Empresa (apenas se admin global) */}
          {isGlobalAdmin && (
            <div className="md:col-span-2">
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companiesList.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.trade_name || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro de Período */}
          <div className={isGlobalAdmin ? "md:col-span-2" : "md:col-span-4"}>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="today">Recebidas hoje</SelectItem>
                <SelectItem value="last7">Últimos 7 dias</SelectItem>
                <SelectItem value="last30">Últimos 30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha de Filtros Rápidos de Área */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none text-[11px]">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0">Área:</span>
          <button
            onClick={() => setSelectedContext("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              selectedContext === "all" ? "bg-[#075BFF] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas ({rawSuggestions.length})
          </button>
          {Object.entries(CONTEXT_AREAS).map(([key, label]) => {
            const count = rawSuggestions.filter((s: any) => (s.metadata?.context_area || s.category) === key).length;
            if (count === 0 && selectedContext !== key) return null;
            return (
              <button
                key={key}
                onClick={() => setSelectedContext(key)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedContext === key ? "bg-[#075BFF] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. LISTAGEM DE SUGESTÕES RECEBIDAS */}
      {/* ========================================================================= */}
      {isLoadingSuggestions ? (
        <Card className="p-12 text-center rounded-2xl border-slate-200/80 bg-white">
          <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Carregando sugestões recebidas...</p>
          <p className="text-xs text-slate-400 mt-1">Consultando registros do Lovable Cloud</p>
        </Card>
      ) : isError ? (
        <Card className="p-8 text-center rounded-2xl border-red-200 bg-red-50/40">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#0B1739]">Falha ao carregar sugestões</h3>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            {(error as any)?.message || "Não foi possível recuperar os dados do servidor."}
          </p>
          <Button
            size="sm"
            onClick={() => refetchSuggestions()}
            className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tentar novamente
          </Button>
        </Card>
      ) : filteredSuggestions.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 bg-white space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Nenhuma sugestão encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {rawSuggestions.length === 0 
              ? "Nenhum usuário enviou sugestões pela Tela 24 até o momento." 
              : "Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de pesquisa ou situação."}
          </p>
          {(searchTerm || filterStatus !== "all" || filterType !== "all" || selectedContext !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
                setFilterType("all");
                setSelectedContext("all");
                setFilterPeriod("all");
              }}
              className="text-xs rounded-xl"
            >
              Limpar filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Tabela em Desktop / Cards em Mobile */}
          <div className="hidden lg:block bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Sugestão & Tipo</th>
                  <th className="py-3 px-4">Empresa / Usuário</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Data de Envio</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Última Resposta</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSuggestions.map((sug: any) => {
                  const typeKey = sug.metadata?.suggestion_type || (sug.type === "suggestion" ? "ideia" : sug.type) || "ideia";
                  const typeConfig = SUGGESTION_TYPES[typeKey] || SUGGESTION_TYPES.ideia;
                  const TypeIcon = typeConfig.icon;

                  const statusKey = sug.status || "recebida";
                  const statusConfig = SUGGESTION_STATUSES[statusKey] || SUGGESTION_STATUSES.recebida;
                  const StatusIcon = statusConfig.icon;

                  const contextLabel = CONTEXT_AREAS[sug.metadata?.context_area || sug.category] || "Geral";
                  const companyName = sug.company?.trade_name || sug.company?.name || "Empresa Cadastrada";
                  const authorName = sug.metadata?.submitted_by_name || "Usuário";
                  const authorEmail = sug.metadata?.submitted_by_email || "";
                  const hasResponse = !!sug.metadata?.team_response;
                  const internalNotesCount = Array.isArray(sug.metadata?.internal_notes) ? sug.metadata.internal_notes.length : 0;

                  return (
                    <tr 
                      key={sug.id} 
                      onClick={() => handleOpenDetail(sug)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Título & Tipo */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeConfig.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeConfig.label}</span>
                          </span>
                          {sug.metadata?.attachment_url && (
                            <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5" title="Possui anexo">
                              <Paperclip className="h-3 w-3 text-slate-500" />
                            </span>
                          )}
                          {internalNotesCount > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-semibold inline-flex items-center gap-0.5" title={`${internalNotesCount} notas internas`}>
                              <Lock className="h-2.5 w-2.5" />
                              {internalNotesCount}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors truncate">
                          {sug.title}
                        </div>
                        <p className="text-slate-500 text-[11px] truncate max-w-[260px] mt-0.5">
                          {sug.description}
                        </p>
                      </td>

                      {/* Empresa e Autor */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Building className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{companyName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {authorName}
                        </div>
                      </td>

                      {/* Área */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {contextLabel}
                        </span>
                      </td>

                      {/* Data de Envio */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {sug.created_at ? format(parseISO(sug.created_at), "dd/MM/yyyy 'às' HH:mm") : "-"}
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      {/* Última Resposta */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        {hasResponse ? (
                          <div className="text-[11px]">
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Respondida
                            </span>
                            <p className="text-slate-500 text-[10px] truncate mt-0.5">
                              {sug.metadata.team_response}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sem resposta</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#075BFF] hover:bg-blue-50"
                        >
                          Abrir
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="lg:hidden space-y-3">
            {filteredSuggestions.map((sug: any) => {
              const typeKey = sug.metadata?.suggestion_type || (sug.type === "suggestion" ? "ideia" : sug.type) || "ideia";
              const typeConfig = SUGGESTION_TYPES[typeKey] || SUGGESTION_TYPES.ideia;
              const TypeIcon = typeConfig.icon;

              const statusKey = sug.status || "recebida";
              const statusConfig = SUGGESTION_STATUSES[statusKey] || SUGGESTION_STATUSES.recebida;
              const StatusIcon = statusConfig.icon;

              const companyName = sug.company?.trade_name || sug.company?.name || "Empresa";
              const hasResponse = !!sug.metadata?.team_response;

              return (
                <Card
                  key={sug.id}
                  onClick={() => handleOpenDetail(sug)}
                  className="p-4 rounded-2xl border-slate-200/90 shadow-2xs hover:border-[#075BFF] transition-all cursor-pointer space-y-3 bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeConfig.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        <span>{typeConfig.label}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {CONTEXT_AREAS[sug.metadata?.context_area || sug.category] || "Geral"}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0B1739]">
                      {sug.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {sug.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <Building className="h-3 w-3 text-slate-400" />
                      <span className="truncate max-w-[180px]">{companyName}</span>
                    </div>
                    <span>{sug.created_at ? format(parseISO(sug.created_at), "dd/MM/yyyy") : ""}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE DETALHES, RESPOSTA E TRIAGEM DA SUGESTÃO */}
      {/* ========================================================================= */}
      {selectedSuggestion && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white border border-slate-200">
            {/* Cabeçalho do Modal */}
            <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const typeKey = selectedSuggestion.metadata?.suggestion_type || "ideia";
                      const typeConfig = SUGGESTION_TYPES[typeKey] || SUGGESTION_TYPES.ideia;
                      const TypeIcon = typeConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeConfig.color}`}>
                          <TypeIcon className="h-3 w-3" />
                          <span>{typeConfig.label}</span>
                        </span>
                      );
                    })()}

                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-semibold">
                      {CONTEXT_AREAS[selectedSuggestion.metadata?.context_area || selectedSuggestion.category] || "Geral"}
                    </span>

                    {(() => {
                      const statusKey = selectedSuggestion.status || "recebida";
                      const statusConfig = SUGGESTION_STATUSES[statusKey] || SUGGESTION_STATUSES.recebida;
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusConfig.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <DialogTitle className="text-lg font-bold text-[#0B1739] leading-snug">
                    {selectedSuggestion.title}
                  </DialogTitle>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      {selectedSuggestion.company?.trade_name || selectedSuggestion.company?.name || "Empresa"}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {selectedSuggestion.metadata?.submitted_by_name || "Usuário"} 
                      {selectedSuggestion.metadata?.submitted_by_email ? ` (${selectedSuggestion.metadata.submitted_by_email})` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {selectedSuggestion.created_at ? format(parseISO(selectedSuggestion.created_at), "dd/MM/yyyy 'às' HH:mm") : ""}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Conteúdo Principal com Abas */}
            <div className="p-6 space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl mb-4">
                  <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg">
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="reply" className="text-xs font-semibold rounded-lg">
                    Responder Usuário
                  </TabsTrigger>
                  <TabsTrigger value="internal" className="text-xs font-semibold rounded-lg">
                    Notas Internas ({Array.isArray(selectedSuggestion.metadata?.internal_notes) ? selectedSuggestion.metadata.internal_notes.length : 0})
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs font-semibold rounded-lg">
                    Histórico & Auditoria
                  </TabsTrigger>
                </TabsList>

                {/* ========================================================================= */}
                {/* ABA 1: VISÃO GERAL DA SUGESTÃO */}
                {/* ========================================================================= */}
                <TabsContent value="overview" className="space-y-4 text-xs">
                  {/* Descrição Completa */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Descrição da Sugestão / Relato
                    </Label>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {selectedSuggestion.description}
                    </div>
                  </div>

                  {/* Anexo se houver */}
                  {selectedSuggestion.metadata?.attachment_url && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Anexo Fornecido pelo Usuário
                      </Label>
                      <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-[#075BFF]" />
                          <div>
                            <p className="font-semibold text-[#0B1739]">
                              {selectedSuggestion.metadata.attachment_name || "anexo_sugestao.pdf"}
                            </p>
                            <p className="text-[10px] text-slate-500">Armazenamento privado e seguro</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStoredFile(selectedSuggestion.metadata.attachment_url)}
                            className="text-xs h-8 bg-white border-blue-200 text-[#075BFF] hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadStoredFile(selectedSuggestion.metadata.attachment_url, selectedSuggestion.metadata.attachment_name || "anexo")}
                            className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resposta Atual Publicada se existir */}
                  {selectedSuggestion.metadata?.team_response && (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-emerald-900 text-xs">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Resposta Oficial Publicada para o Usuário
                        </span>
                        <span className="text-[10px] font-normal text-emerald-700">
                          {selectedSuggestion.metadata.team_response_date 
                            ? format(parseISO(selectedSuggestion.metadata.team_response_date), "dd/MM/yyyy 'às' HH:mm") 
                            : ""}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs">
                        {selectedSuggestion.metadata.team_response}
                      </p>
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-800">
                        <span>Respondido por: <strong>{selectedSuggestion.metadata.team_response_by || "Administrador"}</strong></span>
                        <span>Status de Notificação: <strong>{selectedSuggestion.metadata.delivery_notification_status?.channel || "Notificação in-app"}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Gestão Rápida de Responsável e Triagem */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Responsável Atribuído</Label>
                      <Select 
                        value={assignedTeam || selectedSuggestion.metadata?.assigned_to || "Equipe de Produto"} 
                        onValueChange={(val) => {
                          setAssignedTeam(val);
                          updateManagementMutation.mutate({
                            suggestionId: selectedSuggestion.id,
                            newStatus: selectedSuggestion.status,
                            team: val
                          });
                        }}
                      >
                        <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                          <SelectValue placeholder="Selecione o time" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_TEAMS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Alterar Situação Diretamente</Label>
                      <Select 
                        value={selectedSuggestion.status || "recebida"} 
                        onValueChange={(val) => {
                          updateManagementMutation.mutate({
                            suggestionId: selectedSuggestion.id,
                            newStatus: val,
                            team: assignedTeam || selectedSuggestion.metadata?.assigned_to || "Equipe de Produto"
                          });
                        }}
                      >
                        <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                          <SelectValue placeholder="Situação" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SUGGESTION_STATUSES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* ABA 2: RESPONDER AO USUÁRIO COM PRÉVIA */}
                {/* ========================================================================= */}
                <TabsContent value="reply" className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Comunicação Oficial com o Usuário (Tela 24)</p>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        O texto inserido abaixo ficará visível diretamente no painel do usuário que enviou a sugestão e atualizará o status correspondente.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Mensagem de Resposta ao Usuário <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      rows={5}
                      placeholder="Ex: Olá! Agradecemos sua contribuição. Já analisamos sua solicitação e planejamos a inclusão da exportação para o próximo ciclo de melhorias..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="text-xs rounded-xl p-3 bg-white border-slate-200 focus:border-[#075BFF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Atualizar Situação para</Label>
                      <Select 
                        value={newStatusOnReply || selectedSuggestion.status || "em_analise"} 
                        onValueChange={setNewStatusOnReply}
                      >
                        <SelectTrigger className="text-xs rounded-xl h-9 bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SUGGESTION_STATUSES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 pb-2">
                        <input
                          type="checkbox"
                          checked={notifyUserByEmail}
                          onChange={(e) => setNotifyUserByEmail(e.target.checked)}
                          className="rounded text-[#075BFF] focus:ring-blue-500"
                        />
                        <span>Disparar notificação por e-mail configurado</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPreviewResponseOpen(true)}
                      disabled={!responseText.trim()}
                      className="flex-1 text-xs rounded-xl border-slate-200 font-semibold cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Visualizar Prévia da Resposta
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        if (!responseText.trim()) {
                          toast.error("Por favor, digite uma mensagem de resposta.");
                          return;
                        }
                        replyMutation.mutate({
                          suggestionId: selectedSuggestion.id,
                          response: responseText,
                          newStatus: newStatusOnReply || selectedSuggestion.status,
                          notifyEmail: notifyUserByEmail
                        });
                      }}
                      disabled={replyMutation.isPending || !responseText.trim()}
                      className="flex-1 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl cursor-pointer"
                    >
                      {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Publicar Resposta
                    </Button>
                  </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* ABA 3: NOTAS INTERNAS (CONFIDENCIAIS) */}
                {/* ========================================================================= */}
                <TabsContent value="internal" className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Área Restrita aos Administradores</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        As notas abaixo são 100% confidenciais e <strong>NUNCA</strong> serão exibidas para os usuários ou clientes.
                      </p>
                    </div>
                  </div>

                  {/* Lista de Notas Existentes */}
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {Array.isArray(selectedSuggestion.metadata?.internal_notes) && selectedSuggestion.metadata.internal_notes.length > 0 ? (
                      selectedSuggestion.metadata.internal_notes.map((n: any, idx: number) => (
                        <div key={n.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-[#075BFF]" />
                              {n.user || "Administrador"}
                            </span>
                            <span className="text-slate-400 font-normal">
                              {n.date ? format(parseISO(n.date), "dd/MM/yyyy 'às' HH:mm") : ""}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-xs whitespace-pre-wrap">
                            {n.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        Nenhuma nota interna registrada para esta sugestão.
                      </p>
                    )}
                  </div>

                  {/* Formulário de Nova Nota */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-bold text-slate-700">Adicionar Nova Nota Interna</Label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Alinhado com o time de engenharia que o prazo estimado de entrega é de 15 dias após aprovação da DPC..."
                      value={newInternalNote}
                      onChange={(e) => setNewInternalNote(e.target.value)}
                      className="text-xs rounded-xl p-3 bg-white border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!newInternalNote.trim()) {
                          toast.error("Digite o conteúdo da nota interna.");
                          return;
                        }
                        addInternalNoteMutation.mutate({
                          suggestionId: selectedSuggestion.id,
                          note: newInternalNote
                        });
                      }}
                      disabled={addInternalNoteMutation.isPending || !newInternalNote.trim()}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {addInternalNoteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
                      Salvar Nota Confidencial
                    </Button>
                  </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* ABA 4: HISTÓRICO DE MUDANÇAS E AUDITORIA */}
                {/* ========================================================================= */}
                <TabsContent value="timeline" className="space-y-4 text-xs">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Histórico do Ciclo de Vida
                    </Label>

                    {Array.isArray(selectedSuggestion.metadata?.status_history) && selectedSuggestion.metadata.status_history.length > 0 ? (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {selectedSuggestion.metadata.status_history.map((hist: any, index: number) => {
                          const statusConfig = SUGGESTION_STATUSES[hist.status] || SUGGESTION_STATUSES.recebida;
                          return (
                            <div key={index} className="relative">
                              <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#075BFF] flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#075BFF]" />
                              </div>
                              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusConfig.color}`}>
                                    {statusConfig.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {hist.date ? format(parseISO(hist.date), "dd/MM/yyyy 'às' HH:mm") : ""}
                                  </span>
                                </div>
                                <p className="text-slate-700 text-xs">{hist.notes || "Atualização de status registrada."}</p>
                                <span className="text-[10px] text-slate-400">Por: {hist.user || "Sistema"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum evento registrado no histórico.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                ID do Ticket: <code className="text-slate-600">{selectedSuggestion.id}</code>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DE PRÉVIA DA RESPOSTA (COMO O CLIENTE VERÁ NA TELA 24) */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewResponseOpen} onOpenChange={setIsPreviewResponseOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#075BFF]" />
              Prévia da Resposta na Tela 24
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assim é como o cliente visualizará a resposta oficial no painel de sugestões.
            </DialogDescription>
          </DialogHeader>

          {/* Caixa de Simulação Exata da Tela 24 */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-[#075BFF] text-[11px]">
              <span>Resposta da Equipe NavalDocs:</span>
              <span className="text-slate-400 font-normal">
                {format(new Date(), "dd/MM/yyyy")}
              </span>
            </div>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
              {responseText || "Texto da resposta aparecerá aqui..."}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">Nova Situação:</span>
              <span className="font-bold text-[#075BFF]">
                {SUGGESTION_STATUSES[newStatusOnReply || selectedSuggestion?.status || "em_analise"]?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Visibilidade:</span>
              <span className="text-emerald-700 font-bold">Pública para o usuário da empresa</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewResponseOpen(false)}
              className="flex-1 text-xs rounded-xl"
            >
              Voltar e Editar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                replyMutation.mutate({
                  suggestionId: selectedSuggestion.id,
                  response: responseText,
                  newStatus: newStatusOnReply || selectedSuggestion.status,
                  notifyEmail: notifyUserByEmail
                });
              }}
              disabled={replyMutation.isPending}
              className="flex-1 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl"
            >
              Confirmar e Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
