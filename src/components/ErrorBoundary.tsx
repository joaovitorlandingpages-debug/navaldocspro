import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Adicionando log de estabilização
    if (error.message?.includes('removeChild')) {
      console.warn("DOM_RECONCILIATION_ERROR_DETECTED", error.message);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#000B18] p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="h-20 w-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Sistema Estabilizado</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Detectamos uma instabilidade estrutural na interface. 
              O motor de segurança do NavalDocs Pro isolou o erro para proteger seus dados.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Reiniciar Plataforma
              </button>
              <button 
                onClick={() => window.history.back()}
                className="w-full bg-white/5 text-white/70 px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-white/10 transition-all"
              >
                Voltar
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-black/40 border border-white/10 text-red-400 rounded-xl text-left text-[10px] overflow-auto max-h-40 backdrop-blur-sm">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

