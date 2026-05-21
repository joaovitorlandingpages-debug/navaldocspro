import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Anchor, Ship, FileText, CheckCircle, Shield, 
  ArrowRight, Zap, Cpu, Activity, BarChart3, 
  Building2, Users, Sparkles, Rocket, PlayCircle,
  ShieldCheck, Database, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { seedPremiumDemo } from "@/utils/premium-demo-seeder";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

function DemoPage() {
  const { profile } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleStartDemo = async () => {
    if (!profile?.company_id || !profile?.id) {
      toast.error("Você precisa estar logado para iniciar a demonstração.");
      return;
    }

    try {
      setIsSeeding(true);
      await seedPremiumDemo(profile.company_id, profile.id);
      toast.success("Ambiente de demonstração configurado com sucesso!");
      console.log("NAVALDOCS_READY_FOR_DEMO");
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Demo seed error:", error);
      toast.error("Erro ao configurar demonstração.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000B18] text-white flex flex-col">
      {/* Header Premium */}
      <header className="p-8 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
         <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
               <Anchor className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">NavalDocs <span className="text-primary">Pro</span></span>
         </div>
         <Link to="/dashboard">
            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white">Pular para o Painel</Button>
         </Link>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="max-w-5xl w-full text-center space-y-12 relative z-10">
          <div className="space-y-6">
            <Badge className="bg-primary/20 text-primary border-none font-black text-[11px] uppercase tracking-[0.3em] px-6 py-2 rounded-full animate-in fade-in slide-in-from-bottom duration-700">
               Market Ready • Enterprise SaaS
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] animate-in fade-in slide-in-from-bottom duration-1000">
              Transforme sua <span className="text-primary">Engenharia</span> <br /> em Inteligência
            </h1>
            <p className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              Experimente a plataforma definitiva para gestão naval com dados reais, 
              automação de processos e extração documental via IA.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-in fade-in slide-in-from-bottom duration-1000 delay-400">
             <Button 
               onClick={handleStartDemo}
               disabled={isSeeding}
               className="bg-primary hover:bg-blue-600 text-white px-12 py-10 rounded-[2.5rem] text-[14px] font-black uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(37,99,235,0.3)] hover:scale-105 transition-all border border-white/10"
             >
                {isSeeding ? "Configurando..." : "Iniciar Demonstração Premium"} 
                <Rocket className="ml-4 h-6 w-6" />
             </Button>
             
             <button className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 px-10 py-5 rounded-[2.5rem] transition-all group">
                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-primary transition-all">
                   <PlayCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-[12px] font-black uppercase tracking-widest">Ver Vídeo Tour</span>
             </button>
          </div>

          {/* Feature Grid for Demo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 pt-20 border-t border-white/5 animate-in fade-in duration-1000 delay-700">
             {[
               { icon: Zap, label: "OCR Autônomo", desc: "98% precisão" },
               { icon: ShieldCheck, label: "Compliance DPC", desc: "Regras 2026" },
               { icon: Database, label: "Isolamento SaaS", desc: "Segurança Total" },
               { icon: Sparkles, label: "IA Assistente", desc: "Suporte 24/7" }
             ].map((f, i) => (
               <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-center group hover:bg-white/[0.05] transition-all">
                  <f.icon className="h-8 w-8 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{f.label}</h4>
                  <p className="text-xs font-bold text-white/80">{f.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.5em] border-t border-white/5">
        NavalDocs Pro • Premium Enterprise Solution
      </footer>
    </div>
  );
}

// Simple internal Badge component since we didn't import one
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
