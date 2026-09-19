import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminPlanData, StripeSyncService } from "@/services/billing/stripeSyncService";
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

interface PlanEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: AdminPlanData | null;
  onSaved: (plan: AdminPlanData) => void;
}

export const PlanEditorDialog: React.FC<PlanEditorDialogProps> = ({
  isOpen,
  onClose,
  plan,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<AdminPlanData>>({
    name: "",
    slug: "",
    description: "",
    priceMonthly: 149,
    priceYearly: 1490,
    userLimit: 1,
    processLimit: 20,
    aiPagesLimit: 200,
    storageGb: 5,
    isPopular: false,
    highlightBadge: "",
    availableForSale: true
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({ ...plan });
    } else {
      setFormData({
        name: "Novo Plano",
        slug: `plano-${Date.now().toString(36)}`,
        description: "Descrição comercial do plano...",
        priceMonthly: 199,
        priceYearly: 1990,
        userLimit: 2,
        processLimit: 30,
        aiPagesLimit: 300,
        storageGb: 10,
        isPopular: false,
        highlightBadge: "",
        availableForSale: true
      });
    }
  }, [plan, isOpen]);

  const handleSaveDraft = () => {
    if (!formData.name || !formData.slug) {
      toast.error("Por favor, preencha o nome e identificador do plano.");
      return;
    }
    const saved = StripeSyncService.saveDraft({
      ...formData,
      id: plan?.id
    });
    toast.success(`Plano "${saved.name}" salvo como rascunho com sucesso!`);
    onSaved(saved);
    onClose();
  };

  const handlePublishAndSync = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Por favor, preencha o nome e identificador do plano.");
      return;
    }
    const draft = StripeSyncService.saveDraft({
      ...formData,
      id: plan?.id
    });

    setIsSyncing(true);
    const result = await StripeSyncService.syncWithStripe(draft.id);
    setIsSyncing(false);

    if (result.success && result.plan) {
      toast.success(result.message);
      onSaved(result.plan);
      onClose();
    } else {
      toast.error(result.message);
      if (result.plan) {
        onSaved(result.plan);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#0d2342]">
                  {plan ? `Editar Plano: ${plan.name}` : "Cadastrar Novo Plano"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Configure preços, limites de uso e sincronização com a Stripe.
                </DialogDescription>
              </div>
            </div>
            {plan && (
              <Badge 
                className={`text-[11px] font-semibold px-2.5 py-1 ${
                  plan.status === 'synced' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : plan.status === 'failed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {plan.status === 'synced' ? 'Sincronizado' : plan.status === 'failed' ? 'Falha no Stripe' : 'Rascunho local'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Coluna 1 & 2: Formulário */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nome do Plano</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Profissional"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Código Interno (Slug)</Label>
                <Input
                  value={formData.slug || ""}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="Ex: profissional"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Descrição Comercial</Label>
              <Textarea
                rows={2}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve resumo dos benefícios para o escritório..."
                className="text-sm"
              />
            </div>

            {/* Preços */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                Valores e Cobrança (BRL)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Preço Mensal (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <Input
                      type="number"
                      value={formData.priceMonthly || 0}
                      onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                      className="pl-9 h-9 text-sm font-semibold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Preço Anual (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <Input
                      type="number"
                      value={formData.priceYearly || 0}
                      onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                      className="pl-9 h-9 text-sm font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Cobrança única anual</p>
                </div>
              </div>
            </div>

            {/* Limites Operacionais */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                Franquias e Limites Mensais
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Usuários</Label>
                  <Input
                    type="number"
                    value={formData.userLimit || 1}
                    onChange={(e) => setFormData({ ...formData, userLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Processos/mês</Label>
                  <Input
                    type="number"
                    value={formData.processLimit || 20}
                    onChange={(e) => setFormData({ ...formData, processLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Páginas IA/mês</Label>
                  <Input
                    type="number"
                    value={formData.aiPagesLimit || 200}
                    onChange={(e) => setFormData({ ...formData, aiPagesLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Armazenamento (GB)</Label>
                  <Input
                    type="number"
                    value={formData.storageGb || 5}
                    onChange={(e) => setFormData({ ...formData, storageGb: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Opções Comerciais */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isPopular || false}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    isPopular: checked,
                    highlightBadge: checked ? "Recomendado" : ""
                  })}
                />
                <Label className="text-xs text-slate-700 cursor-pointer">Destaque "Recomendado"</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.availableForSale ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, availableForSale: checked })}
                />
                <Label className="text-xs text-slate-700 cursor-pointer">Disponível para novas vendas</Label>
              </div>
            </div>
          </div>

          {/* Coluna 3: Prévia em Tempo Real */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Eye className="h-3.5 w-3.5 text-[#1868db]" /> Prévia do Cartão
            </div>
            
            <div className={`p-5 rounded-2xl bg-white border ${formData.isPopular ? 'border-[#1868db] ring-2 ring-[#1868db]/10 shadow-md' : 'border-slate-200 shadow-xs'} relative flex flex-col justify-between min-h-[260px]`}>
              {formData.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#1868db] hover:bg-[#1868db] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    Recomendado
                  </Badge>
                </div>
              )}

              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-[#0d2342]">{formData.name || "Nome do Plano"}</h3>
                  <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[10px] font-semibold border-none">
                    Rascunho
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#0d2342]">R$ {formData.priceMonthly || 0}</span>
                    <span className="text-xs text-slate-500 font-medium">/mês</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    R$ {(formData.priceYearly || 0).toLocaleString("pt-BR")} /ano
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400">•</span> {formData.userLimit || 1} {formData.userLimit === 1 ? 'usuário' : 'usuários'}
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400">•</span> {formData.processLimit || 20} processos/mês
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400">•</span> {formData.aiPagesLimit || 200} páginas IA/mês
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400">•</span> {formData.storageGb || 5} GB total
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-[#1868db] flex items-center justify-center gap-1">
                  ✏️ Editar plano
                </span>
              </div>
            </div>

            {plan?.syncError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Aviso de Sincronização
                </div>
                <p>{plan.syncError}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-slate-600 text-xs font-semibold"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Salvar Rascunho
            </Button>

            <Button
              type="button"
              onClick={handlePublishAndSync}
              disabled={isSyncing}
              className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold gap-1.5 shadow-xs"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Publicar e Sincronizar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
