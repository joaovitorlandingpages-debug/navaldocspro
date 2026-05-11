import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, Search, Plus, Download, Eye, 
  FileCheck, FileWarning, Clock, Filter 
} from "lucide-react";

export const Route = createFileRoute("/documents")({
  component: Documents,
});

function Documents() {
  const documents = [
    { name: "Memorial Descritivo - Phoenix", type: "PDF", size: "2.4 MB", date: "10/05/2024", status: "Assinado" },
    { name: "ART de Projeto Estrutural", type: "PDF", size: "1.1 MB", date: "09/05/2024", status: "Pendente" },
    { name: "Certificado de Segurança", type: "PDF", size: "850 KB", date: "08/05/2024", status: "Assinado" },
    { name: "Relatório de Vistoria Técnica", type: "DOCX", size: "4.2 MB", date: "05/05/2024", status: "Rascunho" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">Repositório de arquivos e automação de templates.</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-slate-100 text-navy px-5 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-all">
             Gerenciar Templates
           </button>
           <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
             <Plus className="h-5 w-5" /> Novo Documento
           </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
         {documents.map((doc, i) => (
           <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-xl ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    <FileText className="h-6 w-6" />
                 </div>
                 <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                   doc.status === 'Assinado' ? 'bg-green-100 text-green-700' : 
                   doc.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                 }`}>
                   {doc.status}
                 </span>
              </div>
              <h4 className="font-bold text-navy text-sm mb-1 truncate" title={doc.name}>{doc.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{doc.type} • {doc.size}</p>
              
              <div className="flex gap-2 border-t border-slate-50 pt-4">
                 <button className="flex-grow flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors text-xs font-bold">
                    <Eye className="h-3.5 w-3.5" /> Ver
                 </button>
                 <button className="flex-grow flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-primary/5 hover:text-primary transition-colors text-xs font-bold">
                    <Download className="h-3.5 w-3.5" /> Baixar
                 </button>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
