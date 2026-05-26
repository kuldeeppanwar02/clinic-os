import "server-only";

import postgres, { type Sql } from "postgres";
import { serverEnv } from "@/config/server-env";

let sqlClient: Sql | null = null;

export function getDb() {
  if (!serverEnv.supabaseDatabaseUrl) {
    throw new Error(
      "Supabase database URL missing. Add SUPABASE_DATABASE_URL on the server.",
    );
  }

  if (!sqlClient) {
    sqlClient = postgres(serverEnv.supabaseDatabaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    });
  }

  return sqlClient;
}

export function toIsoString(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
