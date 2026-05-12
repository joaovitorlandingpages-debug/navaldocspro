import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { 
  ShieldAlert, Users, FileStack, Activity, 
  Settings, LayoutGrid, ArrowLeft, Search, Filter, 
  Download, Plus, MoreHorizontal, Database, 
  ShieldCheck, Terminal, CreditCard, Zap, Cpu, History
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
    { name: "Modelos de Docs", icon: <FileStack className="h-5 w-5" />, path: "/admin/documents" },
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
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

       <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                   <Zap className="h-5 w-5 text-amber-500" /> Logs de Inteligência & IA
                </h3>
                <button className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Ver Todos</button>
             </div>
             <div className="space-y-3 font-mono">
                {[
                  { event: "OCR_PROCESS_SUCCESS", meta: "CNH_SCAN_492", time: "10:42:01", status: "ok" },
                  { event: "AUTO_DOC_GEN", meta: "PROC_882_REQUEST", time: "10:40:15", status: "ok" },
                  { event: "WHATSAPP_API_SENT", meta: "+55119992...", time: "10:38:44", status: "ok" },
                  { event: "IA_CLASSIFY_SHIP", meta: "PETROLEIRO_PHX", time: "10:35:12", status: "ok" },
                  { event: "DPC_SINC_ERROR", meta: "GATEWAY_TIMEOUT", time: "10:30:00", status: "error" },
                  { event: "OCR_LOW_CONFIDENCE", meta: "DOC_RG_AMADOR", time: "10:25:22", status: "warn" }
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all text-[10px]">
                     <div className="flex gap-4 items-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                          log.status === 'ok' ? 'bg-green-500/20 text-green-500' : 
                          log.status === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>{log.status.toUpperCase()}</span>
                        <span className="text-slate-300 font-bold">{log.event}</span>
                        <span className="text-slate-500 italic">params: {log.meta}</span>
                     </div>
                     <span className="text-slate-600">{log.time}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="space-y-8">
             <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                      <Activity className="h-5 w-5 text-red-500" /> Segurança
                   </h3>
                </div>
                <div className="space-y-4">
                  {[
                    { action: "Novo cadastro de empresa", target: "Oceanic Logística", time: "2 min atrás", type: "success" },
                    { action: "Upgrade de plano", target: "Eng. Gabriel Silva", time: "15 min atrás", type: "upgrade" },
                    { action: "Falha na exportação PDF", target: "Usuário #4920", time: "1h atrás", type: "error" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent">
                        <div className="flex gap-3 items-center">
                          <div className={`h-2 w-2 rounded-full ${log.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
                          <div>
                            <p className="text-xs font-bold text-slate-200">{log.action}</p>
                            <p className="text-[9px] text-slate-500 font-mono italic">{log.target}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-600">{log.time}</span>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                      <Database className="h-5 w-5 text-blue-500" /> Infra
                   </h3>
                </div>
                <div className="space-y-6">
                   {[
                     { label: "IA Worker", val: 45 },
                     { label: "OCR Engine", val: 82 },
                     { label: "Storage", val: 68 }
                   ].map((s, i) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                           <span>{s.label}</span>
                           <span>{s.val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500" style={{ width: `${s.val}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
