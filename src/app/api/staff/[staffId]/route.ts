import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";
import {
  listStaffMembers,
  updateStaffMember,
  deleteStaffMember,
} from "@/lib/db/pin-auth";
import { requireStaffUser, StaffAuthError } from "@/lib/db/staff-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const session = await requireStaffUser(request, { allowRoles: ["doctor"] });
    const { staffId } = await params;
    const body = await request.json();

    if (!staffId) {
      return Response.json({ message: "Staff ID is required." }, { status: 400 });
    }

    const clinicAccess = Array.isArray(body.clinicAccess)
      ? body.clinicAccess.filter(
          (value: unknown): value is ClinicId => typeof value === "string" && isClinicId(value),
        )
      : undefined;

    if (
      clinicAccess &&
      (clinicAccess.length === 0 ||
        clinicAccess.some((clinicId: ClinicId) => !session.clinicAccess.includes(clinicId)))
    ) {
      throw new StaffAuthError("Invalid clinic access selection.", 403);
    }

    const existingMember = (await listStaffMembers()).find((member) => member.id === staffId);
    if (
      existingMember &&
      !existingMember.clinicAccess.some((clinicId) => session.clinicAccess.includes(clinicId))
    ) {
      throw new StaffAuthError("You do not have access to this staff member.", 403);
    }

    await updateStaffMember(staffId, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      designation: body.designation,
      clinicAccess,
      status: body.status,
      role: body.role,
      pin: body.pin,
    });

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const session = await requireStaffUser(request, { allowRoles: ["doctor"] });
    const { staffId } = await params;

    if (!staffId) {
      return Response.json({ message: "Staff ID is required." }, { status: 400 });
    }

    const existingMember = (await listStaffMembers()).find((member) => member.id === staffId);
    if (
      existingMember &&
      !existingMember.clinicAccess.some((clinicId) => session.clinicAccess.includes(clinicId))
    ) {
      throw new StaffAuthError("You do not have access to this staff member.", 403);
    }

    await deleteStaffMember(staffId);
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
