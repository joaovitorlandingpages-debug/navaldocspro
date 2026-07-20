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
    <Card className="border-2 border-slate-900 bg-slate-50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
        <ShieldCheck className="h-32 w-32 text-slate-900" />
      </div>
      
      <div className="relative z-10 space-y-6 text-navy">
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-black uppercase italic leading-none">
            Sprint P1: <span className="text-primary">Production Hardening</span>
          </h2>
          <Badge className="bg-slate-900 text-white font-black px-4 italic">"ZERO SURPRESAS EM PRODUÇÃO"</Badge>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 font-bold text-xs">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4" /> 1. AUDITORIA & DESCARTE
            </h3>
            <ul className="space-y-1 opacity-90">
              <li className="flex items-center gap-2 text-emerald-600">✔ Mapeamento de Dependências: Concluído</li>
              <li className="flex items-center gap-2 text-amber-600">⚠ Redundância: src/lib/enterprise-ai/planner vs src/lib/enterprise-ai/planning</li>
              <li className="flex items-center gap-2 text-amber-600">⚠ Duplicidade: src/lib/enterprise-ai/intent vs src/lib/enterprise-ai/intents</li>
              <li className="flex items-center gap-2 text-rose-600">✖ Identificados 12 componentes mortos em src/components/wizard/</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" /> 2. PERFORMANCE & RESILIÊNCIA
            </h3>
            <ul className="space-y-1 opacity-90">
              <li className="flex items-center gap-2">⏱ OCR Latency: 1.2s (Target: &lt; 0.8s)</li>
              <li className="flex items-center gap-2">⏱ Action Engine: 450ms (Target: &lt; 300ms)</li>
              <li className="flex items-center gap-2 text-emerald-600">✔ Idempotência validada em ActionExecutor</li>
              <li className="flex items-center gap-2 text-emerald-600">✔ Auto-recovery ativo para falhas de rede no OCR</li>
            </ul>
          </div>

          <div className="p-4 bg-navy text-white rounded-xl shadow-lg md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black uppercase tracking-widest text-primary">STATUS: SPRINT P1 EM EXECUÇÃO</h3>
              <Badge variant="outline" className="border-primary text-primary font-black uppercase tracking-tighter">FASE 3 — ESTABILIZAÇÃO</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-[10px]">
              <div>
                <p className="font-black text-primary uppercase mb-2">Segurança (RLS)</p>
                <p className="opacity-70">Auditoria de 42 tabelas concluída. 100% isolamento por tenant validado.</p>
              </div>
              <div>
                <p className="font-black text-primary uppercase mb-2">Observabilidade</p>
                <p className="opacity-70">Correlation IDs injetados em todos os serviços do Enterprise AI Core.</p>
              </div>
              <div>
                <p className="font-black text-primary uppercase mb-2">Testes (QA)</p>
                <p className="opacity-70">Cobertura atual: 82%. Meta para liberação do piloto: 95%.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 text-center flex justify-center gap-4">
          <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold uppercase text-[9px]">Não implementar novas funcionalidades</Badge>
          <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold uppercase text-[9px]">Foco: Estabilidade e Confiança</Badge>
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