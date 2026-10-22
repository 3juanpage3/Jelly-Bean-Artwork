import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const ownerIds = (
  import.meta.env.VITE_OWNER_IDS || import.meta.env.VITE_OWNER_ID || ""
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
