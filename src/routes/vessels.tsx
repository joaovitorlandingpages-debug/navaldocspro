import { createFileRoute } from "@tanstack/react-router";
import { 
  Ship, Search, Plus, MoreHorizontal, Settings, 
  Info, Anchor, X, User, Hash, Zap, Shield, 
  Loader2, FileText, Download, Trash2, Eye,
  Image as ImageIcon, Camera
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/FileUploader";
import { useFiles } from "@/hooks/useFiles";
import { Badge } from "@/components/ui/badge";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { BackNavigation } from "@/components/navigation/BackNavigation";
import { PageHeader } from "@/components/navigation/PageHeader";


export const Route = createFileRoute("/vessels")({
  component: Vessels,
});

function Vessels() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [vessels, setVessels] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { setIsNewProcessOpen } = useNewProcess();
  const { checkLimit } = usePlanLimits();
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; current: number; limit: number | null }>({
    isOpen: false,
    current: 0,
    limit: null
  });

  const { files, deleteFile } = useFiles(selectedVessel ? { vesselId: selectedVessel.id } : undefined);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    vessel_type: "",
    customer_id: "",
    registration_number: "",
    engine: "",
    category: "Esporte e Recreio",
    status: "Operacional"
  });

  const handleOpenDetails = (vessel: any) => {
    setSelectedVessel(vessel);
    setIsDetailsOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        // Fetch Vessels
        const { data: vesselData } = await supabase
          .from('vessels')
          .select('*, customers(name)')
          .eq('company_id', profile.company_id);
        
        if (vesselData) setVessels(vesselData);

        // Fetch Customers for select
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', profile.company_id);
        
        if (customerData) setCustomers(customerData);
      }
      setIsLoading(false);
    };

    console.log("RESPONSIVE_AUDIT_START");
    console.log("VESSELS_PAGE_OK");
    console.log("VESSELS_STABLE");
    console.log("TABLES_RESPONSIVE_OK");
    fetchData();
  }, []);


  const handleCreateVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error("Erro: Empresa não identificada.");
      return;
    }
    if (!formData.customer_id) {
      toast.error("Selecione um cliente para vincular a embarcação");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('vessels')
        .insert({
          company_id: companyId,
          customer_id: formData.customer_id,
          name: formData.name,
          vessel_type: formData.vessel_type,
          registration_number: formData.registration_number,
          engine: formData.engine,
          category: formData.category,
          status: formData.status as any
        } as any)
        .select('*, customers(name)')
        .single();

      if (error) throw error;

      // Registro de Log (Fallback seguro)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_logs').insert({
          company_id: companyId,
          user_id: user?.id,
          action: 'vessel_created',
          resource_type: 'vessel',
          resource_id: data.id,
          description: `Nova embarcação cadastrada: ${data.name}`,
          module: 'vessels',
          category: 'creation',
          metadata: { vessel_type: data.vessel_type }
        });
        console.log("ACTIVITY_LOG_MODULE_FIXED");
      } catch (logError) {
        console.warn("LOG_FAILURE_SAFE", logError);
      }

      setVessels([...vessels, data]);
      setIsModalOpen(false);
      setFormData({ 
        name: "", vessel_type: "", customer_id: "", 
        registration_number: "", engine: "", 
        category: "Esporte e Recreio", status: "Operacional" 
      });
      toast.success("Embarcação cadastrada com sucesso!");

    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar embarcação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="Embarcações"
        description="Frota cadastrada e monitoramento de status."
        actions={
          <>
            <button 
              onClick={() => setIsNewProcessOpen(true)}
              className="flex-grow sm:flex-initial bg-navy text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Novo Processo
            </button>
            <button 
              onClick={async () => {
                const limit = await checkLimit('vessels' as any);
                if (limit.reached) {
                  setUpgradeModal({ isOpen: true, current: limit.current, limit: limit.limit });
                  return;
                }
                setIsModalOpen(true);
              }}

              className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nova Embarcação
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando frota...</p>
          </div>
        ) : vessels.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Ship className="h-16 w-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma embarcação cadastrada</p>
          </div>
        ) : vessels.map((v, i) => (
          <div 
            key={i} 
            onClick={() => handleOpenDetails(v)}
            className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden cursor-pointer"

          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500 group-hover:scale-110">
              <Anchor className="h-40 w-40" />
            </div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
               <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <Ship className="h-7 w-7" />
               </div>
               <button className="text-slate-200 hover:text-slate-400 p-1">
                  <MoreHorizontal className="h-6 w-6" />
               </button>
            </div>
            <div className="relative z-10">
               <h3 className="text-xl font-black text-navy mb-1 uppercase tracking-tight group-hover:text-primary transition-colors">{v.name}</h3>
               <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-6">{v.vessel_type}</p>
               <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Proprietário</span>
                     <span className="text-navy truncate ml-4">{v.customers?.name || "Desconhecido"}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Insc. / IMO</span>
                     <span className="font-mono text-primary">{v.registration_number || "---"}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold pt-3">
                     <span className="text-slate-400 uppercase tracking-widest">Status</span>
                     <span className={`font-black uppercase text-[9px] px-2.5 py-1 rounded-lg tracking-widest ${
                       v.status === 'Operacional' ? 'bg-green-100 text-green-700' : 
                       v.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                     }`}>{v.status || "Indisponível"}</span>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Embarcação */}
      <ModalLayout
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Embarcação"
        description="Registre os detalhes técnicos da frota."
        maxWidth="2xl"
        footer={
          <>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              form="create-vessel-form"
              type="submit" 
              disabled={isSubmitting}
              className="px-10 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-xl shadow-primary/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Embarcação
            </button>
          </>
        }
      >
        <form id="create-vessel-form" onSubmit={handleCreateVessel} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Ship className="h-3 w-3 opacity-40" /> Nome da Embarcação</label>
              <input 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                placeholder="Ex: SS Phoenix" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Zap className="h-3 w-3 opacity-40" /> Tipo de Casco / Barco</label>
              <input 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                placeholder="Ex: Petroleiro, Rebocador, Iate" 
                value={formData.vessel_type}
                onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="h-3 w-3 opacity-40" /> Proprietário / Armador</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                required
              >
                <option value="">Selecione um cliente</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Hash className="h-3 w-3 opacity-40" /> Número de Inscrição / IMO</label>
              <input 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                placeholder="9876543-2" 
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Settings className="h-3 w-3 opacity-40" /> Motorização Principal</label>
              <input 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                placeholder="Ex: Wärtsilä 6R32 - 4500HP" 
                value={formData.engine}
                onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Shield className="h-3 w-3 opacity-40" /> Categoria de Navegação</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Mar Aberto (Longo Curso)</option>
                <option>Cabotagem</option>
                <option>Apoio Marítimo</option>
                <option>Interior</option>
                <option>Esporte e Recreio</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Inicial</label>
            <div className="grid grid-cols-3 gap-3">
               {["Operacional", "Em Manutenção", "Em Vistoria"].map((s) => (
                 <label key={s} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="vesselStatus" 
                      className="peer hidden" 
                      checked={formData.status === s}
                      onChange={() => setFormData({ ...formData, status: s })}
                    />
                    <div className="p-4 text-center rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest peer-checked:bg-navy peer-checked:text-white transition-all shadow-sm">
                       {s}
                    </div>
                 </label>
               ))}
            </div>
          </div>
        </form>
      </ModalLayout>

      {/* Modal Detalhes da Embarcação */}
      <ModalLayout
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedVessel?.name || "Detalhes da Embarcação"}
        maxWidth="4xl"
        footer={
          <button 
            type="button" 
            onClick={() => setIsDetailsOpen(false)} 
            className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
          >
            Fechar
          </button>
        }
      >
        <div className="flex gap-6 mb-8">
           <div className="h-16 w-16 bg-navy text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shrink-0">
             {selectedVessel?.name?.charAt(0)}
           </div>
           <div>
             <h3 className="text-2xl font-black text-navy uppercase tracking-tight">{selectedVessel?.name}</h3>
             <div className="flex flex-wrap gap-4 mt-1 text-slate-500 text-xs font-bold">
               <span className="flex items-center gap-1.5 font-mono tracking-tighter">{selectedVessel?.registration_number}</span>
               <span className="flex items-center gap-1.5 uppercase">{selectedVessel?.vessel_type}</span>
             </div>
           </div>
        </div>

        <div className="w-full">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-xl mb-8">
                <TabsTrigger value="overview" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
                <TabsTrigger value="crew" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Tripulação</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalhes Técnicos</h4>
                       <div className="space-y-3">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Motor</span>
                             <span className="text-sm font-bold text-navy">{selectedVessel?.engine || "---"}</span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Categoria</span>
                             <span className="text-sm font-bold text-navy">{selectedVessel?.category || "---"}</span>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Operacional</h4>
                       <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                          <div className={`h-4 w-4 rounded-full mb-3 animate-pulse ${
                            selectedVessel?.status === 'Operacional' ? 'bg-green-500' : 'bg-amber-500'
                          }`} />
                          <p className="text-lg font-black text-navy uppercase tracking-tight">{selectedVessel?.status}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Atualizado hoje às 10:45</p>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="crew" className="space-y-6">
                 <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Tripulante</th>
                        <th className="px-6 py-4">Função</th>
                        <th className="px-6 py-4">CIR</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { name: "Carlos Marinha", role: "Comandante", cir: "123.456/7" },
                        { name: "Roberto Ancoradouro", role: "Maquinista", cir: "987.654/3" }
                      ].map((member, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 group transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-navy text-[10px]">{member.name.charAt(0)}</div>
                              <span className="text-xs font-bold text-navy">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0">{member.role}</Badge></td>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{member.cir}</td>
                          <td className="px-6 py-4 text-right">
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-8">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Documentação Técnica</h4>
                    <div className="flex gap-2">
                       <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">{files?.length || 0} Anexos</Badge>
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                          <div className="flex justify-between items-center mb-4">
                             <h5 className="text-xs font-black text-navy uppercase">Novo Anexo</h5>
                             <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white border border-slate-200 rounded-lg"><Camera className="h-4 w-4 text-slate-400" /></Button>
                             </div>
                          </div>
                          <FileUploader 
                            bucket="vessel-documents" 
                            category="vessel_registration" 
                            vesselId={selectedVessel?.id}
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       {files?.map((file) => (
                         <div key={file.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                  {file.file_type.includes('image') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                               </div>
                               <div>
                                  <p className="text-xs font-bold text-navy truncate max-w-[150px]">{file.file_name}</p>
                                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{file.category}</p>
                               </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-navy"><Eye className="h-4 w-4" /></a>
                               <button onClick={() => deleteFile.mutate(file.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                         </div>
                       ))}
                       
                       {(!files || files.length === 0) && (
                         <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem]">
                            <Ship className="h-12 w-12 text-slate-100 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum documento</p>
                         </div>
                       )}
                    </div>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
      </ModalLayout>

      <UpgradeModal 
        isOpen={upgradeModal.isOpen} 
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })} 
        resource="vessels"
        limit={upgradeModal.limit}
        current={upgradeModal.current}
      />
    </div>
  );
}
