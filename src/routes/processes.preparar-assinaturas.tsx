import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ArrowLeft, FileText, Check, Eye, Users, UserPlus, Mail, 
  ChevronDown, ChevronUp, Info, Download, AlertCircle, 
  CheckCircle2, Clock, Ship, Calendar, Pencil, Trash2, X,
  ShieldCheck, Send, User, Settings2, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/routes/dashboard";
import { signaturesService, type ParticipantRole } from "@/services/signatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";

type PrepararAssinaturasSearch = {
  processId?: string;
  orderId?: string;
  preview?: boolean;
  step?: number | string;
};

export const Route = createFileRoute("/processes/preparar-assinaturas")({
  validateSearch: (s: Record<string, unknown>): PrepararAssinaturasSearch => ({
    processId: typeof s.processId === "string" ? s.processId : undefined,
    orderId: typeof s.orderId === "string" ? s.orderId : undefined,
    preview: s.preview === true || s.preview === "true",
    step: typeof s.step === "number" || typeof s.step === "string" ? s.step : undefined,
  }),
  component: PrepararAssinaturasPage,
});

// Mock reference data aligned with process #0247
const DEFAULT_PROCESS_INFO = {
  processNumber: "0247",
  orderNumber: "0123",
  serviceName: "Transferência de propriedade",
  vesselName: "Mar Azul",
  customerName: "Marina Costa",
  customerEmail: "marina@example.com",
  buyerName: "Lucas Alves",
  buyerEmail: "lucas@example.com",
};

interface DocumentItem {
  id: string;
  name: string;
  version: number;
  generatedAt: string;
  status: "gerado" | "pendente" | "assinado" | "desatualizado";
  content: string;
  size: string;
}

interface SignerItem {
  id: string;
  name: string;
  role: "Vendedora" | "Comprador" | "Procurador" | "Responsável Técnico" | "Outro";
  email: string;
  assignedDocIds: string[];
  initials: string;
  avatarBg: string;
  avatarColor: string;
  badgeBg: string;
  badgeColor: string;
}

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-req",
    name: "Requerimento.pdf",
    version: 1,
    generatedAt: "12/03/2025 às 14:32",
    status: "gerado",
    size: "248 KB",
    content: `REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE\n\nILMO. SR. CAPITÃO DOS PORTOS DE SÃO PAULO\n\nEmbarcação: MAR AZUL (Inscrição: 381-000123)\nVendedora: Marina Costa (CPF: 042.819.330-12)\nComprador: Lucas Alves (CPF: 192.834.721-09)\n\nRequer-se a V. Sa. a homologação da transferência de propriedade do bem náutico supramencionado, conforme previsto nas normas da NORMAM-211/DPC.\n\nNestes termos, pede deferimento.\nSantos/SP, 12 de março de 2025.`,
  },
  {
    id: "doc-decl",
    name: "Declaracao-transferencia.pdf",
    version: 1,
    generatedAt: "12/03/2025 às 14:32",
    status: "gerado",
    size: "185 KB",
    content: `TERMO DE ENTREGA E DECLARAÇÃO DE RESPONSABILIDADE\n\nDeclaro para os devidos fins de direito que recebi a embarcação MAR AZUL em perfeitas condições de navegabilidade, assumindo a partir desta data plena responsabilidade civil, administrativa e marítima.\n\nVendedora: Marina Costa\nComprador: Lucas Alves\n\nSantos/SP, 12 de março de 2025.`,
  },
];

const INITIAL_SIGNERS: SignerItem[] = [
  {
    id: "signer-1",
    name: "Marina Costa",
    role: "Vendedora",
    email: "marina@example.com",
    assignedDocIds: ["doc-req", "doc-decl"],
    initials: "MC",
    avatarBg: "bg-[#e0edff]",
    avatarColor: "text-[#1868db]",
    badgeBg: "bg-[#e0edff]",
    badgeColor: "text-[#1868db]",
  },
  {
    id: "signer-2",
    name: "Lucas Alves",
    role: "Comprador",
    email: "lucas@example.com",
    assignedDocIds: ["doc-decl"],
    initials: "LA",
    avatarBg: "bg-[#dcfce7]",
    avatarColor: "text-[#15803d]",
    badgeBg: "bg-[#dcfce7]",
    badgeColor: "text-[#15803d]",
  },
];

const DEFAULT_MESSAGE = "Olá! Seus documentos estão disponíveis para conferência e assinatura. Acesse o link que você receberá por e-mail.";

function PrepararAssinaturasPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const processId = search.processId || "0247";

  // Step indicator: 1 = Preparar (Tela 14), 2 = Revisar envio (Tela 15)
  const initialStep = search.step === 2 || search.step === "2" ? 2 : 1;
  const [currentStep, setCurrentStep] = useState<1 | 2>(initialStep);

  // Process details loaded from Supabase or fallback
  const [processData, setProcessData] = useState<any>(DEFAULT_PROCESS_INFO);
  const [loadingProcess, setLoadingProcess] = useState(false);

  // Documents selection
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(["doc-req", "doc-decl"]);

  // Signers list
  const [signers, setSigners] = useState<SignerItem[]>(INITIAL_SIGNERS);

  // Message & Options
  const [customMessage, setCustomMessage] = useState(DEFAULT_MESSAGE);
  const [signingOrder, setSigningOrder] = useState<"free" | "sequential">("free");
  const [expiresInDays, setExpiresInDays] = useState("15");
  const [enableReminders, setEnableReminders] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  // Modals
  const [previewDocModal, setPreviewDocModal] = useState<DocumentItem | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingSigner, setEditingSigner] = useState<SignerItem | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  // Form states for Person Modal
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState<SignerItem["role"]>("Outro");
  const [personEmail, setPersonEmail] = useState("");
  const [personAssignedDocs, setPersonAssignedDocs] = useState<string[]>([]);

  // Sending status
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  // Sync step with URL param if it changes
  useEffect(() => {
    if (search.step === 2 || search.step === "2") {
      setCurrentStep(2);
    } else if (search.step === 1 || search.step === "1") {
      setCurrentStep(1);
    }
  }, [search.step]);

  // Load real process if available
  useEffect(() => {
    if (processId && processId !== "0247" && processId !== "demo") {
      setLoadingProcess(true);
      supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, email, cpf_cnpj),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number)
        `)
        .eq("id", processId)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setProcessData({
              processNumber: data.id.slice(0, 4),
              orderNumber: data.metadata?.order_number || data.metadata?.order_id?.slice(0, 4) || null,
              serviceName: data.process_type || data.title || "Transferência de propriedade",
              vesselName: data.vessel?.name || null,
              customerName: data.customer?.name || "Cliente",
              customerEmail: data.customer?.email || "",
              buyerName: data.metadata?.buyer_name || "Comprador",
              buyerEmail: data.metadata?.buyer_email || "",
            });
            if (data.customer) {
              setSigners((prev) => {
                const copy = [...prev];
                if (copy[0]) {
                  copy[0].name = data.customer.name;
                  copy[0].email = data.customer.email || copy[0].email;
                  copy[0].initials = data.customer.name.slice(0, 2).toUpperCase();
                }
                return copy;
              });
            }
          }
        })
        .finally(() => setLoadingProcess(false));
    }
  }, [processId]);

  // Toggle document selection
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => 
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Open modal to add new person
  const handleOpenAddPerson = () => {
    setEditingSigner(null);
    setPersonName("");
    setPersonRole("Vendedora");
    setPersonEmail("");
    setPersonAssignedDocs([...selectedDocIds]);
    setPersonModalOpen(true);
  };

  // Open modal to edit existing person
  const handleOpenEditPerson = (signer: SignerItem) => {
    setEditingSigner(signer);
    setPersonName(signer.name);
    setPersonRole(signer.role);
    setPersonEmail(signer.email);
    setPersonAssignedDocs([...signer.assignedDocIds]);
    setPersonModalOpen(true);
  };

  // Save person from modal
  const handleSavePerson = () => {
    if (!personName.trim()) {
      toast.error("Informe o nome da pessoa.");
      return;
    }
    if (!personEmail.trim() || !personEmail.includes("@")) {
      toast.error("Informe um e-mail válido para a solicitação de assinatura.");
      return;
    }
    if (personAssignedDocs.length === 0) {
      toast.error("Atribua pelo menos um documento para esta pessoa assinar.");
      return;
    }

    const initials = personName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    if (editingSigner) {
      setSigners((prev) =>
        prev.map((s) =>
          s.id === editingSigner.id
            ? {
                ...s,
                name: personName.trim(),
                role: personRole,
                email: personEmail.trim(),
                assignedDocIds: personAssignedDocs,
                initials: initials || s.initials,
              }
            : s
        )
      );
      toast.success("Dados do signatário atualizados.");
    } else {
      const newSigner: SignerItem = {
        id: `signer-${Date.now()}`,
        name: personName.trim(),
        role: personRole,
        email: personEmail.trim(),
        assignedDocIds: personAssignedDocs,
        initials: initials || "ND",
        avatarBg: "bg-[#e0edff]",
        avatarColor: "text-[#1868db]",
        badgeBg: "bg-[#e0edff]",
        badgeColor: "text-[#1868db]",
      };
      setSigners((prev) => [...prev, newSigner]);
      toast.success("Pessoa adicionada com sucesso.");
    }
    setPersonModalOpen(false);
  };

  // Remove person
  const handleRemovePerson = (id: string) => {
    if (signers.length <= 1) {
      toast.error("O processo deve ter pelo menos um signatário.");
      return;
    }
    setSigners((prev) => prev.filter((s) => s.id !== id));
    toast.info("Signatário removido.");
  };

  // Format assigned documents label for a signer
  const formatAssignedDocs = (docIds: string[]) => {
    const valid = documents.filter((d) => docIds.includes(d.id) && selectedDocIds.includes(d.id));
    if (valid.length === 0) return "Nenhum documento selecionado";
    if (valid.length === 2 && documents.length === 2) {
      return "Requerimento e Declaração";
    }
    if (valid.length === 1) {
      return valid[0].name.replace(".pdf", "");
    }
    return valid.map((d) => d.name.replace(".pdf", "")).join(", ");
  };

  // Validation before advancing to Step 2
  const handleProceedToReview = () => {
    if (selectedDocIds.length === 0) {
      toast.error("Selecione ao menos um documento para assinatura.");
      return;
    }

    if (signers.length === 0) {
      toast.error("Cadastre pelo menos uma pessoa para assinar.");
      return;
    }

    // Check if each signer has a valid email
    for (const s of signers) {
      if (!s.email.trim() || !s.email.includes("@")) {
        toast.error(`O signatário ${s.name} está com e-mail inválido ou incompleto.`);
        return;
      }
    }

    // Check if every selected document is signed by at least one person
    for (const docId of selectedDocIds) {
      const isSigned = signers.some((s) => s.assignedDocIds.includes(docId));
      if (!isSigned) {
        const doc = documents.find((d) => d.id === docId);
        toast.error(`O documento "${doc?.name}" não possui nenhum signatário atribuído.`);
        return;
      }
    }

    // Advance to Step 2
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Save draft without sending
  const handleSaveDraft = async () => {
    try {
      if (profile?.company_id && processId !== "0247") {
        await supabase
          .from("processes")
          .update({
            metadata: {
              signature_draft: {
                selectedDocIds,
                signers,
                customMessage,
                signingOrder,
                expiresInDays,
                updatedAt: new Date().toISOString(),
              },
            },
          })
          .eq("id", processId);
      }
      toast.success("Rascunho da solicitação salvo com sucesso! Nenhum convite foi enviado.");
    } catch (err: any) {
      toast.error("Erro ao salvar rascunho: " + err.message);
    }
  };

  // Final confirmation and real submission (Tela 15)
  const handleSendSignatures = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      if (profile?.company_id && processId !== "0247") {
        // Real creation via signaturesService
        await signaturesService.create({
          company_id: profile.company_id,
          title: `Assinaturas — ${processData.serviceName} (#${processData.processNumber})`,
          process_id: processId,
          signing_order: signingOrder,
          expires_at: new Date(Date.now() + parseInt(expiresInDays, 10) * 86400000).toISOString(),
          participants: signers.map((s, idx) => ({
            name: s.name,
            email: s.email,
            role: (s.role === "Vendedora" ? "cliente" : s.role === "Comprador" ? "outro" : "outro") as ParticipantRole,
            signing_order: idx,
          })),
          created_by: user?.id,
        });

        // Update process status
        await supabase
          .from("processes")
          .update({
            status: "waiting_signature",
            metadata: {
              signature_request_sent_at: new Date().toISOString(),
            },
          })
          .eq("id", processId);
      }

      setHasSent(true);
      toast.success("Solicitação de assinatura enviada com sucesso aos signatários!");

      // Navigate back to process detail with tracking
      setTimeout(() => {
        navigate({
          to: "/processes/$id",
          params: { id: processId },
          search: { preview: true },
        });
      }, 900);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao disparar assinaturas.");
    } finally {
      setIsSending(false);
    }
  };

  // Filter documents assigned to each signer
  const getDocsForSigner = (signer: SignerItem) => {
    return documents.filter((d) => signer.assignedDocIds.includes(d.id) && selectedDocIds.includes(d.id));
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

          {/* 1. CABEÇALHO */}
          <div className="mb-6">
            {currentStep === 1 ? (
              <Link
                to="/processes/$id"
                params={{ id: processId }}
                search={{ preview: true }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1868db] hover:text-[#1351aa] transition-colors mb-3 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Voltar ao processo</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1868db] hover:text-[#1351aa] transition-colors mb-3 group cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Voltar à preparação</span>
              </button>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0d2342] tracking-tight">
              {currentStep === 1 ? "Preparar assinaturas" : "Revise antes de enviar"}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {currentStep === 1 
                ? "Confira os documentos e quem precisa assinar." 
                : "Confira os destinatários e os documentos de cada pessoa."}
            </p>

            {/* Metadados do Processo */}
            <div className="mt-3 space-y-1 text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Processo #{processData.processNumber} · {processData.serviceName}</span>
              </div>
              {processData.vesselName ? (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Ship className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{processData.vesselName} · {processData.customerName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{processData.customerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. INDICADOR DE ETAPAS (STEPPER DE 2 PASSOS) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between sm:justify-center relative max-w-md mx-auto sm:gap-24">
              {/* Connecting line */}
              <div className="absolute left-10 right-10 top-5 -translate-y-1/2 h-0.5 bg-slate-200 z-0 sm:left-14 sm:right-14" />

              {/* Etapa 1: Preparar */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs transition-colors ${
                  currentStep === 1 
                    ? "bg-[#1868db] text-white ring-4 ring-[#1868db]/15" 
                    : "bg-[#1868db] text-white"
                }`}>
                  {currentStep > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : 1}
                </div>
                <span className={`text-xs md:text-sm font-bold mt-1.5 transition-colors ${
                  currentStep === 1 ? "text-[#1868db]" : "text-slate-700"
                }`}>
                  Preparar
                </span>
                {currentStep === 1 && (
                  <div className="w-10 h-1 bg-[#1868db] rounded-full mt-1" />
                )}
              </div>

              {/* Etapa 2: Revisar envio */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  currentStep === 2 
                    ? "bg-[#1868db] text-white ring-4 ring-[#1868db]/15" 
                    : "bg-white border-2 border-slate-200 text-slate-400"
                }`}>
                  2
                </div>
                <span className={`text-xs md:text-sm font-semibold mt-1.5 transition-colors ${
                  currentStep === 2 ? "text-[#1868db] font-bold" : "text-slate-400"
                }`}>
                  Revisar envio
                </span>
                {currentStep === 2 && (
                  <div className="w-12 h-1 bg-[#1868db] rounded-full mt-1" />
                )}
              </div>
            </div>

            {/* Mobile step tag */}
            <div className="sm:hidden text-center text-xs text-slate-400 font-medium mt-3 pt-2 border-t border-slate-50">
              Etapa {currentStep} de 2 · {currentStep === 1 ? "Preparar" : "Revisar envio"}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FASE 1: PREPARAR (TELA 14)                                                */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">

              {/* CARTÃO 1: DOCUMENTOS PARA ASSINATURA */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-1">
                  <FileText className="w-5 h-5 text-[#1868db]" />
                  <h2 className="text-base md:text-lg font-bold text-[#0d2342]">
                    Documentos para assinatura
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Selecione as versões que serão enviadas.
                </p>

                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 rounded-xl border transition-all gap-3 ${
                          isSelected
                            ? "bg-[#fbfdff] border-blue-200 shadow-2xs"
                            : "bg-white border-slate-100 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                            className="w-5 h-5 rounded-md data-[state=checked]:bg-[#1868db] data-[state=checked]:border-[#1868db]"
                          />

                          <div className="w-9 h-11 rounded-md bg-[#fee2e2] text-[#ef4444] font-bold text-[10px] flex flex-col items-center justify-center shrink-0 border border-[#fca5a5]/40 shadow-2xs">
                            <span>PDF</span>
                          </div>

                          <div>
                            <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Versão {doc.version} · Gerado em {doc.generatedAt}
                            </p>
                          </div>
                        </div>

                        <div className="self-end sm:self-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDocModal(doc)}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-[#1868db] border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARTÃO 2: QUEM PRECISA ASSINAR? */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Users className="w-5 h-5 text-[#1868db]" />
                      <h2 className="text-base md:text-lg font-bold text-[#0d2342]">
                        Quem precisa assinar?
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confira os contatos antes de continuar.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddPerson}
                    className="h-8 rounded-xl text-xs font-bold text-[#1868db] border-blue-200 hover:bg-blue-50/50 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Adicionar pessoa</span>
                  </Button>
                </div>

                <div className="space-y-4">
                  {signers.map((signer) => (
                    <div
                      key={signer.id}
                      className="p-4 rounded-xl border border-slate-100 bg-[#fdfefe] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Avatar, Name, Role badge & assigned docs */}
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-full ${signer.avatarBg} ${signer.avatarColor} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                          {signer.initials}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{signer.name}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${signer.badgeBg} ${signer.badgeColor}`}>
                              {signer.role}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 mt-1">
                            Documento{signer.assignedDocIds.length > 1 ? "s" : ""}:{" "}
                            <span className="font-medium text-slate-700">
                              {formatAssignedDocs(signer.assignedDocIds)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Email Input & Edit Button */}
                      <div className="flex items-center gap-2 md:w-[360px] self-stretch md:self-auto">
                        <div className="flex-1">
                          <span className="text-[10px] font-medium text-slate-400 block mb-1">E-mail para assinatura</span>
                          <Input
                            value={signer.email}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSigners((prev) =>
                                prev.map((s) => (s.id === signer.id ? { ...s, email: val } : s))
                              );
                            }}
                            placeholder="email@example.com"
                            className="h-9 text-xs rounded-xl bg-white border-slate-200"
                          />
                        </div>
                        <div className="self-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditPerson(signer)}
                            className="h-9 px-3 text-xs font-bold text-[#1868db] hover:bg-slate-100 rounded-xl"
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEÇÃO 3: MENSAGEM E OPÇÕES DE ENVIO (OPCIONAL) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOptionsExpanded((v) => !v)}
                  className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-5 h-5 text-[#1868db]" />
                    <span className="text-sm md:text-base font-bold text-[#0d2342]">
                      Mensagem e opções de envio (opcional)
                    </span>
                  </div>
                  {optionsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {optionsExpanded && (
                  <div className="p-5 md:p-6 pt-0 border-t border-slate-100 space-y-4 text-xs">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Mensagem personalizada para os signatários
                      </Label>
                      <Textarea
                        rows={3}
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        className="rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <Label className="text-xs font-bold text-slate-700 block mb-1">
                          Ordem de assinatura
                        </Label>
                        <select
                          value={signingOrder}
                          onChange={(e: any) => setSigningOrder(e.target.value)}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium"
                        >
                          <option value="free">Todos assinam ao mesmo tempo (livre)</option>
                          <option value="sequential">Ordem sequencial (um após o outro)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-700 block mb-1">
                          Prazo de expiração do link
                        </Label>
                        <select
                          value={expiresInDays}
                          onChange={(e) => setExpiresInDays(e.target.value)}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium"
                        >
                          <option value="7">7 dias corridos</option>
                          <option value="15">15 dias corridos (padrão)</option>
                          <option value="30">30 dias corridos</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="reminders"
                        checked={enableReminders}
                        onCheckedChange={(c) => setEnableReminders(!!c)}
                        className="w-4 h-4 rounded data-[state=checked]:bg-[#1868db]"
                      />
                      <label htmlFor="reminders" className="text-xs text-slate-600 font-medium cursor-pointer">
                        Enviar lembrete automático por e-mail 48h antes da expiração
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* FAIXA INFORMATIVA */}
              <div className="rounded-xl bg-[#f0f7ff] border border-[#e0edff] px-4 py-3 flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-[#1868db] shrink-0" />
                <span>Nenhuma solicitação foi enviada.</span>
              </div>

              {/* 4. RODAPÉ DE AÇÕES */}
              <div className="pt-2">
                {/* Desktop Buttons */}
                <div className="hidden sm:flex items-center justify-between">
                  <Link
                    to="/processes/$id"
                    params={{ id: processId }}
                    search={{ preview: true }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </Link>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                    >
                      Salvar rascunho
                    </Button>

                    <Button
                      type="button"
                      onClick={handleProceedToReview}
                      className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white px-6 py-2.5 shadow-xs flex items-center gap-1.5"
                    >
                      <span>Revisar envio</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Button>
                  </div>
                </div>

                {/* Mobile Buttons */}
                <div className="sm:hidden space-y-2.5">
                  <Button
                    type="button"
                    onClick={handleProceedToReview}
                    className="w-full rounded-xl text-sm font-bold bg-[#1868db] hover:bg-[#1456b6] text-white py-3 shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Revisar envio</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    className="w-full rounded-xl text-xs font-bold text-slate-700 border-slate-200"
                  >
                    Salvar rascunho
                  </Button>

                  <p className="text-center text-[10px] text-slate-400 pt-1">
                    Dados ilustrativos
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* FASE 2: REVISAR ENVIO DAS ASSINATURAS (TELA 15)                            */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">

              {/* 1. BARRA DE MÉTRICAS / RESUMO */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 shadow-xs">
                {/* Desktop 3 Columns */}
                <div className="hidden sm:grid grid-cols-3 divide-x divide-slate-100 text-slate-800">
                  <div className="flex items-center justify-center gap-2.5 px-4">
                    <FileText className="w-5 h-5 text-[#1868db]" />
                    <span className="font-bold text-sm md:text-base">
                      {selectedDocIds.length} documento{selectedDocIds.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 px-4">
                    <Users className="w-5 h-5 text-[#1868db]" />
                    <span className="font-bold text-sm md:text-base">
                      {signers.length} destinatário{signers.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 px-4">
                    <Mail className="w-5 h-5 text-[#1868db]" />
                    <span className="font-bold text-sm md:text-base">
                      Envio por e-mail
                    </span>
                  </div>
                </div>

                {/* Mobile 3 Columns */}
                <div className="sm:hidden grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/50">
                    <FileText className="w-4 h-4 text-[#1868db]" />
                    <span className="font-bold text-[11px] text-slate-800 leading-tight">
                      {selectedDocIds.length} documentos
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/50">
                    <Users className="w-4 h-4 text-[#1868db]" />
                    <span className="font-bold text-[11px] text-slate-800 leading-tight">
                      {signers.length} destinatários
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50/50">
                    <Mail className="w-4 h-4 text-[#1868db]" />
                    <span className="font-bold text-[11px] text-slate-800 leading-tight">
                      Envio por e-mail
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. CARTÕES SEPARADOS POR DESTINATÁRIO */}
              <div className="space-y-4">
                {signers.map((signer) => {
                  const assignedDocs = getDocsForSigner(signer);
                  return (
                    <div
                      key={signer.id}
                      className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs space-y-4"
                    >
                      {/* Top Header: Avatar, Name, Role, Email, Edit Action */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-full ${signer.avatarBg} ${signer.avatarColor} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                            {signer.initials}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-900">{signer.name}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${signer.badgeBg} ${signer.badgeColor}`}>
                                {signer.role}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                              {signer.email}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditPerson(signer)}
                          className="h-8 px-3 text-xs font-bold text-[#1868db] hover:bg-blue-50/50 rounded-xl"
                        >
                          Editar
                        </Button>
                      </div>

                      {/* Sub-block: Receberá para assinar: */}
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-slate-600 block mb-2">
                          Receberá para assinar:
                        </span>

                        <div className="space-y-2">
                          {assignedDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-8 rounded bg-[#fee2e2] text-[#ef4444] font-bold text-[9px] flex flex-col items-center justify-center shrink-0 border border-[#fca5a5]/40 shadow-2xs">
                                  <span>PDF</span>
                                </div>
                                <span className="font-bold text-slate-800">
                                  {doc.name} <span className="text-slate-400 font-normal font-mono">· v{doc.version}</span>
                                </span>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewDocModal(doc)}
                                className="h-7 px-2.5 rounded-lg text-xs font-bold text-[#1868db] border-slate-200 hover:bg-white flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Visualizar</span>
                              </Button>
                            </div>
                          ))}

                          {assignedDocs.length === 0 && (
                            <p className="text-xs text-amber-600 italic py-1">
                              Nenhum documento selecionado atribuído a este signatário.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. CARTÃO DE MENSAGEM AOS DESTINATÁRIOS & CONFIGURAÇÕES */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-5 h-5 text-[#1868db]" />
                    <h3 className="text-base font-bold text-[#0d2342]">
                      Mensagem aos destinatários
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessageModalOpen(true)}
                    className="h-8 px-3 text-xs font-bold text-[#1868db] hover:bg-blue-50/50 rounded-xl"
                  >
                    Editar
                  </Button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  {customMessage}
                </p>

                {/* Sub-bar with Order and Reminders */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    <span>
                      Ordem: <strong className="text-slate-700">{signingOrder === "free" ? "sem sequência definida" : "sequencial"}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      Lembretes automáticos: <strong className="text-slate-700">{enableReminders ? "ativados (48h antes)" : "desativados"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. AVISO ANTES DO ENVIO */}
              {!hasSent && (
                <div className="rounded-2xl bg-[#f0f7ff] border border-[#d0e3ff] p-4 flex items-start gap-3 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-[#1868db] text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    i
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0d2342] text-sm">Nada foi enviado ainda.</h4>
                    <p className="text-slate-600 mt-0.5">
                      Ao confirmar, cada pessoa receberá acesso apenas aos documentos indicados acima.
                    </p>
                  </div>
                </div>
              )}

              {/* 5. RODAPÉ DE AÇÕES DA TELA 15 */}
              <div className="pt-2">
                {/* Desktop Buttons */}
                <div className="hidden sm:flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar e corrigir</span>
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="rounded-xl text-xs font-bold text-slate-700 border-slate-200"
                    >
                      Salvar rascunho
                    </Button>

                    <Button
                      type="button"
                      disabled={isSending}
                      onClick={handleSendSignatures}
                      className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white px-6 py-2.5 shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>{isSending ? "Enviando..." : "Enviar solicitações"}</span>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Mobile Buttons */}
                <div className="sm:hidden space-y-2.5">
                  <Button
                    type="button"
                    disabled={isSending}
                    onClick={handleSendSignatures}
                    className="w-full rounded-xl text-sm font-bold bg-[#1868db] hover:bg-[#1456b6] text-white py-3 shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>{isSending ? "Enviando..." : "Enviar solicitações"}</span>
                    <Send className="w-4 h-4" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="w-full rounded-xl text-xs font-bold text-slate-700 border-slate-200 flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar e corrigir</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="w-full rounded-xl text-xs font-bold text-slate-700 border-slate-200"
                    >
                      Salvar rascunho
                    </Button>
                  </div>

                  <p className="text-center text-[10px] text-slate-400 pt-1">
                    Dados ilustrativos
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* MODAL: VISUALIZAR DOCUMENTO */}
      <Dialog open={previewDocModal !== null} onOpenChange={(open) => { if (!open) setPreviewDocModal(null); }}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white shadow-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold text-[#0d2342] flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                {previewDocModal?.name}
              </DialogTitle>
              <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                {previewDocModal?.status}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Versão {previewDocModal?.version} · {previewDocModal?.generatedAt} · {previewDocModal?.size}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed my-2 select-text">
            {previewDocModal?.content}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewDocModal(null)}
              className="rounded-xl text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADICIONAR OU EDITAR PESSOA */}
      <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0d2342] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1868db]" />
              {editingSigner ? "Editar Signatário" : "Adicionar Pessoa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure o papel, dados de contato e quais arquivos esta pessoa deverá assinar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Nome completo:</Label>
              <Input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Ramos"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">Papel no processo:</Label>
                <select
                  value={personRole}
                  onChange={(e: any) => setPersonRole(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium"
                >
                  <option value="Vendedora">Vendedora / Proprietário</option>
                  <option value="Comprador">Comprador</option>
                  <option value="Procurador">Procurador</option>
                  <option value="Responsável Técnico">Responsável Técnico</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">E-mail para assinatura:</Label>
                <Input
                  type="email"
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1.5">
                Quais documentos esta pessoa deve assinar?
              </Label>
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                {documents.map((doc) => {
                  const isChecked = personAssignedDocs.includes(doc.id);
                  return (
                    <div key={doc.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`person-doc-${doc.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setPersonAssignedDocs((prev) =>
                            checked
                              ? [...prev, doc.id]
                              : prev.filter((id) => id !== doc.id)
                          );
                        }}
                        className="w-4 h-4 rounded data-[state=checked]:bg-[#1868db]"
                      />
                      <label
                        htmlFor={`person-doc-${doc.id}`}
                        className="text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        {doc.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {editingSigner && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleRemovePerson(editingSigner.id);
                  setPersonModalOpen(false);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remover pessoa
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPersonModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSavePerson}
                className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white"
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR MENSAGEM */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0d2342] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#1868db]" />
              Editar Mensagem aos Destinatários
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta mensagem será incluída no e-mail com o link de assinatura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Mensagem:</Label>
              <Textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMessageModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMessageModalOpen(false);
                toast.success("Mensagem atualizada.");
              }}
              className="rounded-xl text-xs font-bold bg-[#1868db] hover:bg-[#1456b6] text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
