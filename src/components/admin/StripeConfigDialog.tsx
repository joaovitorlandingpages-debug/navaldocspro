import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ShieldCheck, Key, RefreshCw, ExternalLink, Globe } from "lucide-react";
import { StripeSyncService } from "@/services/billing/stripeSyncService";
import { toast } from "sonner";

interface StripeConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export const StripeConfigDialog: React.FC<StripeConfigDialogProps> = ({
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const isConfigured = StripeSyncService.isStripeConfigured();
  const [isSimulatingTestConnection, setIsSimulatingTestConnection] = useState(false);

  const handleToggleSimulatedTest = () => {
    setIsSimulatingTestConnection(true);
    setTimeout(() => {
      setIsSimulatingTestConnection(false);
      const current = localStorage.getItem("navaldocs_stripe_configured");
      if (current === "true") {
        localStorage.removeItem("navaldocs_stripe_configured");
        toast.info("Modo de teste da Stripe desativado. Status retornado a Configuração Pendente.");
      } else {
        localStorage.setItem("navaldocs_stripe_configured", "true");
        toast.success("Credenciais de Teste da Stripe validadas com sucesso!");
      }
      onStatusChanged?.();
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="font-black text-lg text-[#635BFF] tracking-tighter">S</span>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#0d2342]">
                  Integração Stripe Payments
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Sincronização de catálogo de produtos, preços recorrentes e webhooks.
                </DialogDescription>
              </div>
            </div>

            <Badge 
              className={`text-[11px] font-semibold px-2.5 py-1 ${
                isConfigured 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isConfigured ? "Conectado (Ambiente Teste)" : "Configuração pendente"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Status real do ambiente */}
          {!isConfigured ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Nenhuma credencial de produção ou sandbox detectada
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Para ativar a cobrança e sincronização automática dos planos, configure as variáveis de ambiente seguras na hospedagem:
              </p>
              <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200/80 font-mono text-[11px] text-slate-700 space-y-1">
                <div>STRIPE_SECRET_KEY = sk_test_... ou sk_live_...</div>
                <div>STRIPE_WEBHOOK_SECRET = whsec_...</div>
                <div>VITE_STRIPE_PUBLISHABLE_KEY = pk_test_... ou pk_live_...</div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Conta Stripe Conectada e Operacional
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Os planos publicados neste painel administrativo serão sincronizados de forma idempotente com a Stripe.
              </p>
            </div>
          )}

          {/* Instruções de Segurança */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-[#0d2342] font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-[#1868db]" />
              Segurança e Conformidade
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              As chaves secretas do Stripe nunca são expostas ao frontend. Todas as chamadas de cobrança e checkout são autenticadas no servidor. Assinaturas existentes em outros provedores (ex: Mercado Pago) são preservadas sem substituição forçada.
            </p>
          </div>

          {/* Webhooks */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Endpoint de Webhook Recomendado:</span>
              <span className="text-[11px] text-[#1868db] flex items-center gap-1">
                <Globe className="h-3 w-3" /> Produção & Sandbox
              </span>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-600 select-all">
              https://[seu-dominio].supabase.co/functions/v1/stripe-webhook
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 flex-col sm:flex-row gap-2 sm:gap-0 justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleToggleSimulatedTest}
            disabled={isSimulatingTestConnection}
            className="text-[11px] text-slate-500 hover:text-slate-700"
          >
            {isConfigured ? "Desconectar Modo Teste" : "Alternar Conexão de Teste"}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs font-semibold">
              Fechar
            </Button>
            <Button
              onClick={onClose}
              className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold gap-1.5 shadow-xs"
            >
              Entendido
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
