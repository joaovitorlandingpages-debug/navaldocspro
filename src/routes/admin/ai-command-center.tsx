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
      
      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-navy leading-none uppercase italic">
            NAVALDOCS PRO
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-navy text-white text-[10px] font-black tracking-widest uppercase">FASE 2</Badge>
            <Badge className="bg-primary text-white text-[10px] font-black tracking-widest uppercase">SPRINT UX 6</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black text-primary uppercase italic flex items-center gap-3">
            <Zap className="h-6 w-6" /> ACTION ENGINE
          </h3>
          <p className="text-navy font-black text-lg leading-tight uppercase italic border-l-4 border-primary pl-4">
            "O ENGENHEIRO DIGITAL QUE RESOLVE"
          </p>
        </div>

        <div className="grid gap-6 text-navy/80">
          <div className="space-y-4">
            <div className="bg-white/50 p-6 rounded-2xl border border-primary/20">
              <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> OBJETIVO DA SPRINT
              </h4>
              <p className="text-xs font-bold leading-relaxed mb-4">
                Hoje o Smart Process Analyzer identifica problemas. Agora ele deve resolver automaticamente tudo aquilo que puder e pedir confirmação apenas quando houver uma decisão importante. O objetivo é eliminar o máximo possível de trabalho manual. O sistema deixa de apenas informar. Ele passa a EXECUTAR.
              </p>
              <h5 className="font-black text-[10px] uppercase tracking-widest text-primary mb-3">PRINCÍPIO</h5>
              <p className="text-xs font-black text-navy italic mb-4 italic">"O que posso resolver automaticamente para você?"</p>
              
              <ul className="space-y-3">
                {[
                  "Catálogo de Ações Automáticas (Normalização, Atualização, Geração de Docs)",
                  "Ações Sugeridas para Inconsistências (ex: Motor Divergente)",
                  "Execução Guiada (Resolver agora / depois / não se aplica)",
                  "Modo Um Clique: 'GERAR TODO O PROCESSO' quando tudo estiver correto",
                  "Resolução em Lote de pendências",
                  "Assistente Lateral no Workspace (Copilot Ativo)",
                  "Ações Seguras: Garantir confirmação para alterações técnicas críticas",
                  "Histórico de Execução (Audit Trail completa)",
                  "Funcionalidade de Desfazer (Undo System)",
                  "Performance em Background e Mobile Polish"
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 text-xs font-bold leading-relaxed">
                    <span className="text-primary">[{i + 1}]</span> {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-navy p-6 rounded-2xl border border-white/10 text-white">
              <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-primary">
                <Terminal className="h-4 w-4" /> REQUISITOS TÉCNICOS
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-wider leading-relaxed opacity-90">
                <div className="space-y-2">
                  <p>1. Action Registry & Dispatcher Pattern</p>
                  <p>2. Transactional Rollback for Batch Operations</p>
                  <p>3. Audit Log Persistence (Action History)</p>
                </div>
                <div className="space-y-2">
                  <p>4. Dynamic Suggestion Engine (Heuristics to Action mapping)</p>
                  <p>5. UI: One-Click Materialization Logic</p>
                  <p>6. Background Worker for non-blocking execution</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3 text-[10px] font-black text-primary uppercase animate-pulse text-center w-full justify-center border-t border-primary/10">
          <Zap className="h-4 w-4" /> A SENSAÇÃO FINAL: "QUANTO MENOS EU PRECISO CLICAR, MELHOR O NAVALDOCS TRABALHA PARA MIM."
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
