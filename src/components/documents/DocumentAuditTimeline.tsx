import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentAuditLog } from "@/types/document";

interface DocumentAuditTimelineProps {
  documentId: string;
}

export function DocumentAuditTimeline({ documentId }: DocumentAuditTimelineProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["document-audit-logs", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_audit_logs")
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse uppercase text-[10px] font-black text-slate-400 tracking-widest">Carregando Auditoria...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-navy">Histórico de Auditoria</h3>
      </div>

      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
        {logs?.map((log: any) => (
          <div key={log.id} className="relative flex items-start gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className={`absolute left-4 -translate-x-1/2 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${
              log.action === 'signed' ? 'bg-emerald-500' : 
              log.action === 'created' ? 'bg-primary' : 'bg-slate-400'
            }`} />
            
            <div className="pl-8 flex-1">
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-navy">
                      {log.action === 'created' && 'Documento Criado'}
                      {log.action === 'viewed' && 'Visualizado'}
                      {log.action === 'downloaded' && 'Download Realizado'}
                      {log.action === 'signed' && 'Assinado Digitalmente'}
                      {log.action === 'regenerated' && 'Documento Regenerado'}
                      {log.action === 'edited' && 'Edição de Dados'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <User className="h-3 w-3" />
                    <span>{log.profiles?.full_name || 'Sistema'}</span>
                    {log.ip_address && (
                      <>
                        <span className="h-1 w-1 bg-slate-300 rounded-full" />
                        <span className="opacity-60">{log.ip_address}</span>
                      </>
                    )}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-start gap-1.5">
                      <Info className="h-3 w-3 text-slate-400 mt-0.5" />
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic">
                        {JSON.stringify(log.details)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}

        {logs?.length === 0 && (
          <div className="pl-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">
            Nenhum registro de auditoria encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
