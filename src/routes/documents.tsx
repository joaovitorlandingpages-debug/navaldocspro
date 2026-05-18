import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, Search, Plus, Download, Eye, 
  Filter, Tag, LayoutGrid, List, MoreVertical, X,
  Zap, Cpu, Loader2, Calendar, User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { SmartOCR } from "@/components/SmartOCR";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/documents")({
  component: Documents,
});

function Documents() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"standard" | "smart">("standard");
  const { generatedDocuments, isLoadingGenerated, getSignedUrl } = useDocuments();
  
  const handleViewDocument = async (doc: any) => {
    try {
      if (doc.generated_file_url) {
        // If it's a full URL (legacy), use it. If it's just a path, get signed URL.
        const path = doc.generated_file_url.includes('http') 
          ? doc.generated_file_url.split('/').slice(-2).join('/')
          : doc.generated_file_url;
        
        const url = await getSignedUrl('generated-documents', path);
        window.open(url, '_blank');
      }
    } catch (e) {
      toast.error("Erro ao abrir documento.");
    }
  };

  const categories = ["Todos", "Registro Inicial", "Transferência", "Renovação", "Procuração", "Declaração", "Requerimento", "GRU", "Autorização", "Vistoria"];
  
  const docs = generatedDocuments || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Biblioteca de Documentos</h1>
          <p className="text-muted-foreground">Repositório de arquivos e automação de templates.</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-slate-100 text-navy px-5 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-all border border-slate-200">
             Templates Inteligentes
           </button>
           <button 
             onClick={() => setIsUploadOpen(true)}
             className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
           >
             <Plus className="h-5 w-5" /> Novo Documento
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${cat === 'Todos' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input placeholder="Pesquisar arquivos..." className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-100">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoadingGenerated ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-slate-500 font-medium">Carregando documentos...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
             <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-medium">Nenhum documento encontrado.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {docs.map((doc: any) => (
              <div key={doc.id} className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:shadow-xl hover:bg-white transition-all cursor-pointer relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-red-100 text-red-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-md transition-all">
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
                <h4 className="font-bold text-navy text-sm mb-1 truncate" title={doc.name}>{doc.name}</h4>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-4">
                  <span>PDF • {doc.customer?.name || 'Geral'}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    doc.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{doc.status === 'completed' ? 'Concluído' : 'Rascunho'}</span>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-4">
                   {doc.vessel?.name && (
                     <span className="text-[9px] bg-white border border-slate-100 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                       <Tag className="h-2 w-2" /> {doc.vessel.name}
                     </span>
                   )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleViewDocument(doc)}
                    className="flex-grow py-2 rounded-lg bg-navy text-white text-[10px] font-bold hover:bg-navy/90 text-center"
                  >
                    Visualizar
                  </button>
                  <button className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Embarcação</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors text-sm group">
                    <td className="px-4 py-4 flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="font-bold text-navy">{doc.name}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{doc.customer?.name || '-'}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{doc.vessel?.name || '-'}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{doc.status === 'completed' ? 'Concluído' : 'Rascunho'}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleViewDocument(doc)} className="p-2 text-slate-400 hover:text-navy"><Eye className="h-4 w-4" /></button>
                          <button className="p-2 text-slate-400 hover:text-navy"><Download className="h-4 w-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Upload Fictício */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white w-full ${uploadMode === 'smart' ? 'max-w-3xl' : 'max-w-xl'} rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex gap-4">
                 <button 
                   onClick={() => setUploadMode("standard")}
                   className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${uploadMode === 'standard' ? 'bg-navy text-white shadow-lg' : 'text-slate-400 hover:text-navy'}`}
                 >
                   Upload Padrão
                 </button>
                 <button 
                   onClick={() => setUploadMode("smart")}
                   className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${uploadMode === 'smart' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-primary'}`}
                 >
                   <Zap className="h-4 w-4" /> OCR Inteligente
                 </button>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {uploadMode === "standard" ? (
              <>
                <div className="p-10 space-y-6">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Plus className="h-8 w-8 text-slate-400 group-hover:text-primary" />
                    </div>
                    <p className="font-bold text-navy">Arraste seus arquivos aqui</p>
                    <p className="text-sm text-slate-400">ou clique para selecionar do seu computador</p>
                    <p className="text-[10px] text-slate-300 mt-4">PDF, DOCX, DWG, JPG (Máx. 50MB)</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Categoria</label>
                      <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        <option>Memoriais</option>
                        <option>ARTs</option>
                        <option>Certificados</option>
                        <option>Projetos</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Privacidade</label>
                      <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        <option>Somente eu</option>
                        <option>Empresa</option>
                        <option>Público para cliente</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                  <button onClick={() => setIsUploadOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
                  <button className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all">Iniciar Upload</button>
                </div>
              </>
            ) : (
              <div className="p-8 bg-slate-50/50">
                <SmartOCR />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
