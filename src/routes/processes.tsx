import { createFileRoute } from "@tanstack/react-router";
import { 
  ClipboardList, Search, Plus, MoreHorizontal, 
  ArrowRight, Calendar, User, Ship, AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/processes")({
  component: Processes,
});

function Processes() {
  const processes = [
    { id: "PR-2024-001", client: "Navegação Mar Azul", vessel: "Phoenix", type: "Vistoria Anual", status: "Em Análise", priority: "Alta", deadline: "15/05/2024" },
    { id: "PR-2024-002", client: "Estaleiro Central", vessel: "Titan", type: "Homologação", status: "Aguardando Docs", priority: "Média", deadline: "20/05/2024" },
    { id: "PR-2024-003", client: "Marina Yacht Club", vessel: "Aurora", type: "Renovação CSN", status: "Concluído", priority: "Baixa", deadline: "08/05/2024" },
    { id: "PR-2024-004", client: "Pescados do Porto", vessel: "Netuno", type: "Inscrição", status: "Em Elaboração", priority: "Alta", deadline: "12/05/2024" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Processos</h1>
          <p className="text-muted-foreground">Acompanhamento de fluxos de trabalho e prazos.</p>
        </div>
        <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Novo Processo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input placeholder="Buscar por código ou navio..." className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-sm border-slate-200 focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-2">
               <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase">
                  <AlertCircle className="h-3 w-3" /> 2 Atrasados
               </span>
               <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                  12 em curso
               </span>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                     <th className="px-6 py-4 font-semibold">CÓDIGO / TIPO</th>
                     <th className="px-6 py-4 font-semibold">ENTIDADE</th>
                     <th className="px-6 py-4 font-semibold">STATUS</th>
                     <th className="px-6 py-4 font-semibold">PRIORIDADE</th>
                     <th className="px-6 py-4 font-semibold">PRAZO</th>
                     <th className="px-6 py-4 font-semibold"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {processes.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                       <td className="px-6 py-4">
                          <div className="font-mono text-xs text-primary font-bold">{p.id}</div>
                          <div className="font-bold text-navy text-sm mt-0.5">{p.type}</div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <User className="h-3.5 w-3.5 text-slate-400" />
                             <span className="text-sm font-medium text-slate-700">{p.client}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <Ship className="h-3.5 w-3.5 text-slate-400" />
                             <span className="text-xs text-slate-500">{p.vessel}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                             p.status === 'Concluído' ? 'bg-green-100 text-green-700' : 
                             p.status === 'Aguardando Docs' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                             {p.status}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <div className={`h-2 w-2 rounded-full mx-auto ${
                             p.priority === 'Alta' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                             p.priority === 'Média' ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                             <Calendar className="h-3.5 w-3.5" /> {p.deadline}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                             <ArrowRight className="h-5 w-5" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
