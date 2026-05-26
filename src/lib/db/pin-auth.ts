import "server-only";

import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { getDb, toIsoString } from "@/lib/supabase/db";
import { serverEnv } from "@/config/server-env";
import type { ClinicId } from "@/features/clinic/types";

export type StaffRole = "doctor" | "staff" | "pharmacist";

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  pinHash: string;
  phone: string;
  email: string;
  designation: string;
  clinicAccess: ClinicId[];
  status: "active" | "hold" | "removed";
  joinedAt: string;
  lastLoginAt: string;
  createdBy: string;
};

type StaffMemberRow = {
  id: string;
  name: string;
  role: StaffRole;
  pin_hash: string;
  phone: string;
  email: string;
  designation: string;
  clinic_access: ClinicId[];
  status: "active" | "hold" | "removed";
  joined_at: string | Date;
  last_login_at: string | Date | null;
  created_by: string;
};

function mapStaffMember(row: StaffMemberRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    pinHash: row.pin_hash,
    phone: row.phone,
    email: row.email,
    designation: row.designation,
    clinicAccess: row.clinic_access ?? [],
    status: row.status,
    joinedAt: toIsoString(row.joined_at),
    lastLoginAt: row.last_login_at ? toIsoString(row.last_login_at) : "",
    createdBy: row.created_by,
  };
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin.trim()).digest("hex");
}

function hashPinSecure(pin: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(pin.trim(), salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyStoredPinHash(pin: string, storedHash: string) {
  if (storedHash.startsWith("scrypt$")) {
    const [, salt, expectedHash] = storedHash.split("$");

    if (!salt || !expectedHash) {
      return false;
    }

    const derived = scryptSync(pin.trim(), salt, 32).toString("hex");
    const provided = Buffer.from(derived, "hex");
    const expected = Buffer.from(expectedHash, "hex");

    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  return hashPin(pin) === storedHash;
}

export async function verifyPin(
  pin: string,
): Promise<{ member: StaffMember; role: StaffRole } | null> {
  const db = getDb();
  const trimmedPin = pin.trim();

  for (const [clinicId, config] of Object.entries(serverEnv.doctors)) {
    if (config.pin && trimmedPin === config.pin) {
      const now = new Date().toISOString();

      return {
        member: {
          id: `doctor-${clinicId}`,
          name: config.name || "Doctor",
          role: "doctor",
          pinHash: hashPin(trimmedPin),
          phone: "",
          email: "",
          designation: "Doctor",
          clinicAccess: [clinicId as ClinicId],
          status: "active",
          joinedAt: now,
          lastLoginAt: now,
          createdBy: "system",
        },
        role: "doctor",
      };
    }
  }

  if (serverEnv.pharmacy.pin && trimmedPin === serverEnv.pharmacy.pin) {
    const now = new Date().toISOString();

    return {
      member: {
        id: "pharmacist-pharmacy",
        name: serverEnv.pharmacy.name || "Pharmacist",
        role: "pharmacist",
        pinHash: hashPin(trimmedPin),
        phone: "",
        email: "",
        designation: "Pharmacist",
        clinicAccess: ["pharmacy"],
        status: "active",
        joinedAt: now,
        lastLoginAt: now,
        createdBy: "system",
      },
      role: "pharmacist",
    };
  }

  const rows = await db<StaffMemberRow[]>`
    select
      id,
      name,
      role,
      pin_hash,
      phone,
      email,
      designation,
      clinic_access,
      status,
      joined_at,
      last_login_at,
      created_by
    from staff_members
    where status = 'active'
    order by joined_at desc
  `;

  const matchingRow = rows.find((row) => verifyStoredPinHash(trimmedPin, row.pin_hash));

  if (!matchingRow) {
    return null;
  }

  const lastLoginAt = new Date().toISOString();
  await db`
    update staff_members
    set last_login_at = ${lastLoginAt}
    where id = ${matchingRow.id}
  `;

  const member = mapStaffMember({
    ...matchingRow,
    last_login_at: lastLoginAt,
  });

  return { member, role: member.role };
}

export async function listStaffMembers(
  clinicFilter?: ClinicId,
): Promise<StaffMember[]> {
  const db = getDb();
  const rows = await db<StaffMemberRow[]>`
    select
      id,
      name,
      role,
      pin_hash,
      phone,
      email,
      designation,
      clinic_access,
      status,
      joined_at,
      last_login_at,
      created_by
    from staff_members
    order by joined_at desc
  `;

  const members = rows.map(mapStaffMember);

  if (!clinicFilter) {
    return members;
  }

  return members.filter((member) => member.clinicAccess.includes(clinicFilter));
}

export async function createStaffMember(
  input: Omit<StaffMember, "id" | "pinHash" | "joinedAt" | "lastLoginAt"> & { pin: string },
): Promise<StaffMember> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const clinicAccess: ClinicId[] = input.clinicAccess?.length
    ? input.clinicAccess
    : ["surgery"];
  const status = input.status || "active";

  await db`
    insert into staff_members (
      id,
      name,
      role,
      pin_hash,
      phone,
      email,
      designation,
      clinic_access,
      status,
      joined_at,
      last_login_at,
      created_by
    )
    values (
      ${id},
      ${input.name},
      ${input.role},
      ${hashPinSecure(input.pin)},
      ${input.phone || ""},
      ${input.email || ""},
      ${input.designation || ""},
      ${db.array(clinicAccess)},
      ${status},
      ${now},
      ${null},
      ${input.createdBy || "doctor"}
    )
  `;

  return {
    id,
    name: input.name,
    role: input.role,
    pinHash: "",
    phone: input.phone || "",
    email: input.email || "",
    designation: input.designation || "",
    clinicAccess,
    status,
    joinedAt: now,
    lastLoginAt: "",
    createdBy: input.createdBy || "doctor",
  };
}

export async function updateStaffMember(
  staffId: string,
  updates: Partial<
    Pick<
      StaffMember,
      "name" | "phone" | "email" | "designation" | "clinicAccess" | "status" | "role"
    >
  > & { pin?: string },
): Promise<void> {
  const db = getDb();
  const [currentRow] = await db<StaffMemberRow[]>`
    select
      id,
      name,
      role,
      pin_hash,
      phone,
      email,
      designation,
      clinic_access,
      status,
      joined_at,
      last_login_at,
      created_by
    from staff_members
    where id = ${staffId}
    limit 1
  `;

  if (!currentRow) {
    throw new Error("Staff member not found.");
  }

  const nextClinicAccess: ClinicId[] = updates.clinicAccess ??
    currentRow.clinic_access ??
    ["surgery"];

  await db`
    update staff_members
    set
      name = ${updates.name ?? currentRow.name},
      role = ${updates.role ?? currentRow.role},
      pin_hash = ${updates.pin ? hashPinSecure(updates.pin) : currentRow.pin_hash},
      phone = ${updates.phone ?? currentRow.phone},
      email = ${updates.email ?? currentRow.email},
      designation = ${updates.designation ?? currentRow.designation},
      clinic_access = ${db.array(nextClinicAccess)},
      status = ${updates.status ?? currentRow.status}
    where id = ${staffId}
  `;
}

export async function deleteStaffMember(staffId: string): Promise<void> {
  const db = getDb();
  await db`
    delete from staff_members
    where id = ${staffId}
  `;
}
