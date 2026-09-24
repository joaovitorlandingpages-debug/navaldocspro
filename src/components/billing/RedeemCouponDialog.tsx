import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { couponService } from "@/services/billing/couponService";

interface RedeemCouponDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  onRedeemed?: () => void;
}

export const RedeemCouponDialog: React.FC<RedeemCouponDialogProps> = ({
  isOpen,
  onClose,
  companyId,
  onRedeemed
}) => {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRedeem = async () => {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) {
      toast.error("Informe o código promocional.");
      return;
    }
    if (!companyId) {
      toast.error("Identificação do escritório não encontrada. Verifique seu login.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await couponService.redeemTrialExtension(cleanCode, companyId);
      if (res.success) {
        toast.success(res.message);
        onRedeemed?.();
        onClose();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao resgatar campanha promocional.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#0d2342]">
                Resgatar Campanha Promocional
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Insira seu código de parceria naval para ativar benefícios especiais.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Código Promocional</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="Ex: CÓDIGO DA PARCERIA"
              className="h-10 text-sm uppercase font-mono font-bold"
              disabled={isSubmitting}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Códigos de extensão de teste gratuito concedem até 60 dias totais de experiência a novos escritórios sem exigir cartão de crédito.
          </p>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="text-xs font-semibold">
            Cancelar
          </Button>
          <Button
            onClick={handleRedeem}
            disabled={isSubmitting}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Ativar Benefício
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
