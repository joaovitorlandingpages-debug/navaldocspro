import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth-debug-public")({
  component: AuthDebugPublic,
});

function AuthDebugPublic() {
  const [state, setState] = useState<any>({
    sessionExists: "check...",
    userEmail: "check...",
    userId: "check...",
    loading: true,
    storageKeys: [],
    path: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
  });

  useEffect(() => {
    const runDebug = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const keys = [];
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.includes('supabase')) keys.push(key);
        }
      }

      setState({
        sessionExists: session ? "SIM" : "NÃO",
        userEmail: session?.user?.email || "N/A",
        userId: session?.user?.id || "N/A",
        loading: false,
        storageKeys: keys,
        path: window.location.pathname
      });
    };

    runDebug();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-6 text-blue-400">AUTH_DEBUG_PUBLIC</h1>
      
      <div className="space-y-4 max-w-2xl bg-slate-800 p-6 rounded-lg border border-slate-700">
        <div>
          <span className="text-slate-400">Session:</span> {state.sessionExists}
        </div>
        <div>
          <span className="text-slate-400">Email:</span> {state.userEmail}
        </div>
        <div>
          <span className="text-slate-400">ID:</span> {state.userId}
        </div>
        <div>
          <span className="text-slate-400">Loading:</span> {state.loading ? "TRUE" : "FALSE"}
        </div>
        <div>
          <span className="text-slate-400">Current Path:</span> {state.path}
        </div>
        <hr className="border-slate-700" />
        <div>
          <p className="text-slate-400 mb-2">Supabase LocalStorage Keys:</p>
          <ul className="list-disc list-inside">
            {state.storageKeys.map((k: string) => <li key={k}>{k}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <a href="/auth/login" className="bg-blue-600 px-4 py-2 rounded text-xs font-bold">Ir para Login</a>
        <button onClick={() => window.location.reload()} className="bg-slate-700 px-4 py-2 rounded text-xs font-bold">Recarregar</button>
      </div>
    </div>
  );
}
