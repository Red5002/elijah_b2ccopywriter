import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server-side Supabase configuration is incomplete.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
