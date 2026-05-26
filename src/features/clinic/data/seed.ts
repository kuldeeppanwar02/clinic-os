import { getClinicDefinition } from "@/features/clinic/catalog";
import type { ClinicId, ClinicState } from "@/features/clinic/types";

export function createSeedClinicState(clinicId: ClinicId): ClinicState {
  const clinic = getClinicDefinition(clinicId);

  return {
    clinicId,
    clinicName: clinic.title,
    clinicSubtitle: clinic.subtitle,
    clinicPrefix: clinic.prefix,
    doctorMessage: "Subah OPD timing mein appointment aur walk-in dono available hain.",
    lastUpdated: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    queue: [],
  };
}
