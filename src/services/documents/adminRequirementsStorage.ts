import {
  OUTPUT_DOCS_CATALOG,
  OutputDocumentConfig,
  OutputDocRequirementItem,
} from "@/routes/processes.novo-pedido";

export const ADMIN_REQUIREMENTS_STORAGE_KEY =
  "navaldocs_admin_documents_requirements_v1";

/**
 * Retorna o catálogo oficial de documentos e seus requisitos de anexos.
 * Se o administrador tiver adicionado, editado ou excluído documentos ou anexos
 * no painel administrativo, as alterações persistidas no localStorage são retornadas.
 */
export function getCustomizedOutputDocsCatalog(): OutputDocumentConfig[] {
  if (typeof localStorage === "undefined") {
    return OUTPUT_DOCS_CATALOG;
  }

  try {
    const raw = localStorage.getItem(ADMIN_REQUIREMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(
      "[adminRequirementsStorage] Erro ao ler catálogo customizado do localStorage:",
      error
    );
  }

  return OUTPUT_DOCS_CATALOG;
}

/**
 * Salva a versão editada pelo administrador no localStorage e
 * emite um evento global para sincronizar qualquer tela aberta.
 */
export function saveCustomizedOutputDocsCatalog(
  catalog: OutputDocumentConfig[]
): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(
      ADMIN_REQUIREMENTS_STORAGE_KEY,
      JSON.stringify(catalog)
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("navaldocs_catalog_requirements_updated", {
          detail: { count: catalog.length },
        })
      );
    }
  } catch (error) {
    console.error(
      "[adminRequirementsStorage] Erro ao salvar catálogo no localStorage:",
      error
    );
    throw error;
  }
}

/**
 * Restaura o catálogo de documentos e requisitos para a matriz padrão
 * oficial da Marinha do Brasil (NORMAM-211, NORMAM-212 e NORMAM-201).
 */
export function resetOutputDocsCatalogToDefaults(): OutputDocumentConfig[] {
  if (typeof localStorage === "undefined") return OUTPUT_DOCS_CATALOG;

  try {
    localStorage.removeItem(ADMIN_REQUIREMENTS_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("navaldocs_catalog_requirements_updated", {
          detail: { count: OUTPUT_DOCS_CATALOG.length },
        })
      );
    }
  } catch (error) {
    console.error(
      "[adminRequirementsStorage] Erro ao resetar catálogo:",
      error
    );
  }

  return OUTPUT_DOCS_CATALOG;
}
