import { createFileRoute } from "@tanstack/react-router";
import { 
  FileStack, Search, Plus, Filter, 
  MoreVertical, Download, Globe, Lock, 
  Settings, RefreshCw, ToggleLeft, ToggleRight, Trash2,
  Loader2, X, Upload
} from "lucide-react";
import { useState } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DocumentFieldEditor } from "@/components/DocumentFieldEditor";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

function AdminDocuments() {
  const [activeTab, setActiveTab] = useState("templates");
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [editingFieldsId, setEditingFieldsId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "Engenharia",
    description: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { templates, isLoadingTemplates, createTemplate, deleteTemplate, toggleTemplateActive } = useDocuments();

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      toast.error("O nome do template é obrigatório");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        ...newTemplate,
        file: selectedFile || undefined
      });
      setIsNewTemplateOpen(false);
      setNewTemplate({ name: "", category: "Engenharia", description: "" });
      setSelectedFile(null);
    } catch (error) {
      // toast handled in hook
    }
  };

  const docs = templates || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Biblioteca Master</h2>
            <p className="text-slate-500 font-mono text-xs italic">Gestão de templates globais e modelos normativos.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
               <Settings className="h-4 w-4" /> Configurar Campos
            </button>
            <button 
              onClick={() => setIsNewTemplateOpen(true)}
              className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
               <Plus className="h-4 w-4" /> Novo Template
            </button>
          </div>
       </div>

       <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-fit">
          <button 
            onClick={() => setActiveTab("templates")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'templates' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Modelos de Documentos
          </button>
          <button 
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Categorias
          </button>
       </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingTemplates ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              <p className="text-slate-500 font-medium">Carregando templates...</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="col-span-full text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
               <FileStack className="h-12 w-12 text-white/5 mx-auto mb-4" />
               <p className="text-slate-500 font-medium">Nenhum template cadastrado.</p>
            </div>
          ) : docs.map((doc: any) => (
            <div key={doc.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:border-red-500/30 transition-all group relative overflow-hidden backdrop-blur-md">
               {/* Overlay decorativo de versão */}
               <div className="absolute -right-2 -top-2 bg-black/40 px-4 py-2 rounded-bl-3xl border-l border-b border-white/5 text-[10px] font-mono text-red-400 font-black tracking-widest group-hover:bg-red-500 group-hover:text-white transition-all">
                  v{doc.version}.0
               </div>

               <div className="h-14 w-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mb-6 group-hover:scale-110 transition-all border border-red-500/20 shadow-inner">
                  <FileStack className="h-7 w-7" />
       </div>

       <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
         <DialogContent className="max-w-md bg-slate-900 border-white/10 text-white rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Novo Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400">Nome do Modelo</Label>
                  <Input 
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="Ex: Requerimento de Inscrição" 
                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400">Categoria</Label>
                  <Select 
                    value={newTemplate.category}
                    onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                       <SelectItem value="Registro Inicial">Registro Inicial</SelectItem>
                       <SelectItem value="Transferência">Transferência</SelectItem>
                       <SelectItem value="Renovação">Renovação</SelectItem>
                       <SelectItem value="Procuração">Procuração</SelectItem>
                       <SelectItem value="Declaração">Declaração</SelectItem>
                       <SelectItem value="Requerimento">Requerimento</SelectItem>
                       <SelectItem value="GRU">GRU</SelectItem>
                       <SelectItem value="Autorização">Autorização</SelectItem>
                       <SelectItem value="Vistoria">Vistoria</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400">Upload do Arquivo (.docx / .pdf)</Label>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-red-500/50 transition-all cursor-pointer relative group">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2 group-hover:text-red-400" />
                    <p className="text-xs text-slate-400 font-medium">
                      {selectedFile ? selectedFile.name : "Arraste ou clique para selecionar"}
                    </p>
                  </div>
               </div>
            </div>
            <DialogFooter className="gap-2">
               <Button variant="ghost" onClick={() => setIsNewTemplateOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
               <Button 
                onClick={handleCreateTemplate}
                disabled={createTemplate.isPending}
                className="bg-red-500 hover:bg-red-600 rounded-xl px-8 font-bold"
               >
                 {createTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Template"}
               </Button>
            </DialogFooter>
         </DialogContent>
       </Dialog>

       <Dialog open={!!editingFieldsId} onOpenChange={(open) => !open && setEditingFieldsId(null)}>
         <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white rounded-[2rem] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Configurar Mapeamento de Campos</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {editingFieldsId && <DocumentFieldEditor templateId={editingFieldsId} />}
            </div>
         </DialogContent>
       </Dialog>

               <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                    <span className="text-slate-500">Criado em</span>
                    <span className="text-slate-300 font-mono">{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                    <span className="text-slate-500">Visibilidade</span>
                    <div className="flex items-center gap-1 text-slate-300 font-bold uppercase">
                      {doc.company_id ? <Lock className="h-2.5 w-2.5 text-amber-400" /> : <Globe className="h-2.5 w-2.5 text-blue-400" />}
                      {doc.company_id ? 'Empresa' : 'Global'}
                    </div>
                  </div>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={() => toggleTemplateActive.mutate({ id: doc.id, is_active: !doc.is_active })}
                       title={doc.is_active ? 'Desativar' : 'Ativar'} 
                       className="transition-all"
                     >
                        {doc.is_active ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-slate-600" />}
                     </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingFieldsId(doc.id)}
                      title="Configurar Campos" 
                      className="p-2 bg-white/5 hover:bg-blue-500/20 rounded-xl text-slate-400 hover:text-blue-400 transition-all border border-white/5"
                    >
                       <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este template?")) {
                          deleteTemplate.mutate(doc.id);
                        }
                      }}
                      title="Excluir" 
                      className="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-500 transition-all border border-white/5"
                    >
                       <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 border border-white/5">
                       <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
               </div>
               
               <button className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all border border-white/5 hover:border-white/10">
                  Substituir Modelo (.docx)
               </button>
            </div>
          ))}
       </div>
    </div>
  );
}
