import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { 
  Anchor, LayoutDashboard, Users, Ship, ClipboardList, 
  FileText, CreditCard, Settings, LogOut, Bell, Search, Plus, 
  Menu, X, TrendingUp, Clock, ShieldCheck, Activity, FilePlus,
  Zap, Calendar as CalendarIcon, Cpu, Target, Rocket
} from "lucide-react";
import { useState, useEffect, Suspense, lazy } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ActivityFeed } from "@/components/ActivityFeed";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const { profile, loading } = useAuth();
  const { setIsNewProcessOpen } = useNewProcess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) {
      navigate({ to: "/auth/login" });
    }
  }, [profile, loading, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sessão encerrada");
      navigate({ to: "/auth/login" });
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/auth/login";
    }
  };

  const navItems = [
    { name: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/dashboard" },
    { name: "Analytics", icon: <TrendingUp className="h-5 w-5" />, path: "/analytics" },
    { name: "Central IA", icon: <Zap className="h-5 w-5" />, path: "/ai-center" },
    { name: "Agenda", icon: <CalendarIcon className="h-5 w-5" />, path: "/calendar" },
    { name: "Automação", icon: <Cpu className="h-5 w-5" />, path: "/automation" },
    { name: "Clientes", icon: <Users className="h-5 w-5" />, path: "/customers" },
    { name: "Embarcações", icon: <Ship className="h-5 w-5" />, path: "/vessels" },
    { name: "Processos", icon: <ClipboardList className="h-5 w-5" />, path: "/processes" },
    { name: "Biblioteca", icon: <FileText className="h-5 w-5" />, path: "/documents" },
    { name: "Gerador Pro", icon: <FilePlus className="h-5 w-5" />, path: "/document-generator" },
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
        <div className="p-6 flex flex-col gap-1 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Anchor className="h-8 w-8 text-primary flex-shrink-0" />
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">NavalDocs</span>}
          </div>
          {isSidebarOpen && (
            <div className="mt-2 px-1">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Ambiente Enterprise</p>
               <p className="text-[10px] font-bold text-white/40 truncate">{profile?.companies?.name || "Empresa..."}</p>
            </div>
          )}
        </div>

        <nav className="flex-grow mt-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
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
           {profile?.role === 'admin_master' && (
             <Link to="/admin" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                <ShieldCheck className="h-5 w-5" />
                {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Painel Master</span>}
             </Link>
           )}
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all"
           >
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Sair</span>}
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
           
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsNewProcessOpen(true)}
                className="hidden md:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Novo Processo
              </button>

              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setNotificationsOpen(true)}
                   className="relative p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95"
                 >
                     <Bell className="h-5 w-5 text-slate-600" />
                     <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full animate-ping" />
                     <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
                 </button>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-navy">{profile?.name || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-tighter">{profile?.role || "Plan Pro"}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {profile?.name?.substring(0, 2).toUpperCase() || "ND"}
                    </div>
                </div>
              </div>
           </div>
        </header>

        <NotificationCenter 
          isOpen={isNotificationsOpen} 
          onClose={() => setNotificationsOpen(false)} 
        />

        {/* Dynamic Content Container */}
        <main className="flex-grow overflow-y-auto p-8">
           <Suspense fallback={<DashboardSkeleton />}>
             <Outlet />
           </Suspense>
        </main>
      </div>
    </div>
  );
}

export function RouteContent() {
  const { setIsNewProcessOpen } = useNewProcess();
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
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Dashboard</h1>
          <p className="text-muted-foreground font-medium">Bem-vindo ao centro de operações NavalDocs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link 
            to="/document-generator"
            className="flex-grow sm:flex-initial bg-navy text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <FilePlus className="h-4 w-4" /> Gerar Doc
          </Link>
          <button className="flex-grow sm:flex-initial bg-white border border-slate-200 text-navy px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4" /> Relatórios
          </button>
          <button 
            onClick={() => setIsNewProcessOpen(true)}
            className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
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

      {/* Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-xl">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                 <Cpu className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded-full">Inteligência Operacional</span>
           </div>
           <h3 className="text-xl font-bold mb-1">OCR Ativo</h3>
           <p className="text-white/70 text-sm mb-4">12 documentos processados automaticamente hoje.</p>
           <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-2/3" />
           </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white shadow-xl">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                 <Rocket className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded-full">Eficiência</span>
           </div>
           <h3 className="text-xl font-bold mb-1">Gargalos Reduzidos</h3>
           <p className="text-white/70 text-sm mb-4">O tempo médio de análise caiu para 2.4 dias.</p>
           <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map(i => <div key={i} className={`h-8 flex-grow rounded-md bg-white/${i < 4 ? '40' : '10'}`} />)}
           </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-6 rounded-[2rem] text-white shadow-xl">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                 <Target className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded-full">Equipe</span>
           </div>
           <h3 className="text-xl font-bold mb-1">Top Performance</h3>
           <p className="text-white/70 text-sm mb-4">Ranking liderado por Eng. Ricardo (98% conclusão).</p>
           <div className="flex -space-x-2 mt-2">
              {[1,2,3].map(i => <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />)}
              <div className="h-8 w-8 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-[10px] font-bold">+5</div>
           </div>
        </div>
      </div>

      {/* Charts & Table Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
         {/* Main Activity Column */}
         <div className="lg:col-span-2 space-y-8">
            {/* Gráfico Fictício */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-xs tracking-widest">
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
            
            <ActivityFeed />
         </div>

            {/* Recent Processes */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Clock className="h-5 w-5 text-primary" /> Últimos Processos
                  </h3>
                  <Link to="/processes" className="text-xs text-primary font-black uppercase tracking-widest hover:underline">Ver todos</Link>
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
                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => window.location.href=`/processes/${proc.id}`}>
                           <td className="px-6 py-4 font-mono text-xs text-slate-400">{proc.id}</td>
                           <td className="px-6 py-4">
                              <div className="font-bold text-sm text-navy group-hover:text-primary transition-colors">{proc.client}</div>
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
            {/* Team Productivity Widget */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-navy uppercase text-[10px] tracking-widest flex items-center gap-2">
                     <Users className="h-4 w-4 text-primary" /> Produtividade da Equipe
                  </h3>
               </div>
               <div className="space-y-4">
                  {[
                    { name: "Ricardo Almeida", role: "Master", progress: 92, status: "online" },
                    { name: "Mariana Souza", role: "Engenheira", progress: 78, status: "offline" },
                    { name: "João Silva", role: "Despachante", progress: 65, status: "online" }
                  ].map((member, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                             <p className="text-xs font-bold text-navy">{member.name}</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{member.progress}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/20 rounded-full" style={{ width: `${member.progress}%` }} />
                       </div>
                    </div>
                  ))}
               </div>
               <Link to="/settings" className="mt-6 block text-center text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Gerenciar Equipe</Link>
            </div>

            <div className="bg-navy text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="h-48 w-48" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xl font-bold mb-2 flex items-center gap-2 uppercase tracking-tight">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Desempenho
                  </h4>
                  <p className="text-slate-400 text-xs mb-8 font-medium">Sua eficiência subiu 15% este mês.</p>
                  
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                           <span className="text-slate-500">Meta Mensal</span>
                           <span className="text-primary">85%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Tempo Médio</p>
                           <p className="text-lg font-black text-white">4.2d</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Taxa Aprovação</p>
                           <p className="text-lg font-black text-white">98%</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <h3 className="font-bold text-navy mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
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
                       <p className="text-[11px] text-slate-500 mb-2 font-medium">{alert.desc}</p>
                       <p className={`text-[10px] font-black uppercase tracking-widest ${alert.color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{alert.days}</p>
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-8">
        <Skeleton className="col-span-2 h-96 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}
