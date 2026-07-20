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

function SystemHealthDetails() {
  const healthChecks = [
    { label: "Autenticação & Sessões", status: "NORMAL", icon: ShieldCheck, color: "text-emerald-500" },
    { label: "Isolamento de Tenant (RLS)", status: "SECURE", icon: ShieldCheck, color: "text-emerald-500" },
    { label: "Database Performance", status: "STABLE", icon: Zap, color: "text-amber-500" },
    { label: "Action Engine Registry", status: "ACTIVE", icon: Bot, color: "text-blue-500" },
    { label: "OCR Pipeline", status: "ONLINE", icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Smart Process Analyzer", status: "READY", icon: Zap, color: "text-amber-500" },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {healthChecks.map((check, i) => (
        <Card key={i} className="p-4 border-slate-100 bg-white shadow-sm flex items-center gap-4">
          <div className={`h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center ${check.color}`}>
            <check.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{check.label}</p>
            <p className="text-xs font-black text-navy uppercase tracking-tighter">{check.status}</p>
          </div>
        </Card>
      ))}
    </div>
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
      <div className="mb-8">
        <h2 className="text-xl font-black text-navy uppercase tracking-tighter mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Core Engine Health
        </h2>
        <SystemHealthDetails />
      </div>
    </div>
  );
}