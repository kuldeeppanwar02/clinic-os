import "server-only";

import type { ClinicId } from "@/features/clinic/types";
import { getDb, toIsoString } from "@/lib/supabase/db";

export type ShiftDefinition = {
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type DefaultSchedule = {
  clinicId: ClinicId;
  shifts: [ShiftDefinition, ShiftDefinition, ShiftDefinition];
  weeklyOff: string[];
  slotInterval: number;
  maxPatients: number;
  updatedAt: string;
  updatedBy: string;
};

export type DayOverride = {
  id: string;
  clinicId: ClinicId;
  date: string;
  closedShifts: number[];
  fullDayClosed: boolean;
  reason: string;
  createdBy: string;
  createdAt: string;
};

export type DaySchedule = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  slots: string[];
  maxPatients: number;
  notes: string;
};

export type WeekSchedule = {
  id: string;
  clinicId: ClinicId;
  weekStart: string;
  weekEnd: string;
  days: Record<string, DaySchedule>;
  updatedAt: string;
  updatedBy: string;
};

type DefaultScheduleRow = {
  clinic_id: ClinicId;
  shifts: ShiftDefinition[];
  weekly_off: string[];
  slot_interval: number;
  max_patients: number;
  updated_at: string | Date;
  updated_by: string;
};

type DayOverrideRow = {
  id: string;
  clinic_id: ClinicId;
  override_date: string | Date;
  closed_shifts: number[];
  full_day_closed: boolean;
  reason: string;
  created_by: string;
  created_at: string | Date;
};

type WeekScheduleRow = {
  id: string;
  clinic_id: ClinicId;
  week_start: string | Date;
  week_end: string | Date;
  days: Record<string, DaySchedule>;
  updated_at: string | Date;
  updated_by: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_SHIFTS: [ShiftDefinition, ShiftDefinition, ShiftDefinition] = [
  { label: "Morning", startTime: "09:00", endTime: "12:00", enabled: true },
  { label: "Afternoon", startTime: "12:00", endTime: "15:00", enabled: true },
  { label: "Evening", startTime: "15:00", endTime: "18:00", enabled: false },
];

function cloneDefaultShifts(): [ShiftDefinition, ShiftDefinition, ShiftDefinition] {
  return DEFAULT_SHIFTS.map((shift) => ({ ...shift })) as [
    ShiftDefinition,
    ShiftDefinition,
    ShiftDefinition,
  ];
}

function parseJsonLike(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeShift(value: unknown, fallback: ShiftDefinition): ShiftDefinition {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const candidate = value as Partial<ShiftDefinition>;

  return {
    label:
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label
        : fallback.label,
    startTime:
      typeof candidate.startTime === "string" && candidate.startTime.trim().length > 0
        ? candidate.startTime
        : fallback.startTime,
    endTime:
      typeof candidate.endTime === "string" && candidate.endTime.trim().length > 0
        ? candidate.endTime
        : fallback.endTime,
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : fallback.enabled,
  };
}

function normalizeShifts(value: unknown): [ShiftDefinition, ShiftDefinition, ShiftDefinition] {
  const parsed = parseJsonLike(value);
  const source = Array.isArray(parsed) ? parsed : [];
  return cloneDefaultShifts().map((fallback, index) =>
    normalizeShift(source[index], fallback),
  ) as [ShiftDefinition, ShiftDefinition, ShiftDefinition];
}

function normalizeWeeklyOff(value: unknown) {
  const parsed = parseJsonLike(value);

  if (Array.isArray(parsed)) {
    return parsed.filter(
      (day): day is string => typeof day === "string" && day.trim().length > 0,
    );
  }

  if (typeof parsed === "string" && parsed.startsWith("{") && parsed.endsWith("}")) {
    return parsed
      .slice(1, -1)
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((day): day is string => typeof day === "string" && day.trim().length > 0);
}

function toDateString(value: string | Date) {
  return new Date(value).toISOString().split("T")[0];
}

function mapDefaultSchedule(row: DefaultScheduleRow): DefaultSchedule {
  return {
    clinicId: row.clinic_id,
    shifts: normalizeShifts(row.shifts),
    weeklyOff: normalizeWeeklyOff(row.weekly_off),
    slotInterval: row.slot_interval,
    maxPatients: row.max_patients,
    updatedAt: toIsoString(row.updated_at),
    updatedBy: row.updated_by,
  };
}

function mapDayOverride(row: DayOverrideRow): DayOverride {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    date: toDateString(row.override_date),
    closedShifts: (row.closed_shifts ?? []).map(Number),
    fullDayClosed: row.full_day_closed,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
  };
}

function mapWeekSchedule(row: WeekScheduleRow): WeekSchedule {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    weekStart: toDateString(row.week_start),
    weekEnd: toDateString(row.week_end),
    days: normalizeWeekDays(row.days),
    updatedAt: toIsoString(row.updated_at),
    updatedBy: row.updated_by,
  };
}

export function generateSlots(start: string, end: string, interval = 30): string[] {
  if (!start || !end) return [];

  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + (sm || 0);
  const endMins = eh * 60 + (em || 0);

  while (mins < endMins) {
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    slots.push(`${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`);
    mins += interval;
  }

  return slots;
}

export function autoShiftLabel(startTime: string): string {
  const hour = parseInt(startTime.split(":")[0], 10);
  if (hour < 8) return "Early Morning";
  if (hour < 12) return "Morning";
  if (hour < 15) return "Afternoon";
  if (hour < 18) return "Evening";
  return "Night";
}

export async function getDefaultSchedule(
  clinicId: ClinicId,
): Promise<DefaultSchedule | null> {
  const db = getDb();
  const [row] = await db<DefaultScheduleRow[]>`
    select
      clinic_id,
      shifts,
      weekly_off,
      slot_interval,
      max_patients,
      updated_at,
      updated_by
    from default_schedules
    where clinic_id = ${clinicId}
    limit 1
  `;

  return row ? mapDefaultSchedule(row) : null;
}

export async function saveDefaultSchedule(
  clinicId: ClinicId,
  schedule: Omit<DefaultSchedule, "clinicId" | "updatedAt">,
): Promise<DefaultSchedule> {
  const db = getDb();
  const now = new Date().toISOString();

  await db`
    insert into default_schedules (
      clinic_id,
      shifts,
      weekly_off,
      slot_interval,
      max_patients,
      updated_at,
      updated_by
    )
    values (
      ${clinicId},
      ${db.json(schedule.shifts)},
      ${db.array(schedule.weeklyOff)},
      ${schedule.slotInterval},
      ${schedule.maxPatients},
      ${now},
      ${schedule.updatedBy}
    )
    on conflict (clinic_id)
    do update set
      shifts = excluded.shifts,
      weekly_off = excluded.weekly_off,
      slot_interval = excluded.slot_interval,
      max_patients = excluded.max_patients,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `;

  return {
    clinicId,
    shifts: schedule.shifts,
    weeklyOff: schedule.weeklyOff,
    slotInterval: schedule.slotInterval,
    maxPatients: schedule.maxPatients,
    updatedAt: now,
    updatedBy: schedule.updatedBy,
  };
}

export function createEmptyDefaultSchedule(clinicId: ClinicId = "surgery"): DefaultSchedule {
  return {
    clinicId,
    shifts: cloneDefaultShifts(),
    weeklyOff: ["Sunday"],
    slotInterval: 30,
    maxPatients: 20,
    updatedAt: "",
    updatedBy: "",
  };
}

function overrideDocId(clinicId: ClinicId, date: string): string {
  return `${clinicId}_${date}`;
}

export async function getDayOverride(
  clinicId: ClinicId,
  date: string,
): Promise<DayOverride | null> {
  const db = getDb();
  const [row] = await db<DayOverrideRow[]>`
    select
      id,
      clinic_id,
      override_date,
      closed_shifts,
      full_day_closed,
      reason,
      created_by,
      created_at
    from day_overrides
    where clinic_id = ${clinicId} and override_date = ${date}
    limit 1
  `;

  return row ? mapDayOverride(row) : null;
}

export async function saveDayOverride(
  clinicId: ClinicId,
  date: string,
  override: {
    closedShifts: number[];
    fullDayClosed: boolean;
    reason: string;
    createdBy: string;
  },
): Promise<DayOverride> {
  const db = getDb();
  const id = overrideDocId(clinicId, date);
  const now = new Date().toISOString();

  await db`
    insert into day_overrides (
      id,
      clinic_id,
      override_date,
      closed_shifts,
      full_day_closed,
      reason,
      created_by,
      created_at
    )
    values (
      ${id},
      ${clinicId},
      ${date},
      ${db.array(override.closedShifts)}::integer[],
      ${override.fullDayClosed},
      ${override.reason},
      ${override.createdBy},
      ${now}
    )
    on conflict (id)
    do update set
      clinic_id = excluded.clinic_id,
      override_date = excluded.override_date,
      closed_shifts = excluded.closed_shifts,
      full_day_closed = excluded.full_day_closed,
      reason = excluded.reason,
      created_by = excluded.created_by,
      created_at = excluded.created_at
  `;

  return {
    id,
    clinicId,
    date,
    closedShifts: override.closedShifts,
    fullDayClosed: override.fullDayClosed,
    reason: override.reason,
    createdBy: override.createdBy,
    createdAt: now,
  };
}

export async function deleteDayOverride(
  clinicId: ClinicId,
  date: string,
): Promise<void> {
  const db = getDb();
  await db`
    delete from day_overrides
    where clinic_id = ${clinicId} and override_date = ${date}
  `;
}

export type ResolvedDaySchedule = {
  dayName: string;
  dayOfWeek: number;
  isOpen: boolean;
  shifts: Array<ShiftDefinition & { slots: string[]; closed: boolean }>;
  allSlots: string[];
  maxPatients: number;
  source: "default" | "week" | "override";
  override?: DayOverride;
};

export async function resolveScheduleForDate(
  clinicId: ClinicId,
  date: string,
): Promise<ResolvedDaySchedule> {
  const dateObj = new Date(`${date}T00:00:00`);
  const dayOfWeek = dateObj.getDay();
  const dayName = DAY_NAMES[dayOfWeek];

  const override = await getDayOverride(clinicId, date);
  const defaultSched = await getDefaultSchedule(clinicId);
  const weekStart = getMonday(dateObj);
  const weekSched = await getWeekSchedule(clinicId, weekStart);
  const weekDay = weekSched.days[dayName];

  if (!defaultSched) {
    const isOpen = weekDay ? weekDay.isOpen : dayOfWeek !== 0;
    const slots =
      weekDay && weekDay.isOpen
        ? weekDay.slots?.length
          ? weekDay.slots
          : generateSlots(weekDay.openTime, weekDay.closeTime)
        : [];

    return {
      dayName,
      dayOfWeek,
      isOpen,
      shifts: [
        {
          label: "Full Day",
          startTime: weekDay?.openTime || "09:00",
          endTime: weekDay?.closeTime || "18:00",
          enabled: isOpen,
          slots,
          closed: !isOpen,
        },
      ],
      allSlots: slots,
      maxPatients: weekDay?.maxPatients || 30,
      source: "week",
    };
  }

  const isWeeklyOff = defaultSched.weeklyOff.includes(dayName);
  const interval = defaultSched.slotInterval || 30;
  const hasWeekOverride = Boolean(weekDay && weekSched.updatedAt);

  const resolvedShifts = defaultSched.shifts.map((shift, idx) => {
    const shiftEnabled = shift.enabled && !isWeeklyOff;
    const closedByOverride = override
      ? override.fullDayClosed || override.closedShifts.includes(idx)
      : false;
    const isOpen = shiftEnabled && !closedByOverride;
    const slots = isOpen ? generateSlots(shift.startTime, shift.endTime, interval) : [];

    return {
      ...shift,
      enabled: shiftEnabled,
      slots,
      closed: closedByOverride,
    };
  });

  if (hasWeekOverride && weekDay) {
    const isOpenWeek = weekDay.isOpen && !override?.fullDayClosed;

    if (!isOpenWeek && !isWeeklyOff) {
      return {
        dayName,
        dayOfWeek,
        isOpen: false,
        shifts: resolvedShifts.map((shift) => ({ ...shift, slots: [], closed: true })),
        allSlots: [],
        maxPatients: defaultSched.maxPatients,
        source: "week",
        override: override || undefined,
      };
    }
  }

  const isOpen =
    !isWeeklyOff &&
    !override?.fullDayClosed &&
    resolvedShifts.some((shift) => shift.slots.length > 0);
  const allSlots = resolvedShifts.flatMap((shift) => shift.slots);

  return {
    dayName,
    dayOfWeek,
    isOpen,
    shifts: resolvedShifts,
    allSlots,
    maxPatients: defaultSched.maxPatients,
    source: override ? "override" : "default",
    override: override || undefined,
  };
}

function defaultDaySchedule(): DaySchedule {
  return {
    isOpen: true,
    openTime: "09:00",
    closeTime: "18:00",
    slots: ["09:30 AM", "10:00 AM", "10:30 AM", "11:15 AM", "12:00 PM", "04:30 PM"],
    maxPatients: 20,
    notes: "",
  };
}

function createDefaultWeek(): Record<string, DaySchedule> {
  const days: Record<string, DaySchedule> = {};
  for (const day of DAY_NAMES) {
    days[day] = defaultDaySchedule();
    if (day === "Sunday") {
      days[day] = {
        ...days[day],
        isOpen: false,
        notes: "Closed",
      };
    }
  }
  return days;
}

function normalizeDaySchedule(value: unknown): DaySchedule {
  const fallback = defaultDaySchedule();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<DaySchedule>;
  return {
    isOpen: typeof candidate.isOpen === "boolean" ? candidate.isOpen : fallback.isOpen,
    openTime:
      typeof candidate.openTime === "string" && candidate.openTime.trim().length > 0
        ? candidate.openTime
        : fallback.openTime,
    closeTime:
      typeof candidate.closeTime === "string" && candidate.closeTime.trim().length > 0
        ? candidate.closeTime
        : fallback.closeTime,
    slots: Array.isArray(candidate.slots)
      ? candidate.slots.filter((slot): slot is string => typeof slot === "string")
      : fallback.slots,
    maxPatients:
      typeof candidate.maxPatients === "number" && Number.isFinite(candidate.maxPatients)
        ? candidate.maxPatients
        : fallback.maxPatients,
    notes: typeof candidate.notes === "string" ? candidate.notes : fallback.notes,
  };
}

function normalizeWeekDays(value: unknown) {
  const defaults = createDefaultWeek();
  const parsed = parseJsonLike(value);
  const source =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    DAY_NAMES.map((day) => [day, normalizeDaySchedule(source[day] ?? defaults[day])]),
  ) as Record<string, DaySchedule>;
}

function getWeekId(clinicId: ClinicId, weekStart: string): string {
  return `${clinicId}_${weekStart}`;
}

export async function getWeekSchedule(
  clinicId: ClinicId,
  weekStart: string,
): Promise<WeekSchedule> {
  const db = getDb();
  const [row] = await db<WeekScheduleRow[]>`
    select
      id,
      clinic_id,
      week_start,
      week_end,
      days,
      updated_at,
      updated_by
    from week_schedules
    where clinic_id = ${clinicId} and week_start = ${weekStart}
    limit 1
  `;

  if (!row) {
    const weekEnd = getWeekEnd(weekStart);
    return {
      id: getWeekId(clinicId, weekStart),
      clinicId,
      weekStart,
      weekEnd,
      days: createDefaultWeek(),
      updatedAt: "",
      updatedBy: "",
    };
  }

  return mapWeekSchedule(row);
}

export async function saveWeekSchedule(
  clinicId: ClinicId,
  weekStart: string,
  days: Record<string, DaySchedule>,
  updatedBy: string,
): Promise<WeekSchedule> {
  const db = getDb();
  const id = getWeekId(clinicId, weekStart);
  const weekEnd = getWeekEnd(weekStart);
  const now = new Date().toISOString();

  await db`
    insert into week_schedules (
      id,
      clinic_id,
      week_start,
      week_end,
      days,
      updated_at,
      updated_by
    )
    values (
      ${id},
      ${clinicId},
      ${weekStart},
      ${weekEnd},
      ${db.json(days)},
      ${now},
      ${updatedBy}
    )
    on conflict (id)
    do update set
      clinic_id = excluded.clinic_id,
      week_start = excluded.week_start,
      week_end = excluded.week_end,
      days = excluded.days,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `;

  return {
    id,
    clinicId,
    weekStart,
    weekEnd,
    days,
    updatedAt: now,
    updatedBy,
  };
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  return date.toISOString().split("T")[0];
}

export function getMonday(date: Date = new Date()): string {
  const next = new Date(date);
  const day = next.getDay();
  const diff = next.getDate() - day + (day === 0 ? -6 : 1);
  next.setDate(diff);
  return next.toISOString().split("T")[0];
}

export function getNextMonday(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
}

export function getPrevMonday(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
}

export function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function tomorrowDateStr(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}
