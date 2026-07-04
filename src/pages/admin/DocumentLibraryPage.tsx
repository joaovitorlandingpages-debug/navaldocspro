import { Link } from "@tanstack/react-router";
import { 
  Library, Search, FileText, 
  MoreVertical, Edit2, 
  Plus, Tag, CheckCircle2,
  AlertCircle, Archive, LayoutTemplate,
  BadgeHelp
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentLibraryPage() {
  useAuth();
  const { templates, isLoadingTemplates, categories } = useDocuments();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    console.log("DOCUMENT_LIBRARY_OK");
  }, []);

  const filteredTemplates = templates?.filter((t: any) => {
    const matchesCategory = selectedCategory === "Todos" || t.category === selectedCategory || t.category_details?.name === selectedCategory;
    const matchesSearch = (t.name || "").toLowerCase().includes((searchTerm || "").toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayCategories = ["Todos", ...(categories?.map((c: any) => c.name) || [
    "Registro e Propriedade",
    "Certificados",
    "Engenharia Naval",
    "Financeiro",
    "Processos Administrativos",
    "Tripulação",
    "Rádio/Anatel"
  ])];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <Library className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-semibold text-navy">Biblioteca Documental</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg">
            Gestão master de templates, formulários oficiais e repositório de engenharia.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Link to="/document-generator">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl h-12 px-6">
              <LayoutTemplate className="h-4 w-4" /> Gerador Pro
            </Button>
          </Link>
          <Button variant="outline" className="font-bold gap-2 rounded-xl h-12 px-6 border-slate-200">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10">
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  cat === selectedCategory 
                    ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' 
                    : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64 group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              placeholder="Buscar template..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600/20 outline-none transition-all" 
            />
          </div>
        </div>

        {isLoadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredTemplates?.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-slate-50 rounded-3xl bg-slate-50/30">
             <Archive className="h-16 w-16 text-slate-100 mx-auto mb-4" />
             <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Nenhum template encontrado</p>
             <Button variant="ghost" onClick={() => {setSelectedCategory("Todos"); setSearchTerm("");}} className="mt-4 text-blue-600 text-[10px] font-bold uppercase">Limpar Filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates?.map((template: any) => (
              <Card key={template.id} className="group border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden bg-slate-50/50">
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl bg-white shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex gap-1">
                       <Badge className="bg-white border-slate-100 text-slate-400 font-black text-[8px] uppercase tracking-tighter h-5">v{template.version || 1.0}</Badge>
                       <button className="p-1 hover:bg-white rounded-lg text-slate-300 transition-all opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div>
                    <h4 className="font-semibold text-navy text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-1" title={template.name}>
                      {template.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                      {template.category_details?.name || template.category || "Geral"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 h-12 overflow-hidden items-start">
                     <span className="bg-white border border-slate-100 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase text-slate-400 flex items-center gap-1">
                        <Tag className="h-2 w-2" /> {template.process_type || "Geral"}
                     </span>
                     {template.is_active ? (
                       <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 border border-emerald-100">
                          <CheckCircle2 className="h-2 w-2" /> Ativo
                       </span>
                     ) : (
                       <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 border border-slate-200">
                          <AlertCircle className="h-2 w-2" /> Inativo
                       </span>
                     )}
                  </div>
                  <div className="pt-6 border-t border-slate-100 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <Button variant="outline" className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase border-slate-200 hover:bg-white">
                      <Edit2 className="h-3 w-3 mr-2" /> Editar
                    </Button>
                    <Link to="/document-generator" className="flex-1">
                      <Button className="w-full h-9 rounded-xl text-[10px] font-black uppercase bg-navy text-white hover:bg-blue-600">
                        <LayoutTemplate className="h-3 w-3 mr-2" /> Gerar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="bg-navy rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-navy/40">
         <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
         <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-400 rounded-full opacity-10 blur-2xl"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
               <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                  <BadgeHelp className="h-8 w-8 text-blue-400" />
               </div>
               <div>
                  <h4 className="text-xl font-semibold">Dúvidas sobre o Field Mapping?</h4>
                  <p className="text-sm text-white/60 font-medium max-w-lg mt-1 italic">
                    Nossos templates utilizam sintaxe {"{{campo}}"} para preenchimento automático.
                    Consulte a documentação técnica para mapear variáveis do cliente, barco ou processo.
                  </p>
               </div>
            </div>
            <Button className="bg-white text-navy hover:bg-blue-50 font-black uppercase text-[10px] tracking-[0.2em] h-12 px-8 rounded-xl shrink-0">
               Guia de Integração
            </Button>
         </div>
      </div>
    </div>
  );
}
