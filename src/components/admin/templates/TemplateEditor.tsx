/**
 * Sprint 4D.2.d — Fatia D
 * Editor de template (metadados + conteúdo) + preview fictício + validação.
 * Trabalha em memória; persiste apenas via callback `onSave` (draft).
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, Save } from "lucide-react";
import { VariablePicker } from "./VariablePicker";
import { renderTemplate } from "@/lib/templates/templateRenderer";
import { validateTemplate, canPublish, type ValidationIssue } from "@/lib/templates/templateValidator";

export type EditorDraft = {
  name: string;
  code: string;
  category: string;
  process_type: string;
  region_tag: string;
  description: string;
  base_content: string;
};

interface Props {
  initial: EditorDraft;
  readOnly?: boolean;
  saving?: boolean;
  onSave: (draft: EditorDraft) => void;
  onValidityChange?: (canPublish: boolean, issues: ValidationIssue[]) => void;
}

export function TemplateEditor({ initial, readOnly, saving, onSave, onValidityChange }: Props) {
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const [manualPreviewKey, setManualPreviewKey] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(initial); }, [initial]);

  const issues = useMemo(() => validateTemplate(draft), [draft]);
  const publishable = canPublish(issues);
  useEffect(() => { onValidityChange?.(publishable, issues); }, [publishable, issues, onValidityChange]);

  const preview = useMemo(
    () => renderTemplate(draft.base_content, {}, "sample"),
    [draft.base_content, manualPreviewKey],
  );

  const insert = (key: string) => {
    if (readOnly) return;
    const el = contentRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setDraft((d) => ({ ...d, base_content: d.base_content + token }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setDraft((d) => ({ ...d, base_content: next }));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const update = <K extends keyof EditorDraft>(k: K, v: EditorDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Coluna principal — editor + preview */}
      <div className="space-y-4 min-w-0">
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nome *">
              <Input value={draft.name} disabled={readOnly}
                onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Código">
              <Input value={draft.code} disabled={readOnly}
                onChange={(e) => update("code", e.target.value)}
                placeholder="Ex.: VIST-ANUAL" />
            </Field>
            <Field label="Categoria">
              <Input value={draft.category} disabled={readOnly}
                onChange={(e) => update("category", e.target.value)}
                placeholder="Ex.: vistoria" />
            </Field>
            <Field label="Tipo de processo">
              <Input value={draft.process_type} disabled={readOnly}
                onChange={(e) => update("process_type", e.target.value)}
                placeholder="Ex.: vistoria_anual" />
            </Field>
            <Field label="Região">
              <Input value={draft.region_tag} disabled={readOnly}
                onChange={(e) => update("region_tag", e.target.value)}
                placeholder="Ex.: BR-SP" />
            </Field>
            <Field label="Observações internas">
              <Input value={draft.description} disabled={readOnly}
                onChange={(e) => update("description", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Tabs defaultValue="editor">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Prévia</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Conteúdo base</label>
                <span className="text-[11px] text-slate-500">
                  {draft.base_content.length.toLocaleString("pt-BR")} caracteres
                </span>
              </div>
              <Textarea
                ref={contentRef}
                value={draft.base_content}
                onChange={(e) => update("base_content", e.target.value)}
                rows={18}
                disabled={readOnly}
                className="font-mono text-xs"
                placeholder="<h1>Vistoria — {{embarcacao.nome}}</h1>&#10;<p>Cliente: {{cliente.nome}}</p>"
              />
              <p className="text-[11px] text-slate-500">
                HTML sanitizado. Use o painel lateral para inserir variáveis; nunca inclua &lt;script&gt;, iframes ou eventos inline.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card className="p-0 overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
                <p className="text-xs text-amber-900 font-medium">
                  ⚠ Prévia com dados fictícios — nenhum dado real de tenant é usado.
                </p>
                <Button size="sm" variant="ghost" className="h-7 gap-1"
                  onClick={() => setManualPreviewKey((k) => k + 1)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Atualizar prévia
                </Button>
              </div>
              <div className="p-6 bg-white max-h-[600px] overflow-auto">
                <div
                  className="prose prose-sm max-w-none mx-auto bg-white shadow-inner border border-slate-200 rounded p-8 min-h-[400px]"
                  style={{ maxWidth: "780px" }}
                  dangerouslySetInnerHTML={{ __html: preview.html || "<p class='text-slate-400'>Nada a exibir.</p>" }}
                />
                {preview.unknownKeys.length > 0 && (
                  <p className="text-xs text-red-700 mt-3">
                    Variáveis desconhecidas detectadas: {preview.unknownKeys.map((k) => `{{${k}}}`).join(", ")}
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 justify-end">
          <Button
            onClick={() => onSave(draft)}
            disabled={readOnly || saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar rascunho
          </Button>
        </div>
      </div>

      {/* Lateral — variáveis + validação */}
      <div className="space-y-4">
        <Card className="p-0 h-[400px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-700">Variáveis</h3>
          </div>
          <VariablePicker onInsert={insert} />
        </Card>

        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700">Validação</h3>
            {publishable ? (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Publicável
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 gap-1">
                <AlertCircle className="h-3 w-3" /> Bloqueado
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-64">
            <ul className="space-y-1.5">
              {issues.length === 0 && (
                <li className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Nenhum problema encontrado.
                </li>
              )}
              {issues.map((i, idx) => (
                <li key={idx} className="text-xs flex items-start gap-1.5">
                  <IssueIcon level={i.level} />
                  <span className={
                    i.level === "error" ? "text-red-700"
                    : i.level === "warning" ? "text-amber-700"
                    : "text-slate-600"
                  }>{i.message}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function IssueIcon({ level }: { level: ValidationIssue["level"] }) {
  if (level === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-px" />;
  if (level === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-px" />;
  return <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-px" />;
}
