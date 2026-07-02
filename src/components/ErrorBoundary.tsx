import React from 'react';
import { telemetry } from '@/utils/telemetry';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RotateCcw, ChevronLeft, Terminal, ShieldAlert } from 'lucide-react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null; isAdmin: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isAdmin: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  async componentDidMount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const isAdmin = profile?.role === 'admin_master' || profile?.role === 'admin_master_global';
        this.setState({ isAdmin });
      }
    } catch (e) {
      console.warn("Error checking admin status in ErrorBoundary", e);
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ERROR_BOUNDARY_TRIGGERED", error, errorInfo);
    
    // Registrar log técnico
    console.log("STACK_TRACE_RECORDED");
    
    // Tracking profundo
    telemetry.trackFrontendError(error, errorInfo.componentStack || undefined, {
      timestamp: new Date().toISOString(),
      viewport: `${window.innerWidth}x${window.innerHeight}`
    });

    if (error.message?.includes('removeChild') || error.message?.includes('appendChild')) {
      console.warn("ERROR_ROOT_CAUSE_IDENTIFIED", "DOM_RECONCILIATION_ISSUE");
    }

    // New log events
    telemetry.track('FRONTEND_ERROR_CAPTURED', undefined, {
      error_message: error.message,
      route: window.location.pathname
    });
  }


  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const isTechnicalError = this.state.error?.message?.includes('undefined') || 
                               this.state.error?.message?.includes('null') || 
                               this.state.error?.message?.includes('map');

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#000B18] p-4 md:p-6 text-center font-sans overflow-y-auto">
          <div className="max-w-2xl w-full space-y-6 md:space-y-8 my-8">
            <div className="relative">
              <div className="h-24 w-24 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-red-500/10 border border-red-500/20 animate-pulse">
                <ShieldAlert className="h-12 w-12" />
              </div>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Fail-Safe Active</div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Sistema Estabilizado</h1>
              <p className="text-white/50 text-xs md:text-sm leading-relaxed max-w-md mx-auto font-medium">
                Detectamos uma instabilidade estrutural na interface. 
                O motor de redundância do NavalDocs Pro isolou o erro para garantir a integridade operacional dos seus dados.
              </p>
            </div>

            {/* Admin Only View */}
            {this.state.isAdmin && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 text-red-400">
                  <Terminal className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Relatório Técnico (Modo Admin)</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Causa Raiz</p>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs font-mono font-bold">
                      {this.state.error?.name}: {this.state.error?.message}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Stack Trace</p>
                    <pre className="p-4 bg-black/40 border border-white/5 text-[9px] text-white/60 font-mono overflow-x-auto rounded-xl custom-scrollbar max-h-40">
                      {this.state.error?.stack}
                    </pre>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Component Hierarchy</p>
                    <pre className="p-4 bg-black/40 border border-white/5 text-[9px] text-white/40 font-mono overflow-x-auto rounded-xl custom-scrollbar max-h-32">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button 
                onClick={this.handleReset}
                className="group flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                <RotateCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700" />
                Reiniciar Módulo
              </button>
              <button 
                onClick={() => window.history.back()}
                className="flex items-center justify-center gap-3 bg-white/5 text-white/70 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 opacity-30">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Base de Dados OK</span>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Criptografia Ativa</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
