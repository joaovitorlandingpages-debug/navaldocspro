import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Zap, Database, Users, ClipboardList, FileText, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function ConsumptionPanel() {
  const { subscription, checkLimit } = usePlanLimits();

  const { data: consumption, isLoading } = useQuery({
    queryKey: ["plan-consumption"],
    queryFn: async () => {
      const resources = [
        { id: 'ocr', label: 'OCR Neural', icon: Zap, color: 'text-purple-500' },
        { id: 'files', label: 'Storage', icon: Database, color: 'text-cyan-500' },
        { id: 'users', label: 'Usuários', icon: Users, color: 'text-blue-500' },
        { id: 'processes', label: 'Processos', icon: ClipboardList, color: 'text-primary' },
        { id: 'documents', label: 'Documentos', icon: FileText, color: 'text-emerald-500' },
      ] as const;

      const results = await Promise.all(
        resources.map(async (res) => {
          const status = await checkLimit(res.id);
          return {
            ...res,
            current: status.current,
            limit: status.limit,
            percentage: status.limit ? Math.min(Math.round((status.current / status.limit) * 100), 100) : 0,
            reached: status.reached
          };
        })
      );
      return results;
    },
    enabled: !!subscription
  });

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
  </div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {consumption?.map((item) => (
        <Card key={item.id} className="border-slate-100 hover:shadow-lg transition-all rounded-2xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-slate-50 ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-lg font-black text-navy">{item.current} / {item.limit || '∞'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-slate-500">
                <span>Consumo</span>
                <span className={item.percentage > 90 ? 'text-red-500' : 'text-primary'}>{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className={`h-2 ${item.percentage > 90 ? 'bg-red-100' : 'bg-slate-100'}`} />
            </div>
            {item.reached && (
              <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-red-500 uppercase italic">
                <CheckCircle2 className="h-3 w-3" /> Limite atingido! Faça upgrade para continuar.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
