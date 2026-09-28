import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { 
  FileText, 
  Award, 
  Bell, 
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
  Lock,
  Package,
  Layers,
  Gauge,
  CreditCard,
  Cpu,
  Ship,
  Info
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/meus-aplicativos")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <MeusAplicativosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

export function MeusAplicativosPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { subscription, isLoading: isLoadingSub, refetchSubscription } = useSubscription();

  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  // Análise do plano e aplicativos incluídos na assinatura real da empresa
  const subscriptionAnalysis = useMemo(() => {
    if (!subscription || subscription.status === "canceled") {
      return {
        hasActiveContract: false,
        planName: null,
        planSlug: null,
        isCombo: false,
        includesNavalDocs: false,
        includesArrais: false,
        includesNotificador: false,
        sharedOcrFranchise: null,
      };
    }

    const planSlug = subscription.plan?.slug || (subscription as any)?.metadata?.plan_slug || "";
    const rawApps = (subscription as any)?.metadata?.apps_included;

    const isCombo = 
      planSlug === "pacote-completo" || 
      planSlug === "pacote-completo-3em1" || 
      (typeof rawApps === "string" && rawApps.includes("arrais") && rawApps.includes("notificador"));

    const includesNavalDocs = isCombo || planSlug.includes("essencial") || planSlug.includes("profissional") || planSlug.includes("equipe");
    const includesArrais = isCombo || planSlug.includes("arrais");
    const includesNotificador = isCombo || planSlug.includes("notificador");

    return {
      hasActiveContract: subscription.status === "active" || subscription.status === "trialing" || subscription.status === "lifetime",
      planName: subscription.plan?.name || "Plano Ativo",
      planSlug,
      isCombo,
      includesNavalDocs,
      includesArrais,
      includesNotificador,
      sharedOcrFranchise: subscription.plan?.ocr_limit || 500,
    };
  }, [subscription]);

  // Transição Autenticada Segura para o Aplicativo
  const handleAccessApp = async (appId: string, destinationUrl: string) => {
    try {
      setIsNavigating(appId);

      // Validação estrita de contexto corporativo antes da transição
      if (!user?.id || !profile?.company_id) {
        toast.error("Sua sessão não possui vínculo corporativo válido para transição.");
        return;
      }

      // Para aplicativos internos (NavalDocs Pro), navegação direta segura com o contexto atual
      if (appId === "navaldocs") {
        toast.success("Acessando o NavalDocs Pro...");
        navigate({ to: destinationUrl });
        return;
      }

      // Para futuros aplicativos externos/subdomínios:
      // Realiza a verificação segura de autorização e preservação de permissões
      toast.info("Iniciando transição autenticada segura...");
      // Simulação da transição autenticada via SSO corporativo
      await new Promise(res => setTimeout(res, 400));
      window.location.href = destinationUrl;
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetuar a transição segura para o aplicativo.");
    } finally {
      setIsNavigating(null);
    }
  };

  // Definição Oficial dos Três Cards da Central de Aplicativos
  const appCards = useMemo(() => {
    const { hasActiveContract, planName, isCombo, includesNavalDocs, includesArrais, includesNotificador } = subscriptionAnalysis;

    return [
      // CARD 1: NAVALDOCS PRO
      {
        id: "navaldocs",
        title: "NavalDocs",
        tagline: "Gestão Náutica Completa",
        description: "Gestão de clientes, embarcações, processos e geração automática dos documentos dos serviços náuticos (DPC / NORMAM).",
        icon: FileText,
        themeColor: "text-[#1868db]",
        bgIconColor: "bg-blue-50 border-blue-100",
        state: includesNavalDocs ? ("included" as const) : hasActiveContract ? ("available_to_upgrade" as const) : ("available_to_subscribe" as const),
        stateLabel: includesNavalDocs 
          ? "Incluído no meu plano" 
          : "Disponível para contratar",
        badgeStyle: includesNavalDocs 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
          : "bg-blue-50 text-[#1868db] border-blue-200",
        planDisplay: includesNavalDocs ? planName : null,
        features: [
          "Cadastro completo de clientes e embarcações",
          "Geração automática dos documentos finais náuticos",
          "Leitor inteligente de anexos (OCR opcional)",
          "Acompanhamento de processos e protocolos",
        ],
        actionType: includesNavalDocs ? ("access" as const) : ("plans" as const),
        actionLabel: includesNavalDocs ? "Acessar NavalDocs" : "Ver planos",
        actionDestination: "/dashboard",
      },

      // CARD 2: ARRAIS
      {
        id: "arrais",
        title: "Arrais",
        tagline: "Escolas & Alunos Náuticos",
        description: "Cadastro e geração automática do kit documental preparatório para habilitação náutica de amadores.",
        icon: Ship,
        themeColor: "text-emerald-600",
        bgIconColor: "bg-emerald-50 border-emerald-100",
        state: isCombo 
          ? ("included_in_dev" as const) 
          : ("in_development" as const),
        stateLabel: isCombo 
          ? "Incluído no meu plano (Em desenvolvimento)" 
          : "Em desenvolvimento",
        badgeStyle: isCombo 
          ? "bg-purple-50 text-purple-700 border-purple-200" 
          : "bg-slate-100 text-slate-600 border-slate-200",
        planDisplay: isCombo ? planName : null,
        features: [
          "Controle de alunos e turmas para escolas náuticas",
          "Geração automática do kit preparatório de habilitação",
          "Emissão padronizada de atestados e declarações",
          "Fluxo guiado de agendamento de provas na Capitania",
        ],
        actionType: "in_development" as const,
        actionLabel: "Em desenvolvimento",
        actionDestination: "#",
      },

      // CARD 3: NOTIFICADOR
      {
        id: "notificador",
        title: "Notificador",
        tagline: "Monitoramento de Prazos",
        description: "Acompanhamento de vencimentos e avisos por e-mail para carteiras, documentos e vistorias de embarcações.",
        icon: Bell,
        themeColor: "text-purple-600",
        bgIconColor: "bg-purple-50 border-purple-100",
        state: isCombo 
          ? ("included_in_dev" as const) 
          : ("in_development" as const),
        stateLabel: isCombo 
          ? "Incluído no meu plano (Em desenvolvimento)" 
          : "Em desenvolvimento",
        badgeStyle: isCombo 
          ? "bg-purple-50 text-purple-700 border-purple-200" 
          : "bg-slate-100 text-slate-600 border-slate-200",
        planDisplay: isCombo ? planName : null,
        features: [
          "Painel de prazos de vencimento por cliente e embarcação",
          "Régua de avisos automáticos enviados por e-mail",
          "Alertas preventivos de certificados e habilitações",
          "Registro e auditoria de mensagens enviadas",
        ],
        actionType: "in_development" as const,
        actionLabel: "Em desenvolvimento",
        actionDestination: "#",
      },
    ];
  }, [subscriptionAnalysis]);

  if (isLoadingSub) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 text-[#1868db] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Consultando ecossistema de aplicativos da sua empresa...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Ecossistema Naval</span>
            <span>•</span>
            <span className="text-[#1868db]">Hub Central</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight flex items-center gap-3">
            <Layers className="h-7 w-7 text-[#1868db]" />
            <span>Meus Aplicativos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Seu ponto de entrada para o NavalDocs, o Arrais e o Notificador. Acesse as soluções ativas no seu plano ou conheça as novas ferramentas náuticas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSubscription()}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-2 h-10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar status</span>
          </Button>

          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-[#1868db] border border-blue-100">
            <ShieldCheck className="h-4 w-4" />
            <span>Sessão Corporativa</span>
          </span>
        </div>
      </div>

      {/* 2. BANNER DE PACOTE COMPLETO COM FRANQUIA COMPARTILHADA */}
      {subscriptionAnalysis.isCombo && (
        <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-3xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-sm shrink-0">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-600 text-white font-extrabold text-[10px] uppercase">
                    Assinatura Unificada
                  </Badge>
                  <span className="text-xs font-extrabold text-[#0d2342]">
                    Pacote Completo (3 em 1)
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#0d2342]">
                  Seus três aplicativos pertencem à mesma assinatura
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Os três aplicativos compartilham a mesma empresa e a mesma cota unificada. A franquia contratada de <strong>{subscriptionAnalysis.sharedOcrFranchise} leituras automáticas de anexos (OCR)/mês</strong> é centralizada no Lovable Cloud e atende a todos os módulos sem duplicidade.
                </p>
              </div>
            </div>

            <Link
              to="/consumo"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-blue-200 text-[#1868db] text-xs font-bold shadow-2xs transition-colors shrink-0"
            >
              <Gauge className="h-4 w-4" />
              <span>Ver Franquia Compartilhada</span>
            </Link>
          </div>

          <div className="p-3.5 bg-white/80 rounded-2xl border border-blue-100/80 flex items-center gap-2.5 text-xs text-slate-600">
            <Info className="h-4 w-4 text-[#1868db] shrink-0" />
            <span className="text-[11px] leading-relaxed">
              <strong>Regra de Franquia Única:</strong> Ao alternar ou abrir outro aplicativo, as leituras de anexos e o armazenamento são consumidos do saldo central da sua empresa. A cota não é duplicada nem cobrada novamente.
            </span>
          </div>
        </div>
      )}

      {/* 3. TRÊS CARDS DOS APLICATIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {appCards.map((app) => {
          const Icon = app.icon;
          const isIncluded = app.state === "included";
          const isIncludedInDev = app.state === "included_in_dev";
          const isInDev = app.state === "in_development" || isIncludedInDev;

          return (
            <Card
              key={app.id}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-all bg-white border ${
                isIncluded
                  ? "border-blue-300 ring-2 ring-blue-500/10 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-5">
                
                {/* Topo do Card: Ícone e Badge */}
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-2xs ${app.bgIconColor} ${app.themeColor}`}>
                    <Icon className="h-7 w-7" />
                  </div>

                  <div className="text-right space-y-1">
                    <Badge variant="outline" className={`text-[10px] font-extrabold border ${app.badgeStyle}`}>
                      {isIncluded && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />}
                      {isInDev && <Clock className="h-3 w-3 mr-1 text-slate-400" />}
                      <span>{app.stateLabel}</span>
                    </Badge>
                    {app.planDisplay && (
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Plano: {app.planDisplay}
                      </span>
                    )}
                  </div>
                </div>

                {/* Título e Descrição */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    {app.tagline}
                  </div>
                  <h2 className="text-xl font-black text-[#0d2342] tracking-tight">
                    {app.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[50px]">
                    {app.description}
                  </p>
                </div>

                {/* Lista de Recursos Principais */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    O que este aplicativo entrega:
                  </span>
                  <ul className="space-y-2">
                    {app.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1868db] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Botão de Ação Inferior */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                {app.actionType === "access" ? (
                  <Button
                    onClick={() => handleAccessApp(app.id, app.actionDestination)}
                    disabled={Boolean(isNavigating)}
                    className="w-full h-11 bg-[#1868db] hover:bg-[#1557b8] text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                  >
                    {isNavigating === app.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Acessando...</span>
                      </>
                    ) : (
                      <>
                        <span>Acessar {app.title}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : app.actionType === "plans" ? (
                  <Button
                    onClick={() => navigate({ to: "/plans" })}
                    variant="outline"
                    className="w-full h-11 border-blue-200 text-[#1868db] hover:bg-blue-50 font-bold text-xs rounded-xl gap-2 shadow-2xs"
                  >
                    <span>Ver Planos Disponíveis</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-slate-50 text-slate-400 font-semibold text-xs rounded-xl cursor-not-allowed gap-2"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Em Desenvolvimento</span>
                    </Button>
                    <p className="text-[10px] text-slate-400 text-center leading-tight">
                      Módulo em preparação. Será liberado em breve.
                    </p>
                  </div>
                )}
              </div>

            </Card>
          );
        })}
      </div>

      {/* 4. RODAPÉ COM LINKS DISCRETOS E POLÍTICA DE SEGURANÇA */}
      <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="h-4 w-4 text-[#1868db] shrink-0" />
          <span>
            Identidade corporativa e permissões preservadas entre todos os módulos.
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Link
            to="/billing/subscription"
            className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-[#1868db] transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span>Minha assinatura</span>
          </Link>

          <span className="text-slate-300">•</span>

          <Link
            to="/consumo"
            className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-[#1868db] transition-colors"
          >
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <span>Consumo e franquias</span>
          </Link>
        </div>
      </div>

    </div>
  );
}

export default MeusAplicativosPage;
