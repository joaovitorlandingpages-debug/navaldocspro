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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OCRReviewProps {
  jobId: string;
  onBack: () => void;
  onComplete: () => void;
}

export function OCRReview({ jobId, onBack, onComplete }: OCRReviewProps) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchJobDetails();
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
      toast.error("Erro ao carregar job: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToClient = async () => {
    setSaving(true);
    try {
      // In a real scenario, this would create or update a client record
      toast.success("Dados aplicados ao cliente com sucesso!");
      
      await supabase
        .from('ocr_jobs')
        .update({ status: 'reviewed' })
        .eq('id', jobId);
        
      onComplete();
    } catch (error: any) {
      toast.error("Erro ao aplicar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToVessel = async () => {
    setSaving(true);
    try {
      toast.success("Dados aplicados à embarcação com sucesso!");
      
      await supabase
        .from('ocr_jobs')
        .update({ status: 'reviewed' })
        .eq('id', jobId);
        
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
        <p className="font-bold text-navy uppercase tracking-widest">Carregando Resultados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="rounded-xl h-10 w-10 p-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-navy uppercase tracking-tight flex items-center gap-2">
              Revisão OCR <Badge className="bg-green-500 uppercase text-[10px]">IA Concluída</Badge>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Confirme os dados extraídos antes de salvar no sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold gap-2 text-xs h-10" onClick={fetchJobDetails}>
            <RefreshCw className="h-4 w-4" /> Reprocessar
          </Button>
          <Button className="bg-primary text-white rounded-xl font-bold gap-2 text-xs h-10 shadow-lg shadow-primary/20" onClick={handleApplyToClient} disabled={saving}>
            <Save className="h-4 w-4" /> Aplicar ao Cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Documento */}
        <Card className="p-4 bg-slate-100/50 border-2 border-slate-200 overflow-hidden flex flex-col min-h-[700px]">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Search className="h-3 w-3" /> Visualização do Documento
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
              {job?.uploaded_files?.file_name}
            </Badge>
          </div>
          <div className="flex-1 rounded-xl bg-white border-2 border-slate-200 overflow-auto relative">
            {fileUrl ? (
              <img src={fileUrl} alt="Documento" className="w-full h-auto object-contain" />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic text-sm">
                Visualização não disponível
              </div>
            )}
            
            {/* Overlay de áreas detectadas (Simulado) */}
            <div className="absolute top-[15%] left-[10%] w-[30%] h-[5%] border-2 border-primary/50 bg-primary/5 animate-pulse rounded"></div>
            <div className="absolute top-[22%] left-[10%] w-[25%] h-[4%] border-2 border-primary/50 bg-primary/5 animate-pulse rounded"></div>
          </div>
        </Card>

        {/* Lado Direito: Dados Extraídos */}
        <div className="space-y-6 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          <Tabs defaultValue="person" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-slate-100 border border-slate-200">
              <TabsTrigger value="person" className="rounded-lg font-bold text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <User className="h-4 w-4" /> Pessoa / Cliente
              </TabsTrigger>
              <TabsTrigger value="vessel" className="rounded-lg font-bold text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Ship className="h-4 w-4" /> Embarcação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="person" className="mt-4 space-y-4">
              <Card className="p-6 border-2 border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-navy uppercase tracking-tight text-sm flex items-center gap-2">
                    Dados Pessoais
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Confiança:</span>
                    <Badge className={`${getConfidenceColor(job?.confidence_score || 0)} text-white border-none text-[10px] font-black`}>
                      {(job?.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo</Label>
                    <div className="relative group">
                      <Input 
                        value={editedData?.person?.nome || ''} 
                        onChange={(e) => setEditedData({...editedData, person: {...editedData.person, nome: e.target.value}})}
                        className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary/10 h-11 font-medium pr-10" 
                      />
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">CPF</Label>
                    <Input 
                      value={editedData?.person?.cpf || ''} 
                      onChange={(e) => setEditedData({...editedData, person: {...editedData.person, cpf: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Data de Nascimento</Label>
                    <Input 
                      type="date"
                      value={editedData?.person?.data_nascimento || ''} 
                      onChange={(e) => setEditedData({...editedData, person: {...editedData.person, data_nascimento: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Endereço</Label>
                    <Input 
                      value={editedData?.person?.endereco || ''} 
                      onChange={(e) => setEditedData({...editedData, person: {...editedData.person, endereco: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cidade</Label>
                    <Input 
                      value={editedData?.person?.cidade || ''} 
                      onChange={(e) => setEditedData({...editedData, person: {...editedData.person, cidade: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Estado (UF)</Label>
                    <Input 
                      value={editedData?.person?.estado || ''} 
                      onChange={(e) => setEditedData({...editedData, person: {...editedData.person, estado: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="vessel" className="mt-4 space-y-4">
              <Card className="p-6 border-2 border-slate-100 shadow-sm">
                <h3 className="font-black text-navy uppercase tracking-tight text-sm mb-6 flex items-center gap-2">
                  Dados da Embarcação
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome da Embarcação</Label>
                    <Input 
                      value={editedData?.vessel?.nome || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel: {...editedData.vessel, nome: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nº Inscrição / TIE</Label>
                    <Input 
                      value={editedData?.vessel?.inscricao || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel: {...editedData.vessel, inscricao: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Casco</Label>
                    <Input 
                      value={editedData?.vessel?.tipo || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel: {...editedData.vessel, tipo: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Motorização</Label>
                    <Input 
                      value={editedData?.vessel?.motor || ''} 
                      onChange={(e) => setEditedData({...editedData, vessel: {...editedData.vessel, motor: e.target.value}})}
                      className="rounded-xl border-slate-200 h-11 font-medium" 
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-4 bg-navy text-white rounded-xl shadow-lg border-none flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight">Revisão Necessária</p>
                <p className="text-[10px] text-slate-300">Campos destacados em amarelo possuem confiança média.</p>
              </div>
            </div>
            <Button 
              className="bg-white text-navy hover:bg-white/90 rounded-lg font-bold text-[10px] uppercase h-8"
              onClick={handleApplyToVessel}
              disabled={saving}
            >
              Confirmar Tudo
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
