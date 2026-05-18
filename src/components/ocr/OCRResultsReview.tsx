import { useState, useEffect } from "react";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  ArrowRight,
  ShieldCheck,
  Edit2,
  Save,
  User,
  Anchor,
  MapPin,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OCRJob, useOCR } from "@/hooks/useOCR";
import { toast } from "sonner";

interface OCRResultsReviewProps {
  job: OCRJob;
}

export function OCRResultsReview({ job }: OCRResultsReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(job.extracted_data);
  const { updateJobStatus } = useOCR();

  useEffect(() => {
    setEditedData(job.extracted_data);
    setIsEditing(false);
  }, [job]);

  const handleApply = async () => {
    try {
      await updateJobStatus.mutateAsync({
        jobId: job.id,
        status: 'reviewed',
        extractedData: editedData
      });
      toast.success("Dados aprovados e sincronizados!");
    } catch (error) {
      toast.error("Erro ao salvar revisão.");
    }
  };

  const renderField = (label: string, value: string, icon: any, fieldKey: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
          {icon} {label}
        </Label>
        {isEditing && <span className="text-[9px] font-bold text-primary animate-pulse">Editando</span>}
      </div>
      
      {isEditing ? (
        <Input 
          value={value || ''} 
          onChange={(e) => setEditedData({...editedData, [fieldKey]: e.target.value})}
          className="h-11 bg-white border-slate-200 rounded-xl text-sm font-bold text-navy focus:ring-primary/20"
        />
      ) : (
        <div className="group relative p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-white hover:border-primary/30 transition-all">
          <span className="text-sm font-bold text-navy truncate">{value || "Não detectado"}</span>
          <CheckCircle2 className={`h-4 w-4 ${value ? "text-green-500" : "text-slate-200"}`} />
        </div>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white">
      {/* Header com Status */}
      <div className="bg-navy p-8 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="h-24 w-24 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">IA de Extração</p>
                <Badge className="bg-green-500/20 text-green-400 border-none font-black text-[9px] uppercase">
                  Confiança: {(job.confidence_score * 100).toFixed(0)}%
                </Badge>
              </div>
              <h4 className="text-xl font-bold">Resultados da Análise</h4>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl border-white/20 text-white hover:bg-white/10 font-bold gap-2 text-xs"
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            {isEditing ? "Salvar Alterações" : "Corrigir Dados"}
          </Button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Grid de Dados */}
        <div className="grid sm:grid-cols-2 gap-6">
          {renderField("Nome Completo", editedData?.name, <User className="h-3 w-3" />, "name")}
          {renderField("Documento / CPF", editedData?.doc_number, <FileText className="h-3 w-3" />, "doc_number")}
          {renderField("Local / Endereço", editedData?.address, <MapPin className="h-3 w-3" />, "address")}
          {renderField("Data Nascimento", editedData?.birth_date, <Calendar className="h-3 w-3" />, "birth_date")}
          
          {editedData?.vessel_name && (
            <>
              {renderField("Nome da Embarcação", editedData?.vessel_name, <Anchor className="h-3 w-3" />, "vessel_name")}
              {renderField("Inscrição / TIE", editedData?.vessel_id, <Zap className="h-3 w-3" />, "vessel_id")}
            </>
          )}
        </div>

        {/* Alerta de Segurança */}
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-blue-500 rounded-lg shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Validação Concluída</p>
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              Nossa IA validou estes dados comparando com o documento original e registros públicos da Marinha. 
              Por favor, revise as informações antes de aplicar ao cadastro.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black uppercase text-xs tracking-widest gap-2">
            <RefreshCcw className="h-4 w-4" /> Re-analisar
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1 bg-primary text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ArrowRight className="h-4 w-4" /> Aprovar e Aplicar
          </Button>
        </div>
      </div>
    </Card>
  );
}
