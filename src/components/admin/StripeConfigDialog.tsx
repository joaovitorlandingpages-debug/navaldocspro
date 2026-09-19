import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, CheckCircle2, ShieldCheck, Key, RefreshCw, 
  ExternalLink, Globe, Copy, Check, Info, Server, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StripeConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

interface VerificationResult {
  status: "connected" | "pending_configuration" | "function_not_deployed" | "error" | "offline";
  environment: "test" | "production" | "pending";
  connected: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  isFunctionDeployed: boolean;
  webhookUrl: string;
  requiredEvents: string[];
  message: string;
  livemode?: boolean;
  checkedAt?: string;
}

export const StripeConfigDialog: React.FC<StripeConfigDialogProps> = ({
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Determinar URL do webhook padrão com base no ambiente do Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sua-instancia.supabase.co";
  const defaultWebhookUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stripe-webhook`;

  const requiredEvents = [
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.deleted",
    "customer.subscription.updated"
  ];

  // Executar verificação real via backend
  const verifyBackendConnection = async () => {
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      const response = await supabase.functions.invoke("stripe-verify", {
        headers
      });

      if (response.error) {
        const httpStatus = (response.error as any)?.context?.status;
        const errMsg = response.error.message || "";
        const isNotFoundOrUnpublished = 
          httpStatus === 404 || 
          errMsg.toLowerCase().includes("not found") || 
          errMsg.toLowerCase().includes("non-2xx") ||
          errMsg.toLowerCase().includes("failed to send a request");

        if (isNotFoundOrUnpublished) {
          // A Edge Function ainda não foi publicada no Supabase ou endpoint 404
          setResult({
            status: "function_not_deployed",
            environment: "pending",
            connected: false,
            hasSecretKey: false,
            hasWebhookSecret: false,
            isFunctionDeployed: false,
            webhookUrl: defaultWebhookUrl,
            requiredEvents,
            message: "A Edge Function 'stripe-verify' ainda não está publicada no projeto Supabase (vqutxzdsajinhsvuddcp - HTTP 404 / Não encontrada). Para verificar credenciais no servidor, publique as Edge Functions ('npx supabase functions deploy stripe-verify') e cadastre os segredos no painel do Supabase.",
            checkedAt: new Date().toISOString()
          });
          toast.warning("Edge Function 'stripe-verify' ainda não publicada no Supabase (HTTP 404).");
        } else {
          setResult({
            status: "error",
            environment: "pending",
            connected: false,
            hasSecretKey: false,
            hasWebhookSecret: false,
            isFunctionDeployed: true,
            webhookUrl: defaultWebhookUrl,
            requiredEvents,
            message: `Falha ao contactar a Edge Function: ${errMsg}`,
            checkedAt: new Date().toISOString()
          });
          toast.error("Erro ao contactar a Edge Function: " + errMsg);
        }
      } else if (response.data) {
        // Resposta REAL do backend executado no servidor
        const d = response.data;
        setResult({
          status: d.status || (d.connected ? "connected" : "pending_configuration"),
          environment: d.environment || "pending",
          connected: !!d.connected,
          hasSecretKey: !!d.hasSecretKey,
          hasWebhookSecret: !!d.hasWebhookSecret,
          isFunctionDeployed: true,
          webhookUrl: d.webhookUrl || defaultWebhookUrl,
          requiredEvents: d.requiredEvents || requiredEvents,
          message: d.message || (d.connected ? "Conexão validada com sucesso com a Stripe." : "Configuração pendente no backend."),
          livemode: d.livemode,
          checkedAt: d.checkedAt || new Date().toISOString()
        });

        if (d.connected) {
          toast.success("Conexão com a Stripe verificada com sucesso!");
        } else {
          toast.info("Diagnóstico Stripe: " + (d.message || "Configuração pendente."));
        }
      }
      onStatusChanged?.();
    } catch (err: any) {
      console.warn("Falha na chamada da Edge Function:", err);
      setResult({
        status: "function_not_deployed",
        environment: "pending",
        connected: false,
        hasSecretKey: false,
        hasWebhookSecret: false,
        isFunctionDeployed: false,
        webhookUrl: defaultWebhookUrl,
        requiredEvents,
        message: "Falha de rede ao conectar à Edge Function 'stripe-verify'. Certifique-se de que a função foi implantada no Supabase.",
        checkedAt: new Date().toISOString()
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Verificar automaticamente ao abrir o diálogo
  useEffect(() => {
    if (isOpen) {
      verifyBackendConnection();
    }
  }, [isOpen]);

  const handleCopyWebhookUrl = () => {
    const url = result?.webhookUrl || defaultWebhookUrl;
    navigator.clipboard.writeText(url);
    setHasCopiedUrl(true);
    toast.success("URL do Webhook copiada para a área de transferência!");
    setTimeout(() => setHasCopiedUrl(false), 2500);
  };

  const isConnected = result?.connected ?? false;
  const currentEnv = result?.environment === "production" ? "Produção (Live)" : result?.environment === "test" ? "Teste (Sandbox)" : "Pendente";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl p-5 sm:p-6 custom-scrollbar">
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100 shrink-0">
                <span className="font-extrabold text-xl text-[#635BFF] tracking-tighter">S</span>
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#0d2342]">
                  Configurar Stripe & Webhooks
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Diagnóstico oficial da integração de pagamentos e eventos assíncronos.
                </DialogDescription>
              </div>
            </div>

            <Badge 
              className={`text-[11px] font-bold px-2.5 py-1 ${
                isConnected 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : result?.status === "function_not_deployed"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {isConnected 
                ? `Conectado (${currentEnv})` 
                : result?.status === "function_not_deployed"
                  ? "Função Backend Não Publicada (404)"
                  : "Configuração pendente"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs flex-1 overflow-y-auto pr-1">
          {/* 1. Status Real & Ambiente */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block font-medium uppercase tracking-wider text-[9px]">Ambiente Detectado</span>
              <span className="font-bold text-[#0d2342] text-xs mt-0.5 block">{currentEnv}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium uppercase tracking-wider text-[9px]">Status da Integração</span>
              <span className={`font-bold text-xs mt-0.5 block ${
                isConnected 
                  ? "text-emerald-600" 
                  : result?.status === "function_not_deployed"
                    ? "text-amber-800"
                    : "text-amber-700"
              }`}>
                {isConnected 
                  ? "Operacional e Ativo" 
                  : result?.status === "function_not_deployed"
                    ? "Função Backend Pendente (404)"
                    : "Aguardando Credenciais"}
              </span>
            </div>
          </div>

          {/* 2. Diagnóstico de Configurações no Backend (Sem expor segredos) */}
          <div className="p-4 rounded-xl border space-y-2.5 bg-white border-slate-200">
            <h4 className="font-bold text-[#0d2342] text-xs flex items-center gap-2">
              <Key className="h-4 w-4 text-[#1868db]" /> Variáveis de Backend Requeridas
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-slate-800">STRIPE_SECRET_KEY</span>
                  <p className="text-[10px] text-slate-500">Chave secreta para checkouts e balance (sk_test_... ou sk_live_...)</p>
                </div>
                <Badge 
                  variant={result?.hasSecretKey ? "default" : "outline"} 
                  className={
                    result?.hasSecretKey 
                      ? "bg-emerald-600 text-white text-[10px]" 
                      : result?.isFunctionDeployed === false
                        ? "bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                        : "text-amber-700 border-amber-300 text-[10px]"
                  }
                >
                  {result?.hasSecretKey 
                    ? "Presente no servidor" 
                    : result?.isFunctionDeployed === false
                      ? "Aguardando deploy da função"
                      : "Pendente"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-slate-800">STRIPE_WEBHOOK_SECRET</span>
                  <p className="text-[10px] text-slate-500">Segredo de validação da assinatura criptográfica (whsec_...)</p>
                </div>
                <Badge 
                  variant={result?.hasWebhookSecret ? "default" : "outline"} 
                  className={
                    result?.hasWebhookSecret 
                      ? "bg-emerald-600 text-white text-[10px]" 
                      : result?.isFunctionDeployed === false
                        ? "bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                        : "text-amber-700 border-amber-300 text-[10px]"
                  }
                >
                  {result?.hasWebhookSecret 
                    ? "Presente no servidor" 
                    : result?.isFunctionDeployed === false
                      ? "Aguardando deploy da função"
                      : "Pendente"}
                </Badge>
              </div>
            </div>

            {result?.message && (
              <p className={`text-[11px] mt-2 p-2.5 rounded-lg border leading-relaxed ${
                result.status === "function_not_deployed"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-100 text-slate-600"
              }`}>
                {result.message}
              </p>
            )}
          </div>

          {/* 3. Orientação de Cadastro Seguro */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5 text-blue-900">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-[#1868db]" />
              Local Seguro para Configuração
            </div>
            <p className="text-[11px] leading-relaxed text-blue-950/80">
              Cadastre as variáveis no <strong>Supabase Dashboard</strong> &gt; <strong>Project Settings</strong> &gt; <strong>Edge Functions</strong> &gt; <strong>Secrets</strong> (ou via CLI: <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[10px]">supabase secrets set STRIPE_SECRET_KEY=...</code>). 
              Nunca inclua credenciais secretas no código frontend ou no chat.
            </p>
          </div>

          {/* 4. URL Real do Webhook & Botão Copiar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#1868db]" /> URL do Endpoint de Webhook
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Cadastre no Stripe Dashboard</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700 flex-1 truncate select-all border border-slate-200">
                {result?.webhookUrl || defaultWebhookUrl}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyWebhookUrl}
                className="gap-1.5 shrink-0 h-9 font-bold text-xs"
              >
                {hasCopiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{hasCopiedUrl ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>
            {result?.status === "function_not_deployed" && (
              <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ <strong>Atenção:</strong> O endpoint real do webhook só responderá às notificações do Stripe após o deploy da função <code>stripe-webhook</code> no Supabase (atualmente retorna HTTP 404).
              </p>
            )}
          </div>

          {/* 5. Eventos Exigidos pelo Handler */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-700 block">
              Eventos Exigidos pelo Handler Backend:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {requiredEvents.map((evt) => (
                <Badge 
                  key={evt} 
                  variant="outline" 
                  className="font-mono text-[10px] bg-slate-50 border-slate-200 text-slate-700 py-0.5"
                >
                  {evt}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={verifyBackendConnection}
            disabled={isVerifying}
            className="w-full sm:w-auto text-xs font-bold gap-2 text-[#0d2342] border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin text-[#1868db]" : ""}`} />
            <span>{isVerifying ? "Verificando no backend..." : "Verificar conexão"}</span>
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold px-5"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
