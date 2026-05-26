import { NextRequest, NextResponse } from "next/server";
import { getPrescriptionById } from "@/lib/db/prescription-store";
import { requireStaffUser, StaffAuthError } from "@/lib/db/staff-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffUser(req, { allowRoles: ["doctor", "pharmacist"] });
    const { id } = await params;
    const prescription = await getPrescriptionById(id);

    if (!prescription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      session.role !== "pharmacist" &&
      !session.clinicAccess.includes(prescription.clinicId)
    ) {
      throw new StaffAuthError("You do not have access to this prescription.", 403);
    }

    return NextResponse.json({ prescription });
  } catch (error) {
    console.error("[GET /api/prescriptions/:id]", error);
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}
