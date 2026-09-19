import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { 
  Home, 
  ClipboardList, 
  Users, 
  Ship, 
  FileText, 
  Calendar as CalendarIcon, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  UserCheck, 
  Layers, 
  Zap, 
  Cpu, 
  Signature, 
  LayoutTemplate, 
  CreditCard, 
  ShieldCheck, 
  RefreshCw,
  Check
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
import { useNewProcess } from "@/hooks/useNewProcess";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WelcomeTour } from "@/components/WelcomeTour";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { translateTerm } from "@/lib/naval-terms";
import { format, parseISO, isPast, isToday, startOfMonth } from "date-fns";

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

function DashboardLayout() {
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const { profile, user, loading, signOut, refreshProfile } = useAuth();
  const { setIsNewProcessOpen } = useNewProcess();
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'customer' || profile.role === 'client') {
        navigate({ to: "/client-portal" });
      } else if (profile.companies?.onboarding_status === 'pending' && window.location.pathname !== '/onboarding') {
        navigate({ to: "/onboarding" });
      } else if (profile.companies?.onboarding_status === 'completed') {
        const hasSeenTour = localStorage.getItem(`tour_seen_${profile.company_id}`);
        if (!hasSeenTour) {
          setShowTour(true);
        }
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

  // Consulta somente os espaços que o usuário tem acesso legítimo
  const { data: userWorkspaces = [] } = useQuery({
    queryKey: ["user-accessible-workspaces", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, is_active")
        .eq("created_by", user.id);
      if (error) {
        console.error("Erro ao carregar espaços do usuário:", error);
        return profile?.companies ? [profile.companies] : [];
      }
      const list = [...(data || [])];
      if (profile?.companies && !list.some(c => c.id === profile.companies.id)) {
        list.unshift(profile.companies);
      }
      return list;
    },
    enabled: !!user?.id,
  });

  const handleSwitchWorkspace = async (companyId: string) => {
    if (!user?.id || companyId === profile?.company_id) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", user.id);

      if (error) {
        toast.error("Não foi possível alternar de espaço de trabalho.");
        return;
      }

      queryClient.clear();
      await refreshProfile();
      toast.success("Espaço de trabalho alternado com sucesso!");
    } catch (err) {
      console.error("Erro ao trocar espaço:", err);
      toast.error("Erro ao alternar espaço de trabalho.");
    }
  };

  const mainNavItems = [
    { name: "Início", path: "/dashboard", icon: Home, exact: true },
    { name: "Processos", path: "/processes", icon: ClipboardList },
    { name: "Clientes", path: "/customers", icon: Users },
    { name: "Embarcações", path: "/vessels", icon: Ship },
    { name: "Documentos", path: "/documents", icon: FileText },
    { name: "Prazos", path: "/dashboard/deadlines", icon: CalendarIcon },
  ];

  const moreToolsItems = [
    { name: "Biblioteca", path: "/dashboard/document-center", icon: Layers },
    { name: "OCR & Validação", path: "/ocr-center", icon: Zap },
    { name: "Modelos Oficiais", path: "/templates", icon: LayoutTemplate },
    { name: "Assinaturas", path: "/assinaturas", icon: Signature },
    { name: "Financeiro", path: "/billing/subscription", icon: CreditCard },
    { name: "Inteligência IA", path: "/ai-center", icon: Cpu },
  ];

  const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');

  const userInitials = useMemo(() => {
    if (!profile?.name) return isPreview ? "RS" : "ND";
    const parts = profile.name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile?.name, isPreview]);

  const activeCompanyName = profile?.companies?.name || (isPreview ? "Marina Sul" : "Espaço Ativo");

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* 1. MENU LATERAL DESKTOP */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 z-40 select-none">
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* Topo: Logo Oficial */}
          <div className="p-6 pb-4">
            <Link to="/dashboard" className="inline-block" aria-label="NavalDocs Pro Início">
              <img 
                src="/navaldocs-logo.png" 
                alt="NavalDocs Pro" 
                className="h-8 w-auto object-contain"
              />
            </Link>

            {/* Seletor de Espaço de Trabalho */}
            <div className="mt-5">
              <span className="block text-[11px] font-medium text-slate-400 mb-1.5 pl-1">
                Espaço de trabalho
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors text-left group shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                    aria-label="Selecionar espaço de trabalho"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1868db] shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {activeCompanyName}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5 shadow-lg border border-slate-200">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Meus Espaços de Trabalho
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-slate-100" />
                  {userWorkspaces.map((ws: any) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-blue-50 focus:text-[#1868db]"
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === profile?.company_id && (
                        <Check className="h-4 w-4 text-[#1868db] shrink-0 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="px-3 pt-2 space-y-1">
            {mainNavItems.map((item) => {
              const isActive = item.exact 
                ? (location.pathname === "/dashboard" || location.pathname === "/dashboard/")
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-[#1868db] font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#1868db]" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Mais Ferramentas Collapsible */}
            <div className="pt-2">
              <button
                onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider transition-colors"
                aria-expanded={isMoreToolsOpen}
              >
                <span>Mais ferramentas</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isMoreToolsOpen ? "rotate-180" : ""}`} />
              </button>

              {isMoreToolsOpen && (
                <div className="pl-2 pr-1 pt-1 space-y-1 animate-in fade-in-50 duration-200">
                  {moreToolsItems.map((tool) => (
                    <Link
                      key={tool.name}
                      to={tool.path}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <tool.icon className="h-3.5 w-3.5 text-slate-400" />
                      <span>{tool.name}</span>
                    </Link>
                  ))}

                  {(profile?.role === 'admin' || profile?.role === 'admin_master' || profile?.role === 'admin_master_global') && (
                    <Link
                      to="/admin-hub"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                      <span>Painel Admin</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Parte Inferior do Menu */}
        <div className="p-3 border-t border-slate-150 space-y-1 bg-white">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Configurações</span>
          </Link>

          <Link
            to="/support"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Ajuda</span>
          </Link>

          {/* Perfil do Usuário */}
          <div className="pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                  aria-label="Opções do perfil"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-blue-100 text-[#1868db] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                      {userInitials}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {profile?.name || "Usuário"}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        Ver perfil
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56 rounded-xl p-1.5 shadow-lg border border-slate-200">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-800 px-2 py-1 truncate">
                  {profile?.email || "Conta conectada"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    <span>Minha Conta</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700 hover:text-slate-900">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 2. BARRA SUPERIOR DESKTOP E CABEÇALHO COMPACTO MOBILE */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between shrink-0 z-30">
          {/* Versão Mobile: Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link to="/dashboard" aria-label="NavalDocs Pro">
              <img 
                src="/navaldocs-logo.png" 
                alt="NavalDocs Pro" 
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Versão Desktop: Campo de Busca Real */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 text-slate-400 text-sm transition-all text-left shadow-2xs group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              aria-label="Buscar cliente, embarcação ou processo"
            >
              <Search className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
              <span className="truncate">Buscar cliente, embarcação ou processo…</span>
              <kbd className="ml-auto hidden xl:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
                ⌘K
              </kbd>
            </button>
            <div className="hidden">
              <GlobalSearch />
            </div>
          </div>

          {/* Ações da Direita (Notificações e Avatar) */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Botão de Busca Mobile */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="Abrir busca"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notificações com badge somente quando unreadCount > 0 */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {/* Avatar / Iniciais do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-blue-100 text-[#1868db] font-bold text-xs flex items-center justify-center border border-blue-200 shadow-2xs hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 cursor-pointer"
                  aria-label="Menu do usuário"
                >
                  {userInitials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border border-slate-200">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-800 px-2 py-1 truncate">
                  {profile?.name || "Minha Conta"}
                </DropdownMenuLabel>
                <p className="text-[11px] text-slate-400 px-2 pb-1.5 truncate">
                  {profile?.email || ""}
                </p>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/support" className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700">
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    <span>Ajuda & Suporte</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Modal de Notificações */}
        <NotificationCenter 
          isOpen={isNotificationsOpen} 
          onClose={() => setNotificationsOpen(false)} 
        />

        {/* CONTEÚDO DINÂMICO DO PAINEL */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-28 lg:pb-12 custom-scrollbar">
          <TrialBanner />
          <RouteContent />
        </main>

        {/* NAVEGAÇÃO INFERIOR MOBILE */}
        <MobileNavigation />

        {/* TOUR DE INTRODUÇÃO SE APLICÁVEL */}
        {showTour && profile?.companies && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-300">
            <WelcomeTour 
              onboardingStep={profile.companies.onboarding_step || 1} 
              onClose={() => {
                setShowTour(false);
                localStorage.setItem(`tour_seen_${profile.company_id}`, 'true');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function RouteContent() {
  const { profile } = useAuth();
  const { setIsNewProcessOpen } = useNewProcess();
  const navigate = useNavigate();
  const location = useLocation();

  // Se a rota for um sub-módulo de /dashboard (ex.: /dashboard/deadlines), renderiza o Outlet
  if (location.pathname !== "/dashboard" && location.pathname !== "/dashboard/") {
    return <Outlet />;
  }

  const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');

  // Saudação de acordo com o horário local
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const userFirstName = useMemo(() => {
    if (!profile?.name) return isPreview ? "Rafael" : "Profissional";
    return profile.name.trim().split(" ")[0];
  }, [profile?.name, isPreview]);

  // Data de hoje formatada em ISO local para comparativos (YYYY-MM-DD)
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const startOfMonthStr = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), []);

  // 1. CONSULTA: Indicadores Operacionais Reais
  const {
    data: kpiStats,
    isLoading: isLoadingKpis,
    isError: isErrorKpis,
    refetch: refetchKpis
  } = useQuery({
    queryKey: ["dashboard-kpis", profile?.company_id, isPreview],
    queryFn: async () => {
      if (!profile?.company_id) {
        if (isPreview) {
          return { inProgressCount: 12, dueTodayCount: 3, completedMonthCount: 8 };
        }
        return { inProgressCount: 0, dueTodayCount: 0, completedMonthCount: 0 };
      }

      // a) Processos em andamento (exclui rascunhos, arquivados, lixeira, concluídos e cancelados)
      const inProgressPromise = supabase
        .from("processes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("trashed_at", null)
        .or("is_draft.is.null,is_draft.eq.false")
        .not("status", "in", "(completed,cancelled)");

      // b) Pendências para hoje (processos abertos com vencimento hoje)
      const dueProcessesTodayPromise = supabase
        .from("processes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("trashed_at", null)
        .or("is_draft.is.null,is_draft.eq.false")
        .not("status", "in", "(completed,cancelled)")
        .eq("due_date", todayStr);

      // c) Documentos com vencimento hoje
      const dueDocsTodayPromise = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .eq("expiry_date", todayStr);

      // d) Concluídos no mês atual (baseado em updated_at do status concluído)
      const completedMonthPromise = supabase
        .from("processes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .is("trashed_at", null)
        .eq("status", "completed")
        .gte("updated_at", `${startOfMonthStr}T00:00:00Z`);

      const [inProgressRes, dueProcRes, dueDocsRes, completedRes] = await Promise.all([
        inProgressPromise,
        dueProcessesTodayPromise,
        dueDocsTodayPromise,
        completedMonthPromise,
      ]);

      const dueTodayTotal = (dueProcRes.count || 0) + (dueDocsRes.count || 0);

      return {
        inProgressCount: inProgressRes.count || 0,
        dueTodayCount: dueTodayTotal,
        completedMonthCount: completedRes.count || 0,
      };
    },
    enabled: !!profile?.company_id || isPreview,
    staleTime: 1000 * 60 * 2,
  });

  // 2. CONSULTA: Itens que Precisam de Atenção
  const {
    data: attentionItems = [],
    isLoading: isLoadingAttention,
    isError: isErrorAttention,
    refetch: refetchAttention
  } = useQuery({
    queryKey: ["dashboard-attention-items", profile?.company_id, isPreview],
    queryFn: async () => {
      if (!profile?.company_id) {
        if (isPreview) {
          return [
            {
              id: "preview-1",
              actionTitle: "Conferir documento da embarcação",
              subtitle: "Mar Azul · Marina Costa",
              actionBtnText: "Conferir",
              iconType: "check_doc" as const,
              statusBadge: { label: "Hoje", type: "today" as const },
              isOverdue: false,
              isDueToday: true,
              sortWeight: 2,
            },
            {
              id: "preview-2",
              actionTitle: "Responder exigência",
              subtitle: "Estrela do Mar · Carlos Lima",
              actionBtnText: "Resolver",
              iconType: "warning" as const,
              statusBadge: { label: "Atrasado", type: "late" as const },
              isOverdue: true,
              isDueToday: false,
              sortWeight: 1,
            },
            {
              id: "preview-3",
              actionTitle: "Acompanhar assinatura",
              subtitle: "Vento Sul · Ana Santos",
              actionBtnText: "Abrir",
              iconType: "signature" as const,
              statusBadge: { label: "Aguardando cliente", type: "client" as const },
              isOverdue: false,
              isDueToday: false,
              sortWeight: 3,
            },
          ];
        }
        return [];
      }

      // Buscar processos com prazo ou pendência de ação
      const { data: processes, error } = await supabase
        .from("processes")
        .select(`
          id,
          process_type,
          status,
          priority,
          due_date,
          created_at,
          updated_at,
          vessels:vessels!processes_vessel_id_fkey(name),
          customers:customers!processes_customer_id_fkey(name)
        `)
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("trashed_at", null)
        .or("is_draft.is.null,is_draft.eq.false")
        .not("status", "in", "(completed,cancelled)")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) {
        console.error("Erro ao carregar pendências:", error);
        return [];
      }

      if (!processes) return [];

      // Mapeia e prioriza as ações
      const formatted = processes.map((proc: any) => {
        const vesselName = proc.vessels?.name || "Embarcação";
        const customerName = proc.customers?.name || "Cliente";
        const dueDate = proc.due_date ? parseISO(proc.due_date) : null;
        const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;
        const isDueToday = dueDate ? isToday(dueDate) : false;

        let actionTitle = "Acompanhar processo";
        let actionBtnText = "Abrir";
        let iconType: "check_doc" | "warning" | "signature" | "default" = "default";
        let statusBadge: { label: string; type: "today" | "late" | "client" | "neutral" } = {
          label: "Em andamento",
          type: "neutral"
        };

        if (isOverdue) {
          actionTitle = "Responder exigência";
          actionBtnText = "Resolver";
          iconType = "warning";
          statusBadge = { label: "Atrasado", type: "late" };
        } else if (isDueToday) {
          actionTitle = "Conferir documento da embarcação";
          actionBtnText = "Conferir";
          iconType = "check_doc";
          statusBadge = { label: "Hoje", type: "today" };
        } else if (proc.status === "waiting_signature" || proc.status === "awaiting_signature") {
          actionTitle = "Acompanhar assinatura";
          actionBtnText = "Abrir";
          iconType = "signature";
          statusBadge = { label: "Aguardando cliente", type: "client" };
        } else if (proc.status === "waiting_docs" || proc.status === "pending_docs") {
          actionTitle = "Conferir documento da embarcação";
          actionBtnText = "Conferir";
          iconType = "check_doc";
          statusBadge = { label: "Aguardando cliente", type: "client" };
        } else if (proc.priority === "urgent" || proc.priority === "high") {
          actionTitle = "Responder exigência";
          actionBtnText = "Resolver";
          iconType = "warning";
          statusBadge = { label: "Prioritário", type: "late" };
        }

        return {
          id: proc.id,
          actionTitle,
          subtitle: `${vesselName} · ${customerName}`,
          actionBtnText,
          iconType,
          statusBadge,
          isOverdue,
          isDueToday,
          sortWeight: isOverdue ? 1 : isDueToday ? 2 : 3,
        };
      });

      // Ordena por atrasados primeiro, depois os de hoje, depois demais
      formatted.sort((a, b) => a.sortWeight - b.sortWeight);
      return formatted.slice(0, 5);
    },
    enabled: !!profile?.company_id || isPreview,
    staleTime: 1000 * 60 * 2,
  });

  // 3. CONSULTA: Processos Recentes
  const {
    data: recentProcesses = [],
    isLoading: isLoadingRecent,
    isError: isErrorRecent,
    refetch: refetchRecent
  } = useQuery({
    queryKey: ["dashboard-recent-processes", profile?.company_id, isPreview],
    queryFn: async () => {
      if (!profile?.company_id) {
        if (isPreview) {
          return [
            {
              id: "preview-p1",
              process_type: "transferencia",
              status: "in_progress",
              vessels: { name: "Mar Azul" },
              customers: { name: "Marina Costa" },
            },
            {
              id: "preview-p2",
              process_type: "renovacao",
              status: "pending_docs",
              vessels: { name: "Estrela do Mar" },
              customers: { name: "Carlos Lima" },
            },
            {
              id: "preview-p3",
              process_type: "inscricao",
              status: "waiting_signature",
              vessels: { name: "Vento Sul" },
              customers: { name: "Ana Santos" },
            },
          ];
        }
        return [];
      }

      const { data, error } = await supabase
        .from("processes")
        .select(`
          id,
          process_type,
          status,
          title,
          created_at,
          updated_at,
          vessels:vessels!processes_vessel_id_fkey(name),
          customers:customers!processes_customer_id_fkey(name)
        `)
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .is("trashed_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erro ao carregar processos recentes:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!profile?.company_id || isPreview,
    staleTime: 1000 * 60 * 2,
  });

  const handleOpenAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-naval-copilot"));
  };

  const handleRetryAll = () => {
    refetchKpis();
    refetchAttention();
    refetchRecent();
  };

  const hasAnyError = isErrorKpis || isErrorAttention || isErrorRecent;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Alerta de Erro Geral com Tentar Novamente */}
      {hasAnyError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="text-xs font-semibold">
              Houve uma instabilidade ao sincronizar alguns dados com o servidor.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleRetryAll}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold gap-1.5 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* 3. BOAS-VINDAS */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d36] tracking-tight">
            {greetingText}, {userFirstName}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-1 font-normal">
            Veja o que precisa da sua atenção hoje.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewProcessOpen(true)}
          className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1868db]/30 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Novo processo</span>
        </button>
      </section>

      {/* 4. INDICADORES (3 CARTÕES) */}
      <section>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
          {/* Cartão 1: Processos em andamento */}
          <Link
            to="/processes"
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 md:p-6 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500 block">
                  Processos em andamento
                </span>
              </div>
            </div>

            <div className="mt-3 sm:mt-5">
              {isLoadingKpis ? (
                <Skeleton className="h-7 sm:h-8 w-10 sm:w-12 rounded-lg" />
              ) : (
                <p className="text-xl sm:text-3xl font-extrabold text-[#0f1d36] leading-none">
                  {kpiStats?.inProgressCount ?? 0}
                </p>
              )}
              {/* No mobile, exibe label concisa; no desktop, o subtítulo */}
              <p className="text-[11px] sm:text-xs text-slate-500 sm:text-slate-400 font-medium mt-1.5 line-clamp-1">
                <span className="sm:hidden">Em andamento</span>
                <span className="hidden sm:inline">Em diversas etapas</span>
              </p>
            </div>
          </Link>

          {/* Cartão 2: Pendências para hoje */}
          <Link
            to="/dashboard/deadlines"
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 md:p-6 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500 block">
                  Pendências para hoje
                </span>
              </div>
            </div>

            <div className="mt-3 sm:mt-5">
              {isLoadingKpis ? (
                <Skeleton className="h-7 sm:h-8 w-10 sm:w-12 rounded-lg" />
              ) : (
                <p className="text-xl sm:text-3xl font-extrabold text-[#0f1d36] leading-none">
                  {kpiStats?.dueTodayCount ?? 0}
                </p>
              )}
              {/* No mobile, exibe label concisa; no desktop, o subtítulo */}
              <p className="text-[11px] sm:text-xs text-slate-500 sm:text-slate-400 font-medium mt-1.5 line-clamp-1">
                <span className="sm:hidden">Pendências hoje</span>
                <span className="hidden sm:inline">Precisam da sua ação</span>
              </p>
            </div>
          </Link>

          {/* Cartão 3: Concluídos no mês */}
          <Link
            to="/processes"
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 md:p-6 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500 block">
                  Concluídos no mês
                </span>
              </div>
            </div>

            <div className="mt-3 sm:mt-5">
              {isLoadingKpis ? (
                <Skeleton className="h-7 sm:h-8 w-10 sm:w-12 rounded-lg" />
              ) : (
                <p className="text-xl sm:text-3xl font-extrabold text-[#0f1d36] leading-none">
                  {kpiStats?.completedMonthCount ?? 0}
                </p>
              )}
              {/* No mobile, exibe label concisa; no desktop, o subtítulo */}
              <p className="text-[11px] sm:text-xs text-slate-500 sm:text-slate-400 font-medium mt-1.5 line-clamp-1">
                <span className="sm:hidden">Concluídos mês</span>
                <span className="hidden sm:inline">Processos finalizados</span>
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. PRECISA DA SUA ATENÇÃO */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
            Precisa da sua atenção
          </h2>
          <Link 
            to="/dashboard/deadlines" 
            className="text-xs sm:text-sm font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoadingAttention ? (
            <div className="py-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          ) : attentionItems.length === 0 ? (
            <div className="py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Nenhuma pendência urgente encontrada.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Sua operação náutica está 100% em dia. Novos prazos ou exigências surgirão aqui automaticamente.
              </p>
            </div>
          ) : (
            attentionItems.map((item) => (
              <div 
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 -mx-2 px-2 rounded-xl transition-colors"
              >
                {/* Ícone + Título + Embarcação/Cliente */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.iconType === "warning" 
                      ? "bg-red-50 text-red-500" 
                      : item.iconType === "check_doc"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-blue-50 text-[#1868db]"
                  }`}>
                    {item.iconType === "warning" && <AlertTriangle className="h-5 w-5" />}
                    {item.iconType === "check_doc" && <FileText className="h-5 w-5" />}
                    {item.iconType === "signature" && <Signature className="h-5 w-5" />}
                    {item.iconType === "default" && <Clock className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0f1d36] truncate">
                      {item.actionTitle}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Badge de Situação + Botão de Ação */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                    item.statusBadge.type === "late"
                      ? "bg-red-50 text-red-700 border border-red-200/80"
                      : item.statusBadge.type === "today"
                      ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                      : item.statusBadge.type === "client"
                      ? "bg-slate-100 text-slate-700 border border-slate-200"
                      : "bg-blue-50 text-[#1868db] border border-blue-200/80"
                  }`}>
                    {item.statusBadge.type === "late" && <Clock className="h-3 w-3" />}
                    {item.statusBadge.type === "today" && <Clock className="h-3 w-3" />}
                    {item.statusBadge.type === "client" && <UserCheck className="h-3 w-3" />}
                    <span>{item.statusBadge.label}</span>
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: `/processes/${item.id}` })}
                    className="h-8 px-3.5 rounded-lg border-blue-200 text-[#1868db] hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    {item.actionBtnText}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. PROCESSOS RECENTES */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
            Processos recentes
          </h2>
          <Link 
            to="/processes" 
            className="text-xs sm:text-sm font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1"
          >
            <span>Ver processos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoadingRecent ? (
          <div className="py-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : recentProcesses.length === 0 ? (
          <div className="py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-[#1868db] flex items-center justify-center mx-auto mb-3">
              <Ship className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Nenhum processo iniciado neste espaço.
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Vamos começar seu primeiro processo? Organize vistorias, registros e documentos náuticos com poucos cliques.
            </p>
            <Button
              onClick={() => setIsNewProcessOpen(true)}
              className="bg-[#1868db] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro processo
            </Button>
          </div>
        ) : (
          <>
            {/* Tabela para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 pr-4">Embarcação / Cliente</th>
                    <th className="py-3.5 px-4">Serviço</th>
                    <th className="py-3.5 px-4">Situação</th>
                    <th className="py-3.5 pl-4 text-right">Próxima ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentProcesses.map((proc: any) => {
                    const vesselName = proc.vessels?.name || "Embarcação s/ nome";
                    const customerName = proc.customers?.name || "Cliente s/ nome";
                    const serviceName = translateTerm(proc.process_type) || "Processo Naval";
                    
                    let statusLabel = "Em andamento";
                    let statusClass = "bg-blue-50 text-blue-700 border-blue-200";
                    let nextAction = "Conferir documentos";

                    if (proc.status === "completed") {
                      statusLabel = "Concluído";
                      statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      nextAction = "Ver conclusão";
                    } else if (proc.status === "waiting_signature" || proc.status === "awaiting_signature") {
                      statusLabel = "Aguardando assinatura";
                      statusClass = "bg-slate-100 text-slate-700 border-slate-200";
                      nextAction = "Ver documentos";
                    } else if (proc.status === "waiting_docs" || proc.status === "pending_docs") {
                      statusLabel = "Pendência";
                      statusClass = "bg-red-50 text-red-700 border-red-200";
                      nextAction = "Responder exigência";
                    } else if (proc.status === "in_progress" || proc.status === "review") {
                      statusLabel = "Em conferência";
                      statusClass = "bg-blue-50 text-[#1868db] border-blue-200";
                      nextAction = "Conferir documentos";
                    }

                    return (
                      <tr 
                        key={proc.id}
                        onClick={() => navigate({ to: `/processes/${proc.id}` })}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <Ship className="h-4 w-4 text-slate-400 group-hover:text-[#1868db] transition-colors shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-900 leading-snug">
                                {vesselName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {customerName}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                          {serviceName}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusClass}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabel}
                          </span>
                        </td>

                        <td className="py-3.5 pl-4 text-right">
                          <span className="text-xs font-semibold text-[#1868db] group-hover:underline inline-flex items-center gap-1">
                            <span>{nextAction}</span>
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Lista de Cartões para Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentProcesses.map((proc: any) => {
                const vesselName = proc.vessels?.name || "Embarcação s/ nome";
                const customerName = proc.customers?.name || "Cliente s/ nome";
                const serviceName = translateTerm(proc.process_type) || "Processo Naval";

                let statusLabel = "Em andamento";
                let statusClass = "bg-blue-50 text-blue-700 border-blue-200";

                if (proc.status === "completed") {
                  statusLabel = "Concluído";
                  statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                } else if (proc.status === "waiting_signature" || proc.status === "awaiting_signature") {
                  statusLabel = "Aguardando assinatura";
                  statusClass = "bg-slate-100 text-slate-700 border-slate-200";
                } else if (proc.status === "waiting_docs" || proc.status === "pending_docs") {
                  statusLabel = "Pendência";
                  statusClass = "bg-red-50 text-red-700 border-red-200";
                } else if (proc.status === "in_progress" || proc.status === "review") {
                  statusLabel = "Em conferência";
                  statusClass = "bg-blue-50 text-[#1868db] border-blue-200";
                }

                return (
                  <div
                    key={proc.id}
                    onClick={() => navigate({ to: `/processes/${proc.id}` })}
                    className="py-3.5 flex items-center justify-between gap-3 active:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Ship className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {vesselName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {customerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 7. AJUDA CONTEXTUAL */}
      <section className="bg-gradient-to-r from-blue-50/90 via-blue-50/60 to-indigo-50/40 border border-blue-100/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white border border-blue-100 text-[#1868db] flex items-center justify-center shadow-2xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0f1d36]">
              Precisa de orientação?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              O assistente ajuda você a encontrar o próximo passo.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAssistant}
          className="w-full sm:w-auto h-10 px-4 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-[0.98]"
        >
          <span>Abrir assistente</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </section>
    </div>
  );
}

export const RouteComponent = RouteContent;
