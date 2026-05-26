import "server-only";

import { getDb, toIsoString } from "@/lib/supabase/db";
import type { ClinicId } from "@/features/clinic/types";

export type ClinicSettings = {
  clinicId: ClinicId;
  doctorName: string;
  clinicName: string;
  address: string;
  phone: string;
  whatsapp: string;
  updatedAt: string;
};

type ClinicSettingsRow = {
  clinic_id: string;
  doctor_name: string;
  clinic_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  updated_at: string | Date;
};

function mapSettings(row: ClinicSettingsRow): ClinicSettings {
  return {
    clinicId: row.clinic_id as ClinicId,
    doctorName: row.doctor_name,
    clinicName: row.clinic_name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    updatedAt: toIsoString(row.updated_at),
  };
}

async function ensureTableExists(sql: any) {
  await sql`
    create table if not exists clinic_settings (
      clinic_id varchar(50) primary key,
      doctor_name varchar(255) not null default '',
      clinic_name varchar(255) not null default '',
      address text not null default '',
      phone varchar(50) not null default '',
      whatsapp varchar(50) not null default '',
      updated_at timestamp with time zone default now()
    )
  `;
}

export async function getClinicSettings(clinicId: ClinicId): Promise<ClinicSettings | null> {
  const db = getDb();
  await ensureTableExists(db);

  const [row] = await db<ClinicSettingsRow[]>`
    select * from clinic_settings
    where clinic_id = ${clinicId}
    limit 1
  `;

  if (!row) return null;
  return mapSettings(row);
}

export async function saveClinicSettings(
  clinicId: ClinicId,
  data: Omit<ClinicSettings, "clinicId" | "updatedAt">,
): Promise<ClinicSettings> {
  const db = getDb();
  await ensureTableExists(db);

  const now = new Date();

  const [row] = await db<ClinicSettingsRow[]>`
    insert into clinic_settings (
      clinic_id,
      doctor_name,
      clinic_name,
      address,
      phone,
      whatsapp,
      updated_at
    ) values (
      ${clinicId},
      ${data.doctorName},
      ${data.clinicName},
      ${data.address},
      ${data.phone},
      ${data.whatsapp},
      ${toIsoString(now)}
    )
    on conflict (clinic_id) do update set
      doctor_name = excluded.doctor_name,
      clinic_name = excluded.clinic_name,
      address = excluded.address,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      updated_at = excluded.updated_at
    returning *
  `;

  return mapSettings(row);
}
