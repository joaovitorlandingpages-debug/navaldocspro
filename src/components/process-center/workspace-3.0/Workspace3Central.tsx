import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  FileText, 
  Zap, 
  Signature, 
  Package, 
  Image as ImageIcon, 
  MessageSquare, 
  StickyNote,
  ChevronDown,
  MoreVertical,
  Activity,
  FileCheck,
  AlertCircle,
  FileSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface WorkspaceCardProps {
  title: string;
  icon: any;
  status: "completed" | "pending" | "action_required" | "loading";
  count?: number;
  progress?: number;
  children?: React.ReactNode;
  actions?: { label: string; onClick: () => void }[];
}

function WorkspaceCard({ title, icon: Icon, status, count, progress, children, actions }: WorkspaceCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const statusConfig = {
    completed: { color: "text-emerald-500", bg: "bg-emerald-50", label: "Concluído" },
    pending: { color: "text-slate-400", bg: "bg-slate-50", label: "Pendente" },
    action_required: { color: "text-amber-500", bg: "bg-amber-50", label: "Ação Necessária" },
    loading: { color: "text-blue-500", bg: "bg-blue-50", label: "Processando" },
  };

  const config = statusConfig[status];

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div 
        className={cn(
          "p-4 flex items-center justify-between cursor-pointer select-none",
          isExpanded ? "border-b bg-slate-50/30" : "bg-white"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl border shrink-0", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              {title}
              {count !== undefined && (
                <Badge variant="outline" className="text-[9px] font-bold border-slate-200 px-1.5 py-0 min-w-[1.5rem] justify-center">
                  {count}
                </Badge>
              )}
            </h3>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", config.color)}>
              {config.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {progress !== undefined && (
            <div className="flex items-center gap-2 mr-4">
              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-500", status === 'completed' ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[9px] font-black text-slate-400">{progress}%</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <ChevronDown className={cn("h-4 w-4 text-slate-300 transition-transform duration-300", !isExpanded && "-rotate-90")} />
        </div>
      </div>

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-4 bg-white">
          {children}
          
          {actions && actions.length > 0 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              {actions.map((action, i) => (
                <Button 
                  key={action.label} 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[9px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Workspace3Central({ process, docStats, healthReport }: any) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Health Panel (Painel de Saúde) */}
      <Card className="p-6 border-slate-900 bg-slate-900 text-white overflow-hidden relative shadow-xl">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Activity className="h-32 w-32" />
        </div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde do Processo
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { label: "Checklist", score: healthReport?.dimensions?.checklist?.score || 0, icon: CheckCircle2 },
              { label: "OCR", score: healthReport?.dimensions?.ocr?.score || 0, icon: Zap },
              { label: "PDFs", score: healthReport?.dimensions?.pdfs?.score || 0, icon: FileSearch },
              { label: "Assinaturas", score: healthReport?.dimensions?.signatures?.score || 0, icon: Signature },
              { label: "Pendências", score: docStats?.totalBlocking > 0 ? 30 : 100, icon: AlertCircle, color: docStats?.totalBlocking > 0 ? 'text-rose-400' : 'text-emerald-400' },
              { label: "Documentos", score: docStats?.percentage || 0, icon: FileText },
            ].map((item) => (
              <div key={item.label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <item.icon className={cn("h-3.5 w-3.5", item.color || "text-white/60")} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        item.score > 70 ? "bg-emerald-500" : item.score > 40 ? "bg-amber-500" : "bg-rose-500"
                      )} 
                      style={{ width: `${item.score}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-black">{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <WorkspaceCard 
          title="Checklist de Conformidade" 
          icon={CheckCircle2} 
          status={healthReport?.dimensions?.checklist?.score === 100 ? "completed" : "action_required"}
          progress={healthReport?.dimensions?.checklist?.score}
          count={12}
          actions={[
            { label: "Validar Tudo", onClick: () => {} },
            { label: "Gerar Relatório", onClick: () => {} }
          ]}
        >
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 font-medium">Itens obrigatórios de acordo com o Blueprint aplicado.</p>
            {/* Mock items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {["Vistoria realizada", "Taxas pagas", "Requerimento assinado"].map(item => (
                <div key={item} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard 
          title="Documentos do Processo" 
          icon={FileText} 
          status="action_required"
          progress={docStats?.percentage}
          count={docStats?.totalAttached}
          actions={[
            { label: "Upload em Massa", onClick: () => {} },
            { label: "Solicitar ao Cliente", onClick: () => {} }
          ]}
        >
           <p className="text-[11px] text-slate-500 font-medium">Gestão centralizada de evidências documentais.</p>
        </WorkspaceCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorkspaceCard 
            title="OCR Center" 
            icon={Zap} 
            status="loading"
            count={3}
            actions={[{ label: "Executar OCR", onClick: () => {} }]}
          >
            <p className="text-[11px] text-slate-500 font-medium">Extração automática de dados técnicos.</p>
          </WorkspaceCard>

          <WorkspaceCard 
            title="PDFs Gerados" 
            icon={FileCheck} 
            status="pending"
            count={0}
            actions={[{ label: "Gerar Pacote", onClick: () => {} }]}
          >
            <p className="text-[11px] text-slate-500 font-medium">Compilação para protocolo na Marinha.</p>
          </WorkspaceCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorkspaceCard 
            title="Assinaturas" 
            icon={Signature} 
            status="pending"
            count={1}
            actions={[{ label: "Enviar p/ Assinatura", onClick: () => {} }]}
          >
             <p className="text-[11px] text-slate-500 font-medium">Portal de assinaturas digitais integrado.</p>
          </WorkspaceCard>

          <WorkspaceCard 
            title="Dossiê Final" 
            icon={Package} 
            status="pending"
            actions={[{ label: "Lacrar Processo", onClick: () => {} }]}
          >
             <p className="text-[11px] text-slate-500 font-medium">Empacotamento de toda a inteligência do processo.</p>
          </WorkspaceCard>
        </div>

        <WorkspaceCard 
          title="Comentários e Notas" 
          icon={MessageSquare} 
          status="pending"
          count={5}
          actions={[{ label: "Nova Nota", onClick: () => {} }]}
        >
           <p className="text-[11px] text-slate-500 font-medium">Comunicações internas e anotações técnicas.</p>
        </WorkspaceCard>
      </div>
    </div>
  );
}
