import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Signature, ChevronRight } from "lucide-react";

export function SignaturesStatusCard({ processId, onOpen }: { processId: string; onOpen: () => void }) {
  const [data, setData] = useState<{ requests: any[]; loading: boolean }>({ requests: [], loading: true });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: reqs } = await supabase
        .from("signature_requests")
        .select("id,title,status,expires_at,signature_participants(name,role,status,signing_order)")
        .eq("process_id", processId)
        .order("created_at", { ascending: false });
      if (active) setData({ requests: reqs ?? [], loading: false });
    })();
    return () => { active = false; };
  }, [processId]);

  const total = data.requests.length;
  const completed = data.requests.filter((r) => r.status === "completed").length;
  const expired = data.requests.find((r) => r.status === "expired");
  const allDone = total > 0 && completed === total;
  const waiting = data.requests
    .flatMap((r) => (r.signature_participants ?? []))
    .sort((a: any, b: any) => (a.signing_order ?? 0) - (b.signing_order ?? 0))
    .find((p: any) => p.status !== "signed");

  let tone = "from-slate-50 to-slate-100 text-slate-700 border-slate-200";
  let dot = "bg-slate-400";
  let label = "Sem solicitações";
  if (total > 0) {
    if (expired) { tone = "from-red-50 to-red-100 text-red-700 border-red-200"; dot = "bg-red-500"; label = "Solicitação vencida"; }
    else if (allDone) { tone = "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200"; dot = "bg-emerald-500"; label = "Todas concluídas"; }
    else if (waiting) { tone = "from-amber-50 to-amber-100 text-amber-700 border-amber-200"; dot = "bg-amber-500"; label = `Aguardando ${waiting.role || waiting.name}`; }
    else { tone = "from-blue-50 to-blue-100 text-blue-700 border-blue-200"; dot = "bg-blue-500"; label = "Em andamento"; }
  }

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left bg-gradient-to-br ${tone} border rounded-2xl p-6 hover:shadow-md transition group`}
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-white/70 grid place-items-center shadow-sm">
          <Signature className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-black opacity-70">Assinaturas</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} />
            <h3 className="text-lg font-black truncate">{label}</h3>
          </div>
          {total > 0 && (
            <p className="text-xs mt-1 opacity-80">{completed} de {total} concluída(s)</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 transition" />
      </div>
    </button>
  );
}
