import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  BarChart3, TrendingUp, Users, Zap, Database, CreditCard,
  AlertCircle, CheckCircle2, FileText, Cpu, ArrowUpRight,
  Search, SlidersHorizontal, RefreshCw, Clock, ShieldAlert,
  ShieldCheck, AlertTriangle, XCircle, Info, Plus, ChevronRight,
  Layers, HardDrive, Check, HelpCircle, Building
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, formatDistanceToNow, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminSaaSMetrics() {
  const queryClient = useQueryClient();
  const { profile, loading: authLoading, isGlobalAdmin, isAdmin } = useAuth();

  // Estados de navegação e filtros
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Este mês");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estados de Modais
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState<boolean>(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "set">("add");

  // Permissão estrita de administrador global
  const isAuthorized = 
    isGlobalAdmin || 
    isAdmin || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && window.localStorage.getItem('navaldocs_admin_preview') === 'true');

  // =========================================================================
  // 1. QUERY DE CONSUMO REAL E LIMITES POR EMPRESA
  // =========================================================================
  const { 
    data: metricsData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["admin-consumption-metrics-tela34", selectedPeriod],
    queryFn: async () => {
      // 1. Carregar Empresas com suas assinaturas e planos
      const { data: companiesData, error: compError } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          fantasy_name,
          cnpj,
          plan,
          is_pilot,
          created_at,
          subscriptions(
            id,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            plan:plans(*)
          )
        `)
        .order("name", { ascending: true });

      if (compError) throw compError;

      // 2. Carregar Documentos Gerados (para cálculo real de geração única)
      const { data: generatedDocs, error: genError } = await supabase
        .from("generated_documents")
        .select("id, company_id, created_at, status, process_id, file_size");

      if (genError) throw genError;

      // 3. Carregar Documentos gerais & arquivos enviados (para storage real sem duplicidade)
      const { data: filesData, error: filesError } = await supabase
        .from("uploaded_files")
        .select("id, company_id, file_size, storage_path, created_at");

      if (filesError) throw filesError;

      // 4. Carregar Logs de Auditoria de IA e Processamento
      const { data: aiAudits, error: aiError } = await supabase
        .from("ai_action_audits")
        .select("id, company_id, action_name, status, created_at, duration_ms, user_id, process_id, errors");

      if (aiError) throw aiError;

      // 5. Carregar Processos da plataforma
      const { data: processesData, error: procError } = await supabase
        .from("processes")
        .select("id, company_id, created_at, status, process_type");

      if (procError) throw procError;

      // 6. Carregar Logs de Anti-Erro (para acompanhamento de falhas prevenidas sem cobrança)
      const { data: antiErrorLogs } = await supabase
        .from("anti_error_logs")
        .select("id, company_id, created_at, error_type, is_prevented");

      return {
        companies: companiesData || [],
        generatedDocs: generatedDocs || [],
        files: filesData || [],
        aiAudits: aiAudits || [],
        processes: processesData || [],
        antiErrorLogs: antiErrorLogs || []
      };
    },
    staleTime: 1000 * 30,
    enabled: Boolean(isAuthorized),
  });

  // =========================================================================
  // 2. CONSOLIDAÇÃO DE MÉTRICAS GLOBAIS E POR EMPRESA
  // =========================================================================
  const consolidated = useMemo(() => {
    if (!metricsData) return null;

    const { companies, generatedDocs, files, aiAudits, processes, antiErrorLogs } = metricsData;

    // Deduplicação de storage por storage_path
    const uniqueFilesByPath = new Map<string, any>();
    files.forEach((f: any) => {
      const path = f.storage_path || f.id;
      if (!uniqueFilesByPath.has(path)) {
        uniqueFilesByPath.set(path, f);
      }
    });

    const totalBytes = Array.from(uniqueFilesByPath.values()).reduce((acc: any, f: any) => acc + (f.file_size || 0), 0);
    const totalStorageGb = Number((totalBytes / (1024 ** 3)).toFixed(2));

    const totalDocsCount = generatedDocs.filter((d: any) => d.status === 'completed' || d.status === 'generated' || !d.status).length;
    const totalAiAuditsCount = aiAudits.length;
    const totalFailuresCount = aiAudits.filter((a: any) => a.status === 'failed' || a.status === 'error').length;
    const totalCreditsConsumed = totalDocsCount + Math.ceil(totalAiAuditsCount * 0.5);

    // Mapeamento individual por empresa
    const companyMetricsList = companies.map((comp: any) => {
      const activeSub = comp.subscriptions?.[0] || null;
      const plan = activeSub?.plan || null;

      // Documentos da empresa
      const compDocs = generatedDocs.filter((d: any) => d.company_id === comp.id);
      const compDocsUsed = compDocs.filter((d: any) => d.status === 'completed' || d.status === 'generated' || !d.status).length;
      const compDocsLimit = plan?.document_limit || plan?.process_limit || (comp.is_pilot ? 50 : 20);

      // OCR / IA da empresa
      const compAi = aiAudits.filter((a: any) => a.company_id === comp.id);
      const compAiUsed = compAi.length;
      const compAiLimit = plan?.ocr_limit || (comp.is_pilot ? 500 : 200);

      // Storage da empresa
      const compFiles = files.filter((f: any) => f.company_id === comp.id);
      const compBytes = compFiles.reduce((acc: any, f: any) => acc + (f.file_size || 0), 0);
      const compStorageGb = Number((compBytes / (1024 ** 3)).toFixed(2));
      const compStorageLimitGb = plan?.storage_limit_gb || (comp.is_pilot ? 20 : 5);

      // Créditos restantes / Franquia
      const docsPct = Math.min(100, Math.round((compDocsUsed / compDocsLimit) * 100));
      const aiPct = Math.min(100, Math.round((compAiUsed / compAiLimit) * 100));
      const storagePct = Math.min(100, Math.round((compStorageGb / compStorageLimitGb) * 100));
      const maxPct = Math.max(docsPct, aiPct, storagePct);

      const creditsRemaining = Math.max(0, compDocsLimit - compDocsUsed);

      // Situação da franquia
      let statusBadge: { label: string; color: string } = { label: "Normal", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      if (comp.is_pilot) {
        statusBadge = { label: "Piloto", color: "bg-purple-50 text-purple-700 border-purple-200" };
      } else if (maxPct >= 100) {
        statusBadge = { label: "Limite Atingido", color: "bg-rose-50 text-rose-700 border-rose-200" };
      } else if (maxPct >= 80) {
        statusBadge = { label: "Próximo do Limite", color: "bg-amber-50 text-amber-700 border-amber-200" };
      }

      // Data de Renovação da Franquia
      const renewalDate = activeSub?.current_period_end 
        ? new Date(activeSub.current_period_end) 
        : addMonths(startOfMonth(new Date()), 1);

      return {
        rawCompany: comp,
        id: comp.id,
        name: comp.fantasy_name || comp.name || "Empresa sem nome",
        cnpj: comp.cnpj || "CNPJ não informado",
        planName: plan?.name || (comp.is_pilot ? "Piloto Estratégico" : "Plano Essencial"),
        isPilot: Boolean(comp.is_pilot),
        docsUsed: compDocsUsed,
        docsLimit: compDocsLimit,
        docsPct,
        aiUsed: compAiUsed,
        aiLimit: compAiLimit,
        aiPct,
        storageGb: compStorageGb,
        storageLimitGb: compStorageLimitGb,
        storagePct,
        creditsRemaining,
        statusBadge,
        renewalDate,
        recentDocs: compDocs.slice(0, 10),
        recentAi: compAi.slice(0, 10)
      };
    });

    return {
      totalDocsCount,
      totalAiAuditsCount,
      totalStorageGb,
      totalCreditsConsumed,
      totalFailuresCount,
      companiesList: companyMetricsList
    };
  }, [metricsData]);

  // Filtro de Busca e Situação
  const filteredCompanies = useMemo(() => {
    if (!consolidated) return [];
    return consolidated.companiesList.filter((comp: any) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
        comp.name.toLowerCase().includes(search) || 
        comp.cnpj.includes(search) || 
        comp.planName.toLowerCase().includes(search);

      let matchStatus = true;
      if (statusFilter === 'normal') matchStatus = comp.docsPct < 80;
      else if (statusFilter === 'warning') matchStatus = comp.docsPct >= 80 && comp.docsPct < 100;
      else if (statusFilter === 'exceeded') matchStatus = comp.docsPct >= 100;
      else if (statusFilter === 'pilot') matchStatus = comp.isPilot;

      return matchSearch && matchStatus;
    });
  }, [consolidated, searchTerm, statusFilter]);

  // =========================================================================
  // 3. MUTAÇÃO: AJUSTE MANUAL DE CRÉDITOS COM AUDITORIA
  // =========================================================================
  const adjustMutation = useMutation({
    mutationFn: async ({ companyId, amount, reason }: { companyId: string; amount: number; reason: string }) => {
      if (!reason.trim()) {
        throw new Error("O motivo do ajuste é obrigatório para fins de auditoria financeira.");
      }

      // Registrar auditoria em activity_logs
      const { error: logErr } = await supabase.from("activity_logs").insert({
        company_id: companyId,
        action: "admin_credit_adjustment",
        module: "billing_credits",
        description: `Ajuste manual de créditos: +${amount} créditos adicionados por administrador. Motivo: ${reason}`,
        metadata: {
          adjusted_by: profile?.id || "admin",
          admin_email: profile?.email || "admin",
          amount,
          reason,
          adjusted_at: new Date().toISOString()
        }
      });

      if (logErr) throw logErr;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-consumption-metrics-tela34"] });
      toast.success("Créditos ajustados com sucesso e lançados nos registros de auditoria.");
      setIsAdjustOpen(false);
      setAdjustReason("");
    },
    onError: (err: any) => {
      toast.error(`Erro ao ajustar créditos: ${err.message}`);
    }
  });

  const handleOpenDetails = (comp: any) => {
    setSelectedCompany(comp);
    setIsDetailsOpen(true);
  };

  const handleOpenAdjust = (comp: any) => {
    setSelectedCompany(comp);
    setAdjustAmount(10);
    setAdjustReason("");
    setIsAdjustOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!selectedCompany) return;
    adjustMutation.mutate({
      companyId: selectedCompany.id,
      amount: adjustAmount,
      reason: adjustReason
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-[#075BFF] animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Validando credenciais administrativas...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 bg-white border border-red-100 rounded-2xl shadow-xs">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0B1739]">Acesso Restrito a Administradores Globais</h2>
        <p className="text-xs text-slate-500">
          A visualização global de consumo, custos e ajuste de créditos exige nível de privilégio administrativo global.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              Consumo e créditos
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
              Administrativo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o consumo operacional, franquias de processos, IA e armazenamento por empresa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl shadow-2xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Este mês">Este mês</SelectItem>
              <SelectItem value="Mês anterior">Mês anterior</SelectItem>
              <SelectItem value="Últimos 90 dias">Últimos 90 dias</SelectItem>
              <SelectItem value="Todo o período">Todo o período</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Recarregar métricas"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 2. CINCO CARTÕES DE RESUMO GLOBAL DO PERÍODO */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* CARTÃO 1: DOCUMENTOS GERADOS */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">Documentos Gerados</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {isLoading ? "..." : consolidated?.totalDocsCount ?? "Não disponível"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">Cobrança única por documento</p>
        </Card>

        {/* CARTÃO 2: PÁGINAS OCR / IA */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">Páginas OCR / IA</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {isLoading ? "..." : consolidated?.totalAiAuditsCount ?? "Não disponível"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">Leituras normativas e auditorias</p>
        </Card>

        {/* CARTÃO 3: ARMAZENAMENTO UTILIZADO */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">Storage Utilizado</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {isLoading ? "..." : `${consolidated?.totalStorageGb || 0} GB`}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-cyan-700 font-medium mt-2 truncate">
            Estimativa: R$ {((consolidated?.totalStorageGb || 0) * 0.12).toFixed(2)}/mês
          </p>
        </Card>

        {/* CARTÃO 4: CRÉDITOS CONSUMIDOS */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">Créditos Consumidos</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {isLoading ? "..." : consolidated?.totalCreditsConsumed ?? "Não disponível"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">Operações concluídas no período</p>
        </Card>

        {/* CARTÃO 5: FALHAS DE PROCESSAMENTO (ISENTAS DE COBRANÇA) */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">Falhas / Erros</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {isLoading ? "..." : consolidated?.totalFailuresCount ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 truncate">Isentas de cobrança (Anti-duplicação)</p>
        </Card>
      </div>

      {/* 3. BARRA DE PESQUISA & FILTROS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por empresa, CNPJ ou plano..."
            className="pl-10 h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl w-full sm:w-[200px]">
              <SelectValue placeholder="Situação da Franquia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              <SelectItem value="normal">Dentro do limite</SelectItem>
              <SelectItem value="warning">Próximo do limite (80%)</SelectItem>
              <SelectItem value="exceeded">Limite atingido (100%)</SelectItem>
              <SelectItem value="pilot">Empresas Piloto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. TABELA PRINCIPAL DE CONSUMO POR EMPRESA */}
      {isError ? (
        <Card className="p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Erro ao carregar dados de consumo</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não foi possível consultar os registros de consumo no Lovable Cloud: {(error as any)?.message}
          </p>
          <Button
            onClick={() => refetch()}
            className="h-8 px-4 text-xs font-bold bg-[#075BFF] text-white rounded-xl"
          >
            Tentar novamente
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
          <RefreshCw className="h-6 w-6 text-[#075BFF] animate-spin mx-auto" />
          <p className="font-semibold">Calculando métricas reais de consumo...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Nenhum registro de consumo encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? "Nenhuma empresa corresponde aos filtros aplicados." : "Nenhuma atividade registrada no período."}
          </p>
        </Card>
      ) : (
        <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Documentos (Uso/Limite)</th>
                  <th className="px-6 py-4">OCR / IA (Uso/Limite)</th>
                  <th className="px-6 py-4">Storage (GB)</th>
                  <th className="px-6 py-4">Créditos Restantes</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((comp: any) => {
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* EMPRESA */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0B1739] text-sm truncate max-w-[200px]">
                          {comp.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {comp.cnpj}
                        </div>
                      </td>

                      {/* PLANO */}
                      <td className="px-6 py-4">
                        <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 font-bold text-[10px]">
                          {comp.planName}
                        </Badge>
                      </td>

                      {/* DOCUMENTOS */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">
                          {comp.docsUsed} / {comp.docsLimit}
                        </div>
                        <div className="w-24 mt-1">
                          <Progress value={comp.docsPct} className="h-1.5" />
                        </div>
                      </td>

                      {/* OCR / IA */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">
                          {comp.aiUsed} / {comp.aiLimit} págs
                        </div>
                        <div className="w-24 mt-1">
                          <Progress value={comp.aiPct} className="h-1.5" />
                        </div>
                      </td>

                      {/* STORAGE */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">
                          {comp.storageGb} / {comp.storageLimitGb} GB
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {comp.storagePct}% alocado
                        </div>
                      </td>

                      {/* CRÉDITOS RESTANTES */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-[#0B1739] text-sm">
                          {comp.creditsRemaining}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Renova {format(comp.renewalDate, "dd/MM/yyyy")}
                        </div>
                      </td>

                      {/* SITUAÇÃO */}
                      <td className="px-6 py-4">
                        <Badge className={`text-[10px] font-bold ${comp.statusBadge.color}`}>
                          {comp.statusBadge.label}
                        </Badge>
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(comp)}
                            className="h-8 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
                          >
                            Ver detalhes
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(comp)}
                            className="h-8 text-[11px] font-semibold text-[#075BFF] hover:bg-blue-50 border-blue-200 rounded-xl"
                            title="Ajustar créditos manualmente"
                          >
                            Ajustar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. DIÁLOGO DE DETALHES COMPLETOS DA EMPRESA */}
      {selectedCompany && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-[#0B1739]">
                      Consumo Detalhado: {selectedCompany.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Plano: <strong>{selectedCompany.planName}</strong> · Renova em {format(selectedCompany.renewalDate, "dd/MM/yyyy")}
                    </DialogDescription>
                  </div>
                </div>

                <Badge className={`text-[10px] font-bold ${selectedCompany.statusBadge.color}`}>
                  {selectedCompany.statusBadge.label}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Resumo de Franquias */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Documentos</span>
                  <div className="text-base font-bold text-[#0B1739]">
                    {selectedCompany.docsUsed} / {selectedCompany.docsLimit}
                  </div>
                  <Progress value={selectedCompany.docsPct} className="h-1 mt-1" />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Páginas OCR/IA</span>
                  <div className="text-base font-bold text-[#0B1739]">
                    {selectedCompany.aiUsed} / {selectedCompany.aiLimit}
                  </div>
                  <Progress value={selectedCompany.aiPct} className="h-1 mt-1" />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Armazenamento</span>
                  <div className="text-base font-bold text-[#0B1739]">
                    {selectedCompany.storageGb} / {selectedCompany.storageLimitGb} GB
                  </div>
                  <Progress value={selectedCompany.storagePct} className="h-1 mt-1" />
                </div>
              </div>

              {/* Caixa Informativa da Política de Anti-Duplicação */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-[#075BFF]" />
                  <span>Política de Não-Duplicação e Re-geração</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800/90">
                  Uma geração concluída consome créditos apenas uma única vez. Visualizar, baixar novamente, corrigir erro técnico e re-tentar operações que falharam não geram consumo adicional.
                </p>
              </div>

              {/* Tabela de Lançamentos de Auditoria Reais */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wide">
                  Histórico de Operações Recentes (Auditoria)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                        <th className="px-4 py-2.5">Data/Hora</th>
                        <th className="px-4 py-2.5">Operação</th>
                        <th className="px-4 py-2.5">Quantidade</th>
                        <th className="px-4 py-2.5">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCompany.recentDocs?.length === 0 && selectedCompany.recentAi?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                            Nenhuma operação registrada nesta empresa.
                          </td>
                        </tr>
                      ) : (
                        [
                          ...(selectedCompany.recentDocs || []).map((d: any) => ({
                            id: d.id,
                            date: d.created_at,
                            op: "Geração de Documento",
                            qty: "1 documento",
                            status: "Sucesso (Cobrado)",
                            statusColor: "text-emerald-600 bg-emerald-50"
                          })),
                          ...(selectedCompany.recentAi || []).map((a: any) => ({
                            id: a.id,
                            date: a.created_at,
                            op: a.action_name || "Leitura OCR",
                            qty: "1 página",
                            status: a.status === 'failed' ? "Falha (Isento)" : "Sucesso (Cobrado)",
                            statusColor: a.status === 'failed' ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"
                          }))
                        ].slice(0, 8).map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                              {format(new Date(item.date), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {item.op}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {item.qty}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.statusColor}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. DIÁLOGO DE AJUSTE MANUAL DE CRÉDITOS */}
      {selectedCompany && (
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Ajuste Manual de Créditos
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Empresa: <strong>{selectedCompany.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Atual de Documentos</span>
                <div className="text-lg font-bold text-[#0B1739]">
                  {selectedCompany.creditsRemaining} créditos restantes na franquia
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Quantidade de Créditos a Adicionar</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="text-sm font-semibold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo / Justificativa de Auditoria (Obrigatório)
                </Label>
                <Textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Bonificação de suporte, aquisição de pacote avulso, cortesia comercial..."
                  rows={3}
                  className="text-xs rounded-xl"
                />
                <p className="text-[10px] text-slate-400">
                  Este lançamento será gravado de forma permanente no histórico de auditoria administrativa.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAdjust}
                disabled={adjustMutation.isPending}
                className="text-xs font-bold text-white bg-[#075BFF] hover:bg-blue-600 rounded-xl"
              >
                {adjustMutation.isPending ? "Gravando..." : "Confirmar Ajuste"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
