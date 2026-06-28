import { supabase } from "@/integrations/supabase/client";
import type { PdfTemplateId } from "./companyBranding";

export type MarketplaceTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  base_template: PdfTemplateId;
  cover_url: string | null;
  gallery_urls: string[];
  author: string;
  version: string;
  price_cents: number;
  is_exclusive: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_promo: boolean;
  downloads_count: number;
  rating: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplaceCollection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  template_slugs: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyLibraryItem = {
  id: string;
  company_id: string;
  source: "free" | "purchased" | "collection";
  template_slug: string;
  base_template: PdfTemplateId;
  is_default: boolean;
  is_favorite: boolean;
  document_type: string | null;
  acquired_at: string;
};

export async function listMarketplaceTemplates(): Promise<MarketplaceTemplate[]> {
  const { data, error } = await supabase
    .from("marketplace_templates" as any)
    .select("*")
    .eq("published", true)
    .order("is_featured", { ascending: false })
    .order("downloads_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function listCollections(): Promise<MarketplaceCollection[]> {
  const { data, error } = await supabase
    .from("marketplace_collections" as any)
    .select("*")
    .eq("published", true);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function listCompanyLibrary(companyId: string): Promise<CompanyLibraryItem[]> {
  const { data, error } = await supabase
    .from("company_template_library" as any)
    .select("*")
    .eq("company_id", companyId)
    .order("is_favorite", { ascending: false })
    .order("acquired_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function addFreeToLibrary(
  companyId: string,
  templateSlug: string,
  baseTemplate: PdfTemplateId,
): Promise<void> {
  const { error } = await supabase
    .from("company_template_library" as any)
    .upsert(
      {
        company_id: companyId,
        source: "free",
        template_slug: templateSlug,
        base_template: baseTemplate,
      },
      { onConflict: "company_id,template_slug" },
    );
  if (error) throw error;
}

export async function toggleFavorite(itemId: string, value: boolean) {
  const { error } = await supabase
    .from("company_template_library" as any)
    .update({ is_favorite: value })
    .eq("id", itemId);
  if (error) throw error;
}

export async function setAsDefault(companyId: string, itemId: string) {
  await supabase
    .from("company_template_library" as any)
    .update({ is_default: false })
    .eq("company_id", companyId);
  const { error } = await supabase
    .from("company_template_library" as any)
    .update({ is_default: true })
    .eq("id", itemId);
  if (error) throw error;
}

export async function removeFromLibrary(itemId: string) {
  const { error } = await supabase
    .from("company_template_library" as any)
    .delete()
    .eq("id", itemId);
  if (error) throw error;
}

export function formatPrice(cents: number): string {
  if (!cents) return "Gratuito";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
