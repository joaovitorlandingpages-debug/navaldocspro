import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Search, Filter, 
  Download, Eye, Clock, History,
  ShieldCheck, ArrowUpRight, CheckCircle2,
  AlertCircle, MoreVertical, Database,
  LayoutGrid, List, RotateCcw, Signature
} from "lucide-react";
import { useState } from "react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignatureModal } from "@/components/documents/SignatureModal";
import { documentService } from "@/services/documentService";
import { toast } from "sonner";

export default function DocumentCenter() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ["document-center", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          vessels(name),
          customers(name),
          profiles:created_by_profile_id(full_name)
        `)
        .eq("company_id", profile?.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const filteredDocs = documents?.filter((doc: any) => 
    doc.document_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.vessels?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
...
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documentos", value: documents?.length || 0, icon: FileText, color: "text-primary" },
          { label: "Aguardando Assinatura", value: documents?.filter((d: any) => d.status === 'pending_signature').length || 0, icon: Signature, color: "text-amber-500" },
          { label: "Vencendo em Breve", value: 4, icon: Clock, color: "text-red-500" },
...
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
                      <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2">
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
    </div>
  );
}
