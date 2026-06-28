import { supabase } from "@/integrations/supabase/client";

export type TemplateVersion = {
  id: string;
  template_id: string;
  version: string;
  released_at: string;
  changelog: string[];
  notes: string | null;
};

export type TemplateReview = {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type TemplateStats = {
  downloads: number;
  rating: number;
  reviews_count: number;
};

export async function listVersions(templateId: string): Promise<TemplateVersion[]> {
  const { data, error } = await supabase
    .from("template_versions" as any)
    .select("*")
    .eq("template_id", templateId)
    .order("released_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    changelog: Array.isArray(r.changelog) ? r.changelog : [],
  })) as TemplateVersion[];
}

export async function listReviews(templateId: string): Promise<TemplateReview[]> {
  const { data, error } = await supabase
    .from("template_reviews" as any)
    .select("*")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function upsertReview(
  templateId: string,
  userId: string,
  rating: number,
  comment: string,
  companyId: string | null,
) {
  const { error } = await supabase
    .from("template_reviews" as any)
    .upsert(
      { template_id: templateId, user_id: userId, rating, comment, company_id: companyId },
      { onConflict: "template_id,user_id" },
    );
  if (error) throw error;
}

export async function registerDownload(templateId: string, userId: string, companyId: string | null) {
  await supabase.from("template_downloads" as any).insert({
    template_id: templateId,
    user_id: userId,
    company_id: companyId,
  });
}

export async function loadStats(templateId: string): Promise<TemplateStats> {
  const [downloads, reviews] = await Promise.all([
    supabase.from("template_downloads" as any).select("id", { count: "exact", head: true }).eq("template_id", templateId),
    supabase.from("template_reviews" as any).select("rating").eq("template_id", templateId),
  ]);
  const rows = (reviews.data ?? []) as { rating: number }[];
  const avg = rows.length ? rows.reduce((a, b) => a + b.rating, 0) / rows.length : 0;
  return {
    downloads: downloads.count ?? 0,
    rating: Math.round(avg * 10) / 10,
    reviews_count: rows.length,
  };
}
