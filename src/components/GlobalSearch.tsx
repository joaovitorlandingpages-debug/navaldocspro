import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User,
  Search,
  FileText,
  Ship,
  FileBox,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: results, isLoading } = useQuery({
    queryKey: ["global-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return null;

      const [processes, vessels, customers, documents] = await Promise.all([
        supabase
          .from("processes")
          .select("id, title, process_type, status")
          .ilike("title", `%${search}%`)
          .limit(5),
        supabase
          .from("vessels")
          .select("id, name, registration_number")
          .ilike("name", `%${search}%`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, name, cpf_cnpj")
          .ilike("name", `%${search}%`)
          .limit(5),
        supabase
          .from("documents")
          .select("id, document_type, file_url")
          .ilike("document_type", `%${search}%`)
          .limit(5),
      ]);

      return {
        processes: processes.data || [],
        vessels: vessels.data || [],
        customers: customers.data || [],
        documents: documents.data || [],
      };
    },
    enabled: search.length >= 2,
  });

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-800/80 hover:text-white transition-all group"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Pesquisar...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100 group-hover:border-slate-600 transition-colors">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="O que você procura? (ex: Niterói, Laudo, Fulano...)" 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[450px]">
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          {results?.processes.length ? (
            <CommandGroup heading="Processos">
              {results.processes.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => runCommand(() => navigate({ to: `/admin/process-center/${p.id}` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
                >
                  <FileBox className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{p.title || "Sem título"}</span>
                    <span className="text-[10px] text-slate-500">{p.process_type} • {p.status}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.vessels.length ? (
            <CommandGroup heading="Embarcações">
              {results.vessels.map((v) => (
                <CommandItem
                  key={v.id}
                  onSelect={() => runCommand(() => navigate({ to: `/admin/vessels/${v.id}` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
                >
                  <Ship className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{v.name}</span>
                    <span className="text-[10px] text-slate-500">{v.registration_number || "Sem registro"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.customers.length ? (
            <CommandGroup heading="Clientes">
              {results.customers.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => runCommand(() => navigate({ to: `/admin/customers/${c.id}` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-500">{c.cpf_cnpj || "Sem documento"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.documents.length ? (
            <CommandGroup heading="Documentos">
              {results.documents.map((d) => (
                <CommandItem
                  key={d.id}
                  onSelect={() => runCommand(() => {
                    if (d.file_url) window.open(d.file_url, '_blank');
                  })}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{d.document_type}</span>
                    <span className="text-[10px] text-slate-500">Documento gerado</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandSeparator />
          
          <CommandGroup heading="Ações Rápidas">
            <CommandItem 
              onSelect={() => runCommand(() => navigate({ to: "/admin/documents" as any }))}
              className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
            >
              <FileBox className="mr-2 h-4 w-4" />
              <span>Ver Cofre de Documentos</span>
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate({ to: "/admin-hub" as any }))}
              className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Admin Hub</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
