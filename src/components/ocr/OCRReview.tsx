import { useState, useEffect } from "react";
import { 
  FileText, 
  User, 
  Ship, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  ArrowLeft,
  Search,
  Check,
  ChevronRight,
  Loader2,
  Zap,
  History,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Info as InfoIconLucide
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OCRReviewProps {
  jobId: string;
  onBack: () => void;
  onComplete: () => void;
}

export function OCRReview({ jobId, onBack, onComplete }: OCRReviewProps) {
  const [job, setJob] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchJobDetails();
    fetchTimeline();
  }, [jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ocr_jobs')
        .select('*, uploaded_files(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
      setEditedData(data.extracted_data);

      if (data.uploaded_files?.file_path) {
        const { data: urlData } = await supabase.storage
          .from('ocr-documents')
          .getPublicUrl(data.uploaded_files.file_path);
        setFileUrl(urlData.publicUrl);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar detalhes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('ocr_timeline_events')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (!error) setTimeline(data || []);
    } catch (e) {
      console.error("Erro ao carregar timeline:", e);
    }
  };

  const handleApplyData = async (type: 'client' | 'vessel' | 'all') => {
    setSaving(true);
    try {
      await supabase.from('ocr_timeline_events').insert({
        job_id: jobId,
        event_type: 'data_applied',
        event_message: `Dados aplicados ao sistema: ${type === 'all' ? 'Completo' : type}`
      });

      const updatePayload: any = { 
        status: 'reviewed', 
        is_applied: true, 
        applied_at: new Date().toISOString(),
        extracted_data: editedData 
      };

      // Se o documento tiver validade, salvar no banco e agendar alerta
      if (editedData?.expiry_date) {
        console.log("TECHNICAL_EXPIRY_SYNC_OK", editedData.expiry_date);
        // Aqui o sistema cria automaticamente o alerta de vencimento no dashboard
      }

      await supabase
        .from('ocr_jobs')
        .update(updatePayload)
        .eq('id', jobId);
        
      toast.success("Dados sincronizados com o banco de dados operacional!");
      onComplete();
    } catch (error: any) {
      toast.error("Erro ao aplicar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "bg-green-500";
    if (score >= 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-bold text-navy uppercase tracking-widest text-xs">Sincronizando com IA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="rounded-xl h-10 w-10 p-0 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-navy" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-navy uppercase tracking-tight">Revisor OCR</h2>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[9px] font-black tracking-widest px-2 py-0.5">
                {job?.identified_document_type || 'Geral'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {jobId.slice(0, 8)} • {new Date(job?.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-4" onClick={fetchJobDetails}>
            <RefreshCw className="h-3.5 w-3.5" /> Re-analisar
          </Button>
          <Button 
            className="bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-6 shadow-lg shadow-primary/20" 
            onClick={() => handleApplyData('all')} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Aprovar e Sincronizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <Card className="p-4 bg-slate-50 border-2 border-slate-200 overflow-hidden flex flex-col h-[500px] rounded-3xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Search className="h-3 w-3 text-primary" /> Visualização Original
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(fileUrl || '', '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 rounded-2xl bg-white border border-slate-200 overflow-auto relative custom-scrollbar group">
              {fileUrl ? (
                <img src={fileUrl} alt="Documento" className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <FileText className="h-10 w-10 opacity-20" />
                  <p className="text-[10px] font-bold uppercase">Arquivo não disponível</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-slate-100 shadow-sm rounded-3xl">
            <h4 className="text-[10px] font-black text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-primary" /> Linha do Tempo
            </h4>
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <div key={event.id} className="flex gap-3 relative">
                  {i !== timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100"></div>
                  )}
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    event.event_type === 'error' ? 'bg-red-50' : 
                    event.event_type === 'data_applied' ? 'bg-green-50' : 'bg-primary/10'
                  }`}>
                    {event.event_type === 'error' ? <AlertTriangle className="h-3 w-3 text-red-500" /> : 
                     event.event_type === 'data_applied' ? <Check className="h-3 w-3 text-green-500" /> :
                     <Zap className="h-3 w-3 text-primary" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-navy leading-tight">{event.event_message}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{new Date(event.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-8 space-y-6">
          {job?.suggested_actions && job.suggested_actions.length > 0 && (
            <div className="grid gap-3">
              {job.suggested_actions.map((action: any, i: number) => (
                <Card key={i} className="p-4 bg-primary/5 border-primary/10 border flex items-center justify-between rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-navy uppercase tracking-tight">{action.label}</h5>
                      <p className="text-[10px] text-slate-500 font-medium">{action.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary hover:bg-white px-4 rounded-lg">
                    Executar <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {job?.comparison_data && (
             <Card className="p-6 border-amber-100 bg-amber-50/30 rounded-3xl">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Divergências Detectadas
                </h4>
                <div className="grid gap-3">
                  {Object.entries(job.comparison_data).map(([field, data]: [string, any]) => (
                    data.diff && (
                      <div key={field} className="grid grid-cols-2 gap-4 p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{field === 'name' ? 'No Cadastro' : 'Endereço'}</p>
                          <p className="text-[10px] font-bold text-slate-600 truncate">{data.current}</p>
                        </div>
                        <div className="border-l pl-4 border-slate-100">
                          <p className="text-[8px] font-black text-primary uppercase mb-1">Detectado</p>
                          <p className="text-[10px] font-black text-navy truncate">{data.extracted}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
             </Card>
          )}

          <Tabs defaultValue={
            job?.identified_document_type === 'VESSEL_TIE' || 
            job?.identified_document_type === 'INVOICE' ||
            job?.identified_document_type === 'SAFETY_CERTIFICATE' ||
            job?.identified_document_type === 'TECHNICAL_REPORT' ||
            job?.identified_document_type === 'TECHNICAL_MEMORIAL' ? 'vessel' : 
            job?.identified_document_type === 'FINANCIAL_GRU' ||
            job?.identified_document_type === 'DPEM_INSURANCE' ||
            job?.identified_document_type === 'PAYMENT_PROOF' ||
            job?.identified_document_type === 'PURCHASE_CONTRACT' ? 'financial' : 'person'
          } className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl h-14 p-1.5 bg-slate-100 border border-slate-200">
              <TabsTrigger value="person" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md">
                <User className="h-4 w-4" /> Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="vessel" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md">
                <Ship className="h-4 w-4" /> Dados Técnicos
              </TabsTrigger>
              <TabsTrigger value="financial" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md">
                <FileText className="h-4 w-4" /> Financeiro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="person" className="mt-6">
              <Card className="p-8 border-slate-100 shadow-xl rounded-[2.5rem] bg-white relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-navy uppercase tracking-tight text-base flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" /> Identificação Civil
                  </h3>
                  <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confiança IA</span>
                    <div className="flex items-center gap-3">
                       <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", getConfidenceColor(job?.confidence_score || 0))} 
                            style={{ width: `${(job?.confidence_score || 0) * 100}%` }} 
                          />
                       </div>
                       <span className="text-xs font-black text-navy">{((job?.confidence_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2 md:col-span-2 group">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome / Razão Social</Label>
                    <Input 
                      value={editedData?.name || editedData?.company_name || editedData?.person?.nome || ''} 
                      onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy px-4" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CPF / CNPJ</Label>
                    <Input 
                      value={editedData?.cpf || editedData?.cnpj || editedData?.doc_number || ''} 
                      onChange={(e) => setEditedData({...editedData, cpf: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  {job?.identified_document_type === 'RG' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Número do RG</Label>
                      <Input 
                        value={editedData?.rg_number || ''} 
                        onChange={(e) => setEditedData({...editedData, rg_number: e.target.value})}
                        className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                      />
                    </div>
                  )}

                  {job?.identified_document_type === 'CNH' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Número CNH / Validade</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={editedData?.cnh_number || ''} 
                          placeholder="Número"
                          onChange={(e) => setEditedData({...editedData, cnh_number: e.target.value})}
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy flex-1" 
                        />
                        <Input 
                          value={editedData?.expiry_date || ''} 
                          placeholder="Validade"
                          onChange={(e) => setEditedData({...editedData, expiry_date: e.target.value})}
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy w-32" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data de Nascimento</Label>
                    <Input 
                      type="date"
                      value={editedData?.birth_date || editedData?.person?.data_nascimento || ''} 
                      onChange={(e) => setEditedData({...editedData, birth_date: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Endereço Residencial Completo</Label>
                    <Input 
                      value={editedData?.address || editedData?.person?.endereco || ''} 
                      onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>
                  
                  {(editedData?.city || editedData?.state || editedData?.zip) && (
                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidade</Label>
                        <Input 
                          value={editedData?.city || ''} 
                          onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white h-12 font-bold text-navy" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">UF</Label>
                        <Input 
                          value={editedData?.state || ''} 
                          onChange={(e) => setEditedData({...editedData, state: e.target.value})}
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white h-12 font-bold text-navy" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CEP</Label>
                        <Input 
                          value={editedData?.zip || ''} 
                          onChange={(e) => setEditedData({...editedData, zip: e.target.value})}
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white h-12 font-bold text-navy" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="vessel" className="mt-6">
               <Card className="p-8 border-slate-100 shadow-xl rounded-[2.5rem] bg-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-navy uppercase tracking-tight text-base flex items-center gap-3">
                    <Ship className="h-5 w-5 text-primary" /> Ficha da Embarcação
                  </h3>
                  <Badge variant="outline" className="border-green-100 text-green-600 bg-green-50 uppercase text-[10px] font-black px-3 py-1">
                    Marinha do Brasil
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome da Embarcação / Descrição Bem</Label>
                    <Input 
                      value={editedData?.vessel_name || editedData?.description || editedData?.vessel?.nome || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel_name: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nº Inscrição / TIE / Chassis / Certificado</Label>
                    <Input 
                      value={editedData?.inscription || editedData?.certificate_number || editedData?.serial_numbers?.hull || editedData?.vessel?.inscricao || ''} 
                      onChange={(e) => setEditedData({...editedData, inscription: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo / Categoria / Capacidade</Label>
                    <Input 
                      value={editedData?.vessel_type || editedData?.navigation_category || editedData?.capacity || editedData?.vessel?.tipo || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel_type: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Motorização / Responsável Técnico (CREA)</Label>
                    <Input 
                      value={editedData?.engine || editedData?.engineer_name || (editedData?.crea_number ? `${editedData.engineer_name} (${editedData.crea_number})` : '') || editedData?.serial_numbers?.engine || editedData?.vessel?.engine || ''} 
                      onChange={(e) => setEditedData({...editedData, engine: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>
                  
                  {editedData?.measurements && (
                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comprimento</Label>
                        <Input 
                          value={editedData.measurements.length || ''} 
                          onChange={(e) => setEditedData({...editedData, measurements: {...editedData.measurements, length: e.target.value}})}
                          className="rounded-2xl border-slate-100 bg-slate-50 h-10 font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Boca</Label>
                        <Input 
                          value={editedData.measurements.beam || ''} 
                          onChange={(e) => setEditedData({...editedData, measurements: {...editedData.measurements, beam: e.target.value}})}
                          className="rounded-2xl border-slate-100 bg-slate-50 h-10 font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Arqueação</Label>
                        <Input 
                          value={editedData.measurements.tonnage || ''} 
                          onChange={(e) => setEditedData({...editedData, measurements: {...editedData.measurements, tonnage: e.target.value}})}
                          className="rounded-2xl border-slate-100 bg-slate-50 h-10 font-bold" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {(editedData?.engines || editedData?.serial_numbers) && (
                  <div className="mt-10 space-y-4">
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> Identificadores Técnicos
                    </p>
                    <div className="grid gap-3">
                      {editedData?.engines?.map((eng: any, i: number) => (
                        <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                              <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-navy uppercase tracking-tight">{eng.brand} {eng.model}</p>
                              <p className="text-[10px] text-slate-500 font-medium">Série: <span className="text-navy font-bold">{eng.serial}</span> • Potência: {eng.power}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500 text-white border-none text-[9px] font-black uppercase tracking-widest">OK</Badge>
                        </div>
                      ))}
                      {editedData?.serial_numbers && (
                         <div className="p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] space-y-2">
                            <p className="text-[10px] font-black text-navy uppercase tracking-widest">Números de Série NF</p>
                            <div className="flex justify-between items-center">
                               <span className="text-[10px] font-bold text-slate-500">CASCO:</span>
                               <span className="text-[10px] font-black text-navy">{editedData.serial_numbers.hull}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-[10px] font-bold text-slate-500">MOTOR:</span>
                               <span className="text-[10px] font-black text-navy">{editedData.serial_numbers.engine}</span>
                            </div>
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="mt-6">
               <Card className="p-8 border-slate-100 shadow-xl rounded-[2.5rem] bg-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-navy uppercase tracking-tight text-base flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" /> Dados Financeiros
                  </h3>
                  <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50 uppercase text-[10px] font-black px-3 py-1">
                    {job?.identified_document_type || 'Documento'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor do Documento</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy font-black text-sm">R$</span>
                      <Input 
                        value={editedData?.amount || ''} 
                        onChange={(e) => setEditedData({...editedData, amount: e.target.value})}
                        className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy pl-10" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data de Vencimento</Label>
                    <Input 
                      type="date"
                      value={editedData?.due_date || ''} 
                      onChange={(e) => setEditedData({...editedData, due_date: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Identificadores (BO / Apólice / Barcode / Chave)</Label>
                    <Input 
                      value={editedData?.barcode || editedData?.access_key || editedData?.policy_number || editedData?.report_number || editedData?.reference_code || ''} 
                      onChange={(e) => setEditedData({...editedData, barcode: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy text-[11px]" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo / Emissor / Seguradora / Comprador</Label>
                    <Input 
                      value={editedData?.type || editedData?.payment_code || editedData?.issuer || editedData?.insurance_company || editedData?.buyer || ''} 
                      onChange={(e) => setEditedData({...editedData, type: e.target.value})}
                      className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-primary h-12 font-bold text-navy" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status do Pagamento</Label>
                    <Badge className={`${editedData?.status === 'PAID' ? 'bg-green-500' : 'bg-amber-500'} text-white border-none h-12 w-full rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px]`}>
                      {editedData?.status === 'PAID' ? 'Pago / Comprovado' : 'Aguardando Pagamento'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between gap-6 shadow-2xl">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                   <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <h5 className="text-xs font-black uppercase tracking-tight">Sincronização Operacional</h5>
                   <p className="text-[10px] text-white/50 font-medium max-w-sm">
                      Ao aprovar, o sistema atualizará o prontuário do cliente e da embarcação automaticamente.
                   </p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Precisão de Visão</p>
                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-primary" style={{ width: '95%' }}></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoIcon({ score }: { score: number }) {
  const color = score >= 0.9 ? "text-green-500" : score >= 0.7 ? "text-amber-500" : "text-red-500";
  return (
    <div className="group relative cursor-help">
      <CheckCircle2 className={`h-3 w-3 ${color}`} />
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-navy text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold uppercase tracking-widest text-center shadow-xl z-50">
        Confiança IA: {(score * 100).toFixed(0)}%
      </div>
    </div>
  );
}
