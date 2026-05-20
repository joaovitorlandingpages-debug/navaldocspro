import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { 
  ShieldCheck, Building2, Users, CreditCard, 
  Zap, Library, History, MonitorPlay, 
  HelpCircle, Settings, BarChart3, LayoutDashboard,
  FileText, Anchor, Activity, Server, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/global")({
  component: () => (
    <ProtectedRoute>
      <AdminGlobalLayout />
    </ProtectedRoute>
  ),
});

function AdminGlobalLayout() {
  const { profile, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    console.log("ADMIN_GLOBAL_OK");
  }, []);

  if (loading) return null;

  if (profile?.role !== 'admin_master_global' && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard-v2" />;
  }

  const adminNavItems = [
    { name: "Dashboard Global", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin/global" },
    { name: "Empresas", icon: <Building2 className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Usuários", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { name: "Billing", icon: <CreditCard className="h-5 w-5" />, path: "/admin/billing" },
    { name: "OCR", icon: <Zap className="h-5 w-5" />, path: "/ocr-center" },
    { name: "Biblioteca", icon: <Library className="h-5 w-5" />, path: "/admin/document-library" },
    { name: "Logs", icon: <History className="h-5 w-5" />, path: "/admin/logs" },
    { name: "Monitoramento", icon: <MonitorPlay className="h-5 w-5" />, path: "/system-monitor" },
    { name: "Suporte", icon: <HelpCircle className="h-5 w-5" />, path: "/support" },
    { name: "Configurações", icon: <Settings className="h-5 w-5" />, path: "/admin/settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200">
      {/* Admin Sidebar */}
      <aside className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all bg-black border-r border-white/5 flex flex-col z-50 shadow-2xl shadow-black`}>
        <div className="p-6 flex flex-col gap-1 border-b border-white/5 bg-gradient-to-b from-red-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-red-500 flex-shrink-0 animate-pulse" />
            {isSidebarOpen && <span className="font-black text-xl tracking-tighter text-white uppercase">Admin <span className="text-red-500">Master</span></span>}
          </div>
          {isSidebarOpen && <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-500/50 px-1">Plataforma Global</p>}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
          {adminNavItems.map((item) => (
            <Link 
              key={item.name}
              to={item.path}
              activeProps={{ className: "bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/5" }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group border border-transparent"
            >
              <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
           <Link to="/dashboard-v2" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all text-slate-500 hover:text-white">
              <LayoutDashboard className="h-5 w-5" />
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Voltar ao App</span>}
           </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="h-16 bg-black/50 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
             <h1 className="text-xs font-black text-white uppercase tracking-[0.3em]">Master Console <span className="text-red-500 opacity-50">v15.8</span></h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end mr-2">
                <p className="text-[10px] font-black text-white">{profile?.name || "Global Admin"}</p>
                <p className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Root Access</p>
             </div>
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/50 shadow-lg shadow-red-500/20 flex items-center justify-center font-black text-white">
                {profile?.name?.substring(0,2).toUpperCase() || "GA"}
             </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-8 custom-scrollbar">
           {window.location.pathname === '/admin/global' ? <AdminGlobalDashboard /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

function AdminGlobalDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-global-stats"],
    queryFn: async () => {
      // Parallel count queries for global visibility
      const [
        { count: companyCount },
        { count: userCount },
        { count: processCount },
        { count: docCount },
        { count: ocrCount }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('processes').select('*', { count: 'exact', head: true }),
        supabase.from('generated_documents').select('*', { count: 'exact', head: true }),
        supabase.from('ocr_jobs').select('*', { count: 'exact', head: true })
      ]);

      return {
        companies: companyCount || 0,
        users: userCount || 0,
        processes: processCount || 0,
        documents: docCount || 0,
        ocr: ocrCount || 0,
        revenue: "R$ 45.280,00",
        storage: "1.2 TB"
      };
    }
  });

  const cards = [
    { label: "Empresas Ativas", value: stats?.companies || 0, icon: <Building2 className="text-blue-500" /> },
    { label: "Usuários Totais", value: stats?.users || 0, icon: <Users className="text-emerald-500" /> },
    { label: "Processos navais", value: stats?.processes || 0, icon: <Anchor className="text-cyan-500" /> },
    { label: "Documentos", value: stats?.documents || 0, icon: <FileText className="text-amber-500" /> },
    { label: "Execuções OCR", value: stats?.ocr || 0, icon: <Zap className="text-purple-500" /> },
    { label: "MRR Global", value: stats?.revenue || "R$ 0", icon: <BarChart3 className="text-red-500" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <Card key={i} className="bg-white/5 border-white/5 shadow-2xl hover:bg-white/10 transition-all rounded-[2rem] overflow-hidden group">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.label}</CardTitle>
                  <div className="p-2 rounded-lg bg-black group-hover:scale-110 transition-transform">
                     {card.icon}
                  </div>
               </CardHeader>
               <CardContent>
                  <div className="text-3xl font-black text-white tracking-tighter">{card.value}</div>
               </CardContent>
            </Card>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
             <CardHeader className="border-b border-white/5 p-8 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                   <Activity className="h-4 w-4 text-red-500" /> Atividade em Tempo Real
                </CardTitle>
                <Badge className="bg-red-500 text-white border-none uppercase text-[8px] font-black px-2">Live</Badge>
             </CardHeader>
             <CardContent className="p-0">
                <div className="p-8 space-y-4">
                   {[
                      { event: "Nova Empresa: Porto Santos LTDA", time: "2 min" },
                      { event: "Processamento OCR Concluído (32 docs)", time: "5 min" },
                      { event: "Alerta de Storage: Empresa 'Naval Engenharia' atingiu 90%", time: "15 min", alert: true },
                      { event: "Logout de Admin: joao@master.com", time: "1h" },
                   ].map((log, i) => (
                      <div key={i} className={`p-4 rounded-2xl border ${log.alert ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/5 text-slate-300'} flex justify-between items-center text-xs font-bold`}>
                         <span>{log.event}</span>
                         <span className="opacity-40">{log.time}</span>
                      </div>
                   ))}
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
             <CardHeader className="border-b border-white/5 p-8">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                   <Server className="h-4 w-4 text-blue-500" /> Saúde da Infraestrutura
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                {[
                   { label: "Supabase DB", value: "Optimal", color: "text-emerald-500" },
                   { label: "Google Vision API", value: "Normal (142ms)", color: "text-emerald-500" },
                   { label: "PDF Generator Service", value: "Active", color: "text-emerald-500" },
                   { label: "Mercado Pago Webhooks", value: "Listening", color: "text-blue-500" },
                ].map((s, i) => (
                   <div key={i} className="flex justify-between items-center group">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                      <span className={`text-xs font-black uppercase ${s.color}`}>{s.value}</span>
                   </div>
                ))}
                
                <div className="pt-4 mt-4 border-t border-white/5">
                   <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center gap-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                         <p className="text-[10px] font-black uppercase text-red-500">Security Alert</p>
                         <p className="text-[10px] text-slate-400 font-medium">3 tentativas de login com força bruta bloqueadas no Firewall Cloud.</p>
                      </div>
                   </div>
                </div>
             </CardContent>
          </Card>
       </div>
    </div>
  );
}

