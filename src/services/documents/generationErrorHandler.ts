import { toast } from "sonner";

/**
 * Estrutura retornada pela edge function `generate-document`
 * quando não é possível gerar o PDF por dados críticos faltantes.
 */
export interface PlaceholderMissing {
  key: string;
  label?: string;
  where?: string;
  tab?: string;
}

export interface GenerationErrorBody {
  error?: string;
  message?: string;
  missing?: PlaceholderMissing[] | string[];
}

/** Mapeia o `tab` retornado pelo backend para o valor real usado no ProcessEditForm. */
const TAB_MAP: Record<string, string> = {
  participants: "participantes",
  participantes: "participantes",
  general: "dados",
  geral: "dados",
  dados: "dados",
  identity: "identidade",
  branding: "identidade",
  identidade: "identidade",
  checklist: "checklist",
  vessel: "embarcacao",
  embarcacao: "embarcacao",
  customer: "cliente",
  cliente: "cliente",
};

function mapTab(tab?: string): string {
  if (!tab) return "participantes";
  return TAB_MAP[tab] ?? tab;
}

/** Extrai o corpo JSON de um erro retornado por `supabase.functions.invoke`. */
async function extractBody(err: any): Promise<GenerationErrorBody | null> {
  try {
    if (!err) return null;
    // Muitas vezes o body já vem no `err.context` (Response) ou em `err.data`.
    if (err?.context && typeof err.context.json === "function") {
      try {
        const cloned = err.context.clone?.() ?? err.context;
        return (await cloned.json()) as GenerationErrorBody;
      } catch {
        // ignora
      }
    }
    if (err?.data && typeof err.data === "object") return err.data as GenerationErrorBody;
    if (err?.body && typeof err.body === "object") return err.body as GenerationErrorBody;
    if (typeof err?.message === "string" && err.message.trim().startsWith("{")) {
      try {
        return JSON.parse(err.message) as GenerationErrorBody;
      } catch {
        // ignora
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Trata erros conhecidos do generate-document (placeholder_incompleto,
 * procurador_incompleto). Retorna true se o erro foi tratado (toast exibido)
 * e o chamador deve suprimir o toast genérico.
 */
export async function handleGenerationError(
  err: any,
  opts: { processId?: string } = {},
): Promise<boolean> {
  const body = await extractBody(err);
  const code = body?.error;
  if (code !== "placeholder_incompleto" && code !== "procurador_incompleto") {
    return false;
  }

  const missingRaw = Array.isArray(body?.missing) ? body!.missing : [];
  const missing: PlaceholderMissing[] = missingRaw.map((m) =>
    typeof m === "string" ? { key: m } : m,
  );

  const firstTab = mapTab(missing.find((m) => m.tab)?.tab);
  const title =
    code === "procurador_incompleto"
      ? "Dados do procurador incompletos"
      : `Faltam ${missing.length} dado${missing.length === 1 ? "" : "s"} para gerar`;

  const description = missing.length
    ? missing
        .slice(0, 4)
        .map((m) => `• ${m.label ?? m.key}${m.where ? ` — ${m.where}` : ""}`)
        .join("\n")
    : body?.message ?? "Complete os dados obrigatórios do processo e tente novamente.";

  toast.error(title, {
    description,
    duration: 12000,
    action: {
      label: "Corrigir agora",
      onClick: () => {
        window.dispatchEvent(
          new CustomEvent("open-process-tab", {
            detail: {
              processId: opts.processId,
              tab: firstTab,
              missing,
            },
          }),
        );
      },
    },
  });

  return true;
}
