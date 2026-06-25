import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/qa-checklist")({
  component: QAChecklistPage,
  head: () => ({
    meta: [
      { title: "QA Checklist E2E — NavalDocs Pro" },
      { name: "description", content: "Checklist guiado de 23 passos para teste manual end-to-end." },
    ],
  }),
});

type Status = "pendente" | "ok" | "falha" | "bloqueado";

type Step = {
  id: number;
  area: string;
  title: string;
  how: string;
  expect: string;
};

const STEPS: Step[] = [
  { id: 1, area: "Auth", title: "Cadastro de nova empresa", how: "Acesse /auth/signup, preencha empresa + admin, confirme email se solicitado.", expect: "Redireciona para /dashboard. Empresa e profile criados, role admin_company atribuída." },
  { id: 2, area: "Auth", title: "Login / Logout", how: "Saia, entre novamente com email/senha em /auth.", expect: "Sessão restaurada, /dashboard carrega sem flash de auth." },
  { id: 3, area: "Auth", title: "Reset de senha", how: "Em /auth use 'Esqueci minha senha' e siga o link no email.", expect: "Página /reset-password abre e troca a senha." },
  { id: 4, area: "Dashboard", title: "KPIs e atalhos", how: "Abra /dashboard.", expect: "Cards de processos/clientes/embarcações carregam sem erro no console." },
  { id: 5, area: "Clientes", title: "Criar cliente PF", how: "Em /customers clique 'Novo cliente' e cadastre PF com CPF.", expect: "Cliente listado, filtra por nome/CPF, edição funciona." },
  { id: 6, area: "Clientes", title: "Criar cliente PJ", how: "Cadastre PJ com CNPJ, sócios e endereço.", expect: "Cliente salvo, abas Documentos/Embarcações/Processos visíveis." },
  { id: 7, area: "Embarcações", title: "Cadastro de embarcação", how: "Em /vessels cadastre manualmente uma embarcação ligada ao cliente.", expect: "Embarcação aparece na lista e no perfil do cliente." },
  { id: 8, area: "Process-First", title: "Iniciar processo (Step 1 Serviço)", how: "Em /processes clique 'Novo Processo', escolha serviço (ex: Inscrição TIE).", expect: "Wizard abre no Step 1 e habilita 'Próximo'." },
  { id: 9, area: "Process-First", title: "Step 2 Identidade + OCR", how: "Faça upload de RG/CPF (PDF/JPG) e aguarde OCR.", expect: "Campos pessoais preenchidos automaticamente. Painel debug OCR mostra texto bruto." },
  { id: 10, area: "Process-First", title: "Step 3 Endereço", how: "Upload de comprovante OU preenchimento manual + CEP.", expect: "Endereço completo válido, CEP autocompleta via ViaCEP." },
  { id: 11, area: "Process-First", title: "Step 4 Embarcação + OCR TIE", how: "Selecione embarcação existente OU upload do TIE/TIEM.", expect: "Dimensões, motor, casco extraídos. Fallback regex preenche o que faltou." },
  { id: 12, area: "Process-First", title: "Step 5 Montagem (Biblioteca)", how: "Veja sugestões da Biblioteca Nacional para o serviço escolhido.", expect: "Lista de documentos exigidos aparece e pode ser marcada." },
  { id: 13, area: "Process-First", title: "Step 6 Revisão editável", how: "Confira todos os blocos. Edite um campo intencionalmente errado.", expect: "Validação bloqueia 'Gerar' se houver campo obrigatório vazio." },
  { id: 14, area: "Process-First", title: "Step 7 Geração + Sucesso", how: "Clique 'Gerar Processo'.", expect: "PDFs gerados, processo aparece em /processes, redireciona para /processes/$id." },
  { id: 15, area: "Processo", title: "Documentos do processo", how: "Em /processes/$id abra a aba 'Documentos'.", expect: "Cada PDF abre por URL assinada (signed URL), download funciona." },
  { id: 16, area: "Processo", title: "Dossiê Final (Bloco 7)", how: "Abra aba 'Dossiê'.", expect: "Checklist 8 itens, gerar PDF consolidado e ZIP funcionam." },
  { id: 17, area: "Portal Cliente", title: "Gerar link público (Bloco 8)", how: "Aba 'Portal Cliente' → 'Gerar link'.", expect: "URL /portal/<token> copiada. Abrindo em aba anônima carrega sem login." },
  { id: 18, area: "Portal Cliente", title: "Upload + mensagem pelo cliente", how: "No /portal/<token> envie um documento e uma mensagem.", expect: "Documento aparece no painel interno; mensagem registrada em activity_logs." },
  { id: 19, area: "Document Generator", title: "Multi-tenant", how: "Em /document-generator abra a lista de processos.", expect: "Vê APENAS processos da própria empresa (verificar com 2ª conta se possível)." },
  { id: 20, area: "Biblioteca", title: "Biblioteca Nacional", how: "Abra /documentos/biblioteca.", expect: "12 templates listados, busca e filtros funcionam." },
  { id: 21, area: "Admin Master", title: "Painel SaaS (Bloco 9)", how: "Com usuário admin_master_global, abra /admin-master.", expect: "Abas Visão geral, Empresas, Planos, Logs carregam. Usuário comum NÃO acessa." },
  { id: 22, area: "Parceria", title: "Programa de parceria", how: "Abra /parceria, gere link de indicação.", expect: "Link gerado, KPIs zerados/coerentes, isolamento por company_id." },
  { id: 23, area: "Logs/Segurança", title: "Auditoria e RLS", how: "Tente acessar /admin-master sem permissão; veja /logs.", expect: "Acesso negado com toast claro; logs registram tentativa." },
];

const STORAGE_KEY = "qa-checklist-naval-v1";

type QARecord = { status: Status; note: string; evidence: string };

function emptyState(): QARecord[] {
  return STEPS.map(() => ({ status: "pendente" as Status, note: "", evidence: "" }));
}

const STATUS_STYLES: Record<Status, string> = {
  pendente: "bg-muted text-muted-foreground",
  ok: "bg-green-500/15 text-green-700 dark:text-green-400",
  falha: "bg-red-500/15 text-red-700 dark:text-red-400",
  bloqueado: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
} as any;

function QAChecklistPage() {
  const [records, setRecords] = useState<QARecord[]>(emptyState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === STEPS.length) setRecords(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
  }, [records]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { pendente: 0, ok: 0, falha: 0, bloqueado: 0 } as any;
    records.forEach((r) => { c[r.status]++; });
    return c;
  }, [records]);

  const update = (idx: number, patch: Partial<QARecord>) => {
    setRecords((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const reset = () => {
    if (confirm("Limpar todo o checklist?")) setRecords(emptyState());
  };

  const exportReport = () => {
    const lines: string[] = [];
    lines.push("# Relatório QA — NavalDocs Pro");
    lines.push(`Data: ${new Date().toLocaleString("pt-BR")}`);
    lines.push(`Resumo: ✅ ${counts.ok} | ❌ ${counts.falha} | ⏸️ ${counts.bloqueado} | ⏳ ${counts.pendente}`);
    lines.push("");
    STEPS.forEach((s, i) => {
      const r = records[i];
      lines.push(`## ${s.id}. [${r.status.toUpperCase()}] ${s.area} — ${s.title}`);
      lines.push(`Como: ${s.how}`);
      lines.push(`Esperado: ${s.expect}`);
      if (r.note) lines.push(`Observação: ${r.note}`);
      if (r.evidence) lines.push(`Evidência: ${r.evidence}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-naval-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">QA Checklist — E2E NavalDocs Pro</h1>
        <p className="text-sm text-muted-foreground">
          23 passos para validar o sistema manualmente. Marque o status, escreva observações e cole links/prints como evidência. Tudo é salvo no seu navegador.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 rounded bg-green-500/15 text-green-700 dark:text-green-400">✅ OK: {counts.ok}</span>
          <span className="px-3 py-1 rounded bg-red-500/15 text-red-700 dark:text-red-400">❌ Falha: {counts.falha}</span>
          <span className="px-3 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">⏸️ Bloqueado: {counts.bloqueado}</span>
          <span className="px-3 py-1 rounded bg-muted text-muted-foreground">⏳ Pendente: {counts.pendente}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportReport} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium">Exportar relatório (.md)</button>
          <button onClick={reset} className="px-3 py-2 rounded border text-sm">Limpar tudo</button>
        </div>
      </header>

      <ol className="space-y-4">
        {STEPS.map((s, i) => {
          const r = records[i];
          return (
            <li key={s.id} className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.area}</div>
                  <h2 className="font-semibold">{s.id}. {s.title}</h2>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Como testar:</span> {s.how}</p>
                <p><span className="font-medium">Esperado:</span> {s.expect}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["pendente", "ok", "falha", "bloqueado"] as Status[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => update(i, { status: st })}
                    className={`px-3 py-1 rounded text-xs border ${r.status === st ? "ring-2 ring-primary" : ""} ${STATUS_STYLES[st]}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <textarea
                  className="w-full border rounded p-2 text-sm bg-background min-h-[80px]"
                  placeholder="Observação (erro, comportamento estranho, etc.)"
                  value={r.note}
                  onChange={(e) => update(i, { note: e.target.value })}
                />
                <textarea
                  className="w-full border rounded p-2 text-sm bg-background min-h-[80px]"
                  placeholder="Evidência (URL de print, ID do processo, log do console...)"
                  value={r.evidence}
                  onChange={(e) => update(i, { evidence: e.target.value })}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
