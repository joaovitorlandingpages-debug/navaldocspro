import { supabase } from "@/integrations/supabase/client";

export async function archiveProcess(id: string) {
  const { error } = await supabase.rpc("process_archive", { p_id: id });
  if (error) throw error;
}

export async function unarchiveProcess(id: string) {
  const { error } = await supabase.rpc("process_unarchive", { p_id: id });
  if (error) throw error;
}

export async function trashProcess(id: string) {
  const { error } = await supabase.rpc("process_trash", { p_id: id });
  if (error) throw error;
}

export async function restoreProcess(id: string) {
  const { error } = await supabase.rpc("process_restore", { p_id: id });
  if (error) throw error;
}

export async function hardDeleteProcess(id: string, confirmation: string) {
  const { error } = await supabase.rpc("process_hard_delete", {
    p_id: id,
    p_confirmation: confirmation,
  });
  if (error) throw error;
}

export async function toggleFavoriteProcess(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("process_toggle_favorite", { p_id: id });
  if (error) throw error;
  return data as boolean;
}

export async function duplicateProcess(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("process_duplicate", { p_id: id });
  if (error) throw error;
  return data as string;
}

export async function getProcessShareToken(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("process_get_share_token", { p_id: id });
  if (error) throw error;
  return data as string;
}

export function getShareUrl(token: string): string {
  if (typeof window === "undefined") return `/portal/${token}`;
  return `${window.location.origin}/portal/${token}`;
}

export async function copyShareLink(id: string): Promise<string> {
  const token = await getProcessShareToken(id);
  const url = getShareUrl(token);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }
  return url;
}

export function getProcessConfirmationHint(p: { protocol_number?: string | null; id: string }): string {
  return p.protocol_number ?? p.id.substring(0, 8);
}
