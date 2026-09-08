import { createFileRoute, Outlet, Link, Navigate, useRouterState } from "@tanstack/react-router";
import AdminCompanies from "@/pages/admin/Companies";
import { 
  ShieldCheck, 
  Users, 
  Building, 
  Settings, 
  Activity, 
  ArrowLeft,
  LayoutDashboard,
  Bot,
  CreditCard,
  History,
  FileText,
  Zap,
  Globe,
  CheckCircle2,
  TrendingUp,
  Menu,
  Database,
  Rocket,
  MessageSquare,
  BarChart3,
  Shield,
  Layout,
  FlaskConical,
  Search,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BackNavigation } from "@/components/navigation/BackNavigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useTelemetry } from "@/hooks/useTelemetry";
import { GlobalSearch } from "@/components/GlobalSearch";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

export const AdminCompaniesRoute = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

// Error Boundary para proteger as abas do Admin contra telas brancas
class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 border-rose-200 bg-rose-50/40 text-center max-w-xl mx-auto my-12 shadow-md">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-black text-navy uppercase tracking-tight">Ops! Erro ao carregar este módulo</h3>
          <p className="text-xs text-slate-600 mt-2 font-medium">
            {this.state.error?.message || "Ocorreu uma instabilidade pontual neste módulo do Admin."}
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-6 gap-2 bg-primary text-white text-xs font-bold uppercase tracking-wider"
          >
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

interface NavCategory {
  category: string;
  items: {
    name: string;
    icon: ReactNode;
    path: string;
    badge?: string;
  }[];
}

function AdminLayout() {
  const { profile, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  useTelemetry("Admin Portal");

  const categories: NavCategory[] = useMemo(() => [
    {
      category: "Principal & Operações",
      items: [
        { name: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, path: "/admin" },
        { name: "Testes & Botões (Hub)", icon: <FlaskConical className="h-4 w-4 text-amber-400" />, path: "/admin/tests", badge: "Hub" },
        { name: "Empresas & Tenants", icon: <Building className="h-4 w-4" />, path: "/admin/companies" },
        { name: "Process Center", icon: <Rocket className="h-4 w-4" />, path: "/admin/process-center" },
        { name: "Executive Overview", icon: <Globe className="h-4 w-4" />, path: "/admin/executive-overview" },
      ]
    },
    {
      category: "Qualidade & Diagnósticos",
      items: [
        { name: "Validação de Campo", icon: <Activity className="h-4 w-4" />, path: "/admin/field-validation-report" },
        { name: "Relatório QA Final", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, path: "/admin/full-qa-report" },
        { name: "Erros de Interface", icon: <Layout className="h-4 w-4 text-rose-400" />, path: "/admin/frontend-errors" },
        { name: "Feedback Operacional", icon: <MessageSquare className="h-4 w-4" />, path: "/admin/operational-feedback" },
        { name: "Prontidão de Produção", icon: <Rocket className="h-4 w-4 text-cyan-400" />, path: "/admin/production-readiness" },
      ]
    },
    {
      category: "Financeiro & Métricas",
      items: [
        { name: "Planos & Billing", icon: <CreditCard className="h-4 w-4" />, path: "/admin/billing", badge: "Novo" },
        { name: "Métricas SaaS", icon: <BarChart3 className="h-4 w-4" />, path: "/admin/saas-metrics" },
        { name: "Comercial & Readiness", icon: <TrendingUp className="h-4 w-4" />, path: "/admin/commercial" },
      ]
    },
    {
      category: "Inteligência & IA",
      items: [
        { name: "AI Global Console", icon: <Bot className="h-4 w-4 text-violet-400" />, path: "/admin/global" },
        { name: "AI Command Center", icon: <Bot className="h-4 w-4 text-indigo-400" />, path: "/admin/ai-command-center" },
        { name: "OCR Admin", icon: <Zap className="h-4 w-4 text-amber-300" />, path: "/admin/ocr" },
      ]
    },
    {
      category: "Segurança & Infraestrutura",
      items: [
        { name: "Segurança & RLS", icon: <Shield className="h-4 w-4 text-blue-400" />, path: "/admin/security" },
        { name: "Audit Logs", icon: <History className="h-4 w-4" />, path: "/admin/logs" },
        { name: "Storage Admin", icon: <Database className="h-4 w-4" />, path: "/admin/storage" },
        { name: "Implantação & Status", icon: <Activity className="h-4 w-4" />, path: "/admin/system-report" },
        { name: "Central de Documentação", icon: <FileText className="h-4 w-4" />, path: "/admin/docs-central" },
        { name: "Ajustes Master", icon: <Settings className="h-4 w-4" />, path: "/admin/settings" },
      ]
    }
  ], []);

  // Barra de abas rápidas em destaque no topo
  const topQuickTabs = [
    { name: "Visão Geral", path: "/admin", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { name: "Testes & Botões", path: "/admin/tests", icon: <FlaskConical className="h-3.5 w-3.5 text-amber-400" />, highlight: true },
    { name: "Empresas", path: "/admin/companies", icon: <Building className="h-3.5 w-3.5" /> },
    { name: "Planos & Billing", path: "/admin/billing", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { name: "Métricas SaaS", path: "/admin/saas-metrics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { name: "AI Console", path: "/admin/global", icon: <Bot className="h-3.5 w-3.5" /> },
    { name: "Segurança", path: "/admin/security", icon: <Shield className="h-3.5 w-3.5" /> },
    { name: "Audit Logs", path: "/admin/logs", icon: <History className="h-3.5 w-3.5" /> },
    { name: "Ajustes", path: "/admin/settings", icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.name.toLowerCase().includes(term) || item.path.toLowerCase().includes(term))
      }))
      .filter(cat => cat.items.length > 0);
  }, [categories, searchTerm]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-navy gap-4">
        <ShieldCheck className="h-12 w-12 text-primary animate-spin" />
        <p className="text-white/60 text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Operações Master...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth/login" search={{ redirect: "/admin" }} />;
  }

  if (profile?.role !== 'admin_master' && profile?.role !== 'admin_master_global' && profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Categorizada */}
      <aside className={`${isSidebarOpen ? "w-72" : "w-20"} transition-all duration-300 bg-[#020D1D] text-white flex flex-col z-50 border-r border-white/5`}>
        <div className="p-5 flex items-center justify-between border-b border-white/5 bg-navy/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
               <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            {isSidebarOpen && (
              <div>
                 <span className="font-black text-lg tracking-tighter uppercase italic">Master <span className="text-primary">Ops</span></span>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Painel de Controle</p>
              </div>
            )}
          </div>
        </div>

        {/* Campo de Busca Rápida na Sidebar */}
        {isSidebarOpen && (
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar abas e funções..."
                className="h-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-xs pl-8 pr-3 rounded-lg focus:bg-white/10 focus:border-primary"
              />
            </div>
          </div>
        )}

        <nav className="flex-grow px-3 py-2 space-y-5 overflow-y-auto custom-scrollbar">
          {filteredCategories.map((group) => (
            <div key={group.category} className="space-y-1">
              {isSidebarOpen && (
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400/80 mb-1.5 flex items-center justify-between">
                  <span>{group.category}</span>
                  <span className="text-[9px] text-slate-400 font-semibold">{group.items.length}</span>
                </p>
              )}
              {group.items.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <Link 
                    key={item.name} 
                    to={item.path} 
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all group text-xs font-semibold ${
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 font-bold" 
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}>
                        {item.icon}
                      </div>
                      {isSidebarOpen && <span className="tracking-wide">{item.name}</span>}
                    </div>
                    {isSidebarOpen && item.badge && (
                      <Badge className="bg-amber-400/20 text-amber-300 border-none text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1 bg-[#010812]">
           <Link to="/dashboard" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-white text-xs font-bold">
              <ArrowLeft className="h-4 w-4" />
              {isSidebarOpen && <span className="uppercase tracking-wider">Voltar ao App</span>}
           </Link>
        </div>
      </aside>

      {/* Área Central */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
        {/* Header Principal */}
        <header className="bg-white border-b flex flex-col z-40 shadow-sm">
           <div className="py-3 px-6 flex items-center justify-between border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4 flex-grow">
                 <button 
                   onClick={() => setSidebarOpen(!isSidebarOpen)} 
                   className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                   title="Alternar Sidebar"
                 >
                   <Menu className="h-5 w-5" />
                 </button>
                 <div className="flex items-center gap-2">
                    <BackNavigation />
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <Breadcrumbs />
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <GlobalSearch />
                 <div className="h-8 px-3 rounded-full bg-slate-100 border border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-[11px] font-black text-navy uppercase tracking-wider">ROOT MASTER</span>
                 </div>
              </div>
           </div>

           {/* Barra de Abas Rápidas Horizontais (Top Tabs Bar) */}
           <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0">
                Acesso Rápido:
              </span>
              {topQuickTabs.map((tab) => {
                const isActive = currentPath === tab.path;
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                      isActive
                        ? "bg-navy text-white border-navy shadow-sm"
                        : tab.highlight
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-navy"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.name}</span>
                    {tab.highlight && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </Link>
                );
              })}
           </div>
        </header>

        {/* Conteúdo Principal com Error Boundary */}
        <main className="flex-grow overflow-y-auto p-6 md:p-8">
           <AdminErrorBoundary>
              <Outlet />
           </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function AdminDashboardView() {
  const { data: globalStats } = useQuery({
    queryKey: ["admin-global-analytics"],
    queryFn: async () => {
      const [
        { count: totalCompanies },
        { count: totalUsers },
        { count: totalProcesses },
        { count: totalDocuments },
        { data: storageData }
      ] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("processes").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("uploaded_files").select("file_size")
      ]);
      const totalStorageBytes = storageData?.reduce((acc: number, file: any) => acc + (file.file_size || 0), 0) || 0;
      const totalStorageMB = Math.round(totalStorageBytes / (1024 * 1024));
      return {
        totalCompanies: totalCompanies || 0,
        totalUsers: totalUsers || 0,
        totalProcesses: totalProcesses || 0,
        totalDocuments: totalDocuments || 0,
        totalStorageMB,
        mrr: (totalCompanies || 0) * 497,
        arr: (totalCompanies || 0) * 497 * 12
      };
    }
  });

  const stats = [
    { label: "Empresas Ativas", value: globalStats?.totalCompanies || "0", icon: Building, color: "text-primary" },
    { label: "Usuários Totais", value: globalStats?.totalUsers || "0", icon: Users, color: "text-blue-500" },
    { label: "Processos Master", value: globalStats?.totalProcesses || "0", icon: Activity, color: "text-amber-500" },
    { label: "Receita Mensal (MRR)", value: `R$ ${(globalStats?.mrr || 0).toLocaleString()}`, icon: CreditCard, color: "text-emerald-500" },
    { label: "Receita Anual (ARR)", value: `R$ ${(globalStats?.arr || 0).toLocaleString()}`, icon: TrendingUp, color: "text-indigo-500" },
    { label: "Storage SaaS", value: `${globalStats?.totalStorageMB || 0} MB`, icon: Globe, color: "text-cyan-500" },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-6">
      <PageHeader 
        title="Console Master SaaS"
        description="Gestão global de infraestrutura, clientes, auditoria e performance financeira."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2 text-xs font-bold" asChild>
              <Link to="/admin/tests">
                <FlaskConical className="h-4 w-4 text-amber-500" />
                Hub de Testes & Botões
              </Link>
            </Button>
            <Badge className="bg-primary text-white border-none font-black uppercase text-[10px] tracking-widest py-2 px-4">
              Admin Master Ativo
            </Badge>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white p-5 border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
               <stat.icon className={`h-5 w-5 ${stat.color}`} />
               <TrendingUp className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-bold text-navy mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" /> Atividade Recente das Empresas
                  </h4>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest" asChild>
                    <Link to="/admin/companies">Ver Todas</Link>
                  </Button>
               </div>
               <div className="divide-y divide-slate-50">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="h-9 w-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xs">
                         #{i+1}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-navy">Tenant Corporativo #{i+1}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase">Última atividade: recente</p>
                       </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest">Ativo</Badge>
                  </div>
                ))}
               </div>
            </Card>
         </div>
         <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm p-6 bg-slate-50/50">
               <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-5 flex items-center gap-2">
                 <History className="h-4 w-4 text-primary" /> Logs Rápidos de Auditoria
               </h4>
               <div className="space-y-4">
                  {[
                    { msg: "Novo plano Professional assinado", time: "10m atrás" },
                    { msg: "Empresa XPTO atualizou limites", time: "1h atrás" },
                    { msg: "Diagnóstico geral de botões executado", time: "Hoje" }
                  ].map((log, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-navy leading-tight">{log.msg}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{log.time}</p>
                      </div>
                    </div>
                  ))}
               </div>
               <Button variant="outline" size="sm" className="w-full mt-6 text-xs font-bold" asChild>
                 <Link to="/admin/logs">Ver Todos os Logs</Link>
               </Button>
            </Card>
         </div>
      </div>
    </div>
  );
}
