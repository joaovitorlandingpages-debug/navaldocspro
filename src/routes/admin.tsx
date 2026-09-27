import { createFileRoute, Outlet, Link, Navigate, useRouterState } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  Users, 
  Building, 
  Settings, 
  Activity, 
  ArrowLeft,
  LayoutDashboard,
  CreditCard,
  History,
  FileText,
  Zap,
  CheckCircle2,
  TrendingUp,
  Menu,
  Database,
  Rocket,
  MessageSquare,
  BarChart3,
  Shield,
  Layout,
  FlaskConical,
  Search,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Home,
  Tag,
  Gift,
  Link2,
  Wrench,
  X,
  Bell,
  Sliders,
  Layers,
  LogOut,
  FolderOpen
} from "lucide-react";
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTelemetry } from "@/hooks/useTelemetry";
import { AdminOverviewDashboard } from "@/components/admin/AdminOverviewDashboard";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// Error Boundary para proteger as abas do Admin
class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 border-red-200 bg-red-50/40 text-center max-w-xl mx-auto my-12 shadow-md rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0B1739]">Instabilidade ao carregar módulo administrativo</h3>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {this.state.error?.message || "Ocorreu uma instabilidade pontual nesta seção."}
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-5 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

function AdminLayout() {
  const { profile, user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  useTelemetry("Admin Portal");

  // Menu lateral do Painel Administrativo (conforme item 2 dos requisitos)
  const navItems: NavItem[] = useMemo(() => [
    { name: "Visão geral", icon: LayoutDashboard, path: "/admin" },
    { name: "Empresas", icon: Building, path: "/admin/companies" },
    { name: "Usuários e funcionários", icon: Users, path: "/admin/users" },
    { name: "Aplicativos", icon: Layers, path: "/admin/applications" },
    { name: "Planos e assinaturas", icon: CreditCard, path: "/admin/billing" },
    { name: "Consumo e créditos", icon: BarChart3, path: "/admin/saas-metrics" },
    { name: "Catálogo de serviços", icon: FolderOpen, path: "/admin/services" },
    { name: "Modelos de documentos", icon: FileText, path: "/admin/templates" },
    { name: "Sugestões", icon: MessageSquare, path: "/sugestoes" },
    { name: "Notificações", icon: Bell, path: "/admin/system-health" },
    { name: "Configurações administrativas", icon: Sliders, path: "/admin/settings" },
  ], []);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3 font-sans">
        <div className="h-10 w-10 rounded-xl bg-[#075BFF] flex items-center justify-center text-white shadow-xs animate-spin">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
          </svg>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider animate-pulse">
          Carregando Painel Administrativo...
        </p>
      </div>
    );
  }

  // Validação de acesso administrativo
  const isAuthorized = 
    profile?.role === 'admin' ||
    profile?.role === 'admin_master' || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'superadmin' ||
    profile?.email === 'joaovitor.f0725@gmail.com' ||
    profile?.email?.includes("admin") ||
    profile?.email?.includes("joao");

  // Se não autorizado, renderiza mensagem de acesso restrito
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#0B1739]">Acesso restrito</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Você não possui privilégios de administrador global da plataforma para acessar esta área.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao painel da empresa</span>
          </Link>
        </div>
      </div>
    );
  }

  const userName = profile?.name || profile?.full_name || user?.email?.split("@")[0] || "Administrador";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AD";

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR DESKTOP (Fixa à esquerda) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/90 flex-col shrink-0 z-30 select-none">
        {/* Topo da Sidebar: Logo NavalDocs Pro + Badge ADMIN */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#075BFF] flex items-center justify-center text-white shadow-2xs shrink-0">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
                <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0B1739] text-base tracking-tight">
                NavalDocs <span className="text-[#075BFF]">Pro</span>
              </span>
              <span className="bg-blue-50 text-[#075BFF] border border-blue-200 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md uppercase">
                ADMIN
              </span>
            </div>
          </Link>
        </div>

        {/* Links de Navegação do Admin */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = 
              (item.path === "/admin" && (currentPath === "/admin" || currentPath === "/admin/")) ||
              (item.path !== "/admin" && currentPath.startsWith(item.path));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#EEF4FF] text-[#075BFF] font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#075BFF]" : "text-slate-400"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar: Usuário Logado + Voltar à Empresa */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <Link
            to="/home"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#075BFF] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao painel da empresa</span>
          </Link>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-[#075BFF] font-bold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-[#0B1739] block truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Administrador Global
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. SIDEBAR MOBILE (DRAWER RESPONSIVO) */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col z-50 shadow-xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#075BFF] flex items-center justify-center text-white shadow-2xs">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
                  </svg>
                </div>
                <span className="font-extrabold text-[#0B1739] text-sm">
                  NavalDocs <span className="text-[#075BFF]">Pro</span>
                </span>
                <span className="bg-blue-50 text-[#075BFF] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                  ADMIN
                </span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = 
                  (item.path === "/admin" && (currentPath === "/admin" || currentPath === "/admin/")) ||
                  (item.path !== "/admin" && currentPath.startsWith(item.path));

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#EEF4FF] text-[#075BFF] font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#075BFF]" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100">
              <Link
                to="/home"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao painel da empresa</span>
              </Link>
              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-[#075BFF] font-bold text-xs flex items-center justify-center">
                  {userInitials}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#0B1739] block">{userName}</span>
                  <span className="text-[10px] text-slate-400 block">Administrador Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER SUPERIOR */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#075BFF]" />
              <span className="text-xs font-bold text-[#0B1739]">
                Painel administrativo da plataforma
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Painel da empresa</span>
            </Link>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AdminErrorBoundary>
            {currentPath === "/admin" || currentPath === "/admin/" ? (
              <AdminOverviewDashboard />
            ) : (
              <Outlet />
            )}
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function AdminDashboardView() {
  return <AdminOverviewDashboard />;
}
