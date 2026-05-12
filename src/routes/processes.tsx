import { createFileRoute } from "@tanstack/react-router";
import { 
  ClipboardList, Search, Plus, MoreHorizontal, 
  ArrowRight, Calendar, User, Ship, AlertCircle 
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/processes")({
  component: Processes,
});

function Processes() {
  const [view, setView] = useState<"list" | "kanban">("kanban");

  const columns = [
    { id: "novo", title: "Novo", color: "bg-blue-500" },
    { id: "andamento", title: "Em Andamento", color: "bg-amber-500" },
    { id: "pendente", title: "Pendente", color: "bg-red-500" },
    { id: "assinatura", title: "Assinatura", color: "bg-purple-500" },
    { id: "finalizado", title: "Finalizado", color: "bg-green-500" },
  ];

  const processes = [
    { id: "PR-2024-001", client: "Navegação Mar Azul", vessel: "Phoenix", type: "Vistoria Anual", status: "andamento", deadline: "15/05/2024" },
    { id: "PR-2024-002", client: "Estaleiro Central", vessel: "Titan", type: "Homologação", status: "novo", deadline: "20/05/2024" },
    { id: "PR-2024-003", client: "Marina Yacht Club", vessel: "Aurora", type: "Renovação CSN", status: "finalizado", deadline: "08/05/2024" },
    { id: "PR-2024-004", client: "Pescados do Porto", vessel: "Netuno", type: "Inscrição", status: "pendente", deadline: "12/05/2024" },
    { id: "PR-2024-005", client: "Logística Sul", vessel: "Cargueiro X", type: "Vistoria Periódica", status: "assinatura", deadline: "22/05/2024" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Processos</h1>
          <p className="text-muted-foreground">Acompanhamento de fluxos de trabalho e prazos.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <button 
              onClick={() => setView("kanban")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
            >
              Kanban
            </button>
            <button 
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
            >
              Lista
            </button>
          </div>
          <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> Novo Processo
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[600px]">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-navy text-sm uppercase tracking-wider">{col.title}</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {processes.filter(p => p.status === col.id).length}
                  </span>
                </div>
                <button className="text-slate-300 hover:text-slate-600"><Plus className="h-4 w-4" /></button>
              </div>
              
              <div className="flex-grow bg-slate-50/50 rounded-2xl p-4 space-y-4 border border-slate-100 overflow-y-auto custom-scrollbar">
                {processes.filter(p => p.status === col.id).map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono font-bold text-primary">{p.id}</span>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600"><MoreHorizontal className="h-4 w-4" /></button>
                    </div>
                    <h4 className="font-bold text-navy text-sm mb-1">{p.type}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3 w-3" /> {p.client}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Ship className="h-3 w-3" /> {p.vessel}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Calendar className="h-3 w-3" /> {p.deadline}
                      </div>
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                        RA
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* List view placeholder - reuse previous table logic or similar */}
          <div className="p-8 text-center text-slate-400">Visualização de lista disponível.</div>
        </div>
      )}
    </div>
  );
}
