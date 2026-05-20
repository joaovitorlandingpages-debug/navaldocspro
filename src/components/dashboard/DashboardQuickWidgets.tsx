import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function DashboardQuickWidgets({ recentDocs }: { recentDocs?: any[] }) {
  const displayDocs = recentDocs && recentDocs.length > 0 ? recentDocs : [
    { id: '1', file_name: 'BCE_REBOQUE_PHOENIX.pdf', status: 'validado', compliance_status: 'conforme', created_at: new Date().toISOString() },
    { id: '2', file_name: 'CNH_PROPRIETARIO_MARIO.jpg', status: 'pendente', compliance_status: 'pendente', created_at: new Date().toISOString() },
    { id: '3', file_name: 'PROCURACAO_V1.pdf', status: 'validado', compliance_status: 'conforme', created_at: new Date().toISOString() },
  ];

  const isMock = !recentDocs || recentDocs.length === 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-navy flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Últimos Documentos
          </h3>
          <Link to="/documents" className="text-[10px] font-black uppercase text-primary hover:underline">Ver Todos</Link>
        </div>
        
        <div className="divide-y divide-slate-50">
          {displayDocs.map((doc, i) => (
            <div key={doc.id} className={`p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group ${isMock ? 'opacity-40 grayscale' : ''}`}>
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
              <Badge variant="outline" className={`text-[8px] uppercase font-black px-1.5 h-4 border-none ${
                doc.compliance_status === 'conforme' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {doc.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-navy to-slate-900 text-white rounded-[2.5rem] relative overflow-hidden shadow-xl border-none">
        <div className="absolute -right-6 -top-6 p-8 opacity-10">
          <Zap className="h-24 w-24 text-primary" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Próximo Passo IA</p>
        <h4 className="text-sm font-bold leading-relaxed mb-6">Você tem 4 processos com documentos pendentes que podem ser resolvidos via OCR agora.</h4>
        <Link to="/ocr-center">
          <button className="w-full bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            Abrir Central OCR <ChevronRight className="h-3 w-3" />
          </button>
        </Link>
      </Card>
    </div>
  );
}
