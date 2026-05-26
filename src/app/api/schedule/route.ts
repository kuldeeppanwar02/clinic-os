import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";
import { requireStaffUser } from "@/lib/db/staff-auth";
import {
  getWeekSchedule,
  saveWeekSchedule,
  resolveScheduleForDate,
  todayDateStr,
  tomorrowDateStr,
  generateSlots,
  type DaySchedule,
} from "@/lib/db/schedule-store";
import { unstable_noStore as noStore } from "next/cache";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const dynamic = "force-dynamic";

/**
 * GET /api/schedule
 *
 * Supports two modes:
 * 1. ?mode=resolved&clinic=surgery — Returns today + tomorrow resolved schedule (shift-aware)
 * 2. ?clinic=surgery&weekOffset=0  — Legacy week-based schedule for Schedule Management page
 */
export async function GET(request: Request) {
  try {
    noStore();
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic") || searchParams.get("clinicId") || "surgery";
    const mode = searchParams.get("mode");

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }

    // ── New Mode: Resolved schedule (shift-aware) ──
    if (mode === "resolved") {
      const today = todayDateStr();
      const tomorrow = tomorrowDateStr();

      const [todaySchedule, tomorrowSchedule] = await Promise.all([
        resolveScheduleForDate(clinicId as ClinicId, today),
        resolveScheduleForDate(clinicId as ClinicId, tomorrow),
      ]);

      return Response.json({
        today: todaySchedule,
        tomorrow: tomorrowSchedule,
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // ── Legacy Mode: Week-based schedule ──
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0", 10);

    const monday = new Date();
    const dayOfWeek = monday.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + diff + weekOffset * 7);
    const weekStart = searchParams.get("weekStart") || monday.toISOString().split("T")[0];

    const schedule = await getWeekSchedule(clinicId as ClinicId, weekStart);

    const defaultOpen = "09:00";
    const defaultClose = "17:00";

    const daysArray = DAY_NAMES.map((name, index) => {
      const saved = schedule.days[name];
      if (saved) {
        return {
          dayOfWeek: index,
          dayName: name,
          ...saved,
          slots: saved.isOpen && saved.openTime && saved.closeTime && (!saved.slots || saved.slots.length === 0)
            ? generateSlots(saved.openTime, saved.closeTime)
            : saved.slots || [],
        };
      }
      const isOpen = index > 0 && index < 7;
      return {
        dayOfWeek: index,
        dayName: name,
        isOpen,
        openTime: defaultOpen,
        closeTime: defaultClose,
        slots: isOpen ? generateSlots(defaultOpen, defaultClose) : [],
        maxPatients: 30,
        notes: "",
      };
    });

    return Response.json({
      schedule: daysArray,
      weekStart,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, weekStart, days, updatedBy } = body;

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }
    if (!weekStart || !days) {
      return Response.json({ message: "weekStart and days are required." }, { status: 400 });
    }

    const session = await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId: clinicId as ClinicId,
    });

    const daysRecord: Record<string, DaySchedule> = {};
    (days as Array<{ dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string; slots: string[]; maxPatients: number; notes: string }>).forEach(
      (day) => {
        const name = DAY_NAMES[day.dayOfWeek];
        if (name) {
          daysRecord[name] = {
            isOpen: day.isOpen,
            openTime: day.openTime,
            closeTime: day.closeTime,
            slots: day.slots,
            maxPatients: day.maxPatients,
            notes: day.notes || "",
          };
        }
      },
    );

    const schedule = await saveWeekSchedule(
      clinicId as ClinicId,
      weekStart,
      daysRecord,
      updatedBy || session.name,
    );

    return Response.json({ schedule });
  } catch (error) {
    return jsonError(error);
  }
}
