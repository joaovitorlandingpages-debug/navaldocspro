import { createFileRoute } from "@tanstack/react-router";
import { Ship, Search, Plus, MoreHorizontal, Settings, Info, Anchor, X, User, Hash, Zap, Shield } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/vessels")({
  component: Vessels,
});

function Vessels() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const vessels = [
    { name: "Phoenix", type: "Petroleiro", imo: "9876543", flag: "Brasil", owner: "Marinha Mercante Ltda", engine: "Wärtsilä 6R32", category: "Transporte", status: "Operacional" },
    { name: "Titan", type: "Rebocador", imo: "1234567", flag: "Brasil", owner: "Estaleiro Navegar", engine: "CAT 3516B", category: "Apoio Portuário", status: "Em Manutenção" },
    { name: "Aurora", type: "Veleiro", imo: "N/A", flag: "Panamá", owner: "Dra. Ana Marina", engine: "Yanmar 4JH", category: "Esporte/Recreio", status: "Operacional" },
    { name: "Netuno", type: "Traineira", imo: "5566778", flag: "Brasil", owner: "Pescados do Porto", engine: "Volvo Penta D13", category: "Pesca Profissional", status: "Vistoria Pendente" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Embarcações</h1>
          <p className="text-muted-foreground">Frota cadastrada e monitoramento de status.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" /> Nova Embarcação
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
         {vessels.map((v, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
              {/* Decorativo náutico no fundo do card */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Anchor className="h-32 w-32" />
              </div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                 <div className="h-12 w-12 bg-navy/5 rounded-xl flex items-center justify-center text-navy group-hover:bg-primary group-hover:text-white transition-colors">
                    <Ship className="h-6 w-6" />
                 </div>
                 <button className="text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="h-5 w-5" />
                 </button>
              </div>
              <div className="relative z-10">
                 <h3 className="text-lg font-bold text-navy mb-1">{v.name}</h3>
                 <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-4">{v.type}</p>
                 <div className="space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400">Proprietário</span>
                       <span className="text-slate-700 font-medium truncate ml-4">{v.owner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400">IMO / Insc.</span>
                       <span className="font-mono text-slate-700">{v.imo}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400">Categoria</span>
                       <span className="text-slate-700">{v.category}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2">
                       <span className="text-slate-400">Status</span>
                       <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
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
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy text-white rounded-lg"><Ship className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-xl font-bold text-navy">Cadastrar Embarcação</h3>
                  <p className="text-xs text-muted-foreground">Registre os detalhes técnicos da frota.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Ship className="h-3 w-3 opacity-40" /> Nome da Embarcação</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: SS Phoenix" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Zap className="h-3 w-3 opacity-40" /> Tipo de Casco / Barco</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Petroleiro, Rebocador, Iate" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="h-3 w-3 opacity-40" /> Proprietário / Armador</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Selecione ou digite o nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Hash className="h-3 w-3 opacity-40" /> Número de Inscrição / IMO</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="9876543-2" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Settings className="h-3 w-3 opacity-40" /> Motorização Principal</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Wärtsilä 6R32 - 4500HP" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Shield className="h-3 w-3 opacity-40" /> Categoria de Navegação</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
                    <option>Mar Aberto (Longo Curso)</option>
                    <option>Cabotagem</option>
                    <option>Apoio Marítimo</option>
                    <option>Interior</option>
                    <option>Esporte e Recreio</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Status Inicial</label>
                <div className="grid grid-cols-3 gap-3">
                   {["Operacional", "Em Manutenção", "Em Vistoria"].map((s) => (
                     <label key={s} className="cursor-pointer">
                        <input type="radio" name="vesselStatus" className="peer hidden" defaultChecked={s === "Operacional"} />
                        <div className="p-3 text-center rounded-lg border border-slate-200 text-xs font-bold peer-checked:bg-navy peer-checked:text-white transition-all">
                           {s}
                        </div>
                     </label>
                   ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
              <button className="px-8 py-2.5 bg-navy text-white rounded-xl font-bold hover:opacity-90 shadow-lg transition-all">Confirmar Cadastro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
