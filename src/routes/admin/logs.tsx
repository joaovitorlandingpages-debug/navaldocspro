import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldAlert, Search, Trash2, Calendar, 
  MapPin, User, Globe, Loader2, AlertCircle,
  Terminal, ChevronRight, Eye, Code, Layers
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/admin/logs")({
  component: FrontendErrorLogs,
});

function FrontendErrorLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedError, setSelectedError] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: errors, isLoading } = useQuery({
    queryKey: ["frontend-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frontend_errors" as any)
        .select("*, profile:profiles(name, email)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("frontend_errors" as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frontend-errors"] });
      toast.success("Logs de erro limpos com sucesso.");
    },
    onError: (err: any) => {
      toast.error("Erro ao limpar logs: " + err.message);
    }
  });

  const filteredErrors = errors?.filter((err: any) => 
    err.error_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.route?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="Erros de Interface"
        description="Monitoramento técnico de falhas capturadas pelo Error Boundary global."
        actions={
          <button 
            onClick={() => {
              if (confirm("Tem certeza que deseja limpar todos os logs de erro?")) {
                clearLogsMutation.mutate();
              }
            }}
            className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100"
          >
            <Trash2 className="h-4 w-4" /> Limpar Histórico
          </button>
        }
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              placeholder="Buscar por mensagem ou rota..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
            />
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-400">
              {filteredErrors?.length || 0} Incidentes Registrados
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">HORÁRIO / ROTA</th>
                <th className="px-6 py-4">ERRO / COMPONENTE</th>
                <th className="px-6 py-4">USUÁRIO</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Analisando logs técnicos...</p>
                  </td>
                </tr>
              ) : filteredErrors?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <ShieldAlert className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum erro de interface detectado</p>
                  </td>
                </tr>
              ) : filteredErrors?.map((err: any) => (
                <tr 
                  key={err.id} 
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedError(err)}
                >
                  <td className="px-6 py-5">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">{new Date(err.created_at).toLocaleString()}</div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-slate-300" />
                      <span className="text-[11px] font-black text-navy uppercase tracking-tight truncate max-w-[150px]">{err.route}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-navy line-clamp-1">{err.error_message}</div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                          {err.component_stack ? 'Component Captured' : 'Generic Exception'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">
                        {err.profile?.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-navy">{err.profile?.name || 'Sistema'}</div>
                        <div className="text-[9px] text-slate-400 font-medium">{err.profile?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalLayout
        isOpen={!!selectedError}
        onClose={() => setSelectedError(null)}
        title="Análise Profunda de Erro"
        description="Diagnóstico técnico capturado automaticamente pelo NavalDocs Pro Engine."
        maxWidth="4xl"
        footer={
          <button 
            onClick={() => setSelectedError(null)}
            className="px-8 py-3 bg-navy text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-xl"
          >
            Fechar Diagnóstico
          </button>
        }
      >
        {selectedError && (
          <div className="space-y-8 py-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Globe className="h-3 w-3" /> Contexto Web</p>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-navy">Browser</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{selectedError.metadata?.userAgent}</p>
                </div>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin className="h-3 w-3" /> Localização</p>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-navy">Página</p>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedError.route}</p>
                </div>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User className="h-3 w-3" /> Sessão</p>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-navy">Operador</p>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedError.profile?.name || 'Desconectado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-navy">
                <Terminal className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Stack Trace Completo</h3>
              </div>
              <ScrollArea className="h-[200px] w-full bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl">
                <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                  {selectedError.error_stack}
                </pre>
              </ScrollArea>
            </div>

            {selectedError.component_stack && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-navy">
                  <Layers className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Hierarquia de Componentes</h3>
                </div>
                <ScrollArea className="h-[200px] w-full bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <pre className="text-[10px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {selectedError.component_stack}
                  </pre>
                </ScrollArea>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <Code className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[9px] font-black text-navy uppercase tracking-widest">Status: Crítico</span>
               </div>
               <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[9px] font-black text-navy uppercase tracking-widest">Ação: Auditoria Necessária</span>
               </div>
            </div>
          </div>
        )}
      </ModalLayout>
    </div>
  );
}
