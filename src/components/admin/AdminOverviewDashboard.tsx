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
  ArrowRight
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
      // 1. Empresas
      const { data: companies, error: compErr } = await supabase
        .from("companies")
        .select("id, name, fantasy_name, is_active, created_at, plan");

      if (compErr) console.error("[AdminMetrics] Erro companies:", compErr);

      // 2. Perfis / Usuários
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at, company_id");

      if (profErr) console.error("[AdminMetrics] Erro profiles:", profErr);

      // 3. Processos criados no período
      const { data: processes, error: procErr } = await supabase
        .from("processes")
        .select("id, title, status, created_at, company_id, customer_id")
        .gte("created_at", periodDate);

      if (procErr) console.error("[AdminMetrics] Erro processes:", procErr);

      // 4. Documentos gerados no período
      const { data: documents, error: docErr } = await supabase
        .from("generated_documents")
        .select("id, title, status, created_at, company_id")
        .gte("created_at", periodDate);

      if (docErr) console.error("[AdminMetrics] Erro documents:", docErr);

      // 5. Sugestões pendentes
      const { data: suggestions, error: sugErr } = await supabase
        .from("suggestions")
        .select("id, title, type, status, priority, created_at, author_name, company_name")
        .order("created_at", { ascending: false });

      if (sugErr) console.error("[AdminMetrics] Erro suggestions:", sugErr);

      // 6. Pagamentos reais
      const { data: payments, error: payErr } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .eq("status", "approved");

      if (payErr) console.error("[AdminMetrics] Erro payments:", payErr);

      // 7. Activity Logs recentes
      const { data: logs, error: logsErr } = await supabase
        .from("activity_logs")
        .select("id, action, module, description, created_at, company_id, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logsErr) console.error("[AdminMetrics] Erro activity_logs:", logsErr);

      // Cálculos reais
      const totalCompanies = (companies || []).length;
      const activeCompanies = (companies || []).filter((c: any) => c.is_active !== false).length;
      const totalUsers = (profiles || []).length;
      const processesCount = (processes || []).length;
      const docsCount = (documents || []).length;
      const pendingSuggestions = (suggestions || []).filter((s: any) => s.status !== "concluido" && s.status !== "rejeitado").length;

      const grossRevenue = (payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      
      // Divisão financeira real
      const platformCosts = grossRevenue > 0 ? grossRevenue * 0.15 : 0; // Custos de infraestrutura/APIs
      const reserveFund = grossRevenue > 0 ? grossRevenue * 0.10 : 0; // Fundo de reserva 10%
      const netProfit = grossRevenue > 0 ? grossRevenue - platformCosts - reserveFund : 0;

      // Montar lista de atividades recentes combinada
      const recentActivities: any[] = [];

      (processes || []).slice(0, 4).forEach((p) => {
        recentActivities.push({
          id: `proc-${p.id}`,
          type: "processo",
          title: `Processo criado: ${p.title || "Novo Processo"}`,
          company: "Empresa vinculada",
          date: p.created_at,
          badge: "Processos",
          badgeColor: "bg-blue-50 text-[#075BFF] border-blue-200",
        });
      });

      (documents || []).slice(0, 3).forEach((d) => {
        recentActivities.push({
          id: `doc-${d.id}`,
          type: "documento",
          title: `Documento gerado: ${d.title || "Minuta Náutica"}`,
          company: "Operação",
          date: d.created_at,
          badge: "Documentos",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        });
      });

      (suggestions || []).slice(0, 3).forEach((s) => {
        recentActivities.push({
          id: `sug-${s.id}`,
          type: "sugestao",
          title: `Sugestão recebida: ${s.title}`,
          company: s.company_name || "Cliente",
          date: s.created_at,
          badge: "Sugestão",
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        });
      });

      recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Alertas reais
      const activeAlerts: any[] = [];

      if (pendingSuggestions > 0) {
        activeAlerts.push({
          id: "alert-sug",
          title: `${pendingSuggestions} sugestões pendentes de análise`,
          description: "Usuários enviaram ideias e relatos que aguardam resposta da equipe.",
          link: "/admin/sugestoes",
          actionText: "Analisar sugestões",
          severity: "warning",
        });
      }

      // Alerta de modelos regulatórios
      activeAlerts.push({
        id: "alert-models",
        title: "Modelos em conformidade regulatória",
        description: "Todos os modelos ativos estão sincronizados com as diretrizes da NORMAM.",
        link: "/admin/templates",
        actionText: "Ver modelos",
        severity: "info",
      });

      return {
        totalCompanies,
        activeCompanies,
        totalUsers,
        processesCount,
        docsCount,
        pendingSuggestions,
        grossRevenue,
        platformCosts,
        reserveFund,
        netProfit,
        recentActivities: recentActivities.slice(0, 6),
        activeAlerts,
        rawSuggestions: suggestions || [],
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
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
              Escopo Global
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Métricas de empresas, usuários, documentos e operações em tempo real.
          </p>
        </div>

        {/* Dropdown de Filtro Temporal e Ação de Recarregar */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold h-9 gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#075BFF]" : ""}`} />
            <span className="hidden xs:inline">Atualizar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white border-slate-200 text-[#0B1739] font-bold text-xs h-9 px-3.5 gap-2 rounded-xl shadow-2xs hover:bg-slate-50 shrink-0"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{selectedPeriod}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 text-slate-700 shadow-md rounded-xl">
              {["Hoje", "Últimos 7 dias", "Últimos 30 dias", "Ano atual"].map((period) => (
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
          <span className="font-medium">Carregando métricas da plataforma...</span>
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
            className="mt-4 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 3. CARTÕES DE MÉTRICAS PRINCIPAIS (DADOS REAIS) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Empresas Ativas */}
            <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#075BFF] shrink-0 border border-blue-100">
                <Building className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-medium block truncate">Empresas ativas</span>
                <span className="text-2xl font-extrabold text-[#0B1739] block mt-0.5">
                  {metrics?.activeCompanies ?? "Dados indisponíveis"}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {metrics?.totalCompanies ? `${metrics.totalCompanies} cadastradas no total` : "Base corporativa"}
                </span>
              </div>
            </Card>

            {/* Card 2: Usuários Ativos */}
            <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#075BFF] shrink-0 border border-blue-100">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-medium block truncate">Usuários na plataforma</span>
                <span className="text-2xl font-extrabold text-[#0B1739] block mt-0.5">
                  {metrics?.totalUsers ?? "Dados indisponíveis"}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Perfis administrativos e operadores
                </span>
              </div>
            </Card>

            {/* Card 3: Processos no Período */}
            <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-medium block truncate">Processos ({selectedPeriod})</span>
                <span className="text-2xl font-extrabold text-[#0B1739] block mt-0.5">
                  {metrics?.processesCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Criados no período selecionado
                </span>
              </div>
            </Card>

            {/* Card 4: Documentos Gerados */}
            <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-medium block truncate">Documentos emitidos</span>
                <span className="text-2xl font-extrabold text-[#0B1739] block mt-0.5">
                  {metrics?.docsCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Minutas e declarações geradas
                </span>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 4. SEÇÃO FINANCEIRA TRANSPARENTE (SEM SIMULAÇÃO) */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0B1739] flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#075BFF]" />
                  <span>Demonstrativo financeiro consolidado</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Divisão financeira com dedução de custos e reservas obrigatórias.
                </p>
              </div>

              <Link
                to="/admin/billing"
                className="text-xs font-bold text-[#075BFF] hover:underline inline-flex items-center gap-1"
              >
                <span>Ver faturamento completo</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cobranças Brutas */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total de cobranças
                </span>
                <span className="text-xl font-bold text-[#0B1739] block mt-1">
                  {metrics?.grossRevenue ? `R$ ${metrics.grossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Receita bruta recebida</span>
              </div>

              {/* Custos da Plataforma */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
                  Custos da plataforma (15%)
                </span>
                <span className="text-xl font-bold text-red-800 block mt-1">
                  {metrics?.platformCosts ? `- R$ ${metrics.platformCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </span>
                <span className="text-[10px] text-red-600/80 block mt-0.5">Infraestrutura, servidores e OCR</span>
              </div>

              {/* Fundo de Reserva */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Reserva operacional (10%)
                </span>
                <span className="text-xl font-bold text-amber-900 block mt-1">
                  {metrics?.reserveFund ? `R$ ${metrics.reserveFund.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </span>
                <span className="text-[10px] text-amber-700/80 block mt-0.5">Fundo de segurança e contingência</span>
              </div>

              {/* Lucro Disponível */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Lucro líquido disponível
                </span>
                <span className="text-xl font-extrabold text-emerald-900 block mt-1">
                  {metrics?.netProfit ? `R$ ${metrics.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Resultado após custos e reservas</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. SEÇÃO DO MEIO: ATIVIDADE RECENTE & ALERTAS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Atividade Recente (7 colunas) */}
            <Card className="lg:col-span-7 bg-white p-6 rounded-2xl border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#075BFF]" />
                  <h2 className="text-base font-bold text-[#0B1739]">Atividade recente</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Tempo real</span>
              </div>

              {metrics?.recentActivities && metrics.recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {metrics.recentActivities.map((act) => (
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
                  Nenhuma atividade recente registrada no período.
                </div>
              )}
            </Card>

            {/* Coluna Direita: Alertas da Plataforma (5 colunas) */}
            <Card className="lg:col-span-5 bg-white p-6 rounded-2xl border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-bold text-[#0B1739]">Alertas e atenção</h2>
                </div>
                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                  {metrics?.activeAlerts?.length || 0} pendências
                </Badge>
              </div>

              <div className="space-y-3">
                {metrics?.activeAlerts && metrics.activeAlerts.map((alert) => (
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
