import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Building, 
  Users, 
  CreditCard, 
  Shield, 
  Globe, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
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
  User
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
  permissions: string;
}

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>): {
    tab?: string;
  } => ({
    tab: (search.tab as string) || undefined,
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
  const currentCompany = profile?.companies;
  const companyId = profile?.company_id;

  // Aba Ativa
  const [activeTab, setActiveTab] = useState<string>(searchParams.tab || "empresa");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos Dados da Empresa
  const [companyForm, setCompanyForm] = useState({
    name: "",
    fantasy_name: "",
    cnpj: "",
    state_registration: "",
    email: "",
    phone: "",
    zip_code: "",
    state: "SP",
    city: "Santos",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    document_notes: "",
    logo_url: "",
    updated_at: "",
    updated_by: "",
  });

  // Estados de Funcionários
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  // Estados de Preferências
  const [preferences, setPreferences] = useState({
    dateFormat: "DD/MM/AAAA",
    notifyOnGeneration: true,
    notifyOnProtocol: true,
    defaultResponsibleId: "",
    autoAttachLogo: true,
  });

  // Estados de Upload de Logo
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar Dados da Empresa e Perfis
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
        setCompanyForm({
          name: comp.name || "",
          fantasy_name: comp.fantasy_name || comp.name || "",
          cnpj: comp.cnpj || "",
          state_registration: comp.metadata?.state_registration || "",
          email: comp.email || "",
          phone: comp.phone || "",
          zip_code: comp.metadata?.zip_code || comp.zip_code || "",
          state: comp.metadata?.state || "SP",
          city: comp.metadata?.city || "Santos",
          street: comp.metadata?.street || comp.address || "",
          number: comp.metadata?.number || "",
          complement: comp.metadata?.complement || "",
          neighborhood: comp.metadata?.neighborhood || "",
          document_notes: comp.metadata?.document_notes || "",
          logo_url: comp.logo_url || comp.metadata?.logo_url || "",
          updated_at: comp.updated_at || comp.created_at || "",
          updated_by: comp.metadata?.updated_by_name || "Administrador",
        });

        if (comp.metadata?.preferences) {
          setPreferences((prev) => ({ ...prev, ...comp.metadata.preferences }));
        }

        // Carregar funcionários salvos em metadata.employees
        const savedEmployees = (comp.metadata?.employees as any[]) || [];

        // Carregar Funcionários / Perfis da Empresa
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .eq("company_id", companyId);

        const combinedStaff: StaffMember[] = [];

        // Adicionar do metadata
        savedEmployees.forEach((emp: any) => {
          combinedStaff.push({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            email: emp.email || "Sem e-mail",
            status: emp.status === "inactive" ? "Inativo" : "Ativo",
            permissions: emp.permissions?.can_generate_docs ? "Geração e revisão" : "Consulta",
          });
        });

        // Adicionar do profiles caso não esteja no metadata
        if (profilesData && profilesData.length > 0) {
          profilesData.forEach((p: any) => {
            const alreadyExists = combinedStaff.some(
              (s) => s.id === p.id || (p.email && s.email.toLowerCase() === p.email.toLowerCase())
            );
            if (!alreadyExists) {
              combinedStaff.push({
                id: p.id,
                name: p.name || p.email?.split("@")[0] || "Funcionário",
                role: p.role === "admin" ? "Administrador / Despachante" : "Operador Náutico",
                email: p.email || "Sem e-mail",
                status: (p as any).is_active !== false ? "Ativo" : "Inativo",
                permissions: p.role === "admin" ? "Acesso total" : "Operação e documentos",
              });
            }
          });
        }

        if (combinedStaff.length > 0) {
          setStaffList(combinedStaff);
        } else {
          setStaffList([
            {
              id: profile?.id || "staff-1",
              name: profile?.name || user?.email?.split("@")[0] || "João Vitor",
              role: "Administrador / Despachante",
              email: user?.email || "contato@empresa.com",
              status: "Ativo",
              permissions: "Acesso total",
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados da empresa:", err);
      toast.error("Erro ao carregar dados das configurações.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, profile, user]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // 2. Salvar Dados da Empresa
  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const userName = profile?.name || user?.email?.split("@")[0] || "Administrador";

      const updatedMetadata = {
        state_registration: companyForm.state_registration,
        zip_code: companyForm.zip_code,
        state: companyForm.state,
        city: companyForm.city,
        street: companyForm.street,
        number: companyForm.number,
        complement: companyForm.complement,
        neighborhood: companyForm.neighborhood,
        document_notes: companyForm.document_notes,
        logo_url: companyForm.logo_url,
        updated_by_name: userName,
        preferences: preferences,
      };

      const { error } = await supabase
        .from("companies")
        .update({
          name: companyForm.name,
          fantasy_name: companyForm.fantasy_name,
          cnpj: companyForm.cnpj,
          email: companyForm.email,
          phone: companyForm.phone,
          logo_url: companyForm.logo_url,
          metadata: updatedMetadata,
          updated_at: now,
        } as any)
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Dados da empresa salvos com sucesso!", {
        description: "As informações foram atualizadas para as próximas gerações de documentos.",
      });

      setCompanyForm((prev) => ({
        ...prev,
        updated_at: now,
        updated_by: userName,
      }));
    } catch (err: any) {
      console.error("Erro ao salvar empresa:", err);
      toast.error(err?.message || "Erro ao salvar dados da empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Upload de Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploadingLogo || !companyId) return;

    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("svg+xml")) {
      toast.error("Formato inválido. Envie uma imagem PNG, JPG ou SVG seguro.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo de 5MB.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/logo_${Date.now()}_${cleanFileName}`;
      const uploadRes = await uploadToBucket(
        "company-branding",
        storagePath,
        file,
        { purpose: "logo" }
      );

      const logoUrl = uploadRes.path;

      await supabase
        .from("companies")
        .update({
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      setCompanyForm((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar logo:", err);
      toast.error("Falha ao salvar logo da empresa.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // 4. Remover Logo
  const handleRemoveLogo = async () => {
    if (!companyId) return;
    try {
      await supabase
        .from("companies")
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      setCompanyForm((prev) => ({ ...prev, logo_url: "" }));
      toast.success("Logo removida.");
    } catch (err) {
      toast.error("Erro ao remover logo.");
    }
  };

  // Filtro de Funcionários
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const term = staffSearch.toLowerCase();
    return staffList.filter((s) => 
      s.name.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  }, [staffList, staffSearch]);

  // Lista de Abas de Navegação
  const navigationTabs = [
    { id: "empresa", label: "Dados da empresa", icon: Building },
    { id: "identidade", label: "Logo e identidade visual", icon: ImageIcon },
    { id: "funcionarios", label: "Funcionários", icon: Users },
    { id: "permissoes", label: "Permissões", icon: Shield },
    { id: "preferencias", label: "Preferências", icon: Sliders },
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
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Configurações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mantenha os dados da empresa e da equipe atualizados.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* NAVEGAÇÃO POR ABAS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
        {/* ABA 1: DADOS DA EMPRESA */}
        {/* ========================================================================= */}
        {activeTab === "empresa" && (
          <form onSubmit={handleSaveCompanyData} className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Informações cadastrais da empresa
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estes dados são impressos nos requerimentos, procurações e minutas oficiais.
                  </p>
                </div>

                {companyForm.updated_at && (
                  <span className="text-[11px] text-slate-400">
                    Última atualização por {companyForm.updated_by}
                  </span>
                )}
              </div>

              {/* Grid de Campos Cadastrais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Razão Social */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Razão Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Ex: NavalDocs Serviços Marítimos Ltda"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nome Fantasia</label>
                  <input
                    type="text"
                    value={companyForm.fantasy_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, fantasy_name: e.target.value })}
                    placeholder="Ex: NavalDocs Pro"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.cnpj}
                    onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Inscrição Estadual / Municipal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Inscrição Municipal / Estadual</label>
                  <input
                    type="text"
                    value={companyForm.state_registration}
                    onChange={(e) => setCompanyForm({ ...companyForm, state_registration: e.target.value })}
                    placeholder="Isento ou número de registro"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* E-mail Principal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    E-mail Institucional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Telefone de Contato <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="(13) 3200-0000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* CEP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">CEP</label>
                  <input
                    type="text"
                    value={companyForm.zip_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, zip_code: e.target.value })}
                    placeholder="11000-000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Logradouro / Endereço */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Logradouro / Rua</label>
                  <input
                    type="text"
                    value={companyForm.street}
                    onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                    placeholder="Av. Senador Feijó"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Número */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Número</label>
                  <input
                    type="text"
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
                    value={companyForm.complement}
                    onChange={(e) => setCompanyForm({ ...companyForm, complement: e.target.value })}
                    placeholder="Sala 402"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cidade</label>
                  <input
                    type="text"
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
                    maxLength={2}
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Observações para Documentos */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700">
                  Observações padrão para rodapé de documentos
                </label>
                <textarea
                  rows={3}
                  value={companyForm.document_notes}
                  onChange={(e) => setCompanyForm({ ...companyForm, document_notes: e.target.value })}
                  placeholder="Informações adicionais como número de credenciamento ou cláusula padrão de procuração..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Salvar dados da empresa</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: LOGO E IDENTIDADE VISUAL */}
        {/* ========================================================================= */}
        {activeTab === "identidade" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">
                Logo da empresa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                A logo poderá aparecer nos documentos gerados, conforme o modelo oficial.
              </p>
            </div>

            <input
              type="file"
              ref={logoInputRef}
              className="hidden"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={handleLogoUpload}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-slate-50/70 border border-slate-200 rounded-2xl">
              {/* Prévia da Logo */}
              <div className="w-32 h-32 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden p-3 shrink-0">
                {companyForm.logo_url ? (
                  <img
                    src={companyForm.logo_url}
                    alt="Logo da empresa"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-300">
                    <ImageIcon className="h-10 w-10 mx-auto mb-1" />
                    <span className="text-[10px] font-semibold">Sem logo</span>
                  </div>
                )}
              </div>

              {/* Ações de Logo */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#0B1739]">
                    {companyForm.logo_url ? "Logo configurada" : "Nenhuma logo vinculada"}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
                    Formatos recomendados: PNG com fundo transparente ou SVG seguro (máx. 5MB). A alteração será aplicada em novos documentos emitidos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{companyForm.logo_url ? "Substituir logo" : "Enviar logo"}</span>
                  </button>

                  {companyForm.logo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Remover logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: FUNCIONÁRIOS */}
        {/* ========================================================================= */}
        {activeTab === "funcionarios" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0B1739]">
                  Funcionários cadastrados
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Membros da equipe habilitados para assinar ou responder por processos.
                </p>
              </div>

              {/* Botão Cadastrar Funcionário (Tela 26) */}
              <Link
                to="/configuracoes/funcionarios/novo"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastrar funcionário</span>
              </Link>
            </div>

            {/* Busca de Funcionários */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Buscar funcionário por nome, cargo ou e-mail..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Tabela / Lista de Funcionários */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {filteredStaff.map((staff) => (
                <div key={staff.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold text-xs shrink-0">
                      {staff.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1739]">{staff.name}</h4>
                      <p className="text-[11px] text-slate-500">{staff.role} • {staff.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        staff.status === "Ativo"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {staff.status}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {staff.permissions}
                    </span>
                    <Link
                      to="/configuracoes/funcionarios/$id"
                      params={{ id: staff.id }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-medium transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 4: PERMISSÕES */}
        {/* ========================================================================= */}
        {activeTab === "permissoes" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">
                Matriz de permissões e acessos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle de ações habilitadas para operadores e administradores da empresa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-[#075BFF] font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrador da Empresa</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">✓ Gerenciar clientes e embarcações</li>
                  <li className="flex items-center gap-1.5">✓ Criar e cancelar processos</li>
                  <li className="flex items-center gap-1.5">✓ Gerar e assinar minutas oficiais</li>
                  <li className="flex items-center gap-1.5">✓ Alterar dados cadastrais e logo</li>
                  <li className="flex items-center gap-1.5">✓ Cadastrar funcionários</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <User className="h-4 w-4" />
                  <span>Operador de Documentação</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">✓ Cadastrar novos clientes</li>
                  <li className="flex items-center gap-1.5">✓ Iniciar fluxos de serviços náuticos</li>
                  <li className="flex items-center gap-1.5">✓ Anexar protocolos e comprovantes</li>
                  <li className="flex items-center gap-1.5 text-slate-400">✗ Alterar configurações da empresa</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 5: PREFERÊNCIAS */}
        {/* ========================================================================= */}
        {activeTab === "preferencias" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">
                Preferências de operação
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina os parâmetros padrão para novas gerações e fluxos de atendimento.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                <div>
                  <p className="font-bold text-[#0B1739]">Incluir logo automaticamente</p>
                  <p className="text-[11px] text-slate-400">Aplica a logo nos novos documentos onde houver suporte.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoAttachLogo}
                  onChange={(e) => setPreferences({ ...preferences, autoAttachLogo: e.target.checked })}
                  className="h-4 w-4 text-[#075BFF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                <div>
                  <p className="font-bold text-[#0B1739]">Notificar ao receber versões assinadas</p>
                  <p className="text-[11px] text-slate-400">Registra aviso no painel quando um documento for anexado.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyOnGeneration}
                  onChange={(e) => setPreferences({ ...preferences, notifyOnGeneration: e.target.checked })}
                  className="h-4 w-4 text-[#075BFF] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
