import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
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
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { profile, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  // Permissão estrita para Admin Master
  if (profile?.role !== 'admin_master') {
    return <Navigate to="/dashboard" />;
  }


  const adminNavItems = [
    { name: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin" },
    { name: "Empresas", icon: <Building className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Financeiro", icon: <CreditCard className="h-5 w-5" />, path: "/admin/billing" },
    { name: "Templates Oficiais", icon: <FileText className="h-5 w-5" />, path: "/admin/documents" },
    { name: "Usuários Global", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { name: "Logs de Sistema", icon: <Activity className="h-5 w-5" />, path: "/admin/logs" },
    { name: "Teste de Pagamento", icon: <CreditCard className="h-5 w-5" />, path: "/admin/payment-test" },
    { name: "Relatório Técnico", icon: <ShieldCheck className="h-5 w-5" />, path: "/admin/system-report" },
    { name: "Configurações", icon: <Settings className="h-5 w-5" />, path: "/admin/settings" },

  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Admin Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-slate-900 text-white flex flex-col z-50`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <ShieldCheck className="h-8 w-8 text-primary flex-shrink-0" />
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight uppercase">Admin Master</span>}
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
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 z-40">
           <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Plataforma Global NavalDocs</h2>
           <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                 <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <span className="text-xs font-bold text-navy">ROOT ADMIN</span>
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

  const { data: health } = useQuery({
    queryKey: ["system_health_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("system_health").select("*");
      return data;
    },
  });

  const stats = [
    { label: "Empresas", value: companies?.length || "0", trend: "Ativas no sistema" },
    { label: "Onboarding", value: companies?.filter((c: any) => c.onboarding_status === 'pending').length || "0", trend: "Em configuração" },
    { label: "Saúde Global", value: health?.every((h: any) => h.status === 'operational') ? "100%" : "Alerta", trend: "Status dos serviços" },
    { label: "Faturamento", value: "R$ 42k", trend: "+8% este mês" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Overview Global</h1>
        <p className="text-slate-500 font-medium">Controle total da infraestrutura e negócios NavalDocs Pro.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-navy mt-2">{stat.value}</h3>
            <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Dica Estratégica de Marketing</h4>
            <p className="text-sm text-navy/80 font-medium mt-1">
              Assim como em clínicas, perfis de engenharia naval no Google Meu Negócio performam melhor com 1-2 postagens de "Atualizações" semanais (como vistorias concluídas ou dicas de NORMAM).
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.open('https://business.google.com/', '_blank')}
          className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:scale-105 transition-all flex-shrink-0"
        >
          Acessar GMB
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-6">Empresas em Onboarding</h4>
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
