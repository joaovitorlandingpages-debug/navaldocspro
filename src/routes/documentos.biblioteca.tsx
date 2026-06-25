import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Download,
  PencilLine,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  Library,
} from "lucide-react";
import {
  fetchLibrary,
  type LibraryTemplate,
  type DocStatus,
  STATUS_LABELS,
  STATUS_COLOR,
  detectMissingFields,
  logLibraryEvent,
} from "@/services/documentLibrary";
import { toast } from "sonner";

export const Route = createFileRoute("/documentos/biblioteca")({
  component: BibliotecaPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-10 text-center text-red-600">
      <p className="font-bold">Erro: {error.message}</p>
      <button onClick={reset} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg">
        Tentar novamente
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Não encontrado</div>,
});

function BibliotecaPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("__all__");
  const [proc, setProc] = useState("__all__");
  const [orgao, setOrgao] = useState("__all__");
  const [obrig, setObrig] = useState<"__all__" | "yes" | "no">("__all__");
  const [detail, setDetail] = useState<LibraryTemplate | null>(null);
  const [selected, setSelected] = useState<Record<string, DocStatus>>({});

  const libQ = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const list = libQ.data || [];

  const cats = useMemo(
    () => Array.from(new Set(list.map((t) => t.category).filter(Boolean))) as string[],
    [list],
  );
  const procs = useMemo(
    () =>
      Array.from(new Set(list.map((t) => t.process_type).filter(Boolean))) as string[],
    [list],
  );
  const orgaos = useMemo(
    () =>
      Array.from(
        new Set(list.map((t) => t.metadata?.orgao).filter(Boolean)),
      ) as string[],
    [list],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return list.filter((t) => {
      if (s && !`${t.name} ${t.code} ${t.description}`.toLowerCase().includes(s))
        return false;
      if (cat !== "__all__" && t.category !== cat) return false;
      if (proc !== "__all__" && t.process_type !== proc) return false;
      if (orgao !== "__all__" && t.metadata?.orgao !== orgao) return false;
      const mand = !!t.metadata?.mandatory_in_process;
      if (obrig === "yes" && !mand) return false;
      if (obrig === "no" && mand) return false;
      return true;
    });
  }, [list, q, cat, proc, orgao, obrig]);

  const toggleSelect = async (t: LibraryTemplate) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[t.id]) {
        delete next[t.id];
        logLibraryEvent("library_document_removed", {
          template_id: t.id,
          code: t.code,
        });
      } else {
        next[t.id] = "pending";
        logLibraryEvent("library_document_selected", {
          template_id: t.id,
          code: t.code,
        });
      }
      return next;
    });
  };

  const setStatus = (t: LibraryTemplate, status: DocStatus) => {
    setSelected((prev) => ({ ...prev, [t.id]: status }));
    logLibraryEvent("process_document_status_changed", {
      template_id: t.id,
      code: t.code,
      to: status,
    });
  };

  const selectedList = list.filter((t) => selected[t.id]);
  const missingMandatory = selectedList.filter(
    (t) => t.metadata?.mandatory_in_process && selected[t.id] !== "approved",
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-slate-100 rounded-xl shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-navy truncate">
                Biblioteca Nacional de Documentos Navais
              </h1>
              <p className="text-xs text-slate-500 italic truncate">
                Templates oficiais + privados, com sugestão automática por processo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {filtered.length} de {list.length}
            </span>
            <span className="hidden sm:inline-flex text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {Object.keys(selected).length} selecionados
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </div>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Buscar
              </span>
              <div className="relative mt-1">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nome, código, descrição..."
                  className="pl-8 w-full border border-slate-200 rounded-xl py-2 text-sm"
                />
              </div>
            </label>
            <FilterSelect
              label="Categoria"
              value={cat}
              onChange={setCat}
              options={cats}
            />
            <FilterSelect
              label="Tipo de processo"
              value={proc}
              onChange={setProc}
              options={procs}
            />
            <FilterSelect
              label="Órgão"
              value={orgao}
              onChange={setOrgao}
              options={orgaos}
            />
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Obrigatoriedade
              </span>
              <select
                value={obrig}
                onChange={(e) => setObrig(e.target.value as any)}
                className="mt-1 w-full border border-slate-200 rounded-xl py-2 px-2 text-sm bg-white"
              >
                <option value="__all__">Todos</option>
                <option value="yes">Apenas obrigatórios</option>
                <option value="no">Apenas opcionais</option>
              </select>
            </label>
            <button
              onClick={() => {
                setQ("");
                setCat("__all__");
                setProc("__all__");
                setOrgao("__all__");
                setObrig("__all__");
              }}
              className="w-full text-[11px] font-bold text-slate-500 hover:text-navy py-1"
            >
              Limpar filtros
            </button>
          </div>

          {selectedList.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                Status do processo
              </div>
              {missingMandatory.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  Todos os obrigatórios aprovados
                </div>
              ) : (
                <div className="text-xs">
                  <div className="flex items-center gap-2 text-amber-700 font-bold mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    {missingMandatory.length} obrigatório(s) pendente(s)
                  </div>
                  <ul className="space-y-0.5 text-slate-600 list-disc list-inside">
                    {missingMandatory.slice(0, 5).map((t) => (
                      <li key={t.id} className="truncate">{t.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                disabled={missingMandatory.length > 0}
                onClick={() => {
                  logLibraryEvent("process_library_validation_passed", {
                    selected: selectedList.map((s) => s.code),
                  });
                  toast.success("PDF final pronto para geração");
                }}
                className="w-full mt-2 bg-primary text-white text-xs font-black uppercase tracking-wider py-2 rounded-xl disabled:opacity-40"
              >
                Gerar PDF final do processo
              </button>
            </div>
          )}
        </aside>

        {/* Cards */}
        <main className="min-w-0">
          {libQ.isLoading ? (
            <div className="py-20 flex flex-col items-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-sm font-medium">Carregando biblioteca...</span>
            </div>
          ) : libQ.isError ? (
            <div className="py-20 text-center text-red-600">
              {(libQ.error as any)?.message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                Nenhum documento encontrado para o filtro atual.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <Card
                  key={t.id}
                  t={t}
                  status={selected[t.id]}
                  onOpen={() => setDetail(t)}
                  onToggle={() => toggleSelect(t)}
                  onApprove={() => setStatus(t, "approved")}
                  onGen={() => {
                    setStatus(t, "pdf_generated");
                    toast.success(`${t.name}: PDF marcado como gerado`);
                  }}
                  onFill={() => setStatus(t, "filling")}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {detail && <DetailModal t={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-xl py-2 px-2 text-sm bg-white"
      >
        <option value="__all__">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Card({
  t,
  status,
  onOpen,
  onToggle,
  onApprove,
  onGen,
  onFill,
}: {
  t: LibraryTemplate;
  status?: DocStatus;
  onOpen: () => void;
  onToggle: () => void;
  onApprove: () => void;
  onGen: () => void;
  onFill: () => void;
}) {
  const mand = !!t.metadata?.mandatory_in_process;
  const missing = detectMissingFields(t, {});
  return (
    <div
      className={`relative bg-white border rounded-2xl p-4 flex flex-col gap-3 transition ${
        status ? "border-primary/40 ring-1 ring-primary/20" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-navy text-sm truncate">{t.name}</span>
            {t.is_global && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                Global
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {t.category}
            {t.metadata?.orgao ? ` · ${t.metadata.orgao}` : ""}
          </div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
            mand ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {mand ? "Obrigatório" : "Opcional"}
        </span>
      </div>

      {status && (
        <div
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md w-fit ${STATUS_COLOR[status]}`}
        >
          {STATUS_LABELS[status]}
        </div>
      )}

      {t.description && (
        <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>
      )}

      {missing.length > 0 && status && (
        <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
          Faltam: {missing.join(", ")}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-slate-100">
        <SmBtn icon={<Eye className="h-3 w-3" />} onClick={onOpen}>Prévia</SmBtn>
        <SmBtn icon={<PencilLine className="h-3 w-3" />} onClick={onFill}>
          Preencher
        </SmBtn>
        <SmBtn
          icon={<ShieldCheck className="h-3 w-3" />}
          onClick={onApprove}
          tone="ok"
        >
          Aprovar
        </SmBtn>
        <SmBtn icon={<Download className="h-3 w-3" />} onClick={onGen} tone="primary">
          PDF
        </SmBtn>
        <SmBtn
          icon={<CheckCircle2 className="h-3 w-3" />}
          onClick={onToggle}
          tone={status ? "warn" : "default"}
        >
          {status ? "Remover" : "Adicionar"}
        </SmBtn>
      </div>
    </div>
  );
}

function SmBtn({
  icon,
  children,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "ok" | "warn" | "primary";
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
        : tone === "primary"
          ? "bg-primary text-white hover:opacity-90"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200";
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${cls}`}
    >
      {icon}
      {children}
    </button>
  );
}

function DetailModal({ t, onClose }: { t: LibraryTemplate; onClose: () => void }) {
  const m = t.metadata || {};
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-black text-navy truncate">{t.name}</h3>
            {t.code && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {t.code}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          <Field label="Descrição" value={t.description} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Categoria" value={t.category} />
            <Field label="Tipo de processo" value={t.process_type} />
            <Field label="Órgão" value={m.orgao} />
            <Field
              label="Validade"
              value={m.validity_days ? `${m.validity_days} dias` : "Indeterminada"}
            />
          </div>
          <Field label="Quando usar" value={m.when_to_use} />
          <FieldList label="Campos obrigatórios" items={m.mandatory_fields} />
          <FieldList label="Campos opcionais" items={m.optional_fields} />
          <FieldList label="Dependências" items={m.dependencies} />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">
              Template base
            </span>
            <pre className="mt-1 bg-slate-50 rounded-xl p-4 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-y-auto">
              {t.base_content || "(sem texto base)"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase text-slate-400">
        {label}
      </span>
      <div className="text-sm text-slate-700 mt-0.5">
        {value ? String(value) : <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function FieldList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length)
    return (
      <Field label={label} value={null} />
    );
  return (
    <div>
      <span className="text-[10px] font-black uppercase text-slate-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((i) => (
          <span
            key={i}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
