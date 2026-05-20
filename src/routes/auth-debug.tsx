import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/auth-debug")({
  component: AuthDebugPublic,
});

function AuthDebugPublic() {
  const { session, user, loading, profile } = useAuth();

  return (
    <div className="min-h-screen bg-[#000B18] p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Auth Diagnostic System
            </CardTitle>
            <Badge variant={loading ? "outline" : "default"} className={loading ? "animate-pulse" : "bg-blue-600"}>
              {loading ? "Sincronizando..." : "Sistema Online"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Estado da Sessão</p>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${session ? 'bg-green-500' : 'bg-red-500'}`} />
                <p className="text-white font-bold">{session ? 'Sessão Ativa' : 'Sem Sessão'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Identidade do Usuário</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-white/40" />
                <p className="text-white/60 text-xs truncate">{user?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Metadados Técnicos</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">User ID</span>
                <span className="text-white font-mono">{user?.id || 'null'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Profile Status</span>
                <span className={`font-bold ${profile ? 'text-green-400' : 'text-amber-400'}`}>
                  {profile ? `Carregado (${profile.role})` : 'Aguardando/Não Encontrado'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Loading state</span>
                <span className="text-white">{loading ? 'true' : 'false'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Current Path</span>
                <span className="text-white">{typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</span>
              </div>
            </div>
          </div>

          {!session && !loading && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-500">Atenção: Usuário Deslogado</p>
                <p className="text-xs text-red-500/60 mt-1">O sistema não detectou uma sessão válida. Redirecionamento para login é o comportamento esperado.</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <a 
              href="/auth/login" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Ir para Login
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all"
            >
              Recarregar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
