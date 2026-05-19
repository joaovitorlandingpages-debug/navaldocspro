import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, CheckCircle2, Clock, 
  FileWarning, ShieldCheck, Zap, 
  TrendingUp, Calendar, ArrowRight,
  ChevronRight, Search, Filter, Ship
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DocumentDashboard() {
  const { profile } = useAuth();

  const { data: documents } = useQuery({
    queryKey: ["dashboard-documents", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          vessels(name),
          customers(name)
        `)
        .eq("company_id", profile?.company_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const expiringSoon = documents?.filter(doc => {
    if (!doc.expiry_date) return false;
    const expiryDate = new Date(doc.expiry_date);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isAfter(expiryDate, new Date()) && isBefore(expiryDate, thirtyDaysFromNow);
  }) || [];

  const expired = documents?.filter(doc => {
    if (!doc.expiry_date) return false;
    return isBefore(new Date(doc.expiry_date), new Date());
  }) || [];

  const criticalCertificates = documents?.filter(doc => 
    ['CSN', 'Borda Livre', 'DPEM'].includes(doc.document_type) && 
    (doc.status === 'expired' || isBefore(new Date(doc.expiry_date || ''), addDays(new Date(), 15)))
  ) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-red-50 border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <FileWarning className="h-32 w-32 text-red-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Documentos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-red-900">{expired.length}</h3>
                <p className="text-[10px] font-bold text-red-700 uppercase mt-1">Ação imediata necessária</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100 gap-1 font-bold text-[10px] uppercase">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Clock className="h-32 w-32 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-800 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Vencendo em 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-amber-900">{expiringSoon.length}</h3>
                <p className="text-[10px] font-bold text-amber-700 uppercase mt-1">Planejar renovações</p>
              </div>
              <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-100 gap-1 font-bold text-[10px] uppercase">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <ShieldCheck className="h-32 w-32 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Certificados Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-blue-900">{criticalCertificates.length}</h3>
                <p className="text-[10px] font-bold text-blue-700 uppercase mt-1">Segurança e Conformidade</p>
              </div>
              <Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100 gap-1 font-bold text-[10px] uppercase">
                Monitorar <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-navy">Documentos por Expirar</CardTitle>
            <CardDescription className="text-xs">Lista prioritária para renovação documental.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiringSoon.length > 0 ? expiringSoon.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <FileWarning className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-navy group-hover:text-amber-800">{doc.document_type}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter border-amber-200 text-amber-600">
                          {doc.vessels?.name || 'Embarcação n/d'}
                        </Badge>
                        <span className="text-[10px] font-medium text-slate-400">
                          Vence em {format(new Date(doc.expiry_date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase tracking-widest h-8">
                    Renovar
                  </Button>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-400">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhum documento expirando em breve</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-navy">Saúde Documental</CardTitle>
            <CardDescription className="text-xs">Métrica geral de conformidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative h-40 w-40 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle className="text-slate-100 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                  <circle 
                    className="text-primary stroke-current" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    fill="transparent" 
                    r="40" cx="50" cy="50" 
                    strokeDasharray={`${85 * 2.51}, 251`} 
                    transform="rotate(-90 50 50)" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-navy">85%</span>
                  <span className="text-[9px] font-black uppercase text-slate-400">Conformidade</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Documentos Totais</span>
                <span className="text-navy">{documents?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Validados por OCR</span>
                <span className="text-green-600">92%</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Assinados Digitalmente</span>
                <span className="text-blue-600">64%</span>
              </div>
            </div>

            <Button className="w-full bg-navy hover:bg-navy/90 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl">
              Gerar Relatório Completo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
