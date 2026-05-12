import { createFileRoute } from "@tanstack/react-router";
import { Ship, Search, Plus, MoreHorizontal, Settings, Info, Anchor } from "lucide-react";

export const Route = createFileRoute("/vessels")({
  component: Vessels,
});

function Vessels() {
  const vessels = [
    { name: "Phoenix", type: "Petroleiro", imo: "9876543", flag: "Brasil", status: "Operacional" },
    { name: "Titan", type: "Rebocador", imo: "1234567", flag: "Brasil", status: "Em Manutenção" },
    { name: "Aurora", type: "Veleiro", imo: "N/A", flag: "Panamá", status: "Operacional" },
    { name: "Netuno", type: "Traineira", imo: "5566778", flag: "Brasil", status: "Vistoria Pendente" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Embarcações</h1>
          <p className="text-muted-foreground">Frota cadastrada e monitoramento de status.</p>
        </div>
        <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Nova Embarcação
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
         {vessels.map((v, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-6">
                 <div className="h-12 w-12 bg-navy/5 rounded-xl flex items-center justify-center text-navy group-hover:bg-primary group-hover:text-white transition-colors">
                    <Ship className="h-6 w-6" />
                 </div>
                 <button className="text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="h-5 w-5" />
                 </button>
              </div>
              <div>
                 <h3 className="text-lg font-bold text-navy mb-1">{v.name}</h3>
                 <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-4">{v.type}</p>
                 <div className="space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400">IMO</span>
                       <span className="font-mono text-slate-700">{v.imo}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400">Bandeira</span>
                       <span className="text-slate-700">{v.flag}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2">
                       <span className="text-slate-400">Status</span>
                       <span className={`font-bold ${
                         v.status === 'Operacional' ? 'text-green-600' : 
                         v.status === 'Em Manutenção' ? 'text-amber-600' : 'text-red-600'
                       }`}>{v.status}</span>
                    </div>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
