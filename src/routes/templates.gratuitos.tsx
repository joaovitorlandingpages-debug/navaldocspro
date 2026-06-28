import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PDF_TEMPLATES, loadCompanyBranding, type CompanyBranding, type PdfTemplateId } from "@/services/companyBranding";
import { CATEGORY_OF } from "@/services/companyPdfTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplatePreviewModal } from "@/components/templates/TemplatePreviewModal";
import { addFreeToLibrary, listCompanyLibrary } from "@/services/marketplaceTemplates";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/templates/gratuitos")({ component: GratuitosPage });

const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "oficiais", label: "Oficiais" },
  { id: "engenharia", label: "Engenharia" },
  { id: "marinha", label: "Marinha" },
  { id: "corporativo", label: "Corporativo" },
  { id: "premium", label: "Premium" },
  { id: "checklists", label: "Checklists" },
  { id: "dossies", label: "Dossiês" },
];

function GratuitosPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("todas");
  const [preview, setPreview] = useState<{ id: PdfTemplateId; name: string } | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!p?.company_id) return;
      setCompanyId(p.company_id);
      setBranding(await loadCompanyBranding(p.company_id));
      const lib = await listCompanyLibrary(p.company_id);
      setOwned(new Set(lib.map((l) => l.template_slug)));
    })();
  }, [user]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PDF_TEMPLATES.filter((t) => {
      if (cat !== "todas" && CATEGORY_OF[t.id] !== cat) return false;
      if (q && !t.label.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, cat]);

  const useTemplate = async (id: PdfTemplateId) => {
    if (!companyId) return toast.error("Empresa não carregada");
    try {
      await addFreeToLibrary(companyId, id, id);
      setOwned((s) => new Set(s).add(id));
      toast.success("Adicionado a Meus Templates");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao adicionar");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-10" placeholder="Buscar template..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((t) => (
          <TemplateCard
            key={t.id}
            name={t.label}
            description={t.description}
            category={CATEGORY_OF[t.id] ?? "geral"}
            author="NavalDocs"
            version="1.0"
            priceLabel="Gratuito"
            badges={[{ label: "Gratuito", tone: "green" }]}
            isOwned={owned.has(t.id)}
            onPreview={() => setPreview({ id: t.id, name: t.label })}
            onPrimary={() => useTemplate(t.id)}
            primaryLabel="Usar"
          />
        ))}
      </div>

      <TemplatePreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        name={preview?.name ?? ""}
        baseTemplate={preview?.id ?? "classico"}
        branding={branding}
      />
    </div>
  );
}
