import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  HelpCircle, 
  Lightbulb, 
  Bug, 
  Send, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  ChevronRight, 
  ChevronDown,
  Paperclip, 
  X, 
  Loader2, 
  ExternalLink,
  ShieldCheck, 
  RefreshCw,
  Search,
  User,
  Building,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  ArrowRight,
  FileText
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  getCompanySuggestions, 
  createSuggestion, 
  SuggestionType, 
  SuggestionStatus,
  ParsedSuggestion 
} from "@/services/suggestionsService";

export const Route = createFileRoute("/sugestoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    tipo: (search.tipo as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <AjudaESugestoesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Configuração visual dos 4 estados oficiais
const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; icon: any }> = {
  recebida: {
    label: "Recebida",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  em_analise: {
    label: "Em análise",
    color: "bg-blue-50 text-[#075BFF] border-blue-200",
    icon: Clock,
  },
  respondida: {
    label: "Respondida",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: MessageSquare,
  },
  concluida: {
    label: "Concluída",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

// Dúvidas comuns da Ajuda Rápida
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  actionText?: string;
  actionPath?: string;
}

const FAQS: FaqItem[] = [
  {
    id: "cadastrar-cliente",
    question: "Como cadastrar cliente",
    answer: "Acesse a opção 'Cadastrar cliente' no menu ou na página inicial. Você pode preencher os dados do cliente manualmente ou enviar uma CNH/comprovante de endereço para preenchimento com extração inteligente.",
    actionText: "Cadastrar cliente",
    actionPath: "/customers/novo",
  },
  {
    id: "cadastrar-embarcacao",
    question: "Como cadastrar embarcação",
    answer: "Acesse 'Cadastrar embarcação' na página inicial ou na relação de embarcações. Selecione o cliente proprietário, informe o nome, número de inscrição, tipo de navegação e as especificações de casco e motor.",
    actionText: "Cadastrar embarcação",
    actionPath: "/vessels/novo",
  },
  {
    id: "iniciar-servico",
    question: "Como iniciar um serviço",
    answer: "Na página inicial, clique no card 'Serviços' e selecione a categoria da embarcação (Esporte e Recreio ou Comercial). Em seguida, escolha o serviço náutico desejado, como Inscrição, Transferência de Propriedade ou Renovação de TIE.",
    actionText: "Iniciar serviço",
    actionPath: "/servicos",
  },
  {
    id: "leitura-automatica",
    question: "Como enviar documentos para leitura automática",
    answer: "Ao criar um novo processo ou cadastrar um cliente/embarcação, anexe fotos ou PDFs dos documentos de origem (como CNH ou comprovante de endereço). O sistema extrai automaticamente os dados cadastrais para poupar tempo de digitação.",
    actionText: "Ver processos",
    actionPath: "/processes",
  },
  {
    id: "corrigir-dados",
    question: "Como corrigir dados extraídos",
    answer: "Todos os dados lidos pela inteligência artificial ficam abertos para conferência antes de salvar. Você também pode revisar e editar qualquer dado diretamente na tela de revisão do processo náutico.",
    actionText: "Ver processos",
    actionPath: "/processes",
  },
  {
    id: "gerar-baixar-pdf",
    question: "Como gerar e baixar PDF",
    answer: "No fluxo do processo náutico (Cliente → Embarcação → Serviço → Documentos), selecione o funcionário responsável e clique em 'Gerar prévia'. Revise o documento formatado nos padrões oficiais da Marinha com a marca da sua empresa e clique em 'Baixar PDF'.",
    actionText: "Ver processos",
    actionPath: "/processes",
  },
  {
    id: "anexar-assinado-govbr",
    question: "Como anexar um arquivo assinado pelo gov.br",
    answer: "Baixe o PDF gerado pelo NavalDocs Pro e solicite a assinatura digital do cliente pelo portal oficial gov.br. Com o documento assinado em mãos, volte ao processo da embarcação e anexe o arquivo final assinado na aba de documentos do processo. (Nota: o processo de assinatura é realizado externamente no portal oficial gov.br).",
    actionText: "Ver processos",
    actionPath: "/processes",
  },
  {
    id: "acompanhar-protocolos",
    question: "Como acompanhar protocolos",
    answer: "Após dar entrada no pedido na Capitania dos Portos, Delegacia ou Agência, registre o número e a data do protocolo no histórico do processo. Você poderá consultar a tramitação e resolver pendências até a emissão da documentação final.",
    actionText: "Ver processos",
    actionPath: "/processes",
  },
];

export function AjudaESugestoesPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const { profile, companyId: authCompanyId, user } = useAuth();
  const companyId = profile?.company_id || authCompanyId;

  // Estado da Ajuda Rápida (Acordeão)
  const [openFaqId, setOpenFaqId] = useState<string | null>("cadastrar-cliente");
  const [faqSearch, setFaqSearch] = useState("");

  // Estado do Formulário de Sugestão/Problema
  const initialType: SuggestionType = searchParams.tipo === "problema" ? "problema" : "sugestao";
  const [selectedType, setSelectedType] = useState<SuggestionType>(initialType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Confirmação com Número de Referência
  const [confirmationData, setConfirmationData] = useState<{ referenceNumber: string; type: SuggestionType } | null>(null);

  // Modal de Detalhes da Solicitação
  const [detailModalItem, setDetailModalItem] = useState<ParsedSuggestion | null>(null);

  // 1. Consulta das próprias solicitações da empresa
  const { 
    data: mySuggestions = [], 
    isLoading: isLoadingSuggestions,
    refetch: refetchSuggestions 
  } = useQuery({
    queryKey: ["company-suggestions-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await getCompanySuggestions(companyId);
    },
    enabled: Boolean(companyId),
  });

  // Filtragem de FAQs da Ajuda Rápida
  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQS;
    const term = faqSearch.toLowerCase();
    return FAQS.filter(
      (f) => f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term)
    );
  }, [faqSearch]);

  // Manipular anexo de imagem
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 10 MB.");
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Envio da Sugestão / Problema
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast.error("Identificação da empresa não encontrada. Verifique seu login.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Informe o assunto da sua solicitação.");
      return;
    }

    if (!description.trim()) {
      toast.error("Por favor, descreva os detalhes da sua sugestão ou problema.");
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl: string | null = null;

      // Upload de imagem se houver
      if (imageFile) {
        const fileExt = (imageFile.name.split(".").pop() || "png").toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${companyId}/feedback/${fileName}`;
        await uploadToBucket("process-attachments", storagePath, imageFile);
        attachmentUrl = storagePath;
      }

      const result = await createSuggestion({
        companyId,
        userId: user?.id || profile?.id,
        userName: profile?.name || user?.email || "Usuário",
        type: selectedType,
        title: subject.trim(),
        description: description.trim(),
        attachmentUrl,
      });

      // Sucesso: exibe modal de confirmação com número de referência
      setConfirmationData({
        referenceNumber: result.referenceNumber,
        type: selectedType,
      });

      // Limpar formulário
      setSubject("");
      setDescription("");
      handleRemoveImage();

      // Atualizar lista
      queryClient.invalidateQueries({ queryKey: ["company-suggestions-list", companyId] });
      toast.success("Solicitação enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar sugestão:", err);
      toast.error(err?.message || "Não foi possível enviar sua solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-8">
      
      {/* ========================================================================= */}
      {/* CABEÇALHO UNIFICADO */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Ajuda e sugestões
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Tire dúvidas frequentes sobre as operações náuticas do sistema ou envie suas sugestões e relatos diretamente para a nossa equipe.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* ÁREA 1: AJUDA RÁPIDA (DÚVIDAS COMUNS) */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
              1. Ajuda rápida
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Respostas práticas para as principais ações do NavalDocs Pro.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar dúvida..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Lista de Acordeões */}
        <div className="space-y-2.5">
          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Nenhuma dúvida encontrada para a busca informada.
            </p>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;

              return (
                <div
                  key={faq.id}
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isOpen ? "border-blue-200 bg-blue-50/20" : "border-slate-200/80 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer focus:outline-none"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#075BFF]" />
                      <span>{faq.question}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#075BFF]" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-blue-100/60 text-xs text-slate-600 leading-relaxed space-y-3 animate-in fade-in-50 duration-150">
                      <p>{faq.answer}</p>
                      
                      {faq.actionPath && (
                        <div className="pt-1">
                          <Link
                            to={faq.actionPath}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold transition-colors"
                          >
                            <span>{faq.actionText}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ÁREA 2: ENVIAR SUGESTÃO OU RELATAR PROBLEMA */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
            2. Enviar sugestão ou relatar problema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sua opinião direciona a evolução do NavalDocs Pro. Toda mensagem é lida e respondida diretamente pela equipe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Tipo: Sugestão ou Problema */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Tipo de solicitação
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setSelectedType("sugestao")}
                className={`py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedType === "sugestao"
                    ? "border-[#075BFF] bg-blue-50 text-[#075BFF] shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                <span>Sugestão</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("problema")}
                className={`py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedType === "problema"
                    ? "border-red-600 bg-red-50 text-red-700 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                }`}
              >
                <Bug className="h-4 w-4" />
                <span>Problema</span>
              </button>
            </div>
          </div>

          {/* Campo: Assunto */}
          <div>
            <label htmlFor="ticket-subject" className="block text-xs font-semibold text-slate-700 mb-1">
              Assunto
            </label>
            <Input
              id="ticket-subject"
              type="text"
              placeholder={
                selectedType === "sugestao" 
                  ? "Ex.: Sugestão de novo modelo de termo de entrega" 
                  : "Ex.: Erro ao tentar baixar PDF do requerimento"
              }
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs rounded-xl h-10 border-slate-200"
              required
            />
          </div>

          {/* Campo: Descrição */}
          <div>
            <label htmlFor="ticket-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição detalhada
            </label>
            <Textarea
              id="ticket-description"
              rows={4}
              placeholder={
                selectedType === "sugestao"
                  ? "Conte-nos como essa melhoria ajudaria na rotina do seu escritório náutico..."
                  : "Descreva o que aconteceu, em qual tela ou processo ocorreu e o resultado esperado..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs rounded-xl border-slate-200 leading-relaxed resize-y"
              required
            />
          </div>

          {/* Anexo Opcional de Imagem */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Anexo de imagem (opcional)
            </label>
            
            {imagePreview ? (
              <div className="relative inline-block mt-1">
                <img
                  src={imagePreview}
                  alt="Anexo selecionado"
                  className="h-28 w-auto rounded-xl object-contain border border-slate-200 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-slate-800 text-white hover:bg-red-600 transition-colors shadow-xs"
                  title="Remover anexo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-attachment-input"
                />
                <label
                  htmlFor="image-attachment-input"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <span>Anexar captura de tela ou foto</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos aceitos: PNG, JPG ou PDF (máx. 10 MB)
                </p>
              </div>
            )}
          </div>

          {/* Botão de Envio */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar solicitação</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* ======================================================================= */}
        {/* CONSULTA DAS PRÓPRIAS SOLICITAÇÕES */}
        {/* ======================================================================= */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739]">
                Minhas solicitações enviadas
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o andamento e as respostas da nossa equipe.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetchSuggestions()}
              className="inline-flex items-center gap-1.5 text-xs text-[#075BFF] hover:underline font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Atualizar lista</span>
            </button>
          </div>

          {isLoadingSuggestions ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#075BFF]" />
              <span>Carregando suas solicitações...</span>
            </div>
          ) : mySuggestions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-slate-200/60">
              <MessageSquare className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nenhuma solicitação enviada ainda</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Envie uma sugestão ou relate um problema no formulário acima.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
              {mySuggestions.map((item) => {
                const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.recebida;
                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/60 transition-colors space-y-2.5 cursor-pointer"
                    onClick={() => setDetailModalItem(item)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.type === "problema" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <Bug className="h-3 w-3" />
                            Problema
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lightbulb className="h-3 w-3" />
                            Sugestão
                          </span>
                        )}

                        <span className="text-xs font-bold text-slate-900 line-clamp-1">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.referenceNumber}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.cleanDescription}
                    </p>

                    {/* Resposta do Administrador se houver */}
                    {item.adminResponse && (
                      <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100 text-xs text-slate-700 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-purple-900 text-[11px]">
                          <span>Resposta da Equipe ({item.adminResponse.respondedBy}):</span>
                          <span className="text-slate-400 font-normal">{item.adminResponse.respondedAt}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {item.adminResponse.text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO COM NÚMERO DE REFERÊNCIA */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(confirmationData)} onOpenChange={(open) => !open && setConfirmationData(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader className="text-center sm:text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <Check className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              {confirmationData?.type === "problema" ? "Relato de problema recebido" : "Sugestão enviada com sucesso"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Sua solicitação foi registrada em nossos sistemas e já está na fila de atendimento da equipe técnica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-center space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Número de Referência
              </span>
              <p className="text-xl font-bold font-mono text-[#075BFF] tracking-wide">
                {confirmationData?.referenceNumber}
              </p>
            </div>

            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Você pode acompanhar o estado da sua solicitação diretamente na seção <strong>Minhas solicitações enviadas</strong> nesta tela.
            </p>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => setConfirmationData(null)}
              className="w-full bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES DA SOLICITAÇÃO */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(detailModalItem)} onOpenChange={(open) => !open && setDetailModalItem(null)}>
        {detailModalItem && (
          <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  {detailModalItem.referenceNumber}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_CONFIG[detailModalItem.status]?.color}`}>
                  {STATUS_CONFIG[detailModalItem.status]?.label}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                {detailModalItem.title}
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 block">Sua mensagem:</span>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  {detailModalItem.cleanDescription}
                </p>
              </div>

              {detailModalItem.attachmentUrl && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Anexo enviado:</span>
                  <a
                    href={detailModalItem.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#075BFF] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Visualizar arquivo anexo</span>
                  </a>
                </div>
              )}

              {/* Resposta do Administrador */}
              {detailModalItem.adminResponse ? (
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900 border-b border-purple-200/80 pb-2">
                    <span>Resposta da Equipe ({detailModalItem.adminResponse.respondedBy})</span>
                    <span className="font-normal text-[11px] text-slate-500">{detailModalItem.adminResponse.respondedAt}</span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {detailModalItem.adminResponse.text}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-500 text-xs">
                  Sua solicitação está em análise. Assim que a nossa equipe responder, a resposta aparecerá aqui.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailModalItem(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

    </div>
  );
}
