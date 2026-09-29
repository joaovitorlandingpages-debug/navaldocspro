import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { 
  ArrowLeft, 
  Paperclip, 
  Calendar, 
  ChevronDown, 
  Loader2, 
  FileUp, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  User,
  X
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BR_UFS, 
  maskCPF, 
  maskCNPJ, 
  maskCEP, 
  maskPhone, 
  maskDate, 
  isValidCPF, 
  isValidCNPJ, 
  fetchAddressByCEP 
} from "@/lib/br-format";
import { 
  CustomerDocumentUploadModal, 
  ExtractedCustomerData, 
  UploadedCustomerFile 
} from "@/components/customers/CustomerDocumentUploadModal";
import { safeString } from "@/utils/safe-string";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/customers/novo")({
  validateSearch: (search: Record<string, unknown>): { from?: string; category?: string; services?: string } => ({
    from: (search.from as string) || undefined,
    category: (search.category as string) || undefined,
    services: (search.services as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NovoClientePage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type ClientType = "pf" | "pj";

function NovoClientePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { profile } = useAuth();

  // Contexto de retorno aos Serviços
  const fromServicos = search.from === "servicos";
  const returnCategory = (search.category as "profissional" | "esporte_recreio") || "esporte_recreio";
  const returnServices = search.services;

  // Tipo de cliente (PF ou PJ)
  const [clientType, setClientType] = useState<ClientType>("pf");

  // Dados do formulário
  const [formData, setFormData] = useState({
    // PF
    nome: "",
    cpf: "",
    dataNascimento: "",
    // PJ
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    nomeRepresentante: "",
    // Contato
    email: "",
    telefone: "",
    // Endereço
    cep: "",
    cidade: "",
    uf: "",
    logradouro: "",
    numero: "",
    bairro: "",
    complemento: "",
    // Campos adicionais
    rg: "",
    notes: "",
  });

  // Validação e Erros
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);

  // Modal de Upload / Extração OCR
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCustomerFile[]>([]);
  const [extractedBadge, setExtractedBadge] = useState(false);

  // Confirmação ao sair com dados preenchidos
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Alerta de duplicidade
  const [duplicateCustomer, setDuplicateCustomer] = useState<{ id: string; name: string; cpf_cnpj: string } | null>(null);

  // Detecta se há dados preenchidos para avisar antes de sair
  const hasUnsavedChanges = useMemo(() => {
    return Boolean(
      formData.nome ||
      formData.cpf ||
      formData.razaoSocial ||
      formData.cnpj ||
      formData.email ||
      formData.telefone ||
      formData.logradouro
    );
  }, [formData]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else if (fromServicos) {
      navigate({
        to: "/servicos/selecionar",
        search: {
          category: returnCategory,
          ...(returnServices ? { services: returnServices } : {}),
        } as any,
      });
    } else {
      navigate({ to: "/customers" });
    }
  };

  // Manipulação de Mudanças com Máscaras
  const handleChange = (field: string, value: string) => {
    let maskedValue = value;

    if (field === "cpf") maskedValue = maskCPF(value);
    else if (field === "cnpj") maskedValue = maskCNPJ(value);
    else if (field === "cep") maskedValue = maskCEP(value);
    else if (field === "telefone") maskedValue = maskPhone(value);
    else if (field === "dataNascimento") maskedValue = maskDate(value);

    setFormData((prev) => ({ ...prev, [field]: maskedValue }));

    // Limpa erro do campo modificado
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    // Auto-busca de CEP ao completar 8 dígitos (9 caracteres com máscara)
    if (field === "cep" && maskedValue.replace(/\D/g, "").length === 8) {
      handleCepAutoFill(maskedValue);
    }
  };

  const handleCepAutoFill = async (cepValue: string) => {
    setIsSearchingCEP(true);
    try {
      const address = await fetchAddressByCEP(cepValue);
      if (address) {
        setFormData((prev) => ({
          ...prev,
          logradouro: address.logradouro || prev.logradouro,
          bairro: address.bairro || prev.bairro,
          cidade: address.cidade || prev.cidade,
          uf: address.uf || prev.uf,
          complemento: address.complemento || prev.complemento,
        }));
        toast.success("Endereço preenchido pelo CEP!");
      }
    } catch (err) {
      console.warn("Erro ao buscar CEP:", err);
    } finally {
      setIsSearchingCEP(false);
    }
  };

  // Aplicação dos Dados Extraídos dos Documentos
  const handleDataExtracted = (extracted: ExtractedCustomerData, files: UploadedCustomerFile[]) => {
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    }

    if (extracted.type === "pj" || (extracted.cpf_cnpj && extracted.cpf_cnpj.replace(/\D/g, "").length > 11)) {
      setClientType("pj");
    }

    setFormData((prev) => ({
      ...prev,
      nome: extracted.name && clientType === "pf" ? extracted.name : prev.nome,
      razaoSocial: extracted.name && clientType === "pj" ? extracted.name : prev.razaoSocial,
      cpf: extracted.cpf_cnpj && clientType === "pf" ? maskCPF(extracted.cpf_cnpj) : prev.cpf,
      cnpj: extracted.cpf_cnpj && clientType === "pj" ? maskCNPJ(extracted.cpf_cnpj) : prev.cnpj,
      rg: extracted.rg || prev.rg,
      dataNascimento: extracted.birth_date ? maskDate(extracted.birth_date) : prev.dataNascimento,
      email: extracted.email || prev.email,
      telefone: extracted.phone ? maskPhone(extracted.phone) : prev.telefone,
      logradouro: extracted.logradouro || prev.logradouro,
      numero: extracted.numero || prev.numero,
      bairro: extracted.bairro || prev.bairro,
      cidade: extracted.cidade || prev.cidade,
      uf: extracted.uf || prev.uf,
      cep: extracted.cep ? maskCEP(extracted.cep) : prev.cep,
      complemento: extracted.complemento || prev.complemento,
    }));

    setExtractedBadge(true);
  };

  // Validação do Formulário
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (clientType === "pf") {
      if (!formData.nome.trim()) {
        newErrors.nome = "Nome completo é obrigatório.";
      }
      if (!formData.cpf.trim()) {
        newErrors.cpf = "CPF é obrigatório.";
      } else if (!isValidCPF(formData.cpf)) {
        newErrors.cpf = "CPF inválido.";
      }
    } else {
      if (!formData.razaoSocial.trim()) {
        newErrors.razaoSocial = "Razão social é obrigatória.";
      }
      if (!formData.cnpj.trim()) {
        newErrors.cnpj = "CNPJ é obrigatório.";
      } else if (!isValidCNPJ(formData.cnpj)) {
        newErrors.cnpj = "CNPJ inválido.";
      }
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "E-mail inválido.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor, preencha os campos obrigatórios corretamente.");
      return;
    }

    const companyId = profile?.company_id;
    if (!companyId) {
      toast.error("Espaço de trabalho não identificado. Recarregue a página.");
      return;
    }

    const docNumber = clientType === "pf" ? formData.cpf : formData.cnpj;
    const clientName = clientType === "pf" ? formData.nome.trim() : formData.razaoSocial.trim();

    setIsSubmitting(true);
    const loadingToast = toast.loading("Verificando e salvando cliente...");

    try {
      // 1. Verificação de duplicidade dentro da mesma empresa
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id, name, cpf_cnpj")
        .eq("company_id", companyId)
        .eq("cpf_cnpj", docNumber.trim())
        .maybeSingle();

      if (existingCustomer) {
        toast.dismiss(loadingToast);
        setIsSubmitting(false);
        setDuplicateCustomer(existingCustomer);
        return;
      }

      // 2. Montagem do endereço formatado
      const fullAddressParts = [];
      if (formData.logradouro.trim()) {
        let line = formData.logradouro.trim();
        if (formData.numero.trim()) line += `, ${formData.numero.trim()}`;
        if (formData.complemento.trim()) line += ` - ${formData.complemento.trim()}`;
        if (formData.bairro.trim()) line += ` - ${formData.bairro.trim()}`;
        fullAddressParts.push(line);
      }
      const fullAddress = fullAddressParts.join(" ") || null;

      // 3. Inserção no banco de dados
      const { data: newCustomer, error: insertError } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: clientName,
          cpf_cnpj: docNumber.trim(),
          email: formData.email.trim() || null,
          phone: formData.telefone.trim() || null,
          address: fullAddress,
          city: formData.cidade.trim() || null,
          state: formData.uf.trim() || null,
          rg: formData.rg.trim() || null,
          notes: formData.nomeRepresentante.trim()
            ? `Representante: ${formData.nomeRepresentante.trim()}${formData.notes ? `\n${formData.notes}` : ""}`
            : (formData.notes.trim() || null),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Se houver arquivos de documentos anexados, vincula ao cliente
      if (uploadedFiles.length > 0 && newCustomer?.id) {
        for (const uf of uploadedFiles) {
          try {
            await supabase.from("customer_documents").insert({
              customer_id: newCustomer.id,
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

      // 5. Registra log de atividade
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("activity_logs").insert({
            company_id: companyId,
            user_id: user.id,
            module: "customers",
            action: "client_created",
            resource_type: "client",
            resource_id: newCustomer.id,
            metadata: { name: clientName, cpf_cnpj: docNumber, type: clientType },
          });
        }
      } catch (logErr) {
        console.warn("Log de atividade:", logErr);
      }

      toast.dismiss(loadingToast);
      toast.success("Cliente cadastrado com sucesso!");

      if (fromServicos && newCustomer?.id) {
        navigate({
          to: "/servicos/selecionar",
          search: {
            category: returnCategory,
            customerId: newCustomer.id,
            ...(returnServices ? { services: returnServices } : {}),
          } as any,
        });
      } else {
        navigate({ to: "/customers" });
      }
    } catch (err: any) {
      console.error("Erro ao cadastrar cliente:", err);
      toast.dismiss(loadingToast);
      toast.error(err.message || "Erro ao salvar cliente. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4">
      {/* 1. NAVEGAÇÃO "VOLTAR" */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer mb-3 group"
        aria-label={fromServicos ? "Voltar aos serviços" : "Voltar para a relação de clientes"}
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>{fromServicos ? "Voltar aos serviços" : "Voltar"}</span>
      </button>

      {/* 2. TÍTULO E SUBTÍTULO */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Cadastrar cliente
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Preencha os dados ou anexe documentos para preencher automaticamente.
        </p>
      </div>

      {/* 3. PAINEL AZUL-CLARO "PREENCHER COM DOCUMENTOS" */}
      <div className="bg-[#EEF4FF] border border-[#D8E6FF] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B1739]">
              Preencher com documentos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Anexe os arquivos e revise os dados identificados antes de salvar.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end shrink-0">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#075BFF] bg-white text-[#075BFF] hover:bg-blue-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            <Paperclip className="h-4 w-4 rotate-[-45deg]" />
            <span>Anexar documentos</span>
          </button>
          <span className="text-[10px] text-slate-400 mt-1.5 pl-1 sm:pl-0">
            PDF, JPG ou PNG
          </span>
        </div>
      </div>

      {/* Banner Informativo se Dados Foram Extraídos */}
      {extractedBadge && (
        <div className="mb-6 p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#075BFF] shrink-0" />
            <span>Confira todos os dados extraídos do documento. A leitura automática pode cometer erros. Corrija as informações antes de salvar.</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractedBadge(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 4. FORMULÁRIO PRINCIPAL */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* SEÇÃO: DADOS DO CLIENTE */}
        <div>
          <h2 className="text-base font-bold text-[#0B1739] mb-4">
            Dados do cliente
          </h2>

          {/* SELETOR: PESSOA FÍSICA / PESSOA JURÍDICA */}
          <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setClientType("pf");
                setErrors({});
              }}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                clientType === "pf"
                  ? "bg-[#075BFF] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pessoa física
            </button>
            <button
              type="button"
              onClick={() => {
                setClientType("pj");
                setErrors({});
              }}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                clientType === "pj"
                  ? "bg-[#075BFF] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pessoa jurídica
            </button>
          </div>

          {/* CAMPOS PESSOA FÍSICA */}
          {clientType === "pf" ? (
            <div className="space-y-4">
              {/* Nome completo */}
              <div>
                <label htmlFor="nome" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Digite o nome completo"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.nome
                      ? "border-red-400 focus:ring-red-200"
                      : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                  }`}
                />
                {errors.nome && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.nome}</p>
                )}
              </div>

              {/* Grid 2 colunas: CPF + Data de nascimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cpf" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cpf"
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.cpf
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                    }`}
                  />
                  {errors.cpf && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.cpf}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dataNascimento" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Data de nascimento
                  </label>
                  <div className="relative">
                    <input
                      id="dataNascimento"
                      type="text"
                      value={formData.dataNascimento}
                      onChange={(e) => handleChange("dataNascimento", e.target.value)}
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                    <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Grid 2 colunas: E-mail + Telefone / WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="nome@exemplo.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="telefone"
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* CAMPOS PESSOA JURÍDICA */
            <div className="space-y-4">
              {/* Razão social */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Razão social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.razaoSocial}
                  onChange={(e) => handleChange("razaoSocial", e.target.value)}
                  placeholder="Digite a razão social"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.razaoSocial
                      ? "border-red-400 focus:ring-red-200"
                      : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                  }`}
                />
                {errors.razaoSocial && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.razaoSocial}</p>
                )}
              </div>

              {/* Grid 2 colunas: Nome fantasia + CNPJ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nome fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nomeFantasia}
                    onChange={(e) => handleChange("nomeFantasia", e.target.value)}
                    placeholder="Digite o nome fantasia"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleChange("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.cnpj
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                    }`}
                  />
                  {errors.cnpj && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.cnpj}</p>
                  )}
                </div>
              </div>

              {/* Grid 2 colunas: E-mail + Telefone / WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="nome@empresa.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Nome do representante */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome do representante legal (opcional)
                </label>
                <input
                  type="text"
                  value={formData.nomeRepresentante}
                  onChange={(e) => handleChange("nomeRepresentante", e.target.value)}
                  placeholder="Nome do responsável legal ou procurador"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO: ENDEREÇO */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-[#0B1739] mb-4">
            Endereço
          </h2>

          <div className="space-y-4">
            {/* Grid 3 colunas: CEP + Cidade + UF */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* CEP */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CEP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleChange("cep", e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                  {isSearchingCEP && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[#075BFF] animate-spin" />
                  )}
                </div>
              </div>

              {/* Cidade */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => handleChange("cidade", e.target.value)}
                  placeholder="Digite a cidade"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              {/* UF */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  UF
                </label>
                <div className="relative">
                  <select
                    value={formData.uf}
                    onChange={(e) => handleChange("uf", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8"
                  >
                    <option value="">Selecione</option>
                    {BR_UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid 2 colunas: Logradouro + Número */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-9">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.logradouro}
                  onChange={(e) => handleChange("logradouro", e.target.value)}
                  placeholder="Digite o logradouro (rua, avenida, etc.)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleChange("numero", e.target.value)}
                  placeholder="Digite o número"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>
            </div>

            {/* Grid 2 colunas: Bairro + Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => handleChange("bairro", e.target.value)}
                  placeholder="Digite o bairro"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => handleChange("complemento", e.target.value)}
                  placeholder="Digite o complemento (opcional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. RODAPÉ DO FORMULÁRIO */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">
              Os dados preenchidos automaticamente podem ser corrigidos antes de salvar.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-red-500 font-bold">*</span> Campos obrigatórios
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-save-customer"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando cliente...</span>
                </>
              ) : (
                <span>Salvar cliente</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL DE EXTRAÇÃO DE DOCUMENTOS */}
      <CustomerDocumentUploadModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        companyId={profile?.company_id || null}
        userId={profile?.id || undefined}
        existingCustomer={formData.cpf || formData.cnpj ? { cpf_cnpj: formData.cpf || formData.cnpj, name: formData.nome || formData.razaoSocial } : null}
        onDataExtracted={handleDataExtracted}
      />

      {/* CONFIRMAÇÃO DE SAÍDA COM DADOS NÃO SALVOS */}
      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Descartar alterações?"
        description="Você possui dados preenchidos que ainda não foram salvos. Tem certeza que deseja sair desta página?"
        confirmText="Sim, descartar e sair"
        cancelText="Continuar editando"
        variant="destructive"
        onConfirm={() => {
          setShowExitConfirm(false);
          if (fromServicos) {
            navigate({
              to: "/servicos/selecionar",
              search: {
                category: returnCategory,
                ...(returnServices ? { services: returnServices } : {}),
              } as any,
            });
          } else {
            navigate({ to: "/customers" });
          }
        }}
      />

      {/* DIÁLOGO DE CLIENTE JÁ CADASTRADO (DUPLICIDADE) */}
      <Dialog open={duplicateCustomer !== null} onOpenChange={(open) => !open && setDuplicateCustomer(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-150 shadow-xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              Cliente já cadastrado
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Já existe um cliente cadastrado com este documento ({duplicateCustomer?.cpf_cnpj}) no seu espaço de trabalho: <strong>{duplicateCustomer?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button
              type="button"
              onClick={() => setDuplicateCustomer(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Corrigir documento
            </button>
            <button
              type="button"
              onClick={() => {
                const existingId = duplicateCustomer?.id;
                setDuplicateCustomer(null);
                if (fromServicos && existingId) {
                  navigate({
                    to: "/servicos/selecionar",
                    search: {
                      category: returnCategory,
                      customerId: existingId,
                      ...(returnServices ? { services: returnServices } : {}),
                    } as any,
                  });
                } else {
                  navigate({ to: "/customers" });
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
            >
              {fromServicos ? "Usar este cliente" : "Ver na relação de clientes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
