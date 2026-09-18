import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowRight, 
  Menu, 
  X, 
  Search, 
  Bell, 
  Plus, 
  FileText, 
  FolderGit2, 
  FolderCheck,
  CalendarCheck, 
  ChevronRight, 
  ClipboardList
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTelemetry } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/home")({
  component: LandingPage,
});

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  useTelemetry("Landing Page");

  useEffect(() => {
    if (!loading && session) {
      if (profile?.role === "customer" || profile?.role === "client") {
        navigate({ to: "/client-portal" });
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  }, [session, loading, navigate]);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f1d36] font-sans antialiased flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* 1. CABEÇALHO */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo oficial da identidade visual com tamanho ampliado e sem margens transparentes */}
          <Link to="/" className="flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1">
            <img 
              src="/navaldocs-logo.png" 
              alt="NavalDocs Pro" 
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              width="200"
              height="45"
            />
          </Link>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Navegação Principal">
            <button 
              onClick={() => scrollToSection("solucao")} 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-2 py-1"
            >
              Solução
            </button>
            <button 
              onClick={() => scrollToSection("como-funciona")} 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-2 py-1"
            >
              Como funciona
            </button>
            <button 
              onClick={() => scrollToSection("recursos")} 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-2 py-1"
            >
              Recursos
            </button>
          </nav>

          {/* Ações Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/auth/login" 
              search={{ redirect: "/dashboard" }} 
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              Entrar
            </Link>
            <Link 
              to="/auth/signup" 
              className="bg-[#1868db] hover:bg-[#1456b8] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-98"
            >
              Começar agora
            </Link>
          </div>

          {/* Ações Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <Link 
              to="/auth/login" 
              search={{ redirect: "/dashboard" }} 
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              Entrar
            </Link>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMenuOpen}
              className="p-2 text-slate-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu Responsivo Mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 flex flex-col gap-3 shadow-lg">
            <button 
              onClick={() => scrollToSection("solucao")} 
              className="text-left text-base font-medium text-slate-700 hover:text-blue-600 py-2.5 px-3 rounded-md hover:bg-slate-50 transition-colors"
            >
              Solução
            </button>
            <button 
              onClick={() => scrollToSection("como-funciona")} 
              className="text-left text-base font-medium text-slate-700 hover:text-blue-600 py-2.5 px-3 rounded-md hover:bg-slate-50 transition-colors"
            >
              Como funciona
            </button>
            <button 
              onClick={() => scrollToSection("recursos")} 
              className="text-left text-base font-medium text-slate-700 hover:text-blue-600 py-2.5 px-3 rounded-md hover:bg-slate-50 transition-colors"
            >
              Recursos
            </button>
            <div className="border-t border-slate-100 my-1 pt-3 flex flex-col gap-3">
              <Link 
                to="/auth/signup" 
                onClick={() => setIsMenuOpen(false)}
                className="w-full bg-[#1868db] text-white text-center font-semibold py-3 rounded-lg shadow-sm hover:bg-[#1456b8] transition-colors"
              >
                Começar agora
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. APRESENTAÇÃO PRINCIPAL (HERO) */}
        <section className="relative overflow-hidden pt-6 pb-12 lg:pt-10 lg:pb-16 bg-[#f8fafc]">
          {/* Fotografia da marina integrada ao fundo inteiro no desktop conforme a referência visual */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden lg:block">
            <img 
              src="/hero-marina.jpg" 
              alt="" 
              className="w-full h-full object-cover object-bottom"
              loading="eager"
            />
            {/* Sobreposição clara sobre a área de texto para contraste perfeito e transparência suave no restante */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-transparent to-white/70" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
              {/* Coluna de Texto */}
              <div className="lg:col-span-5 text-left space-y-5 lg:pr-2">
                <div className="inline-block">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#1868db] bg-blue-50/90 border border-blue-100/80 px-3 py-1 rounded-full">
                    Gestão náutica simplificada
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-extrabold text-[#0f1d36] leading-[1.15] tracking-tight">
                  Seu processo náutico, do início à conclusão.
                </h1>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg">
                  Clientes, embarcações e documentos em um só lugar. Mais clareza para despachantes e engenheiros.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <Link 
                    to="/auth/signup" 
                    className="bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold px-6 py-3.5 rounded-lg shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-98"
                  >
                    <span>Começar agora</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button 
                    onClick={() => scrollToSection("solucao")} 
                    className="bg-white/95 hover:bg-white border border-slate-200 text-slate-700 hover:text-blue-600 font-semibold px-6 py-3.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Conhecer o sistema
                  </button>
                </div>

                {/* Assinatura script sutil sob os botões */}
                <div className="hidden sm:flex items-center gap-2 pt-1 text-slate-600/90 text-base lg:text-lg font-serif italic tracking-wide select-none">
                  <span>Mais tempo para o que importa</span>
                  <span className="text-[#1868db] text-base font-sans font-bold">~</span>
                </div>
              </div>

              {/* Coluna Visual: Dashboard Mockup */}
              <div className="lg:col-span-7 relative flex justify-center lg:justify-end">

                {/* Card do Painel (Interface Real de Demonstração) */}
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl lg:shadow-2xl border border-slate-200/80 overflow-hidden">
                  {/* Faixa náutica sutil para mobile no topo do card (no desktop o cenário está no fundo da página) */}
                  <div className="lg:hidden relative h-36 sm:h-44 w-full overflow-hidden">
                    <img 
                      src="/hero-marina.jpg" 
                      alt="Marina náutica com embarcações" 
                      className="w-full h-full object-cover object-center"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                    <div className="absolute bottom-2 right-4 transform -rotate-3 select-none pointer-events-none">
                      <span className="text-[#0f1d36]/80 text-sm font-serif italic tracking-wide drop-shadow-sm">
                        Mais tempo para o que importa ~
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 bg-white relative z-10">
                    {/* Header do Mockup */}
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-3">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src="/navaldocs-logo.png" 
                          alt="NavalDocs Pro" 
                          className="h-6 w-auto object-contain" 
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                          Demonstração
                        </span>
                      </div>

                      {/* Ações no cabeçalho do mockup (Desktop: busca e perfil / Mobile: ícone de menu) */}
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="relative w-44 lg:w-56">
                          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" 
                            disabled 
                            placeholder="Buscar processo, cliente..." 
                            className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                        <div className="relative">
                          <Bell className="h-4 w-4 text-slate-400" />
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                        </div>
                        <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                          RS
                        </div>
                      </div>

                      <div className="sm:hidden text-slate-400">
                        <Menu className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Saudação e Ação Principal do Painel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">Visão geral</h2>
                        <p className="text-[11px] sm:text-xs text-slate-500">Bom dia, Rafael! Aqui está o panorama dos seus processos.</p>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center gap-1.5 bg-[#1868db] text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-xs">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Novo processo</span>
                        </span>
                      </div>
                    </div>

                    {/* 3 Cartões de Indicadores (KPIs) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                      <div className="p-2 sm:p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            Processos<span className="hidden sm:inline"> em andamento</span>
                          </p>
                          <p className="text-sm sm:text-xl font-bold text-[#0f1d36]">12</p>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3 bg-red-50/50 rounded-xl border border-red-100/60 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-red-100/80 text-red-500 flex items-center justify-center shrink-0">
                          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            Pendências<span className="hidden sm:inline"> de hoje</span>
                          </p>
                          <p className="text-sm sm:text-xl font-bold text-[#0f1d36]">5</p>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <FolderCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            Documentos
                          </p>
                          <p className="text-sm sm:text-xl font-bold text-[#0f1d36]">248</p>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Pendências de Hoje */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">Pendências de hoje</h3>
                        <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-default flex items-center gap-0.5">
                          Ver todas <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Item 1 */}
                        <div className="p-2.5 sm:p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start sm:items-center gap-2.5">
                            <div className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#0f1d36]">Documentação da embarcação</p>
                              <p className="text-[11px] text-slate-400">Processo #2847 • Cliente: Marina Costa</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              Atrasado
                            </span>
                            <span className="text-[11px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded cursor-default">
                              Conferir documentos
                            </span>
                          </div>
                        </div>

                        {/* Item 2 */}
                        <div className="p-2.5 sm:p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start sm:items-center gap-2.5">
                            <div className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#0f1d36]">Assinatura do requerimento</p>
                              <p className="text-[11px] text-slate-400">Processo #2848 • Cliente: João Almeida</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                              Hoje
                            </span>
                            <span className="text-[11px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded cursor-default">
                              Solicitar assinatura
                            </span>
                          </div>
                        </div>

                        {/* Item 3 */}
                        <div className="p-2.5 sm:p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start sm:items-center gap-2.5">
                            <div className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#0f1d36]">Comprovante de pagamento</p>
                              <p className="text-[11px] text-slate-400">Processo #2850 • Cliente: Azul Navegação</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                              Em dia
                            </span>
                            <span className="text-[11px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded cursor-default">
                              Conferir documentos
                            </span>
                          </div>
                        </div>

                        {/* Item 4 */}
                        <div className="p-2.5 sm:p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start sm:items-center gap-2.5">
                            <div className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#0f1d36]">Laudo técnico</p>
                              <p className="text-[11px] text-slate-400">Processo #2851 • Cliente: Pedro Nunes</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                              Em dia
                            </span>
                            <span className="text-[11px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded cursor-default">
                              Solicitar assinatura
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divisor com subtítulo para despachantes e engenheiros */}
            <div className="mt-12 sm:mt-16 pt-6 flex items-center justify-center gap-4">
              <div className="h-px bg-slate-200/80 flex-1 max-w-[80px] sm:max-w-[140px]" />
              <span className="text-slate-500 text-xs sm:text-sm font-medium tracking-wide text-center">
                Para despachantes, engenheiros e equipes náuticas
              </span>
              <div className="h-px bg-slate-200/80 flex-1 max-w-[80px] sm:max-w-[140px]" />
            </div>
          </div>
        </section>

        {/* 3. BENEFÍCIOS */}
        <section id="solucao" className="py-12 sm:py-16 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f1d36] tracking-tight">
                Tudo organizado. Próximo passo claro.
              </h2>
              <p className="mt-2.5 text-slate-600 text-sm sm:text-base">
                Uma solução completa para simplificar sua rotina e manter o foco no que realmente importa.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Card 1: Processos guiados */}
              <div className="p-7 sm:p-8 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0f1d36] mb-2">
                  Processos guiados
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Do cadastro à conclusão, com etapas claras e sem retrabalho.
                </p>
              </div>

              {/* Card 2: Documentos conectados */}
              <div className="p-7 sm:p-8 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <FolderGit2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0f1d36] mb-2">
                  Documentos conectados
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tudo vinculado a clientes, embarcações e processos.
                </p>
              </div>

              {/* Card 3: Prazos sob controle */}
              <div id="recursos" className="p-7 sm:p-8 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md transition-shadow scroll-mt-28">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0f1d36] mb-2">
                  Prazos sob controle
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Visualize pendências, receba alertas e mantenha sua operação em dia.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. COMO FUNCIONA */}
        <section id="como-funciona" className="py-12 sm:py-16 bg-[#f8fafc] border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f1d36] tracking-tight">
                Do cadastro ao acompanhamento
              </h2>
              <p className="mt-2.5 text-slate-600 text-sm sm:text-base">
                Em poucos passos, seu processo náutico em andamento, com mais controle e transparência.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 lg:gap-4 relative max-w-5xl mx-auto">
              {/* Etapa 1 */}
              <div className="flex-1 flex flex-col items-center text-center p-3 sm:p-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mb-3.5 shadow-xs">
                  1
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0f1d36] mb-1.5">
                  Escolha o serviço
                </h3>
                <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                  Selecione o tipo de processo que deseja iniciar.
                </p>
              </div>

              {/* Conector 1 -> 2 */}
              <div className="hidden md:flex items-center justify-center pt-8 text-slate-300">
                <ChevronRight className="h-6 w-6" />
              </div>

              {/* Etapa 2 */}
              <div className="flex-1 flex flex-col items-center text-center p-3 sm:p-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mb-3.5 shadow-xs">
                  2
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0f1d36] mb-1.5">
                  Confira os documentos
                </h3>
                <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                  Veja a lista do que é necessário e anexe os arquivos.
                </p>
              </div>

              {/* Conector 2 -> 3 */}
              <div className="hidden md:flex items-center justify-center pt-8 text-slate-300">
                <ChevronRight className="h-6 w-6" />
              </div>

              {/* Etapa 3 */}
              <div className="flex-1 flex flex-col items-center text-center p-3 sm:p-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mb-3.5 shadow-xs">
                  3
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0f1d36] mb-1.5">
                  Acompanhe o processo
                </h3>
                <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                  Receba atualizações e saiba sempre o próximo passo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CHAMADA FINAL (BANNER) */}
        <section className="pt-4 pb-12 sm:pb-16 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl overflow-hidden bg-[#0c1e3d] shadow-xl">
              {/* Imagem náutica de veleiro ao entardecer */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="/cta-sailboat.jpg" 
                  alt="Veleiro navegando em águas calmas" 
                  className="w-full h-full object-cover object-right opacity-40 mix-blend-luminosity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c1e3d] via-[#0c1e3d]/90 to-transparent sm:to-[#0c1e3d]/30" />
              </div>

              {/* Conteúdo do Banner */}
              <div className="relative z-10 p-7 sm:p-11 lg:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Simplifique sua rotina náutica.
                  </h2>
                  <p className="text-blue-100/80 text-sm sm:text-base">
                    Mais organização para você ir mais longe.
                  </p>
                </div>

                <div className="shrink-0">
                  <Link 
                    to="/auth/signup" 
                    className="inline-flex items-center gap-2 bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold px-7 py-3.5 rounded-lg shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1e3d] active:scale-98"
                  >
                    <span>Começar agora</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. RODAPÉ */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            {/* Logo Oficial com visibilidade aprimorada */}
            <div className="flex items-center">
              <img 
                src="/navaldocs-logo.png" 
                alt="NavalDocs Pro" 
                className="h-9 sm:h-10 w-auto object-contain"
                width="180"
                height="40"
              />
            </div>

            {/* Links existentes */}
            <div className="flex items-center gap-6 font-medium">
              <button 
                onClick={() => setInfoModal({
                  title: "Política de Privacidade",
                  content: "O NavalDocs Pro preza pela total confidencialidade e segurança dos dados náuticos, documentos e cadastros de clientes e embarcações. Os dados são armazenados com criptografia e em conformidade com as diretrizes da LGPD."
                })}
                className="hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Privacidade
              </button>
              <button 
                onClick={() => setInfoModal({
                  title: "Termos de Uso",
                  content: "O NavalDocs Pro é uma plataforma especializada para gestão de processos, clientes e documentos marítimos por despachantes e engenheiros navais. O uso dos serviços obedece às normas marítimas vigentes e termos contratuais de subscrição."
                })}
                className="hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Termos
              </button>
              <Link 
                to="/support" 
                className="hover:text-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Contato
              </Link>
            </div>

            {/* Slogan */}
            <div className="text-slate-400 text-center sm:text-right">
              — Navegação mais simples para grandes conquistas.
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Informativo para Privacidade / Termos */}
      {infoModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 id="modal-title" className="text-lg font-bold text-[#0f1d36]">
                {infoModal.title}
              </h3>
              <button 
                onClick={() => setInfoModal(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {infoModal.content}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setInfoModal(null)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
