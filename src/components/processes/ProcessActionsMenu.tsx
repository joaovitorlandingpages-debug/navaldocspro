import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal, ArrowRight, PlayCircle, Pencil, FileSignature, FileText,
  FolderArchive, History, Copy, Share2, Link2, Star, Archive, Trash2,
  RotateCcw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveProcess, unarchiveProcess, trashProcess, restoreProcess,
  toggleFavoriteProcess, duplicateProcess, copyShareLink,
} from "@/services/processLifecycle";
import { HardDeleteDialog } from "./HardDeleteDialog";

export type ProcessLifecycleState = "active" | "archived" | "trashed";

interface Props {
  process: {
    id: string;
    protocol_number?: string | null;
    title?: string | null;
    process_type?: string;
    is_favorite?: boolean | null;
    archived_at?: string | null;
    trashed_at?: string | null;
  };
  /** force a state; default derived from columns */
  state?: ProcessLifecycleState;
  /** invoked after any mutation so caller can refetch */
  onChanged?: () => void;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

function deriveState(p: Props["process"]): ProcessLifecycleState {
  if (p.trashed_at) return "trashed";
  if (p.archived_at) return "archived";
  return "active";
}

export function ProcessActionsMenu({ process, state, onChanged, trigger, align = "end" }: Props) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const s = state ?? deriveState(process);

  const goTab = (tab: string) =>
    navigate({ to: "/processes/$id", params: { id: process.id }, search: { tab } as any });

  async function wrap<T>(fn: () => Promise<T>, successMsg: string) {
    try {
      const result = await fn();
      toast.success(successMsg);
      onChanged?.();
      return result;
    } catch (err: any) {
      toast.error(err.message || "Falha na operação.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-56">
          {s === "active" && (
            <>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400">Abrir</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => goTab("overview")}>
                <ArrowRight className="h-4 w-4 mr-2" /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goTab("generation")}>
                <PlayCircle className="h-4 w-4 mr-2" /> Continuar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goTab("edit")}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400">Áreas</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => goTab("signatures")}>
                <FileSignature className="h-4 w-4 mr-2" /> Assinaturas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goTab("library_docs")}>
                <FileText className="h-4 w-4 mr-2" /> Documentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goTab("dossier_v2")}>
                <FolderArchive className="h-4 w-4 mr-2" /> Dossiê
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => goTab("history")}>
                <History className="h-4 w-4 mr-2" /> Timeline
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => wrap(async () => {
                  const newId = await duplicateProcess(process.id);
                  navigate({ to: "/processes/$id", params: { id: newId } });
                }, "Processo duplicado.")}
              >
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const url = await wrap(() => copyShareLink(process.id), "Link copiado para a área de transferência.");
                  if (url) console.log("share_url", url);
                }}
              >
                <Link2 className="h-4 w-4 mr-2" /> Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const url = await wrap(() => copyShareLink(process.id), "Link pronto para compartilhar.");
                  if (url && typeof navigator !== "undefined" && (navigator as any).share) {
                    try { await (navigator as any).share({ title: process.title || process.process_type || "Processo", url }); } catch {}
                  }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" /> Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => wrap(
                  () => toggleFavoriteProcess(process.id),
                  process.is_favorite ? "Removido dos favoritos." : "Adicionado aos favoritos."
                )}
              >
                <Star className={`h-4 w-4 mr-2 ${process.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
                {process.is_favorite ? "Desfavoritar" : "Favoritar"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => wrap(() => archiveProcess(process.id), "Processo arquivado.")}
              >
                <Archive className="h-4 w-4 mr-2" /> Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => wrap(() => trashProcess(process.id), "Movido para a lixeira.")}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Mover para Lixeira
              </DropdownMenuItem>
            </>
          )}

          {s === "archived" && (
            <>
              <DropdownMenuItem onClick={() => goTab("overview")}>
                <ArrowRight className="h-4 w-4 mr-2" /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => wrap(() => unarchiveProcess(process.id), "Processo restaurado para Ativos.")}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Desarquivar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => wrap(() => trashProcess(process.id), "Movido para a lixeira.")}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Mover para Lixeira
              </DropdownMenuItem>
            </>
          )}

          {s === "trashed" && (
            <>
              <DropdownMenuItem
                onClick={() => wrap(() => restoreProcess(process.id), "Processo restaurado.")}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600 focus:text-red-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> Excluir Definitivamente
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <HardDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        process={process}
        onDeleted={onChanged}
      />
    </>
  );
}
