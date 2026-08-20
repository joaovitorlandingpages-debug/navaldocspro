import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Search,
  FileText,
  Ship,
  FileBox,
  Users,
  Settings,
  LayoutDashboard
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

interface SearchResult {
  processes: any[];
  vessels: any[];
  customers: any[];
  documents: any[];
}

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

  const { data: results } = useQuery<SearchResult | null>({
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
          .from("generated_documents")
          .select("id, name")
          .ilike("name", `%${search}%`)
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
        className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 bg-white/5 border border-slate-200/10 rounded-xl hover:bg-white/10 hover:text-white transition-all group shrink-0"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Pesquisar...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100 group-hover:border-white/20 transition-colors">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="bg-[#000B18] border-b border-white/5">
          <CommandInput 
            placeholder="O que você procura? (ex: Niterói, Laudo, Fulano...)" 
            value={search}
            onValueChange={setSearch}
            className="text-white placeholder:text-white/20 border-none focus:ring-0"
          />
        </div>
        <CommandList className="max-h-[450px] bg-[#000B18] text-white custom-scrollbar">
          <CommandEmpty className="py-12 text-center text-white/40 font-mono text-[10px] uppercase tracking-widest">
            Nenhum resultado encontrado para "{search}"
          </CommandEmpty>
          
          {results?.processes && results.processes.length > 0 && (
            <CommandGroup heading="Processos" className="text-white/40">
              {results.processes.map((p: any) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => runCommand(() => navigate({ to: `/admin/process-center/${p.id}` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400 text-white/80 cursor-pointer"
                >
                  <FileBox className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-bold">{p.title || "Sem título"}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-50">{p.process_type} • {p.status}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.vessels && results.vessels.length > 0 && (
            <CommandGroup heading="Embarcações" className="text-white/40">
              {results.vessels.map((v: any) => (
                <CommandItem
                  key={v.id}
                  onSelect={() => runCommand(() => navigate({ to: `/vessels` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400 text-white/80 cursor-pointer"
                >
                  <Ship className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-bold">{v.name}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-50">{v.registration_number || "Sem registro"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.customers && results.customers.length > 0 && (
            <CommandGroup heading="Clientes" className="text-white/40">
              {results.customers.map((c: any) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => runCommand(() => navigate({ to: `/customers` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400 text-white/80 cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-50">{c.cpf_cnpj || "Sem documento"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.documents && results.documents.length > 0 && (
            <CommandGroup heading="Documentos" className="text-white/40">
              {results.documents.map((d: any) => (
                <CommandItem
                  key={d.id}
                  onSelect={() => runCommand(() => navigate({ to: `/admin/documents` as any }))}
                  className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400 text-white/80 cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-bold">{d.name}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-50">Documento gerado</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator className="bg-white/5" />
          
          <CommandGroup heading="Ações Rápidas" className="text-white/40">
            <CommandItem 
              onSelect={() => runCommand(() => navigate({ to: "/dashboard" as any }))}
              className="aria-selected:bg-primary/10 aria-selected:text-primary text-white/80 cursor-pointer"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span className="font-bold">Ir para Dashboard</span>
              <CommandShortcut>⌘H</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate({ to: "/admin/documents" as any }))}
              className="aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400 text-white/80 cursor-pointer"
            >
              <FileBox className="mr-2 h-4 w-4" />
              <span className="font-bold">Cofre de Documentos</span>
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate({ to: "/admin-hub" as any }))}
              className="aria-selected:bg-primary/10 aria-selected:text-primary text-white/80 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="font-bold">Painel de Controle (Admin Hub)</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
