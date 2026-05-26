"use client";

import { useEffect, useEffectEvent } from "react";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { supabase } from "@/lib/supabase/client";

export function useLiveQueuePolling(intervalMs = 5000) {
  const { refresh } = useClinic();

  const pollEvent = useEffectEvent(() => {
    void refresh();
  });

  useEffect(() => {
    pollEvent();
    
    // Listen for Realtime updates on clinic_stats (Queue Updates)
    const channel = supabase
      .channel(`queue_changes_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_stats" },
        () => {
          pollEvent(); // Refresh instantly when DB changes
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
