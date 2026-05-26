"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession } from "@/components/navbar";
import { apiClient } from "@/services/api";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  designation: string;
  clinicAccess: string[];
  status: string;
  createdAt: string;
};

const designationOptions = ["receptionist", "nurse", "assistant", "compounder"];
const clinicOptions = ["surgery", "dental", "pharmacy"];

export default function StaffManagePage() {
  const { activeClinicId } = useClinic();
  const { t } = useLang();
  const [session, setSession] = useState(() =>
    typeof window !== "undefined" ? getStaffSession() : null,
  );

  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fDesignation, setFDesignation] = useState("receptionist");
  const [fPin, setFPin] = useState("");
  const [fClinics, setFClinics] = useState<string[]>(["surgery"]);
  const [fError, setFError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [pageError, setPageError] = useState("");
  const primaryClinic = session?.clinicAccess?.[0] || "";

  useEffect(() => {
    const syncSession = () => setSession(getStaffSession());
    window.addEventListener("storage", syncSession);
    window.addEventListener("staff-session-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("staff-session-change", syncSession);
    };
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      // Doctor sees only their clinic's staff
      const url = primaryClinic ? `/api/staff?clinic=${primaryClinic}` : "/api/staff";
      const { data } = await apiClient.get<{ members?: StaffMember[] }>(url);
      setMembers(data.members || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [primaryClinic]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchMembers();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchMembers]);

  const openAddForm = () => {
    setEditing(null);
    setFName("");
    setFPhone("");
    setFEmail("");
    setFDesignation("receptionist");
    setFPin("");
    // Default to doctor's own clinic
    setFClinics(session?.clinicAccess || ["surgery"]);
    setFError("");
    setShowForm(true);
  };

  const openEditForm = (m: StaffMember) => {
    setEditing(m);
    setFName(m.name);
    setFPhone(m.phone);
    setFEmail(m.email);
    setFDesignation(m.designation);
    setFPin("");
    setFClinics(m.clinicAccess);
    setFError("");
    setShowForm(true);
  };

  const toggleClinic = (c: string) => {
    setFClinics((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleSave = async () => {
    if (!fName.trim()) {
      setFError(t("booking", "nameRequired"));
      return;
    }
    if (!editing && !fPin.trim()) {
      setFError("PIN is required");
      return;
    }
    if (fClinics.length === 0) {
      setFError("Select at least one clinic");
      return;
    }
    setSaving(true);
    setFError("");
    try {
      if (editing) {
        await apiClient.patch(`/api/staff/${editing.id}`, {
          name: fName.trim(),
          phone: fPhone.trim(),
          email: fEmail.trim(),
          designation: fDesignation,
          clinicAccess: fClinics,
          ...(fPin.trim() ? { pin: fPin.trim() } : {}),
        });
        setSuccessMsg(t("staffMgmt", "updateSuccess"));
      } else {
        await apiClient.post("/api/staff", {
          name: fName.trim(),
          phone: fPhone.trim(),
          email: fEmail.trim(),
          designation: fDesignation,
          pin: fPin.trim(),
          clinicAccess: fClinics,
          createdBy: session?.name || "doctor",
        });
        setSuccessMsg(t("staffMgmt", "addSuccess"));
      }
      setShowForm(false);
      await fetchMembers();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setFError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setPageError("");
    await apiClient.patch(`/api/staff/${id}`, { status });
    await fetchMembers();
  };

  const removeStaff = async (id: string) => {
    if (!confirm(t("staffMgmt", "removeConfirm"))) return;
    setPageError("");
    await apiClient.delete(`/api/staff/${id}`);
    await fetchMembers();
  };

  // Auth guard
  if (!session || session.role !== "doctor") {
    return (
      <div className="page-shell">
        <div className="section-shell flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-[rgba(19,49,58,0.7)]">
              {!session ? t("staffMgmt", "notLoggedIn") : t("staffMgmt", "doctorOnly")}
            </p>
            <Link
              href={buildClinicHref("/staff", activeClinicId)}
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white"
            >
              {t("nav", "login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="section-shell py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="display-type text-xl text-[var(--accent-strong)]">
            {t("staffMgmt", "title")}
          </h1>
          <div className="flex gap-2">
            <Link
              href={buildClinicHref("/staff", activeClinicId)}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
            >
              ← {t("common", "back")}
            </Link>
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white"
            >
              + {t("staffMgmt", "addStaff")}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 rounded-lg bg-[rgba(15,107,99,0.08)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)]">
            ✓ {successMsg}
          </div>
        )}

        {pageError && (
          <div className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {pageError}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mt-5 rounded-2xl border border-[var(--accent)] bg-white/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {editing ? t("staffMgmt", "editStaff") : t("staffMgmt", "addStaff")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "staffName")}</span>
                <input value={fName} onChange={(e) => setFName(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "staffPhone")}</span>
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} inputMode="numeric"
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "staffEmail")}</span>
                <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} type="email"
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "staffPin")}</span>
                <input value={fPin} onChange={(e) => setFPin(e.target.value)} type="password" inputMode="numeric" maxLength={6}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder={editing ? "(leave blank to keep current)" : ""} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "designation")}</span>
                <select value={fDesignation} onChange={(e) => setFDesignation(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none">
                  {designationOptions.map((d) => (
                    <option key={d} value={d}>{t("staffMgmt", d)}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">{t("staffMgmt", "clinicAccess")}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {clinicOptions.map((c) => (
                    <button key={c} type="button"
                      onClick={() => toggleClinic(c)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        fClinics.includes(c) ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {fError && (
              <p className="mt-3 text-sm font-semibold text-[#8b4626]">{fError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => void handleSave()} disabled={saving}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? t("staffMgmt", "updating") : t("staffMgmt", "saveStaff")}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-full border border-[var(--line)] px-5 py-2 text-sm font-semibold">
                {t("common", "cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Staff List */}
        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-[rgba(19,49,58,0.5)]">{t("common", "loading")}</p>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white/40 p-6 text-center text-sm text-[rgba(19,49,58,0.5)]">
              {t("staffMgmt", "noStaff")}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{m.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          m.status === "active"
                            ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]"
                            : m.status === "hold"
                            ? "bg-[rgba(182,93,54,0.1)] text-[#8b4626]"
                            : "bg-[rgba(19,49,58,0.05)] text-[rgba(19,49,58,0.5)]"
                        }`}>
                          {t("common", m.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[rgba(19,49,58,0.6)]">
                        {m.designation && t("staffMgmt", m.designation)} · {m.phone || m.email || "—"}
                      </p>
                      <p className="text-xs text-[rgba(19,49,58,0.45)]">
                        {t("staffMgmt", "clinicAccess")}: {m.clinicAccess?.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => openEditForm(m)}
                        className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">
                        {t("common", "edit")}
                      </button>
                      {m.status === "active" ? (
                        <button type="button" onClick={() => void updateStatus(m.id, "hold")}
                          className="rounded-full border border-[rgba(182,93,54,0.2)] px-3 py-1 text-xs font-semibold text-[#8b4626]">
                          {t("staffMgmt", "holdStaff")}
                        </button>
                      ) : m.status === "hold" ? (
                        <button type="button" onClick={() => void updateStatus(m.id, "active")}
                          className="rounded-full border border-[rgba(15,107,99,0.2)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                          {t("staffMgmt", "activateStaff")}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => void removeStaff(m.id)}
                        className="rounded-full border border-[rgba(182,93,54,0.2)] px-3 py-1 text-xs font-semibold text-[#8b4626]">
                        {t("staffMgmt", "removeStaff")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
