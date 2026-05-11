import { createFileRoute } from "@tanstack/react-router";
import { 
  FileStack, Search, Plus, Filter, 
  MoreVertical, Download, Globe, Lock 
} from "lucide-react";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

function AdminDocuments() {
  const globalDocs = [
    { name: "Template Memorial Descritivo - Embarcação Menor", category: "Engenharia", version: "v2.1", access: "Público" },
    { name: "Formulário de Inscrição PRPM", category: "Documentação", version: "v1.0", access: "Engenheiros" },
    { name: "Checklist de Vistoria de Segurança", category: "Fiscalização", version: "v4.5", access: "Empresas" },
    { name: "Norma DPC-01 (Referência)", category: "Legislativo", version: "2024", access: "Público" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Documentos Globais</h2>
            <p className="text-slate-500 font-mono text-xs">Templates e referências disponíveis para todos os usuários.</p>
          </div>
          <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
             <Plus className="h-4 w-4" /> Upload Template
          </button>
       </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {globalDocs.map((doc, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3">
                  <button className="text-slate-600 hover:text-white transition-colors">
                     <MoreVertical className="h-4 w-4" />
                  </button>
               </div>
               
               <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <FileStack className="h-6 w-6" />
               </div>

               <h3 className="font-bold text-sm mb-1 leading-snug">{doc.name}</h3>
               <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-6">{doc.category}</p>

               <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px]">
                  <div className="flex items-center gap-4">
                     <span className="bg-white/5 px-2 py-0.5 rounded text-slate-400">VERSION {doc.version}</span>
                     <div className="flex items-center gap-1 text-slate-500">
                        {doc.access === 'Público' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {doc.access.toUpperCase()}
                     </div>
                  </div>
                  <button className="text-blue-400 font-black hover:underline tracking-tighter">EDITAR</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}
