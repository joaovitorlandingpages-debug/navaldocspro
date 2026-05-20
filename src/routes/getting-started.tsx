import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Rocket, Users, Ship, ClipboardList, 
  Zap, FileText, CheckCircle2, PlayCircle,
  ArrowRight, Sparkles, BookOpen, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/getting-started')({
  component: GettingStartedPage,
});

function GettingStartedPage() {
  const { profile } = useAuth();
  
  const { data: onboardingStats } = useQuery({
    queryKey: ['onboarding-progress', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return { percent: 0, steps: [] };
      
      const [
        { count: customersCount },
        { count: vesselsCount },
        { count: processesCount },
        { count: documentsCount }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('vessels').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id)
      ]);

      const steps = [
        { id: 'company', title: 'Configurar Empresa', completed: !!profile.companies?.name, icon: <Sparkles className="h-4 w-4" /> },
        { id: 'customer', title: 'Primeiro Cliente', completed: (customersCount || 0) > 0, icon: <Users className="h-4 w-4" /> },
        { id: 'vessel', title: 'Primeira Embarcação', completed: (vesselsCount || 0) > 0, icon: <Ship className="h-4 w-4" /> },
        { id: 'process', title: 'Criar Processo', completed: (processesCount || 0) > 0, icon: <ClipboardList className="h-4 w-4" /> },
        { id: 'ocr', title: 'Testar OCR', completed: (documentsCount || 0) > 0, icon: <Zap className="h-4 w-4" /> },
      ];

      const completed = steps.filter(s => s.completed).length;
      return {
        percent: Math.round((completed / steps.length) * 100),
        steps
      };
    },
    enabled: !!profile?.company_id
  });

  console.log("GETTING_STARTED_READY");

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
          <Rocket className="h-3 w-3" /> Bem-vindo ao NavalDocs Pro
        </div>
        <h1 className="text-4xl font-black text-navy uppercase tracking-tight">Primeiros Passos</h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Preparamos este guia para você dominar a plataforma e automatizar sua operação naval em minutos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 p-8 rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/50 bg-white">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-navy">Progresso de Implantação</h3>
            <span className="text-2xl font-black text-primary">{onboardingStats?.percent || 0}%</span>
          </div>
          <Progress value={onboardingStats?.percent || 0} className="h-3 mb-10 bg-slate-100" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingStats?.steps.map((step) => (
              <div 
                key={step.id} 
                className={`p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                  step.completed 
                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 grayscale hover:grayscale-0 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    step.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300'
                  }`}>
                    {step.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">{step.title}</span>
                </div>
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-8 bg-navy text-white rounded-[2.5rem] relative overflow-hidden shadow-2xl border-none group">
            <PlayCircle className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Tutorial em Vídeo</h4>
            <p className="text-sm font-bold leading-relaxed mb-6">Aprenda a criar seu primeiro processo em menos de 2 minutos.</p>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-6">
              Assistir Agora <PlayCircle className="ml-2 h-4 w-4" />
            </Button>
          </Card>

          <Card className="p-8 border-slate-100 rounded-[2.5rem] bg-white shadow-lg">
            <h4 className="text-xs font-black uppercase tracking-widest text-navy mb-6 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Base de Conhecimento
            </h4>
            <div className="space-y-4">
              <a href="#" className="block text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest border-b border-slate-50 pb-2">Como funciona o OCR?</a>
              <a href="#" className="block text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest border-b border-slate-50 pb-2">Gerando documentos PDF</a>
              <a href="#" className="block text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Configurações de Equipe</a>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-white to-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-6">
          <div className="h-16 w-16 bg-primary/10 rounded-[2rem] flex items-center justify-center">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-black text-navy uppercase tracking-tight">Criar Primeiro Processo</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Inicie o fluxo de automação vinculando um cliente e uma embarcação para gerar sua documentação técnica.
          </p>
          <Link to="/processes" className="w-full">
            <Button className="w-full rounded-2xl py-7 bg-navy hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest">
              Começar Agora <ArrowRight className="ml-2 h-4 w-4 text-primary" />
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-6">
          <div className="h-16 w-16 bg-cyan-50 rounded-[2rem] flex items-center justify-center">
            <Zap className="h-8 w-8 text-cyan-500" />
          </div>
          <h3 className="text-xl font-black text-navy uppercase tracking-tight">Testar Central OCR</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Suba um documento (RG, CNH ou TIE) e veja nossa inteligência extrair os dados automaticamente.
          </p>
          <Link to="/ocr-center" className="w-full">
            <Button className="w-full rounded-2xl py-7 bg-cyan-600 hover:bg-cyan-700 text-[10px] font-black uppercase tracking-widest">
              Acessar Central <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
