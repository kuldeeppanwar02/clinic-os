import { readClinicId, jsonError } from "@/app/api/api-helpers";
import { resetRemoteClinicQueue } from "@/lib/db/queue-store";
import { requireStaffUser } from "@/lib/db/staff-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ clinicId: string }> },
) {
  try {
    const clinicId = await readClinicId(context.params);
    await requireStaffUser(request, {
      allowRoles: ["doctor"],
      clinicId,
    });
    const state = await resetRemoteClinicQueue(clinicId);

    return Response.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
