import { createFileRoute } from "@tanstack/react-router";
import { Users, Search, Plus, MoreHorizontal, Mail, MapPin, Filter, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/customers")({
  component: Customers,
});

function Customers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const customers = [
    { name: "Marinha Mercante Ltda", id: "23.456.789/0001-21", type: "Empresa", location: "Santos, SP", contact: "contato@mercante.com", phone: "(13) 3210-9090", shipCount: 12 },
    { name: "Eng. Pedro Santos", id: "123.456.789-00", type: "Individual", location: "Rio de Janeiro, RJ", contact: "pedro@eng.com", phone: "(21) 98888-7777", shipCount: 2 },
    { name: "Estaleiro Navegar", id: "34.567.890/0001-32", type: "Empresa", location: "Itajaí, SC", contact: "adm@navegar.com", phone: "(47) 3344-5566", shipCount: 45 },
    { name: "Dra. Ana Marina", id: "234.567.890-11", type: "Individual", location: "Salvador, BA", contact: "ana@marina.pro", phone: "(71) 99999-8888", shipCount: 5 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes e contatos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input placeholder="Filtrar clientes..." className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-sm border-slate-200 focus:ring-2 focus:ring-primary/20" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white hover:bg-slate-50">
               <Filter className="h-4 w-4" /> Filtros Avançados
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                     <th className="px-6 py-4 font-semibold">CLIENTE / DOC</th>
                     <th className="px-6 py-4 font-semibold">TIPO</th>
                     <th className="px-6 py-4 font-semibold">CONTATO</th>
                     <th className="px-6 py-4 font-semibold">EMBARCAÇÕES</th>
                     <th className="px-6 py-4 font-semibold"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {customers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-bold text-navy">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.id}</div>
                       </td>
                       <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${c.type === 'Empresa' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                             {c.type}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5 mb-1">
                             <Mail className="h-3.5 w-3.5" /> {c.contact}
                          </div>
                          <div className="text-[11px] flex items-center gap-1.5 opacity-70">
                             <MapPin className="h-3 w-3" /> {c.location}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min(c.shipCount * 2, 100)}%` }} />
                             </div>
                             <span className="text-sm font-bold">{c.shipCount}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                             <MoreHorizontal className="h-5 w-5" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-4 border-t flex items-center justify-between text-xs text-slate-500">
            <span>Mostrando 4 de 42 clientes</span>
            <div className="flex gap-2">
               <button className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50" disabled>Anterior</button>
               <button className="px-3 py-1 border rounded bg-primary text-white">1</button>
               <button className="px-3 py-1 border rounded hover:bg-slate-50">2</button>
               <button className="px-3 py-1 border rounded hover:bg-slate-50">Próximo</button>
            </div>
         </div>
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-navy">Cadastrar Novo Cliente</h3>
                <p className="text-xs text-muted-foreground">Preencha os dados básicos para iniciar.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nome / Razão Social</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: João Silva ou Empresa LTDA" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">CPF / CNPJ</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">E-mail</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="contato@cliente.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Telefone</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Endereço Completo</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Rua, Número, Bairro, Cidade - UF" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tipo de Cliente</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
                    <option>Individual (Pessoa Física)</option>
                    <option>Empresa (Pessoa Jurídica)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Observações Internas</label>
                <textarea className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none" placeholder="Notas adicionais sobre este cliente..." />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
              <button className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all">Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
