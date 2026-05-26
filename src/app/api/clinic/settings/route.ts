import { jsonError } from "@/app/api/api-helpers";
import { isClinicId } from "@/features/clinic/catalog";
import type { ClinicId } from "@/features/clinic/types";
import { requireStaffUser } from "@/lib/db/staff-auth";
import { getClinicSettings, saveClinicSettings } from "@/lib/db/clinic-settings";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    noStore();
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic") || searchParams.get("clinicId") || "surgery";

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }

    const settings = await getClinicSettings(clinicId as ClinicId);

    return Response.json({ settings }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, doctorName, clinicName, address, phone, whatsapp } = body;

    if (!isClinicId(clinicId)) {
      return Response.json({ message: "Invalid clinic." }, { status: 400 });
    }

    await requireStaffUser(request, {
      allowRoles: ["doctor"],
      clinicId: clinicId as ClinicId,
    });

    const settings = await saveClinicSettings(clinicId as ClinicId, {
      doctorName: doctorName || "",
      clinicName: clinicName || "",
      address: address || "",
      phone: phone || "",
      whatsapp: whatsapp || "",
    });

    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
