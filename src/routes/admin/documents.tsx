import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Search, List, Filter, Eye, Download, 
  Signature, ExternalLink, MoreVertical, LayoutGrid,
  FileDown, ArrowRight, Loader2, Calendar, User, Ship
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentVault,
  head: () => ({
    meta: [
      { title: "Cofre de Documentos | NavalDocs Pro" },
      { name: "description", content: "Central definitiva para gestão e auditoria de arquivos do NavalDocs Pro." },
    ],
  }),
});

interface DocumentWithRelations {
  id: string;
  name: string;
  status: string;
  created_at: string;
  process_id: string | null;
  customer_id: string | null;
  processes: {
    id: string;
    title: string;
    vessels: {
      id: string;
      name: string;
    } | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
}

function DocumentVault() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["document-vault"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select(`
          id,
          name,
          status,
          created_at,
          process_id,
          customer_id,
          processes (
            id,
            title,
            vessels (
              id,
              name
            )
          ),
          profiles:customer_id (
            id,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown) as DocumentWithRelations[];
    },
  });

  const filteredDocs = documents?.filter((doc: DocumentWithRelations) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.processes?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesClient = clientFilter === "all" || doc.profiles?.id === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  const uniqueClients = documents 
    ? Array.from(new Set(documents.map(d => d.profiles?.id).filter(Boolean))).map(id => {
        return documents.find(d => d.profiles?.id === id)?.profiles;
      }).filter(Boolean)
    : [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      signed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      generated: "bg-blue-100 text-blue-700 border-blue-200",
      upload: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase italic tracking-tighter">Cofre de Documentos</h1>
            <p className="text-slate-500 mt-1 text-xs font-black uppercase tracking-widest">Gestão centralizada de arquivos, certificados e evidências.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <Button 
              variant={viewMode === "grid" ? "outline" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-white shadow-sm rounded-lg" : "rounded-lg"}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cards</span>
            </Button>
            <Button 
              variant={viewMode === "list" ? "outline" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-white shadow-sm rounded-lg" : "rounded-lg"}
            >
              <List className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Lista</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm overflow-visible z-10 rounded-2xl">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input 
                placeholder="Pesquisar por nome, cliente ou processo..." 
                className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[200px] h-12 border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos Clientes</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client?.id} value={client?.id || ""} className="text-[10px] font-black uppercase tracking-widest">{client?.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-12 border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos Status</SelectItem>
                  <SelectItem value="pending" className="text-[10px] font-black uppercase tracking-widest">Pendente</SelectItem>
                  <SelectItem value="generated" className="text-[10px] font-black uppercase tracking-widest">Gerado</SelectItem>
                  <SelectItem value="signed" className="text-[10px] font-black uppercase tracking-widest">Assinado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-[10px] font-black uppercase tracking-widest">Carregando cofre...</p>
          </div>
        ) : filteredDocs?.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <FileText className="h-12 w-12 mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum documento encontrado.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs?.map((doc: DocumentWithRelations) => (
              <Card key={doc.id} className="group border-slate-100 hover:border-emerald-500/30 hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden bg-white relative">
                <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center relative border-b border-slate-100 overflow-hidden">
                  <FileText className="h-16 w-16 text-slate-200 group-hover:text-emerald-500/10 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/5 transition-colors duration-500" />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex gap-1 z-20">
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm rounded-lg border-slate-200 hover:text-emerald-600 hover:border-emerald-200">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm rounded-lg border-slate-200 hover:text-emerald-600 hover:border-emerald-200">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3 z-20">
                    {getStatusBadge(doc.status)}
                  </div>
                </div>
                <CardContent className="p-5 space-y-4 relative z-10">
                  <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight group-hover:text-emerald-600 transition-colors" title={doc.name}>
                    {doc.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <User className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="truncate">{doc.profiles?.full_name || "Sem cliente"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Ship className="h-3.5 w-3.5 text-blue-500" />
                      <span className="truncate">{doc.processes?.vessels?.name || "Sem embarcação"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar className="h-3.5 w-3.5 text-slate-300" />
                      <span>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Link 
                      to="/admin/process-center/$id"
                      params={{ id: doc.process_id || "" }}
                      search={{ tab: 'workspace' }}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                    >
                      Ver Processo
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                        <DropdownMenuItem className="gap-2 text-[10px] font-black uppercase tracking-widest py-2">
                          <Signature className="h-3.5 w-3.5 text-emerald-500" /> Assinatura
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-[10px] font-black uppercase tracking-widest py-2">
                          <FileDown className="h-3.5 w-3.5 text-blue-500" /> Exportar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[450px] text-[10px] font-black uppercase tracking-widest text-slate-400 py-5">Documento</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processo / Embarcação</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs?.map((doc: DocumentWithRelations) => (
                  <TableRow key={doc.id} className="group hover:bg-emerald-50/20 transition-all border-b border-slate-50">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200 transition-all duration-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight truncate max-w-[320px]">{doc.name}</span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">ID: {doc.id.slice(0,8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate block max-w-[150px]">
                        {doc.profiles?.full_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[200px]">{doc.processes?.title}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <Ship className="h-3 w-3" /> {doc.processes?.vessels?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl">
                          <Eye className="h-4.5 w-4.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl">
                          <Download className="h-4.5 w-4.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-50 rounded-xl">
                              <MoreVertical className="h-4.5 w-4.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                            <DropdownMenuItem className="gap-2 text-[10px] font-black uppercase tracking-widest py-2.5">
                              <Signature className="h-4 w-4 text-emerald-500" /> Solicitar Assinatura
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="gap-2 text-[10px] font-black uppercase tracking-widest py-2.5">
                              <Link to="/admin/process-center/$id" params={{ id: doc.process_id || "" }} search={{ tab: 'workspace' }}>
                                <ExternalLink className="h-4 w-4 text-blue-500" /> Ver Processo
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
