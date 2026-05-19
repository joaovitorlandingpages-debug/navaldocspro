import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Search, Plus, Filter, 
  FolderOpen, Shield, Users, Ship, 
  CreditCard, Globe, HeartPulse, Wrench, 
  Briefcase, CheckCircle2, AlertCircle, Clock,
  ChevronRight, MoreVertical, Edit, Trash2,
  Copy, Download, Eye, Zap, Database, LayoutDashboard
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { DocumentCategory, DocumentTemplate } from "@/types/document";
import { DocumentDashboard } from "@/components/documents/DocumentDashboard";

export default function DocumentBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["document-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DocumentCategory[];
    }
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["document-templates", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("document_templates")
        .select(`
          *,
          category_info:document_categories(name, color, icon)
        `)
        .order("name");
      
      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (DocumentTemplate & { category_info: any })[];
    }
  });

  const filteredTemplates = templates?.filter((t: DocumentTemplate) => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Anchor': return <FolderOpen className="h-5 w-5" />;
      case 'ShieldCheck': return <Shield className="h-5 w-5" />;
      case 'Users': return <Users className="h-5 w-5" />;
      case 'Ship': return <Ship className="h-5 w-5" />;
      case 'CreditCard': return <CreditCard className="h-5 w-5" />;
      case 'Globe': return <Globe className="h-5 w-5" />;
      case 'HeartPulse': return <HeartPulse className="h-5 w-5" />;
      case 'Wrench': return <Wrench className="h-5 w-5" />;
      case 'FileText': return <FileText className="h-5 w-5" />;
      case 'Briefcase': return <Briefcase className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" /> Base Documental
          </h1>
          <p className="text-muted-foreground font-medium">Repositório oficial de templates e documentos marítimos.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-grow sm:flex-initial gap-2 border-slate-200">
            <Filter className="h-4 w-4" /> Filtros Avançados
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Templates</p>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{templates?.length || 0}</h3>
            <p className="text-[10px] text-green-500 font-bold mt-1 uppercase">+2 adicionados hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorias</p>
              <FolderOpen className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{categories?.length || 0}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Módulos operacionais</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">OCR Ativo</p>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">
              {templates?.filter((t: DocumentTemplate) => t.ocr_enabled).length || 0}
            </h3>
            <div className="mt-2">
              <Progress value={85} className="h-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prontidão Nacional</p>
              <Globe className="h-4 w-4 text-cyan-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">98%</h3>
            <p className="text-[10px] text-cyan-500 font-bold mt-1 uppercase">Documentação DPC completa</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Categories */}
        <aside className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar categoria..." 
              className="pl-10 h-10 bg-white border-slate-200"
            />
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                !selectedCategory ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className={`h-4 w-4 ${!selectedCategory ? "text-white" : "text-primary"}`} />
                <span className="text-xs font-bold uppercase tracking-wider">Todos os Módulos</span>
              </div>
              <Badge variant={!selectedCategory ? "outline" : "secondary"} className="text-[9px] border-white/20">
                {templates?.length || 0}
              </Badge>
            </button>

            {categories?.map((cat: DocumentCategory) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedCategory === cat.id ? "bg-navy text-white shadow-md shadow-navy/20" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 opacity-70">
                    {getIcon(cat.icon || "")}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[150px]">{cat.name}</span>
                </div>
                <Badge variant={selectedCategory === cat.id ? "outline" : "secondary"} className="text-[9px] border-white/20">
                  {templates?.filter((t: DocumentTemplate) => t.category_id === cat.id).length || 0}
                </Badge>
              </button>
            ))}
          </div>
        </aside>

        {/* Templates Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar template por nome ou descrição..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white border-slate-200"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-8 border-slate-200 px-3 bg-white text-navy font-bold uppercase text-[9px]">
                {filteredTemplates?.length || 0} Templates
              </Badge>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden h-10">
                <button className="px-3 bg-slate-50 text-navy border-r border-slate-200">
                  <FolderOpen className="h-4 w-4" />
                </button>
                <button className="px-3 bg-white text-slate-400 hover:bg-slate-50">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates?.map((template: any) => (
              <Card key={template.id} className="group hover:shadow-xl transition-all duration-300 border-slate-100 overflow-hidden relative">
                <div 
                  className="h-1.5 w-full absolute top-0 left-0" 
                  style={{ backgroundColor: template.category_info?.color || '#3b82f6' }}
                />
                
                <CardHeader className="pb-3 pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter" style={{ color: template.category_info?.color, borderColor: (template.category_info?.color || '#3b82f6') + '40' }}>
                      {template.category || 'Sem Categoria'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="gap-2 font-bold text-xs uppercase cursor-pointer">
                          <Edit className="h-3.5 w-3.5" /> Editar Template
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 font-bold text-xs uppercase cursor-pointer">
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 font-bold text-xs uppercase cursor-pointer text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-base font-bold text-navy group-hover:text-primary transition-colors">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 min-h-[32px]">{template.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> v{template.version || 1.0}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3 w-3" /> {template.ocr_enabled ? 'OCR ATIVO' : 'MANUAL'}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-grow text-[9px] font-black uppercase tracking-widest border-slate-200">
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Button>
                      <Button size="sm" className="flex-grow text-[9px] font-black uppercase tracking-widest bg-navy hover:bg-navy/90">
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
                
                {template.ocr_enabled && (
                  <div className="absolute top-6 right-10">
                    <Badge className="bg-amber-500/10 text-amber-600 border-none animate-pulse">
                      <Zap className="h-3 w-3 mr-1" /> AI
                    </Badge>
                  </div>
                )}
              </Card>
            ))}

            {filteredTemplates?.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-navy">Nenhum template encontrado</h3>
                <p className="text-xs max-w-xs text-center mt-1 font-medium">Não encontramos templates com os critérios de busca aplicados.</p>
                <Button className="mt-6 bg-primary" onClick={() => setSearchQuery("")}>Limpar Filtros</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
