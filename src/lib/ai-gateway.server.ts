// Server-only helper to call Lovable AI Gateway via raw fetch.
// Do NOT import from client code.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callLovableAI(opts: {
  messages: AIMessage[];
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor");

  const body: any = {
    model: opts.model || "google/gemini-3-flash-preview",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no painel.");
  if (!res.ok) throw new Error(`Gateway IA erro ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function callLovableAIJSON<T = any>(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
}): Promise<T> {
  const raw = await callLovableAI({ ...opts, json: true });
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Resposta de IA inválida (JSON malformado)");
  }
}
