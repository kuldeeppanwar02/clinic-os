import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/config/server-env";

let storageClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase storage config missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!storageClient) {
    storageClient = createClient(
      serverEnv.supabaseUrl,
      serverEnv.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return storageClient;
}
