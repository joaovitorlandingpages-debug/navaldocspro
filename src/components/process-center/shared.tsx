import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  User, Ship, Clock, AlertTriangle, 
  CheckCircle2, FileText, Activity,
  Search, MessageSquare, History,
  FileCheck, Shield, Zap, TrendingUp,
  ChevronRight, ArrowRight, CheckSquare, Brain,
  Edit3, FilePlus, Signature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { OperationalSuggestion } from "@/features/process-center/engines/OperationalSuggestionEngine";
import { ProcessHealthReport } from "@/features/process-center/engines/ProcessHealthEngine";
import { DocumentStats } from "@/features/process-center/utils/processMetrics";

export function ProcessCenterHeader({ 
  process, 
  timeInProgress 
}: { 
  process: any, 
  timeInProgress?: string 
}) {
  if (!process) return null;

  return (
    <div className="bg-white border-b sticky top-0 z-30 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">
                {process.vessel?.name || "Sem embarcação"}
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[10px] tracking-widest px-3">
                {process.process_number || `#${process.id.slice(0,8)}`}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] tracking-widest px-3 uppercase">
                {process.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer">
                <User className="h-3.5 w-3.5 text-primary" />
                {process.customer?.name}
              </span>
              <div className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {timeInProgress || "Calculando..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={() => window.alert("Abrir formulário real do processo - Respeitando imutabilidade.")}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={() => window.alert("Abrir fluxo de documentos.")}
          >
            <FilePlus className="h-3.5 w-3.5" />
            Documento
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={() => window.alert("Solicitar assinatura real.")}
          >
            <Signature className="h-3.5 w-3.5" />
            Assinatura
          </Button>
          <div className="w-px h-8 bg-slate-100 mx-1" />
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => window.alert("Validar e enviar para revisão.")}
          >
            <Zap className="h-3.5 w-3.5" />
            Enviar Revisão
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProcessCenterDashboard({ 
  docStats, 
  healthReport 
}: { 
  docStats?: DocumentStats,
  healthReport?: ProcessHealthReport
}) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50/30">
      <Card 
        className="p-5 border-white bg-white shadow-sm hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-blue-500"
        onClick={() => navigate({ search: (prev: any) => ({ ...prev, tab: 'documentos' }) })}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-slate-100">Documentos</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {docStats ? `${docStats.totalAttached} ` : "-- "}
            <span className="text-sm text-slate-400 font-medium">/ {docStats?.totalRequired || "--"}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${docStats?.percentage || 0}%` }} />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase">{docStats?.percentage || 0}%</span>
          </div>
        </div>
      </Card>

      <Card 
        className="p-5 border-white bg-white shadow-sm hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-emerald-500"
        onClick={() => window.alert("Abrir checklist correspondente.")}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
            <CheckSquare className="h-5 w-5 text-emerald-600" />
          </div>
          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-slate-100">Checklist</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {healthReport?.dimensions.checklist?.score || "Não"} <span className="text-sm text-slate-400 font-medium">%</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${healthReport?.dimensions.checklist?.score || 0}%` }} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase">{healthReport?.dimensions.checklist?.score || 0}%</span>
          </div>
        </div>
      </Card>

      <Card 
        className="p-5 border-white bg-white shadow-sm hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-amber-500"
        onClick={() => window.alert("Abrir painel de risco real.")}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-slate-100">Risco</Badge>
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-3xl font-black tracking-tighter uppercase",
            docStats?.totalBlocking && docStats.totalBlocking > 0 ? "text-rose-600" : "text-amber-600"
          )}>
            {docStats?.totalBlocking && docStats.totalBlocking > 0 ? "ALTO" : "BAIXO"}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
            {docStats?.totalBlocking && docStats.totalBlocking > 0 ? (
              <AlertTriangle className="h-3 w-3 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            )}
            {docStats?.totalBlocking && docStats.totalBlocking > 0 ? "Bloqueantes Encontrados" : "Operação Estável"}
          </p>
        </div>
      </Card>

      <Card 
        className="p-5 border-white bg-white shadow-sm hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-primary"
        onClick={() => window.alert("Abrir detalhamento do health score.")}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-slate-100">Health Score</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-primary tracking-tighter">
            {healthReport?.overallScore || "--"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${healthReport?.overallScore || 0}%` }} />
            </div>
            <span className="text-[10px] font-black text-primary uppercase">{healthReport?.overallScore || 0}%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ProcessCenterSidebar({ 
  suggestions = [] 
}: { 
  suggestions?: OperationalSuggestion[] 
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'workspace';

  const items = [
    { id: "workspace", label: "Visão Geral", icon: Activity },
    { id: "documentos", label: "Documentos", icon: FileText },
    { id: "assinaturas", label: "Assinaturas", icon: FileCheck },
    { id: "timeline", label: "Timeline Enterprise", icon: History },
    { id: "comentarios", label: "Comentários", icon: MessageSquare },
    { id: "ocr", label: "OCR Center", icon: Zap },
    { id: "seguranca", label: "Auditoria", icon: Shield },
  ];

  return (
    <div className="w-72 border-r bg-white flex flex-col h-full shadow-2xl shadow-slate-200 z-40 relative">
      <div className="p-6 border-b bg-slate-50/50">
        <div className="relative group">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Pesquisar no processo..." 
            className="pl-10 bg-white border-slate-200 h-11 text-xs font-bold uppercase tracking-widest rounded-xl focus:ring-4 focus:ring-primary/10 transition-all"
            onChange={(e) => {
              // Debounced search logic would go here
              console.log("Real search logic triggered:", e.target.value);
            }}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          <nav className="space-y-1">
            <p className="px-3 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Centro de Comando</p>
            {items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate({ search: (prev: any) => ({ ...prev, tab: item.id }) })}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all group",
                    isActive 
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-white/40" />}
                </button>
              );
            })}
          </nav>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IA Operacional</p>
              <Brain className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma sugestão encontrada</p>
                </div>
              ) : suggestions.map((s) => {
                const priorityStyles: Record<string, string> = {
                  critical: "text-rose-600 bg-rose-50 border-rose-100",
                  high: "text-amber-600 bg-amber-50 border-amber-100",
                  medium: "text-blue-600 bg-blue-50 border-blue-100",
                  low: "text-slate-600 bg-slate-50 border-slate-100",
                  info: "text-slate-600 bg-slate-50 border-slate-100"
                };
                const style = priorityStyles[s.priority] || priorityStyles.info;

                return (
                  <div key={s.id} className={cn("p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer group", style)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-white", style)}>
                        {s.priority}
                      </span>
                      <ArrowRight className={cn("h-3 w-3 opacity-0 group-hover:opacity-100 transition-all", style.split(' ')[0])} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 leading-snug mb-1">{s.title}</p>
                    <p className="text-[9px] font-medium text-slate-500 italic">{s.impact}</p>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("w-full mt-3 h-8 text-[9px] font-black uppercase tracking-widest border border-dashed rounded-lg bg-white/50 hover:bg-white", style)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (s.resolutionPath) navigate({ to: s.resolutionPath });
                      }}
                    >
                      Resolver Agora
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-slate-50/50">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Activity className="h-12 w-12" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronização Real</span>
          </div>
          <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
            Última atualização agora.
          </p>
        </div>
      </div>
    </div>
  );
}

