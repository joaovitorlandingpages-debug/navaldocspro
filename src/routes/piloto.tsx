import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export const Route = createFileRoute("/piloto")({
  head: () => ({
    meta: [
      { title: "Piloto Técnico — NavalDocs Pro" },
      { name: "description", content: "Checklist de validação do piloto técnico ponta-a-ponta." },
    ],
  }),
  component: PilotoPage,
});

type Item = { id: string; label: string; hint?: string };

const ITEMS: Item[] = [
  { id: "01_empresa", label: "Criar empresa piloto", hint: "Signup → empresa nova com plano de teste" },
  { id: "02_usuario", label: "Criar usuário real", hint: "E-mail real do operador, login funcionando" },
  { id: "03_logo", label: "Subir logo da empresa", hint: "/identidade → upload + preview" },
  { id: "04_cliente", label: "Criar cliente", hint: "/customers → novo cliente PF/PJ" },
  { id: "05_embarcacao", label: "Criar embarcação", hint: "/vessels → vincular ao cliente" },
  { id: "06_processo", label: "Criar processo completo", hint: "ProcessFirstWizard até a etapa final" },
  { id: "07_ocr", label: "Rodar OCR em documento real", hint: "Upload PDF/imagem → extração Gemini" },
  { id: "08_gerar_docs", label: "Gerar documentos do processo", hint: "Step 4 → 'Gerar Tudo'" },
  { id: "09_template", label: "Escolher template no fluxo", hint: "Galeria → preview A4 → aplicar" },
  { id: "10_assinatura", label: "Solicitar assinatura", hint: "ProcessSignaturesPanel → criar request" },
  { id: "11_pdf_assinado", label: "Gerar PDF assinado", hint: "Assinar via /assinar/$token → PDF final c/ QR" },
  { id: "12_certificado", label: "Gerar certificado de evidência", hint: "PDF de auditoria com hash e timeline" },
  { id: "13_dossie", label: "Gerar dossiê final", hint: "ProcessFinalDossierTab → ZIP/PDF consolidado" },
  { id: "14_portal", label: "Abrir portal do cliente", hint: "/portal/$token → ver processo + documentos" },
  { id: "15_download", label: "Baixar tudo", hint: "Validar signed URLs e integridade dos arquivos" },
  { id: "16_feedback", label: "Anotar erros, dúvidas e dificuldades", hint: "Usar campo de notas abaixo" },
];

const STORAGE_KEY = "navaldocs.piloto.v1";

type State = Record<string, { done: boolean; notes: string }>;

function defaultState(): State {
  return Object.fromEntries(ITEMS.map((i) => [i.id, { done: false, notes: "" }]));
}

function PilotoPage() {
  const [state, setState] = useState<State>(defaultState);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState(), ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const done = useMemo(() => Object.values(state).filter((s) => s.done).length, [state]);
  const pct = Math.round((done / ITEMS.length) * 100);

  const exportMd = () => {
    const lines = [
      `# Piloto Técnico — NavalDocs Pro`,
      ``,
      `Progresso: ${done}/${ITEMS.length} (${pct}%)`,
      `Data: ${new Date().toLocaleString("pt-BR")}`,
      ``,
    ];
    ITEMS.forEach((item, i) => {
      const s = state[item.id];
      lines.push(`## ${i + 1}. [${s?.done ? "x" : " "}] ${item.label}`);
      if (item.hint) lines.push(`_${item.hint}_`);
      if (s?.notes?.trim()) lines.push(``, s.notes.trim());
      lines.push(``);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `piloto-navaldocs-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmReset = () => {
    setState(defaultState());
    setShowResetConfirm(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Piloto Técnico</h1>
          <p className="text-muted-foreground text-sm">
            Validação ponta-a-ponta. Sem desenvolvimento de novas features — apenas correção de bugs críticos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="min-h-[44px] text-destructive hover:bg-destructive/10">
            <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar
          </Button>
          <Button size="sm" onClick={exportMd} className="min-h-[44px]">
            <Download className="h-4 w-4 mr-2" /> Exportar .md
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Progresso</CardTitle>
            <Badge variant={pct === 100 ? "default" : "secondary"}>
              {done}/{ITEMS.length} • {pct}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ITEMS.map((item, i) => {
          const s = state[item.id] ?? { done: false, notes: "" };
          return (
            <Card key={item.id} className={s.done ? "border-primary/40 bg-primary/5" : ""}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={s.done}
                    onCheckedChange={(v) =>
                      setState((p) => ({ ...p, [item.id]: { ...s, done: !!v } }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {i + 1}. {item.label}
                    </div>
                    {item.hint && (
                      <div className="text-xs text-muted-foreground mt-0.5">{item.hint}</div>
                    )}
                  </div>
                </div>
                <Textarea
                  placeholder="Erros, dúvidas, prints, IDs de processo/empresa..."
                  value={s.notes}
                  onChange={(e) =>
                    setState((p) => ({ ...p, [item.id]: { ...s, notes: e.target.value } }))
                  }
                  rows={2}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reiniciar Checklist do Piloto"
        description="Tem certeza que deseja reiniciar todo o checklist? Todas as notas e marcações preenchidas serão apagadas permanentemente."
        confirmText="Confirmar Reinício"
        cancelText="Voltar"
        variant="destructive"
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
