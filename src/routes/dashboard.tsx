import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { 
  Anchor, LayoutDashboard, Users, Ship, ClipboardList, 
  FileText, CreditCard, Settings, LogOut, Bell, Search, Plus, 
  Menu, X, TrendingUp, Clock, ShieldCheck, Activity
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { name: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/dashboard" },
    { name: "Clientes", icon: <Users className="h-5 w-5" />, path: "/customers" },
    { name: "Embarcações", icon: <Ship className="h-5 w-5" />, path: "/vessels" },
    { name: "Processos", icon: <ClipboardList className="h-5 w-5" />, path: "/processes" },
    { name: "Documentos", icon: <FileText className="h-5 w-5" />, path: "/documents" },
    { name: "Planos", icon: <CreditCard className="h-5 w-5" />, path: "/plans" },
    { name: "Ajustes", icon: <Settings className="h-5 w-5" />, path: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-navy text-white flex flex-col z-50`}
      >
        <div className="p-6 flex items-center gap-3">
          <Anchor className="h-8 w-8 text-primary flex-shrink-0" />
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">NavalDocs</span>}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.name}
              to={item.path}
              activeProps={{ className: "bg-primary text-white shadow-lg" }}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
              {isSidebarOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
           <Link to="/admin" className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <ShieldCheck className="h-5 w-5" />
              {isSidebarOpen && <span className="text-sm">Painel Admin</span>}
           </Link>
           <button className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span className="font-medium">Sair</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 z-40">
           <div className="flex items-center gap-4 flex-grow">
              <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg lg:block hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="relative max-w-md w-full hidden sm:block">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                 <input 
                   placeholder="Buscar processos, barcos ou clientes..." 
                   className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                 />
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-slate-100 rounded-full">
                 <Bell className="h-5 w-5 text-slate-600" />
                 <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                 <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-navy">Eng. Ricardo Almeida</p>
                    <p className="text-xs text-muted-foreground">Plano Pro</p>
                 </div>
                 <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                    RA
                 </div>
              </div>
           </div>
        </header>

        {/* Dynamic Content Container */}
        <main className="flex-grow overflow-y-auto p-8">
           <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DashboardContent() {
  const stats = [
    { label: "Clientes Ativos", value: "42", icon: <Users className="text-blue-600" />, trend: "+12%" },
    { label: "Embarcações", value: "86", icon: <Ship className="text-cyan-600" />, trend: "+5%" },
    { label: "Processos em Aberto", value: "18", icon: <ClipboardList className="text-amber-600" />, trend: "-2" },
    { label: "Documentos Gerados", value: "1.240", icon: <FileText className="text-green-600" />, trend: "+124" },
  ];

  const recentProcesses = [
    { id: "PR-2024-001", client: "Navegação Mar Azul", ship: "Petroleiro Phoenix", status: "Em Análise", date: "10/05/2024" },
    { id: "PR-2024-002", client: "Estaleiro Central", ship: "Rebocador Titan", status: "Aguardando Docs", date: "09/05/2024" },
    { id: "PR-2024-003", client: "Marina Yacht Club", ship: "Veleiro Aurora", status: "Concluído", date: "08/05/2024" },
    { id: "PR-2024-004", client: "Pescados do Porto", ship: "Traineira Netuno", status: "Em Elaboração", date: "07/05/2024" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao centro de operações NavalDocs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-grow sm:flex-initial bg-white border border-slate-200 text-navy px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4" /> Relatórios
          </button>
          <button className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> Novo Processo
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary transition-all">
                   {stat.icon}
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {stat.trend}
                </span>
             </div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
             <h3 className="text-2xl md:text-3xl font-black text-navy mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts & Table Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
         {/* Main Activity Column */}
         <div className="lg:col-span-2 space-y-8">
            {/* Gráfico Fictício */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-navy flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Atividade de Processos
                  </h3>
                  <select className="bg-slate-50 border-none text-[10px] font-bold uppercase rounded-lg px-3 py-1.5 outline-none">
                     <option>Últimos 7 dias</option>
                     <option>Último mês</option>
                  </select>
               </div>
               {/* Visual placeholder for chart */}
               <div className="h-64 w-full flex items-end gap-2 md:gap-4 px-2">
                  {[45, 60, 40, 75, 50, 90, 65].map((h, i) => (
                    <div key={i} className="flex-grow bg-slate-50 rounded-t-xl relative group">
                       <div 
                         className="absolute bottom-0 left-0 w-full bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-xl" 
                         style={{ height: `${h}%` }} 
                       />
                       <div 
                         className="absolute bottom-0 left-0 w-full bg-primary rounded-t-xl transition-all" 
                         style={{ height: `${h/2}%` }} 
                       />
                    </div>
                  ))}
               </div>
               <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                  <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
               </div>
            </div>

            {/* Recent Processes */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-bold text-navy flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Últimos Processos
                  </h3>
                  <button className="text-xs text-primary font-black uppercase tracking-widest hover:underline">Ver todos</button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">CLIENTE / EMBARCAÇÃO</th>
                          <th className="px-6 py-4">STATUS</th>
                          <th className="px-6 py-4 text-right">DATA</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {recentProcesses.map((proc, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 font-mono text-xs text-slate-400">{proc.id}</td>
                           <td className="px-6 py-4">
                              <div className="font-bold text-sm text-navy">{proc.client}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Ship className="h-3 w-3" /> {proc.ship}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                proc.status === 'Concluído' ? 'bg-green-100 text-green-700' : 
                                proc.status === 'Aguardando Docs' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                 {proc.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right text-xs text-slate-500">{proc.date}</td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Sidebar Widgets */}
         <div className="space-y-8">
            <div className="bg-navy text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="h-48 w-48" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Desempenho
                  </h4>
                  <p className="text-slate-400 text-sm mb-8">Sua eficiência subiu 15% este mês.</p>
                  
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                           <span className="text-slate-400">Meta Mensal</span>
                           <span className="text-primary">85%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[10px] text-slate-500 font-bold uppercase">Tempo Médio</p>
                           <p className="text-lg font-black">4.2d</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[10px] text-slate-500 font-bold uppercase">Taxa Aprovação</p>
                           <p className="text-lg font-black">98%</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <h3 className="font-bold text-navy mb-6 flex items-center gap-2">
                 <Bell className="h-5 w-5 text-amber-500 animate-bounce" /> Alertas Críticos
               </h3>
               <div className="space-y-4">
                  {[
                    { title: "Vistoria Anual - Phoenix", days: "Faltam 3 dias", color: "red", desc: "Vencimento de certificação DPC." },
                    { title: "Certificado de Segurança", days: "Faltam 12 dias", color: "amber", desc: "Titan requer renovação de CSN." }
                  ].map((alert, i) => (
                    <div key={i} className={`p-4 rounded-2xl border-l-4 transition-all hover:bg-slate-50 cursor-pointer`} style={{ borderLeftColor: alert.color === 'red' ? '#ef4444' : '#f59e0b', backgroundColor: alert.color === 'red' ? '#fef2f2' : '#fffbeb' }}>
                       <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-navy">{alert.title}</p>
                       </div>
                       <p className="text-xs text-slate-500 mb-2">{alert.desc}</p>
                       <p className={`text-[10px] font-black uppercase ${alert.color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{alert.days}</p>
                    </div>
                  ))}
               </div>
               <button className="w-full mt-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-navy transition-colors">Ignorar Todos</button>
            </div>
         </div>
      </div>
    </div>
  );
}
