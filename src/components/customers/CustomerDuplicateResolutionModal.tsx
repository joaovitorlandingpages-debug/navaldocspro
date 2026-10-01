import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, UserCheck, ArrowRight, Check, X, RefreshCw, Loader2, Edit3, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeString } from "@/utils/safe-string";

export interface ExistingCustomerData {
  id: string;
  name: string;
  cpf_cnpj: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  rg?: string | null;
  notes?: string | null;
}

export interface NewCustomerFormData {
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  rg?: string;
  notes?: string;
  fullAddress?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingCustomer: ExistingCustomerData | null;
  newFormData: NewCustomerFormData;
  uploadedFiles?: Array<{ name: string; path?: string; file?: File; size?: number }>;
  companyId: string | null;
  onOpenExisting: (customerId: string) => void;
  onCustomerUpdated: (customerId: string) => void;
  onFixDocument: () => void;
}

interface FieldDiff {
  key: string;
  label: string;
  currentValue: string;
  newValue: string;
  isDifferent: boolean;
}

export function CustomerDuplicateResolutionModal({
  isOpen,
  onClose,
  existingCustomer,
  newFormData,
  uploadedFiles = [],
  companyId,
  onOpenExisting,
  onCustomerUpdated,
  onFixDocument,
}: Props) {
  const [viewMode, setViewMode] = useState<"options" | "compare">("options");
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Monta endereço novo completo se não fornecido
  const computedNewAddress = useMemo(() => {
    if (newFormData.fullAddress) return newFormData.fullAddress;
    const parts = [];
    if (newFormData.logradouro) {
      let l = newFormData.logradouro;
      if (newFormData.numero) l += `, ${newFormData.numero}`;
      if (newFormData.complemento) l += ` - ${newFormData.complemento}`;
      if (newFormData.bairro) l += ` - ${newFormData.bairro}`;
      if (newFormData.cep) l += ` (CEP: ${newFormData.cep})`;
      parts.push(l);
    }
    return parts.join(" ") || "";
  }, [newFormData]);

  // Lista de campos comparados
  const diffs = useMemo<FieldDiff[]>(() => {
    if (!existingCustomer) return [];

    const items: Array<{ key: string; label: string; current: string | null | undefined; next: string | null | undefined }> = [
      {
        key: "name",
        label: "Nome / Razão Social",
        current: existingCustomer.name,
        next: newFormData.nome,
      },
      {
        key: "email",
        label: "E-mail",
        current: existingCustomer.email,
        next: newFormData.email,
      },
      {
        key: "phone",
        label: "Telefone / WhatsApp",
        current: existingCustomer.phone,
        next: newFormData.telefone,
      },
      {
        key: "address",
        label: "Endereço",
        current: existingCustomer.address,
        next: computedNewAddress,
      },
      {
        key: "city",
        label: "Cidade",
        current: existingCustomer.city,
        next: newFormData.cidade,
      },
      {
        key: "state",
        label: "UF / Estado",
        current: existingCustomer.state,
        next: newFormData.uf,
      },
      {
        key: "rg",
        label: "RG / Doc. Complementar",
        current: existingCustomer.rg,
        next: newFormData.rg,
      },
      {
        key: "notes",
        label: "Observações",
        current: existingCustomer.notes,
        next: newFormData.notes,
      },
    ];

    return items.map((item) => {
      const cur = (item.current || "").trim();
      const nxt = (item.next || "").trim();
      const isDiff = Boolean(nxt && nxt.toLowerCase() !== cur.toLowerCase());
      return {
        key: item.key,
        label: item.label,
        currentValue: cur || "(vazio)",
        newValue: nxt || "(não informado)",
        isDifferent: isDiff,
      };
    });
  }, [existingCustomer, newFormData, computedNewAddress]);

  // Ao entrar em modo de comparação, pré-seleciona campos que têm novidades
  const handleStartCompare = () => {
    const initial: Record<string, boolean> = {};
    diffs.forEach((d) => {
      if (d.isDifferent) {
        initial[d.key] = true;
      }
    });
    setSelectedFields(initial);
    setViewMode("compare");
  };

  const handleToggleField = (key: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Executa UPDATE explícito solicitado pelo usuário
  const handleConfirmUpdate = async () => {
    if (!existingCustomer?.id || !companyId) return;

    const selectedKeys = Object.keys(selectedFields).filter((k) => selectedFields[k]);
    if (selectedKeys.length === 0) {
      toast.info("Nenhum campo selecionado para atualização.");
      return;
    }

    setIsUpdating(true);
    const loadingToast = toast.loading("Atualizando cadastro existente...");

    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (selectedFields.name && newFormData.nome?.trim()) {
        updatePayload.name = newFormData.nome.trim();
      }
      if (selectedFields.email && newFormData.email?.trim()) {
        updatePayload.email = newFormData.email.trim();
      }
      if (selectedFields.phone && newFormData.telefone?.trim()) {
        updatePayload.phone = newFormData.telefone.trim();
      }
      if (selectedFields.address && computedNewAddress?.trim()) {
        updatePayload.address = computedNewAddress.trim();
      }
      if (selectedFields.city && newFormData.cidade?.trim()) {
        updatePayload.city = newFormData.cidade.trim();
      }
      if (selectedFields.state && newFormData.uf?.trim()) {
        updatePayload.state = newFormData.uf.trim();
      }
      if (selectedFields.rg && newFormData.rg?.trim()) {
        updatePayload.rg = newFormData.rg.trim();
      }
      if (selectedFields.notes && newFormData.notes?.trim()) {
        const mergedNotes = existingCustomer.notes
          ? `${existingCustomer.notes}\n[Atualização]: ${newFormData.notes.trim()}`
          : newFormData.notes.trim();
        updatePayload.notes = mergedNotes;
      }

      // 1. UPDATE explícito no cliente existente
      const { error: updErr } = await supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", existingCustomer.id)
        .eq("company_id", companyId);

      if (updErr) throw updErr;

      // 2. Se houver arquivos recém-enviados, vincula ao cliente existente
      if (uploadedFiles.length > 0) {
        for (const uf of uploadedFiles) {
          try {
            await supabase.from("customer_documents").insert({
              customer_id: existingCustomer.id,
              company_id: companyId,
              file_name: uf.name,
              file_path: uf.path || "",
              file_type: uf.file?.type || "application/pdf",
              file_size: uf.size || 0,
            });
          } catch (docErr) {
            console.warn("Vínculo de documento aviso:", docErr);
          }
        }
      }

      // 3. Log de atividade
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("activity_logs").insert({
            company_id: companyId,
            user_id: user.id,
            module: "customers",
            action: "client_updated",
            resource_type: "client",
            resource_id: existingCustomer.id,
            metadata: {
              updated_fields: selectedKeys,
              cpf_cnpj: existingCustomer.cpf_cnpj,
            },
          });
        }
      } catch (logErr) {
        console.warn("Log de atividade:", logErr);
      }

      toast.dismiss(loadingToast);
      toast.success("Cadastro do cliente atualizado com sucesso!");
      onCustomerUpdated(existingCustomer.id);
      onClose();
    } catch (err: any) {
      console.error("Erro ao atualizar cliente existente:", err);
      toast.dismiss(loadingToast);
      toast.error(err.message || "Erro ao atualizar informações do cliente.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isUpdating && !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-2xl">
        {viewMode === "options" ? (
          <div>
            <DialogHeader className="text-left pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200/60 shadow-xs">
                <AlertCircle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-[#0B1739]">
                Este cliente já está cadastrado nesta empresa
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
                Já existe um registro com o documento <strong className="text-slate-800">{existingCustomer?.cpf_cnpj}</strong> associado a:
              </DialogDescription>

              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cadastro Existente</span>
                  <span className="text-sm font-bold text-[#0B1739] block mt-0.5">{existingCustomer?.name}</span>
                  <span className="text-xs text-slate-500">{existingCustomer?.cpf_cnpj} • {existingCustomer?.city || "Cidade não informada"}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Ativo
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <p className="text-xs font-semibold text-slate-700">Como você deseja prosseguir?</p>

              {/* OPÇÃO 1: ABRIR CADASTRO EXISTENTE */}
              <button
                type="button"
                onClick={() => {
                  if (existingCustomer) onOpenExisting(existingCustomer.id);
                  onClose();
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#075BFF] hover:bg-blue-50/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                      1. Abrir cadastro existente
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Visualizar a ficha completa, processos e embarcações deste cliente já registrado.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#075BFF] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* OPÇÃO 2: ATUALIZAR INFORMAÇÕES */}
              <button
                type="button"
                onClick={handleStartCompare}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#075BFF] hover:bg-blue-50/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                      2. Atualizar informações
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Comparar os dados digitados ou extraídos do documento e escolher quais campos atualizar.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#075BFF] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* OPÇÃO 3: CORRIGIR CPF/CNPJ */}
              <button
                type="button"
                onClick={() => {
                  onFixDocument();
                  onClose();
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B1739]">
                      3. Corrigir CPF/CNPJ
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Voltar ao formulário para corrigir o documento digitado se houve algum engano.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Fechar
              </button>
            </DialogFooter>
          </div>
        ) : (
          /* MODO DE COMPARAÇÃO EXPLÍCITA */
          <div>
            <DialogHeader className="text-left pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode("options")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar às opções</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  {diffs.filter((d) => d.isDifferent).length} campo(s) com alterações
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-[#0B1739] mt-2">
                Comparação e Atualização de Informações
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Selecione os campos que deseja atualizar no registro de <strong>{existingCustomer?.name}</strong>. Nenhum dado será sobrescrito sem a sua confirmação.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {diffs.map((diff) => {
                const isChecked = Boolean(selectedFields[diff.key]);
                return (
                  <div
                    key={diff.key}
                    onClick={() => diff.isDifferent && handleToggleField(diff.key)}
                    className={`p-3 rounded-xl border transition-all text-xs ${
                      diff.isDifferent
                        ? isChecked
                          ? "border-[#075BFF] bg-blue-50/20 cursor-pointer shadow-2xs"
                          : "border-amber-200/80 bg-amber-50/20 hover:border-amber-300 cursor-pointer"
                        : "border-slate-100 bg-slate-50/60 opacity-60 cursor-default"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B1739]">{diff.label}</span>
                          {diff.isDifferent ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                              Novo valor
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sem alteração</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Valor atual no sistema:</span>
                            <span className="text-slate-700 font-medium break-words">{diff.currentValue}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Novo valor informado:</span>
                            <span className={`font-semibold break-words ${diff.isDifferent ? "text-[#075BFF]" : "text-slate-600"}`}>
                              {diff.newValue}
                            </span>
                          </div>
                        </div>
                      </div>

                      {diff.isDifferent && (
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleField(diff.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-[#075BFF] focus:ring-[#075BFF] cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setViewMode("options")}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isUpdating || Object.values(selectedFields).filter(Boolean).length === 0}
                onClick={handleConfirmUpdate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Atualizando cadastro...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar atualização ({Object.values(selectedFields).filter(Boolean).length})</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
