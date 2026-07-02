import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Loader2, Database, Type } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { toast } from "sonner";

interface Field {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: string;
  source_type: string;
  source_field?: string;
  required: boolean;
  page_number: number;
  position_x?: number;
  position_y?: number;
}

interface DocumentFieldEditorProps {
  templateId: string;
}

const SOURCE_TYPES = [
  { value: "manual", label: "Manual (Usuário preenche)", icon: <Type className="h-3 w-3" /> },
  { value: "customer", label: "Dados do Cliente", icon: <Database className="h-3 w-3" /> },
  { value: "vessel", label: "Dados da Embarcação", icon: <Database className="h-3 w-3" /> },
  { value: "company", label: "Dados da Empresa", icon: <Database className="h-3 w-3" /> },
  { value: "process", label: "Dados do Processo", icon: <Database className="h-3 w-3" /> },
];

const SOURCE_FIELDS = {
  customer: ["name", "cpf_cnpj", "rg", "cnh", "address", "phone", "email", "occupation", "nationality", "marital_status"],
  vessel: ["name", "registration_number", "vessel_type", "category", "engine_power", "length", "hull_material", "year_built"],
  company: ["name", "cnpj", "phone", "email", "address"],
  process: ["process_type", "status", "created_at", "assigned_to"],
};

export function DocumentFieldEditor({ templateId }: DocumentFieldEditorProps) {
  const { templates, templateFields, upsertTemplateFields } = useDocuments();
  const [fields, setFields] = useState<Field[]>([]);
  
  const currentTemplate = templates?.find((t: any) => t.id === templateId);
  const isPdf = currentTemplate?.file_type === 'pdf';

  useEffect(() => {
    if (templateFields) {
      const filtered = templateFields.filter((f: any) => f.template_id === templateId);
      setFields(filtered);
    }
  }, [templateFields, templateId]);

  const addField = () => {
    setFields([
      ...fields,
      {
        field_name: "",
        field_label: "",
        field_type: "text",
        source_type: "manual",
        required: false,
        page_number: 1,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleSave = async () => {
    try {
      await upsertTemplateFields.mutateAsync({ templateId, fields });
    } catch (error) {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Campos Dinâmicos</h3>
        <Button onClick={addField} size="sm" className="bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 gap-2">
          <Plus className="h-4 w-4" /> Adicionar Campo
        </Button>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
        {fields.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl">
            <p className="text-slate-500 text-xs italic">Nenhum campo configurado para este template.</p>
          </div>
        ) : (
          fields.map((field, index) => (
            <div key={index} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rótulo (Exibido no formulário)</Label>
                  <Input 
                    value={field.field_label}
                    onChange={(e) => updateField(index, { field_label: e.target.value })}
                    placeholder="Ex: Nome do Proprietário"
                    className="bg-black/20 border-white/5 text-white h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chave (No PDF/DOCX)</Label>
                  <Input 
                    value={field.field_name}
                    onChange={(e) => updateField(index, { field_name: e.target.value })}
                    placeholder="Ex: owner_name"
                    className="bg-black/20 border-white/5 text-white h-10 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem do Dado</Label>
                  <Select 
                    value={field.source_type}
                    onValueChange={(v) => updateField(index, { source_type: v, source_field: undefined })}
                  >
                    <SelectTrigger className="bg-black/20 border-white/5 text-white h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {SOURCE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          <div className="flex items-center gap-2">
                            {t.icon} {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {field.source_type !== "manual" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campo de Origem</Label>
                    <Select 
                      value={field.source_field}
                      onValueChange={(v) => updateField(index, { source_field: v })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/5 text-white h-10 rounded-xl">
                        <SelectValue placeholder="Selecione o campo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {SOURCE_FIELDS[field.source_type as keyof typeof SOURCE_FIELDS]?.map(f => (
                          <SelectItem key={f} value={f} className="text-xs uppercase">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isPdf && (
                <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página</Label>
                    <Input 
                      type="number"
                      value={field.page_number}
                      onChange={(e) => updateField(index, { page_number: Number(e.target.value) })}
                      className="bg-black/20 border-white/5 text-white h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posição X</Label>
                    <Input 
                      type="number"
                      value={field.position_x}
                      onChange={(e) => updateField(index, { position_x: Number(e.target.value) })}
                      placeholder="px"
                      className="bg-black/20 border-white/5 text-white h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posição Y</Label>
                    <Input 
                      type="number"
                      value={field.position_y}
                      onChange={(e) => updateField(index, { position_y: Number(e.target.value) })}
                      placeholder="px"
                      className="bg-black/20 border-white/5 text-white h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeField(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Button 
        onClick={handleSave} 
        disabled={upsertTemplateFields.isPending}
        className="w-full bg-red-500 hover:bg-red-600 text-white h-12 rounded-xl font-bold gap-2 shadow-lg shadow-red-500/20"
      >
        {upsertTemplateFields.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Mapeamento
      </Button>
    </div>
  );
}
