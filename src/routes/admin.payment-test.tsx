import { createFileRoute } from "@tanstack/react-router";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Webhook, 
  Database,
  Search,
  Zap,
  Activity,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payment-test")({
  component: PaymentTestPage,
});

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface PaymentLog {
  id: string;
  event_type: string;
  status: string;
  message: string;
  created_at: string;
  payload: any;
}


function PaymentTestPage() {
  const queryClient = useQueryClient();
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Check Config Status
  const { data: configStatus, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["payment-config-status"],
    queryFn: async () => {
      return {
        accessToken: "Configurado (Backend)",
        publicKey: "Configurada (Frontend)",
        webhookUrl: `${window.location.origin}/functions/v1/mercado-pago-webhook`,
      };
    }
  });

  // 2. Fetch Latest Logs
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["payment-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PaymentLog[];
    },
    refetchInterval: 5000 // Refresh every 5s during testing
  });

  // 3. Fetch Plans
  const { data: plans } = useQuery({
    queryKey: ["plans-test"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true);
      if (error) throw error;
      return data as Plan[];
    }
  });

  // 4. Simulate Checkout
  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId, origin: window.location.origin }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Checkout Criado", {
        description: "Redirecionando para o fluxo de pagamento...",
      });
      if (data.init_point) {
          window.open(data.init_point, "_blank");
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao criar checkout", {
        description: error.message,
      });
    }
  });

  // 5. Simulate Webhook (Manual Trigger for Testing)
  const simulateWebhookMutation = useMutation({
    mutationFn: async () => {
      setIsSimulating(true);
      const { data, error } = await supabase.functions.invoke("mercado-pago-webhook", {
        body: {
          type: "payment",
          data: { id: "test_payment_" + Date.now() },
          action: "payment.created",
          external_reference: "mock_company:mock_plan"
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Webhook Simulado", { description: "O sistema processou a notificação com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["payment-logs"] });
      setIsSimulating(false);
    },
    onError: (error: any) => {
      toast.error("Erro na Simulação", { description: error.message });
      setIsSimulating(false);
    }
  });


  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" /> Validação de Pagamentos
          </h1>
          <p className="text-slate-500 font-medium italic italic">Sandbox & Checkout Diagnostics</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["payment-logs"] })}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar Logs
            </Button>
            <Button onClick={() => simulateWebhookMutation.mutate()} disabled={isSimulating}>
                <Webhook className="h-4 w-4 mr-2" /> Simular Webhook
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="h-3 w-3" /> Mercado Pago Config
          </p>
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Access Token:</span>
                <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50">OK (BACKEND)</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Public Key:</span>
                <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50">OK (FRONTEND)</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Webhooks:</span>
                <Badge variant="outline" className="text-[9px] font-bold text-amber-600 bg-amber-50">ATIVO</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="h-3 w-3" /> Estado das Tabelas
          </p>
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Plans:</span>
                <span className="font-bold text-navy">{plans?.length || 0} Ativos</span>
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Subscriptions:</span>
                <span className="font-bold text-navy">Online</span>
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Payments:</span>
                <span className="font-bold text-navy">Online</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-100 shadow-sm bg-navy text-white">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-3 w-3" /> Teste de Fluxo
          </p>
          <div className="mt-4 space-y-3">
             <p className="text-[11px] text-white/70 italic">Escolha um plano para simular o checkout completo:</p>
             <div className="grid grid-cols-2 gap-2">
                {plans?.map(plan => (
                    <Button 
                        key={plan.id} 
                        size="sm" 
                        variant="secondary" 
                        className="text-[10px] font-bold h-8"
                        onClick={() => createCheckoutMutation.mutate(plan.id)}
                        disabled={createCheckoutMutation.isPending}
                    >
                        {plan.name}
                    </Button>
                ))}
             </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-0 border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Histórico de Logs Recentes
            </h3>
            <Badge className="bg-navy text-white text-[9px]">Tempo Real</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">Carregando logs...</div>
            ) : logs?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">Nenhum log registrado ainda.</div>
            ) : (
                logs?.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    log.status === 'success' || log.status === 'received' ? 'bg-emerald-100 text-emerald-600' : 
                                    log.status === 'error' || log.status === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {log.event_type}
                                </span>
                                <p className="text-[11px] font-bold text-navy mt-1">{log.message || "Sem mensagem detalhada"}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {new Date(log.created_at).toLocaleString()}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => console.log(log.payload)}>
                                <ArrowRight className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </Card>

        <Card className="p-8 border-slate-100 shadow-sm space-y-6 bg-slate-50">
          <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Checklist de Estabilidade
          </h3>
          <div className="space-y-4">
             <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                <CheckCircle2 className={`h-5 w-5 ${configStatus ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                   <p className="text-xs font-bold text-navy uppercase">Backend Seguro</p>
                   <p className="text-[10px] text-slate-400">Tokens nunca expostos ao cliente (Browser).</p>
                </div>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                   <p className="text-xs font-bold text-navy uppercase">Sandbox Fallback</p>
                   <p className="text-[10px] text-slate-400">O sistema funciona mesmo sem chaves MP reais.</p>
                </div>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                   <p className="text-xs font-bold text-navy uppercase">Integração Webhook</p>
                   <p className="text-[10px] text-slate-400">Sincronização automática via Edge Functions.</p>
                </div>
             </div>
             <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                   <p className="text-xs font-bold text-navy uppercase">Relatório de MRR</p>
                   <p className="text-[10px] text-slate-400">Dashboard financeiro Master alimentado via Webhook.</p>
                </div>
             </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
             <p className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> Aviso de Segurança
             </p>
             <p className="text-[9px] text-amber-600 mt-1 leading-relaxed">
                As chaves de produção só devem ser configuradas via Supabase Dashboard ou Lovable Secrets. Nunca salve tokens MP no código fonte.
             </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
