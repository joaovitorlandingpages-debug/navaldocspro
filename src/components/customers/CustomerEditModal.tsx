import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Edit2, Loader2, Save, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BR_UFS, 
  maskCPF, 
  maskCNPJ, 
  maskCEP, 
  maskPhone, 
  isValidCPF, 
  isValidCNPJ, 
  fetchAddressByCEP 
} from "@/lib/br-format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: any | null;
  onCustomerUpdated: () => void;
}

export function CustomerEditModal({ isOpen, onClose, customer, onCustomerUpdated }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    cpf_cnpj: "",
    rg: "",
    email: "",
    phone: "",
    cep: "",
    cidade: "",
    uf: "",
    logradouro: "",
    numero: "",
    bairro: "",
    complemento: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      const isPJ = (customer.cpf_cnpj || "").replace(/\D/g, "").length > 11;
      setFormData({
        name: customer.name || "",
        cpf_cnpj: isPJ ? maskCNPJ(customer.cpf_cnpj || "") : maskCPF(customer.cpf_cnpj || ""),
        rg: customer.rg || "",
        email: customer.email || "",
        phone: maskPhone(customer.phone || ""),
        cep: maskCEP(customer.cep || ""),
        cidade: customer.city || "",
        uf: customer.state || "",
        logradouro: customer.address || "",
        numero: "",
        bairro: "",
        complemento: "",
        notes: customer.notes || "",
      });
      setErrors({});
    }
  }, [customer]);

  const isPJ = (formData.cpf_cnpj || "").replace(/\D/g, "").length > 11;

  const handleChange = (field: string, value: string) => {
    let masked = value;
    if (field === "cpf_cnpj") masked = isPJ ? maskCNPJ(value) : maskCPF(value);
    else if (field === "cep") masked = maskCEP(value);
    else if (field === "phone") masked = maskPhone(value);

    setFormData((prev) => ({ ...prev, [field]: masked }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));

    if (field === "cep" && masked.replace(/\D/g, "").length === 8) {
      fetchAddressByCEP(masked).then((addr) => {
        if (addr) {
          setFormData((p) => ({
            ...p,
            logradouro: addr.logradouro || p.logradouro,
            bairro: addr.bairro || p.bairro,
            cidade: addr.cidade || p.cidade,
            uf: addr.uf || p.uf,
          }));
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório.";
    if (!formData.cpf_cnpj.trim()) newErrors.cpf_cnpj = "CPF/CNPJ é obrigatório.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAddress = formData.logradouro.trim();
      if (formData.numero.trim()) finalAddress += `, ${formData.numero.trim()}`;
      if (formData.bairro.trim()) finalAddress += ` - ${formData.bairro.trim()}`;

      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.name.trim(),
          cpf_cnpj: formData.cpf_cnpj.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: finalAddress || null,
          city: formData.cidade.trim() || null,
          state: formData.uf.trim() || null,
          rg: formData.rg.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .eq("id", customer.id);

      if (error) throw error;

      toast.success("Cliente atualizado com sucesso!");
      onCustomerUpdated();
      onClose();
    } catch (err: any) {
      console.error("Erro ao atualizar cliente:", err);
      toast.error(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-xl p-6 sm:p-8 rounded-2xl bg-white border border-slate-150 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#075BFF] uppercase tracking-wider mb-1">
            <Edit2 className="h-4 w-4" />
            <span>Editar Cadastro</span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B1739]">
            Editar dados do cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Atualize as informações cadastrais e de contato deste cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome / Razão Social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / CNPJ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cpf_cnpj}
                onChange={(e) => handleChange("cpf_cnpj", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
              {errors.cpf_cnpj && <p className="text-[11px] text-red-500 mt-0.5">{errors.cpf_cnpj}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RG / Inscrição Estadual
              </label>
              <input
                type="text"
                value={formData.rg}
                onChange={(e) => handleChange("rg", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CEP
              </label>
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
                placeholder="00000-000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UF
              </label>
              <div className="relative">
                <select
                  value={formData.uf}
                  onChange={(e) => handleChange("uf", e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] pr-8"
                >
                  <option value="">UF</option>
                  {BR_UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Endereço / Logradouro
            </label>
            <input
              type="text"
              value={formData.logradouro}
              onChange={(e) => handleChange("logradouro", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] resize-y"
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar alterações</span>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
