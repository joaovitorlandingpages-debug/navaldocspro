import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  User, Ship, Clock, AlertTriangle, 
  CheckCircle2, FileText, Activity,
  Search, MessageSquare, History,
  FileCheck, Shield, Zap, TrendingUp
} from "lucide-react";

export function ProcessCenterHeader({ process }: { process: any }) {
  if (!process) return null;

  return (
    <div className="bg-white border-b sticky top-0 z-30 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-3 rounded-xl">
            <Ship className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{process.vessel?.name || "Sem embarcação"}</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {process.process_number || `#${process.id.slice(0,8)}`}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {process.customer?.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Criado há {process.created_at ? "alguns dias" : "recente"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentários
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Timeline
          </Button>
          <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
            <Zap className="h-4 w-4" />
            IA Operacional
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProcessCenterDashboard({ process, healthScore = 85 }: { process: any, healthScore?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <Card className="p-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">Documentos</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">12 / 15</p>
          <p className="text-xs text-slate-500">3 pendências críticas</p>
        </div>
      </Card>

      <Card className="p-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <FileCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">Checklists</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">82%</p>
          <p className="text-xs text-slate-500">Próxima ação: Procuração</p>
        </div>
      </Card>

      <Card className="p-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">Risco</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">Baixo</p>
          <p className="text-xs text-slate-500">Nenhum atraso crítico</p>
        </div>
      </Card>

      <Card className="p-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-slate-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-slate-600" />
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">Health Score</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">{healthScore}</p>
          <Progress value={healthScore} className="h-1.5 mt-2" />
        </div>
      </Card>
    </div>
  );
}

export function ProcessCenterSidebar() {
  const items = [
    { label: "Visão Geral", icon: Activity, active: true },
    { label: "Documentos", icon: FileText },
    { label: "Assinaturas", icon: FileCheck },
    { label: "Timeline", icon: History },
    { label: "Comentários", icon: MessageSquare },
    { label: "Segurança", icon: Shield },
  ];

  return (
    <div className="w-64 border-r bg-slate-50/50 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Pesquisar..." 
            className="pl-9 bg-white border-slate-200 h-9 text-sm"
          />
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              item.active 
                ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <item.icon className={`h-4 w-4 ${item.active ? "text-slate-900" : "text-slate-400"}`} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t bg-white">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">IA Sugestão</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Falta apenas um documento obrigatório para enviar à Marinha.
          </p>
        </div>
      </div>
    </div>
  );
}
