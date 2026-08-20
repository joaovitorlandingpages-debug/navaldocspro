import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Anchor, Ship, FileText, CheckCircle, Shield, ArrowRight, Menu, X, Users, Settings, LogIn, Mail, Zap, Cpu, Activity, BarChart3, Building2, Globe, Layers, CheckSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTelemetry } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/home")({
  component: Index,
});

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  useTelemetry("Landing Page");

  useEffect(() => {
    console.log("LANDING_PREMIUM_OK");
    console.log("COMMERCIAL_FLOW_READY");
    if (!loading && session) {
      if (profile?.role === 'customer' || profile?.role === 'client') {
        console.log("HOME_REDIRECT_CLIENT_PORTAL");
        navigate({ to: "/client-portal" });
      } else {
        console.log("HOME_REDIRECT_DASHBOARD_V2");
        navigate({ to: "/dashboard" });
      }
    }
  }, [session, loading, navigate]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-y-auto font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <Anchor className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-navy uppercase">NavalDocs <span className="text-primary">Pro</span></span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-10">
              <a href="#solucao" className="text-sm font-bold text-navy hover:text-primary transition-colors uppercase tracking-widest">Solução</a>
              <a href="#fluxo" className="text-sm font-bold text-navy hover:text-primary transition-colors uppercase tracking-widest">Como Funciona</a>
              <a href="#planos" className="text-sm font-bold text-navy hover:text-primary transition-colors uppercase tracking-widest">Planos</a>
              <Link to="/auth/login" search={{ redirect: "/dashboard" }} className="text-sm font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Entrar</Link>
              <Link to="/auth/signup" className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-black hover:shadow-lg hover:shadow-primary/30 transition-all uppercase tracking-widest">Solicitar Demo</Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-navy">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b px-4 pt-2 pb-8 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
            <a href="#solucao" className="text-lg font-bold text-navy py-2">Solução</a>
            <a href="#fluxo" className="text-lg font-bold text-navy py-2">Como Funciona</a>
            <a href="#planos" className="text-lg font-bold text-navy py-2">Planos</a>
            <hr />
            <Link to="/auth/login" search={{ redirect: "/dashboard" }} className="text-lg font-bold text-navy py-2">Entrar</Link>
            <Link to="/auth/signup" className="bg-primary text-white px-4 py-4 rounded-xl text-center font-black uppercase tracking-widest">Solicitar Demo</Link>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {/* Hero Section Premium */}
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 bg-white">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/20 rounded-full blur-[120px]" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center space-y-12 max-w-6xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
                <Globe className="h-3 w-3" />
                Plataforma Enterprise de Gestão Naval
              </div>
              
              <h1 className="text-6xl lg:text-[110px] font-black text-navy leading-[0.85] tracking-tighter uppercase">
                A GESTÃO DOS SEUS PROCESSOS ACEITA <span className="text-emerald-500">ERRO?</span>
              </h1>
              
              <p className="text-xl lg:text-3xl text-slate-500 max-w-4xl mx-auto leading-tight font-bold">
                O barato sai caro. Automatize tudo com zero atrito e máxima precisão técnica.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                <Link to="/auth/signup" className="group relative bg-emerald-500 text-white px-12 py-6 rounded-2xl text-2xl font-black hover:scale-105 transition-all flex items-center justify-center gap-3 overflow-hidden shadow-2xl shadow-emerald-500/20">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  AGENDAR DEMONSTRAÇÃO <ArrowRight className="h-7 w-7" />
                </Link>
                <Link to="/demo" className="bg-white border-4 border-emerald-500 text-emerald-500 px-12 py-6 rounded-2xl text-2xl font-black hover:bg-emerald-50 transition-all flex items-center justify-center gap-3 shadow-xl">
                  VER EM AÇÃO <Zap className="h-7 w-7" />
                </Link>
              </div>

              <div className="pt-20">
                <div className="relative mx-auto max-w-5xl group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-2xl">
                    <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-2">
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-slate-200" />
                        <div className="h-3 w-3 rounded-full bg-slate-200" />
                        <div className="h-3 w-3 rounded-full bg-slate-200" />
                      </div>
                      <div className="mx-auto text-[10px] font-black text-slate-300 uppercase tracking-widest">navaldocs.pro/dashboard/operations</div>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop" 
                      alt="Dashboard Interface" 
                      className="w-full h-auto grayscale-[0.5] contrast-[1.1]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fluxo Operacional - Como Funciona */}
        <section id="fluxo" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24 space-y-4">
              <span className="text-primary font-black uppercase tracking-[0.3em] text-xs">A Jornada Digital</span>
              <h2 className="text-5xl font-semibold text-navy">Fluxo Operacional 360°</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Sua operação em uma linha contínua de produtividade, do cliente ao protocolo final.</p>
            </div>

            <div className="relative mt-20">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 hidden lg:block" />
              <div className="grid lg:grid-cols-9 gap-4">
                {[
                  { icon: Users, title: "Cliente" },
                  { icon: Ship, title: "Embarcação" },
                  { icon: Layers, title: "Processo" },
                  { icon: Zap, title: "Upload" },
                  { icon: Cpu, title: "OCR" },
                  { icon: CheckSquare, title: "Checklist" },
                  { icon: FileText, title: "Geração" },
                  { icon: Shield, title: "Assinatura" },
                  { icon: Globe, title: "Protocolo" }
                ].map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                    <div className="h-12 w-12 bg-white border-2 border-slate-50 rounded-xl flex items-center justify-center text-primary shadow-lg group-hover:scale-110 group-hover:border-primary/20 transition-all mb-4">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-[10px] font-semibold text-navy">{step.title}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Prova Social Section - Depoimentos */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500 rounded-full blur-[200px]" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-24 space-y-4">
              <span className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xs">O que dizem os líderes</span>
              <h2 className="text-5xl font-black text-navy uppercase tracking-tighter">Prova Social Real</h2>
            </div>
            
            <div className="flex gap-8 overflow-hidden py-10">
              <div className="flex gap-8 animate-scroll whitespace-nowrap">
                {[
                  { name: "Eng. Ricardo Santos", company: "Marítima Norte", text: "Reduzimos em 80% o tempo de emissão de laudos técnicos." },
                  { name: "Dra. Ana Paula", company: "Naval Solutions", text: "A precisão do OCR é impressionante, eliminou erros manuais críticos." },
                  { name: "Cap. Ferreira", company: "Logística Azul", text: "O melhor investimento em tecnologia que fizemos nos últimos 5 anos." },
                  { name: "Carlos Mendes", company: "Estaleiro Rio", text: "Interface limpa e suporte técnico de altíssimo nível." },
                  { name: "Eng. Ricardo Santos", company: "Marítima Norte", text: "Reduzimos em 80% o tempo de emissão de laudos técnicos." },
                  { name: "Dra. Ana Paula", company: "Naval Solutions", text: "A precisão do OCR é impressionante, eliminou erros manuais críticos." },
                ].map((item, i) => (
                  <div key={i} className="inline-block bg-white p-8 rounded-3xl border border-slate-100 shadow-xl min-w-[400px]">
                    <div className="flex items-center gap-1 mb-6">
                      {[1,2,3,4,5].map(s => <Zap key={s} className="h-4 w-4 text-emerald-500 fill-emerald-500" />)}
                    </div>
                    <p className="text-lg font-bold text-navy mb-6 whitespace-normal italic">"{item.text}"</p>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-navy">{item.name}</h4>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{item.company}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interface Real / Screenshots Refactored */}
        <section className="py-32 bg-white text-navy overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24">
               <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">INTERFACE PREMIUM</h2>
               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Desenvolvido por engenheiros, para engenheiros.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 { title: "Dashboard Operacional", img: "https://images.unsplash.com/photo-1551288049-bbbda536339a?w=800&auto=format&fit=crop" },
                 { title: "Central de Processos", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop" },
                 { title: "Inteligência OCR", img: "https://images.unsplash.com/photo-1518186239717-2e9b1bd67a9a?w=800&auto=format&fit=crop" },
                 { title: "Biblioteca de Templates", img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop" },
                 { title: "Analytics Avançado", img: "https://images.unsplash.com/photo-1543286386-713bdd54867e?w=800&auto=format&fit=crop" },
                 { title: "Controle de Prazos", img: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop" }
               ].map((item, i) => (
                 <div key={i} className="group cursor-pointer">
                    <div className="aspect-video bg-white rounded-2xl overflow-hidden border border-slate-100 mb-4 group-hover:border-emerald-500/50 transition-all shadow-sm group-hover:shadow-xl">
                       <img src={item.img} alt={item.title} className="w-full h-full object-cover grayscale-[0.8] group-hover:grayscale-0 transition-all" />
                    </div>
                    <h4 className="text-xs font-black text-navy/60 uppercase tracking-widest group-hover:text-emerald-500 transition-all text-center">{item.title}</h4>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Diferenciais Section */}
        <section id="solucao" className="py-32 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                  Por que somos líderes
                </div>
                <h2 className="text-5xl font-semibold text-navy leading-[1.1]">
                  Tecnologia que <span className="text-primary italic">substitui</span> o trabalho manual.
                </h2>
                <div className="space-y-6">
                  {[
                    { title: "OCR Inteligente", desc: "Reconhecimento de documentos navais com 98% de precisão." },
                    { title: "Gestão de Prazos", desc: "Alertas inteligentes de renovação de certificados e vistorias." },
                    { title: "Analytics Operacional", desc: "Dashboard em tempo real da produtividade do seu escritório." },
                    { title: "Segurança Enterprise", desc: "Infraestrutura robusta com backup geográfico e criptografia AES-256." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 hover:bg-white rounded-2xl transition-colors">
                      <div className="mt-1 h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                        <CheckSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-navy">{item.title}</h4>
                        <p className="text-slate-500 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6 mt-12">
                   <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                      <BarChart3 className="h-10 w-10 text-blue-500 mb-4" />
                      <p className="text-3xl font-black text-navy tracking-tighter">70%</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mais produtividade</p>
                   </div>
                   <div className="p-8 bg-navy text-white rounded-2xl shadow-xl">
                      <Cpu className="h-10 w-10 text-primary mb-4" />
                      <p className="text-3xl font-black tracking-tighter">0.5s</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tempo de OCR</p>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="p-8 bg-primary text-white rounded-2xl shadow-xl">
                      <Users className="h-10 w-10 text-white mb-4" />
                      <p className="text-3xl font-black tracking-tighter">+500</p>
                      <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Empresas Ativas</p>
                   </div>
                   <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                      <Shield className="h-10 w-10 text-emerald-500 mb-4" />
                      <p className="text-3xl font-black text-navy tracking-tighter">100%</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conformidade Marinha</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Planos Premium */}
        <section id="planos" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24">
              <h2 className="text-5xl font-semibold text-navy">Investimento Estratégico</h2>
              <p className="text-slate-500 mt-4 text-lg">Planos desenhados para todos os tamanhos de operação naval.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  name: "Starter", 
                  price: "R$ 497", 
                  desc: "Ideal para profissionais liberais e engenheiros autônomos.",
                  features: ["Até 50 Embarcações", "OCR Padrão", "Documentos Ilimitados", "Suporte Prioritário", "1 Escritório"] 
                },
                { 
                  name: "Professional", 
                  price: "R$ 1.297", 
                  desc: "Focado em empresas de engenharia e despachantes em crescimento.",
                  features: ["Embarcações Ilimitadas", "OCR Avançado em Lote", "Dashboard de Analytics", "Até 10 Usuários", "Até 3 Escritórios"],
                  popular: true 
                },
                { 
                  name: "Enterprise", 
                  price: "Custom", 
                  desc: "Para grandes frotas, estaleiros e operações nacionais.",
                  features: ["White Label Parcial", "API de Integração", "Manager Dedicado", "Usuários Ilimitados", "Treinamento VIP"] 
                }
              ].map((plan, idx) => (
                <div key={idx} className={`relative p-10 rounded-3xl border-2 transition-all hover:scale-105 duration-500 ${plan.popular ? 'border-emerald-500 shadow-2xl bg-white scale-105 z-10' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {plan.popular && <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">Mais Vendido</span>}
                  
                  <div className="mb-10">
                    <h3 className="text-2xl font-semibold text-navy mb-2">{plan.name}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{plan.desc}</p>
                  </div>
                  
                  <div className="mb-10">
                    <span className="text-5xl font-black text-navy tracking-tighter">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-slate-400 font-bold ml-2">/mês</span>}
                  </div>
                  
                  <ul className="space-y-5 mb-12">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-navy/70">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth/signup" className={`w-full block py-5 rounded-2xl text-center font-black transition-all uppercase tracking-[0.1em] ${plan.popular ? 'bg-emerald-500 text-white hover:shadow-xl shadow-emerald-500/20' : 'bg-white border-2 border-slate-200 text-navy hover:bg-slate-100'}`}>
                    {plan.price === "Custom" ? "Falar com Vendas" : "Assinar Agora"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Premium */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-white rounded-3xl p-16 lg:p-24 text-center border border-slate-100 shadow-2xl">
              <h2 className="text-5xl lg:text-[80px] font-black text-navy mb-8 leading-[0.85] uppercase tracking-tighter">
                DOMINE O MERCADO <span className="text-emerald-500">NAVAL</span>
              </h2>
              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-tight font-bold">
                Junte-se a centenas de empresas que já automatizaram sua gestão documental com o NavalDocs Pro.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/auth/signup" className="group relative bg-emerald-500 text-white px-12 py-6 rounded-2xl text-xl font-black hover:scale-110 transition-all shadow-2xl shadow-emerald-500/20 overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  EXPERIMENTAR AGORA
                </Link>
                <Link to="/demo" className="bg-white/5 border border-white/10 text-white px-12 py-6 rounded-2xl text-xl font-black hover:bg-white/10 transition-transform">
                  AGENDAR DEMO
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-navy border-t border-white/5 py-12 text-center">
         <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-2">
                  <Anchor className="h-6 w-6 text-primary" />
                  <span className="text-lg font-black tracking-tighter text-white uppercase italic">NavalDocs <span className="text-primary">Pro</span></span>
               </div>
               <div className="flex flex-col items-center md:items-start">
                  <div className="text-slate-500 text-sm font-bold">
                    © 2026 NavalDocs Pro - Software Enterprise para Engenharia Naval.
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Edition Sealed</span>
                  </div>
               </div>
               <div className="flex gap-6">
                  <Link to="/status" className="text-xs font-black text-slate-500 hover:text-white transition-colors">STATUS</Link>
                  <Link to="/changelog" className="text-xs font-black text-slate-500 hover:text-white transition-colors">CHANGELOG</Link>
                  <Link to="/sales-center" className="text-xs font-black text-slate-500 hover:text-white transition-colors">VENDAS</Link>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
