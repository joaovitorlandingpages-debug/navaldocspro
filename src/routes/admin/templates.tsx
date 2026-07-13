/**
 * Sprint 4D.2.d — Fatia B
 * Rota canônica única de administração de modelos de documentação.
 * Substitui /admin/documentos, /admin/documents, /admin/document-library,
 * /admin/modelos-processo (redirecionadas).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  FileStack, Plus, Search, SlidersHorizontal, MoreVertical,
  Eye, PencilLine, GitBranch, Archive, Copy, History, Star,
  Loader2, AlertTriangle, ShieldAlert, ArrowLeft, Globe, Building2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/templates")({
  component: AdminTemplatesPage,
  head: () => ({
    meta: [
      { title: "Modelos de Documentação — Admin" },
      { name: "description", content: "Gestão centralizada de modelos de documentos: rascunhos, publicados, arquivados, globais e da empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const navigate = useNavigate();
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="font-semibold mb-2">Erro ao carregar modelos</p>
        <p className="text-sm text-slate-500 mb-4">{error.message}</p>
        <Button onClick={() => { reset(); navigate({ to: "/admin/templates" }); }}>
          Tentar novamente
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-10 text-center text-slate-500">Modelo não encontrado.</div>
  ),
});

type LifecycleStatus = "all" | "draft" | "published" | "archived";
type ScopeFilter = "all" | "company" | "global";
type SortKey = "updated_desc" | "updated_asc" | "name_asc" | "version_desc";

function AdminTemplatesPage() {
  const { user, profile } = useAuth();
  const role = profile?.role ?? "";
  const companyId = profile?.company_id ?? null;
  const isMaster = role === "admin_master" || role === "admin_master_global";
  const canAdmin = isMaster || ["company_admin", "admin", "manager", "owner"].includes(role);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useMemo(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [status, setStatus] = useState<LifecycleStatus>("all");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [processType, setProcessType] = useState<string>("all");
  const [onlyDefaults, setOnlyDefaults] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated_desc");

  const query = useQuery({
    queryKey: ["admin-templates-canonical"],
    enabled: !!user && canAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select(
          "id, name, code, category, process_type, region_tag, is_global, is_active, company_id, updated_at, version, version_number, lifecycle_status, is_default_for_scope",
        )
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data ?? [];

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.category as string).filter(Boolean) as string[])).sort(),
    [rows],
  );
  const processTypes = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.process_type as string).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let out = rows as any[];
    if (debounced) {
      out = out.filter((r) =>
        [r.name, r.code, r.category, r.process_type]
          .filter(Boolean).some((v: string) => v.toLowerCase().includes(debounced)),
      );
    }
    if (status !== "all") out = out.filter((r) => (r.lifecycle_status ?? "draft") === status);
    if (scope === "company") out = out.filter((r) => !r.is_global);
    if (scope === "global") out = out.filter((r) => r.is_global);
    if (category !== "all") out = out.filter((r) => r.category === category);
    if (processType !== "all") out = out.filter((r) => r.process_type === processType);
    if (onlyDefaults) out = out.filter((r) => r.is_default_for_scope);
    switch (sort) {
      case "updated_asc":
        out = [...out].sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? "")); break;
      case "name_asc":
        out = [...out].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")); break;
      case "version_desc":
        out = [...out].sort((a, b) => (b.version_number ?? b.version ?? 0) - (a.version_number ?? a.version ?? 0)); break;
      default:
        out = [...out].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    }
    return out;
  }, [rows, debounced, status, scope, category, processType, onlyDefaults, sort]);

  // Permission gate
  if (!user) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold">Autenticação necessária</p>
        <p className="text-sm text-slate-500 mt-1">Entre para gerenciar modelos.</p>
        <Button className="mt-4" asChild><Link to="/auth">Entrar</Link></Button>
      </div>
    );
  }
  if (!canAdmin) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold">Sem permissão</p>
        <p className="text-sm text-slate-500 mt-1">Sua conta não tem acesso ao admin de modelos.</p>
      </div>
    );
  }

  const Filters = (
    <div className="grid gap-3">
      <Select value={status} onValueChange={(v) => setStatus(v as LifecycleStatus)}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="draft">Rascunhos</SelectItem>
          <SelectItem value="published">Publicados</SelectItem>
          <SelectItem value="archived">Arquivados</SelectItem>
        </SelectContent>
      </Select>
      <Select value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
        <SelectTrigger><SelectValue placeholder="Escopo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos escopos</SelectItem>
          <SelectItem value="company">Meus modelos (empresa)</SelectItem>
          <SelectItem value="global">Globais</SelectItem>
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={processType} onValueChange={setProcessType}>
        <SelectTrigger><SelectValue placeholder="Tipo de processo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos de processo</SelectItem>
          {processTypes.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm px-1">
        <input
          type="checkbox"
          checked={onlyDefaults}
          onChange={(e) => setOnlyDefaults(e.target.checked)}
          className="rounded border-slate-300"
        />
        Somente modelos padrão
      </label>
      <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
        <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_desc">Atualização (mais recente)</SelectItem>
          <SelectItem value="updated_asc">Atualização (mais antiga)</SelectItem>
          <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
          <SelectItem value="version_desc">Versão (maior)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
          <div className="min-w-0">
            <Link to="/admin" className="text-xs text-slate-500 hover:underline inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3 w-3" /> Voltar ao Admin
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <FileStack className="h-6 w-6 text-primary" />
              Modelos de Documentação
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Rascunhos, publicados, arquivados, globais e da sua empresa em um só lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-end">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo modelo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ações">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/templates/marketplace">Marketplace público</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/documentos/biblioteca">Biblioteca nacional</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin/signature-anchors">Âncoras de assinatura</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search + filter drawer (mobile) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome, código, categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Buscar modelos"
            />
          </div>
          {/* Desktop inline filters */}
          <div className="hidden md:flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as LifecycleStatus)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos escopos</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
                <SelectItem value="global">Globais</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Mobile drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Filtros">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
              <div className="mt-4">{Filters}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop extra filters */}
        <div className="hidden md:flex flex-wrap items-center gap-2 text-sm">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={processType} onValueChange={setProcessType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo de processo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {processTypes.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              checked={onlyDefaults}
              onChange={(e) => setOnlyDefaults(e.target.checked)}
              className="rounded"
            />
            Somente padrões
          </label>
          <div className="ml-auto">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Atualização recente</SelectItem>
                <SelectItem value="updated_asc">Atualização antiga</SelectItem>
                <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                <SelectItem value="version_desc">Versão (maior)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {query.isLoading && (
          <div className="flex flex-col items-center py-20 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Carregando modelos...</p>
          </div>
        )}

        {query.isError && (
          <Card className="p-6 text-center border-red-200 bg-red-50/40">
            <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <p className="font-medium text-red-700">Falha ao carregar modelos.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </Card>
        )}

        {!query.isLoading && !query.isError && filtered.length === 0 && (
          <Card className="p-10 text-center">
            <FileStack className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            {debounced || status !== "all" || scope !== "all" || category !== "all" || processType !== "all" || onlyDefaults ? (
              <>
                <p className="font-medium">Nenhum modelo encontrado com os filtros atuais.</p>
                <p className="text-sm text-slate-500 mt-1">Ajuste os filtros ou limpe a busca para ver mais resultados.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Você ainda não tem modelos cadastrados.</p>
                <p className="text-sm text-slate-500 mt-1">Comece criando um modelo ou importe do marketplace.</p>
                <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Novo modelo</Button>
              </>
            )}
          </Card>
        )}

        {!query.isLoading && !query.isError && filtered.length > 0 && (
          <div className="grid gap-3">
            {filtered.map((t: any) => (
              <TemplateRow
                key={t.id}
                template={t}
                isMaster={isMaster}
                companyId={companyId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateRow({
  template: t, isMaster, companyId,
}: { template: any; isMaster: boolean; companyId: string | null }) {
  const lifecycle: string = t.lifecycle_status ?? "draft";
  const isOwnCompany = !!t.company_id && t.company_id === companyId;
  const canEdit = isMaster || (isOwnCompany && !t.is_global);

  const statusStyle: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-800 border-emerald-200",
    draft: "bg-amber-100 text-amber-800 border-amber-200",
    archived: "bg-slate-200 text-slate-600 border-slate-300",
  };

  const updated = t.updated_at
    ? formatDistanceToNow(new Date(t.updated_at), { addSuffix: true, locale: ptBR })
    : "—";

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 truncate">{t.name}</h3>
            {t.is_default_for_scope && (
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                <Star className="h-3 w-3 fill-current" /> Padrão
              </Badge>
            )}
            {t.is_global ? (
              <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> Global</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> Empresa</Badge>
            )}
            <Badge className={`border ${statusStyle[lifecycle] ?? statusStyle.draft}`} variant="outline">
              {lifecycle === "published" ? "Publicado" : lifecycle === "archived" ? "Arquivado" : "Rascunho"}
            </Badge>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {t.code && <span>Código: {t.code}</span>}
            {t.category && <span>Categoria: {t.category}</span>}
            {t.process_type && <span>Processo: {t.process_type}</span>}
            <span>v{t.version_number ?? t.version ?? 1}</span>
            <span>Atualizado {updated}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center">
          <Button variant="outline" size="sm" className="gap-1">
            <Eye className="h-3.5 w-3.5" /> Abrir
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais ações">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canEdit}>
                <PencilLine className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canEdit}>
                <GitBranch className="h-4 w-4 mr-2" /> Nova versão
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canEdit || lifecycle !== "published"}>
                <Star className="h-4 w-4 mr-2" /> Definir como padrão
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="h-4 w-4 mr-2" /> Histórico
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canEdit}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canEdit || lifecycle === "archived"} className="text-red-600">
                <Archive className="h-4 w-4 mr-2" /> Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
