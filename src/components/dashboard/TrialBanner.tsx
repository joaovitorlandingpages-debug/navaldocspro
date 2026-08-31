import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Link } from "@tanstack/react-router";
import { Clock, Zap, Crown, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TrialBanner() {
  const { isLifetimeAdmin, isTrial, trialDaysLeft, isTrialExpired } = usePlanLimits();

  // 1. ADMIN VITALÍCIO
  if (isLifetimeAdmin) {
    return (
      <div className="bg-gradient-to-r from-[#001B3D] via-[#0A2E5C] to-[#001B3D] border-b border-amber-500/20 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400">
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

  // 2. TRIAL EXPIRADO
  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-900 text-white border-b border-rose-700 px-4 md:px-8 py-3 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Período de Teste Gratuito Expirado</p>
            <p className="text-[11px] text-white/80">Escolha um dos planos navais para continuar gerando documentos e operando processos.</p>
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

  // 3. TRIAL ATIVO (14 DIAS GRÁTIS)
  if (isTrial) {
    const isEnding = trialDaysLeft <= 3;

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
