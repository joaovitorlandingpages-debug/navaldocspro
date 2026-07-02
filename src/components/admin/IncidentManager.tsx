import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, History, Clock } from "lucide-react";
import { format } from "date-fns";

export function IncidentManager() {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_incidents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-navy">Gestão de Incidentes</h2>
        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase">Sistema Nominal</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />)
        ) : incidents?.length === 0 ? (
          <Card className="p-8 text-center rounded-3xl border-slate-100 bg-slate-50/50">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase">Nenhum incidente registrado</p>
          </Card>
        ) : (
          incidents?.map((incident: any) => (
            <Card key={incident.id} className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <Badge className={`${incident.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'} text-white border-none font-black text-[8px] uppercase`}>
                    {incident.severity}
                  </Badge>
                  <span className="text-sm font-black text-navy uppercase">{incident.title}</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400">{incident.status}</Badge>
              </div>
              <CardContent className="p-4 bg-slate-50/30">
                <p className="text-xs text-slate-500 font-medium mb-2">{incident.description}</p>
                <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(incident.created_at), "dd/MM/yyyy HH:mm")}</span>
                  {incident.root_cause && <span className="flex items-center gap-1"><History className="h-3 w-3" /> Causa: {incident.root_cause}</span>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
