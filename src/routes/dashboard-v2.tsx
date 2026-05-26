import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Anchor, LayoutDashboard, Users, Ship, ClipboardList, 
  LogOut, Plus, Menu, LayoutGrid, Activity, FileText, FilePlus, 
  Library, Zap, ShieldCheck, DollarSign, BarChart3, Settings,
  Building2, UserCog, ScrollText, History, ShieldAlert, MonitorPlay,
  CreditCard, Briefcase, TrendingUp, Sparkles, Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNewProcess } from "@/hooks/useNewProcess";
import { DashboardQuickWidgets } from "@/components/dashboard/DashboardQuickWidgets";
import { ActivityFeed } from "@/components/ActivityFeed";
import { OperationalCharts } from "@/components/OperationalCharts";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { useTelemetry } from "@/hooks/useTelemetry";

export const Route = createFileRoute("/dashboard-v2")({
  component: () => (
    <ProtectedRoute>
      <DashboardV2Layout />
    </ProtectedRoute>
  ),
});

function DashboardV2Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { profile, loading, signOut } = useAuth();
  const { setIsNewProcessOpen } = useNewProcess();
  const navigate = useNavigate();
  useTelemetry("Dashboard V2");

  const isAdmin = profile?.role === 'admin_master' || profile?.role === 'admin_master_global';

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'customer' || profile.role === 'client') {
        navigate({ to: "/client-portal" });
      }
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      import("@/utils/enterpriseScale").then(m => m.EnterpriseScale.audit());
      console.log("PRODUCTION_UI_MODE_ACTIVE");
    }
    console.log("USER_DASHBOARD_CLEANED");
  }, [isAdmin]);



  const handleLogout = async () => {
    try {
      console.log("LOGOUT_CLICKED");
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

  const navItems = [
    { name: "Painel Principal", icon: <LayoutDashboard className="h-5 w-5" />, path: "/dashboard-v2" },
    { name: "Clientes", icon: <Users className="h-5 w-5" />, path: "/customers" },
    { name: "Embarcações", icon: <Ship className="h-5 w-5" />, path: "/vessels" },
    { name: "Processos", icon: <ClipboardList className="h-5 w-5" />, path: "/processes" },
    { name: "Documentos", icon: <FileText className="h-5 w-5" />, path: "/documents" },
    { name: "Gerador de Documentos", icon: <FilePlus className="h-5 w-5" />, path: "/document-generator" },
    { name: "Biblioteca Documental", icon: <Library className="h-5 w-5" />, path: "/dashboard/documents-base" },
    { name: "OCR", icon: <Zap className="h-5 w-5" />, path: "/ocr-center" },
    { name: "Operações", icon: <Briefcase className="h-5 w-5" />, path: "/operations-center" },
    { name: "Assinaturas", icon: <CreditCard className="h-5 w-5" />, path: "/billing/subscription" },
    { name: "Financeiro", icon: <DollarSign className="h-5 w-5" />, path: "/plans" },
    { name: "Analytics", icon: <BarChart3 className="h-5 w-5" />, path: "/analytics" },
    { name: "Configurações", icon: <Settings className="h-5 w-5" />, path: "/settings" },
  ];

  const isAdmin = profile?.role === 'admin_master' || profile?.role === 'admin_master_global';

  const adminItems = isAdmin ? [
    { name: "Admin Global", icon: <ShieldCheck className="h-5 w-5" />, path: "/admin" },
    { name: "Empresas", icon: <Building2 className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Usuários", icon: <UserCog className="h-5 w-5" />, path: "/admin/users" },
    { name: "Templates Oficiais", icon: <ScrollText className="h-5 w-5" />, path: "/admin/templates" },
    { name: "Logs", icon: <History className="h-5 w-5" />, path: "/admin/logs" },
    { name: "Segurança", icon: <ShieldAlert className="h-5 w-5" />, path: "/admin/security" },
    { name: "Monitoramento", icon: <MonitorPlay className="h-5 w-5" />, path: "/system-monitor" },
    { name: "Billing Global", icon: <DollarSign className="h-5 w-5" />, path: "/admin/billing" },
  ] : [];

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Simple Sidebar */}
      <aside className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all bg-[#001529] text-white flex flex-col z-50`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <Anchor className="h-8 w-8 text-blue-400 flex-shrink-0" />
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">NavalDocs</span>}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.name}
                to={item.path}
                activeProps={{ className: "bg-blue-600 text-white" }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                {item.icon}
                {isSidebarOpen && <span className="text-xs font-medium">{item.name}</span>}
              </Link>
            ))}
            
            <button 
              onClick={() => setIsNewProcessOpen(true)}
              className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors text-white/90"
            >
              <Plus className="h-5 w-5 text-blue-400" />
              {isSidebarOpen && <span className="text-xs font-medium">Novo Processo</span>}
            </button>
          </div>

          {adminItems.length > 0 && (
            <div className="mt-8 pt-4 border-t border-white/10 space-y-1">
              {isSidebarOpen && <p className="px-3 mb-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">Administração</p>}
              {adminItems.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  activeProps={{ className: "bg-blue-600 text-white" }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                >
                  {item.icon}
                  {isSidebarOpen && <span className="text-xs font-medium">{item.name}</span>}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {isSidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Simple Main Content */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Dashboard v2</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{profile?.name || "Usuário"}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{profile?.companies?.name || "Empresa"}</p>
             </div>
             <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {profile?.name?.substring(0, 2).toUpperCase() || "ND"}
             </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-8">
           <DashboardV2Content />
           {isAdmin && (
             <div className="p-8 pt-0">
               <PerformanceMonitor />
             </div>
           )}

        </main>
      </div>
    </div>
  );
}

function DashboardV2Content() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { setIsNewProcessOpen } = useNewProcess();
  
  const { data: recentDocs } = useQuery({
    queryKey: ["recent-documents-dashboard-v2", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*, processes(id, process_type)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  useEffect(() => {
    if (!isLoading) {
      console.log("DASHBOARD_V2_STATS_LOADED");
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const mainStats = [
    { label: "Clientes Ativos", value: stats?.activeCustomers || 0, icon: <Users className="h-4 w-4 text-blue-500" /> },
    { label: "Embarcações", value: stats?.totalVessels || 0, icon: <Ship className="h-4 w-4 text-cyan-500" /> },
    { label: "Processos Abertos", value: stats?.openProcesses || 0, icon: <ClipboardList className="h-4 w-4 text-amber-500" /> },
    { label: "Documentos", value: stats?.generatedDocuments || 0, icon: <FileText className="h-4 w-4 text-emerald-500" /> },
    { label: "Análises OCR", value: stats?.ocrUsage || 0, icon: <Zap className="h-4 w-4 text-purple-500" /> },
    { label: "Pendências", value: (stats?.urgentProcesses || 0) + (stats?.expiringDocuments || 0), icon: <Activity className="h-4 w-4 text-red-500" /> },
    { label: "Tempo Economizado (IA)", value: `${stats?.timeSavedHours || 0}h`, icon: <TrendingUp className="h-4 w-4 text-blue-600" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
          <p className="text-slate-500 font-medium">Bem-vindo ao centro operacional estabilizado.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsNewProcessOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 h-auto rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-5 w-5" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mainStats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
         <div className="lg:col-span-2 space-y-8">
            <OperationalCharts />
            <ActivityFeed />
         </div>

         <div className="space-y-8">
            <DashboardQuickWidgets recentDocs={recentDocs} />
            
            <Card className="border-none shadow-sm bg-white overflow-hidden group">
               <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                     <LayoutGrid className="h-4 w-4 text-primary" /> Acesso Rápido
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                     <Link to="/customers" className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-primary/20 transition-all flex flex-col gap-2 group/nav">
                        <Users className="h-4 w-4 text-blue-500 group-hover/nav:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Clientes</span>
                     </Link>
                     <Link to="/vessels" className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-primary/20 transition-all flex flex-col gap-2 group/nav">
                        <Ship className="h-4 w-4 text-cyan-500 group-hover/nav:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Frotas</span>
                     </Link>
                     <Link to="/document-generator" className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-primary/20 transition-all flex flex-col gap-2 group/nav">
                        <FilePlus className="h-4 w-4 text-emerald-500 group-hover/nav:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Gerador</span>
                     </Link>
                     <Link to="/ocr-center" className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-primary/20 transition-all flex flex-col gap-2 group/nav">
                        <Zap className="h-4 w-4 text-purple-500 group-hover/nav:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">OCR Center</span>
                     </Link>
                  </div>
               </CardContent>
            </Card>

            {isAdmin && (
              <div className="p-8 rounded-[2.5rem] bg-navy text-white relative overflow-hidden shadow-2xl group border border-white/5">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Anchor className="h-48 w-48" />
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Sparkles className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                      <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Sistemas Operacionais</p>
                    </div>
                    <h4 className="text-xl font-bold mb-6 leading-snug">Infraestrutura Enterprise em conformidade.</h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[8px] font-black uppercase text-white/40 mb-1">OCR Status</p>
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Zap className="h-3 w-3" /> 98%
                          </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[8px] font-black uppercase text-white/40 mb-1">SLA Ativo</p>
                          <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> 100%
                          </p>
                      </div>
                    </div>

                    <p className="text-[10px] font-medium text-white/40 italic leading-relaxed">
                      Gerenciamento de recursos técnicos avançados ativo.
                    </p>
                </div>
              </div>
            )}

         </div>
      </div>
    </div>
  );
}
