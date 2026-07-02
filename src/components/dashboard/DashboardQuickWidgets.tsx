import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, ChevronRight, Zap, CheckCircle2, Search, Star, History, Filter } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardQuickWidgets({ recentDocs, loading }: { recentDocs?: any[], loading?: boolean }) {
  const [search, setSearch] = useState("");
  
  const displayDocs = recentDocs && recentDocs.length > 0 ? recentDocs : [
    { id: '1', file_name: 'BCE_REBOQUE_PHOENIX.pdf', status: 'validado', compliance_status: 'conforme', created_at: new Date().toISOString(), category: 'Registro' },
    { id: '2', file_name: 'CNH_ENG_DOUGLAS.jpg', status: 'pendente', compliance_status: 'pendente', created_at: new Date().toISOString(), category: 'Identidade' },
    { id: '3', file_name: 'MEMORIAL_TECNICO_OPS_01.pdf', status: 'validado', compliance_status: 'conforme', created_at: new Date().toISOString(), category: 'Técnico' },
    { id: '4', file_name: 'DPC_2211_SOLICITACAO.pdf', status: 'validado', compliance_status: 'conforme', created_at: new Date().toISOString(), category: 'Protocolo' },
  ];

  const filteredDocs = displayDocs.filter(doc => {
    const fileName = (doc.file_name || "").toLowerCase();
    const searchTerm = (search || "").toLowerCase();
    return fileName.includes(searchTerm);
  });


  const isMock = !recentDocs || recentDocs.length === 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b bg-slate-50/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-semibold tracking-[0.15em] text-navy flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Ativos Inteligentes
            </h3>
            <div className="flex gap-1">
               <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <Star className="h-3.5 w-3.5" />
               </button>
               <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <History className="h-3.5 w-3.5" />
               </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Buscar em documentos..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-[11px] bg-white border-slate-200 rounded-xl focus-visible:ring-primary/20"
            />
          </div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            ))
          ) : (
            filteredDocs.map((doc, i) => (
              <div key={doc.id} className={`p-4 hover:bg-slate-50/80 transition-all flex items-center justify-between group cursor-pointer ${isMock ? 'opacity-80' : ''}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    doc.compliance_status === 'conforme' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-navy truncate">{doc.file_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {isMock && <span className="text-primary/60 mr-1">EXEMPLO •</span>}
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`text-[8px] uppercase font-black px-1.5 h-4 border-none ${
                    doc.compliance_status === 'conforme' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {doc.status}
                  </Badge>
                  {doc.category && <span className="text-[7px] font-black text-slate-300 uppercase">{doc.category}</span>}
                </div>
              </div>
            ))
          )}
          {!loading && filteredDocs.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhum documento encontrado</p>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50/30 border-t border-slate-50">
           <Link to="/documents" className="w-full flex items-center justify-center text-[9px] font-black uppercase text-slate-400 hover:text-primary transition-colors gap-2">
             Explorar Acervo <ChevronRight className="h-3 w-3" />
           </Link>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-navy to-slate-900 text-white rounded-3xl relative overflow-hidden shadow-xl border-none">
        <div className="absolute -right-6 -top-6 p-8 opacity-10">
          <Zap className="h-24 w-24 text-primary" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Ação Sugerida</p>
        <h4 className="text-sm font-bold leading-relaxed mb-6">Existem processos que podem ser acelerados via OCR para extração automática de dados.</h4>

        <Link to="/ocr-center">
          <button className="w-full bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            Abrir Central OCR <ChevronRight className="h-3 w-3" />
          </button>
        </Link>
      </Card>
    </div>
  );
}
