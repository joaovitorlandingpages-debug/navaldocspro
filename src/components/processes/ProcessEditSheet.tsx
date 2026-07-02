import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ProcessEditForm } from "./ProcessEditForm";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  /** Pass either a full process object OR processId; when only id is given, the sheet fetches it. */
  process?: any;
  processId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save, with the fresh process row. */
  onSaved?: (fresh?: any) => void;
  /** Optional tab to open the form on. */
  initialTab?: string;
}

export function ProcessEditSheet({ process, processId, open, onOpenChange, onSaved, initialTab }: Props) {
  const isMobile = useIsMobile();
  const [loaded, setLoaded] = useState<any>(process ?? null);
  const [loading, setLoading] = useState(false);

  const id = process?.id ?? processId;

  useEffect(() => {
    if (!open || !id) return;
    if (process && process.id === id) {
      setLoaded(process);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("processes")
        .select("*, customers:customers!processes_customer_id_fkey(name), vessels:vessels!processes_vessel_id_fkey(name)")
        .eq("id", id)
        .maybeSingle();
      setLoaded(data);
      setLoading(false);
    })();
  }, [open, id, process]);

  async function refresh() {
    if (!id) return;
    const { data } = await supabase
      .from("processes")
      .select("*, customers:customers!processes_customer_id_fkey(name), vessels:vessels!processes_vessel_id_fkey(name)")
      .eq("id", id)
      .maybeSingle();
    setLoaded(data);
    onSaved?.(data);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "h-[100dvh] max-h-[100dvh] w-full p-0 flex flex-col"
            : "w-full sm:max-w-[min(1100px,95vw)] p-0 flex flex-col"
        }
      >
        <SheetHeader className="px-5 sm:px-8 py-4 border-b bg-slate-50/80">
          <SheetTitle className="text-lg sm:text-xl font-black text-navy uppercase tracking-tight">
            Centro de Controle do Processo
          </SheetTitle>
          <SheetDescription className="text-[11px] font-medium text-slate-500 truncate">
            {loaded?.title || loaded?.process_type || "Carregando..."}
            {loaded?.protocol_number ? `  ·  ${loaded.protocol_number}` : loaded?.id ? `  ·  PROC-${String(loaded.id).substring(0, 6).toUpperCase()}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading || !loaded ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <ProcessEditForm
              process={loaded}
              onSaved={async () => { await refresh(); }}
              onCancel={() => onOpenChange(false)}
              onClose={() => onOpenChange(false)}
              initialTab={initialTab}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
