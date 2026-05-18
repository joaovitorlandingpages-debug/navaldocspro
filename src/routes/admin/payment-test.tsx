import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Webhook, Database, Zap, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/payment-test")({
  component: PaymentTestPage,
});

function PaymentTestPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" /> Validação de Pagamentos
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="h-3 w-3" /> Mercado Pago Config
          </p>
          <div className="mt-4">
            <span className="text-xs text-slate-500">Status: </span>
            <span className="text-xs font-bold text-emerald-600">Ativo</span>
          </div>
        </Card>
      </div>
      
      <Button className="mt-8">
        <Webhook className="h-4 w-4 mr-2" /> Testar Webhook
      </Button>
    </div>
  );
}