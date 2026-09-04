import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  signatureAnchorsService, ANCHOR_ROLES, type TemplateSignatureAnchor, type AnchorRole, type AnchorAlign,
} from "@/services/signatureAnchors";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/signature-anchors")({
  component: SignatureAnchorsEditor,
});

const BUILTIN_TEMPLATES = [
  { id: "classico", name: "Clássico" },
  { id: "executivo", name: "Executivo" },
  { id: "naval-azul", name: "Naval Azul" },
  { id: "minimalista", name: "Minimalista" },
  { id: "laudo-tecnico", name: "Laudo Técnico" },
  { id: "checklist-moderno", name: "Checklist Moderno" },
  { id: "juridico", name: "Jurídico" },
  { id: "engenharia", name: "Engenharia" },
];

const PAGE_W = 595;
const PAGE_H = 842;

function SignatureAnchorsEditor() {
  const { profile } = useAuth();
  const isMaster = profile?.role === "admin_master_global";
  const [scope, setScope] = useState<"company" | "global">("company");
  const [templateId, setTemplateId] = useState<string>(BUILTIN_TEMPLATES[0].id);
  const [customTemplates, setCustomTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [anchors, setAnchors] = useState<TemplateSignatureAnchor[]>([]);
  const [editing, setEditing] = useState<Partial<TemplateSignatureAnchor>>(emptyAnchor());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [anchorToRemove, setAnchorToRemove] = useState<TemplateSignatureAnchor | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  function emptyAnchor(): Partial<TemplateSignatureAnchor> {
    return {
      template_id: templateId, role: "cliente", page: 1,
      x: 50, y: 80, width: 240, height: 80, align: "left",
      label: "Assinatura do Cliente", is_default: true,
    };
  }

  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from("company_pdf_templates" as any)
        .select("id,name")
        .eq("company_id", profile.company_id);
      setCustomTemplates(((data ?? []) as any).map((r: any) => ({ id: r.id, name: r.name })));
    })();
  }, [profile?.company_id]);

  const allTemplates = useMemo(
    () => [...BUILTIN_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const data = await signatureAnchorsService.listByTemplate(
        templateId,
        scope === "global" ? null : profile.company_id,
      );
      setAnchors(scope === "global" ? data.filter(a => a.company_id === null) : data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [templateId, scope, profile?.company_id]);

  const save = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    try {
      const payload: any = {
        ...editing,
        template_id: templateId,
        company_id: scope === "global" ? null : profile.company_id,
      };
      if (scope === "global" && !isMaster) {
        toast.error("Apenas admin master global pode editar âncoras globais.");
        return;
      }
      await signatureAnchorsService.save(payload);
      toast.success("Âncora salva");
      setEditing(emptyAnchor());
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoveAnchor = async () => {
    if (!anchorToRemove) return;
    setIsRemoving(true);
    try {
      await signatureAnchorsService.remove(anchorToRemove.id);
      setAnchorToRemove(null);
      load();
      toast.success("Âncora removida com sucesso");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRemoving(false);
    }
  };

  // visual scale to fit a ~240px tall preview
  const scale = 240 / PAGE_H;
  const previewW = PAGE_W * scale;
  const previewH = PAGE_H * scale;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="min-h-[44px]"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button></Link>
          <ShieldCheck className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-bold text-slate-900">Editor de Âncoras de Assinatura</h1>
          <Badge variant="outline" className="ml-2">Turno B</Badge>
        </div>

        <Card className="p-4 grid md:grid-cols-3 gap-3">
          <div>
            <Label>Escopo</Label>
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Minha empresa</SelectItem>
                <SelectItem value="global" disabled={!isMaster}>Global (oficial) {isMaster ? "" : "— somente master"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-xs text-slate-400">({t.id})</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Nova âncora</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditing(emptyAnchor())} className="min-h-[44px]"><Plus className="w-4 h-4 mr-1" />Resetar</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Papel</Label>
                <Select value={editing.role} onValueChange={(v: AnchorRole) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANCHOR_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Página</Label>
                <Input type="number" min={1} value={editing.page ?? 1} onChange={e => setEditing({ ...editing, page: parseInt(e.target.value) || 1 })} />
              </div>
              <div><Label>X (pt)</Label><Input type="number" value={editing.x ?? 0} onChange={e => setEditing({ ...editing, x: Number(e.target.value) })} /></div>
              <div><Label>Y (pt — origem inferior)</Label><Input type="number" value={editing.y ?? 0} onChange={e => setEditing({ ...editing, y: Number(e.target.value) })} /></div>
              <div><Label>Largura</Label><Input type="number" value={editing.width ?? 0} onChange={e => setEditing({ ...editing, width: Number(e.target.value) })} /></div>
              <div><Label>Altura</Label><Input type="number" value={editing.height ?? 0} onChange={e => setEditing({ ...editing, height: Number(e.target.value) })} /></div>
              <div>
                <Label>Alinhamento</Label>
                <Select value={editing.align} onValueChange={(v: AnchorAlign) => setEditing({ ...editing, align: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rótulo</Label><Input value={editing.label ?? ""} onChange={e => setEditing({ ...editing, label: e.target.value })} /></div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full min-h-[44px]">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  {editing.id ? "Atualizar âncora" : "Salvar âncora"}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500">
              Tamanho da página assumido: A4 (595 × 842 pt). Y é medido a partir da base.
            </p>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Preview (página {editing.page ?? 1})</h2>
            <div
              className="relative border border-slate-300 bg-white mx-auto shadow-sm"
              style={{ width: previewW, height: previewH }}
            >
              {anchors.filter(a => a.page === (editing.page ?? 1)).map(a => (
                <div key={a.id}
                  className="absolute border border-blue-400 bg-blue-50/60 text-[8px] text-blue-700 p-0.5 overflow-hidden"
                  style={{
                    left: a.x * scale,
                    top: (PAGE_H - a.y - a.height) * scale,
                    width: a.width * scale,
                    height: a.height * scale,
                  }}
                  title={`${a.role} · ${a.label ?? ""}`}
                >{a.role}</div>
              ))}
              {editing.x !== undefined && (
                <div className="absolute border-2 border-amber-500 bg-amber-100/60 text-[8px] text-amber-700 p-0.5 overflow-hidden"
                  style={{
                    left: (editing.x ?? 0) * scale,
                    top: (PAGE_H - (editing.y ?? 0) - (editing.height ?? 0)) * scale,
                    width: (editing.width ?? 0) * scale,
                    height: (editing.height ?? 0) * scale,
                  }}
                >✎ {editing.role}</div>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Âncoras salvas {loading && <span className="text-xs text-slate-400">carregando…</span>}</h2>
          {anchors.length === 0 ? <p className="text-sm text-slate-500">Nenhuma âncora ainda. O PDF assinado usará o bloco padrão de fallback.</p> : (
            <div className="space-y-1">
              {anchors.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={a.company_id ? "secondary" : "default"}>{a.company_id ? "Empresa" : "Global"}</Badge>
                    <span className="font-mono text-xs">p{a.page} ({a.x},{a.y}) {a.width}×{a.height}</span>
                    <span className="font-medium">{a.role}</span>
                    <span className="text-slate-500">{a.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(a)} className="min-h-[44px]">Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAnchorToRemove(a)} title="Remover" className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!anchorToRemove}
        onOpenChange={(open) => !open && setAnchorToRemove(null)}
        title="Remover Âncora de Assinatura"
        description={`Tem certeza que deseja remover a âncora "${anchorToRemove?.label || anchorToRemove?.role}" da página ${anchorToRemove?.page}?`}
        confirmText="Confirmar Remoção"
        cancelText="Voltar"
        variant="destructive"
        loading={isRemoving}
        onConfirm={confirmRemoveAnchor}
      />
    </div>
  );
}
