import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

function isConfiguredValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !(
    normalized.includes("your_") ||
    normalized.includes("placeholder") ||
    normalized === "changeme"
  );
}

export function getSupabaseServiceClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasConfig = isConfiguredValue(supabaseUrl) && isConfiguredValue(supabaseKey);

  cachedClient =
    hasConfig
      ? createClient(supabaseUrl as string, supabaseKey as string)
      : null;

  return cachedClient;
}
