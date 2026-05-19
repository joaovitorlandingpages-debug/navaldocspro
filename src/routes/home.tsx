import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Anchor, Ship, FileText, CheckCircle, Shield, ArrowRight, Menu, X, Users, Settings, LogIn, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/home")({
  component: Index,
});

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Anchor className="h-8 w-8 text-primary" />
              <span className="text-xl font-black tracking-tighter text-navy uppercase">NavalDocs <span className="text-primary">Pro</span></span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#solucao" className="text-sm font-medium hover:text-primary transition-colors">Solução</a>
              <a href="#beneficios" className="text-sm font-medium hover:text-primary transition-colors">Benefícios</a>
              <a href="#planos" className="text-sm font-medium hover:text-primary transition-colors">Planos</a>
              <Link to="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Entrar</Link>
              <Link to="/auth/signup" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-all">Começar Grátis</Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-background border-b px-4 pt-2 pb-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
            <a href="#solucao" className="text-lg font-medium">Solução</a>
            <a href="#beneficios" className="text-lg font-medium">Benefícios</a>
            <a href="#planos" className="text-lg font-medium">Planos</a>
            <hr />
            <Link to="/auth/login" className="text-lg font-medium">Entrar</Link>
            <Link to="/auth/signup" className="bg-primary text-primary-foreground px-4 py-3 rounded-md text-center font-bold">Começar Grátis</Link>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 bg-slate-50">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest shadow-sm">
                  <Zap className="h-3 w-3 animate-pulse" />
                  Inteligência Artificial Naval de Nível Nacional
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-navy leading-[1.1] tracking-tighter">
                  A era da automação <span className="text-primary italic">operacional</span> chegou.
                </h1>
                <p className="text-xl text-slate-600 max-w-xl leading-relaxed">
                  NavalDocs Pro: A plataforma Enterprise que transforma burocracia complexa em fluxos de trabalho inteligentes e automatizados.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth/signup" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2">
                    Começar Grátis <ArrowRight className="h-5 w-5" />
                  </Link>
                  <button className="border-2 border-primary/20 bg-white text-navy px-8 py-4 rounded-lg text-lg font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    Falar com Consultor
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                  </div>
                  <span>+500 profissionais já utilizam o NavalDocs Pro</span>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden group">
                   <div className="h-8 bg-slate-100 border-b flex items-center px-4 gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                   </div>
                   <div className="p-6 space-y-4">
                      <div className="h-12 w-1/3 bg-slate-100 rounded-md animate-pulse" />
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-24 bg-primary/5 rounded-lg" />
                        <div className="h-24 bg-primary/5 rounded-lg" />
                        <div className="h-24 bg-primary/5 rounded-lg" />
                      </div>
                      <div className="h-48 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                        Visualização do Dashboard
                      </div>
                   </div>
                </div>
                <div className="absolute -bottom-6 -left-6 bg-navy text-white p-6 rounded-xl shadow-xl hidden lg:block">
                  <p className="text-3xl font-bold">98%</p>
                  <p className="text-xs opacity-70">Redução em erros de documentação</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problems/Solutions */}
        <section id="solucao" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-navy">Chega de planilhas e pastas físicas</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Desenvolvemos as ferramentas certas para quem lida com a complexidade do mar todos os dias.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Automação de Documentos</h3>
              <p className="text-muted-foreground">Gere memoriais descritivos, ARTs e certificados com apenas alguns cliques usando templates inteligentes.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
                <Ship className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestão de Embarcações</h3>
              <p className="text-muted-foreground">Controle histórico, vistorias e datas de renovação de toda a frota dos seus clientes em tempo real.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">CRM para Despachantes</h3>
              <p className="text-muted-foreground">Acompanhe o status de cada processo na Marinha e mantenha seus clientes informados automaticamente.</p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="beneficios" className="py-24 bg-navy text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                   <h2 className="text-3xl lg:text-5xl font-bold mb-8 italic text-primary">Confiabilidade Técnica e Jurídica</h2>
                   <div className="space-y-6">
                      {[
                        { title: "Sincronização com Normas", desc: "Templates sempre atualizados com as normas da DPC e Marinha do Brasil." },
                        { title: "Segurança de Dados", desc: "Criptografia de ponta a ponta para proteger projetos e dados sensíveis." },
                        { title: "Acesso Mobile", desc: "Acesse documentos e vistorias diretamente do estaleiro ou porto pelo celular." },
                        { title: "Logs de Auditoria", desc: "Saiba exatamente quem editou o quê e quando em cada processo naval." }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                           <div className="mt-1 flex-shrink-0 bg-primary/20 p-1 rounded">
                              <CheckCircle className="h-5 w-5 text-primary" />
                           </div>
                           <div>
                              <h4 className="font-bold text-lg">{item.title}</h4>
                              <p className="text-slate-400">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                   <div className="text-center mb-10">
                      <span className="text-primary font-mono text-sm uppercase tracking-widest">Feedback Real</span>
                   </div>
                   <blockquote className="text-2xl font-light italic text-slate-200 mb-8">
                     "O NavalDocs Pro reduziu o tempo que eu levava para entregar um memorial técnico de 4 dias para 30 minutos. É uma ferramenta indispensável para o engenheiro naval moderno."
                   </blockquote>
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-400" />
                      <div>
                         <p className="font-bold">Eng. Ricardo Almeida</p>
                         <p className="text-sm text-slate-400 italic text-primary">Almeida Engenharia Naval</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="planos" className="py-24 bg-slate-50">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                 <h2 className="text-4xl font-bold text-navy">Planos sob medida</h2>
                 <p className="text-muted-foreground mt-4">Escolha a potência certa para o seu negócio.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { name: "Individual", price: "R$ 149", features: ["Até 10 embarcações", "Documentos ilimitados", "Suporte por e-mail", "1 Usuário"] },
                   { name: "Profissional", price: "R$ 299", features: ["Embarcações ilimitadas", "Suporte prioritário", "Assinatura digital", "Até 5 usuários"], popular: true },
                   { name: "Empresa", price: "Sob consulta", features: ["Multi-escritórios", "API de Integração", "Manager dedicado", "Usuários ilimitados"] }
                 ].map((plan, idx) => (
                   <div key={idx} className={`relative p-8 rounded-2xl border ${plan.popular ? 'border-primary shadow-xl bg-white scale-105 z-10' : 'bg-white border-slate-200'}`}>
                      {plan.popular && <span className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Mais Escolhido</span>}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.price !== "Sob consulta" && <span className="text-muted-foreground text-sm">/mês</span>}
                      </div>
                      <ul className="space-y-4 mb-8 text-sm">
                         {plan.features.map((f, i) => (
                           <li key={i} className="flex items-center gap-2">
                             <CheckCircle className="h-4 w-4 text-primary" /> {f}
                           </li>
                         ))}
                      </ul>
                      <Link to="/auth/signup" className={`w-full block py-3 rounded-lg text-center font-bold transition-all ${plan.popular ? 'bg-primary text-white hover:opacity-90' : 'bg-slate-100 text-navy hover:bg-slate-200'}`}>
                        Escolher Plano
                      </Link>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
           <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-primary rounded-3xl p-12 lg:p-20 text-center text-white relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                 <h2 className="text-4xl lg:text-6xl font-bold mb-6 relative z-10">Pronto para elevar o nível da sua gestão naval?</h2>
                 <p className="text-xl opacity-80 mb-10 max-w-2xl mx-auto relative z-10">Crie sua conta agora e ganhe 14 dias de teste completo. Sem cartão de crédito.</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                    <Link to="/auth/signup" className="bg-white text-primary px-8 py-4 rounded-xl text-lg font-black hover:scale-105 transition-transform">Começar Agora</Link>
                    <button className="bg-navy/20 border border-white/20 px-8 py-4 rounded-xl text-lg font-bold hover:bg-navy/40 transition-colors">Agendar Demonstração</button>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-2 md:col-span-1">
                 <div className="flex items-center gap-2 text-white mb-6">
                    <Anchor className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold">NavalDocs Pro</span>
                 </div>
                 <p className="text-sm">A tecnologia que o setor naval brasileiro precisava para se digitalizar.</p>
              </div>
              <div>
                 <h4 className="text-white font-bold mb-4">Produto</h4>
                 <ul className="text-sm space-y-2">
                    <li><a href="#" className="hover:text-primary">Funcionalidades</a></li>
                    <li><a href="#" className="hover:text-primary">Planos</a></li>
                    <li><a href="#" className="hover:text-primary">Novidades</a></li>
                 </ul>
              </div>
              <div>
                 <h4 className="text-white font-bold mb-4">Empresa</h4>
                 <ul className="text-sm space-y-2">
                    <li><a href="#" className="hover:text-primary">Sobre nós</a></li>
                    <li><a href="#" className="hover:text-primary">Contato</a></li>
                    <li><a href="#" className="hover:text-primary">Termos</a></li>
                 </ul>
              </div>
              <div>
                 <h4 className="text-white font-bold mb-4">Suporte</h4>
                 <ul className="text-sm space-y-2">
                    <li><a href="#" className="hover:text-primary">Help Center</a></li>
                    <li><a href="#" className="hover:text-primary">Documentação</a></li>
                    <li><a href="#" className="hover:text-primary">Status</a></li>
                 </ul>
              </div>
           </div>
           <div className="pt-8 border-t border-slate-800 text-center text-xs">
              <p>&copy; {new Date().getFullYear()} NavalDocs Pro - Todos os direitos reservados. Marinha do Brasil e DPC são marcas registradas de seus respectivos órgãos.</p>
           </div>
        </div>
      </footer>
    </div>
  );
}
