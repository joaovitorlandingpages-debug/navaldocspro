import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  PDF_TEMPLATES,
  loadCompanyBranding,
  type CompanyBranding,
  type PdfTemplateId,
} from "@/services/companyBranding";
import {
  listCompanyLibrary,
  removeFromLibrary,
  setAsDefault,
  toggleFavorite,
  type CompanyLibraryItem,
} from "@/services/marketplaceTemplates";
import { CATEGORY_OF } from "@/services/companyPdfTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplatePreviewModal } from "@/components/templates/TemplatePreviewModal";
import { TemplateCover } from "@/components/templates/TemplateCover";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, ShoppingBag, Gift, Clock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/templates/meus")({ component: MeusPage });

type Tab = "favoritos" | "comprados" | "gratuitos" | "recentes";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "comprados", label: "Comprados", icon: ShoppingBag },
  { id: "gratuitos", label: "Gratuitos", icon: Gift },
  { id: "recentes", label: "Recentes", icon: Clock },
];

function MeusPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [items, setItems] = useState<CompanyLibraryItem[]>([]);
  const [preview, setPreview] = useState<{ base: PdfTemplateId; name: string } | null>(null);
  const [tab, setTab] = useState<Tab>("favoritos");

  const reload = async (cid: string) => setItems(await listCompanyLibrary(cid));

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!p?.company_id) return;
      setCompanyId(p.company_id);
      setBranding(await loadCompanyBranding(p.company_id));
      reload(p.company_id);
    })();
  }, [user]);

  const labelOf = (slug: string) => PDF_TEMPLATES.find((t) => t.id === slug)?.label ?? slug;
  const descOf = (slug: string) => PDF_TEMPLATES.find((t) => t.id === slug)?.description ?? null;

  const counts = useMemo(() => ({
    favoritos: items.filter((i) => i.is_favorite).length,
    comprados: items.filter((i) => i.source !== "free").length,
    gratuitos: items.filter((i) => i.source === "free").length,
    recentes: items.length,
  }), [items]);

  const filtered = useMemo(() => {
    if (tab === "favoritos") return items.filter((i) => i.is_favorite);
    if (tab === "comprados") return items.filter((i) => i.source !== "free");
    if (tab === "gratuitos") return items.filter((i) => i.source === "free");
    return [...items].sort((a, b) => +new Date(b.acquired_at) - +new Date(a.acquired_at)).slice(0, 12);
  }, [items, tab]);

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === t.id ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
            <span className={`text-xs ${tab === t.id ? "text-white/80" : "text-slate-400"}`}>({counts[t.id]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground rounded-2xl">
          {tab === "favoritos" && "Nenhum favorito ainda. Marque templates com o coração."}
          {tab === "comprados" && "Você ainda não adquiriu templates premium."}
          {tab === "gratuitos" && "Nenhum template gratuito adicionado. Vá em Gratuitos para começar."}
          {tab === "recentes" && "Nenhum template na biblioteca ainda."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((it) => {
            const badges = [
              ...(it.is_default ? [{ label: "Padrão", tone: "gold" as const }] : []),
              ...(it.source === "free" ? [{ label: "Gratuito", tone: "green" as const }] : [{ label: "Premium", tone: "blue" as const }]),
            ];
            return (
              <div key={it.id} className="flex flex-col gap-2">
                <TemplateCard
                  name={labelOf(it.template_slug)}
                  description={descOf(it.template_slug)}
                  category={CATEGORY_OF[it.template_slug as PdfTemplateId] ?? "geral"}
                  priceLabel={it.source === "free" ? "Gratuito" : "Adquirido"}
                  badges={badges}
                  coverFallback={
                    <TemplateCover
                      templateId={it.base_template}
                      name={labelOf(it.template_slug)}
                      category={CATEGORY_OF[it.template_slug as PdfTemplateId] ?? "geral"}
                      kind={it.source === "free" ? "free" : "premium"}
                      logoUrl={branding?.logo_primary_url}
                      primaryColor={branding?.brand_primary_color}
                    />
                  }
                  isFavorite={it.is_favorite}
                  onFavorite={async () => {
                    await toggleFavorite(it.id, !it.is_favorite);
                    if (companyId) reload(companyId);
                  }}
                  onPreview={() => setPreview({ base: it.base_template, name: labelOf(it.template_slug) })}
                  onPrimary={async () => {
                    if (!companyId) return;
                    await setAsDefault(companyId, it.id);
                    toast.success("Definido como padrão da empresa");
                    reload(companyId);
                  }}
                  primaryLabel={it.is_default ? "Padrão atual" : "Definir padrão"}
                  isOwned={it.is_default}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700 self-end"
                  onClick={async () => {
                    await removeFromLibrary(it.id);
                    if (companyId) reload(companyId);
                  }}
                >
                  <Trash2 className="size-4 mr-1" /> Remover
                </Button>
              </div>
            );
          })}
        </div>
      )}

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
