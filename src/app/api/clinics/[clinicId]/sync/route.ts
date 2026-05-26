import { readClinicId, ApiRouteError, jsonError } from "@/app/api/api-helpers";
import { syncRemotePendingEntries } from "@/lib/db/queue-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ clinicId: string }> },
) {
  try {
    const clinicId = await readClinicId(context.params);
    const body = (await request.json()) as {
      pendingEntries?: Array<{
        clientRequestId?: string;
        source?: "booking" | "walk-in";
        name?: string;
        mobile?: string;
        dayLabel?: string;
        slotLabel?: string;
        provisionalToken?: string;
        provisionalBookingId?: string;
        createdAt?: string;
        requiresPharmacyFollowUp?: boolean;
      }>;
    };

    if (!Array.isArray(body.pendingEntries) || body.pendingEntries.length === 0) {
      throw new ApiRouteError("No pending entries received for sync.", 400);
    }

    const pendingEntries = body.pendingEntries.map((entry, index) => {
      if (
        !entry.clientRequestId ||
        !entry.source ||
        !entry.name ||
        entry.mobile === undefined ||
        !entry.dayLabel ||
        !entry.slotLabel
      ) {
        throw new ApiRouteError(`Pending entry ${index + 1} is incomplete.`, 400);
      }

      return {
        clientRequestId: entry.clientRequestId,
        source: entry.source,
        name: entry.name,
        mobile: entry.mobile,
        dayLabel: entry.dayLabel,
        slotLabel: entry.slotLabel,
        provisionalToken: entry.provisionalToken,
        provisionalBookingId: entry.provisionalBookingId,
        createdAt: entry.createdAt,
        requiresPharmacyFollowUp: entry.requiresPharmacyFollowUp,
      };
    });

    const state = await syncRemotePendingEntries(clinicId, pendingEntries);

    return Response.json({ state });
  } catch (error) {
    return jsonError(error);
  }
}
