import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import { listStaffMembers, createStaffMember } from "@/lib/db/pin-auth";
import { requireStaffUser, StaffAuthError } from "@/lib/db/staff-auth";
import type { ClinicId } from "@/features/clinic/types";

export async function GET(request: Request) {
  try {
    const session = await requireStaffUser(request, { allowRoles: ["doctor"] });
    const { searchParams } = new URL(request.url);
    const clinicParam = searchParams.get("clinic");
    const clinicFilter = isClinicId(clinicParam) ? clinicParam : null;

    if (clinicParam && !clinicFilter) {
      return Response.json({ message: "Invalid clinic selected." }, { status: 400 });
    }

    if (clinicFilter && !session.clinicAccess.includes(clinicFilter)) {
      throw new StaffAuthError("You do not have access to this clinic.", 403);
    }

    const members = clinicFilter
      ? await listStaffMembers(clinicFilter)
      : (await listStaffMembers()).filter((member) =>
          member.clinicAccess.some((clinicId) => session.clinicAccess.includes(clinicId)),
        );
    return Response.json({ members });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffUser(request, { allowRoles: ["doctor"] });
    const body = await request.json();
    const { name, role, pin, phone, email, designation, clinicAccess, status, createdBy } = body;

    if (!name?.trim()) {
      return Response.json({ message: "Name is required." }, { status: 400 });
    }
    if (!pin?.trim()) {
      return Response.json({ message: "PIN is required." }, { status: 400 });
    }

    const requestedClinicAccess = Array.isArray(clinicAccess)
      ? clinicAccess.filter((value): value is ClinicId => isClinicId(value))
      : (["surgery"] as ClinicId[]);

    if (
      requestedClinicAccess.length === 0 ||
      requestedClinicAccess.some((clinicId) => !session.clinicAccess.includes(clinicId))
    ) {
      throw new StaffAuthError("Invalid clinic access selection.", 403);
    }

    const member = await createStaffMember({
      name: name.trim(),
      role: role || "staff",
      pin: pin.trim(),
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      designation: designation?.trim() || "",
      clinicAccess: requestedClinicAccess,
      status: status || "active",
      createdBy: createdBy || session.name,
    });

    return Response.json({ member }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
