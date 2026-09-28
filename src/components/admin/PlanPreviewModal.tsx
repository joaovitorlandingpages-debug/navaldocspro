import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, Eye, Sparkles, Shield, Cpu, Users, HardDrive, 
  FileText, Anchor, Bell, Compass, ArrowRight, Info, AlertCircle,
  CreditCard, Lock, CheckCircle2
} from "lucide-react";
import { AdminPlanData, SupportedApp } from "@/services/billing/stripeSyncService";

interface PlanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Partial<AdminPlanData> | null;
}

export const PlanPreviewModal: React.FC<PlanPreviewModalProps> = ({
  isOpen,
  onClose,
  plan
}) => {
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("monthly");
  const [viewMode, setViewMode] = useState<"sales_page" | "checkout">("sales_page");

  if (!plan) return null;

  const apps: SupportedApp[] = plan.appsIncluded && plan.appsIncluded.length > 0
    ? plan.appsIncluded
    : ["navaldocs"];

  const priceMonthly = Number(plan.priceMonthly) || 0;
  const priceYearly = Number(plan.priceYearly) || 0;
  const annualSavingsPercent = priceMonthly > 0
    ? Math.round((1 - (priceYearly / (priceMonthly * 12))) * 100)
    : 0;

  const currentPrice = selectedCycle === "yearly" ? priceYearly : priceMonthly;

  const features = plan.features || [
    `${plan.userLimit || 1} ${(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}`,
    `${plan.processLimit || 20} processos/mês`,
    `${plan.aiPagesLimit || 200} leituras automáticas de anexos/mês`,
    `${plan.storageGb || 5}GB de armazenamento`
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-50/50 rounded-2xl p-4 sm:p-7">
        <DialogHeader className="border-b border-slate-200/80 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#1868db] uppercase tracking-wider">
                  Pré-visualização Fiel
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                  {plan.slug || "novo-plano"} • v{plan.version || 1}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-extrabold text-[#0d2342] mt-0.5">
                {plan.name || "Nome do Plano"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Visualização exata de como a oferta aparecerá na página comercial de planos e durante o checkout.
              </DialogDescription>
            </div>

            {/* Alternador de Modo de Visualização */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("sales_page")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "sales_page"
                    ? "bg-white text-[#0d2342] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Página de Vendas
              </button>
              <button
                type="button"
                onClick={() => setViewMode("checkout")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "checkout"
                    ? "bg-[#0d2342] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tela de Checkout
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* CONTROLES DO VISUALIZADOR */}
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCycle === "monthly"
                  ? "bg-[#1868db] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle("yearly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCycle === "yearly"
                  ? "bg-[#0d2342] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Faturamento Anual</span>
              {annualSavingsPercent > 0 && (
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  -{annualSavingsPercent}%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 1. MODO: PÁGINA DE VENDAS (CARD COMERCIAL) */}
        {viewMode === "sales_page" && (
          <div className="py-2">
            <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-[#1868db] shadow-xl p-6 sm:p-7 relative flex flex-col justify-between">
              {/* Highlight Badge */}
              {(plan.isPopular || plan.highlightBadge) && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#1868db] hover:bg-[#1868db] text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    {plan.highlightBadge || "Mais Escolhido"}
                  </Badge>
                </div>
              )}

              <div>
                {/* Apps Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {apps.includes("navaldocs") && (
                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md gap-1">
                      <Compass className="h-3 w-3" /> NavalDocs Pro
                    </Badge>
                  )}
                  {apps.includes("arrais") && (
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md gap-1">
                      <Anchor className="h-3 w-3" /> Arrais Pro
                    </Badge>
                  )}
                  {apps.includes("notificador") && (
                    <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md gap-1">
                      <Bell className="h-3 w-3" /> Notificador Naval
                    </Badge>
                  )}
                </div>

                <h3 className="text-2xl font-black text-[#0d2342] tracking-tight">
                  {plan.name || "Nome do Plano"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                  {plan.description || "Descrição comercial da oferta."}
                </p>

                {/* Preço */}
                <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-slate-400">R$</span>
                    <span className="text-3xl sm:text-4xl font-black text-[#0d2342] tracking-tight">
                      {currentPrice.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {selectedCycle === "yearly" ? "/ano (único)" : "/mês"}
                    </span>
                  </div>
                  {selectedCycle === "yearly" && priceMonthly > 0 && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Equivale a R${Math.round(priceYearly / 12)}/mês (~{annualSavingsPercent}% de desconto)
                    </p>
                  )}
                </div>

                {/* Franquias Principais */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Franquias e Capacidade
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {apps.includes("navaldocs") && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileText className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.processLimit || 0}</strong> processos navais/mês</span>
                      </div>
                    )}
                    {apps.includes("arrais") && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Anchor className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span><strong>{plan.arraisKitsLimit || 0}</strong> kits Arrais/mês</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Cpu className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                      <span><strong>{plan.aiPagesLimit || 0}</strong> leituras OCR/mês</span>
                    </div>
                    {apps.includes("notificador") && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span><strong>{plan.monitoredDocsLimit || 0}</strong> docs monitorados</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                      <span><strong>{plan.userLimit || 1}</strong> {(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <HardDrive className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                      <span><strong>{plan.storageGb || 5} GB</strong> armazenamento</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Benefícios */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Benefícios Inclusos
                  </span>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preços de Adicionais / Addons */}
                {((plan.addonProcessPrice || 0) > 0 || (plan.addonOcrPrice || 0) > 0 || (plan.addonArraisKitPrice || 0) > 0 || (plan.addonMonitoredDocPrice || 0) > 0) && (
                  <div className="mt-5 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-bold text-slate-700 block">Capacidade Adicional sob Demanda:</span>
                    <div className="grid grid-cols-2 gap-1 text-slate-600">
                      {(plan.addonProcessPrice || 0) > 0 && (
                        <span>• Processo extra: R$ {(plan.addonProcessPrice || 0).toFixed(2)}</span>
                      )}
                      {(plan.addonOcrPrice || 0) > 0 && (
                        <span>• Leitura extra: R$ {(plan.addonOcrPrice || 0).toFixed(2)}</span>
                      )}
                      {(plan.addonArraisKitPrice || 0) > 0 && (
                        <span>• Kit extra: R$ {(plan.addonArraisKitPrice || 0).toFixed(2)}</span>
                      )}
                      {(plan.addonMonitoredDocPrice || 0) > 0 && (
                        <span>• Doc extra: R$ {(plan.addonMonitoredDocPrice || 0).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Ação Simulado */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button className="w-full bg-[#1868db] hover:bg-[#1557b8] text-white font-bold h-11 rounded-xl shadow-md gap-2">
                  <span>Assinar {plan.name}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                  🔒 Pagamento seguro via Stripe • Cancele a qualquer momento
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. MODO: TELA DE CHECKOUT */}
        {viewMode === "checkout" && (
          <div className="py-2 max-w-xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d2342]">Resumo do Pedido</h3>
                    <p className="text-xs text-slate-500">Checkout Oficial NavalDocs Pro</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  Conexão Segura Stripe
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#0d2342]">{plan.name}</h4>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Cobrança {selectedCycle === "yearly" ? "Anual Recorrente" : "Mensal Recorrente"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#0d2342]">
                      R$ {currentPrice.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {selectedCycle === "yearly" ? "/ano" : "/mês"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Versão da oferta comercial:</span>
                    <strong className="text-slate-800">v{plan.version || 1}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Aplicativos contemplados:</span>
                    <strong className="text-slate-800">
                      {apps.map(a => a === "navaldocs" ? "NavalDocs Pro" : a === "arrais" ? "Arrais Pro" : "Notificador Naval").join(", ")}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Processos inclusos:</span>
                    <strong className="text-slate-800">{plan.processLimit || 0} novos processos/mês</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Leituras automáticas inclusas:</span>
                    <strong className="text-slate-800">{plan.aiPagesLimit || 0} leituras de anexos/mês</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Armazenamento em nuvem:</span>
                    <strong className="text-slate-800">{plan.storageGb || 5} GB</strong>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#0d2342]">Total a pagar hoje:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#1868db]">
                      R$ {currentPrice.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[11px] text-slate-400 block">Cobrança em Reais (BRL)</span>
                  </div>
                </div>
              </div>

              {/* Botão de Finalização Simulado */}
              <Button disabled className="w-full bg-[#1868db] text-white font-bold h-11 rounded-xl shadow-md gap-2 opacity-90 cursor-not-allowed">
                <Lock className="h-4 w-4" />
                <span>Ir para Pagamento Seguro com Cartão</span>
              </Button>

              <div className="flex items-center justify-center gap-4 text-slate-400 text-xs pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Criptografia 256-bit
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Stripe Certified Partner
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NOTA ESCLARECEDORA OBRIGATÓRIA (REQUISITO EXPLÍCITO) */}
        <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="h-4 w-4 text-[#1868db] shrink-0" />
            <span>Regra de Consumo e Leituras de Documentos Anexados</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-800/90">
            A <strong>geração e download</strong> dos documentos finais é automática e ilimitada nos planos NavalDocs e Arrais (não consome leituras). 
            “Documento lido” é a <strong>extração de dados de um anexo</strong>, como CNH ou comprovante de endereço. 
            Uma CNH frente e verso consome 1 leitura. Um anexo de até 2 páginas consome 1 leitura; de 3 a 4 páginas, 2 leituras. 
            Digitação manual e reutilização de dados confirmados não consomem leituras.
          </p>
        </div>

        <DialogFooter className="border-t border-slate-200/80 pt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600"
          >
            Fechar Pré-visualização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
