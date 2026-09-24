/**
 * Validação e sanitização rigorosa de origens permitidas vinculadas aos domínios oficiais.
 * Domínios autorizados:
 * - https://navaldocspro.lovable.app
 * - https://preview--navaldocspro.lovable.app
 * - https://navaldocspro.com.br
 * - https://www.navaldocspro.com.br
 * - http://localhost:* / http://127.0.0.1:*
 */
export function sanitizeAllowedOrigin(rawOrigin: string | null | undefined): string {
  if (!rawOrigin) return "https://navaldocspro.lovable.app";
  try {
    const parsed = new URL(rawOrigin);
    const host = parsed.hostname.toLowerCase();
    
    // Domínios Lovable autorizados expressamente para este projeto
    const isLovableApp = host === "navaldocspro.lovable.app" || host === "preview--navaldocspro.lovable.app";
    // Domínios personalizados de produção (confirmados na infraestrutura)
    const isCustomProd = host === "navaldocspro.com.br" || host === "www.navaldocspro.com.br";
    // Desenvolvimento local
    const isLocal = (host === "localhost" || host === "127.0.0.1") && ["5173", "3000", "8080", "5174"].includes(parsed.port);

    if (isLovableApp || isCustomProd || isLocal) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Formato de URL inválido
  }
  return "https://navaldocspro.lovable.app";
}
