import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";
import { requireStaffUser } from "@/lib/db/staff-auth";
import {
  getDayOverride,
  saveDayOverride,
  deleteDayOverride,
} from "@/lib/db/schedule-store";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    noStore();
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic") || "surgery";
    const date = searchParams.get("date");

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }
    if (!date) {
      return Response.json({ message: "date parameter required." }, { status: 400 });
    }

    await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId: clinicId as ClinicId,
    });

    const override = await getDayOverride(clinicId as ClinicId, date);

    return Response.json({
      exists: !!override,
      override: override || null,
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
    const { clinicId, date, closedShifts, fullDayClosed, reason, createdBy } = body;

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }
    if (!date) {
      return Response.json({ message: "date is required." }, { status: 400 });
    }

    const session = await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId: clinicId as ClinicId,
    });

    // If removing override (reopening)
    if (body.remove === true) {
      await deleteDayOverride(clinicId as ClinicId, date);
      return Response.json({ removed: true });
    }

    const override = await saveDayOverride(clinicId as ClinicId, date, {
      closedShifts: closedShifts || [],
      fullDayClosed: fullDayClosed || false,
      reason: reason || "",
      createdBy: createdBy || session.name,
    });

    return Response.json({ override });
  } catch (error) {
    return jsonError(error);
  }
}
