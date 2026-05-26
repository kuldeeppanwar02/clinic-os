import { readClinicEntryParams, jsonError } from "@/app/api/api-helpers";
import { rescheduleRemoteQueueEntry } from "@/lib/db/queue-store";
import { requireStaffUser } from "@/lib/db/staff-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ clinicId: string; entryId: string }> },
) {
  try {
    const { clinicId, entryId } = await readClinicEntryParams(context.params);
    await requireStaffUser(request, {
      allowRoles: ["doctor", "staff"],
      clinicId,
    });
    const state = await rescheduleRemoteQueueEntry(clinicId, entryId);

    return Response.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
