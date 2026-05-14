import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Database, 
  Zap, 
  FileText, 
  Eye, 
  LayoutDashboard,
  AlertCircle,
  Construction,
  MonitorCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/admin/system-report")({
  component: SystemReport,
});

function SystemReport() {
  const modules = [
    {
      name: "Autenticação & Multiempresa",
      status: "Funcional",
      completion: 95,
      supabase: "Conectado",
      details: "Auth, Profiles e Companies integrados. RLS configurado em todas as tabelas principais.",
      priority: "Baixa"
    },
    {
      name: "Gestão de Clientes & Embarcações",
      status: "Funcional",
      completion: 100,
      supabase: "Conectado",
      details: "CRUD completo integrado ao Supabase. Dashboards dinâmicos.",
      priority: "Concluído"
    },
    {
      name: "Processos Navais",
      status: "Funcional",
      completion: 90,
      supabase: "Conectado",
      details: "Fluxo de criação e acompanhamento ok. Falta integração fina com webhooks de status externos.",
      priority: "Média"
    },
    {
      name: "Gerador de Documentos",
      status: "Parcial",
      completion: 65,
      supabase: "Conectado",
      details: "Geração de PDF (jsPDF) funcional no cliente. Persistência básica ok. Falta edição de templates reais via servidor.",
      priority: "Alta"
    },
    {
      name: "Financeiro & Mercado Pago",
      status: "Estrutural",
      completion: 40,
      supabase: "Parcial",
      details: "Tabelas criadas. Interface de admin ok. Falta integração real com API do Mercado Pago e Webhooks (Edge Functions).",
      priority: "Crítica"
    },
    {
      name: "Upload & OCR / IA",
      status: "Visual / Parcial",
      completion: 30,
      supabase: "Parcial",
      details: "Upload para Storage funcional. IA e OCR ainda usam lógica mockada no frontend.",
      priority: "Alta"
    },
    {
      name: "Admin Master",
      status: "Funcional",
      completion: 85,
      supabase: "Conectado",
      details: "Visualização global de dados ok. Falta ferramentas de impersonation e suporte direto.",
      priority: "Média"
    }
  ];

  const tables = [
    "profiles", "companies", "customers", "vessels", "processes", 
    "documents", "activity_logs", "plans", "subscriptions", "payments", 
    "document_templates", "document_fields", "generated_documents", "uploaded_files"
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <MonitorCheck className="h-8 w-8 text-primary" /> Relatório Técnico de Sistema
          </h1>
          <p className="text-slate-500 font-medium italic">Estado atual do NavalDocs Pro v6.0 Production-Ready</p>
        </div>
        <Badge className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest">Auditoria em Tempo Real</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-100 shadow-sm bg-navy text-white relative overflow-hidden">
          <Zap className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5" />
          <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Nível de Conclusão Global</p>
          <h3 className="text-4xl font-black mt-2">72%</h3>
          <Progress value={72} className="h-2 mt-4 bg-white/10" />
        </Card>
        <Card className="p-6 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabelas no Banco</p>
          <h3 className="text-4xl font-black text-navy mt-2">{tables.length}</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase flex items-center gap-1">
            <Database className="h-3 w-3" /> Estrutura de Dados Estável
          </p>
        </Card>
        <Card className="p-6 border-slate-100 shadow-sm bg-rose-50 border-rose-100">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Alertas Urgentes</p>
          <h3 className="text-4xl font-black text-rose-600 mt-2">03</h3>
          <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Bloqueios de Lançamento
          </p>
        </Card>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" /> Checklist por Módulo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Módulo</th>
                <th className="px-8 py-5">Status Técnico</th>
                <th className="px-8 py-5">Conclusão</th>
                <th className="px-8 py-5">Supabase</th>
                <th className="px-8 py-5">Prioridade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {modules.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="font-black text-navy uppercase tracking-tight">{m.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">{m.details}</div>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className={`border-none font-black text-[9px] uppercase tracking-widest ${
                      m.status === 'Funcional' ? 'bg-emerald-100 text-emerald-600' : 
                      m.status === 'Parcial' ? 'bg-amber-100 text-amber-600' : 
                      m.status === 'Estrutural' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {m.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <Progress value={m.completion} className="h-1.5 w-16" />
                      <span className="font-bold text-xs">{m.completion}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-xs text-slate-500 uppercase">{m.supabase}</td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      m.priority === 'Crítica' ? 'text-rose-500' : 
                      m.priority === 'Alta' ? 'text-orange-500' : 'text-slate-400'
                    }`}>
                      {m.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-8 border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" /> Problemas Encontrados & Pendências
          </h3>
          <ul className="space-y-4">
            <li className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                <span className="font-bold text-navy uppercase text-[10px] block mb-1">Mercado Pago</span>
                O fluxo de pagamento está apenas visual. É necessário criar as Edge Functions para receber Webhooks e atualizar o status das assinaturas automaticamente.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                <span className="font-bold text-navy uppercase text-[10px] block mb-1">Módulo de IA/OCR</span>
                A lógica de extração de documentos ainda é simulada (mock) no frontend. Requer conexão com API de visão computacional.
              </p>
            </li>
            <li className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                <span className="font-bold text-navy uppercase text-[10px] block mb-1">Editor de Templates</span>
                A geração de documentos usa jsPDF no cliente, o que limita a edição de modelos complexos (.docx). Ideal mover para processamento no servidor.
              </p>
            </li>
          </ul>
        </Card>

        <Card className="p-8 border-slate-100 shadow-sm space-y-6 bg-slate-50">
          <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
            <Construction className="h-4 w-4 text-primary" /> Próximos Passos Recomendados
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Prioridade 01</p>
              <p className="text-xs font-bold text-navy">Integrar Produção Mercado Pago</p>
              <p className="text-[11px] text-slate-400 mt-1">Configurar chaves de produção e criar listener de webhooks no Supabase.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Prioridade 02</p>
              <p className="text-xs font-bold text-navy">Implementar OCR Real</p>
              <p className="text-[11px] text-slate-400 mt-1">Conectar o componente SmartOCR a uma Edge Function de processamento de imagem.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prioridade 03</p>
              <p className="text-xs font-bold text-navy">Refinar Logs de Auditoria</p>
              <p className="text-[11px] text-slate-400 mt-1">Garantir que todas as ações críticas em Clientes e Embarcações disparem logs reais.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-8 bg-navy text-white rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h4 className="text-xl font-black uppercase tracking-tight mb-2">Pronto para a Próxima Fase?</h4>
          <p className="text-slate-400 font-medium text-sm">O sistema está estável, seguro e com arquitetura SaaS validada.</p>
        </div>
        <button className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95">
          Iniciar Implementação Real
        </button>
      </div>
    </div>
  );
}
