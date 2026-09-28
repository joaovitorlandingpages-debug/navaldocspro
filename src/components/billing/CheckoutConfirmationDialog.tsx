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
import { 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  Calendar, 
  Clock, 
  Lock, 
  ArrowRight,
  Zap,
  CheckCircle2,
  FileText,
  Anchor,
  Bell,
  Cpu,
  HardDrive,
  Users,
  AlertTriangle,
  Info
} from "lucide-react";
import { AdminPlanData } from "@/services/billing/stripeSyncService";

export interface CheckoutConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (couponCode?: string) => void;
  plan: AdminPlanData | null;
  billingCycle: "monthly" | "yearly";
  isSubmitting?: boolean;
}

export const CheckoutConfirmationDialog: React.FC<CheckoutConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  billingCycle,
  isSubmitting = false,
}) => {
  const [couponCode, setCouponCode] = useState("");

  if (!plan) return null;

  const isYearly = billingCycle === "yearly";
  const amountToCharge = isYearly ? plan.priceYearly : plan.priceMonthly;
  const annualSavings = plan.priceMonthly > 0 ? (plan.priceMonthly * 12) - plan.priceYearly : 0;

  const today = new Date();
  const nextBillingDate = new Date();
  if (isYearly) {
    nextBillingDate.setFullYear(today.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(today.getMonth() + 1);
  }

  const nextBillingFormatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(nextBillingDate);

  const apps = plan.appsIncluded || ["navaldocs"];
  const isSyncReady = plan.stripeSyncStatus === "synced" && (isYearly ? plan.stripePriceYearlyId : plan.stripePriceMonthlyId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db] shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-[#0d2342] tracking-tight">
                Resumo da Contratação
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Revise os detalhes, valores e franquias antes de seguir para o pagamento seguro na Stripe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo do Produto & Plano */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {apps.includes("navaldocs") && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                    NavalDocs Pro
                  </Badge>
                )}
                {apps.includes("arrais") && (
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
                    Arrais Pro
                  </Badge>
                )}
                {apps.includes("notificador") && (
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold">
                    Notificador Naval
                  </Badge>
                )}
                <Badge className="bg-[#0d2342] text-white text-[9px] font-bold uppercase tracking-wider">
                  {isYearly ? "Ciclo Anual" : "Ciclo Mensal"}
                </Badge>
              </div>

              <h3 className="text-base font-extrabold text-[#0d2342]">{plan.name}</h3>
              <p className="text-xs text-slate-500">{plan.description}</p>
            </div>

            <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
              <span className="text-xs text-slate-400 block font-medium">Valor a pagar agora:</span>
              <span className="text-2xl font-black text-[#1868db]">
                R$ {amountToCharge.toLocaleString("pt-BR")}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {isYearly ? "Pagamento único (12 meses)" : "Cobrança mensal"}
              </span>
            </div>
          </div>

          {/* Destaque das Datas & Próxima Cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0d2342] mb-1">
                <Calendar className="h-4 w-4 text-[#1868db]" />
                <span>Valor Cobrado Hoje</span>
              </div>
              <p className="text-base font-extrabold text-[#1868db]">
                R$ {amountToCharge.toLocaleString("pt-BR")}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly 
                  ? `Cobre 12 meses (Economia de R$ ${annualSavings.toLocaleString("pt-BR")})`
                  : "Renovação automática a cada 30 dias"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0d2342] mb-1">
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Próxima Renovação</span>
              </div>
              <p className="text-base font-extrabold text-[#0d2342]">
                {nextBillingFormatted}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly ? "Cobrança anual recorrente" : "Próxima fatura mensal"}
              </p>
            </div>
          </div>

          {/* FRANQUIAS QUE RENOVAM MENSALMENTE */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Franquias que Renovarão Mensalmente:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              {apps.includes("navaldocs") && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                  <span><strong>{plan.processLimit}</strong> processos navais/mês</span>
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
                <span><strong>{plan.aiPagesLimit}</strong> leituras OCR de anexos/mês</span>
              </div>
              {apps.includes("notificador") && (
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span><strong>{plan.monitoredDocsLimit || 0}</strong> docs monitorados</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                <span><strong>{plan.userLimit}</strong> {plan.userLimit > 1 ? 'usuários' : 'usuário'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                <span><strong>{plan.storageGb} GB</strong> armazenamento</span>
              </div>
            </div>
          </div>

          {/* DESTAQUE OBRIGATÓRIO: PLANO ANUAL (NÃO ACUMULATIVO) */}
          {isYearly && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Regra Importante do Plano Anual</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                O pagamento cobre 12 meses de acesso completo com desconto. Contudo, <strong>as franquias operacionais renovam a cada mês e não são acumulativas</strong> para os meses seguintes.
              </p>
            </div>
          )}

          {/* DESTAQUE OBRIGATÓRIO: GERAÇÃO ILIMITADA & OCR OPCIONAL */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>Geração Automática e Leitura de Anexos</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              A <strong>geração e download dos documentos finais é automática e ilimitada</strong> nos planos NavalDocs e Arrais. A leitura de CNH, comprovante ou outro anexo por IA é <strong>opcional</strong>; também é possível continuar digitando e reutilizando dados manualmente sem consumir leituras.
            </p>
          </div>

          {/* Cupom de Desconto */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#1868db]" /> Cupom Promocional (Opcional)
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="Código promocional..."
              className="w-full h-9 px-3 text-xs font-mono uppercase font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1868db]"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium order-2 sm:order-1">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Processamento Seguro Stripe Certified</span>
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
              onClick={() => onConfirm(couponCode.trim())}
              disabled={isSubmitting || !isSyncReady}
              className="w-1/2 sm:w-auto rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1557b8] text-white shadow-md gap-1.5"
            >
              {isSubmitting ? (
                "Abrindo Stripe..."
              ) : !isSyncReady ? (
                "Preço não sincronizado"
              ) : (
                <>
                  Ir para Pagamento Seguro <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
