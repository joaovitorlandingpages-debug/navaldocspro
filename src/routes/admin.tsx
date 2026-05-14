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
  History
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const adminNavItems = [
    { name: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin" },
    { name: "Empresas", icon: <Building className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Financeiro", icon: <CreditCard className="h-5 w-5" />, path: "/admin/billing" },
    { name: "Usuários Global", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { name: "Logs de Sistema", icon: <Activity className="h-5 w-5" />, path: "/admin/logs" },
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
  const stats = [
    { label: "Empresas", value: "12", trend: "+2 este mês" },
    { label: "Usuários Ativos", value: "156", trend: "+12%" },
    { label: "Documentos", value: "4.2k", trend: "Recorde" },
    { label: "Faturamento", value: "R$ 42k", trend: "+8%" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Overview Global</h1>
        <p className="text-slate-500 font-medium">Controle total da infraestrutura e negócios.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-6">Empresas Recentes</h4>
            <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary" />
                       </div>
                       <div>
                          <p className="font-bold text-navy text-sm">Empresa Naval {i}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Assinatura Premium</p>
                       </div>
                    </div>
                    <button className="text-[10px] font-black uppercase text-primary hover:underline">Detalhes</button>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-navy text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <Activity className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 group-hover:scale-110 transition-all duration-500" />
            <div className="relative z-10">
               <h4 className="font-black uppercase tracking-widest text-xs mb-4 text-primary">Status do Sistema</h4>
               <p className="text-2xl font-bold mb-6">Todos os módulos operando normalmente.</p>
               <div className="flex gap-4">
                  <div className="flex-grow bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                     <p className="text-[10px] font-black uppercase opacity-60">Uptime</p>
                     <p className="text-xl font-black text-primary">99.9%</p>
                  </div>
                  <div className="flex-grow bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                     <p className="text-[10px] font-black uppercase opacity-60">Latency</p>
                     <p className="text-xl font-black text-primary">24ms</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
