import { createClient } from "@supabase/supabase-js";

// Safe fallback to prevent crashes if env vars are missing during build/dev
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

// Singleton instance for the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
