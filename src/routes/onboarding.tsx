import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Building, CreditCard, Users, Ship, 
  ClipboardList, FileText, CheckCircle2, 
  ChevronRight, ArrowLeft, Loader2, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingFlow,
});

function OnboardingFlow() {
  const { profile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: "",
    cnpj: "",
    phone: "",
    email: "",
    plan: "Free",
  });

  useEffect(() => {
    if (!loading && !profile) {
      navigate({ to: "/auth/login" });
    }
    if (profile?.companies?.onboarding_status === 'completed') {
      navigate({ to: "/dashboard" });
    }
    if (profile?.companies) {
      setFormData({
        companyName: profile.companies.name || "",
        cnpj: profile.companies.cnpj || "",
        phone: profile.companies.phone || "",
        email: profile.companies.email || "",
        plan: profile.companies.plan || "Free",
      });
      setStep(profile.companies.onboarding_step || 1);
    }
  }, [profile, loading]);

  const updateStep = async (nextStep: number, data?: any) => {
    setIsSubmitting(true);
    try {
      if (!profile?.company_id) throw new Error("No company linked");

      const updates: any = { 
        onboarding_step: nextStep,
        ...(data || {})
      };

      if (nextStep > 7) {
        updates.onboarding_status = 'completed';
      }

      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", profile.company_id);

      if (error) throw error;
      
      if (nextStep > 7) {
        toast.success("Bem-vindo ao NavalDocs Pro!");
        navigate({ to: "/dashboard" });
      } else {
        setStep(nextStep);
      }
    } catch (error: any) {
      toast.error("Erro ao salvar progresso: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-2">
                <Building className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Dados da Empresa</h2>
              <p className="text-slate-500">Vamos começar configurando o perfil da sua empresa.</p>
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Nome da Empresa</label>
                <Input 
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Ex: Engenharia Naval Mar Azul"
                  className="h-12 border-slate-100 bg-slate-50/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">CNPJ</label>
                  <Input 
                    value={formData.cnpj}
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="00.000.000/0001-00"
                    className="h-12 border-slate-100 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Telefone</label>
                  <Input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="h-12 border-slate-100 bg-slate-50/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">E-mail Corporativo</label>
                <Input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="contato@empresa.com.br"
                  className="h-12 border-slate-100 bg-slate-50/50"
                />
              </div>
            </div>

            <Button 
              onClick={() => updateStep(2, { 
                name: formData.companyName, 
                cnpj: formData.cnpj, 
                phone: formData.phone, 
                email: formData.email 
              })}
              disabled={!formData.companyName || isSubmitting}
              className="w-full h-14 text-lg font-bold bg-navy"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Próxima Etapa <ChevronRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-emerald-100 rounded-full text-emerald-600 mb-2">
                <CreditCard className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Escolha seu Plano</h2>
              <p className="text-slate-500">Selecione o plano que melhor atende suas necessidades.</p>
            </div>

            <div className="grid gap-4">
               {[
                 { name: "Starter", price: "Grátis", desc: "Para profissionais liberais" },
                 { name: "Pro", price: "R$ 297/mês", desc: "Para pequenas empresas", highlight: true },
                 { name: "Enterprise", price: "Sob consulta", desc: "Para grandes frotas" }
               ].map((p) => (
                 <button 
                   key={p.name}
                   onClick={() => updateStep(3, { plan: p.name })}
                   className={`p-6 rounded-2xl border-2 text-left transition-all ${p.highlight ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                 >
                    <div className="flex justify-between items-center mb-1">
                       <h4 className="font-bold text-navy">{p.name}</h4>
                       <p className="font-black text-primary">{p.price}</p>
                    </div>
                    <p className="text-sm text-slate-500">{p.desc}</p>
                 </button>
               ))}
            </div>
            
            <button 
              onClick={() => setStep(1)} 
              className="w-full text-slate-400 font-bold text-xs uppercase hover:text-navy transition-all"
            >
              Voltar para dados da empresa
            </button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 text-center animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center space-y-2 mb-8">
              <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 mb-2">
                <Users className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Perfil de Administrador</h2>
              <p className="text-slate-500">Confirmamos que você será o administrador master da conta.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 inline-block w-full">
               <div className="flex items-center gap-4 justify-center">
                  <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {profile?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                     <p className="font-bold text-navy">{profile?.name}</p>
                     <p className="text-xs text-slate-400 font-medium">{profile?.email}</p>
                  </div>
               </div>
            </div>

            <Button 
              onClick={() => updateStep(4)}
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-bold bg-navy"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Confirmar e Continuar <ChevronRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-blue-100 rounded-full text-blue-600 mb-2">
                <Users className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Primeiro Cliente</h2>
              <p className="text-slate-500">Crie seu primeiro cliente para começar a organizar processos.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
               <p className="text-slate-500 mb-6">Você pode pular esta etapa e fazer depois no dashboard, ou criar agora para agilizar.</p>
               <Button variant="outline" onClick={() => updateStep(5)} className="mr-2">Pular por enquanto</Button>
               <Button onClick={() => updateStep(5)} className="bg-primary">Criar Cliente Agora</Button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-cyan-100 rounded-full text-cyan-600 mb-2">
                <Ship className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Primeira Embarcação</h2>
              <p className="text-slate-500">Adicione uma embarcação para vincular aos documentos.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
               <Button variant="outline" onClick={() => updateStep(6)} className="mr-2">Pular</Button>
               <Button onClick={() => updateStep(6)} className="bg-primary">Adicionar Embarcação</Button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-amber-100 rounded-full text-amber-600 mb-2">
                <ClipboardList className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-navy uppercase">Primeiro Processo</h2>
              <p className="text-slate-500">Tudo pronto para criar seu primeiro processo de engenharia.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
               <Button variant="outline" onClick={() => updateStep(7)} className="mr-2">Pular</Button>
               <Button onClick={() => updateStep(7)} className="bg-primary">Abrir Processo</Button>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <div className="p-4 bg-green-100 rounded-full text-green-600 mb-2">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-navy uppercase">Tudo Configurado!</h2>
              <p className="text-slate-500">Você está pronto para revolucionar sua gestão documental naval.</p>
            </div>
            
            <div className="bg-navy text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="relative z-10 text-center">
                  <h4 className="text-xl font-bold mb-4">Bem-vindo a Bordo</h4>
                  <p className="text-white/70 mb-8">Sua empresa agora tem acesso a todas as ferramentas profissionais do NavalDocs Pro.</p>
                  <Button 
                    onClick={() => updateStep(8)}
                    className="bg-primary text-white hover:bg-primary/90 w-full h-14 text-lg font-black uppercase tracking-widest"
                  >
                    Começar Agora
                  </Button>
               </div>
               <Ship className="absolute -right-10 -bottom-10 h-48 w-48 text-white/5 rotate-12" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  const steps = [
    { id: 1, label: "Empresa", icon: <Building className="h-4 w-4" /> },
    { id: 2, label: "Plano", icon: <CreditCard className="h-4 w-4" /> },
    { id: 3, label: "Usuário", icon: <Users className="h-4 w-4" /> },
    { id: 4, label: "Cliente", icon: <Users className="h-4 w-4" /> },
    { id: 5, label: "Barco", icon: <Ship className="h-4 w-4" /> },
    { id: 6, label: "Processo", icon: <ClipboardList className="h-4 w-4" /> },
    { id: 7, label: "Finalizar", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-6 flex justify-between items-center border-b bg-white z-10">
        <div className="flex items-center gap-2">
          <Ship className="h-6 w-6 text-primary" />
          <span className="font-bold text-navy uppercase tracking-tight">NavalDocs Pro Onboarding</span>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <div 
              key={s.id}
              className={`h-1.5 w-8 rounded-full transition-all ${s.id === step ? 'bg-primary w-12' : s.id < step ? 'bg-navy' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100">
           {renderStep()}
        </div>
      </main>

      <footer className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Sistema de Onboarding Inteligente - © 2024 NavalDocs Inc.
      </footer>
    </div>
  );
}
