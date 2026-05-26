"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession } from "@/components/navbar";
import { apiClient } from "@/services/api";
import {
  Sun, CloudSun, Moon, AlertTriangle, Loader2,
} from "lucide-react";

/* ═══ Types ═══ */
type ShiftDef = { label: string; startTime: string; endTime: string; enabled: boolean };
type DefaultSched = {
  clinicId: string; shifts: [ShiftDef, ShiftDef, ShiftDef];
  weeklyOff: string[]; slotInterval: number; maxPatients: number;
  updatedAt: string; updatedBy: string;
};
type DayScheduleLegacy = {
  dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string;
  slots: string[]; maxPatients: number; notes: string;
};

const SHIFT_ICONS = [Sun, CloudSun, Moon];
const ALL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const dayKeys = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

const DEFAULT_SHIFTS: [ShiftDef, ShiftDef, ShiftDef] = [
  { label: "Morning", startTime: "09:00", endTime: "12:00", enabled: true },
  { label: "Afternoon", startTime: "12:00", endTime: "15:00", enabled: true },
  { label: "Evening", startTime: "15:00", endTime: "18:00", enabled: false },
];

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

function normalizeShift(value: unknown, fallback: ShiftDef): ShiftDef {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const candidate = value as Partial<ShiftDef>;
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

function normalizeShifts(value: unknown): [ShiftDef, ShiftDef, ShiftDef] {
  const parsed = parseJsonLike(value);
  const source = Array.isArray(parsed) ? parsed : [];
  return DEFAULT_SHIFTS.map((fallback, index) =>
    normalizeShift(source[index], fallback),
  ) as [ShiftDef, ShiftDef, ShiftDef];
}

function createFallbackWeekDays(): DayScheduleLegacy[] {
  return ALL_DAYS.map((name, index) => {
    const isOpen = index > 0;
    return {
      dayOfWeek: index,
      isOpen,
      openTime: "09:00",
      closeTime: "17:00",
      slots: isOpen ? generateSlots("09:00", "17:00") : [],
      maxPatients: 30,
      notes: name === "Sunday" ? "Closed" : "",
    };
  });
}

function normalizeWeekDay(value: unknown, fallback: DayScheduleLegacy): DayScheduleLegacy {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const candidate = value as Partial<DayScheduleLegacy>;
  const openTime =
    typeof candidate.openTime === "string" && candidate.openTime.trim().length > 0
      ? candidate.openTime
      : fallback.openTime;
  const closeTime =
    typeof candidate.closeTime === "string" && candidate.closeTime.trim().length > 0
      ? candidate.closeTime
      : fallback.closeTime;
  const isOpen = typeof candidate.isOpen === "boolean" ? candidate.isOpen : fallback.isOpen;

  return {
    dayOfWeek:
      typeof candidate.dayOfWeek === "number" && Number.isFinite(candidate.dayOfWeek)
        ? candidate.dayOfWeek
        : fallback.dayOfWeek,
    isOpen,
    openTime,
    closeTime,
    slots: Array.isArray(candidate.slots)
      ? candidate.slots.filter((slot): slot is string => typeof slot === "string")
      : isOpen
        ? generateSlots(openTime, closeTime)
        : [],
    maxPatients:
      typeof candidate.maxPatients === "number" && Number.isFinite(candidate.maxPatients)
        ? candidate.maxPatients
        : fallback.maxPatients,
    notes: typeof candidate.notes === "string" ? candidate.notes : fallback.notes,
  };
}

function normalizeWeekDays(value: unknown): DayScheduleLegacy[] {
  const fallback = createFallbackWeekDays();
  const parsed = parseJsonLike(value);
  const source = Array.isArray(parsed) ? parsed : [];
  return fallback.map((day, index) => normalizeWeekDay(source[index], day));
}

function normalizeWeeklyOff(value: unknown): string[] {
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
      .map((day: string) => day.trim())
      .filter(Boolean);
  }

  return Array.isArray(value) ? value : [];
}

function generateSlots(open: string, close: string, interval = 30): string[] {
  if (!open || !close) return [];
  const slots: string[] = [];
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  let mins = oh * 60 + (om || 0);
  const end = ch * 60 + (cm || 0);
  while (mins < end) {
    const h = Math.floor(mins / 60); const m = mins % 60;
    const p = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${String(h12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${p}`);
    mins += interval;
  }
  return slots;
}

function getMonday(offset = 0) {
  const now = new Date();
  const d = now.getDay();
  const diff = now.getDate() - d + (d === 0 ? -6 : 1);
  const mon = new Date(now.setDate(diff + offset * 7));
  return mon.toISOString().slice(0, 10);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function cacheBust() { return `t=${Date.now()}`; }

/* ═══ Main Component ═══ */
export default function SchedulePage() {
  const { activeClinicId } = useClinic();
  const { t } = useLang();
  const session = typeof window !== "undefined" ? getStaffSession() : null;

  // Tab state
  const [tab, setTab] = useState<"default" | "today" | "week">("default");

  // Default schedule
  const [shifts, setShifts] = useState<[ShiftDef, ShiftDef, ShiftDef]>([
    ...DEFAULT_SHIFTS,
  ]);
  const [weeklyOff, setWeeklyOff] = useState<string[]>(["Sunday"]);
  const [slotInterval, setSlotInterval] = useState(30);
  const [maxPatients, setMaxPatients] = useState(20);
  const [defaultExists, setDefaultExists] = useState(false);

  // Today override
  const [todayOverride, setTodayOverride] = useState<{ closedShifts: number[]; fullDayClosed: boolean } | null>(null);

  // Legacy week
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getMonday(weekOffset);
  const [weekDays, setWeekDays] = useState<DayScheduleLegacy[]>([]);
  const [showWeek, setShowWeek] = useState(false);

  // Smart Away Modal State
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [awayReason, setAwayReason] = useState("Hospital Duty / Emergency");
  const [returnType, setReturnType] = useState<"today" | "later">("today");
  const [returnTime, setReturnTime] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Fetch default schedule
  useEffect(() => {
    let active = true;
    const initialLoad = window.setTimeout(() => {
      setLoading(true);
      apiClient.get<{ exists: boolean; schedule?: DefaultSched }>(
        `/api/schedule/default?clinic=${activeClinicId}&${cacheBust()}`,
      )
        .then(({ data }) => {
          if (!active) return;
          if (data.exists && data.schedule) {
            const s = data.schedule;
            setShifts(normalizeShifts(s.shifts));
            setWeeklyOff(normalizeWeeklyOff(s.weeklyOff));
            setSlotInterval(s.slotInterval || 30);
            setMaxPatients(s.maxPatients || 20);
            setDefaultExists(true);
          } else {
            setDefaultExists(false);
          }
        })
        .catch((loadError) => {
          if (!active) return;
          setError(loadError instanceof Error ? loadError.message : "Schedule load failed");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
    };
  }, [activeClinicId]);

  // Fetch today override
  useEffect(() => {
    let active = true;
    apiClient
      .get<{
        exists: boolean;
        override?: { closedShifts?: number[]; fullDayClosed?: boolean } | null;
      }>(`/api/schedule/override?clinic=${activeClinicId}&date=${todayStr()}&${cacheBust()}`)
      .then(({ data }) => {
        if (!active) return;
        if (data.exists && data.override) {
          setTodayOverride({
            closedShifts: Array.isArray(data.override.closedShifts) ? data.override.closedShifts : [],
            fullDayClosed: data.override.fullDayClosed || false,
          });
        } else {
          setTodayOverride(null);
        }
      })
      .catch((loadError) => {
        if (!active) return;
        setTodayOverride(null);
        setError(loadError instanceof Error ? loadError.message : "Today control load failed");
      });
    return () => {
      active = false;
    };
  }, [activeClinicId]);

  // Fetch week schedule (legacy)
  useEffect(() => {
    if (!showWeek) return;
    let active = true;
    apiClient
      .get<{ schedule?: DayScheduleLegacy[] }>(
        `/api/schedule?clinic=${activeClinicId}&weekOffset=${weekOffset}&${cacheBust()}`,
      )
      .then(({ data }) => {
        if (active) setWeekDays(normalizeWeekDays(data.schedule));
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Week schedule load failed");
      });
    return () => {
      active = false;
    };
  }, [activeClinicId, weekOffset, showWeek]);

  const updateShift = (idx: number, changes: Partial<ShiftDef>) => {
    setShifts(prev => {
      const copy = [...prev] as [ShiftDef, ShiftDef, ShiftDef];
      copy[idx] = { ...copy[idx], ...changes };
      return copy;
    });
  };

  const handleSaveDefault = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const { data } = await apiClient.post<{ schedule?: DefaultSched }>("/api/schedule/default", {
          clinicId: activeClinicId, shifts, weeklyOff, slotInterval, maxPatients,
          updatedBy: session?.name || "staff",
      });
      if (data.schedule) {
        setShifts(normalizeShifts(data.schedule.shifts));
        setWeeklyOff(normalizeWeeklyOff(data.schedule.weeklyOff));
        setSlotInterval(data.schedule.slotInterval || 30);
        setMaxPatients(data.schedule.maxPatients || 20);
      }
      setSaved(true);
      setDefaultExists(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleOverride = async (closedShifts: number[], fullDayClosed: boolean, reasonStr: string = "") => {
    try {
      await apiClient.post("/api/schedule/override", {
          clinicId: activeClinicId, date: todayStr(), closedShifts, fullDayClosed,
          reason: reasonStr, createdBy: session?.name || "staff",
      });
      setTodayOverride({ closedShifts, fullDayClosed });
      setShowAwayModal(false);
      setError("");
    } catch (overrideError) {
      setError(overrideError instanceof Error ? overrideError.message : "Override update failed");
    }
  };

  const handleSaveAway = () => {
    const reasonObj = {
      text: awayReason,
      returnDate: returnType === "later" ? returnDate : "",
      returnTime: returnType === "today" ? returnTime : "",
    };
    handleOverride([], true, JSON.stringify(reasonObj));
  };

  const handleRemoveOverride = async () => {
    try {
      await apiClient.post("/api/schedule/override", {
        clinicId: activeClinicId,
        date: todayStr(),
        remove: true,
      });
      setTodayOverride(null);
      setError("");
    } catch (overrideError) {
      setError(overrideError instanceof Error ? overrideError.message : "Override removal failed");
    }
  };

  const handleSaveWeek = async () => {
    setSaving(true); setError("");
    try {
      await apiClient.post("/api/schedule", {
        clinicId: activeClinicId,
        weekStart,
        days: weekDays,
        updatedBy: session?.name || "staff",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const updateWeekDay = (idx: number, changes: Partial<DayScheduleLegacy>) => {
    setWeekDays(prev => prev.map((d, i) => {
      if (i !== idx) return d;
      const u = { ...d, ...changes };
      if ("openTime" in changes || "closeTime" in changes) u.slots = generateSlots(u.openTime, u.closeTime);
      return u;
    }));
  };

  if (!session) {
    return (
      <div className="page-shell">
        <div className="section-shell flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "notLoggedIn")}</p>
            <Link href={buildClinicHref("/staff", activeClinicId)} className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white">
              {t("nav", "login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="page-shell">
      <div className="section-shell py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="display-type text-xl text-[var(--accent-strong)]">{t("schedule", "title")}</h1>
          <Link href={buildClinicHref("/staff", activeClinicId)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">
            ← {t("common", "back")}
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide">
          {(["default", "today", "week"] as const).map(key => (
            <button key={key} type="button" onClick={() => { setTab(key); if (key === "week") setShowWeek(true); }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === key ? "bg-gradient-to-r from-[var(--accent-deep,var(--accent))] to-[var(--accent)] text-white shadow-md" : "card"
              }`}>
              {key === "default" ? `⚙️ ${t("schedule", "defaultSetup")}`
                : key === "today" ? `📅 ${t("schedule", "todayControl")}`
                : `📋 ${t("schedule", "weekSchedule")}`}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</div>}
        {saved && <div className="mt-4 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm font-semibold text-[var(--success)]">✓ {t("common", "saved")}</div>}

        {loading ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-[rgba(19,49,58,0.5)]"><Loader2 className="h-4 w-4 animate-spin" /> {t("common", "loading")}</p>
        ) : (
          <>
            {/* ═══ TAB: Default Schedule ═══ */}
            {tab === "default" && (
              <div className="mt-6 space-y-4">
                <p className="text-xs text-[rgba(19,49,58,0.5)]">{t("schedule", "defaultSetupDesc")}</p>

                {/* 3 Shift Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {shifts.map((shift, idx) => {
                    const Icon = SHIFT_ICONS[idx];
                    const slotCount = shift.enabled ? generateSlots(shift.startTime, shift.endTime, slotInterval).length : 0;
                    return (
                      <div key={idx} className={`card p-4 transition ${shift.enabled ? "card-active" : "opacity-60"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-[var(--accent)]" />
                            <span className="text-sm font-semibold">{t("schedule", "shift")} {idx + 1}</span>
                          </div>
                          <button type="button" onClick={() => updateShift(idx, { enabled: !shift.enabled })}
                            className={`h-5 w-9 rounded-full transition ${shift.enabled ? "bg-[var(--accent)]" : "bg-[rgba(19,49,58,0.15)]"}`}>
                            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${shift.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>

                        {shift.enabled && (
                          <div className="mt-3 space-y-2">
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "shiftLabel")}</span>
                              <input value={shift.label} onChange={e => updateShift(idx, { label: e.target.value })}
                                className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "startTime")}</span>
                                <input type="time" value={shift.startTime} onChange={e => updateShift(idx, { startTime: e.target.value })}
                                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "endTime")}</span>
                                <input type="time" value={shift.endTime} onChange={e => updateShift(idx, { endTime: e.target.value })}
                                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                              </label>
                            </div>
                            <p className="text-[10px] text-[rgba(19,49,58,0.45)]">{slotCount} {t("schedule", "slots")}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Weekly Off */}
                <div className="card p-4">
                  <p className="text-xs font-semibold text-[rgba(19,49,58,0.6)]">{t("schedule", "weeklyOff")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ALL_DAYS.map(day => (
                      <button key={day} type="button"
                        onClick={() => setWeeklyOff(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          weeklyOff.includes(day) ? "bg-[var(--danger)] text-white" : "border border-[var(--line)] hover:border-[var(--accent)]"
                        }`}>
                        {t("schedule", day.toLowerCase() as "sunday")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="card p-4 block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "slotInterval")}</span>
                    <input type="number" value={slotInterval} onChange={e => setSlotInterval(Number(e.target.value) || 30)}
                      className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                  </label>
                  <label className="card p-4 block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "maxPatients")}</span>
                    <input type="number" value={maxPatients} onChange={e => setMaxPatients(Number(e.target.value) || 20)}
                      className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                  </label>
                </div>

                <button type="button" onClick={() => void handleSaveDefault()} disabled={saving}
                  className="btn btn-primary btn-lg w-full">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("common", "saving")}</> : `💾 ${t("schedule", "saveDefault")}`}
                </button>
              </div>
            )}

            {/* ═══ TAB: Today's Control ═══ */}
            {tab === "today" && (
              <div className="mt-6 space-y-4">
                <div className="card p-4">
                  <p className="text-sm font-semibold text-[var(--accent-strong)]">📅 {todayLabel}</p>
                  {todayOverride && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-[var(--warm-soft)] px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-[var(--warm)]" />
                      <p className="text-xs font-semibold text-[#8b4626]">{t("schedule", "overrideActive")}</p>
                    </div>
                  )}
                </div>

                {!defaultExists ? (
                  <div className="card p-6 text-center">
                    <p className="text-sm text-[rgba(19,49,58,0.6)]">{t("schedule", "notSetup")}</p>
                    <button type="button" onClick={() => setTab("default")} className="btn btn-primary btn-sm mt-3">
                      {t("schedule", "setupNow")}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Shift toggles */}
                    <div className="space-y-2">
                      {shifts.map((shift, idx) => {
                        if (!shift.enabled) return null;
                        const Icon = SHIFT_ICONS[idx];
                        const isClosed = todayOverride?.fullDayClosed || todayOverride?.closedShifts.includes(idx);
                        return (
                          <div key={idx} className={`card flex items-center justify-between p-4 ${isClosed ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-[var(--accent)]" />
                              <div>
                                <p className="text-sm font-semibold">{shift.label}</p>
                                <p className="text-[10px] text-[rgba(19,49,58,0.5)]">{shift.startTime} – {shift.endTime}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isClosed && <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)]">{t("schedule", "shiftClosed")}</span>}
                              <button type="button"
                                onClick={() => {
                                  const current = todayOverride?.closedShifts || [];
                                  if (isClosed) {
                                    handleOverride(current.filter(i => i !== idx), false);
                                  } else {
                                    handleOverride([...current, idx], false);
                                  }
                                }}
                                className={`h-5 w-9 rounded-full transition ${!isClosed ? "bg-[var(--accent)]" : "bg-[rgba(19,49,58,0.15)]"}`}>
                                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${!isClosed ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Full day close / reopen */}
                    <div className="flex gap-2">
                      {todayOverride?.fullDayClosed ? (
                        <button type="button" onClick={() => void handleRemoveOverride()} className="btn btn-primary btn-sm w-full">
                          🔓 {t("schedule", "reopenDay")}
                        </button>
                      ) : (
                        <button type="button" onClick={() => setShowAwayModal(true)} className="btn btn-sm w-full" style={{ background: "var(--danger)", color: "white" }}>
                          ✈️ {t("schedule", "markAway")}
                        </button>
                      )}
                    </div>
                    
                    {/* Away Modal */}
                    {showAwayModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="card w-full max-w-sm p-6 relative">
                          <button onClick={() => setShowAwayModal(false)} className="absolute right-4 top-4 text-[rgba(19,49,58,0.5)] hover:text-black">✕</button>
                          <h3 className="mb-4 text-lg font-bold text-[var(--accent-strong)]">✈️ {t("schedule", "markAway")}</h3>
                          
                          <div className="space-y-4">
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("schedule", "awayReason")}</span>
                              <select 
                                value={awayReason} 
                                onChange={e => setAwayReason(e.target.value)}
                                className="focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                              >
                                <option value={t("schedule", "hospitalDuty")}>{t("schedule", "hospitalDuty")}</option>
                                <option value={t("schedule", "outOfTown")}>{t("schedule", "outOfTown")}</option>
                                <option value={t("schedule", "personalLeave")}>{t("schedule", "personalLeave")}</option>
                              </select>
                            </label>

                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[rgba(19,49,58,0.04)] p-1">
                              <button type="button" onClick={() => setReturnType("today")} className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${returnType === "today" ? "bg-white shadow" : ""}`}>
                                {t("schedule", "returningToday")}
                              </button>
                              <button type="button" onClick={() => setReturnType("later")} className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${returnType === "later" ? "bg-white shadow" : ""}`}>
                                {t("schedule", "returningLater")}
                              </button>
                            </div>

                            {returnType === "today" ? (
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("schedule", "selectTime")}</span>
                                <input 
                                  type="time" 
                                  value={returnTime} 
                                  onChange={e => setReturnTime(e.target.value)}
                                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none" 
                                />
                              </label>
                            ) : (
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("schedule", "selectDate")}</span>
                                <input 
                                  type="date" 
                                  min={todayStr()}
                                  value={returnDate} 
                                  onChange={e => setReturnDate(e.target.value)}
                                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none" 
                                />
                              </label>
                            )}

                            <button type="button" onClick={handleSaveAway} className="btn btn-primary w-full mt-2" style={{ background: "var(--danger)", border: "none" }}>
                              {t("schedule", "saveAway")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ═══ TAB: Weekly Schedule (Legacy) ═══ */}
            {tab === "week" && (
              <div className="mt-6 space-y-4">
                <p className="text-xs text-[rgba(19,49,58,0.5)]">{t("schedule", "weekScheduleDesc")}</p>

                {/* Week Nav */}
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setWeekOffset(w => w - 1)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">
                    {t("schedule", "prevWeek")}
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[var(--accent-strong)]">{t("schedule", "weekOf")} {weekStart}</p>
                    {weekOffset === 0 && <p className="text-xs text-[rgba(19,49,58,0.5)]">{t("schedule", "thisWeek")}</p>}
                  </div>
                  <button type="button" onClick={() => setWeekOffset(w => w + 1)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">
                    {t("schedule", "nextWeek")}
                  </button>
                </div>

                {/* Days */}
                <div className="space-y-3">
                  {weekDays.map((day, index) => (
                    <div key={index} className={`rounded-xl border p-4 transition ${day.isOpen ? "border-[var(--line)] bg-white/70" : "border-[rgba(19,49,58,0.06)] bg-[rgba(19,49,58,0.02)] opacity-60"}`}>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => updateWeekDay(index, { isOpen: !day.isOpen })}
                          className={`h-5 w-9 rounded-full transition ${day.isOpen ? "bg-[var(--accent)]" : "bg-[rgba(19,49,58,0.15)]"}`}>
                          <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${day.isOpen ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className="font-semibold">{t("schedule", dayKeys[day.dayOfWeek])}</span>
                        <span className="text-xs text-[rgba(19,49,58,0.5)]">{day.isOpen ? t("schedule", "open") : t("schedule", "closed")}</span>
                      </div>
                      {day.isOpen && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "openTime")}</span>
                            <input type="time" value={day.openTime} onChange={e => updateWeekDay(index, { openTime: e.target.value })}
                              className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "closeTime")}</span>
                            <input type="time" value={day.closeTime} onChange={e => updateWeekDay(index, { closeTime: e.target.value })}
                              className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold uppercase text-[rgba(19,49,58,0.5)]">{t("schedule", "maxPatients")}</span>
                            <input type="number" value={day.maxPatients} onChange={e => updateWeekDay(index, { maxPatients: Number(e.target.value) || 0 })}
                              className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none" />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => void handleSaveWeek()} disabled={saving}
                  className="btn btn-primary btn-lg w-full">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("common", "saving")}</> : t("schedule", "saveSchedule")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
