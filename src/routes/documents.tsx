import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText, Search, Plus, Download, Eye,
  LayoutGrid, List, MoreVertical, X,
  Zap, Calendar, Archive, Star, Copy, Share2, History, Link as LinkIcon,
  CheckCircle2, AlertTriangle, ClipboardList, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { SmartOCR } from "@/components/SmartOCR";
import { useDocuments } from "@/hooks/useDocuments";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/navigation/PageHeader";
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/documents")({
  component: Documents,
});

type Tab = "all" | "recent" | "favorites" | "signed" | "pending" | "archived";

const FAV_KEY = "ndp.docs.favorites";
const ARC_KEY = "ndp.docs.archived";

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

function Documents() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"standard" | "smart">("standard");
  const { generatedDocuments, isLoadingGenerated, getSignedUrl, categories: officialCategories } = useDocuments();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [vesselFilter, setVesselFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());

  useEffect(() => { setFavorites(loadSet(FAV_KEY)); setArchived(loadSet(ARC_KEY)); }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveSet(FAV_KEY, next);
      toast.success(next.has(id) ? "Adicionado aos favoritos" : "Removido dos favoritos");
      return next;
    });
  };
  const toggleArchive = (id: string) => {
    setArchived(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveSet(ARC_KEY, next);
      toast.success(next.has(id) ? "Documento arquivado" : "Restaurado da arquivação");
      return next;
    });
  };

  const resolveSignedUrl = async (raw: string) => {
    const path = raw.startsWith("http")
      ? raw.match(/generated-documents\/(.+)$/)?.[1]
      : raw;
    if (!path) throw new Error("Caminho do PDF inválido");
    return getSignedUrl("generated-documents", path);
  };

  const handleViewDocument = async (doc: any) => {
    if (doc.status === "error") return toast.error("Falha na geração do PDF — revise o template.");
    const url = doc.signed_file_url || doc.generated_file_url;
    if (!url) return toast.error("PDF não gerado.");
    try { window.open(await resolveSignedUrl(url), "_blank"); }
    catch (e) { console.error(e); toast.error("Erro ao abrir documento."); }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (doc.status === "error" || !doc.generated_file_url) return toast.error("PDF não gerado.");
    try {
      const url = await resolveSignedUrl(doc.signed_file_url || doc.generated_file_url);
      const a = document.createElement("a");
      a.href = url; a.download = `${doc.name || "documento"}.pdf`; a.target = "_blank";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); toast.error("Erro ao baixar PDF."); }
  };

  const handleShare = async (doc: any) => {
    try {
      const url = await resolveSignedUrl(doc.signed_file_url || doc.generated_file_url);
      await navigator.clipboard.writeText(url);
      toast.success("Link de compartilhamento copiado (validade temporária).");
    } catch { toast.error("Não foi possível gerar link."); }
  };

  const handleDuplicate = () => toast.info("Duplicar documento estará disponível em breve.");
  const handleVersions = () => toast.info("Histórico de versões em breve.");
  const handleRelateProcess = () => toast.info("Use o processo correspondente para vincular este documento.");

  const statusBadge = (s?: string) => {
    if (s === "completed") return { label: "Concluído", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    if (s === "error") return { label: "Falha", cls: "bg-rose-50 text-rose-700 border-rose-100" };
    if (s === "pending") return { label: "Pendente", cls: "bg-amber-50 text-amber-700 border-amber-100" };
    return { label: "Rascunho", cls: "bg-slate-50 text-slate-600 border-slate-100" };
  };

  const allDocs = generatedDocuments || [];

  // Unique filter options
  const customers = useMemo<[string, string][]>(() => {
    const m = new Map<string, string>();
    for (const d of allDocs as any[]) if (d.customer?.name && d.customer_id) m.set(String(d.customer_id), String(d.customer.name));
    return [...m.entries()];
  }, [allDocs]);
  const vessels = useMemo<[string, string][]>(() => {
    const m = new Map<string, string>();
    for (const d of allDocs as any[]) if (d.vessel?.name && d.vessel_id) m.set(String(d.vessel_id), String(d.vessel.name));
    return [...m.entries()];
  }, [allDocs]);
  const templates = useMemo<[string, string][]>(() => {
    const m = new Map<string, string>();
    for (const d of allDocs as any[]) if (d.template?.name && d.template_id) m.set(String(d.template_id), String(d.template.name));
    return [...m.entries()];
  }, [allDocs]);
  const categories = ["all", ...(officialCategories?.map((c: any) => c.name) || [])];

  const filtered = useMemo(() => {
    const now = Date.now();
    const recentCut = now - 7 * 86400000;
    return allDocs.filter((d: any) => {
      const isArchived = archived.has(d.id);
      if (tab === "archived") { if (!isArchived) return false; }
      else if (isArchived) return false;

      if (tab === "favorites" && !favorites.has(d.id)) return false;
      if (tab === "recent" && new Date(d.created_at).getTime() < recentCut) return false;
      if (tab === "signed" && !(d.signature_status === "signed" || d.signed_file_url)) return false;
      if (tab === "pending" && !(d.status === "pending" || d.signature_status === "pending")) return false;

      if (search) {
        const t = search.toLowerCase();
        const blob = `${d.name || ""} ${d.customer?.name || ""} ${d.vessel?.name || ""} ${d.template?.name || ""}`.toLowerCase();
        if (!blob.includes(t)) return false;
      }
      if (customerFilter !== "all" && d.customer_id !== customerFilter) return false;
      if (vesselFilter !== "all" && d.vessel_id !== vesselFilter) return false;
      if (templateFilter !== "all" && d.template_id !== templateFilter) return false;
      if (categoryFilter !== "all" && d.template?.category !== categoryFilter && d.category !== categoryFilter) return false;
      if (dateFrom && new Date(d.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(d.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [allDocs, archived, favorites, tab, search, customerFilter, vesselFilter, templateFilter, categoryFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: 0, recent: 0, favorites: 0, signed: 0, pending: 0, archived: 0 };
    const recentCut = Date.now() - 7 * 86400000;
    for (const d of allDocs) {
      if (archived.has(d.id)) { c.archived++; continue; }
      c.all++;
      if (new Date(d.created_at).getTime() >= recentCut) c.recent++;
      if (favorites.has(d.id)) c.favorites++;
      if (d.signature_status === "signed" || d.signed_file_url) c.signed++;
      if (d.status === "pending" || d.signature_status === "pending") c.pending++;
    }
    return c;
  }, [allDocs, archived, favorites]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "all", label: "Todos", icon: FileText },
    { id: "recent", label: "Recentes", icon: Calendar },
    { id: "favorites", label: "Favoritos", icon: Star },
    { id: "signed", label: "Assinados", icon: ShieldCheck },
    { id: "pending", label: "Pendentes", icon: AlertTriangle },
    { id: "archived", label: "Arquivados", icon: Archive },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <PageHeader
        title="Biblioteca de Documentos"
        description="Consulta, reutilização e versionamento. Para criar novos, use o fluxo do processo."
        actions={
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Link
              to="/templates/marketplace"
              className="bg-slate-100 text-navy px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
            >
              Templates
            </Link>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex-grow sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Anexar / OCR
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${active ? "bg-navy text-white border-navy shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-primary/40 hover:text-primary"}`}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${active ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar arquivo, cliente, embarcação, template..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <FilterSelect value={customerFilter} onChange={setCustomerFilter} label="Cliente" options={customers} />
          <FilterSelect value={vesselFilter} onChange={setVesselFilter} label="Embarcação" options={vessels} />
          <FilterSelect value={templateFilter} onChange={setTemplateFilter} label="Template" options={templates} />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            {categories.map((c: string) => <option key={c} value={c}>{c === "all" ? "Categoria: Todas" : c}</option>)}
          </select>
          <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-100">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-400"}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-slate-400"}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-[auto_auto_1fr] items-center gap-3 mt-3">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            De
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold" />
          </label>
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Até
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold" />
          </label>
          {(dateFrom || dateTo || search || customerFilter !== "all" || vesselFilter !== "all" || templateFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setCustomerFilter("all"); setVesselFilter("all"); setTemplateFilter("all"); setCategoryFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="justify-self-end text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoadingGenerated ? (
        viewMode === "grid" ? <CardGridSkeleton count={8} /> : <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nenhum documento encontrado"
          description="Ajuste os filtros ou anexe um documento via OCR. Para criar documentos oficiais, use o fluxo do processo."
          actionLabel="Anexar / OCR"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((doc: any) => {
            const b = statusBadge(doc.status);
            const isFav = favorites.has(doc.id);
            const isSigned = doc.signature_status === "signed" || !!doc.signed_file_url;
            return (
              <div key={doc.id} className="group bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all flex flex-col">
                {/* Cover */}
                <div className="h-32 bg-gradient-to-br from-slate-50 via-white to-primary/5 border-b border-slate-100 flex items-center justify-center relative">
                  <FileText className="h-12 w-12 text-primary/40" />
                  <button
                    onClick={() => toggleFavorite(doc.id)}
                    className={`absolute top-3 right-3 p-1.5 rounded-full transition-all ${isFav ? "bg-amber-100 text-amber-600" : "bg-white/80 text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100"}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                  </button>
                  <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${b.cls}`}>{b.label}</span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <h4 className="font-black text-navy text-sm leading-tight line-clamp-2" title={doc.name}>{doc.name}</h4>

                  <div className="text-[10px] font-bold text-slate-500 space-y-1">
                    {doc.customer?.name && <div className="truncate">Cliente: {doc.customer.name}</div>}
                    {doc.vessel?.name && <div className="truncate">Embarcação: {doc.vessel.name}</div>}
                    {doc.template?.name && <div className="truncate">Template: {doc.template.name}</div>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {doc.generated_file_url && <Pill icon={FileText} label="PDF" tone="slate" />}
                    {isSigned && <Pill icon={ShieldCheck} label="Assinado" tone="emerald" />}
                    {doc.verification_code && <Pill icon={CheckCircle2} label="Certificado" tone="cyan" />}
                    {doc.process_id && <Pill icon={ClipboardList} label="Processo" tone="indigo" />}
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold mt-auto">
                    {format(new Date(doc.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between gap-2">
                  <button onClick={() => handleViewDocument(doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-navy text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90">
                    <Eye className="h-3 w-3" /> Ver
                  </button>
                  <button onClick={() => handleDownloadDocument(doc)} title="Baixar" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleShare(doc)} title="Compartilhar" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary"><Share2 className="h-3.5 w-3.5" /></button>
                  <DocMenu doc={doc} archived={archived.has(doc.id)} onArchive={() => toggleArchive(doc.id)} onDuplicate={handleDuplicate} onVersions={handleVersions} onRelate={handleRelateProcess} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Embarcação</th>
                  <th className="px-4 py-3">Sinais</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((doc: any) => {
                  const b = statusBadge(doc.status);
                  const isSigned = doc.signature_status === "signed" || !!doc.signed_file_url;
                  const isFav = favorites.has(doc.id);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors text-sm group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => toggleFavorite(doc.id)} className={isFav ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}>
                            <Star className={`h-4 w-4 ${isFav ? "fill-amber-500" : ""}`} />
                          </button>
                          <FileText className="h-5 w-5 text-primary/70 shrink-0" />
                          <span className="font-bold text-navy truncate" title={doc.name}>{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{doc.customer?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{doc.vessel?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.generated_file_url && <Pill icon={FileText} label="PDF" tone="slate" />}
                          {isSigned && <Pill icon={ShieldCheck} label="Assinado" tone="emerald" />}
                          {doc.verification_code && <Pill icon={CheckCircle2} label="Cert" tone="cyan" />}
                          {doc.process_id && <Pill icon={ClipboardList} label="Proc" tone="indigo" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${b.cls}`}>{b.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <button onClick={() => handleViewDocument(doc)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" title="Visualizar"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleDownloadDocument(doc)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" title="Baixar"><Download className="h-4 w-4" /></button>
                          <button onClick={() => handleShare(doc)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" title="Compartilhar"><Share2 className="h-4 w-4" /></button>
                          <DocMenu doc={doc} archived={archived.has(doc.id)} onArchive={() => toggleArchive(doc.id)} onDuplicate={handleDuplicate} onVersions={handleVersions} onRelate={handleRelateProcess} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-slate-100">
            {filtered.map((doc: any) => {
              const b = statusBadge(doc.status);
              const isSigned = doc.signature_status === "signed" || !!doc.signed_file_url;
              return (
                <div key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="font-bold text-navy text-sm truncate">{doc.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 truncate">{doc.customer?.name || "—"} · {doc.vessel?.name || "—"}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${b.cls}`}>{b.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 my-2">
                    {doc.generated_file_url && <Pill icon={FileText} label="PDF" tone="slate" />}
                    {isSigned && <Pill icon={ShieldCheck} label="Assinado" tone="emerald" />}
                    {doc.verification_code && <Pill icon={CheckCircle2} label="Cert" tone="cyan" />}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewDocument(doc)} className="flex-1 py-1.5 rounded-lg bg-navy text-white text-[10px] font-black uppercase tracking-widest">Ver</button>
                    <button onClick={() => handleDownloadDocument(doc)} className="p-2 rounded-lg bg-slate-100 text-slate-500"><Download className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleShare(doc)} className="p-2 rounded-lg bg-slate-100 text-slate-500"><Share2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white w-full ${uploadMode === "smart" ? "max-w-3xl" : "max-w-xl"} rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex gap-2">
                <button onClick={() => setUploadMode("standard")} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${uploadMode === "standard" ? "bg-navy text-white shadow-lg" : "text-slate-400 hover:text-navy"}`}>Upload</button>
                <button onClick={() => setUploadMode("smart")} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${uploadMode === "smart" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-primary"}`}>
                  <Zap className="h-4 w-4" /> OCR Inteligente
                </button>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            {uploadMode === "standard" ? (
              <div className="p-8 space-y-4 text-center">
                <p className="text-slate-500 text-sm">
                  A criação oficial de documentos passou para o <b className="text-navy">fluxo do processo</b>. Use o OCR para anexar PDFs avulsos à biblioteca.
                </p>
                <button onClick={() => setUploadMode("smart")} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Abrir OCR</button>
              </div>
            ) : (
              <div className="p-6 bg-slate-50/50">
                <SmartOCR />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest"
    >
      <option value="all">{label}: Todos</option>
      {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  );
}

function Pill({ icon: Icon, label, tone }: { icon: any; label: string; tone: "slate" | "emerald" | "cyan" | "indigo" }) {
  const map = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${map[tone]}`}>
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  );
}

function DocMenu({ doc, archived, onArchive, onDuplicate, onVersions, onRelate }: { doc: any; archived: boolean; onArchive: () => void; onDuplicate: () => void; onVersions: () => void; onRelate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" title="Mais">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-40 w-56 bg-white border border-slate-100 rounded-xl shadow-2xl py-1 text-xs font-bold">
            <MenuItem icon={Copy} label="Duplicar" onClick={() => { setOpen(false); onDuplicate(); }} />
            <MenuItem icon={History} label="Versões" onClick={() => { setOpen(false); onVersions(); }} />
            <MenuItem icon={LinkIcon} label="Relacionar a processo" onClick={() => { setOpen(false); onRelate(); }} />
            {doc.process_id && (
              <Link to="/processes/$id" params={{ id: doc.process_id }} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50">
                <ClipboardList className="h-3.5 w-3.5" /> Abrir processo
              </Link>
            )}
            <MenuItem icon={Archive} label={archived ? "Restaurar" : "Arquivar"} onClick={() => { setOpen(false); onArchive(); }} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 text-left">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
