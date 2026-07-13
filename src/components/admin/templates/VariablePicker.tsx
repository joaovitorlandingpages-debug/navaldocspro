/**
 * Sprint 4D.2.d — Fatia D
 * Painel de inserção de variáveis do catálogo canônico.
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_VARIABLES, VARIABLE_GROUPS, type TemplateVariableGroup } from "@/lib/templates/variableCatalog";

interface Props {
  onInsert: (key: string) => void;
}

export function VariablePicker({ onInsert }: Props) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<TemplateVariableGroup | "all">("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return TEMPLATE_VARIABLES.filter((v) => {
      if (group !== "all" && v.group !== group) return false;
      if (!term) return true;
      return (
        v.key.toLowerCase().includes(term) ||
        v.label.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term)
      );
    });
  }, [q, group]);

  const copy = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`).then(
      () => toast.success(`Copiado: {{${key}}}`),
      () => toast.error("Falha ao copiar"),
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar variável..."
            className="pl-7 h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <FilterChip active={group === "all"} onClick={() => setGroup("all")}>Todas</FilterChip>
          {VARIABLE_GROUPS.map((g) => (
            <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</FilterChip>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filtered.length === 0 && (
            <p className="text-xs text-slate-500 p-4 text-center">Nenhuma variável encontrada.</p>
          )}
          {filtered.map((v) => (
            <div key={v.key} className="p-3 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</span>
                    <Badge variant="secondary" className="text-[10px]">{v.group}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{v.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ex.: {v.sample}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(v.key)} title="Copiar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onInsert(v.key)} title="Inserir">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2 py-0.5 rounded-full border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
    >
      {children}
    </button>
  );
}
