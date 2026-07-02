import { createFileRoute } from "@tanstack/react-router";
import { 
  Building, CreditCard, ShieldAlert,
  Search, Plus, LayoutGrid, AlertCircle, HelpCircle,
  BookOpen, MessageSquare, Phone
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-semibold text-navy">Configurações Globais</h1>
        <p className="text-slate-500 font-medium">Ajustes de infraestrutura e parâmetros do sistema.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="p-8 rounded-3xl border-slate-100 shadow-sm space-y-6">
           <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
              <ShieldAlert className="h-6 w-6" />
           </div>
           <h3 className="text-xl font-bold text-navy">Segurança do Core</h3>
           <p className="text-sm text-slate-500 leading-relaxed">Configurações de firewall, limites de API e chaves de criptografia mestras.</p>
           <Button className="w-full bg-navy text-white rounded-xl">Gerenciar Chaves</Button>
        </Card>

        <Card className="p-8 rounded-3xl border-slate-100 shadow-sm space-y-6">
           <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
              <CreditCard className="h-6 w-6" />
           </div>
           <h3 className="text-xl font-bold text-navy">Gateways de Pagamento</h3>
           <p className="text-sm text-slate-500 leading-relaxed">Conexões com Mercado Pago, Stripe e conciliação bancária automática.</p>
           <Button className="w-full bg-navy text-white rounded-xl">Configurar Webhooks</Button>
        </Card>

        <Card className="p-8 rounded-3xl border-slate-100 shadow-sm space-y-6">
           <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-2">
              <LayoutGrid className="h-6 w-6" />
           </div>
           <h3 className="text-xl font-bold text-navy">Módulos & Features</h3>
           <p className="text-sm text-slate-500 leading-relaxed">Ativar ou desativar funcionalidades globalmente para testes A/B ou manutenção.</p>
           <Button className="w-full bg-navy text-white rounded-xl">Feature Flags</Button>
        </Card>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-10 shadow-sm">
         <h3 className="text-xl font-semibold text-navy mb-8">Central de Ajuda & Documentação</h3>
         <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
               <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-primary"><BookOpen className="h-5 w-5" /></div>
                  <div>
                     <h4 className="font-bold text-navy">Guia do Administrador</h4>
                     <p className="text-xs text-slate-400 mt-1">Manual completo sobre gestão de instâncias e suporte nível 3.</p>
                  </div>
               </div>
               <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-primary"><HelpCircle className="h-5 w-5" /></div>
                  <div>
                     <h4 className="font-bold text-navy">FAQ Operacional</h4>
                     <p className="text-xs text-slate-400 mt-1">Respostas para dúvidas frequentes de faturamento e integração.</p>
                  </div>
               </div>
            </div>
            <div className="bg-navy p-8 rounded-2xl text-white space-y-6">
               <h4 className="text-lg font-bold">Precisa de suporte técnico?</h4>
               <p className="text-sm opacity-60">Nossa equipe de engenharia DevOps está disponível para resolver problemas de infraestrutura.</p>
               <div className="flex gap-4">
                  <Button className="bg-primary hover:opacity-90 flex-1"><MessageSquare className="h-4 w-4 mr-2" /> Chat</Button>
                  <Button variant="outline" className="border-white/20 hover:bg-white/10 flex-1"><Phone className="h-4 w-4 mr-2" /> Emergência</Button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
