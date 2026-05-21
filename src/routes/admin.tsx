import { createFileRoute, Outlet, Link, Navigate } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  Users, 
  Building, 
  Settings, 
  Activity, 
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  CreditCard,
  History,
  FileText,
  Zap,
  Globe,
  CheckCircle2,
  TrendingUp,
  Menu
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { profile, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  console.log("ADMIN_GLOBAL_PREMIUM_OK");

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-navy gap-4">
        <ShieldCheck className="h-12 w-12 text-primary animate-spin" />
        <p className="text-white/60 text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Operações Master...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth/login" />;
  }

  // Permissão estrita para Admin Master Global ou Admin Master
  if (profile?.role !== 'admin_master' && profile?.role !== 'admin_master_global') {
    return <Navigate to="/dashboard" />;
  }


  const adminNavItems = [
    { name: "Global Ops", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin" },
    { name: "Comercial", icon: <TrendingUp className="h-5 w-5" />, path: "/admin/commercial" },
    { name: "Empresas", icon: <Building className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Billing Global", icon: <CreditCard className="h-5 w-5" />, path: "/admin/billing" },
    { name: "Biblioteca Master", icon: <FileText className="h-5 w-5" />, path: "/admin/document-library" },
    { name: "Users Master", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { name: "Audit Logs", icon: <History className="h-5 w-5" />, path: "/admin/logs" },
    { name: "Engine Rules", icon: <Zap className="h-5 w-5" />, path: "/admin/automation" },
    { name: "System Report", icon: <ShieldCheck className="h-5 w-5" />, path: "/admin/system-report" },
    { name: "Control Center", icon: <Settings className="h-5 w-5" />, path: "/admin/settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Admin Sidebar Premium */}
      <aside 
        className={`${
          isSidebarOpen ? "w-72" : "w-20"
        } transition-all duration-500 bg-[#020D1D] text-white flex flex-col z-50 border-r border-white/5`}
      >
        <div className="p-8 flex items-center gap-4 border-b border-white/5 bg-navy/20">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
             <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500">
               <span className="font-black text-xl tracking-tighter uppercase italic">Master <span className="text-primary">Ops</span></span>
            </div>
          )}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-2">
          {adminNavItems.map((item) => (
            <Link 
              key={item.name}
              to={item.path}
              activeProps={{ className: "bg-primary text-white shadow-lg shadow-primary/20" }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
            >
              <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
              {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
           <Link to="/dashboard" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Voltar ao App</span>}
           </Link>
           <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all">
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Sair</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
        <header className="h-auto min-h-16 bg-white border-b flex flex-col z-40">
           <div className="h-auto py-4 flex items-center justify-between px-8 border-b border-slate-50 gap-4">
              <div className="flex items-center gap-6 flex-grow">
                 <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg lg:block hidden">
                   <Menu className="h-5 w-5 text-slate-400" />
                 </button>
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <BackButton />
                       <div className="h-4 w-px bg-slate-200 mx-1" />
                       <Breadcrumbs />
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                 </div>
                 <span className="text-xs font-bold text-navy">ROOT ADMIN</span>
              </div>
           </div>
        </header>

        <main className="flex-grow overflow-y-auto p-8">
           <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminDashboardView() {
  const { data: companies } = useQuery({
    queryKey: ["admin_companies_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*");
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin_users_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["system_health_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("system_health").select("*");
      return data;
    },
  });

  const stats = [
    { label: "Empresas Ativas", value: companies?.length || "0", trend: "Market Share" },
    { label: "Usuários Ativos", value: users?.length || "0", trend: "Engajamento" },
    { label: "Receita Recorrente", value: "R$ 142k", trend: "+12.5% MoM" },
    { label: "OCR Processados", value: "45.2k", trend: "Volume Mensal" },
    { label: "Storage Utilizado", value: "1.2 TB", trend: "82% Capacidade" },
    { label: "Produtividade Global", value: "98.2%", trend: "SLA Nominal" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Overview Global</h1>
          <p className="text-slate-500 font-medium">Controle total da infraestrutura e negócios NavalDocs Pro.</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border-none font-black uppercase text-[10px] tracking-widest py-2 px-4">
          v15.0 Consolidado
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute -right-2 -top-2 h-16 w-16 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10">{stat.label}</p>
            <h3 className="text-3xl font-black text-navy mt-3 relative z-10 leading-none">{stat.value}</h3>
            <div className="flex items-center gap-2 mt-4 relative z-10">
               <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-8">
               <h4 className="font-black text-navy uppercase tracking-[0.2em] text-[10px] flex items-center gap-3">
                  <Building className="h-5 w-5 text-primary" /> Ativações Pendentes
               </h4>
               <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1.5">Aguardando Triagem</Badge>
            </div>
            <div className="space-y-4">
               {companies?.filter((c: any) => c.onboarding_status === 'pending').slice(0, 3).map((company: any) => (
                 <div key={company.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary" />
                       </div>
                       <div>
                          <p className="font-bold text-navy text-sm">{company.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Passo {company.onboarding_step}/7</p>
                       </div>
                    </div>
                    <Link to="/admin/companies" className="text-[10px] font-black uppercase text-primary hover:underline">Ajudar</Link>
                 </div>
               ))}
               {(!companies || companies.filter((c: any) => c.onboarding_status === 'pending').length === 0) && (
                 <p className="text-center text-slate-400 text-sm py-4">Nenhuma empresa em onboarding pendente.</p>
               )}
            </div>
         </div>

         <div className="bg-navy text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <Activity className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 group-hover:scale-110 transition-all duration-500" />
            <div className="relative z-10">
               <h4 className="font-black uppercase tracking-widest text-xs mb-4 text-primary">Infraestrutura</h4>
               <p className="text-2xl font-bold mb-6">Módulos críticos em operação.</p>
               <div className="grid grid-cols-2 gap-4">
                  {health?.slice(0, 4).map((h: any) => (
                    <div key={h.id} className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                       <p className="text-[10px] font-black uppercase opacity-60">{h.module_name}</p>
                       <div className="flex items-center justify-between mt-1">
                          <p className="text-lg font-black text-primary">{h.status === 'operational' ? 'OK' : 'ERR'}</p>
                          <span className={`h-2 w-2 rounded-full ${h.status === 'operational' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       </div>
                    </div>
                  ))}
               </div>
               <Link to="/status" className="mt-6 inline-block text-[10px] font-black uppercase text-white/40 hover:text-white transition-all underline decoration-primary">Ver Status Público</Link>
            </div>
         </div>
      </div>
    </div>
  );
}
