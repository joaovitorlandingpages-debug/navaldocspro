import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  Database, 
  Zap, 
  MonitorCheck,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/debug/system")({
  component: DebugSystem,
  ssr: false,
});

function DebugSystem() {
  const { data: authSession, isLoading: isLoadingAuth } = useQuery({
    queryKey: ["debug-auth-check"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: dbPing, error: dbError } = useQuery({
    queryKey: ["debug-db-ping"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id").limit(1);
      if (error) throw error;
      return true;
    },
    retry: 0
  });

  return (
    <div className="p-8 space-y-8 bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
          <MonitorCheck className="text-primary" /> System Debug Mode
        </h1>
        <Badge variant="outline" className="text-white border-white/20">Client-Side Only</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-black/40 border-white/10 text-white">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Auth Status
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <p>Loading: {isLoadingAuth ? "TRUE" : "FALSE"}</p>
            <p>Session: {authSession ? "ACTIVE" : "NONE"}</p>
            {authSession && (
              <p>User ID: {authSession.user.id}</p>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-black/40 border-white/10 text-white">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Database className="h-4 w-4" /> Database Connectivity
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <p>Ping: {dbPing ? "SUCCESS" : "WAITING..."}</p>
            {dbError && (
              <p className="text-rose-400">Error: {(dbError as any).message}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-black/40 border-white/10 text-white">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Critical Info
        </h3>
        <div className="space-y-4 text-xs leading-relaxed">
          <p>
            If you are seeing "This page didn't load", it's likely an SSR vs CSR mismatch or a loop in root providers.
          </p>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="font-bold text-primary mb-2 uppercase tracking-tighter">Actions Taken:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Disabled SSR on main layout routes to prevent TanStack Start hydration crashes.</li>
              <li>Validated root providers for potential loops in useEffect.</li>
              <li>Checked for query client inconsistencies.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
