import { readClinicId, ApiRouteError, jsonError } from "@/app/api/api-helpers";
import { createRemoteBooking } from "@/lib/db/queue-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ clinicId: string }> },
) {
  try {
    const clinicId = await readClinicId(context.params);
    const body = (await request.json()) as {
      dayLabel?: string;
      slotLabel?: string;
      name?: string;
      mobile?: string;
      clientRequestId?: string;
      createdAt?: string;
      requiresPharmacyFollowUp?: boolean;
    };

    if (!body.dayLabel || !body.slotLabel || !body.name?.trim()) {
      throw new ApiRouteError("Booking form is incomplete.", 400);
    }

    const state = await createRemoteBooking({
      clinicId,
      dayLabel: body.dayLabel,
      slotLabel: body.slotLabel,
      name: body.name,
      mobile: body.mobile ?? "",
      clientRequestId: body.clientRequestId,
      createdAt: body.createdAt,
      requiresPharmacyFollowUp: body.requiresPharmacyFollowUp,
    });

    return Response.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
