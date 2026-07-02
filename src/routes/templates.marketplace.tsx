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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Sparkles, Crown, Anchor, Scale, Package, ClipboardList, FileText,
  ArrowRight, TrendingUp, Star, Filter, Users, Wand2, Award,
} from "lucide-react";


export const Route = createFileRoute("/templates/marketplace")({ component: MarketplacePage });

type CuratedPack = {
  slug: string;
  name: string;
  tagline: string;
  icon: any;
  from: string;
  to: string;
  accent: string;
  itemsLabel: string;
  priceLabel: string;
};

const CURATED_PACKS: CuratedPack[] = [
  { slug: "engenharia-premium", name: "Engenharia Premium", tagline: "ART, memoriais, laudos e relatórios técnicos", icon: Sparkles, from: "#1e3a8a", to: "#0c1a40", accent: "#93c5fd", itemsLabel: "18 templates", priceLabel: "R$ 249" },
  { slug: "marinha-oficial",   name: "Marinha Oficial",     tagline: "Padrão Capitania, TIE, vistorias e inscrição",   icon: Anchor,   from: "#0c4a6e", to: "#082f49", accent: "#7dd3fc", itemsLabel: "22 templates", priceLabel: "R$ 299" },
  { slug: "juridico-naval",    name: "Jurídico Naval",      tagline: "Contratos, procurações, pareceres e termos",     icon: Scale,    from: "#1f1937", to: "#0c0a1f", accent: "#fbbf24", itemsLabel: "14 templates", priceLabel: "R$ 199" },
  { slug: "dossies-executivos",name: "Dossiês Executivos",  tagline: "Capas, sumários e consolidados premium",          icon: Crown,    from: "#312e81", to: "#0f0a2a", accent: "#c4b5fd", itemsLabel: "9 templates",  priceLabel: "R$ 179" },
  { slug: "checklists-pro",    name: "Checklists Profissionais", tagline: "Inspeções, embarque, segurança e auditoria", icon: ClipboardList, from: "#1d4ed8", to: "#1e1b4b", accent: "#a5b4fc", itemsLabel: "16 templates", priceLabel: "R$ 159" },
  { slug: "relatorios-tecnicos",name: "Relatórios Técnicos",tagline: "Estrutura clean para diagnósticos e perícias",    icon: FileText, from: "#155e75", to: "#083344", accent: "#67e8f9", itemsLabel: "12 templates", priceLabel: "R$ 189" },
];

function MarketplacePage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [collections, setCollections] = useState<MarketplaceCollection[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("todas");
  const [sort, setSort] = useState("destaques");
  const [priceTier, setPriceTier] = useState("todos");
  const [onlyFav, setOnlyFav] = useState(false);
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
      setFavorites(new Set(lib.filter((l) => l.is_favorite).map((l) => l.template_slug)));
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
      if (onlyFav && !favorites.has(t.slug)) return false;
      if (priceTier === "gratis" && t.price_cents > 0) return false;
      if (priceTier === "ate50" && (t.price_cents <= 0 || t.price_cents > 5000)) return false;
      if (priceTier === "50a150" && (t.price_cents <= 5000 || t.price_cents > 15000)) return false;
      if (priceTier === "acima150" && t.price_cents <= 15000) return false;
      if (q && !t.name.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "novos") r = [...r].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "vendidos") r = [...r].sort((a, b) => b.downloads_count - a.downloads_count);
    else if (sort === "preco_asc") r = [...r].sort((a, b) => a.price_cents - b.price_cents);
    else if (sort === "preco_desc") r = [...r].sort((a, b) => b.price_cents - a.price_cents);
    else if (sort === "avaliacao") r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [templates, query, cat, sort, priceTier, onlyFav, favorites]);

  const bestsellers = useMemo(
    () => [...templates].sort((a, b) => b.downloads_count - a.downloads_count).slice(0, 4),
    [templates],
  );

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

  const scrollToGrid = () => {
    document.getElementById("market-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(56,189,248,0.35), transparent 45%)" }} />
        <div className="relative px-6 md:px-12 py-10 md:py-14 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-4 max-w-2xl">
            <Badge variant="outline" className="border-amber-300/40 bg-amber-400/10 text-amber-200">
              <Crown className="size-3 mr-1" /> Marketplace Premium NavalDocs
            </Badge>
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
              Templates premium feitos por especialistas em documentação naval.
            </h1>
            <p className="text-slate-300 text-base md:text-lg">
              Coleções exclusivas, capas profissionais e identidade da sua empresa aplicada automaticamente em todos os documentos.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90" onClick={scrollToGrid}>
                Explorar templates <ArrowRight className="size-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"
                onClick={() => document.getElementById("market-packs")?.scrollIntoView({ behavior: "smooth" })}>
                Ver coleções
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-slate-300">
              <span className="flex items-center gap-2"><Star className="size-4 text-amber-300" /> 4.9 / 5 média</span>
              <span className="flex items-center gap-2"><TrendingUp className="size-4 text-emerald-300" /> +120 templates</span>
              <span className="flex items-center gap-2"><Sparkles className="size-4 text-sky-300" /> Branding automático</span>
            </div>
          </div>
          <div className="hidden md:flex relative w-[280px] h-[320px]">
            <div className="absolute inset-0 rotate-[-6deg] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
              <TemplateCover templateId="executivo" name="Executivo Premium" category="executivo" kind="premium" primaryColor="#f59e0b" />
            </div>
            <div className="absolute -right-4 -bottom-4 rotate-[6deg] w-[220px] h-[260px] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
              <TemplateCover templateId="naval_azul" name="Naval Azul" category="marinha" kind="premium" primaryColor="#7dd3fc" />
            </div>
          </div>
        </div>
      </section>

      {/* CURATED PACKS */}
      <section id="market-packs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Package className="size-5" />
              <h2 className="text-xl font-bold text-slate-900">Coleções em destaque</h2>
            </div>
            <p className="text-sm text-muted-foreground">Packs curados por categoria — economize comprando junto.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CURATED_PACKS.map((c) => (
            <Card key={c.slug} className="group relative overflow-hidden rounded-2xl border-slate-200/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="relative h-44" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                <div className="absolute inset-0 opacity-25"
                  style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 50%)" }} />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/15 text-white border-white/20 backdrop-blur">Coleção</Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                  <c.icon className="size-10 opacity-80" style={{ color: c.accent }} />
                  <div className="text-right">
                    <div className="text-xs opacity-80">{c.itemsLabel}</div>
                    <div className="text-2xl font-black">{c.priceLabel}</div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="font-bold text-slate-900">{c.name}</div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.tagline}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">Inclui branding automático</span>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Coleções liberadas com o Mercado Pago")}>
                    Comprar em breve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {collections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {collections.map((c) => (
              <Card key={c.id} className="p-5 flex flex-col gap-2 rounded-2xl">
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
        )}
      </section>

      {/* BESTSELLERS */}
      {bestsellers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 text-primary">
            <TrendingUp className="size-5" />
            <h2 className="text-xl font-bold text-slate-900">Mais vendidos da semana</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bestsellers.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                description={t.description}
                category={t.category}
                cover={t.cover_url}
                coverFallback={
                  <TemplateCover templateId={t.base_template} name={t.name} category={t.category}
                    kind={owned.has(t.slug) ? "owned" : "premium"}
                    logoUrl={branding?.logo_primary_url} primaryColor={branding?.brand_primary_color} />
                }
                author={t.author}
                version={t.version}
                rating={t.rating}
                downloads={t.downloads_count}
                priceLabel={formatPrice(t.price_cents)}
                badges={[{ label: "Top vendas", tone: "gold" }, ...badgesOf(t).filter((b) => b.label !== "Mais vendido")]}
                isOwned={owned.has(t.slug)}
                onPreview={() => setPreview({ base: t.base_template, name: t.name })}
                onPrimary={() => buy(t)}
                primaryLabel="Comprar em breve"
                primaryIcon="buy"
              />
            ))}
          </div>
        </section>
      )}

      {/* CATALOG */}
      <section id="market-grid">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Sparkles className="size-5" />
          <h2 className="text-xl font-bold text-slate-900">Catálogo completo</h2>
        </div>

        <Card className="p-4 rounded-2xl mb-5 bg-white/80 backdrop-blur border-slate-200/60">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input className="pl-10" placeholder="Buscar por nome, categoria ou descrição..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="lg:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priceTier} onValueChange={setPriceTier}>
              <SelectTrigger className="lg:w-44"><SelectValue placeholder="Preço" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os preços</SelectItem>
                <SelectItem value="gratis">Gratuitos</SelectItem>
                <SelectItem value="ate50">Até R$ 50</SelectItem>
                <SelectItem value="50a150">R$ 50 a R$ 150</SelectItem>
                <SelectItem value="acima150">Acima de R$ 150</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="destaques">Destaques</SelectItem>
                <SelectItem value="novos">Novos</SelectItem>
                <SelectItem value="vendidos">Mais vendidos</SelectItem>
                <SelectItem value="avaliacao">Melhor avaliados</SelectItem>
                <SelectItem value="preco_asc">Menor preço</SelectItem>
                <SelectItem value="preco_desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={onlyFav ? "default" : "outline"}
              onClick={() => setOnlyFav((v) => !v)}
              className="lg:w-auto"
            >
              <Filter className="size-4 mr-1" /> Favoritos
            </Button>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground rounded-2xl">
            Nenhum template encontrado com esses filtros.
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
                isFavorite={favorites.has(t.slug)}
                onPreview={() => setPreview({ base: t.base_template, name: t.name })}
                onPrimary={() => buy(t)}
                primaryLabel="Comprar em breve"
                primaryIcon="buy"
              />
            ))}
          </div>
        )}
      </section>

      {/* AUTORES */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Users className="size-5" />
          <h2 className="text-xl font-bold text-slate-900">Autores em destaque</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: "NavalDocs Studio", specialty: "Engenharia Naval", templates: 42, downloads: 12480, rating: 4.9, from: "#1e3a8a", to: "#0c1a40" },
            { name: "Marítima Premium", specialty: "Documentação Marinha", templates: 28, downloads: 8210, rating: 4.8, from: "#0c4a6e", to: "#082f49" },
            { name: "JurisNaval", specialty: "Jurídico & Contratos", templates: 19, downloads: 5360, rating: 4.7, from: "#1f1937", to: "#0c0a1f" },
            { name: "Atelier Executivo", specialty: "Dossiês & Relatórios", templates: 24, downloads: 6940, rating: 4.9, from: "#312e81", to: "#0f0a2a" },
          ].map((a) => (
            <Card key={a.name} className="rounded-2xl overflow-hidden border-slate-200/60 shadow-lg hover:-translate-y-1 transition-all">
              <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}>
                <div className="absolute -bottom-8 left-5 size-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-900 font-black text-lg ring-4 ring-white">
                  {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <Award className="absolute top-3 right-3 size-5 text-amber-300" />
              </div>
              <div className="pt-10 px-5 pb-5">
                <div className="font-bold text-slate-900">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.specialty}</div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-400" />{a.rating}</span>
                  <span>· {a.templates} templates</span>
                  <span>· {a.downloads.toLocaleString("pt-BR")} downloads</span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => toast.info("Página do autor em breve")}>
                  Ver portfólio
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* TEMPLATES INTELIGENTES (IA) */}
      <section>
        <Card className="relative overflow-hidden rounded-3xl border-slate-200/60 bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 text-white p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(167,139,250,0.5), transparent 50%), radial-gradient(circle at 10% 80%, rgba(56,189,248,0.4), transparent 50%)" }} />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="border-violet-300/40 bg-violet-400/10 text-violet-200">
                <Wand2 className="size-3 mr-1" /> NavalDocs AI · Em breve
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold leading-tight">
                Templates inteligentes gerados sob medida pela IA
              </h2>
              <p className="text-slate-200 text-sm md:text-base">
                Descreva o documento que você precisa e a IA criará um template personalizado com a identidade da sua empresa aplicada automaticamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Input
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                  placeholder="Ex.: laudo técnico de embarcação com vistoria estrutural..."
                />
                <Button className="bg-white text-slate-900 hover:bg-white/90" onClick={() => toast.info("Geração por IA será liberada em breve.")}>
                  <Wand2 className="size-4 mr-1" /> Gerar template
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="size-32 rounded-3xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Wand2 className="size-14 text-violet-200" />
              </div>
            </div>
          </div>
        </Card>
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
