import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

export const Route = createFileRoute("/foco")({
  head: () => ({
    meta: [
      { title: "Modo Foco — NavalDocs Pro" },
      { name: "description", content: "As 5 ações prioritárias do dia. Sem distração." },
    ],
  }),
  component: FocusMode,
});

type Action = {
  id: string;
  title: string;
  subtitle: string;
  urgency: "critical" | "high" | "medium";
  daysLeft: number | null;
  link: string;
  reason: string;
};

function FocusMode() {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["focus-actions"],
    queryFn: async (): Promise<Action[]> => {
      const today = new Date();
      const list: Action[] = [];

      const { data: processes } = await supabase
        .from("processes")
        .select("id, process_type, status, priority, due_date, created_at")
        .in("status", ["in_progress", "Em Andamento", "waiting_protocol", "pending"])
        .limit(20);

      processes?.forEach((p: any) => {
        const due = p.due_date ? new Date(p.due_date) : null;
        const days = due ? Math.ceil((+due - +today) / 86400000) : null;
        const urgency: Action["urgency"] =
          (days !== null && days <= 3) || p.priority === "critical" ? "critical" :
          (days !== null && days <= 7) || p.priority === "urgent" ? "high" : "medium";
        list.push({
          id: p.id,
          title: p.process_type || "Processo",
          subtitle: `Status: ${p.status}`,
          urgency,
          daysLeft: days,
          link: `/processes/${p.id}`,
          reason: days !== null ? `Prazo em ${days}d` : "Em andamento",
        });
      });

      const { data: docs } = await supabase
        .from("documents")
        .select("id, document_type, expiry_date, process_id")
        .not("expiry_date", "is", null)
        .limit(20);

      docs?.forEach((d: any) => {
        const days = Math.ceil((+new Date(d.expiry_date) - +today) / 86400000);
        if (days > 60) return;
        list.push({
          id: d.id,
          title: `Renovar ${d.document_type || "documento"}`,
          subtitle: `Vence em ${days}d`,
          urgency: days <= 7 ? "critical" : days <= 30 ? "high" : "medium",
          daysLeft: days,
          link: d.process_id ? `/processes/${d.process_id}` : "/documents",
          reason: "Documento expirando",
        });
      });

      return list
        .sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2 };
          if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
          return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
        })
        .slice(0, 5);
    },
  });

  useEffect(() => {
    console.log("FOCUS_MODE_READY");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const next = actions[0];

  return (
    <div className="min-h-screen bg-[#000B18] text-white p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Modo Foco</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {actions.length} ações prioritárias • ESC para sair
              </p>
            </div>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="bg-transparent border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
              Sair do Foco
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Card className="bg-white/5 border-white/10 p-16 text-center text-white/40">Carregando...</Card>
        ) : actions.length === 0 ? (
          <Card className="bg-emerald-500/10 border-emerald-500/20 p-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">Tudo em dia.</h2>
            <p className="text-white/60 mt-2">Nenhuma ação crítica para hoje.</p>
          </Card>
        ) : (
          <>
            {next && (
              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 p-8 md:p-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <Zap className="h-3 w-3" /> Próxima Ação
                </p>
                <h2 className="text-3xl md:text-5xl font-semibold leading-none mb-4">
                  {next.title}
                </h2>
                <p className="text-white/60 font-medium mb-8">{next.reason} • {next.subtitle}</p>
                <Link to={next.link}>
                  <Button className="bg-primary text-white text-xs font-black uppercase tracking-[0.2em] px-8 py-6 rounded-2xl hover:bg-primary/90">
                    Resolver Agora <ArrowRight className="ml-3 h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Próximas na fila</p>
              {actions.slice(1).map((a) => (
                <Link key={a.id} to={a.link}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition p-5 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0">
                      {a.urgency === "critical" ? (
                        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-black text-sm uppercase tracking-tight truncate">{a.title}</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">{a.reason}</p>
                      </div>
                    </div>
                    <Badge className="bg-white/10 text-white border-none text-[9px] font-black uppercase shrink-0">
                      {a.urgency === "critical" ? "Crítico" : a.urgency === "high" ? "Alto" : "Médio"}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
