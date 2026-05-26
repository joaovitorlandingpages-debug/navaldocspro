import { supabase } from "@/integrations/supabase/client";

/**
 * Safely converts any value to a lowercased string.
 * Prevents "toLowerCase is not a function" errors.
 */
export const safeToLowerCase = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
};

export const safeString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};
