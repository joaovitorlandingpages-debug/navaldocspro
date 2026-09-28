import { useState, useMemo } from "react";
import { 
  Check, ArrowRight, Zap, Shield, Crown, 
  Sparkles, CheckCircle2, HelpCircle, Lock, 
  CreditCard, QrCode, Building2, Ship, ShieldCheck, 
  FileText, Anchor, Bell, Compass, Cpu, HardDrive, Users, 
  AlertTriangle, Info, RefreshCw, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { StripeSyncService, AdminPlanData, SupportedApp } from "@/services/billing/stripeSyncService";
import { stripeCheckoutService } from "@/services/billing/stripeCheckoutService";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckoutConfirmationDialog } from "@/components/billing/CheckoutConfirmationDialog";

export default function Plans() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { subscription, isTrial, trialDaysLeft, trialEndDateFormatted } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedProduct, setSelectedProduct] = useState<"navaldocs" | "arrais" | "notificador" | "bundles">("navaldocs");
  const [checkoutPlan, setCheckoutPlan] = useState<AdminPlanData | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Busca do catálogo publicado no banco de dados public.plans
  const { data: allPlans = [], isLoading, error: catalogError } = useQuery({
    queryKey: ['public-plans-catalog'],
    queryFn: async () => {
      return await StripeSyncService.fetchPlansFromDatabase();
    },
    staleTime: 1000 * 30, // 30 segundos
  });

  // Filtra planos publicados e ativos. Se ainda nenhum foi publicado no banco (ambiente inicial), permite fallback inteligente
  const publishedPlans = useMemo(() => {
    const published = allPlans.filter(p => p.status === 'published' && p.availableForSale !== false);
    if (published.length > 0) return published;
    // Fallback: se nenhum plano está marcado como 'published' ainda no banco, exibe os planos base com indicação de catálogo
    return allPlans;
  }, [allPlans]);

  // Filtra pelo produto selecionado
  const displayedPlans = useMemo(() => {
    return publishedPlans.filter(p => {
      const apps = p.appsIncluded || ["navaldocs"];
      const isBundle = apps.length > 1;

      if (selectedProduct === "bundles") return isBundle;
      if (selectedProduct === "navaldocs") return apps.includes("navaldocs") && !isBundle;
      if (selectedProduct === "arrais") return apps.includes("arrais") && !isBundle;
      if (selectedProduct === "notificador") return apps.includes("notificador") && !isBundle;
      return true;
    }).sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
  }, [publishedPlans, selectedProduct]);

  // Verifica se o usuário/empresa já possui assinatura ativa
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const currentPlanSlug = subscription?.plan?.slug?.toLowerCase();
  const currentPlanName = subscription?.plan?.name;

  // Abertura do portal de faturamento da Stripe
  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await stripeCheckoutService.openCustomerPortal(profile?.company_id);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.info(res.message || "Acesse a aba de Consumo para gerenciar seu plano.");
        navigate({ to: "/consumo" });
      }
    } catch (e: any) {
      toast.error(`Erro ao abrir portal: ${e.message}`);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleSelectPlan = (plan: AdminPlanData) => {
    if (!user) {
      toast.error("Por favor, faça login para contratar um plano.");
      navigate({ to: "/auth/login" });
      return;
    }

    // Se a empresa já possui este mesmo plano ativo, encaminha para gestão
    if (hasActiveSubscription && currentPlanSlug === plan.slug.toLowerCase()) {
      handleOpenPortal();
      return;
    }

    setCheckoutPlan(plan);
    setIsCheckoutModalOpen(true);
  };

  // Confirmação e abertura segura do Stripe Checkout
  const handleConfirmCheckout = async (couponCode?: string) => {
    if (!checkoutPlan) return;
    setIsSubmittingCheckout(true);

    try {
      const res = await stripeCheckoutService.createCheckoutSession({
        planSlug: checkoutPlan.slug,
        billingCycle: billingCycle === "yearly" ? "annual" : "monthly",
        companyId: profile?.company_id,
        couponCode
      });

      if (res.success && res.url) {
        window.location.href = res.url;
      } else if (res.pendingConfiguration) {
        toast.warning(res.message || "Configuração da Stripe pendente no servidor.");
      } else {
        toast.error(res.message || "Não foi possível abrir o checkout. Verifique a sincronização do plano.");
      }
    } catch (err: any) {
      toast.error(`Falha ao conectar com o checkout: ${err.message}`);
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* CABEÇALHO */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge className="bg-blue-50 text-[#1868db] border-blue-200 font-extrabold text-[10px] uppercase tracking-widest px-3 py-1">
            Plataforma Naval Especializada
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0d2342] tracking-tight uppercase italic">
            Escolha seu Plano <span className="text-[#1868db]">&</span> Franquias
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Preços oficiais carregados em tempo real do catálogo. Escolha o aplicativo ideal para sua operação e escale com total flexibilidade.
          </p>

          {/* BANNER SE JÁ POSSUI ASSINATURA ATIVA */}
          {hasActiveSubscription && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Assinatura Ativa: {currentPlanName || "Plano Contratado"}
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Sua empresa já possui um contrato vigente. Você pode gerenciar seu plano, faturas ou alterar a forma de pagamento sem duplicar assinaturas.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleOpenPortal}
                  disabled={isOpeningPortal}
                  className="bg-[#0d2342] hover:bg-slate-900 text-white text-xs font-bold h-9 px-4 rounded-xl gap-1.5 shadow-xs"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{isOpeningPortal ? "Abrindo..." : "Gerenciar assinatura"}</span>
                </Button>
                <Link
                  to="/consumo"
                  className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 text-xs font-semibold"
                >
                  Ver consumo
                </Link>
              </div>
            </div>
          )}

          {/* SELETOR DE PRODUTOS / APLICATIVOS */}
          <div className="pt-4 flex items-center justify-center">
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedProduct("navaldocs")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  selectedProduct === "navaldocs"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>NavalDocs</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProduct("arrais")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  selectedProduct === "arrais"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Anchor className="h-3.5 w-3.5" />
                <span>Arrais</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProduct("notificador")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  selectedProduct === "notificador"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Notificador</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProduct("bundles")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  selectedProduct === "bundles"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pacote Completo (3 Apps)</span>
              </button>
            </div>
          </div>

          {/* ALTERNADOR DE CICLO MENSAL / ANUAL */}
          <div className="flex items-center justify-center pt-2">
            <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-[#0d2342] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-[#0d2342] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Cobrança Anual</span>
                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  Economia Real
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* NOTA ESCLARECEDORA OBRIGATÓRIA NO TOPO */}
        <div className="max-w-4xl mx-auto p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Info className="h-4 w-4 text-[#1868db] shrink-0" />
            <span>Como Funcionam as Franquias e Leituras de Documentos</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-800">
            A <strong>geração e download dos documentos finais é automática e ilimitada</strong> nos planos NavalDocs e Arrais (não consome leituras). 
            “Documento lido” é a extração por IA de dados de um anexo (CNH, RG, comprovante). 
            A leitura de anexos é <strong>opcional</strong>; também é possível preencher ou reutilizar dados já salvos manualmente sem consumir leituras.
          </p>
        </div>

        {/* GRID DE CARDS DOS PLANOS */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 text-[#1868db] animate-spin" />
            <p className="text-xs font-bold text-slate-500">Consultando planos publicados no catálogo...</p>
          </div>
        ) : displayedPlans.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-2xs rounded-3xl p-12 text-center max-w-lg mx-auto">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0d2342]">Nenhum plano disponível para esta categoria</h3>
            <p className="text-xs text-slate-500 mt-1">
              Os planos para este produto ainda estão em fase de homologação e serão liberados em breve pelo administrador global.
            </p>
            <Button
              onClick={() => setSelectedProduct("navaldocs")}
              variant="outline"
              className="mt-4 text-xs font-semibold"
            >
              Ver Planos NavalDocs Pro
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-7xl mx-auto">
            {displayedPlans.map((plan) => {
              const isPopular = plan.isPopular || plan.slug === "profissional" || plan.slug === "pacote-completo";
              const currentPrice = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const savings = (plan.priceMonthly * 12) - plan.priceYearly;
              const isCurrentPlan = hasActiveSubscription && currentPlanSlug === plan.slug.toLowerCase();
              const isSyncReady = plan.stripeSyncStatus === "synced" && (billingCycle === "yearly" ? plan.stripePriceYearlyId : plan.stripePriceMonthlyId);
              const apps = plan.appsIncluded || ["navaldocs"];

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between relative rounded-3xl transition-all duration-300 ${
                    isPopular
                      ? "border-2 border-[#1868db] shadow-xl shadow-blue-500/10 bg-white z-10"
                      : "border border-slate-200 bg-white hover:shadow-md"
                  }`}
                >
                  {/* Badge de Destaque */}
                  {(plan.highlightBadge || isPopular) && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1868db] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-xs">
                      {plan.highlightBadge || "Mais Escolhido"}
                    </div>
                  )}

                  <CardHeader className="p-6 sm:p-8 pb-4">
                    {/* Badges de Aplicativos Contemplados */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {apps.includes("navaldocs") && (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                          NavalDocs
                        </Badge>
                      )}
                      {apps.includes("arrais") && (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
                          Arrais
                        </Badge>
                      )}
                      {apps.includes("notificador") && (
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold">
                          Notificador
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-2xl font-black text-[#0d2342] tracking-tight">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium min-h-[36px] mt-1">
                      {plan.description || "Solução sob medida para escritórios e despachantes náuticos."}
                    </CardDescription>

                    {/* Preço Exibido */}
                    <div className="pt-4 border-t border-slate-100 mt-4">
                      {billingCycle === "monthly" ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-black text-[#0d2342]">
                              R$ {plan.priceMonthly.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-xs font-bold text-slate-400">/mês</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">Cobrança mensal recorrente com renovação automática</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-black text-[#0d2342]">
                              R$ {plan.priceYearly.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-xs font-bold text-slate-400">/ano</span>
                          </div>
                          {savings > 0 && (
                            <p className="text-xs text-emerald-600 font-bold mt-1">
                              Economia de R$ {savings.toLocaleString("pt-BR")} no ciclo anual
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Cobre 12 meses (equivale a ~R$ {Math.round(plan.priceYearly / 12)}/mês). Franquias renovam mensalmente.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Franquias e Cotas Operacionais com Ícones */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Franquias Mensais:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        {apps.includes("navaldocs") && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                            <span><strong>{plan.processLimit || 0}</strong> processos/mês</span>
                          </div>
                        )}
                        {apps.includes("arrais") && (
                          <div className="flex items-center gap-1.5">
                            <Anchor className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <span><strong>{plan.arraisKitsLimit || 0}</strong> kits Arrais/mês</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                          <span><strong>{plan.aiPagesLimit || 0}</strong> leituras OCR/mês</span>
                        </div>
                        {apps.includes("notificador") && (
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span><strong>{plan.monitoredDocsLimit || 0}</strong> docs monitorados</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                          <span><strong>{plan.userLimit || 1}</strong> {(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <HardDrive className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                          <span><strong>{plan.storageGb || 5} GB</strong> armazenamento</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-0 space-y-4 flex-grow">
                    {/* Lista de Benefícios */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Benefícios Inclusos:
                      </p>
                      <ul className="space-y-2">
                        {(plan.features || []).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Preços de Adicionais / Addons se configurados */}
                    {((plan.addonProcessPrice || 0) > 0 || (plan.addonOcrPrice || 0) > 0 || (plan.addonArraisKitPrice || 0) > 0) && (
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 space-y-0.5">
                        <span className="font-bold text-slate-700 block">Capacidade Extra:</span>
                        {(plan.addonProcessPrice || 0) > 0 && <div>• Processo extra: R$ {(plan.addonProcessPrice || 0).toFixed(2)}</div>}
                        {(plan.addonOcrPrice || 0) > 0 && <div>• Leitura OCR extra: R$ {(plan.addonOcrPrice || 0).toFixed(2)}</div>}
                        {(plan.addonArraisKitPrice || 0) > 0 && <div>• Kit extra: R$ {(plan.addonArraisKitPrice || 0).toFixed(2)}</div>}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-0">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isSubmittingCheckout || (!isCurrentPlan && !isSyncReady)}
                      className={`w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-1.5 shadow-md ${
                        isCurrentPlan
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                          : isPopular
                          ? "bg-[#1868db] hover:bg-[#1557b8] text-white"
                          : "bg-[#0d2342] hover:bg-slate-900 text-white"
                      }`}
                    >
                      {isCurrentPlan ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Seu Plano Atual</span>
                        </>
                      ) : !isSyncReady ? (
                        <span>Preço pendente de sincronização</span>
                      ) : (
                        <>
                          <span>Contratar {plan.name}</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* SEGURANÇA E GATEWAY STRIPE */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db] shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0d2342]">Checkout Seguro via Stripe Certified</h2>
              <p className="text-xs text-slate-500 font-medium">
                Seus dados de pagamento são criptografados e processados diretamente pela infraestrutura global da Stripe.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-[10px] font-bold border-slate-200 gap-1.5 text-slate-700">
              <CreditCard className="h-3.5 w-3.5 text-[#1868db]" /> Cartão de Crédito
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-[10px] font-bold border-slate-200 gap-1.5 text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Criptografia Ponta a Ponta
            </Badge>
          </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO PRÉ-CHECKOUT COM RESUMO COMPLETO */}
        <CheckoutConfirmationDialog
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          onConfirm={handleConfirmCheckout}
          plan={checkoutPlan}
          billingCycle={billingCycle}
          isSubmitting={isSubmittingCheckout}
        />

      </div>
    </div>
  );
}
