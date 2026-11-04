import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Paperclip,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ExternalLink,
  Info,
  FolderOpen,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getCustomizedOutputDocsCatalog,
  saveCustomizedOutputDocsCatalog,
  resetOutputDocsCatalogToDefaults,
} from "@/services/documents/adminRequirementsStorage";
import type {
  OutputDocumentConfig,
  OutputDocRequirementItem,
} from "@/routes/processes.novo-pedido";

// Lista de serviços oficiais suportados pela plataforma
const OFFICIAL_SERVICES = [
  { id: "inscricao", name: "Inscrição de embarcação" },
  { id: "transferencia", name: "Transferência de propriedade" },
  { id: "renovacao", name: "Renovação de TIE/TIEM" },
  { id: "alteracao_motor", name: "Alteração de motor" },
  { id: "segunda_via", name: "Segunda via de documento náutico" },
  { id: "vistoria", name: "Vistoria e perícia naval" },
  { id: "habilitacao_cha", name: "Habilitação náutica de amador (CHA)" },
  { id: "alteracao_cadastral", name: "Alteração cadastral do proprietário" },
  { id: "despacho_porto", name: "Aviso de saída / Despacho de porto" },
];

export function DocumentRequirementsManager() {
  const [documents, setDocuments] = useState<OutputDocumentConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  // Estados de Modais
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<OutputDocumentConfig | null>(null);

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [targetDocForReq, setTargetDocForReq] = useState<OutputDocumentConfig | null>(null);
  const [editingReq, setEditingReq] = useState<OutputDocRequirementItem | null>(null);

  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<OutputDocumentConfig | null>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Campos temporários do modal de documento
  const [docFormName, setDocFormName] = useState("");
  const [docFormServiceId, setDocFormServiceId] = useState("inscricao");
  const [docFormOfficialSource, setDocFormOfficialSource] = useState("");
  const [docFormPurpose, setDocFormPurpose] = useState("");
  const [docFormSignerRole, setDocFormSignerRole] = useState("");

  // Campos temporários do modal de requisito/anexo
  const [reqFormName, setReqFormName] = useState("");
  const [reqFormWhy, setReqFormWhy] = useState("");
  const [reqFormIsProtocolOnly, setReqFormIsProtocolOnly] = useState(false);

  // Carregar catálogo no início
  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("navaldocs_catalog_requirements_updated", handleUpdate);
    return () => {
      window.removeEventListener("navaldocs_catalog_requirements_updated", handleUpdate);
    };
  }, []);

  const loadData = () => {
    const list = getCustomizedOutputDocsCatalog();
    setDocuments(list);
  };

  // Salvar catálogo e notificar
  const persistChanges = (newDocs: OutputDocumentConfig[], message?: string) => {
    setDocuments(newDocs);
    saveCustomizedOutputDocsCatalog(newDocs);
    if (message) {
      toast.success(message);
    }
  };

  // Toggle de expansão
  const toggleExpand = (docId: string) => {
    setExpandedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    documents.forEach((d) => {
      allExpanded[d.id] = true;
    });
    setExpandedDocs(allExpanded);
  };

  const collapseAll = () => {
    setExpandedDocs({});
  };

  // ==========================================
  // OPERAÇÕES DE DOCUMENTOS OFICIAIS
  // ==========================================
  const handleOpenNewDocModal = () => {
    setEditingDoc(null);
    setDocFormName("");
    setDocFormServiceId("inscricao");
    setDocFormOfficialSource("NORMAM-211/DPC, Anexo ...");
    setDocFormPurpose("");
    setDocFormSignerRole("Proprietário Requerente");
    setDocModalOpen(true);
  };

  const handleOpenEditDocModal = (doc: OutputDocumentConfig) => {
    setEditingDoc(doc);
    setDocFormName(doc.name);
    setDocFormServiceId(doc.serviceId);
    setDocFormOfficialSource(doc.officialSource);
    setDocFormPurpose(doc.purpose);
    setDocFormSignerRole(doc.signerRole);
    setDocModalOpen(true);
  };

  const handleSaveDocModal = () => {
    if (!docFormName.trim()) {
      toast.error("O nome do documento é obrigatório.");
      return;
    }
    if (!docFormOfficialSource.trim()) {
      toast.error("A fonte oficial (NORMAM) é obrigatória.");
      return;
    }

    const selectedService = OFFICIAL_SERVICES.find((s) => s.id === docFormServiceId) || {
      id: docFormServiceId,
      name: "Serviço Náutico Geral",
    };

    if (editingDoc) {
      // Edição de documento existente
      const updated = documents.map((doc) => {
        if (doc.id === editingDoc.id) {
          return {
            ...doc,
            name: docFormName.trim(),
            serviceId: docFormServiceId,
            serviceName: selectedService.name,
            officialSource: docFormOfficialSource.trim(),
            purpose: docFormPurpose.trim(),
            signerRole: docFormSignerRole.trim(),
          };
        }
        return doc;
      });
      persistChanges(updated, `Documento "${docFormName.trim()}" atualizado com sucesso!`);
    } else {
      // Novo documento oficial
      const newId = `doc_custom_${Date.now()}`;
      const newDoc: OutputDocumentConfig = {
        id: newId,
        name: docFormName.trim(),
        serviceId: docFormServiceId,
        serviceName: selectedService.name,
        documentType: "official_form",
        officialSource: docFormOfficialSource.trim(),
        sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
        editionDate: "Edição Consolidada NORMAM/DPC",
        purpose: docFormPurpose.trim() || "Documento oficial regulamentado pela Autoridade Marítima.",
        signerRole: docFormSignerRole.trim() || "Requerente",
        personalDataFields: [
          { name: "Nome Completo e CPF/CNPJ", found: true },
          { name: "Endereço e Contato", found: true },
        ],
        vesselDataFields: [
          { name: "Identificação da Embarcação", found: true },
        ],
        attachments: [],
      };
      const updated = [newDoc, ...documents];
      persistChanges(updated, `Novo documento oficial "${docFormName.trim()}" cadastrado!`);
      setExpandedDocs((prev) => ({ ...prev, [newId]: true }));
    }

    setDocModalOpen(false);
  };

  const handleConfirmDeleteDoc = () => {
    if (!docToDelete) return;
    if (documents.length <= 1) {
      toast.error("Não é possível excluir o único documento do catálogo.");
      setDeleteDocConfirmOpen(false);
      return;
    }

    const updated = documents.filter((d) => d.id !== docToDelete.id);
    persistChanges(updated, `Documento "${docToDelete.name}" removido com sucesso.`);
    setDeleteDocConfirmOpen(false);
    setDocToDelete(null);
  };

  // ==========================================
  // OPERAÇÕES DE REQUISITOS DE ANEXOS
  // ==========================================
  const handleOpenNewReqModal = (doc: OutputDocumentConfig) => {
    setTargetDocForReq(doc);
    setEditingReq(null);
    setReqFormName("");
    setReqFormWhy("");
    setReqFormIsProtocolOnly(false);
    setReqModalOpen(true);
  };

  const handleOpenEditReqModal = (doc: OutputDocumentConfig, req: OutputDocRequirementItem) => {
    setTargetDocForReq(doc);
    setEditingReq(req);
    setReqFormName(req.name);
    setReqFormWhy(req.why);
    setReqFormIsProtocolOnly(req.isProtocolOnly);
    setReqModalOpen(true);
  };

  const handleSaveReqModal = () => {
    if (!targetDocForReq) return;
    if (!reqFormName.trim()) {
      toast.error("O nome do anexo / documento necessário é obrigatório.");
      return;
    }
    if (!reqFormWhy.trim()) {
      toast.error("A justificativa legal / exigência na NORMAM é obrigatória.");
      return;
    }

    let updatedAttachments: OutputDocRequirementItem[] = [];

    if (editingReq) {
      // Editar anexo existente
      updatedAttachments = (targetDocForReq.attachments || []).map((att) => {
        if (att.id === editingReq.id) {
          return {
            ...att,
            name: reqFormName.trim(),
            why: reqFormWhy.trim(),
            isProtocolOnly: reqFormIsProtocolOnly,
          };
        }
        return att;
      });
    } else {
      // Novo anexo
      const newAttId = `att_${Date.now()}`;
      const newAtt: OutputDocRequirementItem = {
        id: newAttId,
        name: reqFormName.trim(),
        why: reqFormWhy.trim(),
        isProtocolOnly: reqFormIsProtocolOnly,
      };
      updatedAttachments = [...(targetDocForReq.attachments || []), newAtt];
    }

    const updatedDocs = documents.map((doc) => {
      if (doc.id === targetDocForReq.id) {
        return {
          ...doc,
          attachments: updatedAttachments,
        };
      }
      return doc;
    });

    persistChanges(
      updatedDocs,
      editingReq
        ? `Requisito "${reqFormName.trim()}" atualizado!`
        : `Requisito "${reqFormName.trim()}" adicionado a ${targetDocForReq.name}!`
    );

    // Garantir que o card fique expandido para visualização
    setExpandedDocs((prev) => ({ ...prev, [targetDocForReq.id]: true }));
    setReqModalOpen(false);
  };

  const handleDeleteReq = (docId: string, reqId: string, reqName: string) => {
    const updatedDocs = documents.map((doc) => {
      if (doc.id === docId) {
        return {
          ...doc,
          attachments: (doc.attachments || []).filter((a) => a.id !== reqId),
        };
      }
      return doc;
    });

    persistChanges(updatedDocs, `Requisito "${reqName}" excluído do documento.`);
  };

  const handleResetToDefaults = () => {
    const defaults = resetOutputDocsCatalogToDefaults();
    setDocuments(defaults);
    setResetConfirmOpen(false);
    toast.success("Catálogo restaurado para a matriz padrão oficial da Marinha do Brasil (NORMAM-211/212/201)!");
  };

  // Filtragem dos documentos
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.officialSource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.attachments || []).some(
          (a) =>
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.why.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchService =
        serviceFilter === "all" || doc.serviceId === serviceFilter;

      const matchType =
        typeFilter === "all" ||
        (typeFilter === "com_anexos" && (doc.attachments?.length || 0) > 0) ||
        (typeFilter === "sem_anexos" && (doc.attachments?.length || 0) === 0);

      return matchSearch && matchService && matchType;
    });
  }, [documents, searchTerm, serviceFilter, typeFilter]);

  // Contagens para o dashboard
  const totalAttachmentsCount = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.attachments?.length || 0), 0);
  }, [documents]);

  const totalProtocolOnlyCount = useMemo(() => {
    return documents.reduce(
      (acc, d) =>
        acc + (d.attachments || []).filter((a) => a.isProtocolOnly).length,
      0
    );
  }, [documents]);

  const totalFillingCount = totalAttachmentsCount - totalProtocolOnlyCount;

  return (
    <div className="space-y-6">
      {/* 1. DASHBOARD DE ESTATÍSTICAS E AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white border-slate-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Documentos Oficiais
            </p>
            <p className="text-2xl font-extrabold text-[#0B1739] mt-0.5">
              {documents.length}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3" /> Suite 100% Homologada
            </p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center border border-blue-100">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Requisitos / Anexos
            </p>
            <p className="text-2xl font-extrabold text-[#0B1739] mt-0.5">
              {totalAttachmentsCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Exigências regulatórias NORMAM
            </p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <Paperclip className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Para Preenchimento de PDF
            </p>
            <p className="text-2xl font-extrabold text-[#075BFF] mt-0.5">
              {totalFillingCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Alimentam campos nos formulários
            </p>
          </div>
          <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Apenas Protocolo na CP
            </p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
              {totalProtocolOnlyCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Cópia/anexo físico para despacho
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* 2. BARRA DE CONTROLE, BUSCA E FILTROS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por documento oficial, anexo NORMAM, serviço ou requisito..."
              className="pl-10 h-9 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-[#075BFF]"
            />
          </div>

          {/* Filtro por Serviço Náutico */}
          <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[190px]">
                <SelectValue placeholder="Filtrar por serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Serviços ({documents.length})</SelectItem>
                {OFFICIAL_SERVICES.map((s) => {
                  const count = documents.filter((d) => d.serviceId === s.id).length;
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Toggle de Expandir/Recolher */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-[#075BFF] hover:bg-white rounded-lg"
              >
                Expandir Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-[#075BFF] hover:bg-white rounded-lg"
              >
                Recolher
              </Button>
            </div>

            {/* Botão Novo Documento Oficial */}
            <Button
              onClick={handleOpenNewDocModal}
              className="h-9 px-3.5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Documento Oficial
            </Button>

            {/* Botão Reset Padrões Marinha */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirmOpen(true)}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
              title="Restaurar padrões oficiais da Marinha"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span className="hidden sm:inline text-xs">Padrões NORMAM</span>
            </Button>
          </div>
        </div>

        {/* Nota explicativa de compliance */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-950 text-xs">
          <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Gestão Dinâmica de Requisitos:</strong> Qualquer alteração feita nesta aba
            (adicionar novo documento oficial, alterar portaria ou incluir novos documentos necessários)
            é sincronizada instantaneamente no fluxo de <em>Novo Pedido</em> e nos geradores oficiais de PDF.
          </p>
        </div>
      </div>

      {/* 3. LISTAGEM DE DOCUMENTOS E SEUS DOCUMENTOS NECESSÁRIOS */}
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Nenhum documento encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? "Nenhum documento ou requisito corresponde ao termo pesquisado."
              : "Nenhum documento cadastrado para o filtro selecionado."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc, index) => {
            const isExpanded = !!expandedDocs[doc.id];
            const attachmentsCount = doc.attachments?.length || 0;

            return (
              <Card
                key={doc.id}
                className={`bg-white border transition-all rounded-2xl overflow-hidden shadow-2xs ${
                  isExpanded ? "border-[#075BFF]/40 ring-1 ring-[#075BFF]/20" : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* CABEÇALHO DO DOCUMENTO OFICIAL */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100/80">
                      {index + 1}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0B1739] truncate">
                          {doc.name}
                        </h4>
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-[#075BFF] border-blue-100 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        >
                          {doc.serviceName}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md border-slate-200 text-slate-600 bg-slate-50/50"
                        >
                          {attachmentsCount === 1
                            ? "1 documento necessário"
                            : `${attachmentsCount} documentos necessários`}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {doc.officialSource}
                        </span>
                        <span>•</span>
                        <span>Signatário: <strong>{doc.signerRole}</strong></span>
                      </div>

                      {doc.purpose && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {doc.purpose}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações do Documento */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNewReqModal(doc)}
                      className="h-8 px-2.5 text-[11px] font-semibold text-[#075BFF] border-blue-200 hover:bg-blue-50 rounded-xl"
                      title="Adicionar documento necessário a este modelo"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Requisito
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDocModal(doc)}
                      className="h-8 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-[#0B1739] hover:bg-slate-100 rounded-xl"
                      title="Editar metadados do documento"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocToDelete(doc);
                        setDeleteDocConfirmOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      title="Excluir documento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(doc.id)}
                      className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 rounded-xl"
                      title={isExpanded ? "Recolher anexos" : "Ver documentos necessários"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#075BFF]" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* CORPO EXPANSÍVEL: DOCUMENTOS NECESSÁRIOS / REQUISITOS DE ANEXOS */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-slate-500" />
                        <h5 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                          Documentos Necessários para emissão e protocolo
                        </h5>
                        <Badge
                          variant="secondary"
                          className="bg-white border-slate-200 text-slate-600 text-[10px] px-1.5 py-0"
                        >
                          {attachmentsCount}
                        </Badge>
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenNewReqModal(doc)}
                        className="h-7 px-2.5 text-[11px] font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-lg"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Novo Anexo Necessário
                      </Button>
                    </div>

                    {attachmentsCount === 0 ? (
                      <div className="p-4 bg-white border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          Nenhum documento ou anexo necessário cadastrado para este modelo.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNewReqModal(doc)}
                          className="h-7 text-xs font-semibold text-[#075BFF] border-blue-200 hover:bg-blue-50"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Adicionar primeiro requisito
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {doc.attachments.map((att, attIdx) => {
                          return (
                            <div
                              key={att.id || attIdx}
                              className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-[#0B1739]">
                                    {att.name}
                                  </span>
                                  {att.isProtocolOnly ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-md"
                                    >
                                      Apenas Protocolo na CP
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-50 text-[#075BFF] border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded-md"
                                    >
                                      Preenchimento do Documento
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-600 flex items-start gap-1">
                                  <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span>{att.why}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditReqModal(doc, att)}
                                  className="h-7 px-2 text-[10px] font-semibold text-slate-600 hover:text-[#0B1739] hover:bg-slate-100 rounded-lg"
                                >
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReq(doc.id, att.id, att.name)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Remover requisito deste documento"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADICIONAR / EDITAR DOCUMENTO OFICIAL */}
      {/* ========================================================= */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              {editingDoc ? "Editar Documento Oficial" : "Novo Documento Oficial da Marinha"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingDoc
                ? "Atualize as informações regulatórias e metadados deste documento oficial."
                : "Cadastre um novo modelo de documento oficial decorrente de novas portarias da Marinha do Brasil."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nome Oficial do Documento *
              </Label>
              <Input
                value={docFormName}
                onChange={(e) => setDocFormName(e.target.value)}
                placeholder="Ex: Requerimento de Inscrição Inicial de Embarcação"
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Serviço Vinculado *
                </Label>
                <Select value={docFormServiceId} onValueChange={setDocFormServiceId}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICIAL_SERVICES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Papel do Signatário *
                </Label>
                <Input
                  value={docFormSignerRole}
                  onChange={(e) => setDocFormSignerRole(e.target.value)}
                  placeholder="Ex: Proprietário Requerente"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Fonte Oficial / Portaria da Marinha *
              </Label>
              <Input
                value={docFormOfficialSource}
                onChange={(e) => setDocFormOfficialSource(e.target.value)}
                placeholder="Ex: NORMAM-211/DPC, Anexo 2-C (Portaria DPC/DGN/MB Nº 200/2026)"
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Finalidade do Documento
              </Label>
              <Textarea
                value={docFormPurpose}
                onChange={(e) => setDocFormPurpose(e.target.value)}
                placeholder="Descreva a finalidade legal perante a Capitania dos Portos..."
                className="mt-1 text-xs rounded-xl min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocModalOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDocModal}
              className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
            >
              {editingDoc ? "Salvar Alterações" : "Cadastrar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: ADICIONAR / EDITAR REQUISITO DE ANEXO */}
      {/* ========================================================= */}
      <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              {editingReq
                ? "Editar Documento Necessário / Requisito"
                : "Adicionar Documento Necessário"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincular anexo obrigatório para o documento:{" "}
              <strong>{targetDocForReq?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nome do Documento Necessário (Anexo) *
              </Label>
              <Input
                value={reqFormName}
                onChange={(e) => setReqFormName(e.target.value)}
                placeholder="Ex: Nota Fiscal do Casco / Documento de Aquisição"
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Justificativa Legal / Fundamentação na NORMAM *
              </Label>
              <Textarea
                value={reqFormWhy}
                onChange={(e) => setReqFormWhy(e.target.value)}
                placeholder="Ex: Fornece número da NF e estaleiro para preenchimento dos campos do formulário..."
                className="mt-1 text-xs rounded-xl min-h-[70px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Exigência Exclusiva de Protocolo Físico?
                </Label>
                <p className="text-[11px] text-slate-500">
                  Ative se o anexo não preenche campos do PDF, sendo exigido apenas na Capitania.
                </p>
              </div>
              <Switch
                checked={reqFormIsProtocolOnly}
                onCheckedChange={setReqFormIsProtocolOnly}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReqModalOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReqModal}
              className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
            >
              {editingReq ? "Atualizar Requisito" : "Salvar Requisito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: CONFIRMAR EXCLUSÃO DE DOCUMENTO OFICIAL */}
      {/* ========================================================= */}
      <Dialog open={deleteDocConfirmOpen} onOpenChange={setDeleteDocConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-[#0B1739]">
              Excluir Documento Oficial?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Tem certeza que deseja remover o documento{" "}
              <strong>{docToDelete?.name}</strong>? Os requisitos de anexos associados
              também serão desvinculados deste modelo.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDocConfirmOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDeleteDoc}
              className="h-9 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 4: CONFIRMAR RESTAURAÇÃO DOS PADRÕES NORMAM */}
      {/* ========================================================= */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto mb-2 border border-blue-100">
              <RotateCcw className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-[#0B1739]">
              Restaurar Padrões da Marinha?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Esta ação restaura a lista para a matriz padrão consolidada da NORMAM-211,
              NORMAM-212 e NORMAM-201 com todos os 22 documentos oficiais e exigências de
              anexos oficiais.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirmOpen(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleResetToDefaults}
              className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
            >
              Restaurar Padrões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
