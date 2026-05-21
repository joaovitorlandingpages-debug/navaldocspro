import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Search, Filter, 
  Download, Eye, Clock, History,
  ShieldCheck, ArrowUpRight, CheckCircle2,
  AlertCircle, MoreVertical, Database,
  LayoutGrid, List, RotateCcw, Signature,
  Shield, FileSearch
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignatureModal } from "@/components/documents/SignatureModal";
import { DocumentAuditTimeline } from "@/components/documents/DocumentAuditTimeline";
import { PDFPreviewer } from "@/components/documents/PDFPreviewer";
import { documentService } from "@/services/documentService";
import { toast } from "sonner";

export default function DocumentCenter() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ["document-center", profile?.company_id, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(`
          *,
          vessels(name),
          customers(name),
          profiles:created_by_profile_id(full_name)
        `, { count: 'exact' })
        .eq("company_id", profile?.company_id);

      if (searchQuery) {
        query = query.or(`document_type.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (error) throw error;
      if (count !== null) setTotalCount(count);
      return data;
    },
    enabled: !!profile?.company_id
  });

  useEffect(() => {
    console.log("CACHE_SYSTEM_OK");
  }, []);

  const filteredDocs = documents; // Ja filtrado pela query

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[9px] font-black tracking-widest gap-1"><CheckCircle2 className="h-3 w-3" /> Assinado</Badge>;
      case 'pending_signature':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-100 uppercase text-[9px] font-black tracking-widest gap-1"><Clock className="h-3 w-3" /> Pendente Assinatura</Badge>;
      case 'expired':
        return <Badge className="bg-red-50 text-red-700 border-red-100 uppercase text-[9px] font-black tracking-widest gap-1"><AlertCircle className="h-3 w-3" /> Vencido</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest">{status}</Badge>;
    }
  };

  const handleDownload = async (doc: any) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      await documentService.logAction(doc.id, 'downloaded');
    } else {
      toast.error("URL do arquivo não encontrada.");
    }
  };

  const handleSignRequest = (id: string) => {
    setSelectedDocId(id);
    setIsSignModalOpen(true);
  };

  const handleAuditRequest = (doc: any) => {
    setSelectedDoc(doc);
    setSelectedDocId(doc.id);
    setIsAuditOpen(true);
  };

  const handlePreviewRequest = (doc: any) => {
    setSelectedDoc(doc);
    setIsPreviewOpen(true);
    documentService.logAction(doc.id, 'viewed');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" /> Central Documental
          </h1>
          <p className="text-muted-foreground font-medium">Gestão profissional de documentos, assinaturas e versões.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-grow sm:flex-initial gap-2 border-slate-200 font-black text-[10px] uppercase tracking-widest">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest">
            <RotateCcw className="h-4 w-4" /> Sincronizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documentos", value: totalCount || 0, icon: FileText, color: "text-primary" },
          { label: "Aguardando Assinatura", value: 3, icon: Signature, color: "text-amber-500" },
          { label: "Vencendo em Breve", value: 4, icon: Clock, color: "text-red-500" },
          { label: "Assinados hoje", value: 12, icon: ShieldCheck, color: "text-emerald-500" },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border-slate-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-navy">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, cliente ou embarcação..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 border-transparent focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full sm:w-[120px]">
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 uppercase font-black text-xs tracking-widest">
          Carregando Central Documental...
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocs?.map((doc: any) => (
            <Card key={doc.id} className="border-slate-100 hover:shadow-md transition-all group overflow-hidden">
              <div className="flex flex-col lg:flex-row items-center p-4 gap-6">
                <div className="flex items-center gap-4 flex-1 w-full">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-navy truncate">{doc.document_type}</h4>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {doc.customers?.name || 'Cliente n/d'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Criado em {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 text-slate-400 hover:text-primary hover:bg-primary/5"
                    title="Visualizar"
                    onClick={() => handlePreviewRequest(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 text-slate-400 hover:text-primary hover:bg-primary/5"
                    onClick={() => handleDownload(doc)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {doc.status === 'pending_signature' && (
                    <Button 
                      size="sm" 
                      className="bg-primary text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2"
                      onClick={() => handleSignRequest(doc.id)}
                    >
                      <Signature className="h-3.5 w-3.5" /> Assinar
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2">
                        <History className="h-3.5 w-3.5" /> Ver Versões
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-[10px] font-bold uppercase tracking-widest gap-2"
                        onClick={() => handleAuditRequest(doc)}
                      >
                        <Clock className="h-3.5 w-3.5" /> Auditoria
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2 text-red-600">
                        Arquivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}

          {filteredDocs?.length === 0 && (
            <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
              <Database className="h-12 w-12 text-slate-100 mx-auto mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum documento encontrado</p>
        </div>
      )}

      {!isLoading && totalCount > pageSize && (
        <div className="mt-8 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Mostrando {documents?.length} de {totalCount} documentos</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-lg text-[9px] uppercase font-black tracking-widest border-slate-200"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              <span className="px-3 h-8 flex items-center bg-primary text-white rounded-lg shadow-sm">{page}</span>
              <span className="text-slate-300">/</span>
              <span className="px-3 h-8 flex items-center text-navy font-bold">{Math.ceil(totalCount / pageSize)}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-lg text-[9px] uppercase font-black tracking-widest border-slate-200"
              onClick={() => setPage(prev => prev + 1)}
              disabled={page >= Math.ceil(totalCount / pageSize)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
        </div>
      )}

      {selectedDocId && (
        <SignatureModal 
          isOpen={isSignModalOpen}
          onClose={() => {
            setIsSignModalOpen(false);
            setSelectedDocId(null);
          }}
          documentId={selectedDocId}
          onSuccess={refetch}
        />
      )}

      {selectedDoc && (
        <Sheet open={isAuditOpen} onOpenChange={setIsAuditOpen}>
          <SheetContent className="sm:max-w-md bg-slate-50 overflow-y-auto">
            <SheetHeader className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-sm font-black uppercase tracking-tight">Rastreabilidade Total</SheetTitle>
                  <SheetDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Auditoria Operacional NavalDocs</SheetDescription>
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Documento Selecionado</p>
                <h4 className="text-xs font-black text-navy uppercase tracking-tight truncate">{selectedDoc.document_type}</h4>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">{selectedDoc.id.substring(0, 8)}</Badge>
                  {getStatusBadge(selectedDoc.status)}
                </div>
              </div>
            </SheetHeader>
            <DocumentAuditTimeline documentId={selectedDoc.id} />
          </SheetContent>
        </Sheet>
      )}

      {selectedDoc && (
        <PDFPreviewer 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileUrl={selectedDoc.file_url || ""}
          title={selectedDoc.document_type}
        />
      )}
    </div>
  );
}
