import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Loader2, Sparkles } from "lucide-react";
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
  companyId: string | null;
  onCustomerCreated: (customer: { id: string; name: string; cpf_cnpj: string }) => void;
}

export function QuickCustomerModal({ isOpen, onClose, companyId, onCustomerCreated }: Props) {
  const [clientType, setClientType] = useState<"pf" | "pj">("pf");
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCpfCnpjChange = (val: string) => {
    const masked = clientType === "pf" ? maskCPF(val) : maskCNPJ(val);
    setCpfCnpj(masked);
    if (errors.cpfCnpj) setErrors((prev) => ({ ...prev, cpfCnpj: "" }));
  };

  const handleCepChange = async (val: string) => {
    const masked = maskCEP(val);
    setCep(masked);
    if (masked.replace(/\D/g, "").length === 8) {
      const address = await fetchAddressByCEP(masked);
      if (address) {
        setLogradouro(address.logradouro || logradouro);
        setBairro(address.bairro || bairro);
        setCidade(address.cidade || cidade);
        setUf(address.uf || uf);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nome.trim()) {
      newErrors.nome = clientType === "pf" ? "Nome é obrigatório." : "Razão social é obrigatória.";
    }

    if (!cpfCnpj.trim()) {
      newErrors.cpfCnpj = clientType === "pf" ? "CPF é obrigatório." : "CNPJ é obrigatório.";
    } else if (clientType === "pf" && !isValidCPF(cpfCnpj)) {
      newErrors.cpfCnpj = "CPF inválido.";
    } else if (clientType === "pj" && !isValidCNPJ(cpfCnpj)) {
      newErrors.cpfCnpj = "CNPJ inválido.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!companyId) {
      toast.error("Espaço de trabalho não identificado.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verifica duplicidade
      const { data: existing } = await supabase
        .from("customers")
        .select("id, name, cpf_cnpj")
        .eq("company_id", companyId)
        .eq("cpf_cnpj", cpfCnpj.trim())
        .maybeSingle();

      if (existing) {
        toast.info(`Cliente já existe (${existing.name}). Selecionado automaticamente.`);
        onCustomerCreated(existing);
        onClose();
        return;
      }

      // 2. Monta endereço
      let fullAddress = "";
      if (logradouro.trim()) {
        fullAddress = logradouro.trim();
        if (numero.trim()) fullAddress += `, ${numero.trim()}`;
        if (bairro.trim()) fullAddress += ` - ${bairro.trim()}`;
      }

      // 3. Insere cliente
      const { data: newCustomer, error: insErr } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: nome.trim(),
          cpf_cnpj: cpfCnpj.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: fullAddress || null,
          city: cidade.trim() || null,
          state: uf.trim() || null,
        })
        .select("id, name, cpf_cnpj")
        .single();

      if (insErr) throw insErr;

      toast.success("Cliente cadastrado com sucesso!");
      onCustomerCreated(newCustomer);
      onClose();
    } catch (err: any) {
      console.error("Erro ao cadastrar cliente rápido:", err);
      toast.error(err.message || "Erro ao salvar cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-lg p-6 sm:p-7 rounded-2xl bg-white border border-slate-150 shadow-xl">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#075BFF] uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Cadastro Rápido</span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#0B1739]">
            Cadastrar novo cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Cadastre o cliente responsável para vinculá-lo imediatamente a esta embarcação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Toggle PF / PJ */}
          <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1">
            <button
              type="button"
              onClick={() => { setClientType("pf"); setCpfCnpj(""); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                clientType === "pf" ? "bg-[#075BFF] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pessoa física
            </button>
            <button
              type="button"
              onClick={() => { setClientType("pj"); setCpfCnpj(""); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                clientType === "pj" ? "bg-[#075BFF] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pessoa jurídica
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {clientType === "pf" ? "Nome completo" : "Razão social"} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (errors.nome) setErrors(p => ({ ...p, nome: "" })); }}
              placeholder={clientType === "pf" ? "Digite o nome completo" : "Digite a razão social"}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                errors.nome ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              }`}
            />
            {errors.nome && <p className="text-[11px] text-red-500 mt-0.5">{errors.nome}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {clientType === "pf" ? "CPF" : "CNPJ"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => handleCpfCnpjChange(e.target.value)}
                placeholder={clientType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                maxLength={clientType === "pf" ? 14 : 18}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.cpfCnpj ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                }`}
              />
              {errors.cpfCnpj && <p className="text-[11px] text-red-500 mt-0.5">{errors.cpfCnpj}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Salvar e Vincular</span>}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
