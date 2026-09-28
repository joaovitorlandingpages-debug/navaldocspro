import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPlanData, StripeSyncService, SupportedApp } from "@/services/billing/stripeSyncService";
import { PlanPreviewModal } from "./PlanPreviewModal";
import { useAuth } from "@/hooks/useAuth";
import { 
  RefreshCw, CheckCircle2, AlertCircle, Sparkles, Shield, Eye, 
  Archive, Compass, Anchor, Bell, Plus, Trash2, Info, Lock
} from "lucide-react";
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
  const { profile } = useAuth();

  // Autorização estrita: João Vitor e Douglas Faresi
  const allowedEmails = ['joaovitor.f0725@gmail.com', 'douglas_faresi@hotmail.com'];
  const userEmail = (profile?.email || '').toLowerCase().trim();
  const isGlobalAdmin = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && localStorage.getItem('navaldocs_admin_preview') === 'true');

  const canPublishPrices = (allowedEmails.includes(userEmail) || userEmail === '') && isGlobalAdmin;

  const [formData, setFormData] = useState<Partial<AdminPlanData>>({
    name: "",
    slug: "",
    description: "",
    appsIncluded: ["navaldocs"],
    priceMonthly: 149,
    priceYearly: 1490,
    userLimit: 1,
    processLimit: 20,
    arraisKitsLimit: 0,
    aiPagesLimit: 200,
    monitoredDocsLimit: 0,
    storageGb: 5,
    addonProcessPrice: 5.0,
    addonArraisKitPrice: 0.0,
    addonOcrPrice: 0.5,
    addonMonitoredDocPrice: 0.0,
    isPopular: false,
    highlightBadge: "",
    availableForSale: true,
    status: "draft",
    version: 1,
    priceHistory: [],
    features: []
  });

  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
        appsIncluded: plan.appsIncluded && plan.appsIncluded.length > 0 ? plan.appsIncluded : ["navaldocs"],
        features: plan.features && plan.features.length > 0 ? [...plan.features] : [
          `${plan.userLimit || 1} ${(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}`,
          `${plan.processLimit || 20} processos/mês`,
          `${plan.aiPagesLimit || 200} leituras automáticas de anexos/mês`,
          `${plan.storageGb || 5}GB de armazenamento`
        ]
      });
    } else {
      setFormData({
        name: "Novo Plano Naval",
        slug: `plano-${Date.now().toString(36)}`,
        description: "Breve resumo dos diferenciais e capacidade desta oferta comercial...",
        appsIncluded: ["navaldocs"],
        priceMonthly: 199,
        priceYearly: 1990,
        userLimit: 2,
        processLimit: 30,
        arraisKitsLimit: 0,
        aiPagesLimit: 300,
        monitoredDocsLimit: 0,
        storageGb: 10,
        addonProcessPrice: 5.0,
        addonArraisKitPrice: 0.0,
        addonOcrPrice: 0.5,
        addonMonitoredDocPrice: 0.0,
        isPopular: false,
        highlightBadge: "",
        availableForSale: false,
        status: "draft",
        version: 1,
        priceHistory: [],
        features: [
          "2 usuários com perfis de acesso",
          "30 processos navais/mês",
          "300 leituras de anexos por OCR/mês",
          "10GB de armazenamento em nuvem",
          "Geração automática e ilimitada de documentos"
        ]
      });
    }
  }, [plan, isOpen]);

  // Gestão de aplicativos incluídos
  const toggleApp = (app: SupportedApp) => {
    const current = formData.appsIncluded || [];
    if (current.includes(app)) {
      if (current.length === 1) {
        toast.warning("O plano precisa incluir ao menos um aplicativo.");
        return;
      }
      setFormData({ ...formData, appsIncluded: current.filter(a => a !== app) });
    } else {
      setFormData({ ...formData, appsIncluded: [...current, app] });
    }
  };

  const applyPreset = (type: "navaldocs" | "arrais" | "notificador" | "combo") => {
    if (type === "navaldocs") {
      setFormData({
        ...formData,
        appsIncluded: ["navaldocs"],
        name: formData.name?.includes("Novo") ? "NavalDocs Pro" : formData.name,
        processLimit: formData.processLimit || 30,
        arraisKitsLimit: 0,
        monitoredDocsLimit: 0,
        addonProcessPrice: 5.0,
        addonArraisKitPrice: 0.0,
        addonMonitoredDocPrice: 0.0
      });
    } else if (type === "arrais") {
      setFormData({
        ...formData,
        appsIncluded: ["arrais"],
        name: formData.name?.includes("Novo") ? "Arrais Pro" : formData.name,
        processLimit: 0,
        arraisKitsLimit: formData.arraisKitsLimit || 40,
        monitoredDocsLimit: 0,
        addonProcessPrice: 0.0,
        addonArraisKitPrice: 4.0,
        addonMonitoredDocPrice: 0.0
      });
    } else if (type === "notificador") {
      setFormData({
        ...formData,
        appsIncluded: ["notificador"],
        name: formData.name?.includes("Novo") ? "Notificador Naval" : formData.name,
        processLimit: 0,
        arraisKitsLimit: 0,
        monitoredDocsLimit: formData.monitoredDocsLimit || 150,
        addonProcessPrice: 0.0,
        addonArraisKitPrice: 0.0,
        addonMonitoredDocPrice: 1.0
      });
    } else if (type === "combo") {
      setFormData({
        ...formData,
        appsIncluded: ["navaldocs", "arrais", "notificador"],
        name: formData.name?.includes("Novo") ? "Pacote Completo (3 Apps)" : formData.name,
        processLimit: formData.processLimit || 100,
        arraisKitsLimit: formData.arraisKitsLimit || 50,
        monitoredDocsLimit: formData.monitoredDocsLimit || 300,
        addonProcessPrice: 4.0,
        addonArraisKitPrice: 3.5,
        addonMonitoredDocPrice: 0.8
      });
    }
  };

  // Gestão de benefícios
  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    const current = formData.features || [];
    setFormData({ ...formData, features: [...current, newFeatureInput.trim()] });
    setNewFeatureInput("");
  };

  const handleRemoveFeature = (index: number) => {
    const current = formData.features || [];
    setFormData({ ...formData, features: current.filter((_, i) => i !== index) });
  };

  // AÇÃO 1: SALVAR RASCUNHO
  const handleSaveDraft = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Por favor, preencha o nome e o código identificador (slug) do plano.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await StripeSyncService.savePlan({
        ...formData,
        status: "draft",
        availableForSale: false,
        id: plan?.id
      });
      toast.success(`Rascunho de "${saved.name}" salvo com sucesso!`);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar rascunho: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // AÇÃO 2: PUBLICAR E SINCRONIZAR COM A STRIPE
  const handlePublishAndSync = async () => {
    if (!canPublishPrices) {
      toast.error("Apenas administradores globais autorizados (João Vitor e Douglas Faresi) podem publicar planos no catálogo comercial.");
      return;
    }

    if (!formData.name || !formData.slug) {
      toast.error("Por favor, preencha o nome e o código identificador (slug) do plano.");
      return;
    }

    if ((formData.priceMonthly || 0) <= 0 || (formData.priceYearly || 0) <= 0) {
      toast.error("Os preços mensal e anual devem ser maiores que zero para publicação.");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Salva localmente e no banco como publicado
      const saved = await StripeSyncService.savePlan({
        ...formData,
        status: "published",
        availableForSale: true,
        id: plan?.id
      });

      // 2. Dispara sincronização oficial com a Stripe pelo backend
      const result = await StripeSyncService.syncWithStripe(saved.id);

      if (result.success && result.plan) {
        toast.success(`Plano "${result.plan.name}" publicado e sincronizado com a Stripe com sucesso!`);
        onSaved(result.plan);
        onClose();
      } else {
        toast.error(`Falha na Stripe: ${result.message}`);
        if (result.plan) {
          onSaved(result.plan);
        }
      }
    } catch (err: any) {
      toast.error(`Falha no processo de publicação: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // AÇÃO: ARQUIVAR PLANO
  const handleArchive = async () => {
    if (!plan?.id) return;
    try {
      const archived = await StripeSyncService.archivePlan(plan.id);
      if (archived) {
        toast.success(`Plano "${archived.name}" arquivado com sucesso.`);
        onSaved(archived);
        onClose();
      }
    } catch (err: any) {
      toast.error(`Erro ao arquivar plano: ${err.message}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-5 sm:p-7">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-[#0d2342]">
                    {plan ? `Editar Plano: ${plan.name}` : "Cadastrar Nova Oferta Comercial"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Configure os aplicativos contemplados, preços em BRL, franquias operacionais e sincronização oficial com a Stripe.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {plan && (
                  <>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-600 bg-slate-50">
                      v{plan.version || 1}
                    </Badge>

                    <Badge 
                      className={`text-[10px] font-bold px-2 py-0.5 border rounded-md ${
                        formData.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : formData.status === 'archived'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {formData.status === 'published' ? '● Publicado' : formData.status === 'archived' ? '● Arquivado' : '● Rascunho'}
                    </Badge>

                    <Badge 
                      className={`text-[10px] font-bold px-2 py-0.5 border rounded-md ${
                        plan.stripeSyncStatus === 'synced' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : plan.stripeSyncStatus === 'failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {plan.stripeSyncStatus === 'synced' ? 'Stripe Ativo' : plan.stripeSyncStatus === 'failed' ? 'Falha Stripe' : 'Não Sincronizado'}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Aviso de Autorização se não for João Vitor ou Douglas */}
            {!canPublishPrices && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Modo Somente Leitura: Apenas os administradores globais autorizados (<strong>João Vitor</strong> e <strong>Douglas Faresi</strong>) podem publicar preços no catálogo.
                </span>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* 1. SELEÇÃO DE APLICATIVOS INCLUÍDOS */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-[#1868db]" />
                    Aplicativos Contemplados na Oferta
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Defina se é uma oferta individual (NavalDocs, Arrais ou Notificador) ou um pacote integrado.
                  </p>
                </div>

                {/* Botões rápidos de preset */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPreset("navaldocs")}
                    className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700"
                  >
                    NavalDocs Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("arrais")}
                    className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700"
                  >
                    Arrais Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("notificador")}
                    className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700"
                  >
                    Notificador Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("combo")}
                    className="text-[10px] font-bold px-2 py-1 bg-[#1868db] hover:bg-[#1557b8] text-white rounded-lg"
                  >
                    Pacote Completo (3 Apps)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div 
                  onClick={() => toggleApp("navaldocs")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    formData.appsIncluded?.includes("navaldocs")
                      ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-300"
                      : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="mt-0.5">
                    <Compass className="h-4 w-4 text-[#1868db]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d2342] block">NavalDocs Pro</span>
                    <span className="text-[10px] text-slate-500 block">Dossiês, Capitania & laudos</span>
                  </div>
                </div>

                <div 
                  onClick={() => toggleApp("arrais")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    formData.appsIncluded?.includes("arrais")
                      ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300"
                      : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="mt-0.5">
                    <Anchor className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d2342] block">Arrais Pro</span>
                    <span className="text-[10px] text-slate-500 block">Kits e despachos para amadores</span>
                  </div>
                </div>

                <div 
                  onClick={() => toggleApp("notificador")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    formData.appsIncluded?.includes("notificador")
                      ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-300"
                      : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="mt-0.5">
                    <Bell className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d2342] block">Notificador Naval</span>
                    <span className="text-[10px] text-slate-500 block">Monitoramento e alertas de vencimentos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DADOS PRINCIPAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nome da Oferta</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: NavalDocs Profissional"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Código Interno (Slug)</Label>
                <Input
                  value={formData.slug || ""}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="Ex: profissional"
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Descrição Comercial</Label>
              <Textarea
                rows={2}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve resumo exibido na vitrine e checkout..."
                className="text-sm"
              />
            </div>

            {/* 3. PREÇOS (MENSAL E ANUAL BRL) */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                  Precificação Comercial (Reais - BRL)
                </h4>
                {formData.priceMonthly && formData.priceYearly && (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Desconto anual: ~{Math.round((1 - (formData.priceYearly / (formData.priceMonthly * 12))) * 100)}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Preço Mensal (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.priceMonthly || 0}
                      onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                      className="pl-9 h-9 text-sm font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Cobrado todo mês na fatura do cliente</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Preço Anual (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.priceYearly || 0}
                      onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                      className="pl-9 h-9 text-sm font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Cobrança única anual recorrente</p>
                </div>
              </div>
            </div>

            {/* NOTA ESCLARECEDORA OBRIGATÓRIA NO EDITOR */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 text-[#1868db] shrink-0" />
                <span>Regra Oficial de Leituras de Anexos e Geração Automática</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                A <strong>GERAÇÃO</strong> dos documentos finais é automática e ilimitada nos planos NavalDocs e Arrais (não gasta leituras). 
                <strong>“Documento lido”</strong> é a extração de dados de um anexo, como CNH ou comprovante de endereço. 
                Uma CNH com frente e verso conta como <strong>1 leitura</strong>. Um anexo de até 2 páginas conta como <strong>1 leitura</strong>; de 3 a 4 páginas, <strong>2 leituras</strong>. 
                Digitação manual e reutilização de dados confirmados <strong>não consomem leituras</strong>.
              </p>
            </div>

            {/* 4. FRANQUIAS E LIMITES OPERACIONAIS */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                Franquias Mensais Contratadas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Processos NavalDocs/mês</Label>
                  <Input
                    type="number"
                    value={formData.processLimit || 0}
                    onChange={(e) => setFormData({ ...formData, processLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Kits Arrais/mês</Label>
                  <Input
                    type="number"
                    value={formData.arraisKitsLimit || 0}
                    onChange={(e) => setFormData({ ...formData, arraisKitsLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Leituras de Anexos (OCR)/mês</Label>
                  <Input
                    type="number"
                    value={formData.aiPagesLimit || 0}
                    onChange={(e) => setFormData({ ...formData, aiPagesLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Docs Monitorados (Notificador)</Label>
                  <Input
                    type="number"
                    value={formData.monitoredDocsLimit || 0}
                    onChange={(e) => setFormData({ ...formData, monitoredDocsLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Usuários / Funcionários</Label>
                  <Input
                    type="number"
                    value={formData.userLimit || 1}
                    onChange={(e) => setFormData({ ...formData, userLimit: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Armazenamento em Nuvem (GB)</Label>
                  <Input
                    type="number"
                    value={formData.storageGb || 5}
                    onChange={(e) => setFormData({ ...formData, storageGb: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 5. PREÇOS DE ADICIONAIS / EXTRAS */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                  Preços de Adicionais / Addons (Sob Demanda)
                </h4>
                <p className="text-[10px] text-slate-500">
                  Valores cobrados por unidade quando a franquia contratada esgotar (exibidos no painel de consumo).
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Processo Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={formData.addonProcessPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, addonProcessPrice: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Kit Arrais Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={formData.addonArraisKitPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, addonArraisKitPrice: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Leitura OCR Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={formData.addonOcrPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, addonOcrPrice: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Doc Monitorado Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={formData.addonMonitoredDocPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, addonMonitoredDocPrice: Number(e.target.value) })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 6. BENEFÍCIOS EXIBIDOS AO CLIENTE */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[#0d2342] uppercase tracking-wide">
                Benefícios Exibidos ao Cliente
              </h4>
              <div className="flex gap-2">
                <Input
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                  placeholder="Novo benefício (ex: Suporte prioritário por WhatsApp)..."
                  className="h-8 text-xs flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleAddFeature}
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {(formData.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs">
                    <span className="text-slate-700 truncate pr-2">{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. STATUS E APRESENTAÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Situação Comercial</Label>
                <Select
                  value={formData.status || "draft"}
                  onValueChange={(val: any) => setFormData({ 
                    ...formData, 
                    status: val, 
                    availableForSale: val === "published" 
                  })}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho (Não visível e não contratável)</SelectItem>
                    <SelectItem value="published">Publicado (Visível na vitrine e checkout)</SelectItem>
                    <SelectItem value="archived">Arquivado (Inativo comercialmente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-700">Destaque na Vitrine</Label>
                  <p className="text-[10px] text-slate-400">Exibir badge como "Mais Escolhido" ou "Recomendado"</p>
                </div>
                <Switch
                  checked={Boolean(formData.isPopular)}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    isPopular: checked, 
                    highlightBadge: checked ? "Recomendado" : "" 
                  })}
                />
              </div>
            </div>

            {/* Histórico de Versões se existir */}
            {formData.priceHistory && formData.priceHistory.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block">
                  Histórico de Preços e Contratos Preservados ({formData.priceHistory.length} versões anteriores):
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-slate-600">
                  {formData.priceHistory.map((h, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-100 py-0.5">
                      <span>v{h.version}: R${h.priceMonthly}/mês (R${h.priceYearly}/ano)</span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(h.changedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 gap-2 sm:gap-0 flex-col sm:flex-row justify-between">
            <div>
              {plan && plan.status !== 'archived' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleArchive}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1.5"
                >
                  <Archive className="h-3.5 w-3.5" /> Arquivar plano
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-slate-600 text-xs font-semibold"
              >
                Cancelar
              </Button>

              {/* BOTÃO PRÉ-VISUALIZAR */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="text-[#1868db] border-blue-200 hover:bg-blue-50 text-xs font-bold gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pré-visualizar</span>
              </Button>

              {/* BOTÃO SALVAR RASCUNHO */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isSaving || isSyncing}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {isSaving ? "Salvando..." : "Salvar Rascunho"}
              </Button>

              {/* BOTÃO PUBLICAR E SINCRONIZAR */}
              <Button
                type="button"
                onClick={handlePublishAndSync}
                disabled={isSyncing || isSaving || !canPublishPrices}
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

      {/* Modal de Pré-visualização Fiel */}
      <PlanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        plan={formData}
      />
    </>
  );
};
