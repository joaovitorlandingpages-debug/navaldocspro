import { createFileRoute } from "@tanstack/react-router";
import { Bot, ShieldCheck, Zap, AlertTriangle, CheckCircle2, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/ai-command-center")({
  component: AICommandCenter,
});

function CommandCenterHeader() {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-3">
        <div className="h-14 w-14 bg-navy rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 group">
          <Bot className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tighter uppercase italic">
            Enterprise AI <span className="text-primary">Command Center</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase">
            Orquestração de Modelos, Automação de Processos e Governança de IA.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-4 py-1">
          MASTER GATE ACTIVE
        </Badge>
        <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black uppercase tracking-widest px-4 py-1">
          SYSTEM HEALTH: 100%
        </Badge>
      </div>
    </div>
  );
}

function AuditRequirements() {
  return (
    <Card className="border-2 border-primary bg-primary/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
        <ShieldCheck className="h-32 w-32 text-primary" />
      </div>
      
      <div className="relative z-10 space-y-6 text-navy">
        <h2 className="text-3xl font-black uppercase italic leading-none">
          Audit: <span className="text-primary">Action Engine</span>
        </h2>
        
        <div className="space-y-4 font-bold text-xs">
          <div className="p-4 bg-white/50 rounded-xl border border-primary/20">
            <h3 className="font-black uppercase tracking-widest text-primary mb-2">Estrutura Enterprise AI Core</h3>
            <p className="opacity-70">Detectada em: src/lib/enterprise-ai/</p>
            <ul className="mt-2 space-y-1 opacity-90">
              <li>✔ Planner Engine (src/lib/enterprise-ai/planner)</li>
              <li>✔ Action Registry (src/lib/enterprise-ai/actions/action-registry.ts)</li>
              <li>✔ Action Executor (src/lib/enterprise-ai/actions/execution/action-executor.ts)</li>
              <li>✔ Idempotency Service (src/lib/enterprise-ai/actions/execution/idempotency-service.ts)</li>
              <li>✔ Confirmation Service (src/lib/enterprise-ai/actions/confirmation/confirmation-service.ts)</li>
            </ul>
          </div>

          <div className="p-4 bg-white/50 rounded-xl border border-primary/20">
            <h3 className="font-black uppercase tracking-widest text-primary mb-2">Smart Process Analyzer</h3>
            <p className="opacity-70">Ativo em: src/services/processAnalyzerService.ts</p>
            <ul className="mt-2 space-y-1 opacity-90">
              <li>✔ Tabela public.process_analyses persistida</li>
              <li>✔ Detecção de OWNER_MISMATCH</li>
              <li>✔ Verificação de validade de documentos</li>
              <li>✔ Cálculo de Score de Qualidade</li>
            </ul>
          </div>

          <div className="p-4 bg-navy text-white rounded-xl shadow-lg">
            <h3 className="font-black uppercase tracking-widest text-primary mb-2">STATUS: SPRINT UX 6 EM ANDAMENTO</h3>
            <p className="text-[10px] opacity-70 mb-2 italic">Implementando arquitura real do "Engenheiro Digital que Resolve"</p>
            <ul className="space-y-1 text-[10px]">
              <li>✔ ActionEngineService criado (Persistence & Orchestration)</li>
              <li>✔ Action Registry populado com NormalizeContact e AssociateDocument</li>
              <li>✔ ActionEngine Types definidos (Status, Risk, ExecutionRecords)</li>
              <li>[ ] Integração com Workspace 3.0 (Próxima etapa)</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-primary/10 text-center">
          <Badge className="bg-primary text-white font-black px-4 italic">SPRINT UX 6: ACTION ENGINE FOUNDATION</Badge>
        </div>
      </div>
    </Card>
  );
}

function CommandCenterStats() {
  const stats = [
    { label: "Execuções de IA", value: "1,240", icon: Zap, color: "text-amber-500" },
    { label: "Precisão OCR", value: "98.4%", icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Latência Média", value: "450ms", icon: Bot, color: "text-blue-500" }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className="p-6 bg-white border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-navy">{stat.value}</h3>
          </div>
          <stat.icon className={`h-8 w-8 ${stat.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
        </Card>
      ))}
    </div>
  );
}

export function AICommandCenter() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <CommandCenterHeader />
      <CommandCenterStats />
      <AuditRequirements />
    </div>
  );
}
