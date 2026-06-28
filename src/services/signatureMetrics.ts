import { supabase } from "@/integrations/supabase/client";

export interface SignatureMetrics {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  today: number;
  this_week: number;
  total: number;
  avg_completion_minutes: number | null;
  completion_rate: number;
  avg_per_participant_minutes: number | null;
}

export async function loadSignatureMetrics(companyId: string): Promise<SignatureMetrics> {
  const { data: reqs } = await supabase
    .from("signature_requests")
    .select("id,status,created_at,updated_at")
    .eq("company_id", companyId);
  const list = reqs ?? [];

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);

  const counts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0, today: 0, this_week: 0 };
  let total = 0;
  let completionMinutes: number[] = [];

  for (const r of list) {
    total++;
    const created = new Date(r.created_at);
    if (created >= startOfDay) counts.today++;
    if (created >= startOfWeek) counts.this_week++;
    if (r.status === "completed") {
      counts.completed++;
      if (r.updated_at) {
        const diff = (new Date(r.updated_at).getTime() - created.getTime()) / 60000;
        if (diff > 0) completionMinutes.push(diff);
      }
    } else if (r.status === "cancelled" || r.status === "expired") {
      counts.cancelled++;
    } else if (r.status === "in_progress" || r.status === "viewed") {
      counts.in_progress++;
    } else {
      counts.pending++;
    }
  }

  const { data: parts } = await supabase
    .from("signature_participants")
    .select("signed_at,created_at,status")
    .eq("company_id", companyId)
    .eq("status", "signed");
  const partTimes: number[] = [];
  for (const p of parts ?? []) {
    if (p.signed_at && p.created_at) {
      const diff = (new Date(p.signed_at).getTime() - new Date(p.created_at).getTime()) / 60000;
      if (diff > 0 && diff < 60 * 24 * 30) partTimes.push(diff);
    }
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return {
    ...counts,
    total,
    avg_completion_minutes: avg(completionMinutes),
    completion_rate: total ? Math.round((counts.completed / total) * 100) : 0,
    avg_per_participant_minutes: avg(partTimes),
  };
}
