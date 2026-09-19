import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface CampaignEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignEditorDialog: React.FC<CampaignEditorDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [code, setCode] = useState("BEMVINDO2026");
  const [name, setName] = useState("Campanha de Boas-vindas");
  const [benefitType, setBenefitType] = useState<"trial_extension" | "percent" | "fixed">("trial_extension");
  const [trialDays, setTrialDays] = useState("60");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [discountFixed, setDiscountFixed] = useState("50");
  const [maxRedemptions, setMaxRedemptions] = useState("100");

  const handleSave = () => {
    toast.success(`Campanha "${name}" (${code.toUpperCase()}) salva com sucesso!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#0d2342]">
                Criar Promoção ou Cupom
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Crie cupons de desconto e campanhas de teste gratuito para atrair escritórios.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Nome da Campanha</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Parceria FENAVAL 2026"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Código do Cupom</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="Ex: NAVAL60"
              className="h-9 text-sm uppercase font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Tipo de Benefício</Label>
            <Select value={benefitType} onValueChange={(v: any) => setBenefitType(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial_extension">Extensão de Teste Gratuito (30 ou 60 dias totais)</SelectItem>
                <SelectItem value="percent">Desconto Percentual (%)</SelectItem>
                <SelectItem value="fixed">Desconto Fixo (R$ BRL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {benefitType === "trial_extension" && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
              <Label className="text-xs font-bold text-[#0d2342]">Duração Total do Teste</Label>
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="45">45 dias totais</SelectItem>
                  <SelectItem value="60">60 dias totais (Recomendado)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Aviso: o código de 60 dias concede 60 dias totais de experiência a novos escritórios elegíveis, não cumulativo sobre outros testes.
              </p>
            </div>
          )}

          {benefitType === "percent" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {benefitType === "fixed" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Desconto em Reais (R$)</Label>
              <Input
                type="number"
                value={discountFixed}
                onChange={(e) => setDiscountFixed(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Limite Máximo de Resgates</Label>
              <Input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Restrição</Label>
              <div className="h-9 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
                Apenas novos escritórios
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} className="text-xs font-semibold">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
