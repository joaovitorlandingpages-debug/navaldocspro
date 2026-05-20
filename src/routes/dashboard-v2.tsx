import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Anchor, LayoutDashboard, Users, Ship, ClipboardList, 
  LogOut, Plus, Menu, LayoutGrid, Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  useEffect(() => {
    console.log("DASHBOARD_V2_RENDERED");
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
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Simple Sidebar */}
      <aside className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all bg-[#001529] text-white flex flex-col z-50`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <Anchor className="h-8 w-8 text-blue-400 flex-shrink-0" />
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">NavalDocs</span>}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.name}
              to={item.path}
              activeProps={{ className: "bg-blue-600 text-white" }}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              {item.icon}
              {isSidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          ))}
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

  useEffect(() => {
    if (!isLoading) {
      console.log("CLIENTS_QUERY_OK");
      console.log("VESSELS_QUERY_OK");
      console.log("PROCESSES_QUERY_OK");
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
        <p className="text-slate-500">Acesso rápido aos seus dados operacionais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.activeCustomers || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Embarcações</CardTitle>
            <Ship className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.totalVessels || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Processos Abertos</CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.openProcesses || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 mt-8">
        <Link to="/processes">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 h-auto rounded-xl font-bold flex items-center gap-2">
            <Plus className="h-5 w-5" /> Novo Processo
          </Button>
        </Link>
        <Link to="/customers">
          <Button variant="outline" className="px-8 py-6 h-auto rounded-xl font-bold flex items-center gap-2 border-slate-200">
            <Users className="h-5 w-5" /> Ver Clientes
          </Button>
        </Link>
        <Link to="/vessels">
          <Button variant="outline" className="px-8 py-6 h-auto rounded-xl font-bold flex items-center gap-2 border-slate-200">
            <Ship className="h-5 w-5" /> Ver Embarcações
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         <Card className="border-none shadow-sm bg-white">
            <CardHeader>
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" /> Atividade Recente
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-slate-400 italic">Módulo simplificado em modo de estabilização.</p>
            </CardContent>
         </Card>
         <Card className="border-none shadow-sm bg-white">
            <CardHeader>
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-blue-500" /> Links Úteis
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <p className="text-xs text-slate-600">• Central de Suporte</p>
               <p className="text-xs text-slate-600">• Base de Conhecimento</p>
               <p className="text-xs text-slate-600">• Changelog v15.6</p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
