import { jsonError } from "@/app/api/api-helpers";
import { getClinicVisitsByDateRange } from "@/lib/db/patient-history";
import { requireStaffUser } from "@/lib/db/staff-auth";
import type { ClinicId } from "@/features/clinic/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawClinicId = url.searchParams.get("clinicId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!rawClinicId || !["surgery", "dental", "pharmacy"].includes(rawClinicId)) {
      return Response.json({ message: "Invalid clinicId." }, { status: 400 });
    }

    const clinicId = rawClinicId as ClinicId;

    // Secure cross-clinic access check (prevents IDOR)
    await requireStaffUser(request, { allowRoles: ["doctor", "staff"], clinicId });

    // Date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !dateRegex.test(startDate)) {
      return Response.json({ message: "Invalid startDate format (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!endDate || !dateRegex.test(endDate)) {
      return Response.json({ message: "Invalid endDate format (YYYY-MM-DD)" }, { status: 400 });
    }

    const visits = await getClinicVisitsByDateRange(clinicId, startDate, endDate);
    return Response.json({ visits });
  } catch (error) {
    return jsonError(error);
  }
}
