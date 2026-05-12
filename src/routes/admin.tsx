import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { 
  ShieldAlert, Users, FileStack, Activity, 
  Settings, LayoutGrid, ArrowLeft, Search, Filter, 
  Download, Plus, MoreHorizontal, Database, 
  ShieldCheck, Terminal, CreditCard
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  staticData: { hideMasterView: false }
});

function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const adminMenu = [
    { name: "Visão Geral", icon: <LayoutGrid className="h-5 w-5" />, path: "/admin" },
    { name: "Usuários", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { name: "Empresas", icon: <Database className="h-5 w-5" />, path: "/admin/companies" },
    { name: "Documentos Globais", icon: <FileStack className="h-5 w-5" />, path: "/admin/documents" },
    { name: "Logs do Sistema", icon: <Terminal className="h-5 w-5" />, path: "/admin/logs" },
    { name: "Planos & Cobrança", icon: <CreditCard className="h-5 w-5" />, path: "/admin/plans" },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Admin Sidebar */}
      <aside className={`bg-black/40 border-r border-white/5 ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all flex flex-col`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              {isSidebarOpen && <span className="font-black text-xl tracking-tighter uppercase">Master <span className="text-red-500">Admin</span></span>}
           </div>
        </div>

        <nav className="flex-grow p-4 space-y-2">
           {adminMenu.map((item) => (
             <Link 
               key={item.name} 
               to={item.path} 
               className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
               activeProps={{ className: "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" }}
             >
               <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
               {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.name}</span>}
             </Link>
           ))}
        </nav>

        <div className="p-4 border-t border-white/5">
           <Link to="/dashboard" className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowLeft className="h-5 w-5" />
              {isSidebarOpen && <span className="font-bold text-sm">Voltar ao App</span>}
           </Link>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0">
         <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-black/20 backdrop-blur-sm">
            <h2 className="font-mono text-xs text-slate-500 uppercase tracking-[0.2em]">NavalDocs Pro // Secure Administration Layer</h2>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-slate-400 font-mono">SYSTEM ONLINE</span>
               </div>
               <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/50">
                  <ShieldCheck className="h-5 w-5 text-red-500" />
               </div>
            </div>
         </header>

         <main className="flex-grow p-8 overflow-y-auto">
            <Outlet />
         </main>
      </div>
    </div>
  );
}

export function AdminDashboardView() {
  const stats = [
    { label: "Total Usuários", value: "1,248", change: "+14%", icon: <Users /> },
    { label: "Receita (MRR)", value: "R$ 42.400", change: "+8.2%", icon: <CreditCard /> },
    { label: "Processos Ativos", value: "4.892", change: "+21%", icon: <Activity /> },
    { label: "Erros Críticos", value: "0", change: "Stable", icon: <ShieldAlert className="text-green-500" /> },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-white">Painel Master</h1>
            <p className="text-slate-500 font-mono text-xs italic">Controle global da infraestrutura NavalDocs Pro.</p>
          </div>
          <div className="flex gap-3">
             <button className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-all text-slate-300">
                <Download className="h-4 w-4" /> Exportar Dados
             </button>
             <button className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">
                <Plus className="h-4 w-4" /> Novo Alerta Global
             </button>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:border-red-500/30 transition-all group relative overflow-hidden backdrop-blur-md">
               <div className="flex justify-between items-center mb-6">
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-red-500/10 group-hover:text-red-500 transition-all border border-white/5">
                     {stat.icon}
                  </div>
                  <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">{stat.change}</span>
               </div>
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
               <h3 className="text-3xl font-black text-white">{stat.value}</h3>
            </div>
          ))}
       </div>

       <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" /> Atividade Recente
             </h3>
             <div className="space-y-4">
                {[
                  { action: "Novo cadastro de empresa", target: "Oceanic Logística", time: "2 min atrás", type: "success" },
                  { action: "Upgrade de plano", target: "Eng. Gabriel Silva", time: "15 min atrás", type: "upgrade" },
                  { action: "Falha na exportação PDF", target: "Usuário #4920", time: "1h atrás", type: "error" },
                  { action: "Backup concluído", target: "Database Master", time: "3h atrás", type: "info" }
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 cursor-pointer">
                     <div className="flex gap-4 items-center">
                        <div className={`h-2 w-2 rounded-full ${
                          log.type === 'success' ? 'bg-green-500' : 
                          log.type === 'error' ? 'bg-red-500 animate-pulse' :
                          log.type === 'upgrade' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div>
                           <p className="text-sm font-bold">{log.action}</p>
                           <p className="text-xs text-slate-500">{log.target}</p>
                        </div>
                     </div>
                     <span className="text-[10px] font-mono text-slate-600">{log.time}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" /> Status dos Serviços
             </h3>
             <div className="space-y-6">
                {[
                  { label: "Servidor Principal", status: "Operacional", val: 99 },
                  { label: "Banco de Dados (Supabase)", status: "Operacional", val: 100 },
                  { label: "Storage (Documentos)", status: "Carga Alta", val: 78, color: "yellow" },
                  { label: "API Mercado Pago", status: "Operacional", val: 99 }
                ].map((s, i) => (
                  <div key={i} className="space-y-2">
                     <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-300">{s.label}</span>
                        <span className={`text-xs font-mono ${s.color === 'yellow' ? 'text-yellow-500' : 'text-green-500'}`}>{s.status} ({s.val}%)</span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${s.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${s.val}%` }}
                        />
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}
