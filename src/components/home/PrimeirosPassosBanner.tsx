import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  Rocket, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  OnboardingProgress, 
  isGuideDismissed, 
  setGuideDismissed 
} from "@/services/onboardingService";

interface PrimeirosPassosBannerProps {
  progress: OnboardingProgress;
  companyId: string;
  onRefresh?: () => void;
}

export function PrimeirosPassosBanner({ progress, companyId, onRefresh }: PrimeirosPassosBannerProps) {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(() => isGuideDismissed(companyId));
  const [isExpanded, setIsExpanded] = useState(!progress.allCompleted);

  const handleDismiss = () => {
    setGuideDismissed(companyId, true);
    setIsDismissed(true);
  };

  const handleReopen = () => {
    setGuideDismissed(companyId, false);
    setIsDismissed(false);
  };

  if (isDismissed) {
    return (
      <div className="mb-6 flex items-center justify-between p-3 px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-[#075BFF]" />
          <span>
            Guia de Primeiros passos: <strong>{progress.completedCount} de {progress.totalSteps} etapas concluídas ({progress.percent}%)</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReopen}
            className="text-[#075BFF] font-semibold hover:underline cursor-pointer"
          >
            Reabrir guia
          </button>
          <Link
            to="/getting-started"
            className="text-slate-400 hover:text-slate-700 font-medium"
          >
            Ver tela completa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-50/70 via-white to-slate-50/70 border border-blue-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs relative">
      {/* Botão de Fechar Guia */}
      <button
        type="button"
        onClick={handleDismiss}
        title="Fechar guia da página inicial (pode ser reaberto pelo menu Ajuda)"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Fechar guia"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Topo do Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-[#075BFF] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Rocket className="h-3.5 w-3.5" />
            <span>Primeiros passos no NavalDocs Pro</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0B1739]">
            {progress.allCompleted 
              ? "Parabéns! Sua empresa gerou o primeiro documento náutico" 
              : "Emita seu primeiro documento náutico em 6 passos rápidos"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            {progress.allCompleted
              ? "Todas as etapas essenciais foram configuradas e validadas com sucesso."
              : "Siga a sequência abaixo. Cada etapa concluída é reconhecida e salva automaticamente no banco."}
          </p>
        </div>

        {/* Indicador de Porcentagem */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
          <span className="text-2xl font-bold text-[#075BFF]">
            {progress.percent}%
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {progress.completedCount} de {progress.totalSteps} concluídos
          </span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mt-4 mb-5">
        <Progress value={progress.percent} className="h-2 bg-slate-200" />
      </div>

      {/* Próxima Ação Recomendada se ainda não concluiu tudo */}
      {!progress.allCompleted && progress.nextStep && (
        <div className="mb-4 p-3.5 bg-white border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold text-xs shrink-0">
              {progress.nextStep.order}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#075BFF] tracking-wider block">
                Próxima etapa
              </span>
              <p className="text-xs sm:text-sm font-bold text-[#0B1739]">
                {progress.nextStep.title}
              </p>
              <p className="text-xs text-slate-500 line-clamp-1">
                {progress.nextStep.description}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate({ to: progress.nextStep!.actionPath, search: progress.nextStep!.actionSearch as any })}
            className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl h-8 px-4 gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <span>{progress.nextStep.actionText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Lista das 6 Etapas (Expansível) */}
      <div className="pt-2 border-t border-slate-200/60">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full py-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span>Ver todas as 6 etapas</span>
            <span className="text-slate-400 font-normal">
              ({progress.completedCount} concluídas)
            </span>
          </span>
          <span className="flex items-center gap-1 text-[#075BFF]">
            <span>{isExpanded ? "Ocultar detalhes" : "Mostrar detalhes"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 animate-in fade-in-50 duration-150">
            {progress.steps.map((step) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  step.completed 
                    ? "bg-emerald-50/40 border-emerald-200/80" 
                    : "bg-white border-slate-200/90 hover:border-blue-200"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-[#0B1739]">
                      {step.title}
                    </span>
                    {step.completed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        Salvo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        <Circle className="h-2.5 w-2.5" />
                        Pendente
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {step.description}
                  </p>

                  {step.detectedInfo && (
                    <p className="text-[11px] font-medium text-emerald-800 bg-emerald-100/40 px-2 py-1 rounded-md mt-2 truncate">
                      ✓ {step.detectedInfo}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Etapa {step.order} de 6
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: step.actionPath, search: step.actionSearch as any })}
                    className={`h-7 px-2.5 text-xs font-semibold rounded-lg cursor-pointer ${
                      step.completed 
                        ? "text-slate-600 hover:text-slate-900 hover:bg-emerald-100/50" 
                        : "text-[#075BFF] hover:bg-blue-50"
                    }`}
                  >
                    <span>{step.actionText}</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé com atalho para tela completa */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span className="text-[11px]">
          Dica: Você pode fechar este guia e acessá-lo a qualquer momento pelo menu <strong>Ajuda</strong>.
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Fechar guia
          </button>
          <Link
            to="/getting-started"
            className="text-[#075BFF] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Ver tela completa de Primeiros passos</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
