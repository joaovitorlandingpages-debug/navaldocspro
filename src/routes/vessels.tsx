import { createFileRoute } from "@tanstack/react-router";
import { Ship, Search, Plus, MoreHorizontal, Settings, Info, Anchor, X, User, Hash, Zap, Shield } from "lucide-react";
import { useState } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";

export const Route = createFileRoute("/vessels")({
  component: Vessels,
});

function Vessels() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setIsNewProcessOpen } = useNewProcess();
  
  const vessels = [
    { name: "Phoenix", type: "Petroleiro", imo: "9876543", flag: "Brasil", owner: "Marinha Mercante Ltda", engine: "Wärtsilä 6R32", category: "Transporte", status: "Operacional" },
    { name: "Titan", type: "Rebocador", imo: "1234567", flag: "Brasil", owner: "Estaleiro Navegar", engine: "CAT 3516B", category: "Apoio Portuário", status: "Em Manutenção" },
    { name: "Aurora", type: "Veleiro", imo: "N/A", flag: "Panamá", owner: "Dra. Ana Marina", engine: "Yanmar 4JH", category: "Esporte/Recreio", status: "Operacional" },
    { name: "Netuno", type: "Traineira", imo: "5566778", flag: "Brasil", owner: "Pescados do Porto", engine: "Volvo Penta D13", category: "Pesca Profissional", status: "Vistoria Pendente" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Embarcações</h1>
          <p className="text-muted-foreground font-medium">Frota cadastrada e monitoramento de status.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsNewProcessOpen(true)}
            className="flex-grow sm:flex-initial bg-navy text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Processo
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nova Embarcação
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
         {vessels.map((v, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden cursor-pointer">
              {/* Decorativo náutico no fundo do card */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500 group-hover:scale-110">
                <Anchor className="h-40 w-40" />
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <Ship className="h-7 w-7" />
                 </div>
                 <button className="text-slate-200 hover:text-slate-400 p-1">
                    <MoreHorizontal className="h-6 w-6" />
                 </button>
              </div>
              <div className="relative z-10">
                 <h3 className="text-xl font-black text-navy mb-1 uppercase tracking-tight group-hover:text-primary transition-colors">{v.name}</h3>
                 <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-6">{v.type}</p>
                 <div className="space-y-3 pt-6 border-t border-slate-50">
                    <div className="flex justify-between text-[11px] font-bold">
                       <span className="text-slate-400 uppercase tracking-widest">Proprietário</span>
                       <span className="text-navy truncate ml-4">{v.owner}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                       <span className="text-slate-400 uppercase tracking-widest">IMO / Insc.</span>
                       <span className="font-mono text-primary">{v.imo}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                       <span className="text-slate-400 uppercase tracking-widest">Categoria</span>
                       <span className="text-navy">{v.category}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold pt-3">
                       <span className="text-slate-400 uppercase tracking-widest">Status</span>
                       <span className={`font-black uppercase text-[9px] px-2.5 py-1 rounded-lg tracking-widest ${
                         v.status === 'Operacional' ? 'bg-green-100 text-green-700' : 
                         v.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                       }`}>{v.status}</span>
                    </div>
                 </div>
              </div>
            </div>
         ))}
      </div>

      {/* Modal Nova Embarcação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-navy text-white rounded-2xl shadow-lg"><Ship className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-navy uppercase tracking-tight">Cadastrar Embarcação</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Registre os detalhes técnicos da frota.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-300" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Ship className="h-3 w-3 opacity-40" /> Nome da Embarcação</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" placeholder="Ex: SS Phoenix" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Zap className="h-3 w-3 opacity-40" /> Tipo de Casco / Barco</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" placeholder="Ex: Petroleiro, Rebocador, Iate" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="h-3 w-3 opacity-40" /> Proprietário / Armador</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" placeholder="Selecione ou digite o nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Hash className="h-3 w-3 opacity-40" /> Número de Inscrição / IMO</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" placeholder="9876543-2" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Settings className="h-3 w-3 opacity-40" /> Motorização Principal</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" placeholder="Ex: Wärtsilä 6R32 - 4500HP" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Shield className="h-3 w-3 opacity-40" /> Categoria de Navegação</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all">
                    <option>Mar Aberto (Longo Curso)</option>
                    <option>Cabotagem</option>
                    <option>Apoio Marítimo</option>
                    <option>Interior</option>
                    <option>Esporte e Recreio</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Inicial</label>
                <div className="grid grid-cols-3 gap-3">
                   {["Operacional", "Em Manutenção", "Em Vistoria"].map((s) => (
                     <label key={s} className="cursor-pointer">
                        <input type="radio" name="vesselStatus" className="peer hidden" defaultChecked={s === "Operacional"} />
                        <div className="p-4 text-center rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest peer-checked:bg-navy peer-checked:text-white transition-all shadow-sm">
                           {s}
                        </div>
                     </label>
                   ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
              <button className="px-12 py-3 bg-navy text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-xl shadow-navy/20 transition-all">Confirmar Cadastro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
