import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
// The anonymous fallback keeps existing deployments working during the staged rollout.
// After RLS is enabled it has no access to lead or booking records.
const serverKey = process.env.SUPABASE_SERVER_KEY;
const databaseKey = serverKey || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error("Missing environment variable: SUPABASE_URL");
if (!databaseKey) throw new Error("Missing server database configuration");

export const supabase = createClient(supabaseUrl, databaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
