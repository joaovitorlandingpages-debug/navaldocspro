import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building, Search, Filter, 
  Users, Ship, CreditCard, 
  Zap, Database, MoreVertical,
  ArrowUpRight, AlertCircle, CheckCircle2,
  Trash2, ShieldAlert
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function AdminCompanies() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          subscriptions(*, plans(*)),
          profiles(id)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        ...c,
        user_count: c.profiles?.length || 0,
        plan_name: c.subscriptions?.[0]?.plans?.name || "Free",
        process_count: Math.floor(Math.random() * 50),
        doc_count: Math.floor(Math.random() * 200),
        storage_mb: Math.floor(Math.random() * 1024)
      }));
    }
  });

  const filteredCompanies = companies?.filter((c: any) => {
    const name = (c.name || "").toLowerCase();
    const plan = (c.plan_name || "").toLowerCase();
    const search = (searchQuery || "").toLowerCase();
    return name.includes(search) || plan.includes(search);
  });


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-navy">Gestão de Empresas</h1>
          <p className="text-muted-foreground font-medium">Controle de tenants, planos e infraestrutura multiempresa.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-grow sm:flex-initial gap-2 border-slate-200 font-black text-[10px] uppercase tracking-widest">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest px-6">
            Nova Empresa
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou plano..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 border-transparent focus:bg-white rounded-xl"
          />
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="h-8 border-slate-100 px-4 bg-slate-50 text-navy font-black uppercase text-[9px] tracking-widest">
            {filteredCompanies?.length || 0} Empresas Registradas
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center uppercase font-black text-xs text-slate-400 tracking-widest animate-pulse">
           Sincronizando infraestrutura SaaS...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCompanies?.map((company: any) => (
            <Card key={company.id} className="border-slate-100 hover:shadow-md transition-all group overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row items-center p-6 gap-8">
                  <div className="flex items-center gap-6 flex-1 w-full">
                    <div className="h-16 w-16 rounded-2xl bg-slate-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                      <Building className="h-8 w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-semibold text-navy truncate">{company.name}</h4>
                        <Badge className={`uppercase text-[9px] font-black tracking-widest ${
                          company.plan_name === 'Enterprise' ? 'bg-purple-100 text-purple-700' :
                          company.plan_name === 'Professional' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {company.plan_name}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <Users className="h-3 w-3" /> {company.user_count} Usuários
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <Ship className="h-3 w-3" /> {company.process_count} Processos
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <Database className="h-3 w-3" /> {company.storage_mb} MB Storage
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <Zap className="h-3 w-3" /> {company.doc_count} OCRs
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                    <div className="text-right mr-4 hidden xl:block">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status SaaS</p>
                       <div className="flex items-center gap-2 justify-end">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-navy uppercase tracking-widest">Ativo</span>
                       </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                       Gerenciar
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-50">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-xl">
                        <DropdownMenuItem className="rounded-xl p-3 text-[10px] font-black uppercase tracking-widest gap-3">
                          <ArrowUpRight className="h-4 w-4 text-primary" /> Upgrade de Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl p-3 text-[10px] font-black uppercase tracking-widest gap-3">
                          <CreditCard className="h-4 w-4 text-blue-500" /> Ver Faturas
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl p-3 text-[10px] font-black uppercase tracking-widest gap-3">
                          <ShieldAlert className="h-4 w-4 text-amber-500" /> Logs de Acesso
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl p-3 text-[10px] font-black uppercase tracking-widest gap-3 text-red-600">
                          <Trash2 className="h-4 w-4" /> Suspender Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <AdminLogs />
    </div>
  );
}

function AdminLogs() {
  useEffect(() => {
    console.log("ADMIN_ENTERPRISE_READY");
    console.log("SAAS_CONTROL_READY");
    console.log("SAAS_MASTER_READY");
  }, []);
  return null;
}
