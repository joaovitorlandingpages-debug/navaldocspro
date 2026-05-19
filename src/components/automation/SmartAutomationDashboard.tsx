import React from "react";
import { useProcessAutomation } from "@/hooks/useProcessAutomation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Clock, FileText, ArrowRight, Zap, History, Download, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BatchGenerationService } from "@/services/automation/batchGenerationService";

interface SmartAutomationDashboardProps {
  processId: string;
}

export const SmartAutomationDashboard: React.FC<SmartAutomationDashboardProps> = ({ processId }) => {
  const { automationState, logs, isLoading, reanalyze } = useProcessAutomation(processId);

  if (isLoading && !automationState) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
    </div>;
  }

  const checklist = automationState?.checklist_status || [];
  const mandatoryItems = checklist.filter(i => i.is_mandatory);
  const completedMandatory = mandatoryItems.filter(i => i.status === 'validated' || i.status === 'uploaded').length;
  const progress = mandatoryItems.length > 0 ? (completedMandatory / mandatoryItems.length) * 100 : 0;

  const handleBatchGenerate = async () => {
    await BatchGenerationService.generateAllMissing(processId);
    reanalyze();
  };

  const handleCreatePackage = async () => {
    await BatchGenerationService.createProcessPackage(processId);
  };

  return (
    <div className="space-y-6">
      {/* Header com Status Inteligente */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">Motor de Automação Inteligente</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={reanalyze} disabled={isLoading}>
              <Clock className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reanalisar
            </Button>
          </div>
          <CardDescription>
            Análise em tempo real de requisitos e conformidade documental.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">Progresso Documental Obrigatório</span>
              <span>{completedMandatory} de {mandatoryItems.length} concluídos</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-background p-3 rounded-md border shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Status Operacional</p>
                <div className="flex items-center gap-2">
                  {automationState?.is_ready_for_generation ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Pronto para Geração
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" /> Aguardando Documentos
                    </Badge>
                  )}
                </div>
              </div>
              <div className="bg-background p-3 rounded-md border shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Próxima Ação Sugerida</p>
                <div className="text-sm font-medium flex items-center text-primary">
                  {automationState?.next_suggested_steps?.[0] || "Nenhuma ação pendente"}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1 bg-primary"
                onClick={handleBatchGenerate}
                disabled={isLoading || automationState?.is_ready_for_generation === false}
              >
                <Zap className="h-3 w-3 mr-2" /> Gerar Documentos em Lote
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleCreatePackage}
                disabled={isLoading}
              >
                <Package className="h-3 w-3 mr-2" /> Criar Pacote ZIP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist Inteligente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <FileText className="h-4 w-4" /> Checklist de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {item.status === 'validated' || item.status === 'uploaded' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.is_mandatory ? "Obrigatório" : "Opcional"} • {
                          item.status === 'missing' ? 'Faltando' : 
                          item.status === 'uploaded' ? 'Aguardando validação' : 'Validado'
                        }
                      </p>
                    </div>
                  </div>
                  {item.status === 'missing' && (
                    <Button size="sm" variant="ghost" className="h-8 text-primary">
                      Upload
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline e Pendências */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Pendências Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {automationState?.pending_items && automationState.pending_items.length > 0 ? (
                <ul className="space-y-2">
                  {automationState.pending_items.map((item, idx) => (
                    <li key={idx} className="text-xs flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded">
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhuma pendência crítica detectada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <History className="h-4 w-4" /> Timeline Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {logs.length > 0 ? logs.map((log) => (
                    <div key={log.id} className="relative pl-6 pb-4 border-l last:pb-0">
                      <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-xs font-semibold">{log.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "HH:mm 'de' d 'de' MMM", { locale: ptBR })}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 p-1 bg-muted rounded text-[9px] font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">Nenhuma atividade registrada.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
