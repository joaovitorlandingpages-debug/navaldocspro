import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Edit2, Loader2, Save, X, ChevronDown, Ship, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const VESSEL_CATEGORIES = [
  "Embarcações de esporte e recreio",
  "Embarcações comerciais de passageiros",
  "Embarcações comerciais de carga",
  "Embarcações de pesca",
  "Embarcações de apoio portuário e marítimo",
  "Motos aquáticas (Jet Ski)",
  "Outras categorias",
];

const VESSEL_TYPES = [
  "Lancha",
  "Veleiro",
  "Moto Aquática (Jet Ski)",
  "Iate",
  "Bote Inflável",
  "Escuna / Saveiro",
  "Balsa / Chata",
  "Rebocador",
  "Barco de Pesca",
  "Barco de Alumínio / Bote",
  "Lancha de Passageiros",
  "Outro",
];

const HULL_MATERIALS = [
  "Fibra de Vidro (PRFV)",
  "Alumínio",
  "Aço",
  "Madeira",
  "Polietileno",
  "Misto",
  "Outro",
];

const NAVIGATION_AREAS = [
  "Interior (Rios, Lagos, Canais e Baías abrigadas)",
  "Mar Aberto - Costeira (até 20 milhas da costa)",
  "Mar Aberto - Oceânica (sem restrição de afastamento)",
  "Apoio Portuário",
  "Apoio Marítimo",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vessel: any | null;
  onSuccess: (updatedVessel: any) => void;
}

export function VesselEditModal({ isOpen, onClose, vessel, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    category: "Embarcações de esporte e recreio",
    registration_number: "",
    vessel_type: "",
    construction_year: "",
    material: "",
    length: "",
    activity: "",
    boca: "",
    pontal: "",
    engine: "",
    engine_power: "",
    engine_serial_number: "",
    hull_number: "",
    capacity: "",
    hull_color: "",
    notes: "",
  });

  const [initialData, setInitialData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (vessel) {
      const data = {
        name: vessel.name || "",
        category: vessel.category || "Embarcações de esporte e recreio",
        registration_number: vessel.registration_number || "",
        vessel_type: vessel.vessel_type || "",
        construction_year: vessel.construction_year ? String(vessel.construction_year) : "",
        material: vessel.material || "",
        length: vessel.length || "",
        activity: vessel.activity || "",
        boca: vessel.boca || "",
        pontal: vessel.pontal || "",
        engine: vessel.engine || "",
        engine_power: vessel.engine_power || "",
        engine_serial_number: vessel.engine_serial_number || "",
        hull_number: vessel.hull_number || "",
        capacity: vessel.capacity ? String(vessel.capacity) : "",
        hull_color: vessel.hull_color || "",
        notes: vessel.notes || "",
      };
      setFormData(data);
      setInitialData(data);
      setErrors({});
    }
  }, [vessel, isOpen]);

  // Checar se há alterações não salvas
  const hasUnsavedChanges = () => {
    if (!initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome da embarcação é obrigatório";
    }

    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória";
    }

    if (formData.construction_year) {
      const year = parseInt(formData.construction_year, 10);
      const currentYear = new Date().getFullYear() + 1;
      if (isNaN(year) || year < 1900 || year > currentYear) {
        newErrors.construction_year = `Ano inválido (1900 - ${currentYear})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!vessel?.id) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        category: formData.category,
        registration_number: formData.registration_number.trim() || null,
        vessel_type: formData.vessel_type.trim() || null,
        construction_year: formData.construction_year ? parseInt(formData.construction_year, 10) : null,
        material: formData.material.trim() || null,
        length: formData.length.trim() || null,
        activity: formData.activity.trim() || null,
        boca: formData.boca.trim() || null,
        pontal: formData.pontal.trim() || null,
        engine: formData.engine.trim() || null,
        engine_power: formData.engine_power.trim() || null,
        engine_serial_number: formData.engine_serial_number.trim() || null,
        hull_number: formData.hull_number.trim() || null,
        capacity: formData.capacity.trim() || null,
        hull_color: formData.hull_color.trim() || null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("vessels")
        .update(payload)
        .eq("id", vessel.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Embarcação atualizada com sucesso!");
      onSuccess(data || { ...vessel, ...payload });
      onClose();
    } catch (err: any) {
      console.error("Erro ao atualizar embarcação:", err);
      toast.error(err?.message || "Erro ao salvar alterações da embarcação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          {/* Header */}
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <Ship className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#0B1739]">
                  Editar dados da embarcação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Atualize as informações náuticas e estruturais da embarcação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Aviso de vínculo com cliente */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-600">
                <AlertCircle className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                <span>
                  O vínculo com o cliente atual é protegido para preservar documentos e processos históricos.
                </span>
              </div>

              {/* Seção 1: Identificação Básica */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Identificação Básica
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome da Embarcação */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome da embarcação *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Aurora"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                        errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* Categoria */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoria náutica *
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer pr-10"
                      >
                        {VESSEL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Tipo da Embarcação */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de embarcação
                    </label>
                    <div className="relative">
                      <select
                        value={formData.vessel_type}
                        onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer pr-10"
                      >
                        <option value="">Selecione o tipo...</option>
                        {VESSEL_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Número de Inscrição */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de inscrição (TIE/TIEM)
                    </label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      placeholder="Ex: 381-123456-7"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Características Físicas e Estruturais */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dimensões e Estrutura
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Comprimento */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Comprimento total (m)
                    </label>
                    <input
                      type="text"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      placeholder="Ex: 6,50"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Boca */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Boca moldada (m)
                    </label>
                    <input
                      type="text"
                      value={formData.boca}
                      onChange={(e) => setFormData({ ...formData, boca: e.target.value })}
                      placeholder="Ex: 2,30"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Pontal */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pontal moldado (m)
                    </label>
                    <input
                      type="text"
                      value={formData.pontal}
                      onChange={(e) => setFormData({ ...formData, pontal: e.target.value })}
                      placeholder="Ex: 0,90"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Ano de Construção */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ano de construção
                    </label>
                    <input
                      type="number"
                      value={formData.construction_year}
                      onChange={(e) => setFormData({ ...formData, construction_year: e.target.value })}
                      placeholder="Ex: 2021"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                        errors.construction_year ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.construction_year && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.construction_year}</p>
                    )}
                  </div>

                  {/* Material do Casco */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material do casco
                    </label>
                    <div className="relative">
                      <select
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer pr-10"
                      >
                        <option value="">Selecione o material...</option>
                        {HULL_MATERIALS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Cor do Casco */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cor do casco
                    </label>
                    <input
                      type="text"
                      value={formData.hull_color}
                      onChange={(e) => setFormData({ ...formData, hull_color: e.target.value })}
                      placeholder="Ex: Branca e Azul"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Área de Navegação / Atividade */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Área de navegação
                    </label>
                    <div className="relative">
                      <select
                        value={formData.activity}
                        onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                        className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer pr-10"
                      >
                        <option value="">Selecione a área...</option>
                        {NAVIGATION_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Lotação / Capacidade */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lotação máxima (pessoas)
                    </label>
                    <input
                      type="text"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Ex: 8"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Motorização e Identificadores */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Propulsão e Identificadores
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Motor / Tipo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Motor / Tipo
                    </label>
                    <input
                      type="text"
                      value={formData.engine}
                      onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                      placeholder="Ex: Motor de Popa 4T"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Potência */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Potência (HP / kW)
                    </label>
                    <input
                      type="text"
                      value={formData.engine_power}
                      onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}
                      placeholder="Ex: 150 HP"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Número de Série do Motor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nº de série do motor
                    </label>
                    <input
                      type="text"
                      value={formData.engine_serial_number}
                      onChange={(e) => setFormData({ ...formData, engine_serial_number: e.target.value })}
                      placeholder="Ex: 1B987654"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Número do Casco (HIN / Chassi) */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Identificador do casco (HIN / Chassi)
                    </label>
                    <input
                      type="text"
                      value={formData.hull_number}
                      onChange={(e) => setFormData({ ...formData, hull_number: e.target.value })}
                      placeholder="Ex: BRA12345J121"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  {/* Observações */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observações adicionais
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Anotações internas sobre a embarcação..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Saída com Alterações Não Salvas */}
      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Descartar alterações?"
        description="Você possui alterações não salvas nos dados da embarcação. Deseja realmente sair sem salvar?"
        confirmLabel="Descartar alterações"
        cancelLabel="Continuar editando"
        variant="destructive"
        onConfirm={() => {
          setShowExitConfirm(false);
          onClose();
        }}
      />
    </>
  );
}
