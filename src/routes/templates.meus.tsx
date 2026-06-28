import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Star, Trash2 } from "lucide-react";

export const Route = createFileRoute("/templates/meus")({ component: MeusPage });

function MeusPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [items, setItems] = useState<CompanyLibraryItem[]>([]);
  const [preview, setPreview] = useState<{ base: PdfTemplateId; name: string } | null>(null);

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

  if (!items.length) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Nenhum template na sua biblioteca. Adicione gratuitos ou adquira no Marketplace.
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((it) => {
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
