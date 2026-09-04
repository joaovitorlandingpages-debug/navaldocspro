import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Link } from "@tanstack/react-router";
import { Clock, Zap, Crown, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TrialBannerProps {
  /** Se true, oculta banners decorativos de admin/homologação e exibe apenas alertas de carência/expiração/limite */
  onlyAlerts?: boolean;
}

export function TrialBanner({ onlyAlerts = false }: TrialBannerProps) {
  const { 
    isLifetimeAdmin, 
    isHomologation, 
    isTrial, 
    trialDaysLeft, 
    isTrialExpired,
    isInGracePeriod,
    graceDaysLeft,
    isPastDue,
    isCanceled
  } = usePlanLimits();

  // 1. ADMIN VITALÍCIO
  if (isLifetimeAdmin) {
    if (onlyAlerts) return null;
    return (
      <div className="bg-gradient-to-r from-[#001B3D] via-[#0A2E5C] to-[#001B3D] border-b border-amber-500/20 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400 shrink-0">
            <Crown className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5 shadow-sm shadow-amber-500/20">
              Admin Master
            </Badge>
            <p className="text-xs font-semibold text-white/90">
              Acesso Vitalício Ativado <span className="text-white/40 hidden sm:inline">• Todos os recursos e cotas liberados permanentemente</span>
            </p>
          </div>
        </div>
        <Link to="/admin-master">
          <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-wider h-7 px-3 gap-1">
            Painel Admin <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 2. MODO HOMOLOGAÇÃO (BYPASS SEGURO PARA TESTES EM OFICINA PILOTO)
  if (isHomologation) {
    if (onlyAlerts) return null;
    return (
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-500/30 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in duration-500 text-white">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40 text-emerald-300 shrink-0">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5 shadow-sm">
              Homologação Ativa
            </Badge>
            <p className="text-xs font-semibold text-emerald-100">
              Ambiente de Validação & Homologação <span className="text-emerald-300/60 hidden sm:inline">• Bypass seguro ativo: cotas operacionais ilimitadas</span>
            </p>
          </div>
        </div>
        <Link to="/billing/subscription">
          <Button variant="ghost" size="sm" className="text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-wider h-7 px-3 gap-1">
            Ver Status <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 3. PERÍODO DE CARÊNCIA (GRACE PERIOD) - AVISO NÃO-BLOQUEANTE
  if (isInGracePeriod) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 border-b border-amber-600 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-slate-950/10 flex items-center justify-center text-slate-950 shrink-0 font-bold">
            <RefreshCw className="h-4 w-4 animate-spin duration-3000" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-slate-950 text-amber-400 font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5">
                Período de Carência
              </Badge>
              <span className="text-xs font-black uppercase tracking-wide">
                Renovação Pendente • Restam {graceDaysLeft} {graceDaysLeft === 1 ? 'dia' : 'dias'} de tolerância
              </span>
            </div>
            <p className="text-[11px] text-slate-900/90 font-medium">
              Suas consultas e operações continuam ativas. Regularize seu plano para evitar o bloqueio de novas criações.
            </p>
          </div>
        </div>
        <Link to="/plans">
          <Button className="bg-slate-950 text-white hover:bg-slate-900 font-black text-xs uppercase tracking-widest px-4 py-1.5 h-8 rounded-xl shadow-lg shrink-0 gap-1.5">
            Regularizar <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 4. ASSINATURA CANCELADA OU PAST DUE FORA DA CARÊNCIA
  if (isCanceled || (isPastDue && !isInGracePeriod)) {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              {isCanceled ? "Assinatura Desativada" : "Assinatura Vencida"} • Modo Consulta Liberado
            </p>
            <p className="text-[11px] text-slate-300">
              Você pode consultar todos os seus clientes, processos e documentos normalmente. Para criar novos registros, renove seu plano.
            </p>
          </div>
        </div>
        <Link to="/plans">
          <Button className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 h-8 rounded-xl shadow-lg shrink-0 gap-1">
            Reativar Plano <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 5. TRIAL EXPIRADO FORA DA CARÊNCIA
  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-900 text-white border-b border-rose-700 px-4 md:px-8 py-3 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Período de Teste Gratuito Expirado • Consulta Ativa</p>
            <p className="text-[11px] text-white/80">
              Seus dados permanecem seguros para consulta. Escolha um dos planos navais para emitir novos requerimentos e processos.
            </p>
          </div>
        </div>
        <Link to="/plans">
          <Button className="bg-white text-rose-900 hover:bg-white/90 font-black text-xs uppercase tracking-widest px-4 py-1.5 h-8 rounded-xl shadow-lg shrink-0">
            Assinar Agora
          </Button>
        </Link>
      </div>
    );
  }

  // 6. TRIAL ATIVO (14 DIAS GRÁTIS)
  if (isTrial) {
    const isEnding = trialDaysLeft <= 3;

    // Se onlyAlerts estiver ativado e o trial ainda tiver mais de 3 dias, não polui a tela de consulta
    if (onlyAlerts && !isEnding) return null;

    return (
      <div className={`border-b px-4 md:px-8 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in duration-500 ${
        isEnding 
          ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-amber-500/30 text-amber-950"
          : "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-blue-500/10 border-blue-500/20 text-navy"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
            isEnding ? "bg-amber-500/20 text-amber-700" : "bg-blue-500/20 text-primary"
          }`}>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className={`font-black text-[9px] uppercase tracking-widest px-2 py-0.5 ${
              isEnding ? "border-amber-500/40 text-amber-800 bg-amber-50" : "border-blue-500/40 text-primary bg-blue-50"
            }`}>
              Teste Grátis
            </Badge>
            <span className="font-bold">
              {trialDaysLeft === 1 ? "Último dia de teste gratuito!" : `Restam ${trialDaysLeft} dias do seu período de 14 dias grátis.`}
            </span>
            <span className="text-slate-500 hidden sm:inline">• Todas as ferramentas desbloqueadas.</span>
          </div>
        </div>
        <Link to="/plans">
          <Button size="sm" className="bg-navy hover:bg-navy/90 text-white font-black text-[10px] uppercase tracking-widest h-7 px-3 rounded-lg shadow-sm gap-1">
            Escolher Plano <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}
