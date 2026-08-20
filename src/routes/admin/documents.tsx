import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Search, Grid, List, Filter, Eye, Download, 
  Signature, ExternalLink, MoreVertical, LayoutGrid, ListFilter,
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
          *,
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
      return data;
    },
  });

  const filteredDocs = documents?.filter(doc => {
    const matchesSearch = 
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.processes?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesClient = clientFilter === "all" || doc.profiles?.id === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  const uniqueClients = Array.from(new Set(documents?.map(d => d.profiles).filter(Boolean).map(p => JSON.stringify(p)))).map(s => JSON.parse(s));

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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cofre de Documentos</h1>
            <p className="text-slate-500 mt-1">Gestão centralizada de arquivos, certificados e evidências.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <Button 
              variant={viewMode === "grid" ? "white" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "shadow-sm" : ""}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards
            </Button>
            <Button 
              variant={viewMode === "list" ? "white" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "shadow-sm" : ""}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm overflow-visible z-10">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Pesquisar por nome, cliente ou processo..." 
                className="pl-10 border-slate-200 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px] border-slate-200">
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Clientes</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] border-slate-200">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="generated">Gerado</SelectItem>
                  <SelectItem value="signed">Assinado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p>Carregando cofre...</p>
          </div>
        ) : filteredDocs?.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum documento encontrado.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs?.map((doc) => (
              <Card key={doc.id} className="group border-slate-200 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-md overflow-hidden bg-white">
                <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center relative border-b border-slate-100">
                  <FileText className="h-16 w-16 text-slate-300 group-hover:text-emerald-500/20 transition-colors" />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    {getStatusBadge(doc.status)}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 truncate" title={doc.document_name}>
                    {doc.document_name}
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span className="truncate">{doc.profiles?.full_name || "Sem cliente"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ship className="h-3 w-3" />
                      <span className="truncate">{doc.processes?.vessels?.name || "Sem embarcação"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <Link 
                      to={`/admin/process-center/${doc.process_id}`}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      Ver Processo
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Signature className="h-4 w-4" /> Assinatura
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <FileDown className="h-4 w-4" /> Exportar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[400px]">Documento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs?.map((doc) => (
                  <TableRow key={doc.id} className="group hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="truncate max-w-[300px]">{doc.document_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {doc.profiles?.full_name}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[200px] font-medium">{doc.processes?.title}</span>
                        <span className="text-[10px] text-slate-400">{doc.processes?.vessels?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600">
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Signature className="h-4 w-4" /> Solicitar Assinatura
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="gap-2">
                              <Link to={`/admin/process-center/${doc.process_id}`}>
                                <ExternalLink className="h-4 w-4" /> Ver Processo
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
