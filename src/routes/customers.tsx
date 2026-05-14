import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, Search, Plus, MoreHorizontal, Mail, 
  MapPin, Filter, X, Loader2, FileText, 
  Download, Trash2, Eye, Zap, Image as ImageIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/FileUploader";
import { useFiles } from "@/hooks/useFiles";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/customers")({
  component: Customers,
});

function Customers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { setIsNewProcessOpen } = useNewProcess();
  const { files, deleteFile } = useFiles(selectedCustomer ? { customerId: selectedCustomer.id } : undefined);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    cpf_cnpj: "",
    email: "",
    phone: "",
    address: "",
    type: "Individual",
    notes: ""
  });

  const handleOpenDetails = (customer: any) => {
    setSelectedCustomer(customer);
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
        const { data: customerData } = await supabase
          .from('customers')
          .select('*, vessels(count)')
          .eq('company_id', profile.company_id);
        
        if (customerData) setCustomers(customerData);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          company_id: companyId,
          name: formData.name,
          cpf_cnpj: formData.cpf_cnpj,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes
        })
        .select()
        .single();

      if (error) throw error;

      setCustomers([...customers, { ...data, vessels: [{ count: 0 }] }]);
      setIsModalOpen(false);
      setFormData({ name: "", cpf_cnpj: "", email: "", phone: "", address: "", type: "Individual", notes: "" });
      toast.success("Cliente cadastrado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Clientes</h1>
          <p className="text-muted-foreground font-medium">Gerencie sua base de clientes e contatos.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsNewProcessOpen(true)}
            className="flex-grow sm:flex-initial bg-navy text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Processo
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
               <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
               <input placeholder="Filtrar clientes..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest bg-white hover:bg-slate-50 transition-all">
               <Filter className="h-4 w-4" /> Filtros Avançados
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                     <th className="px-6 py-4">CLIENTE / DOC</th>
                     <th className="px-6 py-4">TIPO</th>
                     <th className="px-6 py-4">CONTATO</th>
                     <th className="px-6 py-4">EMBARCAÇÕES</th>
                     <th className="px-6 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando clientes...</p>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum cliente encontrado</p>
                      </td>
                    </tr>
                  ) : customers.map((c, i) => (
                    <tr 
                      key={i} 
                      onClick={() => handleOpenDetails(c)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                       <td className="px-6 py-4">
                          <div className="font-bold text-navy group-hover:text-primary transition-colors">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{c.cpf_cnpj}</div>
                       </td>
                       <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.cpf_cnpj?.length > 14 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                             {c.cpf_cnpj?.length > 14 ? 'Empresa' : 'Individual'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5 mb-1 font-bold">
                             <Mail className="h-3.5 w-3.5" /> {c.email}
                          </div>
                          <div className="text-[11px] flex items-center gap-1.5 opacity-70 font-medium truncate max-w-[200px]">
                             <MapPin className="h-3 w-3" /> {c.address}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min((c.vessels?.[0]?.count || 0) * 10, 100)}%` }} />
                             </div>
                             <span className="text-xs font-black text-navy">{c.vessels?.[0]?.count || 0}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-300 transition-colors">
                             <MoreHorizontal className="h-5 w-5" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-6 border-t flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Mostrando {customers.length} clientes</span>
            <div className="flex gap-2">
               <button className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all" disabled>Anterior</button>
               <button className="px-4 py-1.5 border rounded-lg bg-primary text-white shadow-sm transition-all">1</button>
               <button className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all" disabled>Próximo</button>
            </div>
         </div>
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-navy uppercase tracking-tight">Cadastrar Novo Cliente</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">Preencha os dados básicos para iniciar.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-300" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome / Razão Social</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                      placeholder="Ex: João Silva ou Empresa LTDA" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF / CNPJ</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                      placeholder="000.000.000-00" 
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</label>
                    <input 
                      type="email"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                      placeholder="contato@cliente.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                      placeholder="(00) 00000-0000" 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço Completo</label>
                    <input 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all" 
                      placeholder="Rua, Número, Bairro, Cidade - UF" 
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
      {/* Modal Detalhes do Cliente */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-none rounded-[2.5rem] shadow-2xl">
          <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
            <div className="flex gap-6">
              <div className="h-16 w-16 bg-navy text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl">
                {selectedCustomer?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-navy uppercase tracking-tight">{selectedCustomer?.name}</h3>
                <div className="flex gap-4 mt-1 text-slate-500 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {selectedCustomer?.email}</span>
                  <span className="flex items-center gap-1.5 font-mono tracking-tighter">{selectedCustomer?.cpf_cnpj}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="h-6 w-6 text-slate-300" />
            </button>
          </div>

          <div className="px-8 py-6 h-[600px] overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-xl mb-8">
                <TabsTrigger value="overview" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Documentos</TabsTrigger>
                <TabsTrigger value="vessels" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Embarcações</TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg font-bold text-xs uppercase tracking-widest px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Informações de Contato</h4>
                       <div className="space-y-3">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Endereço</p>
                             <p className="text-sm font-bold text-navy">{selectedCustomer?.address || "Não informado"}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Telefone</p>
                             <p className="text-sm font-bold text-navy">{selectedCustomer?.phone || "Não informado"}</p>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observações</h4>
                       <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl min-h-[120px]">
                          <p className="text-sm text-amber-900 font-medium leading-relaxed">{selectedCustomer?.notes || "Sem observações adicionais."}</p>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-8">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Documentação do Cliente</h4>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">{files?.length || 0} Arquivos</Badge>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                          <h5 className="text-xs font-black text-navy uppercase mb-4">Enviar Novo Arquivo</h5>
                          <FileUploader 
                            bucket="customer-documents" 
                            category="client_id" 
                            customerId={selectedCustomer?.id}
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
                            <FileText className="h-12 w-12 text-slate-100 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum documento</p>
                         </div>
                       )}
                    </div>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observações Internas</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none font-medium text-sm transition-all" 
                    placeholder="Notas adicionais sobre este cliente..." 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-10 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-xl shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
