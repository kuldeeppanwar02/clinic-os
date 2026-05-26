import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId, QueueStatus } from "@/features/clinic/types";
import { StaffAuthError } from "@/lib/db/staff-auth";

const queueStatuses: QueueStatus[] = [
  "waiting",
  "in-progress",
  "hold",
  "done",
  "skipped",
];

export class ApiRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function readClinicId(
  paramsPromise: Promise<{ clinicId: string }>,
): Promise<ClinicId> {
  const { clinicId } = await paramsPromise;

  if (!isClinicId(clinicId)) {
    throw new ApiRouteError("Invalid clinic selected.", 404);
  }

  return clinicId;
}

export async function readClinicEntryParams(
  paramsPromise: Promise<{ clinicId: string; entryId: string }>,
) {
  const { clinicId, entryId } = await paramsPromise;

  if (!isClinicId(clinicId)) {
    throw new ApiRouteError("Invalid clinic selected.", 404);
  }

  if (!entryId) {
    throw new ApiRouteError("Queue entry is required.", 400);
  }

  return { clinicId, entryId };
}

export function readQueueStatus(value: unknown): QueueStatus {
  if (typeof value !== "string" || !queueStatuses.includes(value as QueueStatus)) {
    throw new ApiRouteError("Invalid queue status provided.", 400);
  }

  return value as QueueStatus;
}

export function jsonError(error: unknown) {
  if (error instanceof ApiRouteError || error instanceof StaffAuthError) {
    return Response.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json(
    { message: "Unexpected server error. Please try again." },
    { status: 500 },
  );
}
