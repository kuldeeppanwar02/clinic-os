"use client";

import { useClinicSchedule } from "@/features/clinic/hooks/use-clinic-schedule";
import type { ClinicId } from "@/features/clinic/types";
import { Loader2 } from "lucide-react";

export function ClinicLiveStatusBanner({ clinicId }: { clinicId: ClinicId }) {
  const schedule = useClinicSchedule(clinicId);

  if (schedule.status === "loading") {
    return (
      <div className="mt-5 sm:mt-6 mb-2 flex h-10 sm:h-12 w-full animate-pulse items-center justify-center rounded-[1rem] bg-[rgba(19,49,58,0.05)]">
        <Loader2 className="h-4 w-4 animate-spin text-[rgba(19,49,58,0.3)]" />
      </div>
    );
  }

  if (schedule.status === "error") {
    return null; // Fail gracefully
  }

  // Determine styles based on status
  let wrapperClass = "";
  let icon = "";

  switch (schedule.status) {
    case "open":
      // Green "Pati"
      wrapperClass = "bg-[linear-gradient(90deg,#0f8a4f,#14a360)] border border-[rgba(20,163,96,0.3)] shadow-[0_4px_16px_rgba(20,163,96,0.2)]";
      icon = "🟢";
      break;
    case "break":
      // Orange "Pati"
      wrapperClass = "bg-[linear-gradient(90deg,#d97706,#f59e0b)] border border-[rgba(245,158,11,0.3)] shadow-[0_4px_16px_rgba(245,158,11,0.2)]";
      icon = "🟠";
      break;
    case "closed_for_day":
    case "on_leave":
      // Red "Pati"
      wrapperClass = "bg-[linear-gradient(90deg,#dc2626,#ef4444)] border border-[rgba(239,68,68,0.3)] shadow-[0_4px_16px_rgba(239,68,68,0.2)]";
      icon = "🔴";
      break;
  }

  return (
    <div className={`mt-5 sm:mt-6 mb-3 flex h-11 sm:h-12 w-full items-center overflow-hidden rounded-[14px] sm:rounded-[18px] text-white ${wrapperClass}`}>
      <div className="flex h-full items-center justify-center bg-[rgba(0,0,0,0.15)] px-3 sm:px-4 backdrop-blur-sm z-10 border-r border-[rgba(255,255,255,0.1)] rounded-l-[14px] sm:rounded-l-[18px]">
        <span className="text-sm sm:text-base animate-pulse shadow-sm">{icon}</span>
        <span className="ml-1.5 text-xs sm:text-sm font-bold tracking-wider uppercase text-[rgba(255,255,255,0.95)]">Live</span>
      </div>
      
      {/* Marquee Container */}
      <div className="relative flex h-full flex-1 items-center overflow-hidden">
        {/* We use two spans for continuous smooth marquee effect */}
        <div className="animate-marquee whitespace-nowrap px-4 py-2 font-medium text-sm sm:text-[15px] tracking-[0.01em]">
          {schedule.message}
          <span className="inline-block w-16"></span>
          {schedule.message}
          <span className="inline-block w-16"></span>
          {schedule.message}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
