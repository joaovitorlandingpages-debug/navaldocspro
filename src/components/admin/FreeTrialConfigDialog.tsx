import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FlaskConical, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FreeTrialConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FreeTrialConfigDialog: React.FC<FreeTrialConfigDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [defaultDays, setDefaultDays] = useState(30);
  const [campaignMaxDays, setCampaignMaxDays] = useState(60);
  const [userLimit, setUserLimit] = useState(1);
  const [processLimit, setProcessLimit] = useState(10);
  const [aiPagesLimit, setAiPagesLimit] = useState(100);
  const [storageGb, setStorageGb] = useState(1);
  const [retentionDays, setRetentionDays] = useState(30);
  const [requireCreditCard, setRequireCreditCard] = useState(false);

  const handleSave = () => {
    toast.success("Políticas de teste gratuito atualizadas com sucesso!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#0d2342]">
                Configuração do Teste Gratuito
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Defina os prazos, franquias de consumo e regras pós-término para novos escritórios.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Prazos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Prazo Padrão (Sem Cartão)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={defaultDays}
                  onChange={(e) => setDefaultDays(Number(e.target.value))}
                  className="h-9 text-sm pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">dias</span>
              </div>
              <p className="text-[10px] text-slate-400">Padrão da plataforma: 30 dias</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Prazo Máximo por Campanha</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={campaignMaxDays}
                  onChange={(e) => setCampaignMaxDays(Number(e.target.value))}
                  className="h-9 text-sm pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">dias</span>
              </div>
              <p className="text-[10px] text-slate-400">Concedido via código: até 60 dias</p>
            </div>
          </div>

          {/* Franquia fixa de teste */}
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
              Franquia Inclusa Durante Todo o Período de Teste
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Usuários</Label>
                <Input
                  type="number"
                  value={userLimit}
                  onChange={(e) => setUserLimit(Number(e.target.value))}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Processos</Label>
                <Input
                  type="number"
                  value={processLimit}
                  onChange={(e) => setProcessLimit(Number(e.target.value))}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Páginas IA</Label>
                <Input
                  type="number"
                  value={aiPagesLimit}
                  onChange={(e) => setAiPagesLimit(Number(e.target.value))}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Storage (GB)</Label>
                <Input
                  type="number"
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Regras Pós-término */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#1868db]" />
              <h4 className="text-xs font-bold text-[#0d2342]">Regra de Pós-Término e Retenção</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ao encerrar o período de teste, novas gerações e análises são bloqueadas. O escritório mantém acesso de consulta e download dos seus documentos já gerados por <strong>{retentionDays} dias</strong>. Nenhum dado é apagado sem aviso prévio.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-slate-700">Exigir cartão de crédito no início?</p>
              <p className="text-[11px] text-slate-400">Atualmente desativado para maximizar a conversão de novos escritórios.</p>
            </div>
            <Switch
              checked={requireCreditCard}
              onCheckedChange={setRequireCreditCard}
            />
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
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
