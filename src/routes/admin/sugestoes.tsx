import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  MessageSquare, 
  Search, 
  Lightbulb, 
  Bug, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  Paperclip, 
  Download, 
  ExternalLink, 
  Building, 
  Send, 
  Eye, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  Loader2,
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
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { format, parseISO, isToday, isWithinInterval, subDays, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { 
  parseDescription, 
  serializeDescription, 
  formatReferenceNumber, 
  normalizeSuggestionType, 
  normalizeSuggestionStatus 
} from "@/services/suggestionsService";

export const Route = createFileRoute("/admin/sugestoes")({
  component: AdminSugestoesPage,
  head: () => ({
    meta: [
      { title: "Gestão de Sugestões e Problemas — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Tipos oficiais de solicitação
const SUGGESTION_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  sugestao: { 
    label: "Sugestão", 
    icon: Lightbulb, 
    color: "text-amber-700 border-amber-200 bg-amber-50", 
  },
  problema: { 
    label: "Problema", 
    icon: Bug, 
    color: "text-red-700 border-red-200 bg-red-50", 
  },
};

// 4 Estados Oficiais Requeridos
const SUGGESTION_STATUSES: Record<string, { label: string; color: string; icon: any; description: string }> = {
  recebida: { 
    label: "Recebida", 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Clock,
    description: "Recém enviada pelo usuário, aguardando triagem."
  },
  em_analise: { 
    label: "Em análise", 
    color: "bg-blue-50 text-blue-700 border-blue-200", 
    icon: Clock,
    description: "Em avaliação pela equipe técnica do NavalDocs."
  },
  respondida: { 
    label: "Respondida", 
    color: "bg-purple-50 text-purple-700 border-purple-200", 
    icon: MessageSquare,
    description: "Resposta oficial enviada e disponível para o cliente."
  },
  concluida: { 
    label: "Concluída", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    icon: CheckCircle2,
    description: "Solicitação atendida ou finalizada."
  },
};

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

  // Sugestão selecionada para Detalhe / Resposta
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estados do Formulário de Resposta
  const [responseText, setResponseText] = useState("");
  const [newStatusOnReply, setNewStatusOnReply] = useState<string>("respondida");
  const [isPreviewResponseOpen, setIsPreviewResponseOpen] = useState(false);

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
          company:companies!tickets_company_id_fkey (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      // Se não for admin global, restringe à própria empresa
      if (!isGlobalAdmin && companyScopeId) {
        query = query.eq("company_id", companyScopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 1,
  });

  // 2. Consulta de Empresas para o Filtro de Administrador Global
  const { data: companiesList = [] } = useQuery({
    queryKey: ["admin-companies-filter-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(isGlobalAdmin),
  });

  // 3. Enriquecer sugestões com parsing seguro da descrição
  const enrichedSuggestions = useMemo(() => {
    return rawSuggestions.map((item: any) => {
      const parsed = parseDescription(item.description);
      const normalizedType = normalizeSuggestionType(item.type);
      const normalizedStatus = normalizeSuggestionStatus(item.status);
      const refNumber = formatReferenceNumber(item.id, item.created_at);
      const companyName = item.company?.name || "Empresa não informada";

      return {
        ...item,
        cleanDescription: parsed.cleanDescription,
        attachmentUrl: parsed.attachmentUrl,
        adminResponse: parsed.adminResponse,
        normalizedType,
        normalizedStatus,
        referenceNumber: refNumber,
        companyName,
      };
    });
  }, [rawSuggestions]);

  // 4. Filtragem de Sugestões
  const filteredSuggestions = useMemo(() => {
    return enrichedSuggestions.filter((item: any) => {
      const typeKey = item.normalizedType;
      const statusKey = item.normalizedStatus;
      const itemCompanyId = item.company_id || item.company?.id;

      // Filtro por Tipo
      if (filterType !== "all" && typeKey !== filterType) return false;

      // Filtro por Situação
      if (filterStatus !== "all" && statusKey !== filterStatus) return false;

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
        const descMatch = (item.cleanDescription || item.description || "").toLowerCase().includes(term);
        const refMatch = (item.referenceNumber || "").toLowerCase().includes(term);
        const companyMatch = (item.companyName || "").toLowerCase().includes(term);

        if (!titleMatch && !descMatch && !refMatch && !companyMatch) return false;
      }

      return true;
    });
  }, [enrichedSuggestions, filterType, filterStatus, filterCompany, filterPeriod, searchTerm]);

  // 5. Contadores e Métricas Rápidas
  const metrics = useMemo(() => {
    const total = enrichedSuggestions.length;
    const pendingReview = enrichedSuggestions.filter(
      (s: any) => (s.normalizedStatus === "recebida" || s.normalizedStatus === "em_analise") && !s.adminResponse
    ).length;
    const answered = enrichedSuggestions.filter(
      (s: any) => s.normalizedStatus === "respondida" || !!s.adminResponse
    ).length;
    const completed = enrichedSuggestions.filter(
      (s: any) => s.normalizedStatus === "concluida"
    ).length;

    return { total, pendingReview, answered, completed };
  }, [enrichedSuggestions]);

  // 6. Abrir Detalhe da Sugestão
  const handleOpenDetail = useCallback((sug: any) => {
    setSelectedSuggestion(sug);
    setResponseText(sug.adminResponse?.text || "");
    setNewStatusOnReply(sug.normalizedStatus === "recebida" ? "respondida" : sug.normalizedStatus);
    setIsDetailOpen(true);
  }, []);

  // 7. Mutação: Salvar Resposta Oficial
  const replyMutation = useMutation({
    mutationFn: async ({
      suggestionId,
      response,
      newStatus,
    }: {
      suggestionId: string;
      response: string;
      newStatus: string;
    }) => {
      const now = new Date();
      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(now);
      const adminName = profile?.full_name || user?.email || "Equipe NavalDocs Pro";

      const currentParsed = parseDescription(selectedSuggestion?.description);
      const updatedDescription = serializeDescription({
        description: currentParsed.cleanDescription,
        attachmentUrl: currentParsed.attachmentUrl,
        adminResponse: {
          text: response.trim(),
          respondedAt: formattedDate,
          respondedBy: adminName,
        }
      });

      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: newStatus || "respondida",
          description: updatedDescription,
          updated_at: now.toISOString(),
        })
        .eq("id", suggestionId)
        .select(`
          *,
          company:companies!tickets_company_id_fkey (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-suggestions-list"] });
      const parsed = parseDescription(updatedData.description);
      setSelectedSuggestion({
        ...updatedData,
        cleanDescription: parsed.cleanDescription,
        attachmentUrl: parsed.attachmentUrl,
        adminResponse: parsed.adminResponse,
        normalizedType: normalizeSuggestionType(updatedData.type),
        normalizedStatus: normalizeSuggestionStatus(updatedData.status),
        referenceNumber: formatReferenceNumber(updatedData.id, updatedData.created_at),
        companyName: updatedData.company?.name || "Empresa",
      });
      toast.success("Resposta oficial enviada com sucesso!", {
        description: "A resposta já está visível para o cliente no painel Ajuda e sugestões."
      });
      setIsPreviewResponseOpen(false);
    },
    onError: (err: any) => {
      console.error("Erro ao enviar resposta:", err);
      toast.error(`Falha ao publicar resposta: ${err.message}`);
    }
  });

  // 8. Mutação: Atualizar Situação Diretamente
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      suggestionId,
      newStatus,
    }: {
      suggestionId: string;
      newStatus: string;
    }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: now,
        })
        .eq("id", suggestionId)
        .select(`
          *,
          company:companies!tickets_company_id_fkey (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-suggestions-list"] });
      const parsed = parseDescription(updatedData.description);
      setSelectedSuggestion({
        ...updatedData,
        cleanDescription: parsed.cleanDescription,
        attachmentUrl: parsed.attachmentUrl,
        adminResponse: parsed.adminResponse,
        normalizedType: normalizeSuggestionType(updatedData.type),
        normalizedStatus: normalizeSuggestionStatus(updatedData.status),
        referenceNumber: formatReferenceNumber(updatedData.id, updatedData.created_at),
        companyName: updatedData.company?.name || "Empresa",
      });
      toast.success("Situação atualizada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Falha ao atualizar situação: ${err.message}`);
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Sugestões e Problemas
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold uppercase">
              Painel Global
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Recebimento, acompanhamento e respostas oficiais às solicitações e relatos enviados pelos clientes.
          </p>
        </div>

        {/* Botões de Ação */}
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
            <span className="hidden sm:inline">Ver Ajuda e sugestões</span>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl border-slate-200/80 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Recebido</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0B1739] mt-2">{metrics.total}</p>
          <span className="text-[10px] text-slate-400">Solicitações registradas</span>
        </Card>

        <Card className="p-4 rounded-2xl border-amber-200/80 shadow-2xs bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pendentes</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">{metrics.pendingReview}</p>
          <span className="text-[10px] text-amber-700 font-medium">Aguardando análise da equipe</span>
        </Card>

        <Card className="p-4 rounded-2xl border-purple-200/80 shadow-2xs bg-purple-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Respondidas</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2">{metrics.answered}</p>
          <span className="text-[10px] text-purple-700 font-medium">Com retorno oficial publicado</span>
        </Card>

        <Card className="p-4 rounded-2xl border-emerald-200/80 shadow-2xs bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Concluídas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2">{metrics.completed}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Resolvidas ou implementadas</span>
        </Card>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <Card className="p-4 rounded-2xl border-slate-200/80 shadow-2xs bg-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Pesquisa Textual */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por assunto, descrição, ref ou empresa..."
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
                <SelectValue placeholder="Tipo" />
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
                      {c.name}
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
      </Card>

      {/* Listagem de Solicitações */}
      {isLoadingSuggestions ? (
        <Card className="p-12 text-center rounded-2xl border-slate-200/80 bg-white">
          <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Carregando solicitações...</p>
        </Card>
      ) : isError ? (
        <Card className="p-8 text-center rounded-2xl border-red-200 bg-red-50/40">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#0B1739]">Falha ao carregar solicitações</h3>
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
          <h3 className="text-base font-bold text-[#0B1739]">Nenhuma solicitação encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {rawSuggestions.length === 0 
              ? "Nenhuma sugestão ou problema foi enviado até o momento." 
              : "Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de pesquisa."}
          </p>
          {(searchTerm || filterStatus !== "all" || filterType !== "all" || filterCompany !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
                setFilterType("all");
                setFilterCompany("all");
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
          {/* Tabela em Desktop */}
          <div className="hidden lg:block bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Referência & Tipo</th>
                  <th className="py-3 px-4">Assunto & Descrição</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Resposta Oficial</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSuggestions.map((sug: any) => {
                  const typeConfig = SUGGESTION_TYPES[sug.normalizedType] || SUGGESTION_TYPES.sugestao;
                  const TypeIcon = typeConfig.icon;
                  const statusConfig = SUGGESTION_STATUSES[sug.normalizedStatus] || SUGGESTION_STATUSES.recebida;
                  const StatusIcon = statusConfig.icon;
                  const hasResponse = !!sug.adminResponse;

                  return (
                    <tr 
                      key={sug.id} 
                      onClick={() => handleOpenDetail(sug)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Referência & Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeConfig.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeConfig.label}</span>
                          </span>
                          {sug.attachmentUrl && (
                            <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5" title="Possui imagem anexada">
                              <Paperclip className="h-3 w-3 text-blue-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {sug.referenceNumber}
                        </span>
                      </td>

                      {/* Assunto & Descrição */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors truncate">
                          {sug.title}
                        </div>
                        <p className="text-slate-500 text-[11px] truncate max-w-[260px] mt-0.5">
                          {sug.cleanDescription || sug.description}
                        </p>
                      </td>

                      {/* Empresa */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{sug.companyName}</span>
                        </div>
                      </td>

                      {/* Data de Envio */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        {sug.created_at ? format(parseISO(sug.created_at), "dd/MM/yyyy HH:mm") : "-"}
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      {/* Resposta Oficial */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        {hasResponse ? (
                          <div className="text-[11px]">
                            <span className="text-purple-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-purple-600" />
                              Respondida
                            </span>
                            <p className="text-slate-500 text-[10px] truncate mt-0.5">
                              {sug.adminResponse.text}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sem resposta</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#075BFF] hover:bg-blue-50"
                        >
                          Ver & Responder
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
              const typeConfig = SUGGESTION_TYPES[sug.normalizedType] || SUGGESTION_TYPES.sugestao;
              const TypeIcon = typeConfig.icon;
              const statusConfig = SUGGESTION_STATUSES[sug.normalizedStatus] || SUGGESTION_STATUSES.recebida;
              const StatusIcon = statusConfig.icon;

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
                      <span className="text-[10px] font-mono text-slate-400">
                        {sug.referenceNumber}
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
                      {sug.cleanDescription || sug.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <Building className="h-3 w-3 text-slate-400" />
                      <span className="truncate max-w-[180px]">{sug.companyName}</span>
                    </div>
                    <span>{sug.created_at ? format(parseISO(sug.created_at), "dd/MM/yyyy") : ""}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Detalhes e Espaço para Resposta */}
      {selectedSuggestion && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white border border-slate-200">
            {/* Cabeçalho do Modal */}
            <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/70">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const typeConfig = SUGGESTION_TYPES[selectedSuggestion.normalizedType] || SUGGESTION_TYPES.sugestao;
                    const TypeIcon = typeConfig.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeConfig.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        <span>{typeConfig.label}</span>
                      </span>
                    );
                  })()}

                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                    {selectedSuggestion.referenceNumber}
                  </span>

                  {(() => {
                    const statusConfig = SUGGESTION_STATUSES[selectedSuggestion.normalizedStatus] || SUGGESTION_STATUSES.recebida;
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
                    {selectedSuggestion.companyName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {selectedSuggestion.created_at ? format(parseISO(selectedSuggestion.created_at), "dd/MM/yyyy 'às' HH:mm") : ""}
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* Conteúdo Principal */}
            <div className="p-6 space-y-6 text-xs">
              
              {/* Descrição Enviada pelo Cliente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição do Usuário
                </Label>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {selectedSuggestion.cleanDescription || selectedSuggestion.description}
                </div>
              </div>

              {/* Anexo de Imagem se houver */}
              {selectedSuggestion.attachmentUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Imagem Anexada pelo Usuário
                  </Label>
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-[#075BFF]" />
                      <div>
                        <p className="font-semibold text-[#0B1739]">Arquivo Anexado</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{selectedSuggestion.attachmentUrl}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStoredFile(selectedSuggestion.attachmentUrl)}
                        className="text-xs h-8 bg-white border-blue-200 text-[#075BFF] hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadStoredFile(selectedSuggestion.attachmentUrl, "anexo_solicitacao")}
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
              {selectedSuggestion.adminResponse && (
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between font-bold text-purple-900 text-xs">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      Resposta Atual Enviada ao Cliente
                    </span>
                    <span className="text-[10px] font-normal text-purple-700">
                      {selectedSuggestion.adminResponse.respondedAt}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs">
                    {selectedSuggestion.adminResponse.text}
                  </p>
                  <div className="pt-2 border-t border-purple-200/60 text-[10px] text-purple-800">
                    Respondido por: <strong>{selectedSuggestion.adminResponse.respondedBy}</strong>
                  </div>
                </div>
              )}

              {/* Espaço para Resposta da Equipe */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Espaço para Resposta Oficial</p>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Ao salvar a resposta, o cliente poderá consultá-la diretamente na tela Ajuda e sugestões e acompanhar o andamento.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Mensagem de Resposta ao Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder="Digite aqui o posicionamento ou solução da equipe..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="text-xs rounded-xl p-3 bg-white border-slate-200 focus:border-[#075BFF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Atualizar Estado para</Label>
                    <Select 
                      value={newStatusOnReply} 
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

                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!responseText.trim()) {
                          toast.error("Por favor, digite uma resposta para enviar.");
                          return;
                        }
                        replyMutation.mutate({
                          suggestionId: selectedSuggestion.id,
                          response: responseText,
                          newStatus: newStatusOnReply,
                        });
                      }}
                      disabled={replyMutation.isPending || !responseText.trim()}
                      className="w-full text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl h-9 cursor-pointer"
                    >
                      {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Salvar e Enviar Resposta
                    </Button>
                  </div>
                </div>
              </div>

              {/* Alterar Estado Diretamente sem Nova Resposta */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-slate-500 text-[11px]">Alterar apenas o estado:</span>
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedSuggestion.normalizedStatus} 
                    onValueChange={(val) => {
                      updateStatusMutation.mutate({
                        suggestionId: selectedSuggestion.id,
                        newStatus: val,
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs rounded-xl h-8 bg-white border-slate-200 w-36">
                      <SelectValue placeholder="Estado" />
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

            </div>

            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Ticket: <code className="text-slate-600 font-mono">{selectedSuggestion.referenceNumber}</code>
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

    </div>
  );
}
export default AdminSugestoesPage;
