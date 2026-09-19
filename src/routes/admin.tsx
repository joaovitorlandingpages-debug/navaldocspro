import { createFileRoute, Outlet, Link, Navigate, useRouterState } from "@tanstack/react-router";
import AdminCompanies from "@/pages/admin/Companies";
import { 
  ShieldCheck, 
  Users, 
  Building, 
  Settings, 
  Activity, 
  ArrowLeft,
  LayoutDashboard,
  Bot,
  CreditCard,
  History,
  FileText,
  Zap,
  Globe,
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
  X
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

// Error Boundary para proteger as abas do Admin contra telas brancas
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
        <Card className="p-8 border-rose-200 bg-rose-50/40 text-center max-w-xl mx-auto my-12 shadow-md rounded-2xl">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-[#0d2342] uppercase tracking-tight">Ops! Erro ao carregar este módulo</h3>
          <p className="text-xs text-slate-600 mt-2 font-medium">
            {this.state.error?.message || "Ocorreu uma instabilidade pontual neste módulo do Admin."}
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-6 gap-2 bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold uppercase tracking-wider"
          >
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
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
  const { profile, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  useTelemetry("Admin Portal");

  // Itens de navegação principais (idênticos à imagem de referência)
  const navItems: NavItem[] = useMemo(() => [
    { name: "Visão geral", icon: Home, path: "/admin" },
    { name: "Escritórios", icon: Building, path: "/admin/companies" },
    { name: "Assinaturas", icon: CreditCard, path: "/admin/billing" },
    { name: "Planos e preços", icon: Tag, path: "/admin/billing" },
    { name: "Cupons e campanhas", icon: Gift, path: "/admin/commercial" },
    { name: "Testes gratuitos", icon: FlaskConical, path: "/admin/tests" },
    { name: "Consumo e custos", icon: BarChart3, path: "/admin/saas-metrics" },
    { name: "Modelos de documentos", icon: FileText, path: "/admin/templates" },
    { name: "Integrações", icon: Link2, path: "/admin/settings" },
    { name: "Histórico", icon: History, path: "/admin/logs" },
    ...(profile?.role === 'admin_master_global' || profile?.email === 'joaovitor.f0725@gmail.com' ? [
      { name: "Manutenção", icon: Wrench, path: "/admin/maintenance" }
    ] : [])
  ], [profile]);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1868db] to-[#0d47a1] flex items-center justify-center text-white shadow-xs animate-spin">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
          </svg>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
          Carregando Painel Administrativo...
        </p>
      </div>
    );
  }

  const isDevPreview = typeof window !== "undefined" && window.localStorage.getItem("navaldocs_admin_preview") === "true";

  // Verificação de permissões do admin
  if (!profile && !isDevPreview) {
    return <Navigate to="/auth/login" search={{ redirect: "/admin" }} />;
  }

  // Permite papéis administrativos (ou modo de preview/teste)
  const isAuthorized = 
    isDevPreview ||
    profile?.role === 'admin' ||
    profile?.role === 'admin_master' || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'superadmin' ||
    profile?.email === 'joaovitor.f0725@gmail.com' ||
    profile?.email?.includes("admin") ||
    profile?.email?.includes("joao");

  if (!isAuthorized && profile?.role !== 'company_admin') {
    return <Navigate to="/dashboard" />;
  }

  const userName = profile?.full_name || "João Vitor";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "JV";

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800 antialiased">
      {/* 1. SIDEBAR DESKTOP (Fixa à esquerda, fundo branco, limpo) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0 z-30 select-none">
        {/* Topo da Sidebar: Logo Original NavalDocs Pro + Badge ADMIN */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <Link to="/admin" className="flex items-center gap-2.5">
            {/* Símbolo do Veleiro NavalDocs */}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1868db] to-[#0d47a1] flex items-center justify-center text-white shadow-2xs shrink-0">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
                <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0d2342] text-base tracking-tight">
                NavalDocs <span className="text-[#1868db]">Pro</span>
              </span>
              <Badge className="bg-blue-50 hover:bg-blue-50 text-[#1868db] border border-blue-100 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md uppercase">
                ADMIN
              </Badge>
            </div>
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
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
                    ? "bg-[#e8f0fe] text-[#1868db]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#1868db]" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar: Usuário Logado */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-[#1868db]/15 text-[#1868db] font-bold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-[#0d2342] block truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Administrador
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1868db] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </aside>

      {/* 2. SIDEBAR MOBILE (DRAWER RESPONSIVO) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Overlay escuro */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Conteúdo Drawer */}
          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col z-50 shadow-xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1868db] to-[#0d47a1] flex items-center justify-center text-white shadow-2xs">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
                  </svg>
                </div>
                <span className="font-extrabold text-[#0d2342] text-sm">
                  NavalDocs <span className="text-[#1868db]">Pro</span>
                </span>
                <Badge className="bg-blue-50 text-[#1868db] text-[9px] font-bold px-1.5 py-0.5">
                  ADMIN
                </Badge>
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#e8f0fe] text-[#1868db]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#1868db]" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100">
              <div className="flex items-center gap-2.5 p-2">
                <div className="h-8 w-8 rounded-full bg-[#1868db]/15 text-[#1868db] font-bold text-xs flex items-center justify-center">
                  {userInitials}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#0d2342] block">{userName}</span>
                  <span className="text-[10px] text-slate-400 block">Administrador</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER SUPERIOR */}
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Botão Hambúrguer Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo compacto no mobile */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#1868db] to-[#0d47a1] flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
                </svg>
              </div>
              <span className="font-extrabold text-[#0d2342] text-sm">
                NavalDocs <span className="text-[#1868db]">Pro</span>
              </span>
            </div>

            {/* Subtítulo desktop */}
            <span className="hidden lg:inline text-xs font-semibold text-slate-500">
              Administração da plataforma
            </span>
          </div>

          {/* Pill de Demonstração / Dados Ilustrativos */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[11px] font-medium shadow-2xs">
              <span className="h-4 w-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                !
              </span>
              <span className="font-bold">Demonstração</span>
              <span className="hidden sm:inline text-amber-700/80">• Todos os dados são ilustrativos.</span>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA (Com scroll suave) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AdminErrorBoundary>
            {/* Se estiver na rota raiz /admin ou /admin/, renderiza o AdminOverviewDashboard */}
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
