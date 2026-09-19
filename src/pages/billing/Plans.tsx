import { useState, useMemo } from "react";
import { 
  Check, ArrowRight, Zap, Shield, Crown, 
  Sparkles, CheckCircle2, HelpCircle, Lock, 
  CreditCard, QrCode, Building2, Ship, ShieldCheck, FileText, Wrench 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getPublishedCatalogPlans, NavalPlan, TRIAL_CONFIG } from "@/services/billing/plansConfig";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";

export default function Plans() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { user } = useAuth();
  const { isLifetimeAdmin, isHomologation, createPreference } = useSubscription();

  const plans = useMemo(() => getPublishedCatalogPlans(), []);

  const handleSubscribe = async (plan: NavalPlan) => {
    if (isLifetimeAdmin || isHomologation) {
      toast.info("Você possui Acesso Irrestrito (Modo Administrador / Homologação). Todas as funções e cotas já estão liberadas!");
      return;
    }

    if (!user) {
      toast.error("Faça login para assinar ou iniciar o teste gratuito.");
      return;
    }

    createPreference.mutate({
      planSlug: plan.slug,
      billingCycle: billingCycle === "yearly" ? "annual" : "monthly"
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase tracking-widest px-3 py-1">
            Plataforma Naval Especializada
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black text-navy tracking-tight uppercase italic">
            Planos Navais <span className="text-primary">&</span> Assinaturas
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-medium">
            Automatize requerimentos, memoriais da Capitania, controle de laudos, vistorias com ART e assinaturas digitais com a ferramenta líder do setor náutico.
          </p>

          {/* 30-day trial badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-full text-xs font-bold shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Todos os novos escritórios contam com <strong>{TRIAL_CONFIG.durationDays} dias de teste gratuito</strong> sem necessidade de cartão</span>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center pt-4">
            <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-navy shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-[#0d2342] text-white shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Anual
                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  Economia Real
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid Responsivo: 1 col mobile, 3 cols desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.isPopular;
            const savings = (plan.priceMonthly * 12) - plan.priceYearly;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between relative rounded-3xl transition-all duration-300 ${
                  isPopular
                    ? "border-2 border-[#1868db] shadow-xl shadow-blue-500/10 bg-white lg:scale-105 z-10"
                    : "border border-slate-200 bg-white hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1868db] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-xs">
                    {plan.badge}
                  </div>
                )}

                <CardHeader className="p-8 pb-4">
                  {plan.categoryTag && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1868db] border border-blue-100 text-[10px] font-bold uppercase tracking-wider mb-2 self-start">
                      <Sparkles className="h-3 w-3" />
                      {plan.categoryTag}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="p-3 rounded-2xl bg-blue-50 text-[#1868db]">
                      <FileText className="h-6 w-6" />
                    </div>
                    {isPopular && (
                      <Badge className="bg-blue-50 text-[#1868db] border-blue-100 text-[9px] font-bold uppercase tracking-wider">
                        Recomendado
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-2xl font-black text-[#0d2342] uppercase tracking-tight">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium min-h-[36px] mt-1">
                    {plan.description}
                  </CardDescription>

                  {/* Preço Exibido */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    {billingCycle === "monthly" ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-[#0d2342]">
                            R$ {plan.priceMonthly}
                          </span>
                          <span className="text-sm font-bold text-slate-400">/mês</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Cobrança mensal com renovação automática</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-[#0d2342]">
                            R$ {plan.priceYearly.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-sm font-bold text-slate-400">/ano</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-1">
                          Economia de R$ {savings.toLocaleString("pt-BR")} no ciclo anual
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cobrado em parcela única anual (equivale a ~R$ {Math.round(plan.priceYearly / 12)}/mês)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Limites Operacionais em Destaque */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-center bg-slate-50 p-2.5 rounded-xl text-[10px]">
                    <div>
                      <p className="font-bold text-[#0d2342]">{plan.processLimit ? `${plan.processLimit} OS/Laudos` : "Ilimitadas"}</p>
                      <span className="text-slate-400">Simultâneas</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#0d2342]">{plan.userLimit ? `${plan.userLimit} Users` : "Ilimitados"}</p>
                      <span className="text-slate-400">Equipe</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#0d2342]">{plan.storageGb ? `${plan.storageGb}GB` : "Ilimitado"}</p>
                      <span className="text-slate-400">Fotos/PDFs</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-6 flex-grow">
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Recursos Inclusos:
                    </p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-0">
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={createPreference.isPending}
                    className={`w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      isPopular
                        ? "bg-primary hover:bg-blue-700 text-white shadow-lg shadow-primary/25"
                        : "bg-navy hover:bg-navy/90 text-white"
                    }`}
                  >
                    {createPreference.isPending ? "Processando..." : (
                      isLifetimeAdmin ? "Acesso Vitalício Ativo" : isHomologation ? "Homologação Ativa" : "Começar 14 Dias Grátis"
                    )}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Security & Mercado Pago Badges */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy">Pagamento Seguro via Mercado Pago</h2>
              <p className="text-xs text-slate-500 font-medium">
                Aceitamos Pix com aprovação imediata, Cartão de Crédito em até 12x e Boleto Bancário.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-[10px] font-bold border-slate-200 gap-1.5 text-slate-700">
              <QrCode className="h-3.5 w-3.5 text-emerald-600" /> Pix Instantâneo
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-[10px] font-bold border-slate-200 gap-1.5 text-slate-700">
              <CreditCard className="h-3.5 w-3.5 text-blue-600" /> Cartão de Crédito
            </Badge>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-navy uppercase italic">Perguntas Frequentes</h2>
            <p className="text-xs text-slate-500 font-medium">Tire suas dúvidas sobre faturamento e período de teste.</p>
          </div>

          <div className="space-y-4">
            <Card className="p-6 rounded-2xl border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-navy mb-1">Como funciona o período de 14 dias grátis?</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Ao criar sua conta, você tem 14 dias de acesso irrestrito para testar todas as funcionalidades do NavalDocs Pro (geração de requerimentos, checklists NORMAM, emissão de laudos técnicos, OCR de documentos e assinaturas digitais). Nenhum valor é cobrado antecipadamente.
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-navy mb-1">O plano Engenharia & Perícia permite emitir laudos com ART?</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Sim! O plano inclui o módulo especializado de laudos técnicos, checklists da Marinha do Brasil, galeria de fotos de vistoria em alta resolução e campo para vinculação e anexo de ART/CREA.
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-navy mb-1">Posso trocar de plano ou cancelar a qualquer momento?</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Sim! Você pode fazer upgrade ou cancelamento direto pelo seu painel financeiro sem multas ou taxas de fidelidade.
              </p>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
