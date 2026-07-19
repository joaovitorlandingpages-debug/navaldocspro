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
  const objectives = [
    "Após o upload e leitura dos documentos, o NavalDocs Pro não deve apenas preencher cadastros.",
    "Ele deve ANALISAR todo o processo como faria um engenheiro experiente.",
    "A IA deve identificar inconsistências, pendências, riscos, oportunidades e sugerir automaticamente o melhor caminho.",
    "O sistema deixa de ser apenas um gerador de documentos.",
    "Ele passa a ser um consultor técnico."
  ];

  const analysisItems = [
    "Cliente", "Embarcação", "Motor", "Blueprint", "Checklist", "Uploads", "OCR", "Documentos", "Histórico", "Processos anteriores", "Certificados", "Datas", "Pendências"
  ];

  const problems = [
    "Documento vencido", "Documento ilegível", "Documento incompleto", "OCR com baixa confiança", "Motor divergente", "Comprimento incompatível", "CPF inválido", "CNPJ inválido", "Endereço divergente", "Proprietário diferente", "Embarcação duplicada", "Cliente duplicado", "Documento faltando", "ART vencida", "Certificado vencido", "Campos obrigatórios vazios", "Número de inscrição inválido"
  ];

  return (
    <Card className="border-2 border-primary bg-primary/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
        <ShieldCheck className="h-32 w-32 text-primary" />
      </div>
      
      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-navy leading-none uppercase italic">
            NAVALDOCS PRO
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-navy text-white text-[10px] font-black tracking-widest uppercase">FASE 2</Badge>
            <Badge className="bg-primary text-white text-[10px] font-black tracking-widest uppercase">SPRINT UX 5</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black text-primary uppercase italic flex items-center gap-3">
            <Zap className="h-6 w-6" /> SMART PROCESS ANALYZER
          </h3>
          <p className="text-navy font-black text-lg leading-tight uppercase italic border-l-4 border-primary pl-4">
            "O ENGENHEIRO DIGITAL"
          </p>
        </div>

        <div className="grid gap-8">
          <div className="bg-white/50 p-6 rounded-2xl border border-primary/20">
            <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> OBJETIVO
            </h4>
            <ul className="space-y-3">
              {objectives.map((text, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold leading-relaxed text-navy/80">
                  <span className="text-primary font-black">[{i + 1}]</span> {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-navy p-6 rounded-2xl border border-white/10 text-white">
              <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-primary">
                <Terminal className="h-4 w-4" /> ANÁLISE DE ENGENHARIA
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysisItems.map((item, i) => (
                  <Badge key={i} variant="outline" className="border-white/20 text-white text-[9px] font-bold uppercase">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" /> DETECÇÃO DE PROBLEMAS
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase text-slate-500">
                {problems.slice(0, 10).map((p, i) => (
                  <p key={i} className="flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-red-400" /> {p}
                  </p>
                ))}
                <p className="text-primary">+ {problems.length - 10} REGRAS</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h5 className="text-[10px] font-black uppercase text-emerald-600 mb-1">Score do Processo</h5>
              <p className="text-2xl font-black text-emerald-700">92%</p>
              <p className="text-[9px] font-bold uppercase text-emerald-600/70">Qualidade Documental</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h5 className="text-[10px] font-black uppercase text-blue-600 mb-1">Aprovação</h5>
              <p className="text-2xl font-black text-blue-700">96%</p>
              <p className="text-[9px] font-bold uppercase text-blue-600/70">Estimativa Técnica</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <h5 className="text-[10px] font-black uppercase text-amber-600 mb-1">Riscos Detectados</h5>
              <p className="text-2xl font-black text-amber-700">MÉDIO</p>
              <p className="text-[9px] font-bold uppercase text-amber-600/70">Revisão Necessária</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-primary/10 flex items-center gap-3 text-[10px] font-black text-primary uppercase">
          <Zap className="h-4 w-4 animate-pulse" /> ENGINE DE ANÁLISE UX 5.0 — "O ENGENHEIRO DIGITAL" ATIVO
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
