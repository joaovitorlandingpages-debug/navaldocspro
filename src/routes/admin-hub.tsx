import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  ShieldCheck, Activity, BarChart3, LayoutTemplate, History, Database,
  FileWarning, Users, Settings, Rocket, Cpu, Lock, CreditCard, FileText,
  Library, TrendingUp, Award, Zap, Globe, Bot, MessageSquare, CheckCircle2,
  Layout as LayoutIcon, Signature,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/admin-hub")({
  component: AdminHub,
});

type Item = { name: string; to: string; icon: ReactNode; desc: string; globalOnly?: boolean };
type Section = { title: string; color: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Operação Master",
    color: "from-blue-500 to-blue-700",
    items: [
      { name: "Painel Admin", to: "/admin", icon: <ShieldCheck />, desc: "Console master geral" },
      { name: "Admin Master Global", to: "/admin-master", icon: <Award />, desc: "Tenants, planos e billing", globalOnly: true },
      { name: "Empresas", to: "/admin/companies", icon: <Users />, desc: "Gestão de tenants" },
      { name: "Usuários", to: "/admin/users", icon: <Users />, desc: "Acesso e perfis" },
    ],
  },
  {
    title: "Analytics & Métricas",
    color: "from-emerald-500 to-emerald-700",
    items: [
      { name: "Executive Overview", to: "/admin/executive-overview", icon: <Globe />, desc: "Visão executiva" },
      { name: "Métricas SaaS", to: "/admin/saas-metrics", icon: <BarChart3 />, desc: "MRR, ARR, churn" },
      { name: "Comercial & Readiness", to: "/admin/commercial", icon: <TrendingUp />, desc: "Pipeline comercial" },
      { name: "Diagnóstico", to: "/admin/diagnostico", icon: <Activity />, desc: "Saúde do sistema" },
    ],
  },
  {
    title: "Marketplace & Documentos",
    color: "from-violet-500 to-violet-700",
    items: [
      { name: "Marketplace Admin", to: "/admin-master", icon: <LayoutTemplate />, desc: "Curadoria de templates", globalOnly: true },
      { name: "Biblioteca Master", to: "/admin/document-library", icon: <Library />, desc: "Documentos navais" },
      { name: "Motor de Documentos", to: "/admin/documentos", icon: <FileText />, desc: "Templates oficiais" },
      { name: "Biblioteca Nacional", to: "/documentos/biblioteca", icon: <FileText />, desc: "Catálogo público" },
      { name: "Âncoras de Assinatura", to: "/admin/signature-anchors", icon: <Signature />, desc: "Editor visual" },
    ],
  },
  {
    title: "Compliance & Segurança",
    color: "from-amber-500 to-amber-700",
    items: [
      { name: "Segurança", to: "/admin/security", icon: <Lock />, desc: "Audit & policies" },
      { name: "Auditoria QA Final", to: "/admin/full-qa-report", icon: <CheckCircle2 />, desc: "Relatório QA" },
      { name: "Validação de Campo", to: "/admin/field-validation-report", icon: <Activity />, desc: "Testes operacionais" },
      { name: "Audit Logs", to: "/admin/logs", icon: <History />, desc: "Logs administrativos" },
      { name: "Erros de Interface", to: "/admin/frontend-errors", icon: <LayoutIcon />, desc: "Frontend errors" },
    ],
  },
  {
    title: "Performance & Monitoramento",
    color: "from-cyan-500 to-cyan-700",
    items: [
      { name: "OCR Admin", to: "/admin/ocr", icon: <Zap />, desc: "Pipeline de OCR" },
      { name: "Storage Admin", to: "/admin/storage", icon: <Database />, desc: "Arquivos e buckets" },
      { name: "Implantação & Status", to: "/admin/system-report", icon: <Activity />, desc: "Status do sistema" },
      { name: "Prontidão de Produção", to: "/admin/production-readiness", icon: <Rocket />, desc: "Go-live checklist" },
    ],
  },
  {
    title: "Financeiro Interno",
    color: "from-rose-500 to-rose-700",
    items: [
      { name: "Planos & Billing", to: "/admin/billing", icon: <CreditCard />, desc: "Assinaturas e cobrança" },
      { name: "Suporte", to: "/admin/support", icon: <MessageSquare />, desc: "Tickets clientes" },
      { name: "Feedback Operacional", to: "/admin/operational-feedback", icon: <MessageSquare />, desc: "Voz do usuário" },
    ],
  },
  {
    title: "Evolução & Limpeza",
    color: "from-slate-500 to-slate-700",
    items: [
      { name: "AI Global Console", to: "/admin/global", icon: <Bot />, desc: "Configuração de IA" },
      { name: "Roadmap Enterprise", to: "/admin/roadmap", icon: <Rocket />, desc: "Backlog estratégico" },
      { name: "Limpeza de Testes", to: "/admin-master", icon: <FileWarning />, desc: "Reset de dados demo", globalOnly: true },
      { name: "Ambiente Demo", to: "/demo", icon: <Rocket />, desc: "Sandbox demonstração" },
      { name: "Changelog", to: "/changelog", icon: <History />, desc: "Histórico de releases" },
      { name: "Ajustes Master", to: "/admin/settings", icon: <Settings />, desc: "Feature flags & config" },
    ],
  },
];

function AdminHub() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-white">
        <Cpu className="h-10 w-10 animate-spin text-amber-400" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/auth/login" />;
  const isGlobal = profile.role === 'admin_master_global';
  const isMaster = isGlobal || profile.role === 'admin_master';
  if (!isMaster && profile.role !== 'admin') return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 grid place-items-center rounded-2xl bg-amber-500/20 border border-amber-500/40">
              <ShieldCheck className="h-6 w-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold truncate">Admin Hub</h1>
              <p className="text-xs sm:text-sm text-slate-400 truncate">
                Central administrativa unificada — {isGlobal ? 'Master Global' : isMaster ? 'Master' : 'Admin'}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-white/10 hover:border-white/30"
          >
            Voltar
          </Link>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = section.items.filter(i => !i.globalOnly || isGlobal);
            if (!items.length) return null;
            return (
              <section key={section.title}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${section.color}`} />
                  <h2 className="text-[11px] font-semibold tracking-[0.2em] text-slate-300">{section.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <Link key={item.name + item.to} to={item.to} className="group">
                      <Card className="p-4 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-amber-500/30 transition-all h-full">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br ${section.color} text-white shadow-lg`}>
                            <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate group-hover:text-amber-200">{item.name}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
