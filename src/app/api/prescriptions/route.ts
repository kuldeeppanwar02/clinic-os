import { NextRequest, NextResponse } from "next/server";
import {
  createPrescription,
  getPrescriptionsForDate,
  getStoredPrescriptionById,
  updatePrescriptionStatus,
  type PrescriptionStatus,
} from "@/lib/db/prescription-store";
import { requireStaffUser, StaffAuthError } from "@/lib/db/staff-auth";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";

function ensurePrescriptionAccess(
  session: Awaited<ReturnType<typeof requireStaffUser>>,
  clinicId: ClinicId,
) {
  if (session.role === "pharmacist") {
    return;
  }

  if (!session.clinicAccess.includes(clinicId)) {
    throw new StaffAuthError("You do not have access to this clinic.", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinicId, tokenId, patientName, photos, createdBy } = body;

    if (!isClinicId(clinicId)) {
      return NextResponse.json({ error: "Valid clinicId is required" }, { status: 400 });
    }
    if (!tokenId || !patientName || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: "clinicId, tokenId, patientName, and photos are required" },
        { status: 400 },
      );
    }

    const session = await requireStaffUser(req, {
      allowRoles: ["doctor", "staff"],
      clinicId,
    });

    for (const photo of photos) {
      if (typeof photo !== "string" || photo.length > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Each compressed photo must be under the upload limit." },
          { status: 400 },
        );
      }
    }

    const prescription = await createPrescription({
      clinicId,
      tokenId,
      patientName,
      photos,
      createdBy: createdBy || session.name,
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/prescriptions]", error);
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireStaffUser(req, { allowRoles: ["doctor", "pharmacist"] });
    const { searchParams } = new URL(req.url);
    const clinicParam = searchParams.get("clinic");
    const clinicId = isClinicId(clinicParam) ? clinicParam : undefined;
    const date = searchParams.get("date") || undefined;

    if (clinicParam && !clinicId) {
      return NextResponse.json({ error: "Invalid clinic" }, { status: 400 });
    }

    if (clinicId) {
      ensurePrescriptionAccess(session, clinicId);
    }

    const prescriptions = await getPrescriptionsForDate(clinicId, date);
    const filtered =
      session.role === "pharmacist"
        ? prescriptions
        : prescriptions.filter((item) => session.clinicAccess.includes(item.clinicId));

    const light = filtered.map((item) => ({
      id: item.id,
      clinicId: item.clinicId,
      tokenId: item.tokenId,
      patientName: item.patientName,
      date: item.date,
      status: item.status,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      photoCount: item.photoPaths?.length ?? item.photoUrls?.length ?? 0,
      photoUrls: [],
    }));

    return NextResponse.json({ prescriptions: light });
  } catch (error) {
    console.error("[GET /api/prescriptions]", error);
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireStaffUser(req, { allowRoles: ["doctor", "pharmacist"] });
    const body = await req.json();
    const { prescriptionId, status } = body;

    if (!prescriptionId || !status) {
      return NextResponse.json(
        { error: "prescriptionId and status are required" },
        { status: 400 },
      );
    }

    const validStatuses: PrescriptionStatus[] = ["sent", "preparing", "ready", "collected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status must be sent, preparing, ready, or collected" },
        { status: 400 },
      );
    }

    const record = await getStoredPrescriptionById(prescriptionId);
    if (!record) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    ensurePrescriptionAccess(session, record.clinicId);
    await updatePrescriptionStatus(prescriptionId, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/prescriptions]", error);
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}
