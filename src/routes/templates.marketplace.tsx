import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadCompanyBranding, type CompanyBranding, type PdfTemplateId } from "@/services/companyBranding";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplatePreviewModal } from "@/components/templates/TemplatePreviewModal";
import { TemplateCover } from "@/components/templates/TemplateCover";

import {
  formatPrice,
  listCollections,
  listCompanyLibrary,
  listMarketplaceTemplates,
  type MarketplaceCollection,
  type MarketplaceTemplate,
} from "@/services/marketplaceTemplates";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Package, Sparkles } from "lucide-react";

export const Route = createFileRoute("/templates/marketplace")({ component: MarketplacePage });

function MarketplacePage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [collections, setCollections] = useState<MarketplaceCollection[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("todas");
  const [sort, setSort] = useState("destaques");
  const [preview, setPreview] = useState<{ base: PdfTemplateId; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([listMarketplaceTemplates(), listCollections()]);
      setTemplates(t);
      setCollections(c);
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!p?.company_id) return;
      setCompanyId(p.company_id);
      setBranding(await loadCompanyBranding(p.company_id));
      const lib = await listCompanyLibrary(p.company_id);
      setOwned(new Set(lib.map((l) => l.template_slug)));
    })();
  }, [user]);

  const cats = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => set.add(t.category));
    return ["todas", ...Array.from(set).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = templates.filter((t) => {
      if (cat !== "todas" && t.category !== cat) return false;
      if (q && !t.name.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "novos") r = [...r].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "vendidos") r = [...r].sort((a, b) => b.downloads_count - a.downloads_count);
    else if (sort === "preco_asc") r = [...r].sort((a, b) => a.price_cents - b.price_cents);
    else if (sort === "preco_desc") r = [...r].sort((a, b) => b.price_cents - a.price_cents);
    return r;
  }, [templates, query, cat, sort]);

  const buy = async (_t: MarketplaceTemplate) => {
    if (!companyId) return toast.error("Empresa não carregada");
    toast.info("Compras serão liberadas em breve com Mercado Pago.");
  };


  const badgesOf = (t: MarketplaceTemplate) => {
    const b: { label: string; tone?: "gold" | "blue" | "green" | "red" }[] = [];
    if (t.is_exclusive) b.push({ label: "Exclusivo", tone: "gold" });
    if (t.is_featured) b.push({ label: "Destaque", tone: "blue" });
    if (t.is_new) b.push({ label: "Novo", tone: "green" });
    if (t.is_bestseller) b.push({ label: "Mais vendido", tone: "gold" });
    if (t.is_promo) b.push({ label: "Promoção", tone: "red" });
    return b;
  };

  return (
    <div className="space-y-8">
      {collections.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Coleções</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => (
              <Card key={c.id} className="p-5 flex flex-col gap-2">
                <div className="font-bold">{c.name}</div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="text-xs text-muted-foreground">{c.template_slugs.length} templates</div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <span className="font-bold text-primary">{formatPrice(c.price_cents)}</span>
                  <Button size="sm" onClick={() => toast.info("Coleções liberadas com o Mercado Pago")}>Adquirir</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Templates Premium</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input className="pl-10" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="destaques">Destaques</SelectItem>
              <SelectItem value="novos">Novos</SelectItem>
              <SelectItem value="vendidos">Mais vendidos</SelectItem>
              <SelectItem value="preco_asc">Menor preço</SelectItem>
              <SelectItem value="preco_desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhum template premium publicado ainda. Volte em breve — novidades chegam direto pelo painel master.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                description={t.description}
                category={t.category}
                cover={t.cover_url}
                coverFallback={
                  <TemplateCover
                    templateId={t.base_template}
                    name={t.name}
                    category={t.category}
                    kind={owned.has(t.slug) ? "owned" : "premium"}
                    logoUrl={branding?.logo_primary_url}
                    primaryColor={branding?.brand_primary_color}
                  />
                }

                author={t.author}
                version={t.version}
                rating={t.rating}
                downloads={t.downloads_count}
                priceLabel={formatPrice(t.price_cents)}
                badges={badgesOf(t)}
                isOwned={owned.has(t.slug)}
                onPreview={() => setPreview({ base: t.base_template, name: t.name })}
                onPrimary={() => buy(t)}
                primaryLabel="Comprar em breve"
                primaryIcon="buy"
              />
            ))}
          </div>
        )}
      </section>

      <TemplatePreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        name={preview?.name ?? ""}
        baseTemplate={preview?.base ?? "classico"}
        branding={branding}
      />
    </div>
  );
}
