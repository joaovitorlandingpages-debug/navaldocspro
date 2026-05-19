import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Library, FileJson, Upload, Database, 
  Settings, History, Filter, Search, 
  Plus, CheckCircle2, AlertTriangle, 
  Clock, Download, ChevronRight, 
  Shield, Globe, MapPin, BadgeCheck,
  Eye, RefreshCw, Trash2, Edit3, Package
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function DocumentLibraryAdmin() {
  const [activeTab, setActiveTab] = useState("templates");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["admin-document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select(`
          *,
          category_info:document_categories(name, color, icon)
        `)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Log import attempt
      const { data: importRecord, error: importError } = await supabase
        .from("document_library_imports")
        .insert({
          import_type: 'json',
          total_items: Array.isArray(payload) ? payload.length : 1,
          raw_payload: payload,
          status: 'processing'
        })
        .select()
        .single();

      if (importError) throw importError;

      const documents = Array.isArray(payload) ? payload : [payload];
      let successCount = 0;
      const errors = [];

      for (const doc of documents) {
        try {
          // 1. Upsert category if name provided
          let categoryId = doc.category_id;
          if (doc.category && !categoryId) {
             const { data: cat } = await supabase
               .from('document_categories')
               .select('id')
               .eq('name', doc.category)
               .maybeSingle();
             categoryId = cat?.id;
          }

          // 2. Upsert template
          const templateData = {
            name: doc.document_name || doc.name,
            description: doc.description,
            category: doc.category,
            category_id: categoryId,
            ocr_enabled: doc.ocr_enabled || false,
            source_origin: doc.source_origin || 'fonte_oficial',
            validation_status: doc.validation_status || 'ativo',
            version_number: doc.version || 1,
            is_active: true
          };

          const { data: template, error: tError } = await supabase
            .from('document_templates')
            .upsert(templateData, { onConflict: 'name' })
            .select()
            .single();

          if (tError) throw tError;

          // 3. Upsert fields if present
          if (doc.fields && Array.isArray(doc.fields)) {
            const fieldRecords = doc.fields.map((f: any) => ({
              template_id: template.id,
              field_key: f.key,
              field_label: f.label,
              field_type: f.type || 'text',
              is_required: f.required || false,
              mapping_path: f.mapping_path
            }));

            const { error: fError } = await supabase
              .from('document_template_fields')
              .upsert(fieldRecords, { onConflict: 'template_id,field_key' });
            
            if (fError) console.error("Error importing fields:", fError);
          }

          successCount++;
        } catch (err: any) {
          errors.push({ doc: doc.document_name, error: err.message });
        }
      }

      // Update import record
      await supabase
        .from("document_library_imports")
        .update({
          status: errors.length > 0 ? 'completed_with_errors' : 'completed',
          success_count: successCount,
          error_log: errors
        })
        .eq('id', importRecord.id);

      return { successCount, errors };
    },
    onSuccess: (data) => {
      toast.success(`Importação concluída: ${data.successCount} documentos.`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erros detectados. Verifique os logs.`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-document-templates"] });
      setIsImportModalOpen(false);
      setImportJson("");
    },
    onError: (error: any) => {
      toast.error("Falha na importação: " + error.message);
    }
  });

  const handleImport = () => {
    try {
      const payload = JSON.parse(importJson);
      importMutation.mutate(payload);
    } catch (e) {
      toast.error("JSON inválido. Por favor, corrija o formato.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <Badge className="bg-emerald-500 text-white uppercase text-[8px]">Ativo</Badge>;
      case 'validado': return <Badge className="bg-blue-500 text-white uppercase text-[8px]">Validado</Badge>;
      case 'rascunho': return <Badge className="bg-slate-300 text-white uppercase text-[8px]">Rascunho</Badge>;
      case 'substituido': return <Badge className="bg-amber-500 text-white uppercase text-[8px]">Substituído</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[8px]">{status}</Badge>;
    }
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'fonte_oficial': return <Badge variant="outline" className="border-blue-200 text-blue-600 gap-1 text-[8px] uppercase font-black"><Globe className="h-2 w-2" /> Oficial</Badge>;
      case 'validado_engenheiro': return <Badge variant="outline" className="border-purple-200 text-purple-600 gap-1 text-[8px] uppercase font-black"><BadgeCheck className="h-2 w-2" /> Engenharia</Badge>;
      case 'modelo_interno': return <Badge variant="outline" className="border-slate-200 text-slate-600 gap-1 text-[8px] uppercase font-black"><Database className="h-2 w-2" /> Interno</Badge>;
      default: return <Badge variant="outline" className="text-[8px] uppercase">{origin}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Badge className="bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest">Admin Master</Badge>
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Biblioteca Global</span>
          </div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase flex items-center gap-3">
            <Library className="h-8 w-8 text-primary" /> Biblioteca Oficial
          </h1>
          <p className="text-muted-foreground font-medium">Gestão centralizada de templates, normas e conformidade marítima.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsImportModalOpen(true)}
            variant="outline" 
            className="flex-grow sm:flex-initial gap-2 border-slate-200"
          >
            <FileJson className="h-4 w-4" /> Importação em Massa
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Novo Template Oficial
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total de Modelos</p>
            <h3 className="text-2xl font-bold text-navy">{templates?.length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fontes Oficiais</p>
            <h3 className="text-2xl font-bold text-blue-600">
              {templates?.filter((t: any) => t.source_origin === 'fonte_oficial').length || 0}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Aguardando Validação</p>
            <h3 className="text-2xl font-bold text-amber-500">
              {templates?.filter((t: any) => t.validation_status === 'em_validacao').length || 0}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ativos DPC 2026</p>
            <h3 className="text-2xl font-bold text-emerald-500">94%</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="templates" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Database className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="fields" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Settings className="h-4 w-4" /> Campos Globais
          </TabsTrigger>
          <TabsTrigger value="packages" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Package className="h-4 w-4" /> Pacotes
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <History className="h-4 w-4" /> Logs de Versão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
             <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                   <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Documento</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Origem / Status</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Versão</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Região</TableHead>
                   <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 tracking-widest">Ações</TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {templates?.map((template: any) => (
                  <TableRow key={template.id} className="group">
                    <TableCell>
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                             <FileJson className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-navy">{template.name}</p>
                             <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[300px]">{template.description}</p>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="text-[9px] font-bold uppercase">{template.category || 'Geral'}</Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1.5">
                          {getOriginBadge(template.source_origin)}
                          {getStatusBadge(template.validation_status)}
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-navy">v{template.version_number || '1.0'}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-bold">{new Date(template.updated_at).toLocaleDateString()}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200">
                          {template.regional_scope || 'Nacional'}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-primary"><RefreshCw className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-red-500"><Trash2 className="h-4 w-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
             </TableBody>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <Card className="p-10 border-slate-100 text-center">
              <Settings className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-navy">Gestão de Campos Globais</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">Defina campos reutilizáveis para todos os templates oficiais e suas regras de mapeamento OCR.</p>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Importação em Massa
            </DialogTitle>
            <DialogDescription>
              Cole o conteúdo JSON da biblioteca documental no formato padrão para importar templates e campos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Exemplo de Estrutura</p>
                <code className="text-[10px] text-primary bg-white p-2 block rounded border border-slate-100">
                  {`{ "name": "TIE", "category": "Registro", "ocr_enabled": true, "fields": [...] }`}
                </code>
             </div>
             <textarea 
               value={importJson}
               onChange={(e) => setImportJson(e.target.value)}
               className="w-full h-64 p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl focus:ring-2 focus:ring-primary border-none"
               placeholder="[ { ... }, { ... } ]"
             />
          </div>

          <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setIsImportModalOpen(false)} className="rounded-xl h-11 px-6">Cancelar</Button>
             <Button 
               onClick={handleImport}
               disabled={!importJson || importMutation.isPending}
               className="bg-primary text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20"
             >
                {importMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Iniciar Importação
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
