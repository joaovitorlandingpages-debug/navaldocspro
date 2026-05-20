import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Anchor, LayoutDashboard, Users, Ship, ClipboardList, 
  LogOut, Plus, Menu, LayoutGrid, Activity, FileText, FilePlus, 
  Library, Zap, ShieldCheck, DollarSign, BarChart3, Settings,
  Building2, UserCog, ScrollText, History, ShieldAlert, MonitorPlay,
  CreditCard, Briefcase, TrendingUp
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

  useEffect(() => {
    console.log("DASHBOARD_V2_RENDERED");
    console.log("DASHBOARD_STABLE");
  }, []);

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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardHeader className="border-b border-slate-50">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" /> Atividade Recente
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-8 text-center space-y-3">
                  <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                     <History className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-500 italic max-w-[200px] mx-auto">Módulo de monitoramento em tempo real sendo reativado gradualmente.</p>
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Ver Histórico Completo</Button>
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-sm bg-white">
            <CardHeader className="border-b border-slate-50">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-blue-500" /> Acesso Rápido
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
               <div className="grid grid-cols-2 gap-3">
                  <Link to="/customers" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                     <Users className="h-4 w-4 text-blue-500" />
                     <span className="text-xs font-bold text-slate-700">Gestão Clientes</span>
                  </Link>
                  <Link to="/vessels" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                     <Ship className="h-4 w-4 text-cyan-500" />
                     <span className="text-xs font-bold text-slate-700">Frotas</span>
                  </Link>
                  <Link to="/document-generator" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                     <FilePlus className="h-4 w-4 text-emerald-500" />
                     <span className="text-xs font-bold text-slate-700">Gerador Doc</span>
                  </Link>
                  <Link to="/ocr-center" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                     <Zap className="h-4 w-4 text-purple-500" />
                     <span className="text-xs font-bold text-slate-700">Portal OCR</span>
                  </Link>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
