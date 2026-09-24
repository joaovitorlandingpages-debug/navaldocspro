import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Gift, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { couponService, CouponItem } from "@/services/billing/couponService";

interface CampaignEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: CouponItem | null;
  onSaved?: () => void;
}

export const CampaignEditorDialog: React.FC<CampaignEditorDialogProps> = ({
  isOpen,
  onClose,
  campaignToEdit,
  onSaved
}) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [benefitType, setBenefitType] = useState<"trial_extension" | "percent" | "fixed">("trial_extension");
  const [trialDays, setTrialDays] = useState("60");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [discountFixed, setDiscountFixed] = useState("50");
  const [discountDuration, setDiscountDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationInMonths, setDurationInMonths] = useState("3");
  const [applicableBillingCycle, setApplicableBillingCycle] = useState<"all" | "monthly" | "annual">("all");
  const [maxRedemptions, setMaxRedemptions] = useState("100");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (campaignToEdit) {
      setCode(campaignToEdit.code || "");
      setName(campaignToEdit.name || "");
      setDescription(campaignToEdit.description || "");
      setBenefitType(campaignToEdit.type || "trial_extension");
      setTrialDays(String(campaignToEdit.trial_days || 60));
      setDiscountPercent(String(campaignToEdit.discount_percent || 10));
      setDiscountFixed(String(campaignToEdit.discount_fixed || 50));
      setDiscountDuration(campaignToEdit.discount_duration || "once");
      setDurationInMonths(String(campaignToEdit.duration_in_months || 3));
      
      const cycles = campaignToEdit.applicable_billing_cycles || [];
      if (cycles.includes("monthly") && !cycles.includes("annual")) {
        setApplicableBillingCycle("monthly");
      } else if (cycles.includes("annual") && !cycles.includes("monthly")) {
        setApplicableBillingCycle("annual");
      } else {
        setApplicableBillingCycle("all");
      }

      setMaxRedemptions(String(campaignToEdit.max_redemptions || 100));
      setValidUntil(campaignToEdit.valid_until ? campaignToEdit.valid_until.split("T")[0] : "");
      setIsActive(campaignToEdit.is_active !== false);
    } else {
      setCode("");
      setName("");
      setDescription("");
      setBenefitType("trial_extension");
      setTrialDays("60");
      setDiscountPercent("10");
      setDiscountFixed("50");
      setDiscountDuration("once");
      setDurationInMonths("3");
      setApplicableBillingCycle("all");
      setMaxRedemptions("100");
      setValidUntil("");
      setIsActive(true);
    }
  }, [campaignToEdit, isOpen]);

  const handleSave = async () => {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    const cleanName = name.trim();

    if (!cleanCode) {
      toast.error("Informe o código do cupom.");
      return;
    }
    if (!cleanName) {
      toast.error("Informe o nome da campanha.");
      return;
    }

    if (benefitType === "percent") {
      const p = Number(discountPercent);
      if (isNaN(p) || p <= 0 || p > 100) {
        toast.error("O percentual de desconto deve ser entre 0.01% e 100%.");
        return;
      }
    }

    if (benefitType === "fixed") {
      const f = Number(discountFixed);
      if (isNaN(f) || f <= 0) {
        toast.error("O valor de desconto fixo deve ser maior que R$ 0,00.");
        return;
      }
    }

    const maxR = parseInt(maxRedemptions, 10);
    if (isNaN(maxR) || maxR <= 0) {
      toast.error("O limite de resgates deve ser um número inteiro positivo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cycles = applicableBillingCycle === "all" ? [] : [applicableBillingCycle];

      if (campaignToEdit?.id) {
        await couponService.updateCoupon(campaignToEdit.id, {
          code: cleanCode,
          name: cleanName,
          description: description.trim() || null,
          type: benefitType,
          trial_days: benefitType === "trial_extension" ? parseInt(trialDays, 10) || 60 : null,
          discount_percent: benefitType === "percent" ? Number(discountPercent) : null,
          discount_fixed: benefitType === "fixed" ? Number(discountFixed) : null,
          discount_duration: discountDuration,
          duration_in_months: discountDuration === "repeating" ? parseInt(durationInMonths, 10) || 3 : null,
          applicable_billing_cycles: cycles,
          max_redemptions: maxR,
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          is_active: isActive
        });
        toast.success(`Campanha "${cleanName}" (${cleanCode}) atualizada com sucesso!`);
      } else {
        await couponService.createCoupon({
          code: cleanCode,
          name: cleanName,
          description: description.trim() || null,
          type: benefitType,
          trial_days: benefitType === "trial_extension" ? parseInt(trialDays, 10) || 60 : null,
          discount_percent: benefitType === "percent" ? Number(discountPercent) : null,
          discount_fixed: benefitType === "fixed" ? Number(discountFixed) : null,
          discount_duration: discountDuration,
          duration_in_months: discountDuration === "repeating" ? parseInt(durationInMonths, 10) || 3 : null,
          applicable_billing_cycles: cycles,
          max_redemptions: maxR,
          valid_from: new Date().toISOString(),
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          is_active: isActive
        });
        toast.success(`Campanha "${cleanName}" (${cleanCode}) criada com sucesso!`);
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar campanha no banco de dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#0d2342]">
                {campaignToEdit ? "Editar Promoção ou Cupom" : "Criar Promoção ou Cupom"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Configure cupons de desconto e campanhas de teste gratuito para atrair escritórios.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome da Campanha</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Parceria FENAVAL"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Código do Cupom</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="Ex: PARCEIRO2026"
                className="h-9 text-sm uppercase font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Descrição Opcional</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Concede 60 dias de teste para novos credenciados"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Benefício</Label>
              <Select value={benefitType} onValueChange={(v: any) => setBenefitType(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial_extension">Extensão de Teste Gratuito</SelectItem>
                  <SelectItem value="percent">Desconto Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Desconto Fixo (R$ BRL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ciclo Elegível</Label>
              <Select value={applicableBillingCycle} onValueChange={(v: any) => setApplicableBillingCycle(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os ciclos (Mensal e Anual)</SelectItem>
                  <SelectItem value="monthly">Apenas Ciclo Mensal</SelectItem>
                  <SelectItem value="annual">Apenas Ciclo Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {benefitType === "trial_extension" && (
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
              <Label className="text-xs font-bold text-[#0d2342]">Duração Total do Teste</Label>
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="45">45 dias totais</SelectItem>
                  <SelectItem value="60">60 dias totais (Padrão de Campanha)</SelectItem>
                  <SelectItem value="90">90 dias totais</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Aviso: A extensão totaliza os dias a partir da criação do escritório sem exigir cartão de crédito e preserva qualquer prazo superior já concedido.
              </p>
            </div>
          )}

          {benefitType === "percent" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Percentual de Desconto (%)</Label>
                <Input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Duração do Desconto</Label>
                <Select value={discountDuration} onValueChange={(v: any) => setDiscountDuration(v)}>
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Apenas na 1ª fatura (Once)</SelectItem>
                    <SelectItem value="repeating">Por múltiplos meses (Repeating)</SelectItem>
                    <SelectItem value="forever">Para sempre (Forever)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountDuration === "repeating" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Quantidade de Meses</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={durationInMonths}
                    onChange={(e) => setDurationInMonths(e.target.value)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {benefitType === "fixed" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Desconto em Reais (R$)</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={discountFixed}
                  onChange={(e) => setDiscountFixed(e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Duração do Desconto</Label>
                <Select value={discountDuration} onValueChange={(v: any) => setDiscountDuration(v)}>
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Apenas na 1ª fatura (Once)</SelectItem>
                    <SelectItem value="repeating">Por múltiplos meses (Repeating)</SelectItem>
                    <SelectItem value="forever">Para sempre (Forever)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountDuration === "repeating" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Quantidade de Meses</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={durationInMonths}
                    onChange={(e) => setDurationInMonths(e.target.value)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Limite Máximo de Resgates</Label>
              <Input
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Validade Até (Opcional)</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-700">Status da Campanha</p>
              <p className="text-[11px] text-slate-500">
                {isActive ? "Campanha ativa para validação e resgates." : "Campanha desativada (bloqueada para resgates)."}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="text-xs font-semibold">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> {campaignToEdit ? "Salvar Alterações" : "Salvar Campanha"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
