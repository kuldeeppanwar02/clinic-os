import { jsonError } from "@/app/api/api-helpers";
import { getPatientHistory, getPatientVisitSummary } from "@/lib/db/patient-history";
import { requireStaffUser } from "@/lib/db/staff-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mobile: string }> },
) {
  try {
    await requireStaffUser(request, { allowRoles: ["doctor", "staff"] });
    const { mobile } = await params;

    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      return Response.json({ message: "Valid mobile number required." }, { status: 400 });
    }

    const [history, summary] = await Promise.all([
      getPatientHistory(mobile),
      getPatientVisitSummary(mobile),
    ]);

    return Response.json({ history, summary });
  } catch (error) {
    return jsonError(error);
  }
}
