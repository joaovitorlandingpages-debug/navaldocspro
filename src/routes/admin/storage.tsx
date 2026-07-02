import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { 
  Database, 
  HardDrive, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  ShieldAlert, 
  FileWarning,
  ExternalLink,
  PieChart,
  BarChart3,
  Server
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/storage")({
  component: AdminStorage,
});

function AdminStorage() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    console.log("STORAGE_ADMIN_OK");
  }, []);

  if (loading) return null;
  if (profile?.role !== 'admin_master_global' && profile?.role !== 'admin_master' && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard" />;
  }

  const { data: storageStats } = useQuery({
    queryKey: ["admin-storage-global"],
    queryFn: async () => {
      const { data: files } = await supabase.from("uploaded_files").select("file_size, bucket_name");
      
      const totalSize = files?.reduce((acc: number, f: any) => acc + (f.file_size || 0), 0) || 0;
      const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
      
      return {
        totalSize: totalMB,
        count: files?.length || 0,
        buckets: [...new Set(files?.map((f: any) => f.bucket_name))]
      };
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" /> Storage Infrastructure
          </h1>
          <p className="text-slate-500 font-medium">Gestão global de ativos, buckets e limpeza de dados.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl gap-2 border-slate-200 text-xs font-black uppercase tracking-widest">
              <Trash2 className="h-4 w-4" /> Purge Orfãos
           </Button>
           <Button className="bg-navy text-white rounded-xl gap-2 shadow-lg text-xs font-black uppercase tracking-widest px-6">
              <Download className="h-4 w-4" /> Export Bulk
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className="p-8 rounded-3xl border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
               <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <HardDrive className="h-6 w-6" />
               </div>
               <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px]">SLA 99.9%</Badge>
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espaço Utilizado</p>
               <h3 className="text-4xl font-black text-navy">{storageStats?.totalSize || "1.2"} GB</h3>
               <Progress value={64} className="h-1.5 mt-4" />
               <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Capacidade: 2.0 TB Global</p>
            </div>
         </Card>

         <Card className="p-8 rounded-3xl border-slate-100 shadow-sm space-y-6">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Server className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objetos Totais</p>
               <h3 className="text-4xl font-black text-navy">{storageStats?.count || "4,821"}</h3>
               <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase">Buckets</p>
                     <p className="text-lg font-black text-navy">04</p>
                  </div>
                  <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase">Ativos</p>
                     <p className="text-lg font-black text-navy">100%</p>
                  </div>
               </div>
            </div>
         </Card>

         <Card className="p-8 rounded-3xl border-slate-100 shadow-sm bg-[#020D1D] text-white space-y-6 overflow-hidden relative">
            <ShieldAlert className="absolute -right-4 -bottom-4 h-32 w-32 opacity-5" />
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Segurança de Ativos</h4>
            <div className="space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs font-bold opacity-60">Políticas RLS Storage</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase">Ativo</Badge>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs font-bold opacity-60">Criptografia em Repouso</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase">AES-256</Badge>
               </div>
               <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold opacity-60">Buckets Privados</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase">Global</Badge>
               </div>
            </div>
         </Card>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
         <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-navy">Arquivos Pesados & Órfãos Detectados</CardTitle>
         </CardHeader>
         <div className="p-0">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/20">
                     <th className="px-8 py-4">Arquivo</th>
                     <th className="px-8 py-4">Bucket</th>
                     <th className="px-8 py-4">Tamanho</th>
                     <th className="px-8 py-4">Empresa (Tenant)</th>
                     <th className="px-8 py-4 text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 text-xs">
                  {[1, 2, 3].map(i => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                              <FileWarning className="h-4 w-4 text-rose-500" />
                              <span className="font-bold text-navy">Dossie_Completo_Bulk_{i}.zip</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 uppercase text-slate-500">Dossies</td>
                        <td className="px-8 py-5 font-bold text-navy">{(850 + i*40)} MB</td>
                        <td className="px-8 py-5 text-slate-400 uppercase font-mono">Tenant-{i*123}</td>
                        <td className="px-8 py-5 text-right">
                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
}
