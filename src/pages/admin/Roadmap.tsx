import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, Plus, Clock, 
  CheckCircle2, AlertCircle, 
  Construction, Filter, Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AdminRoadmap() {
  const [filter, setFilter] = useState<string>("all");

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ["admin-roadmap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_roadmap")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredRoadmap = roadmap?.filter((item: any) => 
    filter === "all" || item.status === filter
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Roadmap & Evolução</h1>
          <p className="text-slate-500 font-medium">Planejamento estratégico e visão de futuro do NavalDocs Pro.</p>
        </div>
        <Button className="bg-primary text-white gap-2 font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-2xl shadow-xl shadow-primary/20">
          <Plus className="h-4 w-4" /> Nova Funcionalidade
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {["all", "planned", "in_progress", "completed"].map((s) => (
          <Button
            key={s}
            onClick={() => setFilter(s)}
            variant={filter === s ? "default" : "outline"}
            className={`rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 h-10 ${filter === s ? 'bg-navy text-white' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            {s === "all" ? "Todos" : s === "planned" ? "Planejado" : s === "in_progress" ? "Em Desenvolvimento" : "Concluído"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />)
        ) : (
          filteredRoadmap?.map((item: any) => (
            <Card key={item.id} className="border-slate-100 shadow-sm hover:shadow-xl transition-all rounded-3xl overflow-hidden group">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-start mb-4">
                  <Badge className={`uppercase text-[8px] font-black tracking-widest ${
                    item.priority === 'critical' ? 'bg-red-500' :
                    item.priority === 'high' ? 'bg-amber-500' :
                    'bg-blue-500'
                  } text-white border-none px-3`}>
                    {item.priority}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {item.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {item.status === 'in_progress' && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                    {item.status === 'planned' && <Construction className="h-4 w-4 text-slate-300" />}
                  </div>
                </div>
                <CardTitle className="text-lg font-black text-navy uppercase leading-tight mb-2 group-hover:text-primary transition-colors">{item.title}</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400 line-clamp-2">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-4 flex items-center justify-between border-t border-slate-50 bg-slate-50/30">
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-400">{item.category}</Badge>
                <span className="text-[10px] font-bold text-slate-300 uppercase italic">v{item.target_version || '1.1'}</span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
