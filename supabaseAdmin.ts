import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialised so that importing this module never throws at build time.
function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in the environment."
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let cachedClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cachedClient) cachedClient = createAdminClient();
  return cachedClient;
}

// Drop-in lazy proxy so existing call sites (`supabaseAdmin.from(...)`) keep
// working without the module throwing on import.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseAdmin();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
