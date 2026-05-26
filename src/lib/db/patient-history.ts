import "server-only";

import { randomUUID } from "crypto";
import { getDb, toIsoString } from "@/lib/supabase/db";
import type { ClinicId } from "@/features/clinic/types";

export type PatientVisit = {
  id: string;
  mobile: string;
  name: string;
  clinicId: ClinicId;
  token: string;
  bookingId: string;
  source: "booking" | "walk-in";
  dayLabel: string;
  slotLabel: string;
  status: string;
  visitDate: string;
  createdAt: string;
};

type PatientVisitRow = {
  id: string;
  mobile: string;
  name: string;
  clinic_id: ClinicId;
  token: string;
  booking_id: string;
  source: "booking" | "walk-in";
  day_label: string;
  slot_label: string;
  status: string;
  visit_date: string | Date;
  created_at: string | Date;
};

function mapVisit(row: PatientVisitRow): PatientVisit {
  return {
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    clinicId: row.clinic_id,
    token: row.token,
    bookingId: row.booking_id,
    source: row.source,
    dayLabel: row.day_label,
    slotLabel: row.slot_label,
    status: row.status,
    visitDate: new Date(row.visit_date).toISOString().split("T")[0],
    createdAt: toIsoString(row.created_at),
  };
}

export async function saveVisitRecord(
  mobile: string | null | undefined,
  name: string,
  clinicId: ClinicId,
  data: {
    token: string;
    bookingId: string;
    source: "booking" | "walk-in";
    dayLabel: string;
    slotLabel: string;
  },
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const cleanMobile = mobile ? mobile.replace(/\D/g, "").slice(-10) : "";

  await db`
    insert into patient_visits (
      id,
      mobile,
      name,
      clinic_id,
      token,
      booking_id,
      source,
      day_label,
      slot_label,
      status,
      visit_date,
      created_at
    )
    values (
      ${randomUUID()},
      ${cleanMobile},
      ${name},
      ${clinicId},
      ${data.token},
      ${data.bookingId},
      ${data.source},
      ${data.dayLabel},
      ${data.slotLabel},
      ${"done"},
      ${now.toISOString().split("T")[0]},
      ${now.toISOString()}
    )
  `;
}

export async function getPatientHistory(
  mobile: string,
): Promise<PatientVisit[]> {
  if (!mobile || mobile.replace(/\D/g, "").length < 10) {
    return [];
  }

  const db = getDb();
  const normalizedMobile = mobile.replace(/\D/g, "").slice(-10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rows = await db<PatientVisitRow[]>`
    select
      id,
      mobile,
      name,
      clinic_id,
      token,
      booking_id,
      source,
      day_label,
      slot_label,
      status,
      visit_date,
      created_at
    from patient_visits
    where mobile = ${normalizedMobile}
      and created_at >= ${sixMonthsAgo.toISOString()}
    order by created_at desc
    limit 50
  `;

  return rows.map(mapVisit);
}

export async function getPatientVisitSummary(
  mobile: string,
): Promise<{ totalVisits: number; lastVisitDate: string | null; clinicBreakdown: Record<string, number> }> {
  const visits = await getPatientHistory(mobile);
  const clinicBreakdown: Record<string, number> = {};

  for (const visit of visits) {
    clinicBreakdown[visit.clinicId] = (clinicBreakdown[visit.clinicId] || 0) + 1;
  }

  return {
    totalVisits: visits.length,
    lastVisitDate: visits.length > 0 ? visits[0].visitDate : null,
    clinicBreakdown,
  };
}

export async function getClinicVisitsByDateRange(
  clinicId: ClinicId,
  startDate: string,
  endDate: string,
): Promise<PatientVisit[]> {
  const db = getDb();

  const rows = await db<PatientVisitRow[]>`
    select
      id,
      mobile,
      name,
      clinic_id,
      token,
      booking_id,
      source,
      day_label,
      slot_label,
      status,
      visit_date,
      created_at
    from patient_visits
    where clinic_id = ${clinicId}
      and visit_date >= ${startDate}
      and visit_date <= ${endDate}
    order by visit_date desc, created_at desc
    limit 1000
  `;

  return rows.map(mapVisit);
}
