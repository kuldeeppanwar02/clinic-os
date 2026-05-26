import { readClinicId, jsonError } from "@/app/api/api-helpers";
import { markRemoteEntryAsReportCheck } from "@/lib/db/queue-store";
import { requireStaffUser } from "@/lib/db/staff-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ clinicId: string; entryId: string }> },
) {
  try {
    const clinicId = await readClinicId(context.params);
    const { entryId } = await context.params;

    await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId,
    });

    const state = await markRemoteEntryAsReportCheck(clinicId, entryId);

    return Response.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
