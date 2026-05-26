"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession } from "@/components/navbar";
import { apiClient } from "@/services/api";

type ClinicSettings = {
  clinicId: string;
  doctorName: string;
  clinicName: string;
  address: string;
  phone: string;
  whatsapp: string;
  updatedAt?: string;
};

export default function StaffSettingsPage() {
  const { activeClinicId } = useClinic();
  const { t } = useLang();
  const [session, setSession] = useState(() =>
    typeof window !== "undefined" ? getStaffSession() : null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [pageError, setPageError] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    const syncSession = () => setSession(getStaffSession());
    window.addEventListener("storage", syncSession);
    window.addEventListener("staff-session-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("staff-session-change", syncSession);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const { data } = await apiClient.get<{ settings?: ClinicSettings }>(
        `/api/clinic/settings?clinic=${activeClinicId}`
      );
      if (data.settings) {
        setDoctorName(data.settings.doctorName || "");
        setClinicName(data.settings.clinicName || "");
        setAddress(data.settings.address || "");
        setPhone(data.settings.phone || "");
        setWhatsapp(data.settings.whatsapp || "");
      }
    } catch (error) {
      // It's fine if it fails or returns 404
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeClinicId]);

  useEffect(() => {
    if (session?.role === "doctor") {
      void fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings, session]);

  const handleSave = async () => {
    setSaving(true);
    setPageError("");
    setSuccessMsg("");
    try {
      await apiClient.post("/api/clinic/settings", {
        clinicId: activeClinicId,
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
      });
      setSuccessMsg("Clinic settings updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!session || session.role !== "doctor") {
    return (
      <div className="page-shell">
        <div className="section-shell flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-[rgba(19,49,58,0.7)]">
              {!session ? t("staffMgmt", "notLoggedIn") : "Only Doctors can access Settings"}
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
            Clinic Settings
          </h1>
          <Link
            href={buildClinicHref("/staff", activeClinicId)}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
          >
            ← {t("common", "back")}
          </Link>
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

        {loading ? (
          <div className="mt-6 text-sm text-[rgba(19,49,58,0.5)]">{t("common", "loading")}</div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-5">
            <p className="text-xs font-semibold text-[rgba(19,49,58,0.5)] mb-4">
              Update your clinic's public profile details.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">Doctor Name</span>
                <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" placeholder="e.g. Dr. John Doe" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">Clinic Name</span>
                <input value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" placeholder="e.g. City Hospital" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">Full Address / Location</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" placeholder="e.g. 123 Main Street" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">Phone Number</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric"
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" placeholder="e.g. 9876543210" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[rgba(19,49,58,0.7)]">WhatsApp Number</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="numeric"
                  className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" placeholder="e.g. 9876543210" />
              </label>
            </div>
            
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => void handleSave()} disabled={saving}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
