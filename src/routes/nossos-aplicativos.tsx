import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { 
  FileSpreadsheet, 
  Award, 
  CalendarClock, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Building,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Lock
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/nossos-aplicativos")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NossosAplicativosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type AppStatus = "current" | "available" | "soon" | "not_subscribed" | "restricted";

interface AppItem {
  id: string;
  title: string;
  description: string;
  status: AppStatus;
  statusLabel: string;
  badgeColor: string;
  features: string[];
  actionLabel: string;
  actionUrl?: string;
  isExternal?: boolean;
  notSubscribedMessage?: string;
  icon: React.ComponentType<{ className?: string }>;
}

function NossosAplicativosPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const companyId = profile?.company_id;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [companyAppsAccess, setCompanyAppsAccess] = useState<Record<string, any>>({});

  // Carregar dados de assinatura/permissões da empresa
  const loadAppData = useCallback(async () => {
    if (authLoading) return;

    if (!companyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("id, name, fantasy_name, plan, is_pilot, metadata")
        .eq("id", companyId)
        .maybeSingle();

      if (compErr) {
        console.error("[NossosAplicativos] Erro ao carregar dados da empresa:", {
          code: compErr.code,
          message: compErr.message,
          details: compErr.details,
        });
        throw compErr;
      }

      const meta = (compData?.metadata || {}) as Record<string, any>;
      const appAccess = (meta.applications_access || {}) as Record<string, any>;
      setCompanyAppsAccess(appAccess);
    } catch (err) {
      console.error("[NossosAplicativos] Falha ao consultar produtos da empresa:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [authLoading, companyId]);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  const handleRetry = () => {
    setIsRetrying(true);
    loadAppData();
  };

  // Lista oficial dos 3 aplicativos da plataforma com base nos direitos reais
  const apps: AppItem[] = useMemo(() => {
    const arraisAccess = companyAppsAccess["app-arrais"];
    const hasArraisActive = arraisAccess?.status === "active";

    const centralAccess = companyAppsAccess["central-vencimentos"];
    const hasCentralActive = centralAccess?.status === "active";

    return [
      {
        id: "navaldocs-pro",
        title: "NavalDocs Pro",
        description: "Geração e organização de documentos para embarcações.",
        status: "current",
        statusLabel: "Aplicativo atual",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        features: [
          "Cadastro completo de clientes e embarcações",
          "Geração de requerimentos, procurações e termos",
          "Acompanhamento de processos e protocolos",
          "Leitor inteligente e validação documental",
        ],
        actionLabel: "Abrir aplicativo",
        actionUrl: "/home",
        icon: FileSpreadsheet,
      },
      {
        id: "app-arrais",
        title: "App Arrais",
        description: "Organização de documentos para habilitação de amadores.",
        status: hasArraisActive ? "available" : "soon",
        statusLabel: hasArraisActive ? "Acesso Piloto Liberado" : "Em breve",
        badgeColor: hasArraisActive ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200",
        features: [
          "Controle de alunos e turmas náuticas",
          "Atestados de embarque e declarações de aulas",
          "Fluxo guiado para Capitania e agendamento de provas",
        ],
        actionLabel: hasArraisActive ? "Acesso Antecipado" : "Em breve",
        actionUrl: hasArraisActive ? "/home" : undefined,
        icon: Award,
      },
      {
        id: "central-vencimentos",
        title: "Central de Vencimentos",
        description: "Acompanhe prazos e vencimentos de documentos.",
        status: hasCentralActive ? "available" : "soon",
        statusLabel: hasCentralActive ? "Disponível" : "Em preparação",
        badgeColor: hasCentralActive ? "bg-blue-50 text-[#075BFF] border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200",
        features: [
          "Painel unificado de prazos por cliente e embarcação",
          "Monitoramento de certificados, vistorias e DPEM",
          "Alertas preventivos para evitar perda de validade",
        ],
        actionLabel: hasCentralActive ? "Acessar" : "Em breve",
        actionUrl: hasCentralActive ? "/dashboard/deadlines" : undefined,
        icon: CalendarClock,
      },
    ];
  }, [companyAppsAccess]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1739] font-sans pb-16">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                Nossos aplicativos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Acesse as soluções da plataforma para organizar sua operação.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#075BFF] border border-blue-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Conta corporativa integrada</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ========================================================================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {isLoading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 shadow-xs">
            <Loader2 className="h-7 w-7 animate-spin text-[#075BFF]" />
            <span className="font-medium">Carregando aplicativos da plataforma...</span>
          </div>
        ) : isError ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B1739]">
              Erro ao consultar permissões
            </h3>
            <p className="text-xs text-slate-500">
              Não foi possível validar o acesso aos aplicativos da sua empresa no momento.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{isRetrying ? "Recarregando..." : "Tentar novamente"}</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. CARTÕES DOS APLICATIVOS (GRID 3 COLUNAS / EMPILHADO NO MOBILE)        */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => {
              const Icon = app.icon;
              const isCurrent = app.status === "current";
              const isAvailable = app.status === "available";
              const isSoon = app.status === "soon";
              const isNotSubscribed = app.status === "not_subscribed";

              return (
                <div
                  key={app.id}
                  className={`bg-white border rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-all ${
                    isCurrent
                      ? "border-blue-300 ring-2 ring-blue-500/10 shadow-sm"
                      : isAvailable
                      ? "border-slate-200/90 hover:border-blue-200 hover:shadow-md"
                      : "border-slate-200/90 bg-white"
                  }`}
                >
                  <div>
                    {/* Topo do Cartão: Ícone e Badge de Status */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center border shadow-2xs ${
                        isCurrent 
                          ? "bg-blue-600 text-white border-blue-700" 
                          : "bg-blue-50 text-[#075BFF] border-blue-100"
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${app.badgeColor}`}>
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {isSoon && <Clock className="h-3 w-3 text-slate-400" />}
                        {app.statusLabel}
                      </span>
                    </div>

                    {/* Título e Descrição */}
                    <h2 className="text-lg font-bold text-[#0B1739]">
                      {app.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed min-h-[40px]">
                      {app.description}
                    </p>

                    {/* Recursos Principais */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Recursos principais
                      </p>
                      <ul className="space-y-2">
                        {app.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mensagem quando não contratado */}
                    {isNotSubscribed && (
                      <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                        <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Este aplicativo não está disponível no plano atual.</span>
                      </div>
                    )}
                  </div>

                  {/* Botão de Ação */}
                  <div className="mt-8 pt-4 border-t border-slate-100">
                    {isSoon ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
                      >
                        {app.actionLabel}
                      </button>
                    ) : isNotSubscribed ? (
                      <Link
                        to="/plans"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors text-center shadow-2xs"
                      >
                        <span>Ver opções</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to={app.actionUrl || "/home"}
                        className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center shadow-xs cursor-pointer ${
                          isCurrent
                            ? "bg-white border border-blue-200 hover:bg-blue-50 text-[#075BFF]"
                            : "bg-[#075BFF] hover:bg-blue-600 text-white"
                        }`}
                      >
                        <span>{app.actionLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nota Informativa sobre Compartilhamento de Dados e Isolamento */}
        <div className="mt-10 p-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0" />
            <span>
              Todos os aplicativos utilizam a mesma autenticação corporativa, garantindo o isolamento estrito de documentos e dados cadastrais.
            </span>
          </div>
          <Link
            to="/settings"
            className="text-xs font-bold text-[#075BFF] hover:underline shrink-0"
          >
            Gerenciar empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
