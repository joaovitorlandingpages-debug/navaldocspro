import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Rocket, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Building2, 
  UserCheck, 
  Users, 
  Ship, 
  ClipboardList, 
  FileText, 
  ArrowLeft, 
  RefreshCw, 
  HelpCircle,
  ExternalLink,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  getCompanyOnboardingProgress, 
  OnboardingStep 
} from "@/services/onboardingService";

export const Route = createFileRoute("/getting-started")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <PrimeirosPassosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
  head: () => ({
    meta: [
      { title: "Primeiros passos — NavalDocs Pro" },
      { name: "description", content: "Guia passo a passo para emitir seu primeiro documento náutico oficial." }
    ]
  })
});

const STEP_ICONS = {
  empresa: Building2,
  funcionario: UserCheck,
  cliente: Users,
  embarcacao: Ship,
  processo: ClipboardList,
  documento: FileText,
};

export function PrimeirosPassosPage() {
  const { profile, companyId: authCompanyId } = useAuth();
  const companyId = profile?.company_id || authCompanyId;
  const navigate = useNavigate();

  // Consulta do progresso real verificado no banco de dados
  const { 
    data: progress, 
    isLoading, 
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ["company-onboarding-progress", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      return await getCompanyOnboardingProgress(companyId);
    },
    enabled: Boolean(companyId),
    staleTime: 1000 * 10, // 10 segundos
  });

  const totalSteps = progress?.totalSteps || 6;
  const completedCount = progress?.completedCount || 0;
  const percent = progress?.percent || 0;
  const allCompleted = progress?.allCompleted || false;

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-8 font-sans">
      
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para o Início</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 text-xs gap-1.5 cursor-pointer bg-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#075BFF]" : ""}`} />
          <span>Atualizar progresso</span>
        </Button>
      </div>

      {/* Cabeçalho da Tela */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#075BFF] text-xs font-bold uppercase tracking-wider">
          <Rocket className="h-3.5 w-3.5" />
          <span>Guia de Implantação Rápida</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1739]">
          Primeiros passos no NavalDocs Pro
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
          Siga esta sequência prática para chegar ao seu primeiro documento gerado. Você não precisa entender todas as áreas do sistema agora: cada etapa salva no banco é reconhecida automaticamente.
        </p>
      </div>

      {/* Card de Progresso Global */}
      <Card className="p-6 sm:p-7 rounded-2xl border-slate-200/90 shadow-2xs bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status da Implantação
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#0B1739]">
                {completedCount} de {totalSteps}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                etapas concluídas ({percent}%)
              </span>
            </div>
          </div>

          {allCompleted ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Todos os passos concluídos com sucesso!</span>
            </div>
          ) : progress?.nextStep ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-[#075BFF] border border-blue-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#075BFF] animate-pulse" />
              <span>Próximo passo: Etapa {progress.nextStep.order}</span>
            </div>
          ) : null}
        </div>

        {/* Barra de Progresso Visual */}
        <div className="space-y-1.5">
          <Progress value={percent} className="h-2.5 bg-slate-100" />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Início da conta</span>
            <span>Primeiro documento gerado</span>
          </div>
        </div>
      </Card>

      {/* Lista das 6 Etapas Detalhadas */}
      <div className="space-y-4">
        {progress?.steps.map((step) => {
          const StepIcon = STEP_ICONS[step.id] || Circle;
          const isNext = !step.completed && progress.nextStep?.id === step.id;

          return (
            <Card
              key={step.id}
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${
                step.completed
                  ? "bg-emerald-50/30 border-emerald-200/90 shadow-2xs"
                  : isNext
                    ? "bg-white border-[#075BFF] shadow-sm ring-1 ring-[#075BFF]/20"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Lado Esquerdo: Ícone + Textos */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    step.completed
                      ? "bg-emerald-100 text-emerald-700"
                      : isNext
                        ? "bg-blue-50 text-[#075BFF]"
                        : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Etapa {step.order}
                      </span>
                      {step.completed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Salvo no banco
                        </span>
                      ) : isNext ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075BFF] bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                          Etapa atual recomendada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
                      {step.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                      {step.description}
                    </p>

                    {/* Informação detectada no banco */}
                    {step.detectedInfo && (
                      <div className="pt-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100/60 border border-emerald-200/60 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Identificado: {step.detectedInfo}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Botão de Ação Direta */}
                <div className="sm:self-center shrink-0 pl-13 sm:pl-0">
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: step.actionPath, search: step.actionSearch as any })}
                    className={`rounded-xl text-xs font-bold h-9 px-4 gap-1.5 cursor-pointer transition-all ${
                      step.completed
                        ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        : isNext
                          ? "bg-[#075BFF] hover:bg-blue-600 text-white shadow-xs"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Card de Conclusão / Dúvidas */}
      <Card className="p-6 rounded-2xl border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#0B1739]">
            Precisa de ajuda com alguma etapa?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte respostas rápidas na Central de Ajuda ou envie uma dúvida diretamente para a equipe de suporte náutico.
          </p>
        </div>

        <Link
          to="/sugestoes"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[#075BFF] text-xs font-bold hover:bg-blue-50 transition-colors shrink-0 shadow-2xs"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Abrir Ajuda e sugestões</span>
        </Link>
      </Card>

    </div>
  );
}

export default PrimeirosPassosPage;
