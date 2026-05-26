import "server-only";

import { randomUUID } from "crypto";
import type { ClinicId } from "@/features/clinic/types";
import { serverEnv } from "@/config/server-env";
import { getDb, toIsoString } from "@/lib/supabase/db";
import { getSupabaseAdminClient } from "@/lib/supabase/storage";

export type PrescriptionStatus = "sent" | "preparing" | "ready" | "collected";

export type StoredPrescriptionDoc = {
  id: string;
  clinicId: ClinicId;
  tokenId: string;
  patientName: string;
  date: string;
  photoPaths?: string[];
  photoUrls?: string[];
  status: PrescriptionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PrescriptionDoc = Omit<StoredPrescriptionDoc, "photoPaths"> & {
  photoUrls: string[];
};

type PrescriptionRow = {
  id: string;
  clinic_id: ClinicId;
  token_id: string;
  patient_name: string;
  date: string | Date;
  photo_paths: string[];
  status: PrescriptionStatus;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function toDateString(value: string | Date) {
  return new Date(value).toISOString().split("T")[0];
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid prescription photo format.");
  }

  const [, mimeType, base64Payload] = match;
  return {
    mimeType,
    buffer: Buffer.from(base64Payload, "base64"),
  };
}

function getFileExtension(mimeType: string) {
  const subtype = mimeType.split("/")[1]?.toLowerCase() || "jpg";
  return subtype === "jpeg" ? "jpg" : subtype.replace(/[^a-z0-9]/g, "") || "jpg";
}

function mapStoredPrescription(row: PrescriptionRow): StoredPrescriptionDoc {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    tokenId: row.token_id,
    patientName: row.patient_name,
    date: toDateString(row.date),
    photoPaths: row.photo_paths ?? [],
    status: row.status,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function uploadPrescriptionPhoto(input: {
  clinicId: ClinicId;
  tokenId: string;
  date: string;
  photo: string;
}) {
  const { mimeType, buffer } = parseDataUrl(input.photo);
  const extension = getFileExtension(mimeType);
  const path = `prescriptions/${input.date}/${input.clinicId}/${input.tokenId}/${randomUUID()}.${extension}`;
  const client = getSupabaseAdminClient();
  const { error } = await client.storage
    .from(serverEnv.supabaseStorageBucket)
    .upload(path, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Prescription photo upload failed: ${error.message}`);
  }

  return path;
}

async function resolvePhotoUrls(record: StoredPrescriptionDoc) {
  const photoPaths = record.photoPaths ?? [];

  if (photoPaths.length === 0) {
    return record.photoUrls ?? [];
  }

  const client = getSupabaseAdminClient();
  return Promise.all(
    photoPaths.map(async (path) => {
      const { data, error } = await client.storage
        .from(serverEnv.supabaseStorageBucket)
        .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        throw new Error(`Prescription photo URL failed: ${error?.message || "unknown error"}`);
      }

      return data.signedUrl;
    }),
  );
}

async function hydratePrescription(record: StoredPrescriptionDoc): Promise<PrescriptionDoc> {
  return {
    ...record,
    photoUrls: await resolvePhotoUrls(record),
  };
}

export async function createPrescription(input: {
  clinicId: ClinicId;
  tokenId: string;
  patientName: string;
  photos: string[];
  createdBy: string;
}): Promise<PrescriptionDoc> {
  const db = getDb();
  const now = new Date().toISOString();
  const date = todayDate();
  const id = randomUUID();
  const photoPaths = await Promise.all(
    input.photos.map((photo) =>
      uploadPrescriptionPhoto({
        clinicId: input.clinicId,
        tokenId: input.tokenId,
        date,
        photo,
      }),
    ),
  );

  await db`
    insert into prescriptions (
      id,
      clinic_id,
      token_id,
      patient_name,
      date,
      photo_paths,
      status,
      created_by,
      created_at,
      updated_at
    )
    values (
      ${id},
      ${input.clinicId},
      ${input.tokenId},
      ${input.patientName},
      ${date},
      ${db.array(photoPaths)},
      ${"sent"},
      ${input.createdBy},
      ${now},
      ${now}
    )
  `;

  return hydratePrescription({
    id,
    clinicId: input.clinicId,
    tokenId: input.tokenId,
    patientName: input.patientName,
    date,
    photoPaths,
    status: "sent",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getPrescriptionsForDate(
  clinicId?: string,
  date?: string,
): Promise<StoredPrescriptionDoc[]> {
  const db = getDb();
  const targetDate = date || todayDate();
  const rows = clinicId
    ? await db<PrescriptionRow[]>`
        select
          id,
          clinic_id,
          token_id,
          patient_name,
          date,
          photo_paths,
          status,
          created_by,
          created_at,
          updated_at
        from prescriptions
        where date = ${targetDate} and clinic_id = ${clinicId}
        order by created_at desc
      `
    : await db<PrescriptionRow[]>`
        select
          id,
          clinic_id,
          token_id,
          patient_name,
          date,
          photo_paths,
          status,
          created_by,
          created_at,
          updated_at
        from prescriptions
        where date = ${targetDate}
        order by created_at desc
      `;

  return rows.map(mapStoredPrescription);
}

export async function getStoredPrescriptionById(
  prescriptionId: string,
): Promise<StoredPrescriptionDoc | null> {
  const db = getDb();
  const [row] = await db<PrescriptionRow[]>`
    select
      id,
      clinic_id,
      token_id,
      patient_name,
      date,
      photo_paths,
      status,
      created_by,
      created_at,
      updated_at
    from prescriptions
    where id = ${prescriptionId}
    limit 1
  `;

  return row ? mapStoredPrescription(row) : null;
}

export async function getPrescriptionById(prescriptionId: string): Promise<PrescriptionDoc | null> {
  const record = await getStoredPrescriptionById(prescriptionId);
  return record ? hydratePrescription(record) : null;
}

export async function updatePrescriptionStatus(
  prescriptionId: string,
  status: PrescriptionStatus,
): Promise<void> {
  const db = getDb();
  await db`
    update prescriptions
    set status = ${status}, updated_at = ${new Date().toISOString()}
    where id = ${prescriptionId}
  `;
}
