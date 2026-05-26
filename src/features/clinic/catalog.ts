import { ClinicDefinition, ClinicId } from "./types";

export const CLINICS: ClinicDefinition[] = [
  {
    id: "ortho",
    slug: "ortho",
    shortName: "Orthopaedics",
    title: "Dr. R P Samota",
    subtitle: "MS (Orthopaedics) — Bone, Joint & Fracture Care",
    metaLine: "Consultant Orthopaedics",
    prefix: "O",
    phone: "01424294545",
    locationLabel: "Renwal Multi-Speciality Hospital",
    hoursLabel: "4:00 PM - 8:00 PM (Mon-Sat)",
    accentColor: "#f59e0b",
    hasBooking: true,
  },
  {
    id: "surgery",
    slug: "surgery",
    shortName: "Surgery",
    title: "Dr. M L Didel",
    subtitle: "MS (General Surgery) — Laparoscopic & Trauma",
    metaLine: "Consultant Surgeon",
    prefix: "S",
    phone: "01424294545",
    locationLabel: "Renwal Multi-Speciality Hospital",
    hoursLabel: "10:00 AM - 1:00 PM (Mon-Sat)",
    accentColor: "#e11d48",
    hasBooking: true,
  },
  {
    id: "medicine",
    slug: "medicine",
    shortName: "Medicine",
    title: "Dr. Rajesh Bochaliya",
    subtitle: "MD (General Medicine) — Infections, Diabetes & ICU",
    metaLine: "Consultant Physician",
    prefix: "M",
    phone: "01424294545",
    locationLabel: "Renwal Multi-Speciality Hospital",
    hoursLabel: "10:00 AM - 6:00 PM (Mon-Sat)",
    accentColor: "#16a34a",
    hasBooking: true,
  },
  {
    id: "urology",
    slug: "urology",
    shortName: "Urology",
    title: "Dr. Nishkarsh Mehta",
    subtitle: "MCh Urology — Kidneys, Prostate & Bladder",
    metaLine: "Consultant Urologist",
    prefix: "U",
    phone: "01424294545",
    locationLabel: "Renwal Multi-Speciality Hospital",
    hoursLabel: "4:00 PM - 8:00 PM (Mon-Sat)",
    accentColor: "#0ea5e9",
    hasBooking: true,
  },
  {
    id: "anaesthesia",
    slug: "anaesthesia",
    shortName: "Anaesthesia",
    title: "Dr. Pankaj Saini",
    subtitle: "DNB Anaesthesia — Critical Care & Pain Management",
    metaLine: "Consultant Anaesthetist & Critical Care",
    prefix: "A",
    phone: "01424294545",
    locationLabel: "Renwal Multi-Speciality Hospital",
    hoursLabel: "Daily OPD",
    accentColor: "#8b5cf6",
    hasBooking: true,
  },
];

export const DEFAULT_CLINIC_ID: ClinicId = "ortho";

export function getClinicDefinition(id: string): ClinicDefinition {
  const clinic = CLINICS.find((c) => c.id === id);
  if (!clinic) {
    return CLINICS[0];
  }
  return clinic;
}

export function isClinicId(id: string | null | undefined): id is ClinicId {
  if (!id) return false;
  return CLINICS.some((c) => c.id === id);
}

export function buildClinicHref(path: string, clinicId: string | null): string {
  if (!clinicId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}clinic=${clinicId}`;
}
