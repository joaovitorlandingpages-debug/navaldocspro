import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { 
  Home, 
  Users, 
  Ship, 
  FileText, 
  MessageSquare,
  LayoutGrid,
  Settings, 
  HelpCircle, 
  LogOut, 
  UserPlus,
  ClipboardCheck,
  Paperclip,
  CheckSquare,
  ArrowRight, 
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  Gauge,
  Rocket
} from "lucide-react";
import {
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { ServicesCategoryModal } from "@/components/home/ServicesCategoryModal";
import { GlobalSearch } from "@/components/GlobalSearch";
import { PrimeirosPassosBanner } from "@/components/home/PrimeirosPassosBanner";
import { getCompanyOnboardingProgress } from "@/services/onboardingService";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayoutWrapper,
});

function DashboardLayoutWrapper() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === "customer" || profile.role === "client") {
        navigate({ to: "/client-portal" });
      } else if (profile.companies?.onboarding_status === "pending" && window.location.pathname !== "/onboarding") {
        navigate({ to: "/onboarding" });
      }
    }
  }, [profile, loading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Sessão encerrada");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 300);
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/auth/login";
    }
  };

  // 7 itens do menu lateral na ordem exata especificada
  const navItems = [
    { name: "Início", path: "/dashboard", icon: Home, exact: true },
    { name: "Relação de clientes", path: "/customers", icon: Users },
    { name: "Relação de embarcações", path: "/vessels", icon: Ship },
    { name: "Processos", path: "/processes", icon: FileText },
    { name: "Sugestões", path: "/sugestoes", icon: HelpCircle },
    { name: "Nossos aplicativos", path: "/nossos-aplicativos", icon: LayoutGrid },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  const userInitials = useMemo(() => {
    if (!profile?.name) return "ND";
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile?.name]);

  const displayName = useMemo(() => {
    if (!profile?.name) return "Usuário";
    return profile.name.trim();
  }, [profile?.name]);

  const isAdmin = useMemo(() => {
    return (
      profile?.role === "admin" ||
      profile?.role === "admin_master" ||
      profile?.role === "admin_master_global" ||
      profile?.email === "joaovitor.f0725@gmail.com" ||
      profile?.email === "douglas_faresi@hotmail.com"
    );
  }, [profile]);

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* 1. CABEÇALHO UNIFICADO SUPERIOR */}
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Esquerda: Logo NavalDocs Pro */}
        <div className="flex items-center gap-3">
          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#075BFF] rounded-lg p-1">
            <img 
              src="/navaldocs-logo.png" 
              alt="NavalDocs Pro" 
              className="h-7 sm:h-8 w-auto object-contain"
              onError={(e) => {
                // Fallback elegante caso a imagem não carregue
                e.currentTarget.style.display = "none";
              }}
            />
          </Link>
        </div>

        {/* Centro: Busca Geral no Topo do Sistema */}
        <div className="flex-1 max-w-sm lg:max-w-md mx-2 sm:mx-6 flex items-center justify-center md:justify-start">
          <GlobalSearch variant="header" />
        </div>

        {/* Direita: Ajuda e Perfil do Usuário */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Ícone de Ajuda com Ação Útil */}
          <Link
            to="/support"
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:text-[#075BFF] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#075BFF]"
            title="Ajuda e Suporte"
            aria-label="Ajuda e Suporte"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>

          {/* Menu do Perfil do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-2 sm:gap-2.5 py-1 px-1.5 sm:px-2 rounded-full hover:bg-slate-50 transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20"
                aria-label="Menu do usuário"
              >
                <div className="h-8 w-8 rounded-full bg-[#EEF4FF] text-[#075BFF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                  {userInitials}
                </div>
                <span className="hidden sm:inline-block text-xs font-semibold text-slate-800 group-hover:text-slate-900 max-w-[150px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border border-slate-150 bg-white">
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-xs font-bold text-[#0B1739] truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{profile?.email || user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-slate-100" />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Configurações da Conta</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/getting-started" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                  <Rocket className="h-4 w-4 text-[#075BFF]" />
                  <span>Primeiros passos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/support" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <span>Central de Ajuda</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1 bg-slate-100" />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-amber-700 hover:bg-amber-50">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span>Painel Administrativo</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="my-1 bg-slate-100" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span>Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 2. CORPO: MENU LATERAL + CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* MENU LATERAL DESKTOP */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0 py-6 px-4 select-none">
          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? (location.pathname === "/dashboard" || location.pathname === "/dashboard/" || location.pathname.startsWith("/servicos"))
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#EEF4FF] text-[#075BFF] font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[#075BFF]" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* MENU LATERAL MOBILE (DRAWER) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[80vw] bg-white h-full border-r border-slate-200 p-6 flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <img 
                  src="/navaldocs-logo.png" 
                  alt="NavalDocs Pro" 
                  className="h-7 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5 mt-6 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = item.exact 
                    ? (location.pathname === "/dashboard" || location.pathname === "/dashboard/")
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#EEF4FF] text-[#075BFF] font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[#075BFF]" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 custom-scrollbar">
          {children || <RouteContent />}
        </main>
      </div>
    </div>
  );
}

export function RouteContent() {
  const location = useLocation();
  const isDashboardHome = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

  if (!isDashboardHome) {
    return <Outlet />;
  }

  return <DashboardHomeContent />;
}

function DashboardHomeContent() {
  const { profile, companyId: authCompanyId } = useAuth();
  const companyId = profile?.company_id || authCompanyId;
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  // Consulta do progresso real de primeiros passos
  const { data: onboardingProgress, refetch: refetchOnboarding } = useQuery({
    queryKey: ["company-onboarding-progress", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      return await getCompanyOnboardingProgress(companyId);
    },
    enabled: Boolean(companyId),
    staleTime: 1000 * 15,
  });

  const isPreview = typeof window !== "undefined" && window.location.search.includes("preview=true");

  const userFirstName = useMemo(() => {
    if (!profile?.name) return isPreview ? "João Vitor" : "Profissional";
    return profile.name.trim().split(/\s+/)[0];
  }, [profile?.name, isPreview]);

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-4">
      {/* 1. SAUDAÇÃO E TÍTULO DA HOME */}
      <div className="mb-8 sm:mb-10">
        <p className="text-sm sm:text-base text-slate-500 font-normal">
          Olá, {userFirstName}!
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1739] tracking-tight mt-1 mb-2">
          O que você deseja fazer?
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Cadastre clientes, embarcações ou inicie um serviço.
        </p>
      </div>

      {/* 1.1 BUSCA GERAL DA PÁGINA INICIAL */}
      <div className="mb-8 sm:mb-10 max-w-5xl">
        <GlobalSearch variant="home" />
      </div>

      {/* 1.2 GUIA DE PRIMEIROS PASSOS (COMPLEMENTA A HOME SEM REMOVER OS ATALHOS) */}
      {onboardingProgress && companyId && (
        <div className="max-w-5xl">
          <PrimeirosPassosBanner 
            progress={onboardingProgress} 
            companyId={companyId} 
            onRefresh={() => refetchOnboarding()} 
          />
        </div>
      )}

      {/* 2. TRÊS CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
        {/* CARD 1 — CADASTRAR CLIENTE */}
        <Link
          to="/customers/novo"
          id="card-cadastrar-cliente"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer group text-left min-h-[300px] focus:outline-none focus:ring-2 focus:ring-[#075BFF]/30 block no-underline"
          aria-label="Cadastrar cliente"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
              <UserPlus className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
              Cadastrar cliente
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Preencha os dados manualmente ou anexe os documentos do cliente.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-500">
              <Paperclip className="h-4 w-4 text-slate-400 rotate-[-45deg]" />
              <span>Manual ou por documentos</span>
            </div>
            <span id="btn-cadastrar-cliente-home" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#075BFF] font-semibold text-xs group-hover:bg-[#075BFF] group-hover:text-white transition-colors">
              <span>Cadastrar cliente</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>

        {/* CARD 2 — CADASTRAR EMBARCAÇÃO */}
        <Link
          to="/vessels/novo"
          id="card-cadastrar-embarcacao"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer group text-left min-h-[300px] focus:outline-none focus:ring-2 focus:ring-[#075BFF]/30 block no-underline"
          aria-label="Cadastrar embarcação"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
              <Ship className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
              Cadastrar embarcação
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Preencha os dados manualmente ou anexe os documentos da embarcação.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-500">
              <Paperclip className="h-4 w-4 text-slate-400 rotate-[-45deg]" />
              <span>Manual ou por documentos</span>
            </div>
            <span id="btn-cadastrar-embarcacao-home" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#075BFF] font-semibold text-xs group-hover:bg-[#075BFF] group-hover:text-white transition-colors">
              <span>Cadastrar embarcação</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>

        {/* CARD 3 — SERVIÇOS */}
        <Link
          to="/servicos"
          id="card-servicos"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer group text-left min-h-[300px] focus:outline-none focus:ring-2 focus:ring-[#075BFF]/30 block no-underline"
          aria-label="Iniciar serviços"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
              <ClipboardCheck className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
              Serviços
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Escolha a categoria da embarcação e os serviços que deseja realizar.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckSquare className="h-4 w-4 text-slate-400" />
              <span>Embarcações e serviços</span>
            </div>
            <span id="btn-servicos-home" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#075BFF] font-semibold text-xs group-hover:bg-[#075BFF] group-hover:text-white transition-colors">
              <span>Iniciar serviços</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      </div>

      {/* 3. TEXTO DISCRETO INFERIOR */}
      <p className="text-xs text-slate-400 mt-8 sm:mt-10">
        Revise os dados antes de salvar e acompanhe tudo em Processos.
      </p>

      {/* MODAL DE SELEÇÃO DE CATEGORIA DE SERVIÇOS */}
      <ServicesCategoryModal 
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
      />
    </div>
  );
}
