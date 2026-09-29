import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Building, 
  Users, 
  Shield, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  UserCheck, 
  UserX,
  CheckCircle2, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Loader2, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Sliders, 
  Save, 
  AlertCircle, 
  Check, 
  Building2, 
  UserPlus, 
  Lock, 
  Eye,
  Info,
  ShieldCheck,
  User,
  Briefcase,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBucket, validateUploadSafe, MAX_LOGO_BYTES } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  cpf?: string;
  status: "Ativo" | "Inativo";
  document_name?: string;
  document_role?: string;
  professional_registry?: string;
  is_system_user?: boolean;
}

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>): {
    tab?: string;
  } => ({
    ...(search.tab ? { tab: search.tab as string } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <CompanySettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CompanySettingsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  // 4 Áreas Requeridas
  const [activeTab, setActiveTab] = useState<string>(searchParams.tab || "empresa");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos Dados da Empresa
  const [companyForm, setCompanyForm] = useState({
    name: "",
    fantasy_name: "",
    cnpj: "",
    email: "",
    phone: "",
    zip_code: "",
    state: "SP",
    city: "Santos",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    responsible_name: "",
    technical_responsible_name: "",
    technical_responsible_registry: "",
    pdf_footer_text: "",
    pdf_template: "classico",
    logo_url: "",
    updated_at: "",
    updated_by: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Estados de Funcionários
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [staffToDeactivate, setStaffToDeactivate] = useState<StaffMember | null>(null);
  const [isUpdatingStaffStatus, setIsUpdatingStaffStatus] = useState(false);

  // Estados de Preferências de Documentos
  const [preferences, setPreferences] = useState({
    autoAttachLogo: true,
    showTechnicalResponsibleOnFooter: true,
    notifyOnSignedUpload: true,
    pdfTemplate: "classico",
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Estados de Upload de Logo
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showRemoveLogoDialog, setShowRemoveLogoDialog] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar Dados da Empresa e Funcionários do Supabase
  const loadCompanyData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const { data: comp, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      if (comp) {
        const docMap = (comp.document_template_map as any) || {};
        const savedMeta = (comp as any).metadata || {};

        setCompanyForm({
          name: comp.name || "",
          fantasy_name: docMap.fantasy_name || savedMeta.fantasy_name || comp.name || "",
          cnpj: comp.cnpj || "",
          email: comp.email || comp.contact_email || "",
          phone: comp.phone || comp.contact_phone || "",
          zip_code: docMap.zip_code || savedMeta.zip_code || "",
          state: comp.state || docMap.state || savedMeta.state || "SP",
          city: comp.city || docMap.city || savedMeta.city || "Santos",
          street: docMap.street || comp.contact_address || "",
          number: docMap.number || savedMeta.number || "",
          complement: docMap.complement || savedMeta.complement || "",
          neighborhood: docMap.neighborhood || savedMeta.neighborhood || "",
          responsible_name: comp.responsible_name || docMap.responsible_name || "",
          technical_responsible_name: comp.technical_responsible_name || "",
          technical_responsible_registry: comp.technical_responsible_registry || "",
          pdf_footer_text: comp.pdf_footer_text || docMap.pdf_footer_text || "",
          pdf_template: comp.pdf_template || "classico",
          logo_url: comp.logo_url || comp.logo_primary_url || "",
          updated_at: comp.updated_at || comp.created_at || "",
          updated_by: docMap.updated_by_name || "Administrador",
        });

        if (docMap.preferences) {
          setPreferences((prev) => ({ ...prev, ...docMap.preferences }));
        }

        // Carregar funcionários cadastrados em document_template_map.employees
        const savedEmployees: any[] = docMap.employees || savedMeta.employees || [];
        const combinedStaff: StaffMember[] = [];

        savedEmployees.forEach((emp: any) => {
          combinedStaff.push({
            id: emp.id,
            name: emp.name,
            role: emp.role || "Despachante / Responsável",
            email: emp.email || "Sem e-mail",
            phone: emp.phone,
            cpf: emp.cpf,
            status: emp.status === "inactive" ? "Inativo" : "Ativo",
            document_name: emp.document_name,
            document_role: emp.document_role,
            professional_registry: emp.professional_registry,
            is_system_user: Boolean(emp.has_system_access || emp.user_id),
          });
        });

        // Buscar perfis para mesclar usuários autenticados da empresa
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .eq("company_id", companyId);

        if (profilesData && profilesData.length > 0) {
          profilesData.forEach((p: any) => {
            const alreadyExists = combinedStaff.some(
              (s) => s.id === p.id || (p.email && s.email.toLowerCase() === p.email.toLowerCase())
            );
            if (!alreadyExists) {
              combinedStaff.push({
                id: p.id,
                name: p.name || p.email?.split("@")[0] || "Usuário",
                role: p.role === "company_admin" || p.role === "admin" ? "Administrador / Despachante" : "Operador Náutico",
                email: p.email || "Sem e-mail",
                phone: p.phone,
                status: "Ativo",
                document_name: p.name,
                document_role: p.role === "company_admin" || p.role === "admin" ? "Despachante Responsável" : "Operador Náutico",
                is_system_user: true,
              });
            }
          });
        }

        setStaffList(combinedStaff);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da empresa:", err);
      toast.error("Erro ao carregar configurações.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // Atualiza a URL se a aba mudar
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate({
      search: () => ({ tab: tabId }),
      replace: true,
    } as any);
  };

  // Formatação de CNPJ
  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 14);
    let formatted = raw;
    if (raw.length > 12) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
    } else if (raw.length > 8) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    } else if (raw.length > 5) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
    }
    setCompanyForm((prev) => ({ ...prev, cnpj: formatted }));
    if (formErrors.cnpj) setFormErrors((prev) => ({ ...prev, cnpj: "" }));
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
    setCompanyForm((prev) => ({ ...prev, phone: formatted }));
    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: "" }));
  };

  // Busca Automática de CEP
  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    setCompanyForm((prev) => ({ ...prev, zip_code: formatted }));

    if (raw.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCompanyForm((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
          toast.success("Endereço preenchido via CEP!");
        }
      } catch (e) {
        console.error("Erro na busca de CEP:", e);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Validação de Dados da Empresa
  const validateCompanyForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!companyForm.name.trim()) {
      errors.name = "Razão social é obrigatória para emissão de requerimentos oficiais.";
    }

    if (!companyForm.cnpj.trim()) {
      errors.cnpj = "CNPJ é obrigatório para identificação formal perante a Capitania dos Portos.";
    } else {
      const cleanCnpj = companyForm.cnpj.replace(/\D/g, "");
      if (cleanCnpj.length !== 14) {
        errors.cnpj = "CNPJ incompleto (deve conter 14 dígitos).";
      }
    }

    if (!companyForm.email.trim()) {
      errors.email = "E-mail de contato é obrigatório para notificações.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email.trim())) {
      errors.email = "Formato de e-mail inválido.";
    }

    if (!companyForm.phone.trim()) {
      errors.phone = "Telefone é obrigatório para contato direto.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salvar Dados da Empresa
  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!validateCompanyForm()) {
      toast.error("Por favor, preencha os campos obrigatórios indicados.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const userName = profile?.name || user?.email?.split("@")[0] || "Administrador";

      // 1. Carregar document_template_map atual da empresa para merge sem perda de dados
      const { data: currentComp } = await supabase
        .from("companies")
        .select("document_template_map")
        .eq("id", companyId)
        .single();

      const existingMap = (currentComp?.document_template_map as any) || {};

      const updatedDocMap = {
        ...existingMap,
        fantasy_name: companyForm.fantasy_name,
        zip_code: companyForm.zip_code,
        street: companyForm.street,
        number: companyForm.number,
        complement: companyForm.complement,
        neighborhood: companyForm.neighborhood,
        responsible_name: companyForm.responsible_name,
        pdf_footer_text: companyForm.pdf_footer_text,
        updated_by_name: userName,
      };

      // 2. Montar endereço completo para contact_address
      const fullAddressParts = [
        companyForm.street,
        companyForm.number ? `nº ${companyForm.number}` : null,
        companyForm.complement,
        companyForm.neighborhood,
        companyForm.city && companyForm.state ? `${companyForm.city}/${companyForm.state}` : null,
        companyForm.zip_code ? `CEP ${companyForm.zip_code}` : null,
      ].filter(Boolean);
      const fullAddress = fullAddressParts.join(", ");

      // 3. Atualizar tabela companies com as colunas nativas + jsonb
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyForm.name.trim(),
          cnpj: companyForm.cnpj.trim(),
          email: companyForm.email.trim(),
          phone: companyForm.phone.trim(),
          contact_email: companyForm.email.trim(),
          contact_phone: companyForm.phone.trim(),
          contact_address: fullAddress,
          city: companyForm.city.trim(),
          state: companyForm.state.trim().toUpperCase(),
          responsible_name: companyForm.responsible_name.trim() || null,
          technical_responsible_name: companyForm.technical_responsible_name.trim() || null,
          technical_responsible_registry: companyForm.technical_responsible_registry.trim() || null,
          pdf_footer_text: companyForm.pdf_footer_text.trim() || null,
          document_template_map: updatedDocMap,
          updated_at: now,
        } as any)
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Dados da empresa salvos com sucesso!", {
        description: "As informações foram atualizadas e persistem no Lovable Cloud.",
      });

      // Recarrega valores do banco para garantir paridade 100%
      await loadCompanyData();
    } catch (err: any) {
      console.error("Erro ao salvar empresa:", err);
      toast.error(err?.message || "Não foi possível salvar os dados da empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  // Upload de Logo com Bucket Aprovado
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploadingLogo || !companyId) return;

    // Validação de formato e tamanho seguro
    const validation = validateUploadSafe(file, { purpose: "logo", maxBytes: MAX_LOGO_BYTES });
    if (!validation.isValid) {
      toast.error(validation.error || "Arquivo de imagem inválido.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const storagePath = `${companyId}/logo_${Date.now()}.${ext}`;

      // Upload no bucket aprovado com RLS
      await uploadToBucket(
        "company-branding",
        storagePath,
        file,
        { purpose: "logo", upsert: true }
      );

      // Obter URL assinada persistente (1 ano de validade para visualização na plataforma)
      const { data: signedData, error: signErr } = await supabase.storage
        .from("company-branding")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      if (signErr) throw signErr;
      const logoUrl = signedData?.signedUrl || storagePath;

      // Salvar em logo_url e logo_primary_url na tabela companies
      const { error: dbErr } = await supabase
        .from("companies")
        .update({
          logo_url: logoUrl,
          logo_primary_url: logoUrl,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      if (dbErr) throw dbErr;

      setCompanyForm((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo enviada e configurada com sucesso!", {
        description: "A logo já está visível na prévia e sairá nos novos documentos.",
      });
    } catch (err: any) {
      console.error("Erro ao enviar logo:", err);
      toast.error(err?.message || "Erro ao salvar a logo da empresa.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Remover Logo
  const handleConfirmRemoveLogo = async () => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          logo_url: null,
          logo_primary_url: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      if (error) throw error;

      setCompanyForm((prev) => ({ ...prev, logo_url: "" }));
      setShowRemoveLogoDialog(false);
      toast.success("Logo removida com sucesso.", {
        description: "Novos documentos exibirão o nome da empresa em texto institucional.",
      });
    } catch (err) {
      toast.error("Erro ao remover logo.");
    }
  };

  // Desativar ou Reativar Funcionário
  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (!companyId) return;
    setIsUpdatingStaffStatus(true);

    try {
      const newStatus = staff.status === "Ativo" ? "inactive" : "active";

      const { data: compData } = await supabase
        .from("companies")
        .select("document_template_map")
        .eq("id", companyId)
        .single();

      const docMap = (compData?.document_template_map as any) || {};
      const employees: any[] = docMap.employees || [];

      // Procura funcionário no array
      const index = employees.findIndex((e) => e.id === staff.id);
      if (index >= 0) {
        employees[index].status = newStatus;
        employees[index].updated_at = new Date().toISOString();
      } else {
        // Se ainda não estava no array (por ex. veio de profiles), adiciona
        employees.push({
          id: staff.id,
          name: staff.name,
          role: staff.role,
          email: staff.email,
          phone: staff.phone,
          status: newStatus,
          document_name: staff.document_name || staff.name,
          document_role: staff.document_role || staff.role,
          professional_registry: staff.professional_registry,
        });
      }

      const { error: updErr } = await supabase
        .from("companies")
        .update({
          document_template_map: {
            ...docMap,
            employees,
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      if (updErr) throw updErr;

      setStaffList((prev) =>
        prev.map((s) =>
          s.id === staff.id
            ? { ...s, status: newStatus === "active" ? "Ativo" : "Inativo" }
            : s
        )
      );

      setStaffToDeactivate(null);
      toast.success(
        newStatus === "inactive"
          ? `Funcionário ${staff.name} desativado com sucesso.`
          : `Funcionário ${staff.name} reativado.`
      );
    } catch (err: any) {
      console.error("Erro ao alterar status do funcionário:", err);
      toast.error("Não foi possível alterar a situação do funcionário.");
    } finally {
      setIsUpdatingStaffStatus(false);
    }
  };

  // Salvar Preferências de Documentos
  const handleSavePreferences = async () => {
    if (!companyId) return;
    setIsSavingPreferences(true);

    try {
      const { data: currentComp } = await supabase
        .from("companies")
        .select("document_template_map")
        .eq("id", companyId)
        .single();

      const existingMap = (currentComp?.document_template_map as any) || {};

      const { error } = await supabase
        .from("companies")
        .update({
          pdf_template: preferences.pdfTemplate,
          document_template_map: {
            ...existingMap,
            preferences: preferences,
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Preferências de documentos salvas com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Filtro de Funcionários
  const filteredStaff = useMemo(() => {
    let list = staffList;
    if (staffFilter === "ativos") {
      list = list.filter((s) => s.status === "Ativo");
    } else if (staffFilter === "inativos") {
      list = list.filter((s) => s.status === "Inativo");
    }

    if (!staffSearch.trim()) return list;
    const term = staffSearch.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.role.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }, [staffList, staffFilter, staffSearch]);

  // Lista de 4 Abas Claramente Requeridas
  const navigationTabs = [
    { id: "empresa", label: "Dados da empresa", icon: Building },
    { id: "identidade", label: "Identidade visual", icon: ImageIcon },
    { id: "funcionarios", label: "Funcionários", icon: Users },
    { id: "preferencias", label: "Preferências de documentos", icon: Sliders },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando configurações da empresa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* CABEÇALHO DA PÁGINA */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Configurações da empresa e funcionários
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Gerencie os dados cadastrais, logo, equipe de despachantes e modelos de documentos da sua empresa.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#075BFF] border border-blue-100">
              <Building2 className="h-3.5 w-3.5" />
              <span>{companyForm.fantasy_name || companyForm.name || "Minha Empresa"}</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVEGAÇÃO ENTRE AS 4 ÁREAS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#075BFF] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* ÁREA 1: DADOS DA EMPRESA */}
        {/* ========================================================================= */}
        {activeTab === "empresa" && (
          <form onSubmit={handleSaveCompanyData} className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Informações cadastrais e institucionais
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estes dados são impressos nas procurações, requerimentos e minutas oficiais da Capitania dos Portos.
                  </p>
                </div>

                {companyForm.updated_at && (
                  <span className="text-[11px] text-slate-400">
                    Última atualização por {companyForm.updated_by}
                  </span>
                )}
              </div>

              {/* Informação sobre Campos Obrigatórios */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                <p>
                  Os campos com <strong className="text-red-500">*</strong> são obrigatórios para atender às exigências cadastrais dos órgãos navais e identificação jurídica da empresa.
                </p>
              </div>

              {/* Grid de Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Razão Social */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Razão Social <strong className="text-red-500">*</strong></span>
                    {formErrors.name && <span className="text-[11px] text-red-500 font-normal">{formErrors.name}</span>}
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={companyForm.name}
                    onChange={(e) => {
                      setCompanyForm({ ...companyForm, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    placeholder="Ex: NavalDocs Serviços Náuticos e Marítimos Ltda"
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                      formErrors.name ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Nome formal para identificação da empresa em processos oficiais.</p>
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nome Fantasia / Exibição</label>
                  <input
                    type="text"
                    name="fantasy_name"
                    value={companyForm.fantasy_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, fantasy_name: e.target.value })}
                    placeholder="Ex: NavalDocs Pro"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">Nome de exibição comercial amigável na plataforma.</p>
                </div>

                {/* CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>CNPJ <strong className="text-red-500">*</strong></span>
                    {formErrors.cnpj && <span className="text-[11px] text-red-500 font-normal">{formErrors.cnpj}</span>}
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    required
                    value={companyForm.cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                      formErrors.cnpj ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* E-mail de Contato */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>E-mail de Contato <strong className="text-red-500">*</strong></span>
                    {formErrors.email && <span className="text-[11px] text-red-500 font-normal">{formErrors.email}</span>}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={companyForm.email}
                    onChange={(e) => {
                      setCompanyForm({ ...companyForm, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                    }}
                    placeholder="contato@empresa.com.br"
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                      formErrors.email ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Telefone / WhatsApp <strong className="text-red-500">*</strong></span>
                    {formErrors.phone && <span className="text-[11px] text-red-500 font-normal">{formErrors.phone}</span>}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={companyForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(13) 3200-0000"
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 ${
                      formErrors.phone ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* CEP com Busca Automática */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>CEP</span>
                    {isSearchingCep && <span className="text-[10px] text-[#075BFF] flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</span>}
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={companyForm.zip_code}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="11000-000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Rua / Logradouro */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Logradouro / Rua</label>
                  <input
                    type="text"
                    name="street"
                    value={companyForm.street}
                    onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                    placeholder="Ex: Av. Senador Feijó"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Número */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Número</label>
                  <input
                    type="text"
                    name="number"
                    value={companyForm.number}
                    onChange={(e) => setCompanyForm({ ...companyForm, number: e.target.value })}
                    placeholder="150"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Complemento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Complemento</label>
                  <input
                    type="text"
                    name="complement"
                    value={companyForm.complement}
                    onChange={(e) => setCompanyForm({ ...companyForm, complement: e.target.value })}
                    placeholder="Sala 402"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Bairro</label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={companyForm.neighborhood}
                    onChange={(e) => setCompanyForm({ ...companyForm, neighborhood: e.target.value })}
                    placeholder="Centro"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cidade</label>
                  <input
                    type="text"
                    name="city"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="Santos"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">UF / Estado</label>
                  <input
                    type="text"
                    name="state"
                    maxLength={2}
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Informações Profissionais e Técnicas da Empresa */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#075BFF]" />
                  <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                    Dados do Responsável e Despachante Marítimo
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Despachante Responsável */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nome do Despachante Principal</label>
                    <input
                      type="text"
                      value={companyForm.responsible_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, responsible_name: e.target.value })}
                      placeholder="Ex: Carlos Alberto da Silva"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Responsável Técnico Naval */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Responsável Técnico Naval / Engenheiro</label>
                    <input
                      type="text"
                      value={companyForm.technical_responsible_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, technical_responsible_name: e.target.value })}
                      placeholder="Ex: Eng. Roberto Fontes"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Registro Profissional / CREA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Registro Profissional / CREA / Cart. Marítima</label>
                    <input
                      type="text"
                      value={companyForm.technical_responsible_registry}
                      onChange={(e) => setCompanyForm({ ...companyForm, technical_responsible_registry: e.target.value })}
                      placeholder="Ex: CREA 123456/SP • Reg. CP nº 9876"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observações / Cláusula Padrão para Rodapé */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700">
                  Cláusula ou Observações padrão para rodapé dos documentos
                </label>
                <textarea
                  rows={2}
                  value={companyForm.pdf_footer_text}
                  onChange={(e) => setCompanyForm({ ...companyForm, pdf_footer_text: e.target.value })}
                  placeholder="Ex: Documento elaborado sob responsabilidade técnica nos termos das Normas da Autoridade Marítima (NORMAM-211/DPC)..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Salvar dados da empresa</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ÁREA 2: IDENTIDADE VISUAL E LOGO */}
        {/* ========================================================================= */}
        {activeTab === "identidade" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">
                Logo da empresa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie o logotipo oficial da empresa para inclusão nos requerimentos, procurações e laudos técnicos.
              </p>
            </div>

            <input
              type="file"
              ref={logoInputRef}
              className="hidden"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              onChange={handleLogoUpload}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-slate-50/70 border border-slate-200 rounded-2xl">
              {/* Prévia da Logo */}
              <div className="w-36 h-36 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden p-3 shrink-0">
                {companyForm.logo_url ? (
                  <img
                    src={companyForm.logo_url}
                    alt="Logo da empresa"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-300">
                    <ImageIcon className="h-10 w-10 mx-auto mb-1 text-slate-300" />
                    <span className="text-[10px] font-semibold text-slate-400">Sem logo</span>
                  </div>
                )}
              </div>

              {/* Informações e Ações */}
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-xs font-bold text-[#0B1739]">
                    {companyForm.logo_url ? "Logo vinculada com sucesso" : "Nenhuma logo configurada"}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed mt-1">
                    Formatos recomendados: PNG transparente, JPG ou WebP (máximo 5MB).
                    {companyForm.logo_url 
                      ? " A logo acima está gravada no Lovable Cloud e sairá nos novos documentos emitidos."
                      : " Sem logo, seus documentos permanecem perfeitamente legíveis com o nome oficial da empresa em texto."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{companyForm.logo_url ? "Substituir logo" : "Enviar logo"}</span>
                  </button>

                  {companyForm.logo_url && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveLogoDialog(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover logo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Aviso de Não Bloqueio */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
              <p>
                <strong>Geração contínua:</strong> A ausência de logo não bloqueia a emissão de documentos náuticos nem o protocolo na Capitania.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA 3: FUNCIONÁRIOS */}
        {/* ========================================================================= */}
        {activeTab === "funcionarios" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0B1739]">
                  Relação de funcionários e responsáveis documentais
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Profissionais cadastrados para constar como responsáveis ou preparadores nos documentos da empresa.
                </p>
              </div>

              {/* Botão Cadastrar Funcionário */}
              <Link
                to="/configuracoes/funcionarios/novo"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastrar funcionário</span>
              </Link>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Buscar por nome, cargo ou e-mail..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Filtro por Situação */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStaffFilter("todos")}
                  className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    staffFilter === "todos" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos ({staffList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffFilter("ativos")}
                  className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    staffFilter === "ativos" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  Ativos ({staffList.filter((s) => s.status === "Ativo").length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffFilter("inativos")}
                  className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    staffFilter === "inativos" ? "bg-white text-slate-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Inativos ({staffList.filter((s) => s.status === "Inativo").length})
                </button>
              </div>
            </div>

            {/* Lista de Funcionários */}
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#0B1739]">Nenhum funcionário encontrado</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {staffSearch ? "Tente buscar por outro termo ou limpe os filtros." : "Cadastre os membros da equipe para selecioná-los nos documentos da empresa."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-[#0B1739]">{staff.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              staff.status === "Ativo"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {staff.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50/80 text-[#075BFF] border border-blue-100">
                            {staff.is_system_user ? "Usuário com acesso" : "Responsável documental"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {staff.role} • {staff.email} {staff.phone ? `• ${staff.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        to="/configuracoes/funcionarios/$id"
                        params={{ id: staff.id }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 text-slate-400" />
                        <span>Editar</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setStaffToDeactivate(staff)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          staff.status === "Ativo"
                            ? "bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {staff.status === "Ativo" ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aviso sobre Preservação Histórica */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
              <p>
                <strong>Proteção do histórico documental:</strong> Funcionários nunca são excluídos definitivamente para garantir que documentos já emitidos no passado mantenham seu valor probatório e rastreabilidade jurídica.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA 4: PREFERÊNCIAS DE DOCUMENTOS */}
        {/* ========================================================================= */}
        {activeTab === "preferencias" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">
                Preferências de emissão de documentos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina o padrão visual do cabeçalho e configurações dos PDFs gerados pela sua empresa.
              </p>
            </div>

            {/* Seleção do Modelo de Cabeçalho do PDF */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700">
                Modelo visual padrão de cabeçalho do PDF
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: "classico",
                    title: "Clássico Oficial",
                    desc: "Cabeçalho institucional com barra azul e identificação náutica.",
                  },
                  {
                    id: "executivo",
                    title: "Executivo Premium",
                    desc: "Cabeçalho moderno em gradiente com destaque para o título.",
                  },
                  {
                    id: "naval-azul",
                    title: "Naval Azul & Ouro",
                    desc: "Faixa navy escura com filete dourado de alto padrão.",
                  },
                  {
                    id: "escritorio",
                    title: "Escritório Despachante",
                    desc: "Estilo formal com linhas de protocolo e dados do despachante.",
                  },
                  {
                    id: "institucional",
                    title: "Institucional Marinha",
                    desc: "Estética alinhada às normas e comunicações da Capitania dos Portos.",
                  },
                ].map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setPreferences({ ...preferences, pdfTemplate: tpl.id })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      preferences.pdfTemplate === tpl.id
                        ? "border-[#075BFF] bg-blue-50/40 ring-2 ring-blue-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0B1739]">{tpl.title}</span>
                      {preferences.pdfTemplate === tpl.id && (
                        <Check className="h-4 w-4 text-[#075BFF]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes de Preferências de Documentos */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700">
                Comportamento nos novos documentos
              </label>

              <div className="space-y-2.5">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#0B1739]">Incluir logo automaticamente no cabeçalho</p>
                    <p className="text-[11px] text-slate-400">Insere a logo da empresa no topo de todas as novas minutas.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.autoAttachLogo}
                    onChange={(e) => setPreferences({ ...preferences, autoAttachLogo: e.target.checked })}
                    className="h-4 w-4 text-[#075BFF] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#0B1739]">Exibir dados do responsável técnico e registro no rodapé</p>
                    <p className="text-[11px] text-slate-400">Imprime o número do CREA/carteira do despachante no fechamento do documento.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.showTechnicalResponsibleOnFooter}
                    onChange={(e) => setPreferences({ ...preferences, showTechnicalResponsibleOnFooter: e.target.checked })}
                    className="h-4 w-4 text-[#075BFF] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#0B1739]">Notificar ao receber versões assinadas ou protocolos</p>
                    <p className="text-[11px] text-slate-400">Alerta os membros da equipe quando um cliente anexar o PDF assinado pelo GOV.BR.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnSignedUpload}
                    onChange={(e) => setPreferences({ ...preferences, notifyOnSignedUpload: e.target.checked })}
                    className="h-4 w-4 text-[#075BFF] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Botão Salvar Preferências */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Salvar preferências de documentos</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DIÁLOGO: CONFIRMAR REMOÇÃO DE LOGO */}
      {/* ========================================================================= */}
      <Dialog open={showRemoveLogoDialog} onOpenChange={setShowRemoveLogoDialog}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Remover logo da empresa?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Novos documentos gerados exibirão o nome da empresa em texto formatado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRemoveLogoDialog(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmRemoveLogo}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              Confirmar remoção
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIÁLOGO: CONFIRMAR DESATIVAÇÃO DE FUNCIONÁRIO */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(staffToDeactivate)} onOpenChange={(open) => !open && setStaffToDeactivate(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  {staffToDeactivate?.status === "Ativo" ? "Desativar funcionário?" : "Reativar funcionário?"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {staffToDeactivate?.name} ({staffToDeactivate?.role})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p>
              {staffToDeactivate?.status === "Ativo"
                ? "Ao desativar este funcionário, ele deixará de ser oferecido na seleção de novos documentos e processos."
                : "Ao reativar este funcionário, ele voltará a aparecer normalmente na seleção de responsáveis dos processos."}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              * Documentos, requerimentos e laudos já gerados no passado com o nome deste funcionário não serão alterados.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isUpdatingStaffStatus}
              onClick={() => setStaffToDeactivate(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isUpdatingStaffStatus}
              onClick={() => staffToDeactivate && handleToggleStaffStatus(staffToDeactivate)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isUpdatingStaffStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{staffToDeactivate?.status === "Ativo" ? "Confirmar desativação" : "Confirmar reativação"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
