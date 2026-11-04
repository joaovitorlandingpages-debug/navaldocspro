import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Palette,
  Megaphone,
  CreditCard,
  Sliders,
  MessageSquare,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Building,
  Save,
  Layers,
  FolderOpen,
  DollarSign,
  Clock,
  Sparkles,
  Ship,
  Phone,
  Mail,
  HelpCircle,
  FileText,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { StripeConfigDialog } from "@/components/admin/StripeConfigDialog";
import {
  getSystemSettings,
  saveSystemSettings,
  resetSystemSettingsToDefaults,
  getDynamicServicesCatalog,
  saveDynamicServicesCatalog,
  addDynamicService,
  updateDynamicService,
  toggleDynamicServiceActive,
  deleteDynamicService,
  resetDynamicServicesToDefaults,
  SystemFullSettings,
  DynamicNavalService,
  DEFAULT_PLATFORM_SETTINGS,
} from "@/services/admin/systemSettingsService";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsMasterPage,
});

function AdminSettingsMasterPage() {
  const [activeTab, setActiveTab] = useState("branding");
  const [settings, setSettings] = useState<SystemFullSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [services, setServices] = useState<DynamicNavalService[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modais de Serviços
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DynamicNavalService | null>(null);
  const [serviceDeleteConfirmOpen, setServiceDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<DynamicNavalService | null>(null);
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);

  // Campos do formulário de serviço
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormShortName, setServiceFormShortName] = useState("");
  const [serviceFormDescription, setServiceFormDescription] = useState("");
  const [serviceFormCategory, setServiceFormCategory] = useState<"maritimo" | "pessoal" | "tecnico">("maritimo");
  const [serviceFormFee, setServiceFormFee] = useState<number>(500);
  const [serviceFormDays, setServiceFormDays] = useState("5 a 10 dias úteis");
  const [serviceFormNormam, setServiceFormNormam] = useState("NORMAM-211/DPC");
  const [serviceFormRequiresVessel, setServiceFormRequiresVessel] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    const s = getSystemSettings();
    setSettings(s);
    const svcs = getDynamicServicesCatalog();
    setServices(svcs);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveSystemSettings(settings);
      toast.success("Configurações do sistema atualizadas e sincronizadas com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao salvar configurações: " + (e?.message || "falha desconhecida"));
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // OPERAÇÕES DO CATÁLOGO DE SERVIÇOS
  // ==========================================
  const handleOpenNewService = () => {
    setEditingService(null);
    setServiceFormName("");
    setServiceFormShortName("");
    setServiceFormDescription("");
    setServiceFormCategory("maritimo");
    setServiceFormFee(500);
    setServiceFormDays("5 a 10 dias úteis");
    setServiceFormNormam("NORMAM-211/DPC, Anexo ...");
    setServiceFormRequiresVessel(true);
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (svc: DynamicNavalService) => {
    setEditingService(svc);
    setServiceFormName(svc.name);
    setServiceFormShortName(svc.shortName);
    setServiceFormDescription(svc.description);
    setServiceFormCategory(svc.category);
    setServiceFormFee(svc.suggestedFee || 500);
    setServiceFormDays(svc.estimatedDays || "5 a 10 dias úteis");
    setServiceFormNormam(svc.officialNormam || "NORMAM-211/DPC");
    setServiceFormRequiresVessel(svc.requiresVessel);
    setServiceModalOpen(true);
  };

  const handleSaveServiceModal = async () => {
    if (!serviceFormName.trim()) {
      toast.error("O nome do serviço é obrigatório.");
      return;
    }

    if (editingService) {
      await updateDynamicService(editingService.id, {
        name: serviceFormName.trim(),
        shortName: serviceFormShortName.trim() || serviceFormName.trim(),
        description: serviceFormDescription.trim(),
        category: serviceFormCategory,
        suggestedFee: Number(serviceFormFee) || 0,
        estimatedDays: serviceFormDays.trim(),
        officialNormam: serviceFormNormam.trim(),
        requiresVessel: serviceFormRequiresVessel,
      });
      toast.success(`Serviço "${serviceFormName.trim()}" atualizado com sucesso!`);
    } else {
      await addDynamicService({
        name: serviceFormName.trim(),
        shortName: serviceFormShortName.trim() || serviceFormName.trim(),
        description: serviceFormDescription.trim(),
        iconName: serviceFormCategory === "pessoal" ? "Award" : serviceFormCategory === "tecnico" ? "FileSpreadsheet" : "Ship",
        category: serviceFormCategory,
        isActive: true,
        suggestedFee: Number(serviceFormFee) || 0,
        estimatedDays: serviceFormDays.trim(),
        officialNormam: serviceFormNormam.trim(),
        requiresVessel: serviceFormRequiresVessel,
        order: services.length + 1,
        associatedDocIds: [],
      });
      toast.success(`Novo serviço náutico "${serviceFormName.trim()}" adicionado!`);
    }

    setServiceModalOpen(false);
    setServices(getDynamicServicesCatalog());
  };

  const handleToggleServiceActive = async (id: string, name: string) => {
    const newState = await toggleDynamicServiceActive(id);
    setServices(getDynamicServicesCatalog());
    toast.success(
      newState
        ? `Serviço "${name}" ativado com sucesso!`
        : `Serviço "${name}" desativado (não aparecerá em Novo Pedido).`
    );
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    await deleteDynamicService(serviceToDelete.id);
    setServices(getDynamicServicesCatalog());
    setServiceDeleteConfirmOpen(false);
    toast.success(`Serviço "${serviceToDelete.name}" excluído.`);
    setServiceToDelete(null);
  };

  const handleResetServices = () => {
    const def = resetDynamicServicesToDefaults();
    setServices(def);
    toast.success("Catálogo de serviços restaurado para a matriz padrão da Marinha.");
  };

  // ==========================================
  // BACKUP E RESTAURAÇÃO
  // ==========================================
  const handleExportBackup = () => {
    const fullBackup = {
      settings,
      services,
      exportedAt: new Date().toISOString(),
      version: "2.0.0",
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `navaldocs_backup_configuracoes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup de configurações exportado com sucesso!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.settings) {
          await saveSystemSettings(parsed.settings);
          setSettings(parsed.settings);
        }
        if (parsed.services && Array.isArray(parsed.services)) {
          await saveDynamicServicesCatalog(parsed.services);
          setServices(parsed.services);
        }
        toast.success("Configurações importadas e restauradas com sucesso!");
      } catch (err) {
        toast.error("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetAllToFactory = () => {
    const defSettings = resetSystemSettingsToDefaults();
    setSettings(defSettings);
    const defServices = resetDynamicServicesToDefaults();
    setServices(defServices);
    setResetAllConfirmOpen(false);
    toast.success("Todas as configurações foram restauradas aos padrões originais de fábrica!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              Central de Controle Total do Sistema
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
              SuperAdmin No-Code
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Modifique branding, serviços náuticos, taxas oficiais da Marinha, avisos globais e regras de negócio diretamente por este painel, sem tocar no código.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO DE ABAS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl h-auto flex flex-wrap border border-slate-200/80 gap-1">
          <TabsTrigger
            value="branding"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <Palette className="h-3.5 w-3.5" />
            Identidade & Branding
          </TabsTrigger>

          <TabsTrigger
            value="services"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Catálogo de Serviços ({services.length})
          </TabsTrigger>

          <TabsTrigger
            value="marinha_fees"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Taxas da Marinha (GRU)
          </TabsTrigger>

          <TabsTrigger
            value="broadcast"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Comunicado Global
          </TabsTrigger>

          <TabsTrigger
            value="rules"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            Regras Operacionais
          </TabsTrigger>

          <TabsTrigger
            value="messages"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens WhatsApp
          </TabsTrigger>

          <TabsTrigger
            value="integrations"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Integrações & APIs
          </TabsTrigger>

          <TabsTrigger
            value="backup"
            className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Backup & Reset
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* ABA 1: IDENTIDADE & BRANDING */}
        {/* ========================================================= */}
        <TabsContent value="branding" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Informações Institucionais da Plataforma
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Altere o nome visível, slogan, dados de contato e suporte da empresa operadora.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome da Plataforma</Label>
                <Input
                  value={settings.branding.systemName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, systemName: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Ex: NavalDocs Pro"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Slogan / Subtítulo</Label>
                <Input
                  value={settings.branding.systemSlogan}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, systemSlogan: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Ex: Plataforma de Documentação Náutica"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Razão Social da Operadora</Label>
                <Input
                  value={settings.branding.companyLegalName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, companyLegalName: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Ex: NavalDocs Tecnologia Ltda"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">CNPJ da Operadora</Label>
                <Input
                  value={settings.branding.companyCnpj}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, companyCnpj: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">E-mail de Suporte e Atendimento</Label>
                <Input
                  value={settings.branding.supportEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, supportEmail: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="suporte@navaldocs.com.br"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">WhatsApp Oficial de Suporte</Label>
                <Input
                  value={settings.branding.supportWhatsapp}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, supportWhatsapp: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="5513987654321"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Telefone / Central de Atendimento</Label>
                <Input
                  value={settings.branding.supportPhone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, supportPhone: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="(13) 3289-4400"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Horário de Atendimento</Label>
                <Input
                  value={settings.branding.supportHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, supportHours: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Segunda a Sexta, das 08h às 18h"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Cor Primária do Tema (Hex)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={settings.branding.primaryColor || "#075BFF"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })
                    }
                    className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl font-mono"
                    placeholder="#075BFF"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Logo URL (Claro)</Label>
                <Input
                  value={settings.branding.logoUrlLight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, logoUrlLight: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl font-mono"
                  placeholder="/logo-navaldocs.svg"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 2: CATÁLOGO DINÂMICO DE SERVIÇOS NÁUTICOS */}
        {/* ========================================================= */}
        <TabsContent value="services" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                  Catálogo de Serviços Náuticos Disponíveis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione, edite ou desative serviços. Serviços desativados desaparecem instantaneamente da tela de Novo Pedido dos clientes.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetServices}
                  className="h-9 text-xs rounded-xl border-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Restaurar Padrões
                </Button>
                <Button
                  onClick={handleOpenNewService}
                  className="h-9 px-3.5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Novo Serviço Náutico
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    svc.isActive
                      ? "bg-white border-slate-200 shadow-2xs"
                      : "bg-slate-50/80 border-slate-200/60 opacity-60"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#0B1739]">{svc.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-blue-50 text-[#075BFF] border-blue-100"
                      >
                        {svc.category === "maritimo" ? "Marítimo" : svc.category === "pessoal" ? "Pessoal (Amador)" : "Técnico Naval"}
                      </Badge>
                      {svc.isCustom && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200"
                        >
                          Customizado
                        </Badge>
                      )}
                      {!svc.isActive && (
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
                          Desativado
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{svc.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                      <span>Prazo Marinha: <strong>{svc.estimatedDays}</strong></span>
                      <span>•</span>
                      <span>Honorários sugeridos: <strong>R$ {svc.suggestedFee?.toFixed(2)}</strong></span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{svc.officialNormam}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                      <Label className="text-[11px] font-semibold text-slate-600 cursor-pointer">
                        {svc.isActive ? "Ativo" : "Inativo"}
                      </Label>
                      <Switch
                        checked={svc.isActive}
                        onCheckedChange={() => handleToggleServiceActive(svc.id, svc.name)}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditService(svc)}
                      className="h-8 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>

                    {svc.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setServiceToDelete(svc);
                          setServiceDeleteConfirmOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 3: TAXAS DA MARINHA (GRU / DPC) */}
        {/* ========================================================= */}
        <TabsContent value="marinha_fees" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Tabela Oficial de Taxas da Marinha do Brasil (GRU)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores dos emolumentos oficiais cobrados pela Capitania dos Portos. Quando a Marinha atualizar os valores anuais, ajuste aqui para recalcular automaticamente nos orçamentos dos clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Inscrição Lancha / Veleiro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.inscricaoEmbarcacaoLancha}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        inscricaoEmbarcacaoLancha: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Inscrição Moto Aquática / Jet Ski (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.inscricaoMotoAquatica}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        inscricaoMotoAquatica: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Transferência de Propriedade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.transferenciaPropriedade}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        transferenciaPropriedade: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Renovação de TIE/TIEM (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.renovacaoTieTiem}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        renovacaoTieTiem: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Segunda Via de Documento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.segundaViaDocumento}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        segundaViaDocumento: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Vistoria de Arqueação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.vistoriaArqueacao}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        vistoriaArqueacao: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Inscrição Exame de CHA (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.inscricaoExameCha}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        inscricaoExameCha: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Renovação de CHA (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.marinhaFees.renovacaoCha}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        renovacaoCha: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Link Oficial SISGRU da Marinha</Label>
                <Input
                  value={settings.marinhaFees.linkEmissaoGru}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marinhaFees: {
                        ...settings.marinhaFees,
                        linkEmissaoGru: e.target.value,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl font-mono"
                  placeholder="https://www.marinha.mil.br/dpc/sisgru"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Orientações de Pagamento aos Clientes</Label>
              <Textarea
                value={settings.marinhaFees.orientacoesPagamento}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    marinhaFees: {
                      ...settings.marinhaFees,
                      orientacoesPagamento: e.target.value,
                    },
                  })
                }
                className="mt-1 text-xs rounded-xl min-h-[70px]"
                placeholder="Instruções para recolhimento da taxa via PIX ou boleto..."
              />
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 4: COMUNICADO GLOBAL (BROADCAST) & MODO MANUTENÇÃO */}
        {/* ========================================================= */}
        <TabsContent value="broadcast" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                  Banner de Comunicado Global (Broadcast)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exibe um aviso no topo de todas as páginas para todos os escritórios e usuários do sistema em tempo real.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-700">Ativar Banner</Label>
                <Switch
                  checked={settings.broadcast.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, isEnabled: checked },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Título do Comunicado</Label>
                <Input
                  value={settings.broadcast.title}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, title: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Ex: Comunicado da Capitania"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Tipo de Aviso</Label>
                <Select
                  value={settings.broadcast.type}
                  onValueChange={(val: any) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, type: val },
                    })
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativo (Azul)</SelectItem>
                    <SelectItem value="warning">Atenção (Amarelo)</SelectItem>
                    <SelectItem value="destructive">Alerta Crítico (Vermelho)</SelectItem>
                    <SelectItem value="success">Sucesso / Novidade (Verde)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Mensagem do Comunicado</Label>
                <Textarea
                  value={settings.broadcast.message}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, message: e.target.value },
                    })
                  }
                  className="mt-1 text-xs rounded-xl min-h-[60px]"
                  placeholder="Descreva o comunicado que será visto por todos os clientes..."
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Texto do Link de Ação (Opcional)</Label>
                <Input
                  value={settings.broadcast.actionText || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, actionText: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Ex: Saiba Mais"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">URL do Link de Ação (Opcional)</Label>
                <Input
                  value={settings.broadcast.actionUrl || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, actionUrl: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl font-mono"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* SEÇÃO MODO DE MANUTENÇÃO */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                    Modo de Manutenção Programada
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quando ativado, exibe um banner de manutenção de prioridade máxima no topo de todas as telas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.broadcast.isMaintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, isMaintenanceMode: checked },
                    })
                  }
                />
              </div>
            </div>

            {settings.broadcast.isMaintenanceMode && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">Mensagem do Modo de Manutenção</Label>
                <Input
                  value={settings.broadcast.maintenanceMessage || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      broadcast: { ...settings.broadcast, maintenanceMessage: e.target.value },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                  placeholder="Sistema em manutenção programada..."
                />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 5: REGRAS OPERACIONAIS & LIMITES */}
        {/* ========================================================= */}
        <TabsContent value="rules" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Parâmetros e Regras de Negócio da Plataforma
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure limites de upload, segurança documental, expiração de rascunhos e inteligência artificial.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Tamanho Máximo de Arquivos (MB)</Label>
                <Input
                  type="number"
                  value={settings.operationalRules.maxUploadSizeMb}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        maxUploadSizeMb: Number(e.target.value) || 25,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Validade do Rascunho de Processo (Dias)</Label>
                <Input
                  type="number"
                  value={settings.operationalRules.processDraftExpirationDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        processDraftExpirationDays: Number(e.target.value) || 60,
                      },
                    })
                  }
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Assinatura Eletrônica Gov.br Obrigatória
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Exige autenticação prata/ouro do Governo Federal para protocolo digital.
                  </p>
                </div>
                <Switch
                  checked={settings.operationalRules.requireGovBrSignature}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        requireGovBrSignature: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Marca D'Água de Segurança nos Documentos
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Estampa identificador único anticópia nos PDFs gerados.
                  </p>
                </div>
                <Switch
                  checked={settings.operationalRules.enableDocumentWatermark}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        enableDocumentWatermark: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Motor OCR / Leitura Inteligente (Vision AI)
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Extrai automaticamente dados de NFs, RG, CNH e TIEs anexados.
                  </p>
                </div>
                <Switch
                  checked={settings.operationalRules.enableAiOcrVision}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        enableAiOcrVision: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Permitir Anexação Manual sem OCR
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Permite que o despachante insira dados manualmente se preferir.
                  </p>
                </div>
                <Switch
                  checked={settings.operationalRules.allowManualDocumentUpload}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      operationalRules: {
                        ...settings.operationalRules,
                        allowManualDocumentUpload: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 6: MODELOS DE MENSAGENS WHATSAPP & E-MAIL */}
        {/* ========================================================= */}
        <TabsContent value="messages" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Modelos de Notificação Automática (WhatsApp & E-mail)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalize os textos enviados aos clientes. Use as tags dinâmicas:{" "}
                <code className="text-[#075BFF] font-mono">{"{{cliente_nome}}"}</code>,{" "}
                <code className="text-[#075BFF] font-mono">{"{{codigo_processo}}"}</code>,{" "}
                <code className="text-[#075BFF] font-mono">{"{{servico_nome}}"}</code>,{" "}
                <code className="text-[#075BFF] font-mono">{"{{embarcacao_nome}}"}</code>,{" "}
                <code className="text-[#075BFF] font-mono">{"{{link_assinatura}}"}</code>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  WhatsApp: Quando o Processo é Aberto
                </Label>
                <Textarea
                  value={settings.notifications.whatsappProcessCreated}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        whatsappProcessCreated: e.target.value,
                      },
                    })
                  }
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  WhatsApp: Quando os Documentos Estão Prontos para Assinatura
                </Label>
                <Textarea
                  value={settings.notifications.whatsappSignaturesReady}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        whatsappSignaturesReady: e.target.value,
                      },
                    })
                  }
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  WhatsApp: Quando o Processo é Concluído pela Marinha
                </Label>
                <Textarea
                  value={settings.notifications.whatsappProcessCompleted}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        whatsappProcessCompleted: e.target.value,
                      },
                    })
                  }
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 7: INTEGRAÇÕES & CHAVES DE APIS */}
        {/* ========================================================= */}
        <TabsContent value="integrations" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Gateways de Pagamento, Mensageria e Assinaturas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie integrações externas de Stripe, WhatsApp e Provedores de Assinatura sem deploy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#075BFF]" />
                    <span className="text-xs font-bold text-[#0B1739]">Stripe Payments</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsStripeDialogOpen(true)}
                    className="h-7 text-xs font-semibold rounded-lg"
                  >
                    Configurar Stripe
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Processamento de cartões de crédito, Pix e assinaturas de planos com webhook integrado.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-[#0B1739]">WhatsApp Gateway</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Evolution / Z-API
                  </Badge>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Endpoint da API</Label>
                  <Input
                    value={settings.integrations.whatsappApiUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          whatsappApiUrl: e.target.value,
                        },
                      })
                    }
                    className="mt-1 h-8 text-xs rounded-lg font-mono"
                    placeholder="https://api.whatsapp..."
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-[#0B1739]">Provedor de Assinatura</span>
                  </div>
                  <Select
                    value={settings.integrations.signatureProvider}
                    onValueChange={(val: any) =>
                      setSettings({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          signatureProvider: val,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs rounded-lg w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="govbr">Gov.br Oficial</SelectItem>
                      <SelectItem value="docusign">DocuSign</SelectItem>
                      <SelectItem value="clicksign">Clicksign</SelectItem>
                      <SelectItem value="zapsign">ZapSign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-slate-500">
                  Assinador preferencial para coleta de firmas dos proprietários e outorgados.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-[#0B1739]">Inteligência Artificial (OCR)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                    Google Gemini Multimodal
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Reconhecimento visual inteligente de chassis, motores, NFs e comprovantes náuticos.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 8: BACKUP, RESTAURAÇÃO E RESET */}
        {/* ========================================================= */}
        <TabsContent value="backup" className="focus-visible:ring-0 mt-0 space-y-6">
          <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                Backup e Recuperação de Desastres No-Code
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporte ou importe a totalidade das configurações do sistema em arquivo JSON para cópias de segurança instantâneas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                <div className="w-10 h-10 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">Exportar Backup (JSON)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Baixa um arquivo com todas as configurações, serviços e taxas.
                  </p>
                </div>
                <Button
                  onClick={handleExportBackup}
                  className="w-full h-8 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl"
                >
                  Exportar Agora
                </Button>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto border border-emerald-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">Importar Configurações</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Restaura o sistema a partir de um arquivo JSON exportado.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs font-bold border-slate-200 rounded-xl"
                  >
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>

              <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl space-y-3 text-center">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto border border-red-200">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-700">Padrões de Fábrica</h4>
                  <p className="text-[11px] text-red-600/80 mt-0.5">
                    Restaura todo o sistema para as configurações iniciais da Marinha.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setResetAllConfirmOpen(true)}
                  className="w-full h-8 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Restaurar Tudo
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODAL: NOVO / EDITAR SERVIÇO NÁUTICO */}
      {/* ========================================================= */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              {editingService ? "Editar Serviço Náutico" : "Cadastrar Novo Serviço Náutico"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingService
                ? "Ajuste os parâmetros deste serviço regulamentado pela Marinha."
                : "Crie um novo serviço que será disponibilizado imediatamente para os clientes."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome Oficial do Serviço *</Label>
              <Input
                value={serviceFormName}
                onChange={(e) => setServiceFormName(e.target.value)}
                placeholder="Ex: Registro no Tribunal Marítimo"
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome Curto (Botões e Tags)</Label>
                <Input
                  value={serviceFormShortName}
                  onChange={(e) => setServiceFormShortName(e.target.value)}
                  placeholder="Ex: Tribunal Marítimo"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Categoria do Serviço</Label>
                <Select
                  value={serviceFormCategory}
                  onValueChange={(val: any) => setServiceFormCategory(val)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maritimo">Marítimo (Embarcação)</SelectItem>
                    <SelectItem value="pessoal">Pessoal (Habilitação / Amador)</SelectItem>
                    <SelectItem value="tecnico">Técnico (Engenharia / Perícia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Honorários Sugeridos (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceFormFee}
                  onChange={(e) => setServiceFormFee(Number(e.target.value) || 0)}
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Prazo Estimado da Marinha</Label>
                <Input
                  value={serviceFormDays}
                  onChange={(e) => setServiceFormDays(e.target.value)}
                  placeholder="Ex: 5 a 10 dias úteis"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Fundamentação NORMAM</Label>
              <Input
                value={serviceFormNormam}
                onChange={(e) => setServiceFormNormam(e.target.value)}
                placeholder="Ex: NORMAM-211/DPC, Anexo 2-C"
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Descrição para os Clientes</Label>
              <Textarea
                value={serviceFormDescription}
                onChange={(e) => setServiceFormDescription(e.target.value)}
                placeholder="Descreva a finalidade e quem deve contratar este serviço..."
                className="mt-1 text-xs rounded-xl min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Exige Embarcação Vinculada?
                </Label>
                <p className="text-[11px] text-slate-500">
                  Desmarque para serviços pessoais como CHA ou alteração cadastral.
                </p>
              </div>
              <Switch
                checked={serviceFormRequiresVessel}
                onCheckedChange={setServiceFormRequiresVessel}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServiceModalOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveServiceModal}
              className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
            >
              {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE SERVIÇO */}
      {/* ========================================================= */}
      <Dialog open={serviceDeleteConfirmOpen} onOpenChange={setServiceDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-[#0B1739]">
              Excluir Serviço Náutico?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Tem certeza que deseja remover o serviço{" "}
              <strong>{serviceToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServiceDeleteConfirmOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDeleteService}
              className="h-9 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR RESET DE TUDO AOS PADRÕES DE FÁBRICA */}
      {/* ========================================================= */}
      <Dialog open={resetAllConfirmOpen} onOpenChange={setResetAllConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-[#0B1739]">
              Restaurar Tudo aos Padrões de Fábrica?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Esta ação apagará todas as customizações de branding, serviços, taxas, regras e notificações, voltando a plataforma à instalação padrão da Marinha do Brasil.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetAllConfirmOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleResetAllToFactory}
              className="h-9 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, Restaurar Fábrica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StripeConfigDialog
        isOpen={isStripeDialogOpen}
        onClose={() => setIsStripeDialogOpen(false)}
      />
    </div>
  );
}
