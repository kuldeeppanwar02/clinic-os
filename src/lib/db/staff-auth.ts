import "server-only";

import type { ClinicId } from "@/features/clinic/types";
import type { StaffRole } from "@/lib/db/pin-auth";
import {
  readSessionCookie,
  verifyStaffSessionToken,
  type StaffSessionClaims,
} from "@/lib/staff-session";

export class StaffAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return readSessionCookie(request.headers.get("cookie"));
}

function ensureRole(session: StaffSessionClaims, allowRoles?: StaffRole[]) {
  if (allowRoles && !allowRoles.includes(session.role)) {
    throw new StaffAuthError("You do not have permission for this action.", 403);
  }
}

function ensureClinicAccess(session: StaffSessionClaims, clinicId?: ClinicId) {
  if (!clinicId) {
    return;
  }

  if (!session.clinicAccess.includes(clinicId)) {
    throw new StaffAuthError("You do not have access to this clinic.", 403);
  }
}

export async function requireStaffUser(
  request: Request,
  options: { allowRoles?: StaffRole[]; clinicId?: ClinicId } = {},
) {
  const token = readBearerToken(request);

  if (!token) {
    throw new StaffAuthError("Staff session missing. Please login again.");
  }

  try {
    const session = verifyStaffSessionToken(token);
    ensureRole(session, options.allowRoles);
    ensureClinicAccess(session, options.clinicId);
    return session;
  } catch {
    throw new StaffAuthError("Staff session invalid or expired. Please login again.");
  }
}
