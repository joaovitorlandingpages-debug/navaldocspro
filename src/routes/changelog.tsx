import { createFileRoute } from "@tanstack/react-router";
import { 
  Zap, Calendar, Tag, 
  ChevronRight, ArrowRight,
  Star, Rocket, Shield, Globe
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

function ChangelogPage() {
  const { data: releases } = useQuery({
    queryKey: ["system_changelog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_changelog")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Fallback data if empty
      if (!data || data.length === 0) {
        return [
          {
            version: "v20.5",
            title: "Controlled Evolution Phase",
            description: "NavalDocs Pro entra na fase de evolução controlada com sistema de feature flags, maturidade operacional e monitoramento de saúde em tempo real.",
            created_at: new Date().toISOString(),
            changes: [
              { type: 'feature', text: 'Sistema Enterprise de Feature Flags' },
              { type: 'feature', text: 'Painel de Maturidade & Evolução Admin' },
              { type: 'feature', text: 'Monitoramento de Saúde em Tempo Real' },
              { type: 'security', text: 'Auditoria Contínua de Segurança & RLS' }
            ]
          },
          {
            version: "v20.0",
            title: "Commercial Scale Ready",
            description: "NavalDocs Pro atinge maturidade absoluta para operação nacional em larga escala, com novos módulos de demonstração e apresentação premium.",
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            changes: [
              { type: 'feature', text: 'Modo Demonstração Premium Integrado' },
              { type: 'feature', text: 'Apresentação Comercial Interna' },
              { type: 'feature', text: 'Infraestrutura de Escala SaaS' },
              { type: 'security', text: 'Consolidação Final de Segurança LGPD' }
            ]
          },
          {
            version: "v15.0",
            title: "Final Enterprise Gold Edition",
            description: "A versão mais estável e poderosa do NavalDocs Pro, focada em escala nacional e operação enterprise.",
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            changes: [
              { type: 'feature', text: 'Novo Sistema de Inteligência Operacional' },
              { type: 'feature', text: 'Dashboard Comercial & Pilot Tracking' },
              { type: 'fix', text: 'Otimização crítica do motor de OCR' },
              { type: 'security', text: 'Auditoria completa de RLS e Permissões' }
            ]
          }
        ];
      }
      return data;
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'fix': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'security': return 'text-indigo-500 bg-indigo-50 border-indigo-100';
      case 'improvement': return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      <header className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
           <Rocket className="h-3 w-3 text-primary" /> Roadmap & Evolução
        </div>
        <h1 className="text-5xl font-semibold text-navy">O que há de novo</h1>
        <p className="text-slate-500 max-w-xl mx-auto font-medium">Acompanhe a evolução constante do NavalDocs Pro rumo ao padrão global de automação naval.</p>
      </header>

      <div className="relative space-y-12 before:absolute before:left-[1.25rem] before:top-4 before:bottom-4 before:w-px before:bg-slate-100">
        {releases?.map((release: any, i: number) => (
          <div key={i} className="relative pl-12 group">
            <div className="absolute left-0 top-1.5 h-10 w-10 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center z-10 group-hover:border-primary transition-all duration-500 group-hover:scale-110">
               <Tag className="h-5 w-5 text-slate-400 group-hover:text-primary transition-all" />
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">{release.version}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                           <Calendar className="h-3 w-3" /> {new Date(release.created_at).toLocaleDateString()}
                        </div>
                     </div>
                     <h2 className="text-2xl font-semibold text-navy">{release.title}</h2>
                  </div>
                  <button className="text-[10px] font-black uppercase text-slate-400 hover:text-navy flex items-center gap-2 transition-all">
                     Compartilhar <ArrowRight className="h-4 w-4" />
                  </button>
               </div>

               <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{release.description}</p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(release.changes as any[])?.map((change, j) => (
                    <div key={j} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                       <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${change.type === 'feature' ? 'bg-emerald-500' : change.type === 'fix' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                       <div>
                          <p className="text-xs font-bold text-navy">{change.text}</p>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{change.type}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center">
         <div className="bg-navy p-12 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
            <Star className="absolute -left-12 -top-12 h-48 w-48 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
               <h3 className="text-3xl font-semibold mb-4">Tem uma sugestão?</h3>
               <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">Sua opinião guia nossa evolução. Se você sente falta de algo, nos conte agora mesmo.</p>
               <button className="bg-primary text-navy px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 mx-auto">
                  <Zap className="h-4 w-4" /> Enviar Sugestão
               </button>
            </div>
         </div>
      </footer>
    </div>
  );
}
