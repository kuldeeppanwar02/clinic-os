import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { ClinicId } from "@/features/clinic/types";

export function useRealtimeQueue(clinicId: ClinicId, onUpdate: () => void) {
  const isConnected = useRef(false);

  useEffect(() => {
    // Only connect if we have the credentials (anon key is required for browser)
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return;
    }

    // Debounce the update callback so we don't spam state updates
    // if multiple rows change at the exact same millisecond
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onUpdate();
      }, 300);
    };

    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

    const channel = supabase
      .channel(`public:clinic_data:${clinicId}_${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "queue_entries",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          handleUpdate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_state",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          handleUpdate();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isConnected.current = true;
          console.log(`[Realtime] Connected to clinic: ${clinicId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
      isConnected.current = false;
    };
  }, [clinicId, onUpdate]);

  return isConnected;
}
