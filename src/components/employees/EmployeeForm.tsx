import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  FileBadge, 
  FileText, 
  ShieldCheck, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  Info, 
  Lock, 
  Send,
  Building,
  UserCheck,
  UserX,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface EmployeePermissions {
  can_generate_docs: boolean;
  can_review_docs: boolean;
  can_attach_protocols: boolean;
  can_attach_issued: boolean;
  can_view_customers: boolean;
  can_view_vessels: boolean;
  can_view_billing: boolean;
}

export interface EmployeeData {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  cpf: string;
  notes: string;
  status: "active" | "inactive";
  document_name: string;
  document_role: string;
  professional_registry: string;
  avatar_url?: string;
  signature_url?: string;
  permissions: EmployeePermissions;
  has_system_access?: boolean;
  user_id?: string;
  created_at: string;
  created_by_name?: string;
  updated_at?: string;
  updated_by_name?: string;
}

interface EmployeeFormProps {
  employeeId?: string; // Se fornecido, modo edição; senão, modo criação
  returnTo?: string; // Rota para redirecionar após salvar (ex: /processes/:id/revisar-documento)
  onSuccess?: (employee: EmployeeData) => void;
}

export function EmployeeForm({ employeeId, returnTo, onSuccess }: EmployeeFormProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  const isEditing = Boolean(employeeId);

  // Estados de formulário
  const [formData, setFormData] = useState<EmployeeData>({
    id: employeeId || `emp-${Date.now()}`,
    name: "",
    role: "",
    email: "",
    phone: "",
    cpf: "",
    notes: "",
    status: "active",
    document_name: "",
    document_role: "",
    professional_registry: "",
    avatar_url: "",
    signature_url: "",
    permissions: {
      can_generate_docs: true,
      can_review_docs: true,
      can_attach_protocols: true,
      can_attach_issued: true,
      can_view_customers: true,
      can_view_vessels: true,
      can_view_billing: false,
    },
    has_system_access: false,
    created_at: new Date().toISOString(),
  });

  const [companyName, setCompanyName] = useState<string>("Minha Empresa");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Diálogo de confirmação para desativação
  const [showDeactivateDialog, setShowDeactivateDialog] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<"active" | "inactive" | null>(null);

  // Diálogo de Convite de Acesso
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false);
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  // Carregar dados da empresa e funcionário (se edição)
  useEffect(() => {
    async function loadData() {
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. Carregar dados da empresa
        const { data: compData, error: compErr } = await supabase
          .from("companies")
          .select("id, name, document_template_map")
          .eq("id", companyId)
          .single();

        if (compErr) throw compErr;
        if (compData) {
          const docMap = (compData.document_template_map as any) || {};
          setCompanyName(docMap.fantasy_name || compData.name || "Minha Empresa");

          // 2. Se for edição, buscar o funcionário
          if (employeeId) {
            let foundEmp: EmployeeData | null = null;

            // Verificar no document_template_map.employees da empresa
            const employeesList = docMap.employees || (compData as any)?.metadata?.employees || [];
            const matched = employeesList.find((e: any) => e.id === employeeId);

            if (matched) {
              foundEmp = {
                id: matched.id,
                name: matched.name || "",
                role: matched.role || "",
                email: matched.email || "",
                phone: matched.phone || "",
                cpf: matched.cpf || "",
                notes: matched.notes || "",
                status: matched.status || "active",
                document_name: matched.document_name || matched.name || "",
                document_role: matched.document_role || matched.role || "",
                professional_registry: matched.professional_registry || "",
                avatar_url: matched.avatar_url || "",
                signature_url: matched.signature_url || "",
                permissions: matched.permissions || {
                  can_generate_docs: true,
                  can_review_docs: true,
                  can_attach_protocols: true,
                  can_attach_issued: true,
                  can_view_customers: true,
                  can_view_vessels: true,
                  can_view_billing: false,
                },
                has_system_access: Boolean(matched.has_system_access),
                created_at: matched.created_at || new Date().toISOString(),
              };
            } else {
              // Tentar buscar na tabela profiles (caso seja um perfil de usuário existente)
              const { data: profData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", employeeId)
                .eq("company_id", companyId)
                .maybeSingle();

              if (profData) {
                foundEmp = {
                  id: profData.id,
                  name: profData.name || "",
                  role: profData.role === "company_admin" || profData.role === "admin" ? "Administrador / Despachante" : "Operador Náutico",
                  email: profData.email || "",
                  phone: profData.phone || "",
                  cpf: "",
                  notes: "",
                  status: "active",
                  document_name: profData.name || "",
                  document_role: profData.role === "company_admin" || profData.role === "admin" ? "Administrador / Despachante" : "Operador Náutico",
                  professional_registry: "",
                  avatar_url: "",
                  permissions: {
                    can_generate_docs: true,
                    can_review_docs: true,
                    can_attach_protocols: true,
                    can_attach_issued: true,
                    can_view_customers: true,
                    can_view_vessels: true,
                    can_view_billing: profData.role === "company_admin",
                  },
                  has_system_access: true,
                  user_id: profData.id,
                  created_at: profData.created_at,
                };
              }
            }

            if (foundEmp) {
              setFormData(foundEmp);
            } else {
              toast.error("Funcionário não encontrado.");
              navigate({ to: "/settings", search: { tab: "funcionarios" } });
            }
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do funcionário:", err);
        toast.error("Erro ao carregar dados da empresa ou funcionário.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [companyId, employeeId, navigate]);

  // Formatação de CPF
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setFormData((prev) => ({ ...prev, cpf: formatted }));
    if (errors.cpf) setErrors((prev) => ({ ...prev, cpf: "" }));
  };

  // Formatação de Telefone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    } else if (raw.length > 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  // Upload de Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !companyId) return;

    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg")) {
      toast.error("Formato inválido. Selecione uma foto em formato PNG ou JPG.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo de 2MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `employees/${companyId}/${formData.id}_avatar_${Date.now()}.${ext}`;

      const uploadRes = await uploadToBucket("company-logos", filePath, file, {
        upsert: true,
        contentType: file.type,
      });

      setFormData((prev) => ({ ...prev, avatar_url: uploadRes.path }));
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar foto:", err);
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Upload de Assinatura Visual
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !companyId) return;

    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("svg+xml")) {
      toast.error("Formato inválido. Selecione uma imagem PNG, JPG ou SVG.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("O arquivo de assinatura deve ter até 2MB.");
      return;
    }

    try {
      setIsUploadingSignature(true);
      const ext = file.name.split(".").pop() || "png";
      const filePath = `employees/${companyId}/${formData.id}_sig_${Date.now()}.${ext}`;

      const uploadRes = await uploadToBucket("company-logos", filePath, file, {
        upsert: true,
        contentType: file.type,
      });

      setFormData((prev) => ({ ...prev, signature_url: uploadRes.path }));
      toast.success("Assinatura visual enviada.");
    } catch (err: any) {
      console.error("Erro ao enviar assinatura visual:", err);
      toast.error("Erro ao fazer upload da assinatura visual.");
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // Mudança de Status com Confirmação
  const handleStatusClick = (newStatus: "active" | "inactive") => {
    if (newStatus === "inactive" && formData.status === "active") {
      setPendingStatus("inactive");
      setShowDeactivateDialog(true);
    } else {
      setFormData((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const confirmDeactivation = () => {
    setFormData((prev) => ({ ...prev, status: "inactive" }));
    setShowDeactivateDialog(false);
    setPendingStatus(null);
    toast.info("Status alterado para Inativo.", {
      description: "O funcionário não aparecerá para novos documentos, mas seus registros históricos serão preservados.",
    });
  };

  // Validação do Formulário
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!(formData.name || "").trim()) {
      newErrors.name = "Nome completo é obrigatório.";
    }

    if (!(formData.role || "").trim()) {
      newErrors.role = "Cargo ou função é obrigatório.";
    }

    if ((formData.email || "").trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "E-mail profissional inválido.";
      }
    }

    if ((formData.cpf || "").trim()) {
      const cleanCpf = formData.cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        newErrors.cpf = "CPF deve conter 11 dígitos.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar Funcionário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor, corrija os erros indicados nos campos.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não identificada na sessão atual.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentUserName = profile?.name || user?.email?.split("@")[0] || "Administrador";

      // 1. Obter lista atual de funcionários da empresa no document_template_map
      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("id, document_template_map")
        .eq("id", companyId)
        .single();

      if (compErr) throw compErr;

      const currentDocMap = (compData?.document_template_map as any) || {};
      const employees: EmployeeData[] = currentDocMap.employees || (compData as any)?.metadata?.employees || [];

      // 2. Verificar duplicidade de e-mail ou CPF dentro da mesma empresa
      const cleanEmail = (formData.email || "").trim();
      const cleanCpf = (formData.cpf || "").trim().replace(/\D/g, "");

      const duplicate = employees.find((emp) => {
        if (emp.id === formData.id) return false; // Permite o próprio em edição
        const emailMatch = Boolean(cleanEmail && emp.email?.toLowerCase() === cleanEmail.toLowerCase());
        const cpfMatch = Boolean(cleanCpf && emp.cpf?.replace(/\D/g, "") === cleanCpf);
        return emailMatch || cpfMatch;
      });

      if (duplicate) {
        if (cleanEmail && duplicate.email?.toLowerCase() === cleanEmail.toLowerCase()) {
          setErrors((prev) => ({ ...prev, email: "Já existe outro funcionário cadastrado com este e-mail nesta empresa." }));
        }
        if (cleanCpf && duplicate.cpf?.replace(/\D/g, "") === cleanCpf) {
          setErrors((prev) => ({ ...prev, cpf: "Já existe outro funcionário cadastrado com este CPF nesta empresa." }));
        }
        toast.error("Duplicidade detectada: e-mail ou CPF já cadastrado na empresa.");
        setIsSaving(false);
        return;
      }

      // 3. Montar objeto do funcionário atualizado
      const employeePayload: EmployeeData = {
        ...formData,
        document_name: (formData.document_name || "").trim() || (formData.name || "").trim(),
        document_role: (formData.document_role || "").trim() || (formData.role || "").trim(),
        created_at: isEditing ? formData.created_at : now,
        created_by_name: isEditing ? formData.created_by_name : currentUserName,
        updated_at: now,
        updated_by_name: currentUserName,
      };

      let updatedEmployees: EmployeeData[];
      if (isEditing) {
        const index = employees.findIndex((e) => e.id === formData.id);
        if (index >= 0) {
          updatedEmployees = [...employees];
          updatedEmployees[index] = employeePayload;
        } else {
          updatedEmployees = [...employees, employeePayload];
        }
      } else {
        updatedEmployees = [...employees, employeePayload];
      }

      // 4. Salvar na tabela companies em document_template_map (jsonb real do banco)
      const updatedDocMap = {
        ...currentDocMap,
        employees: updatedEmployees,
      };

      const { error: updateErr } = await supabase
        .from("companies")
        .update({
          document_template_map: updatedDocMap,
          updated_at: now,
        } as any)
        .eq("id", companyId);

      if (updateErr) throw updateErr;

      toast.success(
        isEditing ? "Funcionário atualizado com sucesso!" : "Funcionário cadastrado com sucesso!",
        {
          description: "Os dados foram salvos e já estão disponíveis para a equipe.",
        }
      );

      if (onSuccess) {
        onSuccess(employeePayload);
      }

      // Se houver returnTo (ex: veio do fluxo de revisão/geração de documento), retornar
      if (returnTo) {
        window.location.href = returnTo;
      } else {
        // Retornar para a tela de configurações na aba funcionários
        navigate({
          to: "/settings",
          search: { tab: "funcionarios" },
        });
      }
    } catch (err: any) {
      console.error("Erro ao salvar funcionário:", err);
      toast.error(err?.message || "Erro ao salvar funcionário. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Enviar convite de acesso
  const handleSendInvite = async () => {
    if (!formData.email) {
      toast.error("Informe um e-mail profissional para enviar o convite de acesso.");
      return;
    }

    setIsSendingInvite(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`Convite de acesso enviado para ${formData.email}!`, {
        description: "O colaborador receberá as instruções para criar sua senha de acesso ao sistema.",
      });
      setShowInviteDialog(false);
    } catch (err) {
      toast.error("Erro ao enviar convite.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando dados do funcionário...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1739] font-sans pb-16">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3">
            {/* Link Voltar */}
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#075BFF] transition-colors w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar às configurações</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1739]">
                    {isEditing ? "Editar funcionário" : "Cadastrar funcionário"}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#075BFF] border border-blue-100">
                    <Building className="h-3 w-3" />
                    {companyName}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {isEditing
                    ? "Atualize as informações, permissões e dados para documentos do membro da equipe."
                    : "Adicione um funcionário à equipe da empresa."}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-400 font-medium">Status do membro:</span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                    formData.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {formData.status === "active" ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <UserX className="h-3.5 w-3.5" />
                      Inativo
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORMULÁRIO PRINCIPAL */}
      {/* ========================================================================= */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: DADOS PRINCIPAIS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B1739]">Dados do funcionário</h2>
                <p className="text-xs text-slate-400">
                  Informações profissionais e de contato do membro da equipe.
                </p>
              </div>
            </div>

            {/* Foto / Avatar Opcional */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept=".png,.jpg,.jpeg"
                onChange={handleAvatarUpload}
              />
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt={formData.name || "Foto"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-[#075BFF] font-bold text-xl uppercase">
                    {formData.name ? formData.name.slice(0, 2) : <User className="h-8 w-8 text-slate-300" />}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-[#0B1739]">Foto ou avatar do funcionário (opcional)</h4>
                <p className="text-[11px] text-slate-400">
                  Formatos aceitos: JPG ou PNG (máx. 2MB). A foto não é exibida em documentos oficiais sem modelo específico.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{formData.avatar_url ? "Alterar foto" : "Enviar foto"}</span>
                  </button>
                  {formData.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, avatar_url: "" }))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de Campos Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Nome completo <strong className="text-red-500">*</strong></span>
                  {errors.name && <span className="text-[11px] text-red-500 font-normal">{errors.name}</span>}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  placeholder="Ex: João Carlos da Silva"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                    errors.name
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* Cargo ou Função */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Cargo ou função <strong className="text-red-500">*</strong></span>
                  {errors.role && <span className="text-[11px] text-red-500 font-normal">{errors.role}</span>}
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={(e) => {
                    setFormData({ ...formData, role: e.target.value });
                    if (errors.role) setErrors({ ...errors, role: "" });
                  }}
                  placeholder="Ex: Despachante Náutico / Assistente"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                    errors.role
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* E-mail Profissional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>E-mail profissional</span>
                  {errors.email && <span className="text-[11px] text-red-500 font-normal">{errors.email}</span>}
                </label>
                <div className="relative">
                  <Mail className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    placeholder="joao@empresa.com.br"
                    className={`w-full bg-white border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                      errors.email
                        ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CPF */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>CPF (opcional para documentos)</span>
                  {errors.cpf && <span className="text-[11px] text-red-500 font-normal">{errors.cpf}</span>}
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                    errors.cpf
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* Observações Internas */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Observações internas</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações internas sobre disponibilidade, filial de atendimento ou especialidades..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Aviso e Distinção Explícita de Responsabilidade Documental */}
            <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3 text-blue-900">
                <ShieldCheck className="h-5 w-5 text-[#075BFF] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[#0B1739]">
                    Cadastro para Responsabilidade Documental
                  </p>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed max-w-2xl">
                    Este membro será listado como responsável ou preparador ao redigir requerimentos, minutas e declarações da empresa. <strong>Cadastrar um funcionário aqui não cria acesso de login nem envia convites por acidente ao sistema</strong>.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-8 sm:pl-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white border border-blue-200 text-[#075BFF] shadow-2xs">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Responsável Documental</span>
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: STATUS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#0B1739]">Status do cadastro</h2>
              <p className="text-xs text-slate-400">
                Determine se este funcionário está ativo para ser selecionado em novos documentos e processos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => handleStatusClick("active")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  formData.status === "active"
                    ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/10"
                    : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    formData.status === "active"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {formData.status === "active" && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">Ativo</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aparece normalmente na seleção de responsáveis e pode responder por novas minutas e processos.
                  </p>
                </div>
              </div>

              <div
                onClick={() => handleStatusClick("inactive")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  formData.status === "inactive"
                    ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/10"
                    : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    formData.status === "inactive"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {formData.status === "inactive" && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">Inativo</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Não aparecerá para novas gerações. Todos os documentos e processos históricos continuam preservados.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: DADOS PARA DOCUMENTOS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold">
                <FileBadge className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B1739]">Identificação nos documentos</h2>
                <p className="text-xs text-slate-400">
                  Dados copiados para novas minutas e requerimentos gerados no sistema.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome nos Documentos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nome exibido no documento</label>
                <input
                  type="text"
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  placeholder={formData.name || "Ex: João Carlos da Silva"}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400">Se vazio, usará o nome completo principal.</p>
              </div>

              {/* Cargo nos Documentos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Função ou cargo exibido</label>
                <input
                  type="text"
                  value={formData.document_role}
                  onChange={(e) => setFormData({ ...formData, document_role: e.target.value })}
                  placeholder={formData.role || "Ex: Despachante Náutico Credenciado"}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Registro Profissional */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Registro profissional (quando aplicável)</label>
                <input
                  type="text"
                  name="professional_registry"
                  value={formData.professional_registry}
                  onChange={(e) => setFormData({ ...formData, professional_registry: e.target.value })}
                  placeholder="Ex: Registro CP nº 12345/2024, CREA 00000-D/SP, OAB/SP 000.000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Assinatura Visual Opcional */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
              <input
                type="file"
                ref={signatureInputRef}
                className="hidden"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleSignatureUpload}
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">Assinatura visual ou rubrica (opcional)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Utilizada exclusivamente em modelos que preveem rubrica visual de conferência.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={isUploadingSignature}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingSignature ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{formData.signature_url ? "Substituir rubrica" : "Enviar rubrica"}</span>
                  </button>
                  {formData.signature_url && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, signature_url: "" }))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>

              {formData.signature_url && (
                <div className="h-20 w-48 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                  <img
                    src={formData.signature_url}
                    alt="Rubrica"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  A imagem visual é apenas ilustrativa para minutas internas. Ela não substitui a assinatura digital qualificada do GOV.BR ou certificado ICP-Brasil nos documentos oficiais.
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: PERMISSÕES ESPECÍFICAS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">Permissões operacionais</h2>
                  <p className="text-xs text-slate-400">
                    Defina quais atividades este funcionário está autorizado a desempenhar no sistema.
                  </p>
                </div>
              </div>

              {/* Botão Convite de Acesso */}
              <button
                type="button"
                onClick={() => setShowInviteDialog(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-[#075BFF] border border-blue-200/80 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Convidar para acessar o sistema</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  key: "can_generate_docs",
                  title: "Pode gerar documentos",
                  desc: "Permite selecionar modelos e gerar minutas de requerimentos e declarações.",
                },
                {
                  key: "can_review_docs",
                  title: "Pode revisar documentos",
                  desc: "Acesso à tela de revisão de minutas e controle de qualidade.",
                },
                {
                  key: "can_attach_protocols",
                  title: "Pode anexar protocolos",
                  desc: "Permite registrar números e comprovantes de entrada na Capitania.",
                },
                {
                  key: "can_attach_issued",
                  title: "Pode anexar documentos emitidos",
                  desc: "Permite anexar o TIE/TIEM final emitido pela Autoridade Marítima.",
                },
                {
                  key: "can_view_customers",
                  title: "Pode consultar clientes",
                  desc: "Acesso à lista e fichas de clientes vinculados à empresa.",
                },
                {
                  key: "can_view_vessels",
                  title: "Pode consultar embarcações",
                  desc: "Acesso aos dados técnicos e histórico das embarcações.",
                },
                {
                  key: "can_view_billing",
                  title: "Pode visualizar faturamento",
                  desc: "Visualização de relatórios financeiros e faturamento da empresa.",
                },
              ].map((perm) => {
                const isChecked = Boolean(formData.permissions?.[perm.key as keyof EmployeePermissions]);
                return (
                  <label
                    key={perm.key}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      isChecked
                        ? "bg-blue-50/30 border-blue-200"
                        : "bg-slate-50/50 border-slate-200 opacity-70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          permissions: {
                            ...(prev.permissions || {
                              can_generate_docs: true,
                              can_review_docs: true,
                              can_attach_protocols: true,
                              can_attach_issued: true,
                              can_view_customers: true,
                              can_view_vessels: true,
                              can_view_billing: false,
                            }),
                            [perm.key]: e.target.checked,
                          },
                        }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-[#075BFF] focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[#0B1739]">{perm.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">{perm.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BARRA DE AÇÕES INFERIOR */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
            <Link
              to="/settings"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold text-center transition-colors cursor-pointer"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? "Salvando..." : "Salvar funcionário"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* DIÁLOGO: CONFIRMAÇÃO DE DESATIVAÇÃO */}
      {/* ========================================================================= */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span>Desativar funcionário?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2 space-y-2">
              <p>
                Ao desativar este funcionário:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Ele <strong>não aparecerá</strong> na lista de seleção para novos documentos e processos.</li>
                <li>Todos os <strong>documentos e processos históricos</strong> já gerados continuam integralmente preservados com seu nome vinculado.</li>
                <li>Nenhum dado é apagado fisicamente.</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowDeactivateDialog(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeactivation}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
            >
              Confirmar desativação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIÁLOGO: CONVITE PARA ACESSO AO SISTEMA */}
      {/* ========================================================================= */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <Send className="h-5 w-5 text-[#075BFF]" />
              <span>Convidar para acessar o sistema</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2 space-y-2">
              <p>
                Um link de convite seguro será enviado para o e-mail:
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-[#0B1739]">
                {formData.email || "E-mail não informado no cadastro"}
              </div>
              <p className="text-[11px] text-slate-400">
                O colaborador poderá definir sua própria senha de forma criptografada. Nenhuma credencial é exposta.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowInviteDialog(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={!formData.email || isSendingInvite}
              onClick={handleSendInvite}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSendingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{isSendingInvite ? "Enviando..." : "Enviar convite"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
