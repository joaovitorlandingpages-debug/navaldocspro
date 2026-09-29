import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { 
  Users, 
  Building, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Calendar, 
  ChevronDown,
  AlertCircle,
  FileText,
  MessageSquare,
  ShieldCheck,
  DollarSign,
  PieChart,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight,
  CheckCircle2,
  Bell,
  Sparkles,
  Layers,
  ArrowRight,
  HardDrive,
  CreditCard,
  ScanText,
  Activity,
  XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdminOverviewDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Últimos 30 dias");

  // Cálculo de datas conforme o período selecionado
  const periodDate = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === "Hoje") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return today.toISOString();
    }
    if (selectedPeriod === "Últimos 7 dias") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      return d7.toISOString();
    }
    if (selectedPeriod === "Este mês") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return m.toISOString();
    }
    if (selectedPeriod === "Ano atual") {
      const y = new Date(now.getFullYear(), 0, 1);
      return y.toISOString();
    }
    // Padrão: Últimos 30 dias
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    return d30.toISOString();
  }, [selectedPeriod]);

  // Consulta consolidada e resiliente com dados 100% reais do Supabase
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-overview-metrics-real", periodDate],
    queryFn: async () => {
      // 1. Empresas (cadastradas, ativas e suspensas)
      const { data: companies, error: compErr } = await supabase
        .from("companies")
        .select("id, name, fantasy_name, is_active, created_at, plan");

      if (compErr) console.error("[AdminMetrics] Erro companies:", compErr);

      // 2. Perfis / Usuários
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at, company_id");

      if (profErr) console.error("[AdminMetrics] Erro profiles:", profErr);

      // 3. Assinaturas (ativas, em teste, pagamento pendente, canceladas)
      const { data: subscriptions, error: subsErr } = await supabase
        .from("subscriptions")
        .select("id, company_id, status, plan_id, current_period_start, current_period_end, cancel_at_period_end");

      if (subsErr) console.error("[AdminMetrics] Erro subscriptions:", subsErr);

      // 4. Pagamentos reais no período (receita confirmada vs cobranças pendentes)
      const { data: payments, error: payErr } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, paid_at, company_id")
        .gte("created_at", periodDate);

      if (payErr) console.error("[AdminMetrics] Erro payments:", payErr);

      // 5. Processos criados no período
      const { data: processes, error: procErr } = await supabase
        .from("processes")
        .select("id, title, status, created_at, company_id, customer_id")
        .gte("created_at", periodDate);

      if (procErr) console.error("[AdminMetrics] Erro processes:", procErr);

      // 6. Leituras de documentos de origem (OCR) e documentos gerados no período
      const { data: ocrConsumption, error: ocrErr } = await supabase
        .from("resource_consumption")
        .select("id, amount, resource_key, created_at, company_id")
        .eq("resource_key", "ocr")
        .gte("created_at", periodDate);

      if (ocrErr) console.error("[AdminMetrics] Erro resource_consumption:", ocrErr);

      const { data: documents, error: docErr } = await supabase
        .from("generated_documents")
        .select("id, title, status, created_at, company_id, file_size")
        .gte("created_at", periodDate);

      if (docErr) console.error("[AdminMetrics] Erro documents:", docErr);

      // 7. Armazenamento real por arquivos carregados
      const { data: uploadedFiles, error: filesErr } = await supabase
        .from("uploaded_files")
        .select("id, file_size, company_id, created_at");

      if (filesErr) console.error("[AdminMetrics] Erro uploaded_files:", filesErr);

      // 8. Erros operacionais recentes (OCR jobs falhos, docs com erro, pagamentos rejeitados)
      const { data: failedOcrJobs, error: ocrJobsErr } = await supabase
        .from("ocr_jobs")
        .select("id, status, created_at, company_id, error_message")
        .eq("status", "failed")
        .gte("created_at", periodDate);

      if (ocrJobsErr) console.error("[AdminMetrics] Erro failedOcrJobs:", ocrJobsErr);

      // 9. Sugestões pendentes
      const { data: suggestions, error: sugErr } = await supabase
        .from("tickets")
        .select("id, title, type, status, priority, created_at, company_id")
        .order("created_at", { ascending: false });

      if (sugErr) console.error("[AdminMetrics] Erro tickets:", sugErr);

      // -------------------------------------------------------------
      // CÁLCULOS ESTRITOS (SEM VALORES INVENTADOS OU LUCRO FICTÍCIO)
      // -------------------------------------------------------------
      
      // Empresas
      const totalCompanies = (companies || []).length;
      const activeCompanies = (companies || []).filter((c: any) => c.is_active !== false).length;
      const suspendedCompanies = (companies || []).filter((c: any) => c.is_active === false).length;

      // Assinaturas
      const subsList = subscriptions || [];
      const activeSubs = subsList.filter((s: any) => s.status === "active").length;
      const trialingSubs = subsList.filter((s: any) => s.status === "trialing").length;
      const pastDueSubs = subsList.filter((s: any) => s.status === "past_due" || s.status === "incomplete" || s.status === "pending").length;
      const canceledSubs = subsList.filter((s: any) => s.status === "canceled").length;

      // Pagamentos no período selecionado
      const paymentList = payments || [];
      const confirmedRevenue = paymentList
        .filter((p: any) => p.status === "approved" || p.status === "paid")
        .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

      const pendingCharges = paymentList
        .filter((p: any) => p.status === "pending" || p.status === "in_process")
        .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

      const rejectedCharges = paymentList
        .filter((p: any) => p.status === "rejected" || p.status === "failed")
        .length;

      // Processos e Leituras OCR
      const processesCount = (processes || []).length;
      const ocrReadsCount = (ocrConsumption || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 1), 0);
      const docsCount = (documents || []).length;

      // Armazenamento consolidado (em Megabytes)
      const allFiles = [...(uploadedFiles || []), ...(documents || []).filter((d: any) => d.file_size)];
      const totalBytes = allFiles.reduce((acc: number, f: any) => acc + (Number(f.file_size) || 0), 0);
      const totalStorageMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
      const totalStorageGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));

      // Erros operacionais reais no período
      const docErrors = (documents || []).filter((d: any) => d.status === "error").length;
      const ocrErrors = (failedOcrJobs || []).length;
      const totalRecentErrors = docErrors + ocrErrors + rejectedCharges;

      // Sugestões pendentes
      const pendingSuggestions = (suggestions || []).filter((s: any) => s.status !== "concluido" && s.status !== "fechado" && s.status !== "resolvido").length;

      // Montar lista de atividades recentes combinada
      const recentActivities: any[] = [];

      (processes || []).slice(0, 4).forEach((p: any) => {
        recentActivities.push({
          id: `proc-${p.id}`,
          type: "processo",
          title: `Processo criado: ${p.title || "Novo Processo Náutico"}`,
          company: "Empresa vinculada",
          date: p.created_at,
          badge: "Processo",
          badgeColor: "bg-blue-50 text-[#075BFF] border-blue-200",
        });
      });

      (documents || []).slice(0, 3).forEach((d: any) => {
        recentActivities.push({
          id: `doc-${d.id}`,
          type: "documento",
          title: `Documento gerado: ${d.title || "Minuta Oficial"}`,
          company: "Operação Documental",
          date: d.created_at,
          badge: "Documento",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        });
      });

      recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Alertas operacionais reais
      const activeAlerts: any[] = [];

      if (totalRecentErrors > 0) {
        activeAlerts.push({
          id: "alert-errors",
          title: `${totalRecentErrors} erros operacionais no período`,
          description: `${ocrErrors} falhas de OCR, ${docErrors} falhas de geração de PDF e ${rejectedCharges} pagamentos recusados.`,
          link: "/admin/system-health",
          actionText: "Ver integridade do sistema",
          severity: "warning",
        });
      }

      if (pastDueSubs > 0) {
        activeAlerts.push({
          id: "alert-subs",
          title: `${pastDueSubs} assinaturas com pagamento pendente`,
          description: "Empresas com faturas vencidas ou em processo de cobrança.",
          link: "/admin/billing",
          actionText: "Gerenciar assinaturas",
          severity: "warning",
        });
      }

      if (pendingSuggestions > 0) {
        activeAlerts.push({
          id: "alert-sug",
          title: `${pendingSuggestions} sugestões de clientes aguardando resposta`,
          description: "Tickets de feedback e melhorias enviadas por despachantes e clientes.",
          link: "/admin/sugestoes",
          actionText: "Responder tickets",
          severity: "info",
        });
      }

      if (activeAlerts.length === 0) {
        activeAlerts.push({
          id: "alert-ok",
          title: "Sistemas operando dentro da normalidade",
          description: "Nenhum incidente operacional ou erro de cobrança detectado no período selecionado.",
          link: "/admin/system-health",
          actionText: "Ver diagnósticos",
          severity: "info",
        });
      }

      return {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        totalUsers: (profiles || []).length,
        activeSubs,
        trialingSubs,
        pastDueSubs,
        canceledSubs,
        confirmedRevenue,
        pendingCharges,
        processesCount,
        ocrReadsCount,
        docsCount,
        totalStorageMb,
        totalStorageGb,
        totalRecentErrors,
        ocrErrors,
        docErrors,
        rejectedCharges,
        pendingSuggestions,
        recentActivities: recentActivities.slice(0, 6),
        activeAlerts,
      };
    },
    staleTime: 1000 * 30, // 30 segundos de cache
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA VISÃO GERAL COM FILTRO TEMPORAL */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Visão geral da plataforma
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold uppercase">
              Superadministrador Global
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Painel consolidado com dados reais de empresas, assinaturas, receitas confirmadas e integridade do sistema.
          </p>
        </div>

        {/* Dropdown de Filtro Temporal e Ação de Recarregar */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold h-9 gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#075BFF]" : ""}`} />
            <span className="hidden xs:inline">Atualizar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white border-slate-200 text-[#0B1739] font-bold text-xs h-9 px-3.5 gap-2 rounded-xl shadow-2xs hover:bg-slate-50 shrink-0 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{selectedPeriod}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 text-slate-700 shadow-md rounded-xl">
              {["Hoje", "Últimos 7 dias", "Últimos 30 dias", "Este mês", "Ano atual"].map((period) => (
                <DropdownMenuItem
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`text-xs font-medium cursor-pointer ${selectedPeriod === period ? "bg-blue-50 text-[#075BFF] font-bold" : ""}`}
                >
                  {period}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ESTADOS DE CARREGAMENTO E ERRO */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-[#075BFF]" />
          <span className="font-medium">Carregando métricas reais da plataforma...</span>
        </div>
      ) : isError ? (
        <Card className="p-8 border-red-200 bg-red-50/40 text-center rounded-2xl shadow-xs">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0B1739]">Erro ao consultar métricas da plataforma</h3>
          <p className="text-xs text-slate-600 mt-1">
            Não foi possível carregar os dados consolidados no momento.
          </p>
          <Button
            onClick={() => refetch()}
            className="mt-4 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 3. CARTÕES DE MÉTRICAS PRINCIPAIS (TODOS CLICÁVEIS PARA LISTAGENS ÚTEIS) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: Empresas (Cadastradas, Ativas, Suspensas) */}
            <Link to="/admin/companies" className="block focus:outline-none">
              <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-2xs hover:border-[#075BFF] hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#075BFF] border border-blue-100">
                      <Building className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Empresas clientes</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0B1739]">
                      {metrics?.totalCompanies ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">cadastradas</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {metrics?.activeCompanies ?? 0} ativas
                  </span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    {metrics?.suspendedCompanies ?? 0} suspensas
                  </span>
                </div>
              </Card>
            </Link>

            {/* Card 2: Assinaturas (Ativas, Em Teste, Pendentes, Canceladas) */}
            <Link to="/admin/billing" className="block focus:outline-none">
              <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-2xs hover:border-[#075BFF] hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Situação das assinaturas</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0B1739]">
                      {metrics?.activeSubs ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">ativas confirmadas</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                    {metrics?.trialingSubs ?? 0} em teste
                  </span>
                  <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                    {metrics?.pastDueSubs ?? 0} pendentes
                  </span>
                  <span className="text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                    {metrics?.canceledSubs ?? 0} canceladas
                  </span>
                </div>
              </Card>
            </Link>

            {/* Card 3: Receitas Confirmadas & Cobranças Pendentes (Valores Reais Separados) */}
            <Link to="/admin/financeiro" className="block focus:outline-none">
              <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-2xs hover:border-[#075BFF] hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Receita confirmada ({selectedPeriod})</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0B1739]">
                      R$ {(metrics?.confirmedRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Cobranças pendentes:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    R$ {(metrics?.pendingCharges || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </Card>
            </Link>

            {/* Card 4: Processos e Leituras Automáticas (OCR) */}
            <Link to="/admin/saas-metrics" className="block focus:outline-none">
              <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-2xs hover:border-[#075BFF] hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Processos no período</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0B1739]">
                      {metrics?.processesCount ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">processos criados</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Leituras OCR efetuadas:</span>
                  <span className="font-bold text-[#075BFF] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {metrics?.ocrReadsCount ?? 0} leituras
                  </span>
                </div>
              </Card>
            </Link>

            {/* Card 5: Armazenamento Total por Empresa */}
            <Link to="/admin/saas-metrics" className="block focus:outline-none">
              <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-2xs hover:border-[#075BFF] hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Armazenamento em nuvem</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0B1739]">
                      {metrics?.totalStorageGb ? `${metrics.totalStorageGb} GB` : `${metrics?.totalStorageMb || 0} MB`}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">utilizados</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Documentos e anexos</span>
                  <span className="font-semibold text-slate-700">{metrics?.docsCount ?? 0} PDFs emitidos</span>
                </div>
              </Card>
            </Link>

            {/* Card 6: Erros Recentes & Integridade Operacional */}
            <Link to="/admin/system-health" className="block focus:outline-none">
              <Card className={`p-5 rounded-2xl border shadow-2xs hover:shadow-sm transition-all h-full flex flex-col justify-between group cursor-pointer ${
                (metrics?.totalRecentErrors || 0) > 0 
                  ? "bg-rose-50/40 border-rose-200 hover:border-rose-400" 
                  : "bg-white border-slate-200/80 hover:border-emerald-300"
              }`}>
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                      (metrics?.totalRecentErrors || 0) > 0 
                        ? "bg-rose-100 text-rose-700 border-rose-200" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }`}>
                      {(metrics?.totalRecentErrors || 0) > 0 ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#075BFF] transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold block mt-3">Integridade operacional</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${(metrics?.totalRecentErrors || 0) > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {(metrics?.totalRecentErrors || 0) > 0 ? `${metrics?.totalRecentErrors} erros` : "100% OK"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">no período</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px]">
                  {(metrics?.totalRecentErrors || 0) > 0 ? (
                    <span className="text-rose-600 font-bold">
                      {metrics?.ocrErrors || 0} OCR · {metrics?.docErrors || 0} PDFs · {metrics?.rejectedCharges || 0} cobranças
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">Nenhum incidente operacional</span>
                  )}
                </div>
              </Card>
            </Link>

          </div>

          {/* ========================================================================= */}
          {/* 4. ATIVIDADES RECENTES & PENDÊNCIAS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Atividade Recente (7 colunas) */}
            <Card className="lg:col-span-7 bg-white p-6 rounded-2xl border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#075BFF]" />
                  <h2 className="text-base font-bold text-[#0B1739]">Atividade recente da plataforma</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Tempo real</span>
              </div>

              {metrics?.recentActivities && metrics.recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {metrics.recentActivities.map((act: any) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors rounded-xl px-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${act.badgeColor}`}>
                            {act.badge}
                          </span>
                          <h4 className="text-xs font-bold text-[#0B1739] truncate">{act.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400">{act.company}</p>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(act.date).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  Nenhuma atividade recente registrada no período selecionado.
                </div>
              )}
            </Card>

            {/* Coluna Direita: Alertas & Pendências (5 colunas) */}
            <Card className="lg:col-span-5 bg-white p-6 rounded-2xl border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-bold text-[#0B1739]">Alertas e atenção operacional</h2>
                </div>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">
                  {metrics?.activeAlerts?.length || 0} notas
                </Badge>
              </div>

              <div className="space-y-3">
                {metrics?.activeAlerts && metrics.activeAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                      alert.severity === "warning"
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-blue-50/40 border-blue-100"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
                        <AlertCircle className={`h-3.5 w-3.5 ${alert.severity === "warning" ? "text-amber-600" : "text-[#075BFF]"}`} />
                        {alert.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    <Link
                      to={alert.link}
                      className="text-xs font-bold text-[#075BFF] hover:underline self-end inline-flex items-center gap-1 pt-1"
                    >
                      <span>{alert.actionText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
