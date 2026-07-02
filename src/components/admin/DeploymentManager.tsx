import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, GitBranch, Terminal } from "lucide-react";
import { format } from "date-fns";

export function DeploymentManager() {
  const { data: deploys, isLoading } = useQuery({
    queryKey: ["admin-deploys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_deploys")
        .select("*")
        .order("deployed_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-navy">Gestão de Deploys</h2>
        <div className="flex gap-2">
            <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase">v1.1.2 Production</Badge>
            <Badge className="bg-purple-50 text-purple-600 border-none font-black text-[10px] uppercase">v1.2.0 Staging</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />)
        ) : deploys?.length === 0 ? (
          <Card className="p-8 text-center rounded-3xl border-slate-100 bg-slate-50/50">
            <Rocket className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase">Aguardando primeiro deploy automatizado</p>
          </Card>
        ) : (
          deploys?.map((deploy: any) => (
            <Card key={deploy.id} className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-white">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${deploy.environment === 'production' ? 'bg-navy/5 text-navy' : 'bg-slate-50 text-slate-400'}`}>
                    <Rocket className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-navy uppercase">{deploy.version}</span>
                    <Badge variant="outline" className="ml-2 text-[8px] font-black uppercase border-slate-100 text-slate-400">{deploy.environment}</Badge>
                  </div>
                </div>
                <Badge className={`${deploy.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border-none font-black text-[9px] uppercase`}>
                  {deploy.status}
                </Badge>
              </div>
              <CardContent className="p-4 bg-slate-50/30">
                <p className="text-[10px] font-medium text-slate-500 mb-2 italic">{deploy.release_notes || 'Nenhuma nota de release informada.'}</p>
                <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Terminal className="h-3 w-3" /> {format(new Date(deploy.deployed_at), "dd/MM/yyyy HH:mm")}</span>
                  {deploy.is_hotfix && <Badge className="bg-red-50 text-red-600 border-none font-black text-[8px] uppercase">HOTFIX</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
