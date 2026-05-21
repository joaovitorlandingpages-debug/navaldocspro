import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Save, Plus, Trash2, Settings2, FileCode } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/automation")({
  component: () => <Navigate to="/admin/ocr" />,
});

function AdminAutomationPage() {
  const [processTypes, setProcessTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProcessTypes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('process_types')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error("Erro ao carregar tipos de processo");
    } else {
      setProcessTypes(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProcessTypes();
  }, []);

  const handleUpdateRules = async (id: string, rules: any) => {
    const { error } = await supabase
      .from('process_types')
      .update({ automation_rules: rules })
      .eq('id', id);
    
    if (error) {
      toast.error("Erro ao salvar regras");
    } else {
      toast.success("Regras atualizadas com sucesso");
      fetchProcessTypes();
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" /> Configuração de Automação
          </h1>
          <p className="text-slate-500 font-medium">Gerencie as regras inteligentes do motor de automação documental.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {processTypes.map((type) => (
          <Card key={type.id} className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-navy uppercase tracking-tight text-lg">{type.name}</CardTitle>
                  <CardDescription>{type.description || "Sem descrição definida."}</CardDescription>
                </div>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-400">
                  {type.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Regras Ativas
                  </h4>
                  <Button variant="ghost" size="sm" className="text-primary font-bold h-8">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Regra
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-50">
                         <TableRow>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regra</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Condição</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {(type.automation_rules && type.automation_rules.length > 0) ? type.automation_rules.map((rule: any, idx: number) => (
                            <TableRow key={idx}>
                               <TableCell className="text-sm font-bold text-navy">{rule.name}</TableCell>
                               <TableCell>
                                  <code className="text-[10px] bg-slate-100 p-1 rounded font-mono">{rule.condition}</code>
                               </TableCell>
                               <TableCell className="text-xs font-medium text-slate-500">{rule.action}</TableCell>
                               <TableCell>
                                  <Button variant="ghost" size="sm" className="text-red-500">
                                     <Trash2 className="h-4 w-4" />
                                  </Button>
                               </TableCell>
                            </TableRow>
                         )) : (
                            <TableRow>
                               <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground italic">
                                  Nenhuma regra configurada. O motor usará as validações padrão.
                               </TableCell>
                            </TableRow>
                         )}
                      </TableBody>
                   </Table>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold"
                    onClick={() => handleUpdateRules(type.id, type.automation_rules || [])}
                  >
                    <Save className="h-4 w-4" /> Salvar Configurações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
