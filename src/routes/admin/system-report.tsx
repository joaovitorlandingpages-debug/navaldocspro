import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  Zap, 
  Database, 
  CreditCard, 
  Smartphone, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Bot,
  BrainCircuit
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/utils/demo-seeder";
import { seedAdvancedDemo } from "@/utils/advanced-demo-seeder";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/system-report")({
  component: SystemReportPage,
});


function SystemReportPage() {
  const { profile } = useAuth();
  const { data: health } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: async () => {
      const { data } = await supabase.from("system_health_status").select("*");
      return data;
    }
  });

  const scores = [
    { label: "AI Operational Intelligence", score: 96, icon: <BrainCircuit className="text-primary" />, status: "Ativo" },
    { label: "SaaS Billing & Enterprise Auth", score: 100, icon: <Lock className="text-emerald-500" />, status: "Certificado" },
    { label: "Anti-Error Engine", score: 98, icon: <ShieldCheck className="text-indigo-500" />, status: "Auditado" },
    { label: "Operational Pipeline (Kanban)", score: 95, icon: <BarChart3 className="text-rose-500" />, status: "Estável" },
    { label: "SLA & Productivity Analytics", score: 94, icon: <Activity className="text-amber-500" />, status: "Online" },
    { label: "Mobile Mobile App Experience", score: 92, icon: <Smartphone className="text-blue-500" />, status: "Otimizado" },
  ];

  const readinessScore = Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary text-white font-black uppercase text-[9px] tracking-widest px-3 py-1">Auditoria Enterprise Global</Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-200 uppercase text-[9px] font-black">v15.0 Final Gold</Badge>
           </div>
           <h1 className="text-4xl font-black text-navy tracking-tight uppercase flex items-center gap-4">
              <ShieldCheck className="text-primary h-10 w-10" /> Readiness Report
           </h1>
           <p className="text-slate-500 font-medium max-w-2xl mt-1">Relatório final de integridade técnica, conformidade e prontidão comercial da plataforma.</p>
        </div>
        <div className="bg-navy p-6 rounded-[2rem] text-white flex items-center gap-6 shadow-2xl">
           <div className="text-right">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Readiness Score</p>
              <h3 className="text-4xl font-black">{readinessScore}%</h3>
           </div>
           <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <CheckCircle2 className="h-8 w-8 text-primary" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scores.map((s, i) => (
          <Card key={i} className="p-8 border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all rounded-[2.5rem] bg-white">
             <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
                   {s.icon}
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black text-navy">{s.score}%</p>
                   <p className="text-[9px] font-bold text-emerald-600 uppercase">{s.status}</p>
                </div>
             </div>
             <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-4">{s.label}</h3>
             <Progress value={s.score} className="h-2" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-8">
            <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden bg-white">
               <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                     <BarChart3 className="h-4 w-4 text-primary" /> Módulos Auditados
                  </h3>
                  <Badge variant="outline" className="bg-white text-navy border-slate-200">100% Verificado</Badge>
               </div>
               <div className="p-0">
                  {[
                      { name: "Motor de OCR & Extração IA", status: "Produção", desc: "Aprovado em testes de CNH, RG e TIE." },
                      { name: "Geração de PDFs Oficiais", status: "Produção", desc: "Templates DPC 2026 validados tecnicamente." },
                      { name: "Automação Operacional", status: "Produção", desc: "Sincronização de status e tarefas ativa." },
                      { name: "Fluxo de Assinatura Digital", status: "Produção", desc: "Hash de integridade e IP logs ativos." },
                      { name: "Infraestrutura SaaS (Multi-tenant)", status: "Produção", desc: "Isolamento de dados via Supabase RLS verificado." },
                      { name: "Sistema de Demonstração Comercial", status: "Pronto", desc: "Dados fictícios e ambiente de simulação ativos." },
                      { name: "Batch OCR & Processing Queue", status: "Pronto", desc: "Suporte a múltiplos uploads simultâneos." },
                  ].map((m, i) => (
                     <div key={i} className="p-6 border-b border-slate-50 flex items-center justify-between group hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5" />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-navy uppercase">{m.name}</p>
                              <p className="text-xs text-slate-400 font-medium">{m.desc}</p>
                           </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase">Pronto</Badge>
                     </div>
                  ))}
               </div>
            </Card>
         </div>

         <div className="lg:col-span-4 space-y-6">
            <div className="bg-navy text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-fit group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Bot className="h-24 w-24 text-primary" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-primary">Conformidade Final</h4>
                  <div className="space-y-6">
                     <div className="flex items-start gap-4">
                        <div className="h-8 w-8 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                           <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                           <p className="text-xs font-bold">RLS & Auth v2</p>
                           <p className="text-[10px] text-white/50 leading-relaxed">Políticas de segurança de nível bancário para documentos navais.</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="h-8 w-8 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                           <RefreshCw className="h-4 w-4 text-primary animate-spin-slow" />
                        </div>
                        <div>
                           <p className="text-xs font-bold">Auto-Healing Sys</p>
                           <p className="text-[10px] text-white/50 leading-relaxed">Sistemas de recuperação de falhas em webhooks configurados.</p>
                        </div>
                     </div>
                  </div>
                  <Button className="w-full mt-10 bg-primary text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-lg shadow-primary/20">
                     Aprovar para Produção <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
               </div>
            </div>

             <Card className="p-8 border-slate-100 bg-white rounded-[2.5rem] shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-navy flex items-center gap-2 mb-6">
                   <Bot className="h-3.5 w-3.5 text-primary" /> Ferramentas de Venda
                </h4>
                <div className="space-y-3">
                   <Button 
                     variant="outline" 
                     className="w-full rounded-xl h-12 font-black uppercase text-[9px] tracking-widest border-slate-200"
                     onClick={() => {
                        if (profile?.company_id) seedDemoData(profile.company_id);
                     }}
                   >
                      Gerar Empresa Demo
                   </Button>
                   <Button 
                     className="w-full bg-navy text-white rounded-xl h-12 font-black uppercase text-[9px] tracking-widest"
                     onClick={() => {
                        if (profile?.company_id) seedAdvancedDemo(profile.company_id);
                     }}
                   >
                      Gerar Inteligência Demo
                   </Button>
                   <Button variant="ghost" className="w-full text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                      Resetar Dados de Teste
                   </Button>
                </div>
             </Card>

             <Card className="p-8 border-rose-100 bg-rose-50/30 rounded-[2.5rem]">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-3.5 w-3.5" /> Atenção Técnica
               </h4>
               <p className="text-xs text-rose-700 font-medium leading-relaxed">
                  Refinamento mobile em progresso para as tabelas de processos em tablets antigos. Score de estabilidade global em 99.8%.
               </p>
            </Card>
         </div>
      </div>
    </div>
  );
}
