import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Sparkles, 
  Calendar, 
  Clock, 
  Lock, 
  ArrowRight,
  Zap,
  CheckCircle2
} from "lucide-react";
import { NavalPlan, calculateAnnualSavings } from "@/services/billing/plansConfig";

export interface CheckoutConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (provider: "stripe" | "mercadopago", couponCode?: string) => void;
  plan: NavalPlan | null;
  billingCycle: "monthly" | "yearly";
  isTrial: boolean;
  trialDaysLeft: number;
  trialEndDateFormatted: string;
  isSubmitting?: boolean;
}

export const CheckoutConfirmationDialog: React.FC<CheckoutConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  billingCycle,
  isTrial,
  trialDaysLeft,
  trialEndDateFormatted,
  isSubmitting = false,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "mercadopago">("stripe");
  const [couponCode, setCouponCode] = useState("");

  if (!plan) return null;

  const isYearly = billingCycle === "yearly";
  const amountToCharge = isYearly ? plan.priceYearly : plan.priceMonthly;
  const annualSavings = calculateAnnualSavings(plan);

  const todayFormatted = new Intl.DateTimeFormat("pt-BR").format(new Date());
  const hasValidTrialLeft = isTrial && trialDaysLeft > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db] shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#0d2342] uppercase tracking-tight">
                Revisão da Contratação
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5 font-medium">
                Confira os valores, datas de faturamento e benefícios antes de prosseguir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Resumo do Plano Selecionado */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-navy uppercase">{plan.name}</span>
                <Badge className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider">
                  {isYearly ? "Ciclo Anual" : "Ciclo Mensal"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {plan.userLimit ? `${plan.userLimit} usuário(s)` : "Usuários ilimitados"} •{" "}
                {plan.processLimit ? `${plan.processLimit} processos/mês` : "Processos ilimitados"} •{" "}
                {plan.ocrLimit ? `${plan.ocrLimit} páginas IA/mês` : "OCR Ilimitado"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-[#0d2342]">
                R$ {amountToCharge.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs font-semibold text-slate-400 block">
                {isYearly ? "/ano" : "/mês"}
              </span>
            </div>
          </div>

          {/* Destaque Obrigatório: Data da 1ª Cobrança e Valor Cobrado Hoje */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0d2342] mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Data da 1ª Cobrança</span>
              </div>
              <p className="text-sm font-black text-primary">
                {hasValidTrialLeft 
                  ? `${trialEndDateFormatted || "Ao término do teste"} (em ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'})`
                  : `Hoje (${todayFormatted})`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hasValidTrialLeft 
                  ? `Cobrança de R$ ${amountToCharge.toLocaleString("pt-BR")} apenas ao término do teste gratuito`
                  : "Cobrado no ato da confirmação do pagamento"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0d2342] mb-1">
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Valor Cobrado Hoje</span>
              </div>
              <p className="text-sm font-black text-navy">
                {hasValidTrialLeft ? "R$ 0,00 (Gratuito)" : `R$ ${amountToCharge.toLocaleString("pt-BR")}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hasValidTrialLeft 
                  ? "Apenas validação do cartão sem débito imediato" 
                  : (isYearly ? `Economia de R$ ${annualSavings.toLocaleString("pt-BR")} no ciclo anual` : "Renovação automática mensal")}
              </p>
            </div>
          </div>

          {/* Comportamento e Aproveitamento dos Dias Restantes de Teste */}
          {isTrial && trialDaysLeft > 0 ? (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Aproveitamento do Teste Gratuito & Upgrade Imediato
                </h4>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                Você possui <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"} de teste</strong>{" "}
                {trialEndDateFormatted ? `(até ${trialEndDateFormatted})` : ""}. Ao contratar agora:
              </p>
              <ul className="text-xs text-emerald-800 space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Upgrade Imediato de Cotas</strong>: Suas cotas de teste (10 processos, 100 páginas de IA) são imediatamente substituídas pelos limites oficiais do plano ({plan.processLimit || "ilimitados"} processos e {plan.userLimit || "ilimitados"} usuários).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Operação Contínua</strong>: Seu escritório garante continuidade sem risco de pausas ou bloqueios operacionais pós-teste.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Vigência Completa</strong>: A vigência do seu plano contratado ({isYearly ? "1 ano completo" : "1 mês"}) passa a valer a partir da confirmação do pagamento.
                  </span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Ativação imediata de todas as funcionalidades e emissão ilimitada de requerimentos navais após a confirmação.
              </span>
            </div>
          )}

          {/* Campo de Cupom ou Campanha Promocional */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Possui Cupom ou Código Promocional?
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="Ex: PARCEIRO2026"
                className="flex-1 h-9 px-3 text-xs font-mono uppercase font-bold border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {couponCode.trim().length > 0 && (
                <Badge className="bg-blue-50 text-primary border-blue-200 text-[10px] font-bold">
                  Código Inserido
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Códigos de desconto e campanhas serão validados no servidor seguro antes da conclusão.
            </p>
          </div>

          {/* Seleção do Gateway / Provedor de Pagamento */}
          <div className="space-y-2.5 pt-1">
            <Label className="text-xs font-bold text-navy uppercase tracking-wider">
              Escolha a Forma de Pagamento
            </Label>
            <RadioGroup
              value={selectedProvider}
              onValueChange={(val: any) => setSelectedProvider(val)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedProvider === "stripe"
                    ? "border-primary bg-blue-50/40 shadow-xs"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="stripe" id="provider-stripe" className="mt-1" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-navy">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    <span>Cartão de Crédito</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Processamento seguro internacional via Stripe.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedProvider === "mercadopago"
                    ? "border-primary bg-blue-50/40 shadow-xs"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="mercadopago" id="provider-mp" className="mt-1" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-navy">
                    <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Pix, Cartão ou Boleto</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Aprovação instantânea via Mercado Pago em até 12x.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row gap-2.5 sm:justify-between items-center">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium order-2 sm:order-1">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Ambiente 100% Criptografado & Seguro</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/2 sm:w-auto rounded-xl text-xs font-bold"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(selectedProvider, couponCode.trim())}
              disabled={isSubmitting}
              className="w-1/2 sm:w-auto rounded-xl text-xs font-black uppercase tracking-wider bg-navy hover:bg-navy/90 text-white shadow-md gap-1.5"
            >
              {isSubmitting ? (
                "Conectando..."
              ) : (
                <>
                  Confirmar Contratação <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
