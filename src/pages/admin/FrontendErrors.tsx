import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldAlert, 
  Terminal, 
  Bug, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  RefreshCcw,
  Layout
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { telemetry } from "@/utils/telemetry";
import { toast } from "sonner";

interface FrontendError {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  route: string | null;
  status: 'new' | 'investigating' | 'corriged' | 'ignored';
  created_at: string;
  metadata: any;
  count?: number;
}

export default function FrontendErrors() {
  const [errors, setErrors] = useState<FrontendError[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'investigating' | 'corriged'>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'message'>('message');

  useEffect(() => {
    fetchErrors();
    telemetry.track('FRONTEND_ERROR_INVESTIGATION_STARTED');
  }, [filter, groupBy]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('frontend_errors' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (groupBy === 'message') {
        const groups: Record<string, any> = {};
        (data as any[] || []).forEach(err => {
          const key = `${err.error_message}-${err.route}`;
          if (!groups[key]) {
            groups[key] = { ...err, count: 1 };
          } else {
            groups[key].count++;
          }
        });
        setErrors(Object.values(groups));
      } else {
        setErrors(data as any[] || []);
      }
    } catch (error) {
      console.error("Error fetching frontend errors:", error);
      toast.error("Erro ao carregar registros de erro");
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frontend_errors' as any)
        .update({ 
          status: 'corriged', 
          resolved_at: new Date().toISOString() 
        } as any)
        .eq('id', id);

      if (error) throw error;

      setErrors(prev => prev.map(err => err.id === id ? { ...err, status: 'corriged' } : err));
      toast.success("Erro marcado como corrigido");
      telemetry.track('ERROR_MARKED_RESOLVED', undefined, { error_id: id });
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'corriged': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'investigating': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ignored': return <AlertCircle className="h-4 w-4 text-slate-400" />;
      default: return <Bug className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="p-6 space-y-8 bg-[#000B18] min-h-screen text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldAlert className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold">Frontend Error Logs</h1>
          </div>
          <p className="text-slate-400 text-sm">Monitoramento e correção de falhas críticas da interface</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchErrors}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            {(['all', 'new', 'investigating', 'corriged'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'corriged' ? 'Corrigidos' : f === 'new' ? 'Novos' : 'Em Análise'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setGroupBy(groupBy === 'none' ? 'message' : 'none')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
              groupBy === 'message' 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Layout className="h-3 w-3" />
            Agrupar
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {loading && !errors.length ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        ) : errors.length === 0 ? (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white/40">Nenhum erro detectado</h3>
            <p className="text-white/20 text-sm">Sua interface está operando em estabilidade nominal</p>
          </div>
        ) : (
          errors.map((error) => (
            <div 
              key={error.id}
              className={`bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all ${
                expandedId === error.id ? 'ring-2 ring-red-500/20' : ''
              }`}
            >
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.07]"
                onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="mt-1">{getStatusIcon(error.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        {error.route || 'Global'}
                      </span>
                      {error.count && error.count > 1 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-black rounded-full">
                          {error.count} Ocorrências
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-red-400 truncate pr-4">
                      {error.error_message}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] text-white/40 font-mono">
                      {format(new Date(error.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {expandedId === error.id ? <ChevronUp className="h-4 w-4 text-white/20" /> : <ChevronDown className="h-4 w-4 text-white/20" />}
                </div>
              </div>

              {expandedId === error.id && (
                <div className="p-6 border-t border-white/10 bg-black/20 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-semibold text-white/30 mb-2">Stack Trace</h4>
                        <pre className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-white/60 overflow-x-auto max-h-60 custom-scrollbar">
                          {error.error_stack || 'Sem stack trace disponível'}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="text-[10px] font-semibold text-white/30 mb-2">Component Hierarchy</h4>
                        <pre className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-white/40 overflow-x-auto max-h-40 custom-scrollbar">
                          {error.component_stack || 'Hierarquia de componentes não capturada'}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <h4 className="text-[10px] font-semibold text-white/30 mb-4 flex items-center gap-2">
                          <Terminal className="h-3 w-3" />
                          Ambiente e Contexto
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/40">URL Completa</span>
                            <span className="text-white/80 font-mono text-[10px] truncate max-w-[200px]">
                              {error.metadata?.url || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/40">Viewport</span>
                            <span className="text-white/80 font-mono text-[10px]">
                              {error.metadata?.viewport || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/40">Navegador</span>
                            <span className="text-white/80 font-mono text-[10px] truncate max-w-[200px]">
                              {error.metadata?.userAgent || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => markAsResolved(error.id)}
                          disabled={error.status === 'corriged'}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                            error.status === 'corriged'
                              ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 active:scale-95'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Marcar como Corrigido
                        </button>
                        
                        <a 
                          href={error.route || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest text-white/70 transition-all border border-white/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir Rota
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
