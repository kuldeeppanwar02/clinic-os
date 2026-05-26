import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";
import { requireStaffUser } from "@/lib/db/staff-auth";
import {
  getDefaultSchedule,
  saveDefaultSchedule,
  createEmptyDefaultSchedule,
  type ShiftDefinition,
} from "@/lib/db/schedule-store";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    noStore();
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic") || "surgery";

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }

    await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId: clinicId as ClinicId,
    });

    const schedule = await getDefaultSchedule(clinicId as ClinicId);

    if (!schedule) {
      // Return empty default template
      return Response.json({
        exists: false,
        schedule: createEmptyDefaultSchedule(clinicId as ClinicId),
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    return Response.json({
      exists: true,
      schedule,
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
    const { clinicId, shifts, weeklyOff, slotInterval, maxPatients, updatedBy } = body;

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }

    const session = await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId: clinicId as ClinicId,
    });

    // Validate shifts
    if (!Array.isArray(shifts) || shifts.length !== 3) {
      return Response.json({ message: "Exactly 3 shifts required." }, { status: 400 });
    }

    for (const shift of shifts as ShiftDefinition[]) {
      if (shift.enabled && (!shift.startTime || !shift.endTime)) {
        return Response.json({ message: "Enabled shifts must have start and end times." }, { status: 400 });
      }
    }

    const saved = await saveDefaultSchedule(clinicId as ClinicId, {
      shifts: shifts as [ShiftDefinition, ShiftDefinition, ShiftDefinition],
      weeklyOff: Array.isArray(weeklyOff) ? weeklyOff : ["Sunday"],
      slotInterval: slotInterval || 30,
      maxPatients: maxPatients || 20,
      updatedBy: updatedBy || session.name,
    });

    return Response.json({ schedule: saved });
  } catch (error) {
    return jsonError(error);
  }
}
