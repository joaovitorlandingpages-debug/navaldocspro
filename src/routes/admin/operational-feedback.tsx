import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Filter,
  Search,
  ExternalLink,
  Clock,
  User,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OperationalFeedback() {
  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ["operational-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operational_feedback")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <AlertCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      bug: "bg-red-50 text-red-600 border-red-100",
      suggestion: "bg-amber-50 text-amber-600 border-amber-100",
      ux: "bg-blue-50 text-blue-600 border-blue-100",
      ocr_poor: "bg-purple-50 text-purple-600 border-purple-100",
    };
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${styles[type] || "bg-slate-50 text-slate-500"}`}>
        {type.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-navy">Feedback Operacional</h1>
          <p className="text-slate-500 font-medium">Monitoramento em tempo real de dificuldades e sugestões dos usuários.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar feedback..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : feedbacks?.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum feedback registrado ainda.</p>
          </div>
        ) : (
          feedbacks?.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {getTypeBadge(item.type)}
                  <div className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span className="text-xs text-slate-400 font-medium">
                    {format(new Date(item.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-navy transition-all">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <p className="text-navy font-medium mb-4">{item.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy">{item.profiles?.full_name || "Usuário"}</p>
                      <p className="text-[10px] text-slate-400">{item.profiles?.email}</p>
                    </div>
                  </div>

                  {item.context_url && (
                    <a 
                      href={item.context_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Contexto da Tela
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-black uppercase text-slate-500 border border-slate-100">
                  {getStatusIcon(item.status)}
                  {item.status}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
